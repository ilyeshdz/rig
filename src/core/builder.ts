import { Config, ContentFile, BuildOptions } from "../types/index.ts";
import { markdownToHtml, processContentFiles } from "./parser.ts";
import { renderTemplate, loadTemplate } from "./template.ts";

export class Builder {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async build(options: BuildOptions = { config: this.config }): Promise<void> {
    const { verbose, clean = true } = options;
    
    if (verbose) {
      console.log("🔨 Building site...");
      console.log(`📂 Content: ${this.config.contentDir}`);
      console.log(`🎨 Templates: ${this.config.templateDir}`);
      console.log(`📤 Output: ${this.config.outputDir}`);
    }

    try {
      // Clean output directory
      if (clean) {
        try {
          await Deno.remove(this.config.outputDir, { recursive: true });
          if (verbose) console.log("🧹 Cleaned output directory");
        } catch {
          // Directory might not exist
        }
      }
      await Deno.mkdir(this.config.outputDir, { recursive: true });

      // Read layout template
      let layoutTemplate = "";
      try {
        layoutTemplate = await loadTemplate(`${this.config.templateDir}/layout.html`);
        if (verbose) console.log("📄 Loaded layout template");
      } catch (error) {
        console.error("❌ Error reading layout template:", error);
        return;
      }

      // Process content files
      const contentFiles = await processContentFiles(this.config.contentDir);
      if (verbose) console.log(`📝 Found ${contentFiles.length} content files`);

      for (const file of contentFiles) {
        const htmlContent = await markdownToHtml(file.content);
        const title = file.frontMatter.title || "Untitled";

        const finalHtml = renderTemplate(layoutTemplate, {
          title,
          content: htmlContent,
          date: file.frontMatter.date || "",
          ...file.frontMatter,
        });

        const outputPath = `${this.config.outputDir}/${file.slug}.html`;
        await Deno.writeTextFile(outputPath, finalHtml);
        
        if (verbose) {
          console.log(`✅ Generated: ${outputPath}`);
        } else {
          console.log(`Generated: ${outputPath}`);
        }
      }

      console.log(`\n🎉 Build completed! Generated ${contentFiles.length} pages.`);
    } catch (error) {
      console.error("❌ Build failed:", error);
      throw error;
    }
  }

  async watch(): Promise<void> {
    console.log(`👀 Watching ${this.config.contentDir} and ${this.config.templateDir} for changes...`);
    
    // Initial build
    await this.build({ config: this.config, verbose: false });
    
    const watcher = Deno.watchFs([this.config.contentDir, this.config.templateDir]);
    
    try {
      for await (const event of watcher) {
        if (event.kind === "modify" || event.kind === "create") {
          console.log(`\n🔄 Changes detected in ${event.paths.join(", ")}`);
          console.log("🔨 Rebuilding...");
          await this.build({ config: this.config, verbose: false });
          console.log("✅ Ready for next change...");
        }
      }
    } catch (error) {
      console.error("❌ Error in watch mode:", error);
    }
  }
}
