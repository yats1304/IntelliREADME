import { ProjectInfo } from "../models/ProjectInfo";

export class BadgeGenerator {
  static generateBadges(projectInfo: ProjectInfo): string {
    const badges: string[] = [];

    // Framework badges
    if (projectInfo.dependencies.some((dep) => dep.includes("react"))) {
      badges.push(
        `![React](https://img.shields.io/badge/React-18+-blue?style=flat-square&logo=react)`
      );
    }

    if (
      projectInfo.fileTypes.includes(".ts") ||
      projectInfo.fileTypes.includes(".tsx")
    ) {
      badges.push(
        `![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)`
      );
    }

    if (projectInfo.devDependencies.some((dep) => dep.includes("vite"))) {
      badges.push(
        `![Vite](https://img.shields.io/badge/Vite-5+-purple?style=flat-square&logo=vite)`
      );
    }

    if (projectInfo.dependencies.some((dep) => dep.includes("next"))) {
      badges.push(
        `![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)`
      );
    }

    return badges.join("\n");
  }
}
