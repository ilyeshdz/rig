import type { Config } from "../types/index.ts";
import { ConfigError } from "./errors.ts";

export async function validatePaths(config: Config): Promise<void> {
  const paths = [config.contentDir, config.templateDir, config.outputDir];

  for (const path of paths) {
    try {
      const parentDir = path.split("/").slice(0, -1).join("/");
      if (parentDir) {
        await Deno.stat(parentDir);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        const parentDir = path.split("/").slice(0, -1).join("/");
        throw new ConfigError(
          `Parent directory does not exist: ${parentDir}`,
          "path_validation",
        );
      }
    }
  }
}
