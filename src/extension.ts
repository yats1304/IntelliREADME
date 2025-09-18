import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { TemplateService } from "./services/TemplateService";
import { GroqService } from "./services/GroqService";
import { ProjectAnalyzer } from "./utils/projectAnalyzer";
import { ConfigManager } from "./utils/ConfigManager";

class IntelliREADMEExtension {
  private templateService: TemplateService;
  private groqService: GroqService;

  constructor() {
    this.templateService = new TemplateService();
    this.groqService = new GroqService();
  }

  async generateReadme(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        "🚨 Please open a project folder first to generate README."
      );
      return;
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "🧠 IntelliREADME is analyzing your project...",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({
            increment: 10,
            message: "Analyzing project structure...",
          });

          // Analyze the project first
          const projectInfo = await ProjectAnalyzer.analyzeProject(
            workspacePath
          );

          progress.report({
            increment: 30,
            message: "Project analysis complete!",
          });

          // Show the main choice dialog
          const generationChoice = await this.showGenerationChoiceDialog(
            projectInfo.name
          );

          if (!generationChoice) {
            return; // User cancelled
          }

          let readmeContent: string;
          let generationMethod = "Unknown";

          if (generationChoice === "ai") {
            // AI Generation Flow
            const apiKey = ConfigManager.getGroqApiKey();

            if (!apiKey || !ConfigManager.hasValidApiKey()) {
              // No API key - show setup dialog
              const apiKeySet = await this.showApiKeySetupDialog();

              if (!apiKeySet) {
                // User chose templates instead
                progress.report({
                  increment: 60,
                  message: "📝 Generating with smart templates...",
                });
                readmeContent = await this.templateService.generateReadme(
                  projectInfo
                );
                generationMethod = "📝 Smart Templates";
              } else {
                // API key was set - proceed with AI
                progress.report({
                  increment: 60,
                  message: "🤖 Generating with AI (your API key)...",
                });
                readmeContent = await this.generateWithAI(projectInfo);
                generationMethod = "🤖 AI-Powered (Your API Key)";
              }
            } else {
              // Has API key - use AI directly
              progress.report({
                increment: 60,
                message: "🤖 Generating with AI (your API key)...",
              });
              readmeContent = await this.generateWithAI(projectInfo);
              generationMethod = "🤖 AI-Powered (Your API Key)";
            }
          } else {
            // Template Generation
            progress.report({
              increment: 60,
              message: "📝 Generating with smart templates...",
            });
            readmeContent = await this.templateService.generateReadme(
              projectInfo
            );
            generationMethod = "📝 Smart Templates";
          }

          // Save and open the README
          progress.report({ increment: 90, message: "Saving README.md..." });
          await this.saveAndOpenReadme(
            workspacePath,
            readmeContent,
            generationMethod
          );

