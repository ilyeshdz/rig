import { Command } from "@cliffy/command";
import { loadConfig } from "../core/config.ts";
import { Builder } from "../core/builder.ts";
import { type DevServerController, startServer } from "../core/server.ts";

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
  .description("Start development mode with file watching and server")
  .option("-v, --verbose", "Verbose output")
  .option("-p, --port <port:number>", "Port for development server", {
    default: 8000,
  })
  .option("-h, --host <host:string>", "Host for development server", {
    default: "localhost",
  })
  .option("--open", "Open browser automatically")
  .option("--no-server", "Don't start HTTP server, just watch files")
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const builder = new Builder(config);

      const devServer: DevServerController | undefined = options.server
        ? await startServer(config, {
          port: options.port,
          host: options.host,
          open: options.open ?? false,
        })
        : undefined;

      console.log(
        `👀 Watching ${config.contentDir} and ${config.templateDir} for changes...`,
      );
      await builder.watch({
        onUpdate: (update) => {
          if (devServer) {
            devServer.notify(update);
          }
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Dev mode failed:", message);
      Deno.exit(1);
    }
  });
