import { Config } from "../types/index.ts";
import { ConfigError, createErrorContext } from "./errors.ts";

export function validateConfig(config: Partial<Config>): Config {
  const errors: string[] = [];

  // Validate contentDir
  if (config.contentDir) {
    if (typeof config.contentDir !== "string") {
      errors.push("contentDir must be a string");
    } else if (config.contentDir.trim() === "") {
      errors.push("contentDir cannot be empty");
    } else if (!/^[a-zA-Z0-9._-]+$/.test(config.contentDir)) {
      errors.push("contentDir contains invalid characters");
    }
  }

  // Validate templateDir
  if (config.templateDir) {
    if (typeof config.templateDir !== "string") {
      errors.push("templateDir must be a string");
    } else if (config.templateDir.trim() === "") {
      errors.push("templateDir cannot be empty");
    } else if (!/^[a-zA-Z0-9._-]+$/.test(config.templateDir)) {
      errors.push("templateDir contains invalid characters");
    }
  }

  // Validate outputDir
  if (config.outputDir) {
    if (typeof config.outputDir !== "string") {
      errors.push("outputDir must be a string");
    } else if (config.outputDir.trim() === "") {
      errors.push("outputDir cannot be empty");
    } else if (!/^[a-zA-Z0-9._-]+$/.test(config.outputDir)) {
      errors.push("outputDir contains invalid characters");
    }
  }

  if (errors.length > 0) {
    const context = createErrorContext("validateConfig", { config });
    throw new ConfigError(
      `Configuration validation failed:\n${errors.join("\n")}`,
      "validation",
    );
  }

  return {
    contentDir: config.contentDir || "content",
    templateDir: config.templateDir || "templates",
    outputDir: config.outputDir || "dist",
  };
}

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
        const context = createErrorContext("validatePaths", { config, path });
        throw new ConfigError(
          `Parent directory does not exist: ${parentDir}`,
          "path_validation",
        );
      }
    }
  }
}
