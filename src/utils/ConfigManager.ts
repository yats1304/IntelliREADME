import * as vscode from "vscode";

export class ConfigManager {
  private static readonly CONFIG_SECTION = "intelliReadme";

  /**
   * Get the user's Groq API key from VS Code settings
   * Used by: GroqService.generateReadme()
   */
  static getGroqApiKey(): string | undefined {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    const apiKey = config.get<string>("groqApiKey");

    // Validate API key format
    if (apiKey && !apiKey.startsWith("gsk_")) {
      console.warn(
        '⚠️ Invalid API key format. Groq keys should start with "gsk_"'
      );
      return undefined;
    }

    return apiKey;
  }

  /**
   * Save the user's Groq API key to VS Code settings
   */
  static async setGroqApiKey(apiKey: string): Promise<void> {
    // Validate API key format before saving
    if (!apiKey.startsWith("gsk_")) {
      throw new Error(
        'Invalid API key format. Groq API keys must start with "gsk_"'
      );
    }

    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(
      "groqApiKey",
      apiKey,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage("✅ Groq API key saved successfully!");
  }

  /**
   * Get the user's preferred AI model
   * Used by: GroqService.generateReadme()
   */
  static getPreferredModel(): string {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<string>("preferredModel", "moonshotai/kimi-k2-instruct");
  }

  /**
   * Set the user's preferred AI model
   */
  static async setPreferredModel(model: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(
      "preferredModel",
      model,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage(`✅ Preferred model set to: ${model}`);
  }

  /**
   * Check if AI features are enabled
   */
  static isAIEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<boolean>("enableAI", true);
  }

  /**
   * Enable or disable AI features
   */
  static async setAIEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update("enableAI", enabled, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      enabled
        ? "🤖 AI features enabled!"
        : "📝 AI features disabled - using templates only"
    );
  }

  /**
   * Get the template style preference
   */
  static getTemplateStyle(): string {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<string>("templateStyle", "comprehensive");
  }

  /**
   * Check if project structure should be included
   * Used by: GroqService for project structure analysis
   */
  static shouldIncludeProjectStructure(): boolean {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<boolean>("includeProjectStructure", true);
  }

  /**
   * Check if badges should be included
   */
  static shouldIncludeBadges(): boolean {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<boolean>("includeBadges", true);
  }

  /**
   * Check if the user has a valid API key
   * Enhanced validation matching your GroqService requirements
   */
  static hasValidApiKey(): boolean {
    const apiKey = this.getGroqApiKey();
    return (
      apiKey !== undefined &&
      apiKey.length > 0 &&
      apiKey.startsWith("gsk_") &&
      apiKey.length >= 40
    ); // Groq API keys are typically longer
  }

