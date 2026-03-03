import { Command } from "@cliffy/command";
import { validateConfig } from "../core/config.ts";

export const initCommand = new Command()
  .name("init")
  .description("Initialize a new Rig site")
  .option("-f, --force", "Force overwrite existing files")
  .option("--content-dir <dir:string>", "Content directory", {
    default: "content",
  })
  .option("--template-dir <dir:string>", "Template directory", {
    default: "templates",
  })
  .option("--output-dir <dir:string>", "Output directory", { default: "dist" })
  .action(async (options) => {
    try {
      console.log("🚀 Initializing new Rig site...");

      const config = validateConfig({
        contentDir: options.contentDir,
        templateDir: options.templateDir,
        outputDir: options.outputDir,
      });

      const directories = [
        config.contentDir,
        config.templateDir,
        config.outputDir,
      ];

      for (const dir of directories) {
        try {
          await Deno.mkdir(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        } catch (error) {
          if (!(error instanceof Deno.errors.AlreadyExists)) {
            console.error(`❌ Error creating directory ${dir}:`, error);
            return;
          } else if (!options.force) {
            console.log(`⚠️  Directory already exists: ${dir}`);
          }
        }
      }

      const rigToml = `contentDir = "${config.contentDir}"
templateDir = "${config.templateDir}"
outputDir = "${config.outputDir}"

# Configure plugins with names (official), URLs, or jsr:/npm: specifiers.
# Example:
# plugins = [
#   "sitemap",
#   { name = "rss", options = { title = "My Site", baseUrl = "https://example.com" } },
#   { from = "https://example.com/my-plugin.ts", export = "default" }
# ]

[routing]
mode = "file"
style = "html"
`;

      const shouldWriteRigToml = options.force || !await fileExists("rig.toml");
      if (shouldWriteRigToml) {
        await Deno.writeTextFile("rig.toml", rigToml);
        console.log("⚙️  Created config: rig.toml");
      } else {
        console.log("⚠️  Config already exists: rig.toml");
      }

      // Create a basic template
      const basicTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        header {
            border-bottom: 2px solid #eee;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }
        h1 {
            color: #333;
        }
        code {
            background: #f4f4f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
        }
        pre {
            background: #f4f4f4;
            padding: 1rem;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <header>
        <h1><%= title %></h1>
        <% if (date) %><p><em><%= date %></em></p><% endif %>
    </header>
    <main>
        <%= content %>
    </main>
</body>
</html>`;

      try {
        await Deno.writeTextFile(
          `${config.templateDir}/layout.html`,
          basicTemplate,
        );
        console.log(`📄 Created template: ${config.templateDir}/layout.html`);
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists) || options.force) {
          console.error("❌ Error creating template:", error);
        }
      }

      // Create a sample content file
      const sampleContent = `---
title: "Welcome to Rig"
date: "${new Date().toISOString().split("T")[0]}"
---

# Welcome to Rig

This is a sample content file for your new Rig site.

## Features

- 🚀 Fast static site generation
- 🎨 Modern template engine
- 📝 Markdown support with syntax highlighting
- 🔧 Built with Deno
- 📁 Modular architecture

## Getting Started

Edit this file in the \`content\` directory and run:

\`\`\`bash
rig build
\`\`\`

To start development mode:

\`\`\`bash
rig dev
\`\`\`

Happy building! 🎉`;

      try {
        await Deno.writeTextFile(
          `${config.contentDir}/index.md`,
          sampleContent,
        );
        console.log(`📝 Created sample content: ${config.contentDir}/index.md`);
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists) || options.force) {
          console.error("❌ Error creating sample content:", error);
        }
      }

      console.log("\n✅ Rig site initialized successfully!");
      console.log("📋 Next steps:");
      console.log(
        `  📝 Edit content files in the '${config.contentDir}' directory`,
      );
      console.log(
        `  🎨 Customize templates in the '${config.templateDir}' directory`,
      );
      console.log(`  🔨 Run 'rig build' to generate your site`);
      console.log(`  🚀 Run 'rig dev' to start development mode`);
    } catch (error) {
      console.error(
        "❌ Initialization failed:",
        error instanceof Error ? error.message : String(error),
      );
      Deno.exit(1);
    }
  });

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}
