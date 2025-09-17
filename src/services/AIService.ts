import { ProjectInfo } from "../models/ProjectInfo";

export interface AIService {
  generateReadme(projectInfo: ProjectInfo): Promise<string>;
}
