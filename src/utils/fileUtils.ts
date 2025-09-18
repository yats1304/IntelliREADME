import * as fs from "fs";
import * as path from "path";

export class FileUtils {
  static getFileTypes(projectPath: string): string[] {
    const fileTypes = new Set<string>();
    try {
      const scanDirectory = (dir: string, depth: number = 0) => {
        if (depth > 2) {return;}

        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (file.startsWith(".") || file === "node_modules") {return;}

          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isFile()) {
            const ext = path.extname(file);
            if (ext) {fileTypes.add(ext);}
          } else if (stat.isDirectory() && depth < 2) {
            scanDirectory(filePath, depth + 1);
          }
        });
      };

      scanDirectory(projectPath);
    } catch (error) {
      console.error("Error scanning files:", error);
    }
    return Array.from(fileTypes);
  }

  static hasTestFiles(projectPath: string): boolean {
    try {
      const checkDirectory = (dir: string, depth: number = 0): boolean => {
        if (depth > 2) {return false;}

        const files = fs.readdirSync(dir);
        return files.some((file) => {
          if (file.startsWith(".") || file === "node_modules") {return false;}

          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isFile()) {
            return (
              file.toLowerCase().includes("test") ||
              file.toLowerCase().includes("spec") ||
              file.includes(".test.") ||
              file.includes(".spec.")
            );
          } else if (stat.isDirectory()) {
            return (
              file.toLowerCase().includes("test") ||
              file.toLowerCase().includes("spec") ||
              file === "__tests__" ||
              checkDirectory(filePath, depth + 1)
            );
          }
          return false;
        });
      };

      return checkDirectory(projectPath);
    } catch (error) {
      return false;
    }
  }

  static getInstallCommand(workspacePath: string): string {
    if (fs.existsSync(path.join(workspacePath, "pnpm-lock.yaml"))) {
      return "pnpm install";
    } else if (fs.existsSync(path.join(workspacePath, "yarn.lock"))) {
      return "yarn install";
    }
    return "npm install";
  }

  static getStartCommand(projectInfo: any, workspacePath: string): string {
    if (projectInfo.scripts.includes("dev")) {
      return fs.existsSync(path.join(workspacePath, "pnpm-lock.yaml"))
        ? "pnpm dev"
        : "npm run dev";
    }
    return fs.existsSync(path.join(workspacePath, "pnpm-lock.yaml"))
      ? "pnpm start"
      : "npm start";
  }
}
