import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { TemplateService } from "./services/TemplateService";
import { ProjectAnalyzer } from "./utils/projectAnalyzer";

class IntelliREADMEExtension {
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  async generateReadme(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        "🚨 No workspace folder found. Please open a project folder."
      );
      return;
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "🧠 IntelliREADME is creating comprehensive documentation...",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({
            increment: 0,
            message: "Analyzing project structure...",
          });

          const projectInfo = await ProjectAnalyzer.analyzeProject(
            workspacePath
          );
          console.log("📊 Project analysis:", projectInfo);

          progress.report({
            increment: 50,
            message: "Generating professional README...",
          });

          const readmeContent = await this.templateService.generateReadme(
            projectInfo
          );

          progress.report({
            increment: 80,
            message: "Saving comprehensive documentation...",
          });

          const readmePath = path.join(workspacePath, "README.md");
          fs.writeFileSync(readmePath, readmeContent, "utf8");

          progress.report({ increment: 100, message: "Complete!" });

          const doc = await vscode.workspace.openTextDocument(readmePath);
          await vscode.window.showTextDocument(doc);

          vscode.window
            .showInformationMessage(
              "🎉 Comprehensive README.md generated successfully!",
              "View Preview"
            )
            .then((selection) => {
              if (selection === "View Preview") {
                vscode.commands.executeCommand(
                  "markdown.showPreview",
                  vscode.Uri.file(readmePath)
                );
              }
            });
        } catch (error) {
          console.error("❌ Error:", error);
          vscode.window.showErrorMessage(`Failed to generate README: ${error}`);
        }
      }
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("🚀 IntelliREADME extension is now active!");

  const extension = new IntelliREADMEExtension();

  const generateCommand = vscode.commands.registerCommand(
    "IntelliREADME.generateReadme",
    () => extension.generateReadme()
  );

  context.subscriptions.push(generateCommand);
}

export function deactivate() {
  console.log("👋 IntelliREADME extension deactivated");
}