  /**
   * Prompt user for API key with comprehensive validation
   */
  static async promptForApiKey(): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your Groq API key (get free key from console.groq.com)",
      password: true,
      placeHolder: "gsk_...",
      validateInput: (value) => {
        if (!value) {return "API key is required";}
        if (!value.startsWith("gsk_"))
          {return 'Groq API keys must start with "gsk_"';}
        if (value.length < 40)
          {return "API key seems too short (should be 40+ characters)";}
        if (value.includes(" ")) {return "API key should not contain spaces";}
        return null;
      },
    });

    return apiKey;
  }

  /**
   * Show API key setup dialog with comprehensive options
   */
  static async showApiKeySetup(): Promise<boolean> {
    const choice = await vscode.window.showInformationMessage(
      "🤖 IntelliREADME: AI README generation requires a free Groq API key",
      {
        detail:
          "Get unlimited AI-powered READMEs with your own free API key from Groq.",
        modal: true,
      },
      "Get Free API Key",
      "Enter API Key",
      "Use Templates Only"
    );

    switch (choice) {
      case "Get Free API Key":
        await vscode.env.openExternal(
          vscode.Uri.parse("https://console.groq.com")
        );
        // After opening browser, ask if they want to enter the key now
        const followUp = await vscode.window.showInformationMessage(
          'Once you have your API key from console.groq.com, click "Enter Key"',
          "Enter Key",
          "Later"
        );
        if (followUp === "Enter Key") {
          const apiKey = await this.promptForApiKey();
          if (apiKey) {
            await this.setGroqApiKey(apiKey);
            return true;
          }
        }
        return false;

      case "Enter API Key":
        const apiKey = await this.promptForApiKey();
        if (apiKey) {
          await this.setGroqApiKey(apiKey);
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Show comprehensive API key management options
   */
  static async manageApiKey(): Promise<void> {
    const hasKey = this.hasValidApiKey();
    const currentKey = this.getGroqApiKey();

    const options = hasKey
      ? [
          {
            label: "🔄 Update API Key",
            description: "Replace current API key",
          },
          {
            label: "🗑️ Remove API Key",
            description: "Delete API key (disables AI features)",
          },
          { label: "🧪 Test API Key", description: "Verify API key works" },
          {
            label: "⚙️ Model Settings",
            description: "Choose preferred AI model",
          },
          { label: "❌ Cancel", description: "Keep current settings" },
        ]
      : [
          { label: "➕ Add API Key", description: "Enter your Groq API key" },
          {
            label: "🌐 Get Free API Key",
            description: "Open Groq console to get key",
          },
          { label: "❌ Cancel", description: "Continue without API key" },
        ];

    const choice = await vscode.window.showQuickPick(options, {
      placeHolder: hasKey
        ? `Current API key: ${currentKey?.substring(
            0,
            10
          )}...${currentKey?.slice(-4)}`
        : "No API key configured - AI features unavailable",
    });

    switch (choice?.label) {
      case "➕ Add API Key":
      case "🔄 Update API Key":
        const newKey = await this.promptForApiKey();
        if (newKey) {
          try {
            await this.setGroqApiKey(newKey);
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
          }
        }
        break;

      case "🗑️ Remove API Key":
        const confirm = await vscode.window.showWarningMessage(
          "Remove your Groq API key? This will disable AI-powered README generation.",
          { modal: true },
          "Remove",
          "Cancel"
        );
        if (confirm === "Remove") {
          const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
          await config.update(
            "groqApiKey",
            undefined,
            vscode.ConfigurationTarget.Global
          );
          vscode.window.showInformationMessage(
            "🗑️ API key removed. AI features disabled."
          );
        }
        break;

      case "🧪 Test API Key":
        await this.testApiKey();
        break;

      case "⚙️ Model Settings":
        await this.showModelSelection();
        break;

      case "🌐 Get Free API Key":
        await vscode.env.openExternal(
          vscode.Uri.parse("https://console.groq.com")
        );
        break;
    }
  }

  /**
   * Test the current API key against Groq API
   * Matches the validation pattern used in GroqService
   */
  static async testApiKey(): Promise<void> {
    const apiKey = this.getGroqApiKey();

    if (!apiKey) {
      vscode.window.showErrorMessage(
        "❌ No API key configured. Please set your Groq API key first."
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Testing Groq API connection...",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({
            increment: 30,
            message: "Connecting to Groq API...",
          });

          const response = await fetch(
            "https://api.groq.com/openai/v1/models",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          progress.report({ increment: 70, message: "Validating response..." });

          if (response.ok) {
            const data: any = await response.json();
            const models = data.data || [];
            const modelCount = models.length;

            progress.report({ increment: 100, message: "Success!" });

            // Show detailed success message
            const modelNames = models
              .slice(0, 3)
              .map((m: any) => m.id)
              .join(", ");
            vscode.window.showInformationMessage(
              `✅ API key is valid! Found ${modelCount} available models.\n` +
                `Sample models: ${modelNames}${modelCount > 3 ? ", ..." : ""}`
            );
          } else {
            const errorText = await response.text();
            throw new Error(
              `API returned ${response.status}: ${response.statusText}\n${errorText}`
            );
          }
        } catch (error) {
          progress.report({ increment: 100, message: "Failed!" });

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          if (errorMessage.includes("401")) {
            vscode.window
              .showErrorMessage(
                "❌ API key is invalid or expired. Please check your Groq API key.",
                "Update API Key"
              )
              .then((selection) => {
                if (selection === "Update API Key") {
                  this.manageApiKey();
                }
              });
          } else if (errorMessage.includes("429")) {
            vscode.window.showWarningMessage(
              "⚠️ Rate limit exceeded. Please try again in a few minutes."
            );
          } else {
            vscode.window.showErrorMessage(
              `❌ API test failed: ${errorMessage}`
            );
          }
        }
      }
    );
  }

  /**
   * Show model selection dialog
   */
  static async showModelSelection(): Promise<void> {
    const availableModels = [
      {
        label: "moonshotai/kimi-k2-instruct",
        description: "🌟 Recommended - Best for comprehensive documentation",
      },
      {
        label: "llama-3.3-70b-versatile",
        description: "🚀 Fast and reliable for most projects",
      },
      {
        label: "llama-3.1-8b-instant",
        description: "⚡ Fastest response time",
      },
      { label: "gemma2-9b-it", description: "🎯 Good for technical content" },
    ];

    const currentModel = this.getPreferredModel();

    const selected = await vscode.window.showQuickPick(availableModels, {
      placeHolder: `Current model: ${currentModel}`,
      title: "Choose Preferred AI Model",
    });

    if (selected) {
      await this.setPreferredModel(selected.label);
    }
  }

  /**
   * Get all current configuration values
   */
  static getAllConfig(): any {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return {
      hasApiKey: this.hasValidApiKey(),
      apiKeyPreview: this.hasValidApiKey()
        ? `${this.getGroqApiKey()?.substring(0, 10)}...`
        : "None",
      preferredModel: this.getPreferredModel(),
      enableAI: this.isAIEnabled(),
      templateStyle: this.getTemplateStyle(),
      includeProjectStructure: this.shouldIncludeProjectStructure(),
      includeBadges: this.shouldIncludeBadges(),
    };
  }

  /**
   * Show current configuration status
   */
  static async showConfigStatus(): Promise<void> {
    const config = this.getAllConfig();
    const status = `
📊 IntelliREADME Configuration Status:

🔑 API Key: ${config.hasApiKey ? "✅ Configured" : "❌ Not set"}
🤖 AI Features: ${config.enableAI ? "✅ Enabled" : "❌ Disabled"}
🎯 Preferred Model: ${config.preferredModel}
📁 Project Structure: ${
      config.includeProjectStructure ? "✅ Included" : "❌ Excluded"
    }
🏆 Badges: ${config.includeBadges ? "✅ Included" : "❌ Excluded"}
📝 Template Style: ${config.templateStyle}
`;

    const action = await vscode.window.showInformationMessage(
      status,
      "Manage API Key",
      "Open Settings",
      "Close"
    );

    switch (action) {
      case "Manage API Key":
        await this.manageApiKey();
        break;
      case "Open Settings":
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          this.CONFIG_SECTION
        );
        break;
    }
  }

  /**
   * Reset all configuration to defaults
   */
  static async resetConfig(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      "Reset all IntelliREADME settings to defaults? This will remove your API key and reset all preferences.",
      { modal: true },
      "Reset All",
      "Cancel"
    );

    if (confirm === "Reset All") {
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

      const settings = [
        "groqApiKey",
        "preferredModel",
        "enableAI",
        "templateStyle",
        "includeProjectStructure",
        "includeBadges",
      ];

      for (const setting of settings) {
        await config.update(
          setting,
          undefined,
          vscode.ConfigurationTarget.Global
        );
      }

      vscode.window.showInformationMessage(
        "🔄 IntelliREADME settings reset to defaults"
      );
    }
  }

  /**
   * Get available models for the UI
   */
  static getAvailableModels(): string[] {
    return [
      "moonshotai/kimi-k2-instruct",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ];
  }
}
