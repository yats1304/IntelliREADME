import { AIService } from "./AIService";
import { ProjectInfo } from "../models/ProjectInfo";
import { ConfigManager } from "../utils/ConfigManager";
import * as fs from "fs";
import * as path from "path";

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
}

interface ProjectAnalysis {
  projectType: string;
  mainPurpose: string;
  keyTechnologies: string[];
  frameworkDetails: string;
  specialFeatures: string[];
  architectureNotes: string;
  deploymentHints: string;
  projectStructure: string;
}

export class GroqService implements AIService {
  private baseURL = "https://api.groq.com/openai/v1/chat/completions";

  private models = [
    "moonshotai/kimi-k2-instruct",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
  ];

  async generateReadme(projectInfo: ProjectInfo): Promise<string> {
    const apiKey = ConfigManager.getGroqApiKey();

    if (!apiKey) {
      throw new Error("No API key configured. Please set your Groq API key.");
    }

    console.log(
      "🚀 GROQ: Analyzing and generating README for:",
      projectInfo.name
    );

    // Perform deep project analysis
    const analysis = this.performDeepProjectAnalysis(projectInfo);
    console.log("🔍 GROQ: Project analysis complete:", analysis.projectType);

    const preferredModel = ConfigManager.getPreferredModel();
    const modelsToTry = [
      preferredModel,
      ...this.models.filter((m) => m !== preferredModel),
    ];

    for (const model of modelsToTry) {
      try {
        console.log(`🤖 GROQ: Using model: ${model}`);

        const response = await fetch(this.baseURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `You are a PREMIUM technical documentation expert who creates STYLISH, COMPREHENSIVE README.md files for GitHub repositories. Your documentation should be showcase-quality, visually appealing, and professionally detailed.

CORE EXPERTISE:
- Create GitHub showcase-quality documentation (2000+ words)
- Generate project-specific content based on ACTUAL analysis
- Use professional styling with strategic emoji placement
- Include comprehensive technical details and architecture insights
- Focus on visual hierarchy and scannable formatting
- Make projects attractive to users, contributors, and employers
- Avoid generic template language - be specific and engaging`,
              },
              {
                role: "user",
                content: this.buildIntelligentPrompt(projectInfo, analysis),
              },
            ],
            max_tokens: 4000,
            temperature: 0.75,
            top_p: 0.9,
            presence_penalty: 0.2,
            frequency_penalty: 0.1,
          }),
        });

        console.log(`📡 GROQ: Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();

          if (response.status === 401) {
            throw new Error("Invalid API key. Please check your Groq API key.");
          } else if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }

          console.log(`⚠️ GROQ: Model ${model} failed: ${errorText}`);
          continue;
        }

        let data: GroqResponse;
        try {
          data = (await response.json()) as GroqResponse;
        } catch (parseError) {
          console.log(`❌ GROQ: Parse error for ${model}`);
          continue;
        }

        const readme = data?.choices?.[0]?.message?.content;

        if (!readme || readme.trim().length < 1000) {
          console.log(
            `⚠️ GROQ: Insufficient content from ${model} (${
              readme?.length || 0
            } chars)`
          );
          continue;
        }

        console.log(
          `✅ GROQ: SUCCESS with ${model}! Generated ${readme.length} characters`
        );
        console.log(`🎯 GROQ: Preview: ${readme.substring(0, 200)}...`);

        return readme.trim();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`❌ GROQ: Model ${model} error: ${errorMessage}`);

        if (
          errorMessage.includes("Invalid API key") ||
          errorMessage.includes("rate limit")
        ) {
          throw error;
        }
        continue;
      }
    }

    throw new Error("All AI models failed. Check your API key and try again.");
  }

  private performDeepProjectAnalysis(
    projectInfo: ProjectInfo
  ): ProjectAnalysis {
    const deps = projectInfo.dependencies.join(" ").toLowerCase();
    const devDeps = projectInfo.devDependencies.join(" ").toLowerCase();
    const allDeps = `${deps} ${devDeps}`;
    const scripts = projectInfo.scripts.join(" ").toLowerCase();
    const fileTypes = projectInfo.fileTypes.join(" ");
    const projectName = projectInfo.name.toLowerCase();

    console.log("🔍 Analyzing dependencies:", allDeps.substring(0, 100));
    console.log("🔍 Analyzing file types:", fileTypes);
    console.log("🔍 Analyzing scripts:", scripts);

    // Get actual project structure
    const projectStructure = this.analyzeProjectStructure(
      projectInfo.workspacePath
    );

    // Intelligent project type detection
    let projectType = "Application";
    let mainPurpose = "A modern software application";
    let keyTechnologies: string[] = [];
    let frameworkDetails = "";
    let specialFeatures: string[] = [];
    let architectureNotes = "";
    let deploymentHints = "";

    // API/Backend Detection
    if (
      allDeps.includes("express") ||
      allDeps.includes("fastify") ||
      allDeps.includes("koa") ||
      allDeps.includes("nestjs") ||
      fileTypes.includes("controller") ||
      scripts.includes("start")
    ) {
      projectType = "Backend API";
      mainPurpose = "A robust backend API service providing RESTful endpoints";
      keyTechnologies.push("Node.js", "Express/Fastify", "API Development");
      frameworkDetails = "Built with modern Node.js framework";
      specialFeatures.push(
        "RESTful API endpoints",
        "Middleware integration",
        "Database connectivity"
      );
      architectureNotes = "Follows REST architectural patterns";
    }

    // React Application Detection
    else if (allDeps.includes("react")) {
      projectType = "React Application";
      frameworkDetails = "Built with React ecosystem";
      keyTechnologies.push("React", "JavaScript/TypeScript", "Modern Frontend");

      // Next.js Detection
      if (allDeps.includes("next")) {
        projectType = "Next.js Application";
        mainPurpose =
          "A full-stack React application with server-side rendering";
        frameworkDetails = "Built with Next.js framework";
        specialFeatures.push(
          "Server-side rendering",
          "API routes",
          "Static generation",
          "Image optimization"
        );
        deploymentHints =
          "Deployable on Vercel, Netlify, or any Node.js server";
      }
      // Vite Detection
      else if (allDeps.includes("vite") || scripts.includes("vite")) {
        mainPurpose = "A fast, modern React application built with Vite";
        specialFeatures.push(
          "Lightning-fast development",
          "Hot module replacement",
          "Optimized builds"
        );
        deploymentHints =
          "Builds to static files, deployable on any web server";
      }
      // Regular React App
      else {
        mainPurpose = "A dynamic React application with modern user interface";
        specialFeatures.push(
          "Component-based architecture",
          "Virtual DOM",
          "State management"
        );
      }

      // Detect specific React features
      if (allDeps.includes("router"))
        {specialFeatures.push("Client-side routing");}
      if (allDeps.includes("redux") || allDeps.includes("zustand"))
        {specialFeatures.push("State management");}
      if (allDeps.includes("query") || allDeps.includes("swr"))
        {specialFeatures.push("Data fetching optimization");}
    }

    // Vue.js Detection
    else if (allDeps.includes("vue")) {
      projectType = "Vue.js Application";
      mainPurpose =
        "A progressive Vue.js application with reactive user interface";
      frameworkDetails = "Built with Vue.js framework";
      keyTechnologies.push("Vue.js", "JavaScript/TypeScript", "Frontend");
      specialFeatures.push(
        "Reactive data binding",
        "Component composition",
        "Vue ecosystem"
      );
    }

    // Angular Detection
    else if (allDeps.includes("angular") || allDeps.includes("@angular")) {
      projectType = "Angular Application";
      mainPurpose =
        "A comprehensive Angular application with enterprise-grade features";
      frameworkDetails = "Built with Angular framework";
      keyTechnologies.push("Angular", "TypeScript", "Enterprise Frontend");
      specialFeatures.push(
        "Dependency injection",
        "RxJS integration",
        "Angular CLI"
      );
    }

    // Mobile App Detection
    else if (allDeps.includes("react-native") || allDeps.includes("expo")) {
      projectType = "React Native Mobile App";
      mainPurpose = "A cross-platform mobile application for iOS and Android";
      frameworkDetails = "Built with React Native";
      keyTechnologies.push(
        "React Native",
        "Mobile Development",
        "Cross-platform"
      );
      specialFeatures.push(
        "Native performance",
        "Cross-platform compatibility",
        "Mobile-optimized UI"
      );
    }

    // Desktop App Detection
    else if (allDeps.includes("electron")) {
      projectType = "Desktop Application";
      mainPurpose =
        "A cross-platform desktop application built with web technologies";
      frameworkDetails = "Built with Electron framework";
      keyTechnologies.push("Electron", "Desktop Development", "Cross-platform");
      specialFeatures.push(
        "Native desktop integration",
        "Cross-platform compatibility"
      );
    }

    // Python Detection
    else if (
      fileTypes.includes(".py") ||
      allDeps.includes("django") ||
      allDeps.includes("flask")
    ) {
      projectType = "Python Application";
      if (allDeps.includes("django")) {
        mainPurpose =
          "A Django web application with robust backend functionality";
        frameworkDetails = "Built with Django framework";
        specialFeatures.push(
          "ORM integration",
          "Admin interface",
          "Security features"
        );
      } else if (allDeps.includes("flask")) {
        mainPurpose = "A lightweight Flask web application";
        frameworkDetails = "Built with Flask framework";
        specialFeatures.push(
          "Lightweight architecture",
          "Flexible routing",
          "Template engine"
        );
      } else {
        mainPurpose = "A Python application with modern development practices";
        frameworkDetails = "Built with Python";
      }
      keyTechnologies.push("Python", "Backend Development");
    }

    // Specific Project Type Detection by Name/Dependencies
    if (
      projectName.includes("weather") ||
      projectName.includes("klimate") ||
      allDeps.includes("weather")
    ) {
      mainPurpose =
        "A comprehensive weather application providing real-time weather data and forecasts";
      specialFeatures.push(
        "Real-time weather data",
        "Location services",
        "Weather forecasts",
        "Interactive charts"
      );
    } else if (projectName.includes("todo") || projectName.includes("task")) {
      mainPurpose =
        "A task management application for organizing and tracking activities";
      specialFeatures.push(
        "Task creation and management",
        "Priority settings",
        "Progress tracking"
      );
    } else if (
      projectName.includes("ecommerce") ||
      projectName.includes("shop") ||
      allDeps.includes("stripe")
    ) {
      mainPurpose = "An e-commerce platform for online shopping and sales";
      specialFeatures.push(
        "Product catalog",
        "Shopping cart",
        "Payment processing",
        "Order management"
      );
    } else if (projectName.includes("blog") || allDeps.includes("contentful")) {
      mainPurpose =
        "A content management system for publishing and managing articles";
      specialFeatures.push(
        "Content creation",
        "Publishing system",
        "SEO optimization"
      );
    } else if (
      projectName.includes("chat") ||
      projectName.includes("message") ||
      allDeps.includes("socket.io")
    ) {
      mainPurpose =
        "A real-time communication platform for messaging and collaboration";
      specialFeatures.push(
        "Real-time messaging",
        "User presence",
        "Message history"
      );
    }

    // Technology-specific additions
    if (
      allDeps.includes("typescript") ||
      fileTypes.includes(".ts") ||
      fileTypes.includes(".tsx")
    ) {
      keyTechnologies.push("TypeScript");
      specialFeatures.push("Type safety", "Enhanced development experience");
    }
    if (allDeps.includes("tailwind")) {
      keyTechnologies.push("Tailwind CSS");
      specialFeatures.push("Utility-first styling", "Responsive design system");
    }
    if (
      allDeps.includes("prisma") ||
      allDeps.includes("mongoose") ||
      allDeps.includes("sequelize")
    ) {
      keyTechnologies.push("Database ORM");
      specialFeatures.push("Database integration", "Data modeling");
    }
    if (
      allDeps.includes("jest") ||
      allDeps.includes("vitest") ||
      allDeps.includes("cypress")
    ) {
      keyTechnologies.push("Testing Framework");
      specialFeatures.push("Automated testing", "Quality assurance");
    }

    // Architecture detection
    if (
      projectStructure.includes("components") &&
      projectStructure.includes("hooks")
    ) {
      architectureNotes =
        "Modern component-based architecture with custom hooks";
    } else if (
      projectStructure.includes("controllers") &&
      projectStructure.includes("models")
    ) {
      architectureNotes = "MVC (Model-View-Controller) architecture pattern";
    } else if (
      projectStructure.includes("services") &&
      projectStructure.includes("utils")
    ) {
      architectureNotes =
        "Service-oriented architecture with utility functions";
    }

    return {
      projectType,
      mainPurpose,
      keyTechnologies,
      frameworkDetails,
      specialFeatures,
      architectureNotes,
      deploymentHints,
      projectStructure,
    };
  }

  private analyzeProjectStructure(workspacePath: string): string {
    try {
      console.log("🔍 Analyzing project structure at:", workspacePath);

      const structure = this.generateDirectoryTree(workspacePath, 0, 3);
      console.log("📁 Generated structure:", structure.substring(0, 200));

      return structure;
    } catch (error) {
      console.log("⚠️ Could not analyze project structure:", error);
      return "Project structure analysis unavailable";
    }
  }

  private generateDirectoryTree(
    dirPath: string,
    depth: number = 0,
    maxDepth: number = 3
  ): string {
    if (depth > maxDepth) {return "";}

    try {
      const items = fs.readdirSync(dirPath);
      let tree = "";

      // Filter out common ignore patterns
      const filteredItems = items
        .filter(
          (item) =>
            !item.startsWith(".") &&
            item !== "node_modules" &&
            item !== "dist" &&
            item !== "build" &&
            item !== "coverage"
        )
        .slice(0, 15); // Limit items to prevent huge trees

      for (let i = 0; i < filteredItems.length; i++) {
        const item = filteredItems[i];
        const itemPath = path.join(dirPath, item);
        const isDirectory = fs.statSync(itemPath).isDirectory();
        const isLast = i === filteredItems.length - 1;

        const prefix = "│   ".repeat(depth) + (isLast ? "└── " : "├── ");
        tree += `${prefix}${item}${isDirectory ? "/" : ""}\n`;

        // Recursively add subdirectories
        if (isDirectory && depth < maxDepth) {
          tree += this.generateDirectoryTree(itemPath, depth + 1, maxDepth);
        }
      }

      return tree;
    } catch (error) {
      return "";
    }
  }

  private buildIntelligentPrompt(
    projectInfo: ProjectInfo,
    analysis: ProjectAnalysis
  ): string {
    // Enhanced project insights
    const projectInsights = this.generateProjectInsights(projectInfo, analysis);

    return `You are creating a PREMIUM, STYLISH README.md that will showcase this project professionally on GitHub. This should be comprehensive, visually appealing, and detailed like top-tier open-source projects.

=== COMPREHENSIVE PROJECT ANALYSIS ===
Project Name: ${projectInfo.name}
Project Category: ${analysis.projectType}
Main Functionality: ${analysis.mainPurpose}
Technical Framework: ${
      analysis.frameworkDetails || projectInfo.framework || "Modern Application"
    }
Core Technologies: ${analysis.keyTechnologies.join(", ")}
Architecture Pattern: ${analysis.architectureNotes}
Development Stage: Production-ready application

INTELLIGENT DEPENDENCY ANALYSIS:
Primary Dependencies: ${
      projectInfo.dependencies.slice(0, 20).join(", ") || "None"
    }
Development Stack: ${
      projectInfo.devDependencies.slice(0, 15).join(", ") || "None"
    }

DISCOVERED PROJECT CAPABILITIES:
${analysis.specialFeatures.map((f) => `✓ ${f}`).join("\n")}

REAL PROJECT ARCHITECTURE:
\`\`\`
${analysis.projectStructure}
\`\`\`

PROJECT METADATA:
- Available Scripts: ${projectInfo.scripts.join(", ") || "Standard scripts"}
- File Types: ${projectInfo.fileTypes.join(", ") || "Mixed file types"}
- Testing Suite: ${
      projectInfo.hasTests
        ? "Comprehensive testing implemented"
        : "Testing setup recommended"
    }
- License: ${projectInfo.license || "MIT License"}
- Version: ${projectInfo.version || "1.0.0"}
- Author: ${projectInfo.author || "Professional Developer"}
- Repository: ${projectInfo.repository || "GitHub Repository"}
- Live Demo: ${projectInfo.homepage || "Demo deployment available"}

${projectInsights}

=== PREMIUM README GENERATION REQUIREMENTS ===

Create a comprehensive, stylish README.md with these EXACT specifications:

## 1. 🎨 STUNNING PROJECT HEADER
Create an eye-catching header with:
- **Stylish Title**: Use appropriate emoji (🌤️ weather, 🛍️ ecommerce, 🚀 general, 📱 mobile, 🔌 API, ⚡ performance, 🎯 productivity)
- **Format**: "# [emoji] ${projectInfo.name} [Creative Descriptor]"
- **Compelling Subtitle**: A 2-3 sentence description that explains the project's value proposition
- **Visual Appeal**: Use the analyzed main purpose to create engaging copy

## 2. 🏆 PROFESSIONAL BADGE COLLECTION
Generate a comprehensive badge set including:
${this.generateAdvancedBadgeInstructions(projectInfo, analysis)}

Use this exact format for each badge:
![Technology](https://img.shields.io/badge/Technology-Version-color?style=flat-square&logo=technology)

## 3. 🌟 LIVE DEMO & LINKS SECTION
Create an attractive demo section:
${
  projectInfo.homepage
    ? `- **🌐 Live Application**: [${projectInfo.homepage}](${projectInfo.homepage})`
    : "- **🌐 Live Demo**: [Coming Soon](https://example.com)"
}
- **📁 Repository**: [View Source](${
      projectInfo.repository || "https://github.com/username/repo"
    })
- **📖 Documentation**: [Read Docs](${
      projectInfo.repository || "https://github.com/username/repo"
    }#readme)

## 4. 📚 COMPREHENSIVE TABLE OF CONTENTS
Create detailed navigation including:
- [🌟 Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📦 Installation](#-installation)
- [🎯 Usage](#-usage)
- [🏗 Architecture](#-architecture)
- [📁 Project Structure](#-project-structure)
- [🚀 API Reference](#-api-reference) (if applicable)
- [🧪 Testing](#-testing) (if testing detected)
- [📈 Performance](#-performance)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👨‍💻 Contact](#-contact)

## 5. ✨ DETAILED FEATURE SHOWCASE (10-15 features)
Create an impressive feature list based on actual project analysis:
${this.generateDetailedFeaturePrompt(analysis, projectInfo)}

Format each feature as:
- 🎯 **Feature Name** - Detailed description of what it does and why it's valuable

## 6. 🛠 COMPREHENSIVE TECH STACK
Organize technologies by categories with explanations:

### Frontend Technologies
${this.getFrontendTechDetailed(analysis, projectInfo)}

### Backend & APIs
${this.getBackendTechDetailed(analysis, projectInfo)}

### Development & Build Tools
${this.getDevTechDetailed(analysis, projectInfo)}

### Quality & Testing
${this.getTestingTechDetailed(analysis, projectInfo)}

For each technology, explain: what it does, why it was chosen, and how it benefits the project.

## 7. 📦 DETAILED INSTALLATION GUIDE
Create a comprehensive installation section:

### Prerequisites
List specific version requirements based on detected technologies

### Step-by-Step Installation
1. Repository cloning with proper commands
2. Package manager detection and installation
3. Environment variable setup (if applicable)
4. Database setup (if database detected)
5. Development server startup
6. Browser navigation instructions

### Troubleshooting
Common issues and solutions

## 8. 🎯 COMPREHENSIVE USAGE GUIDE
${this.generateUsageGuidePrompt(analysis, projectInfo)}

## 9. 🏗 ARCHITECTURE & DESIGN PATTERNS
Explain the project architecture:
- Overall system design
- Key architectural decisions
- Design patterns used
- Data flow explanation
- Component relationships (if frontend)
- API design principles (if backend)

## 10. 📁 DETAILED PROJECT STRUCTURE
Use the actual project structure with comprehensive explanations:

\`\`\`
${analysis.projectStructure}
\`\`\`

Provide detailed explanations for each major directory:
- What it contains
- Its purpose in the application
- Key files and their roles
- Relationships between directories

## 11. 🚀 API DOCUMENTATION (if applicable)
${this.generateAPIDocumentationPrompt(analysis, projectInfo)}

## 12. 🧪 TESTING & QUALITY ASSURANCE
${
  projectInfo.hasTests
    ? "Detail the testing strategy, test types, coverage, and how to run tests"
    : "Explain recommended testing approach and setup for this project type"
}

## 13. 📈 PERFORMANCE & OPTIMIZATION
Discuss:
- Performance optimizations implemented
- Bundle size considerations
- Loading time optimizations
- Scalability features
- Monitoring and analytics

## 14. 🔧 DEVELOPMENT & DEPLOYMENT
Include:
- Development workflow
- Build process explanation
- Environment configurations
- Deployment strategies
- CI/CD pipeline (if applicable)

## 15. 🤝 CONTRIBUTING GUIDELINES
Professional contribution section with:
- Fork and branch strategy
- Code style requirements
- Testing requirements
- Pull request process
- Issue reporting guidelines

## 16. 📄 LICENSE & LEGAL
- License information with proper formatting
- Copyright notice
- Third-party attributions

## 17. 👨‍💻 PROFESSIONAL CONTACT SECTION
Create an attractive contact section:
- Author information: ${projectInfo.author || "Professional Developer"}
- GitHub profile with links
- Professional email
- LinkedIn profile
- Project repository link

## 18. 🙏 ACKNOWLEDGMENTS & CREDITS
Thank key technologies, libraries, inspirations, and contributors

## 19. 📊 PROJECT STATS & METRICS
Add a stats section with:
- Project creation date
- Version information
- Contributor count
- Issue/PR stats
- Download/usage metrics

## 20. 🎨 VISUAL ELEMENTS
Include:
- Proper markdown formatting throughout
- Strategic use of emojis for visual appeal
- Code blocks with syntax highlighting
- Proper spacing and visual hierarchy
- Professional styling elements

=== CRITICAL SUCCESS REQUIREMENTS ===
- Write DETAILED content (minimum 2000 words)
- Use ACTUAL project analysis, not generic templates
- Make it VISUALLY APPEALING with proper formatting
- Include COMPREHENSIVE technical details
- Focus on what makes THIS project UNIQUE and VALUABLE
- Use PROFESSIONAL language throughout
- Make developers want to USE and CONTRIBUTE to this project
- Ensure GITHUB-READY formatting with proper markdown

Generate a README that would make this project stand out in the GitHub community and attract contributors, users, and employers.

IMPORTANT: Generate ONLY the README.md content with professional markdown formatting. No meta-commentary.`;
  }

  // Enhanced helper methods for premium content generation
  private generateProjectInsights(
    projectInfo: ProjectInfo,
    analysis: ProjectAnalysis
  ): string {
    const insights = [];

    // Complexity analysis
    const totalDeps =
      projectInfo.dependencies.length + projectInfo.devDependencies.length;
    if (totalDeps > 20) {
      insights.push("🔧 Complex application with rich feature set");
    } else if (totalDeps > 10) {
      insights.push("⚙️ Well-structured application with modern tooling");
    } else {
      insights.push("🎯 Focused application with clean dependencies");
    }

    // Technology stack insights
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();
    if (allDeps.includes("typescript")) {
      insights.push("💎 Type-safe development with TypeScript");
    }
    if (
      allDeps.includes("test") ||
      allDeps.includes("jest") ||
      allDeps.includes("cypress")
    ) {
      insights.push("🧪 Quality-focused with comprehensive testing");
    }
    if (allDeps.includes("eslint") || allDeps.includes("prettier")) {
      insights.push("✨ Code quality enforced with linting and formatting");
    }

    return `PROJECT INSIGHTS:\n${insights.map((i) => `- ${i}`).join("\n")}`;
  }

  private generateAdvancedBadgeInstructions(
    projectInfo: ProjectInfo,
    analysis: ProjectAnalysis
  ): string {
    const badges = [];
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    // Core technology badges
    if (allDeps.includes("react"))
      {badges.push("React (with version if available)");}
    if (allDeps.includes("next")) {badges.push("Next.js");}
    if (allDeps.includes("typescript")) {badges.push("TypeScript");}
    if (allDeps.includes("vite")) {badges.push("Vite");}
    if (allDeps.includes("tailwind")) {badges.push("Tailwind CSS");}

    // Build and quality badges
    badges.push("Build Status", "Code Quality", "License Badge");

    // Performance and metrics badges
    badges.push("Bundle Size", "Performance Score");

    return `Generate badges for: ${badges.join(", ")}`;
  }

  private generateDetailedFeaturePrompt(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const baseFeatures = analysis.specialFeatures;
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    let featurePrompt = `Expand on these detected features with detailed descriptions:\n`;
    baseFeatures.forEach((feature, index) => {
      featurePrompt += `${
        index + 1
      }. ${feature} - Explain how this feature works and its benefits\n`;
    });

    featurePrompt += `\nAdditionally, infer and add 6-8 more features based on:\n`;
    featurePrompt += `- Technologies: ${allDeps}\n`;
    featurePrompt += `- Project type: ${analysis.projectType}\n`;
    featurePrompt += `- Architecture: ${analysis.architectureNotes}\n`;

    return featurePrompt;
  }

  private getFrontendTechDetailed(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();
    let frontend = [];

    if (allDeps.includes("react"))
      {frontend.push(
        "**React** - Component-based UI library for building interactive interfaces"
      );}
    if (allDeps.includes("next"))
      {frontend.push(
        "**Next.js** - Full-stack React framework with SSR and API routes"
      );}
    if (allDeps.includes("tailwind"))
      {frontend.push(
        "**Tailwind CSS** - Utility-first CSS framework for rapid styling"
      );}
    if (allDeps.includes("typescript"))
      {frontend.push(
        "**TypeScript** - Type-safe JavaScript for better development experience"
      );}

    return frontend.join("\n- ") || "Modern frontend technologies detected";
  }

  private getBackendTechDetailed(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();
    let backend = [];

    if (allDeps.includes("express"))
      {backend.push(
        "**Express.js** - Fast, minimalist web framework for Node.js"
      );}
    if (allDeps.includes("prisma"))
      {backend.push("**Prisma** - Next-generation ORM for database management");}
    if (allDeps.includes("mongodb") || allDeps.includes("mongoose"))
      {backend.push("**MongoDB** - NoSQL database for flexible data storage");}

    return backend.join("\n- ") || "Lightweight backend architecture";
  }

  private getDevTechDetailed(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();
    let dev = [];

    if (allDeps.includes("vite"))
      {dev.push("**Vite** - Lightning-fast build tool with HMR");}
    if (allDeps.includes("eslint"))
      {dev.push("**ESLint** - Code linting for consistent code quality");}
    if (allDeps.includes("prettier"))
      {dev.push("**Prettier** - Code formatting for consistent style");}

    return dev.join("\n- ") || "Modern development toolchain";
  }

  private getTestingTechDetailed(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();
    let testing = [];

    if (allDeps.includes("jest"))
      {testing.push("**Jest** - Comprehensive JavaScript testing framework");}
    if (allDeps.includes("cypress"))
      {testing.push("**Cypress** - End-to-end testing framework");}
    if (allDeps.includes("vitest"))
      {testing.push("**Vitest** - Fast unit testing framework");}

    return (
      testing.join("\n- ") ||
      (projectInfo.hasTests
        ? "Testing framework configured"
        : "Testing setup recommended")
    );
  }

  private generateUsageGuidePrompt(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    return `Create comprehensive usage examples specific to this ${analysis.projectType.toLowerCase()}:
- Basic usage scenarios with code examples
- Advanced features demonstration
- Configuration options
- Common use cases and workflows
- Screenshots placeholders where appropriate
- API usage examples (if applicable)
- Integration examples with other services`;
  }

  private generateAPIDocumentationPrompt(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    if (
      allDeps.includes("express") ||
      allDeps.includes("fastify") ||
      allDeps.includes("next")
    ) {
      return `Create comprehensive API documentation including:
- Base URL and authentication
- Available endpoints with methods
- Request/response examples
- Error handling
- Rate limiting information
- SDK or client examples`;
    }

    if (analysis.projectType.toLowerCase().includes("weather")) {
      return `Document external API integrations:
- Weather API endpoints used
- API key requirements
- Data sources and accuracy
- Rate limits and caching strategy`;
    }

    return `Document any API integrations or external services used in this project.`;
  }

  private generateBadgeList(
    projectInfo: ProjectInfo,
    analysis: ProjectAnalysis
  ): string {
    const badges = [];
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    if (allDeps.includes("react")) {badges.push("React");}
    if (allDeps.includes("next")) {badges.push("Next.js");}
    if (allDeps.includes("vue")) {badges.push("Vue.js");}
    if (allDeps.includes("angular")) {badges.push("Angular");}
    if (allDeps.includes("typescript") || projectInfo.fileTypes.includes(".ts"))
      {badges.push("TypeScript");}
    if (allDeps.includes("javascript") || projectInfo.fileTypes.includes(".js"))
      {badges.push("JavaScript");}
    if (allDeps.includes("vite")) {badges.push("Vite");}
    if (allDeps.includes("tailwind")) {badges.push("Tailwind CSS");}
    if (allDeps.includes("node") || allDeps.includes("express"))
      {badges.push("Node.js");}
    if (allDeps.includes("python") || projectInfo.fileTypes.includes(".py"))
      {badges.push("Python");}

    return badges.join(", ");
  }

  private getFrontendTech(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const frontend = [];
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    if (allDeps.includes("react")) {frontend.push("React");}
    if (allDeps.includes("vue")) {frontend.push("Vue.js");}
    if (allDeps.includes("angular")) {frontend.push("Angular");}
    if (allDeps.includes("tailwind")) {frontend.push("Tailwind CSS");}
    if (allDeps.includes("sass") || allDeps.includes("scss"))
      {frontend.push("Sass");}

    return frontend.join(", ") || "Modern CSS/JavaScript";
  }

  private getBackendTech(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const backend = [];
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    if (allDeps.includes("express")) {backend.push("Express.js");}
    if (allDeps.includes("fastify")) {backend.push("Fastify");}
    if (allDeps.includes("nest")) {backend.push("NestJS");}
    if (allDeps.includes("prisma")) {backend.push("Prisma ORM");}
    if (allDeps.includes("mongoose")) {backend.push("MongoDB/Mongoose");}

    return backend.join(", ") || "None detected";
  }

  private getDevTech(
    analysis: ProjectAnalysis,
    projectInfo: ProjectInfo
  ): string {
    const dev = [];
    const allDeps = [
      ...projectInfo.dependencies,
      ...projectInfo.devDependencies,
    ]
      .join(" ")
      .toLowerCase();

    if (allDeps.includes("vite")) {dev.push("Vite");}
    if (allDeps.includes("webpack")) {dev.push("Webpack");}
    if (allDeps.includes("eslint")) {dev.push("ESLint");}
    if (allDeps.includes("prettier")) {dev.push("Prettier");}
    if (allDeps.includes("jest")) {dev.push("Jest");}
    if (allDeps.includes("cypress")) {dev.push("Cypress");}

    return dev.join(", ") || "Standard development tools";
  }
}
