import * as fs from "fs";
import * as path from "path";
import { ProjectInfo } from "../models/ProjectInfo";
import { FileUtils } from "./fileUtils";

export class ProjectAnalyzer {
  static async analyzeProject(workspacePath: string): Promise<ProjectInfo> {
    const packageJsonPath = path.join(workspacePath, "package.json");
    const workspaceName = path.basename(workspacePath);

    let projectInfo: ProjectInfo = {
      name: workspaceName,
      dependencies: [],
      devDependencies: [],
      scripts: [],
      fileTypes: [],
      hasTests: false,
      workspacePath: workspacePath,
    };

    // Read package.json if exists
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8")
        );
        projectInfo.name = packageJson.name || projectInfo.name;
        projectInfo.description = packageJson.description;
        projectInfo.license = packageJson.license;
        projectInfo.repository =
          packageJson.repository?.url || packageJson.repository;
        projectInfo.version = packageJson.version;
        projectInfo.author = packageJson.author?.name || packageJson.author;
        projectInfo.homepage = packageJson.homepage;

        projectInfo.dependencies = Object.keys(packageJson.dependencies || {});
        projectInfo.devDependencies = Object.keys(
          packageJson.devDependencies || {}
        );
        projectInfo.scripts = Object.keys(packageJson.scripts || {});
      } catch (error) {
        console.error("Error reading package.json:", error);
      }
    }

    // Get file types
    projectInfo.fileTypes = FileUtils.getFileTypes(workspacePath);
    projectInfo.hasTests = FileUtils.hasTestFiles(workspacePath);
    projectInfo.framework = this.detectFramework(projectInfo);

    return projectInfo;
  }

  private static detectFramework(projectInfo: ProjectInfo): string {
    const deps = [...projectInfo.dependencies, ...projectInfo.devDependencies];

    if (deps.some((dep) => dep.includes("next"))) return "Next.js";
    if (deps.some((dep) => dep.includes("nuxt"))) return "Nuxt.js";
    if (deps.some((dep) => dep.includes("react"))) return "React";
    if (deps.some((dep) => dep.includes("vue"))) return "Vue.js";
    if (deps.some((dep) => dep.includes("angular"))) return "Angular";
    if (deps.some((dep) => dep.includes("express"))) return "Express.js";
    if (deps.some((dep) => dep.includes("nestjs"))) return "NestJS";
    if (projectInfo.fileTypes.includes(".py")) return "Python";
    if (deps.length > 0) return "Node.js";

    return "Software";
  }
}
