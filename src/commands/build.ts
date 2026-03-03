import { Command } from "@cliffy/command";
import { loadConfig, getDefaultConfig } from "../core/config.ts";
import { Builder } from "../core/builder.ts";
import { Config } from "../types/index.ts";

export const buildCommand = new Command()
  .name("build")
  .description("Build the static site")
  .option("-v, --verbose", "Verbose output")
  .option("--no-clean", "Don't clean output directory before build")
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const builder = new Builder(config);
      
      await builder.build({
        config,
        verbose: options.verbose,
        clean: options.clean,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Build failed:", message);
      Deno.exit(1);
    }
  });

export const devCommand = new Command()
  .name("dev")
  .description("Start development mode with file watching")
  .option("-v, --verbose", "Verbose output")
  .option("-p, --port <port:number>", "Port for development server", { default: 8000 })
  .option("--open", "Open browser automatically")
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const builder = new Builder(config);
      
      console.log(`🚀 Starting development server on http://localhost:${options.port}`);
      console.log("📁 Watching for changes...");
      
      await builder.watch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Dev mode failed:", message);
      Deno.exit(1);
    }
  });
