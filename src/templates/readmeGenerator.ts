import * as fs from "fs";
import * as path from "path";
import { ProjectInfo } from "../models/ProjectInfo";
import { BadgeGenerator } from "../utils/badgeGenerator";
import { FileUtils } from "../utils/fileUtils";

export class ReadmeGenerator {
  static capitalizeTitle(title: string): string {
    return title
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  static generateFeatures(projectInfo: ProjectInfo): string {
    const commonFeatures = [
      "🎨 **Modern UI/UX** - Clean and intuitive user interface",
      "📱 **Responsive Design** - Works seamlessly on desktop and mobile devices",
      "⚡ **Fast Performance** - Optimized for speed and efficiency",
      "🔧 **Easy Configuration** - Simple setup and customization",
    ];

    const reactFeatures = [
      "🔄 **Real-time Updates** - Dynamic content updates",
      "🎯 **Component-based Architecture** - Reusable and maintainable components",
      "📊 **State Management** - Efficient state handling",
      "🌓 **Theme Support** - Light and dark mode toggle",
    ];

    const nodeFeatures = [
      "🔐 **Secure Authentication** - JWT-based authentication",
      "📡 **RESTful API** - Well-structured API endpoints",
      "💾 **Database Integration** - Efficient data management",
      "🔒 **Input Validation** - Secure data handling",
    ];

    let features = [...commonFeatures];

    if (projectInfo.dependencies.some((dep) => dep.includes("react"))) {
      features = [...features, ...reactFeatures];
    }

    if (
      projectInfo.dependencies.some(
        (dep) => dep.includes("express") || dep.includes("nestjs")
      )
    ) {
      features = [...features, ...nodeFeatures];
    }

    if (projectInfo.hasTests) {
      features.push("✅ **Comprehensive Testing** - Full test coverage");
    }

    return features.join("\n");
  }

  static generateTechStack(projectInfo: ProjectInfo): string {
    let techStack = "### Frontend\n";

    if (projectInfo.dependencies.some((dep) => dep.includes("react"))) {
      techStack += `- **Framework**: React with ${
        projectInfo.devDependencies.some((dep) => dep.includes("vite"))
          ? "Vite"
          : "Create React App"
      }\n`;
    }

    if (
      projectInfo.fileTypes.includes(".ts") ||
      projectInfo.fileTypes.includes(".tsx")
    ) {
      techStack += "- **Language**: TypeScript\n";
    } else {
      techStack += "- **Language**: JavaScript\n";
    }

    if (
      projectInfo.dependencies.some(
        (dep) => dep.includes("tailwind") || dep.includes("tailwindcss")
      )
    ) {
      techStack += "- **Styling**: Tailwind CSS\n";
    }

    const uiLibs = projectInfo.dependencies.filter(
      (dep) =>
        dep.includes("mui") ||
        dep.includes("antd") ||
        dep.includes("chakra") ||
        dep.includes("mantine")
    );
    if (uiLibs.length > 0) {
      techStack += `- **UI Components**: ${uiLibs[0]}\n`;
    }

    techStack += "\n### Development Tools\n";

    if (projectInfo.devDependencies.some((dep) => dep.includes("vite"))) {
      techStack += "- **Build Tool**: Vite\n";
    }

    if (projectInfo.devDependencies.some((dep) => dep.includes("eslint"))) {
      techStack += "- **Linter**: ESLint\n";
    }

    return techStack;
  }

  static generateFolderStructure(
    dirPath: string,
    depth: number,
    prefix: string = ""
  ): string {
    if (depth === 0) return "";

    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });

      const filteredFiles = files
        .filter((f) => {
          const skipList = [
            "node_modules",
            ".git",
            ".vscode",
            "dist",
            "build",
            ".next",
            ".nuxt",
            "__pycache__",
            "coverage",
          ];
          return !skipList.includes(f.name) && !f.name.startsWith(".");
        })
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

      return filteredFiles
        .map((f, idx, arr) => {
          const pointer = idx === arr.length - 1 ? "└── " : "├── ";
          const newPrefix = prefix + (idx === arr.length - 1 ? "  " : "│ ");

          if (f.isDirectory()) {
            const comment = this.getFolderComment(f.name);
            const subStructure = this.generateFolderStructure(
              path.join(dirPath, f.name),
              depth - 1,
              newPrefix
            );
            return `${prefix}${pointer}${f.name}/${comment}\n${subStructure}`;
          } else {
            const comment = this.getFileComment(f.name);
            return `${prefix}${pointer}${f.name}${comment}\n`;
          }
        })
        .join("");
    } catch (error) {
      return `${prefix}└── (Unable to read directory)\n`;
    }
  }

  private static getFolderComment(folderName: string): string {
    const comments: { [key: string]: string } = {
      src: " # Source code",
      components: " # React components",
      pages: " # Page components",
      hooks: " # Custom React hooks",
      utils: " # Utility functions",
      api: " # API services",
      lib: " # Library files",
      styles: " # Styling files",
      assets: " # Static assets",
      public: " # Public assets",
      tests: " # Test files",
      __tests__: " # Test files",
      config: " # Configuration files",
    };
    return comments[folderName] || "";
  }

  private static getFileComment(fileName: string): string {
    const comments: { [key: string]: string } = {
      "package.json": " # Dependencies and scripts",
      "vite.config.ts": " # Vite configuration",
      "vite.config.js": " # Vite configuration",
      "tsconfig.json": " # TypeScript configuration",
      "tailwind.config.js": " # Tailwind configuration",
      "eslint.config.js": " # ESLint configuration",
      ".env": " # Environment variables",
      "README.md": " # Project documentation",
    };
    return comments[fileName] || "";
  }
}
