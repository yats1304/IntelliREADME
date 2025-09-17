export interface ProjectInfo {
  name: string;
  description?: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: string[];
  fileTypes: string[];
  hasTests: boolean;
  license?: string;
  repository?: string;
  framework?: string;
  workspacePath: string;
  version?: string;
  author?: string;
  homepage?: string;
}
