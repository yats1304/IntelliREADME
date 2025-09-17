import * as fs from "fs";
import * as path from "path";
import { AIService } from "./AIService";
import { ProjectInfo } from "../models/ProjectInfo";
import { BadgeGenerator } from "../utils/badgeGenerator";
import { ReadmeGenerator } from "../templates/readmeGenerator";
import { FileUtils } from "../utils/fileUtils";

export class TemplateService implements AIService {
  async generateReadme(projectInfo: ProjectInfo): Promise<string> {
    console.log("📝 Using enhanced template generation...");

    const isReact = projectInfo.dependencies.some(
      (dep) => dep.includes("react") || dep.includes("next")
    );
    const isVite =
      projectInfo.dependencies.some((dep) => dep.includes("vite")) ||
      projectInfo.devDependencies.some((dep) => dep.includes("vite"));

    // Generate comprehensive badges
    const badges = BadgeGenerator.generateBadges(projectInfo);

    let template = `# ${
      projectInfo.name.startsWith("#")
        ? projectInfo.name
        : `🚀 ${ReadmeGenerator.capitalizeTitle(projectInfo.name)}`
    }

${
  projectInfo.description ||
  "A modern application built with cutting-edge technologies."
}

${badges}

## 🚀 Live Demo
${
  projectInfo.homepage
    ? `- **Application**: [${projectInfo.homepage}](${projectInfo.homepage})`
    : "- Live demo will be available soon"
}

## 📋 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
${projectInfo.repository ? "- [API Documentation](#-api-documentation)" : ""}
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## ✨ Features

${ReadmeGenerator.generateFeatures(projectInfo)}

## 🛠 Tech Stack

${ReadmeGenerator.generateTechStack(projectInfo)}

## 📦 Installation

### Prerequisites
${this.generatePrerequisites(projectInfo)}

### Installation

1. Clone the repository:
    \`\`\`bash
    git clone ${
      projectInfo.repository || "https://github.com/username/repository.git"
    }
    cd ${projectInfo.name}
    \`\`\`

2. Install dependencies:
    \`\`\`bash
    ${FileUtils.getInstallCommand(projectInfo.workspacePath)}
    \`\`\`

${this.generateEnvironmentSetup(projectInfo)}

3. Run the project:
    \`\`\`bash
    ${FileUtils.getStartCommand(projectInfo, projectInfo.workspacePath)}
    \`\`\`

4. Open your browser:
    \`\`\`bash
    Navigate to \`${
      isReact
        ? "http://localhost:3000"
        : isVite
        ? "http://localhost:5173"
        : "http://localhost:3000"
    }\`
    \`\`\`

## 🎯 Usage

${this.generateUsageInstructions(projectInfo)}

${projectInfo.repository ? this.generateAPIDocumentation(projectInfo) : ""}

## 📁 Project Structure

\`\`\`
${ReadmeGenerator.generateFolderStructure(projectInfo.workspacePath, 3)}
\`\`\`

## 📝 Available Scripts

${this.generateScriptDocumentation(projectInfo)}

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

${
  projectInfo.license
    ? `This project is licensed under the ${projectInfo.license} License - see the [LICENSE](LICENSE) file for details.`
    : "This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details."
}

## 👨‍💻 Contact

${projectInfo.author ? `**${projectInfo.author}**` : "**Developer**"}
${
  projectInfo.repository
    ? `- GitHub: [${this.extractGitHubUsername(
        projectInfo.repository
      )}](${projectInfo.repository.replace(".git", "")})`
    : "- GitHub: [@username](https://github.com/username)"
}
- Email: [developer@email.com](mailto:developer@email.com)

## 🙏 Acknowledgments

${this.generateAcknowledgments(projectInfo)}

---

<div align="center">
  Made with ❤️ by ${projectInfo.author || "Developer"}
</div>
`;

    return template;
  }

  private generatePrerequisites(projectInfo: ProjectInfo): string {
    const isReact = projectInfo.dependencies.some((dep) =>
      dep.includes("react")
    );
    const isPython = projectInfo.fileTypes.includes(".py");

    if (isPython) {
      return "- Python 3.8 or higher\n- pip package manager";
    } else if (isReact) {
      return "- Node.js 18.0 or higher\n- npm, pnpm, or yarn package manager";
    }

    return "- Node.js 16.0 or higher\n- npm package manager";
  }

  private generateEnvironmentSetup(projectInfo: ProjectInfo): string {
    const envFile = path.join(projectInfo.workspacePath, ".env.example");
    if (fs.existsSync(envFile)) {
      return `\n3. Set up environment variables:\n    \`\`\`bash\n    cp .env.example .env\n    # Edit .env with your configuration\n    \`\`\`\n`;
    }
    return "";
  }

  private generateUsageInstructions(projectInfo: ProjectInfo): string {
    const isReact = projectInfo.dependencies.some((dep) =>
      dep.includes("react")
    );

    if (isReact) {
      return `- **Development**: Start the development server and begin coding
- **Components**: Edit components in the \`src\` folder
- **Styling**: Customize styles and themes
- **Build**: Create production builds for deployment
- **Testing**: Run tests to ensure code quality`;
    }

    return `- **Development**: Use the available scripts for development
- **Configuration**: Customize settings as needed
- **Deployment**: Build and deploy using the provided scripts`;
  }

  private generateAPIDocumentation(projectInfo: ProjectInfo): string {
    return `\n## 🌐 API Documentation

This application integrates with various APIs and services:
- **Authentication**: JWT-based authentication system
- **Data Management**: RESTful API endpoints
- **Real-time Updates**: WebSocket connections for live data

For detailed API documentation, visit the [API docs](${projectInfo.repository}/docs) or check the \`/docs\` folder.\n`;
  }

  private generateScriptDocumentation(projectInfo: ProjectInfo): string {
    const scriptDescriptions: { [key: string]: string } = {
      dev: "Start development server with hot reload",
      start: "Start production server",
      build: "Build the application for production",
      test: "Run test suite",
      lint: "Lint code and fix issues",
      preview: "Preview production build locally",
      format: "Format code with Prettier",
      "type-check": "Run TypeScript type checking",
    };

    return projectInfo.scripts
      .map((script) => {
        const description = scriptDescriptions[script] || "Custom script";
        const command = fs.existsSync(
          path.join(projectInfo.workspacePath, "pnpm-lock.yaml")
        )
          ? `pnpm ${script}`
          : `npm run ${script}`;
        return `- \`${command}\` - ${description}`;
      })
      .join("\n");
  }

  private generateAcknowledgments(projectInfo: ProjectInfo): string {
    const acknowledgments = [];

    if (projectInfo.dependencies.some((dep) => dep.includes("react"))) {
      acknowledgments.push(
        "- [React](https://reactjs.org/) for the amazing UI library"
      );
    }

    if (projectInfo.devDependencies.some((dep) => dep.includes("vite"))) {
      acknowledgments.push(
        "- [Vite](https://vitejs.dev/) for lightning-fast development"
      );
    }

    if (projectInfo.dependencies.some((dep) => dep.includes("tailwind"))) {
      acknowledgments.push(
        "- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling"
      );
    }

    acknowledgments.push("- Open source community for continuous inspiration");

    return acknowledgments.join("\n");
  }

  private extractGitHubUsername(repo: string): string {
    const match = repo.match(/github\.com\/([^\/]+)/);
    return match ? `@${match[1]}` : "@username";
  }
}