          progress.report({ increment: 100, message: "Complete! 🎉" });
        } catch (error) {
          console.error("❌ Extension Error:", error);
          vscode.window.showErrorMessage(`Failed to generate README: ${error}`);
        }
      }
    );
  }

  /**
   * Show the main generation choice dialog
   */
  private async showGenerationChoiceDialog(
    projectName: string
  ): Promise<"ai" | "template" | undefined> {
    const choices = [
      {
        label: "🤖 AI-Powered README",
        detail:
          "Generate comprehensive, project-specific documentation with AI",
        description: "Uses your Groq API key for premium results",
        value: "ai" as const,
      },
      {
        label: "📝 Template README",
        detail: "Generate professional README with smart templates",
        description: "Works instantly without any setup",
        value: "template" as const,
      },
    ];

    const selected = await vscode.window.showQuickPick(choices, {
      title: `🚀 IntelliREADME - Generate README for "${projectName}"`,
      placeHolder: "Choose your README generation method",
      ignoreFocusOut: true,
    });

    return selected?.value;
  }

  /**
   * Show API key setup dialog with options
   */
  private async showApiKeySetupDialog(): Promise<boolean> {
    const choice = await vscode.window.showInformationMessage(
      "🤖 AI README Generation",
      {
        detail:
          "AI-powered READMEs require a free Groq API key. Get yours in 2 minutes!",
        modal: true,
      },
      "🌐 Get Free API Key",
      "🔑 Enter API Key",
      "📝 Use Templates Instead"
    );

    switch (choice) {
      case "🌐 Get Free API Key":
        // Open Groq console
        await vscode.env.openExternal(
          vscode.Uri.parse("https://console.groq.com")
        );

        // Ask if they want to enter key now
        const followUp = await vscode.window.showInformationMessage(
          "✅ Groq Console Opened!",
          {
            detail:
              'Sign up → Create API Key → Copy it. Then click "Enter Key" below.',
            modal: true,
          },
          "🔑 Enter My API Key",
          "📝 Use Templates For Now"
        );

        if (followUp === "🔑 Enter My API Key") {
          return await this.promptAndSaveApiKey();
        }
        return false;

      case "🔑 Enter API Key":
        return await this.promptAndSaveApiKey();

      case "📝 Use Templates Instead":
      default:
        return false;
    }
  }

  /**
   * Prompt for API key and save it
   */
  private async promptAndSaveApiKey(): Promise<boolean> {
    const apiKey = await vscode.window.showInputBox({
      title: "🔑 Enter Your Groq API Key",
      prompt: "Paste your API key from console.groq.com",
      password: true,
      placeHolder: "gsk_...",
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) return "API key is required";
        if (!value.startsWith("gsk_")) return 'Groq API keys start with "gsk_"';
        if (value.length < 40) return "API key seems too short";
        return null;
      },
    });

    if (apiKey) {
      try {
        await ConfigManager.setGroqApiKey(apiKey);
        vscode.window.showInformationMessage(
          "🎉 API key saved! Generating AI-powered README..."
        );
        return true;
      } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to save API key: ${error}`);
        return false;
      }
    }

    return false;
  }

  /**
   * Generate README with AI (with error handling)
   */
  private async generateWithAI(projectInfo: any): Promise<string> {
    try {
      return await this.groqService.generateReadme(projectInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("Invalid API key")) {
        vscode.window.showWarningMessage(
          "❌ Invalid API key. Using templates instead."
        );
        await ConfigManager.manageApiKey(); // Let user fix the key
      } else if (errorMessage.includes("rate limit")) {
        vscode.window.showWarningMessage(
          "⚠️ Rate limit exceeded. Using templates instead."
        );
      } else {
        vscode.window.showWarningMessage(
          `AI generation failed: ${errorMessage}. Using templates.`
        );
      }

      // Fallback to templates
      return await this.templateService.generateReadme(projectInfo);
    }
  }

  /**
   * Save README and open it
   */
  private async saveAndOpenReadme(
    workspacePath: string,
    content: string,
    method: string
  ): Promise<void> {
    const readmePath = path.join(workspacePath, "README.md");

    // Check if README already exists
    if (fs.existsSync(readmePath)) {
      const overwrite = await vscode.window.showWarningMessage(
        "📄 README.md already exists",
        {
          detail: "Do you want to overwrite the existing README file?",
          modal: true,
        },
        "Overwrite",
        "Cancel"
      );

      if (overwrite !== "Overwrite") {
        return;
      }
    }

    // Save the file
    fs.writeFileSync(readmePath, content, "utf8");

    // Open the file
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // Show success message with options
    vscode.window
      .showInformationMessage(
        `🎉 README.md generated successfully with ${method}!`,
        "View Preview",
        "Settings",
        "Generate Another"
      )
      .then((selection) => {
        switch (selection) {
          case "View Preview":
            vscode.commands.executeCommand(
              "markdown.showPreview",
              vscode.Uri.file(readmePath)
            );
            break;
          case "Settings":
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "intelliReadme"
            );
            break;
          case "Generate Another":
            this.generateReadme();
            break;
        }
      });
  }

  /**
   * Set up API key from command
   */
  async setApiKey(): Promise<void> {
    await ConfigManager.manageApiKey();
  }

  /**
   * Show help and onboarding
   */
  async showHelp(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "intelliReadmeHelp",
      "🚀 IntelliREADME Help",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getHelpHTML();
  }

  /**
   * Show configuration status
   */
  async showStatus(): Promise<void> {
    await ConfigManager.showConfigStatus();
  }

  private getHelpHTML(): string {
    const hasApiKey = ConfigManager.hasValidApiKey();

    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>IntelliREADME Help</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 30px;
                line-height: 1.6;
                color: var(--vscode-editor-foreground);
                background: var(--vscode-editor-background);
            }
            h1 { color: #007acc; margin-bottom: 30px; }
            h2 { color: #4CAF50; margin-top: 40px; }
            .status-box {
                background: var(--vscode-textBlockQuote-background);
                border-left: 4px solid #007acc;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .step { margin: 15px 0; padding: 10px; }
            .step-number {
                background: #007acc;
                color: white;
                border-radius: 50%;
                width: 25px;
                height: 25px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
                font-weight: bold;
            }
            code {
                background: var(--vscode-textCodeBlock-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
            }
            .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            a { color: #007acc; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .feature { margin: 10px 0; }
            .emoji { font-size: 1.2em; margin-right: 8px; }
        </style>
    </head>
    <body>
        <h1>🚀 Welcome to IntelliREADME</h1>
        
        <div class="status-box">
            <strong>📊 Current Status:</strong><br>
            ${
              hasApiKey
                ? "✅ API Key Configured - AI features ready!<br>🤖 You can generate AI-powered READMEs"
                : "⚠️ No API Key - Template mode only<br>📝 Add API key for AI-powered generation"
            }
        </div>

        <h2>🎯 Quick Start Guide</h2>
        
        <div class="step">
            <span class="step-number">1</span>
            <strong>Open any project folder</strong> in VS Code
        </div>
        
        <div class="step">
            <span class="step-number">2</span>
            <strong>Press <code>Ctrl+Shift+P</code></strong> to open Command Palette
        </div>
        
        <div class="step">
            <span class="step-number">3</span>
            <strong>Type "Generate README"</strong> and select the command
        </div>
        
        <div class="step">
            <span class="step-number">4</span>
            <strong>Choose generation method:</strong>
            <ul>
                <li>🤖 <strong>AI-Powered</strong> - Premium, project-specific content</li>
                <li>📝 <strong>Templates</strong> - Professional, instant results</li>
            </ul>
        </div>

        <h2>🤖 AI-Powered Generation Setup</h2>
        
        <div class="highlight">
            <strong>🎁 Get Your FREE API Key (2 minutes):</strong>
        </div>
        
        <div class="step">
            <span class="step-number">1</span>
            Visit <a href="https://console.groq.com" target="_blank">console.groq.com</a>
        </div>
        
        <div class="step">
            <span class="step-number">2</span>
            Sign up with email (no credit card needed!)
        </div>
        
        <div class="step">
            <span class="step-number">3</span>
            Go to "API Keys" → "Create API Key"
        </div>
        
        <div class="step">
            <span class="step-number">4</span>
            Copy the key and paste it in IntelliREADME
        </div>

        <h2>✨ Features</h2>
        
        <div class="feature">
            <span class="emoji">🧠</span><strong>Smart Project Analysis</strong> - Detects frameworks, dependencies, structure
        </div>
        
        <div class="feature">
            <span class="emoji">🎨</span><strong>Professional Styling</strong> - Badges, emojis, perfect formatting
        </div>
        
        <div class="feature">
            <span class="emoji">🔧</span><strong>Context-Aware</strong> - Different content for React, API, Python projects
        </div>
        
        <div class="feature">
            <span class="emoji">📊</span><strong>Comprehensive Docs</strong> - Installation, usage, architecture, and more
        </div>
        
        <div class="feature">
            <span class="emoji">🔐</span><strong>Secure & Private</strong> - Your API key stays on your machine
        </div>

        <h2>🔐 Privacy & Security</h2>
        
        <ul>
            <li>✅ <strong>Your API key never leaves your computer</strong></li>
            <li>✅ <strong>No data collection or tracking</strong></li>
            <li>✅ <strong>Open source transparency</strong></li>
            <li>✅ <strong>Enterprise-ready security</strong></li>
        </ul>

        <h2>🆘 Need Help?</h2>
        
        <p><strong>Commands available:</strong></p>
        <ul>
            <li><code>IntelliREADME: Generate README</code> - Main command</li>
            <li><code>IntelliREADME: Manage API Key</code> - Setup/update API key</li>
            <li><code>IntelliREADME: Show Status</code> - View current settings</li>
        </ul>

        <div class="highlight">
            <strong>🎉 Ready to create amazing READMEs?</strong><br>
            Close this tab and run the "Generate README" command!
        </div>
    </body>
    </html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("🚀 IntelliREADME extension is now active!");

  const extension = new IntelliREADMEExtension();

  // Register all commands
  const commands = [
    vscode.commands.registerCommand("IntelliREADME.generateReadme", () =>
      extension.generateReadme()
    ),
    vscode.commands.registerCommand("IntelliREADME.setApiKey", () =>
      extension.setApiKey()
    ),
    vscode.commands.registerCommand("IntelliREADME.showHelp", () =>
      extension.showHelp()
    ),
    vscode.commands.registerCommand("IntelliREADME.showStatus", () =>
      extension.showStatus()
    ),
  ];

  context.subscriptions.push(...commands);

  // Show welcome message for first-time users
  const hasShownWelcome = context.globalState.get("hasShownWelcome", false);

  if (!hasShownWelcome) {
    setTimeout(async () => {
      const action = await vscode.window.showInformationMessage(
        "🎉 IntelliREADME is ready to create amazing READMEs!",
        "Quick Start Guide",
        "Generate README Now",
        "Dismiss"
      );

      switch (action) {
        case "Quick Start Guide":
          extension.showHelp();
          break;
        case "Generate README Now":
          extension.generateReadme();
          break;
      }

      context.globalState.update("hasShownWelcome", true);
    }, 2000);
  }
}

export function deactivate() {
  console.log("👋 IntelliREADME extension deactivated");
}
