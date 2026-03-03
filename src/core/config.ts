import { parse as parseToml } from "@std/toml";
import type { Config, PluginConfigEntry } from "../types/index.ts";

const defaultConfig: Config = {
  contentDir: "content",
  templateDir: "templates",
  outputDir: "dist",
  routing: {
    mode: "file",
    style: "html",
  },
  plugins: [],
};

export async function loadConfig(): Promise<Config> {
  const rigTomlConfig = await loadRigTomlConfig();
  if (rigTomlConfig) {
    return validateConfig(rigTomlConfig);
  }

  try {
    const text = await Deno.readTextFile("deno.json");
    const json = JSON.parse(text);
    return validateConfig((json.rig ?? {}) as Partial<Config>);
  } catch {
    return getDefaultConfig();
  }
}

export function getDefaultConfig(): Config {
  return {
    ...defaultConfig,
    routing: {
      ...defaultConfig.routing,
    },
    plugins: [...(defaultConfig.plugins ?? [])],
  };
}

export function validateConfig(config: Partial<Config>): Config {
  const routing = validateRouting(config.routing);
  const plugins = validatePlugins(config.plugins);

  return {
    contentDir: typeof config.contentDir === "string" &&
        config.contentDir.trim().length > 0
      ? config.contentDir
      : defaultConfig.contentDir,
    templateDir: typeof config.templateDir === "string" &&
        config.templateDir.trim().length > 0
      ? config.templateDir
      : defaultConfig.templateDir,
    outputDir: typeof config.outputDir === "string" &&
        config.outputDir.trim().length > 0
      ? config.outputDir
      : defaultConfig.outputDir,
    ...(config.collections ? { collections: config.collections } : {}),
    routing,
    plugins,
  };
}

async function loadRigTomlConfig(): Promise<Partial<Config> | undefined> {
  try {
    const text = await Deno.readTextFile("rig.toml");
    const parsed = parseToml(text);

    if (!isRecord(parsed)) {
      return undefined;
    }

    const source = isRecord(parsed.rig) ? parsed.rig : parsed;
    return source as Partial<Config>;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return undefined;
    }

    throw error;
  }
}

function validateRouting(config: Config["routing"]): Config["routing"] {
  const mode = config?.mode === "file" ? "file" : "file";
  const style = config?.style === "directory" ? "directory" : "html";

  return { mode, style };
}

function validatePlugins(plugins: Config["plugins"]): PluginConfigEntry[] {
  if (!plugins || !Array.isArray(plugins)) {
    return [];
  }

  const validated: PluginConfigEntry[] = [];

  for (const entry of plugins) {
    if (typeof entry === "string") {
      if (entry.trim().length > 0) {
        validated.push(entry);
      }
      continue;
    }

    if (!isRecord(entry)) {
      continue;
    }

    const normalized: Record<string, unknown> = {};

    if (typeof entry.name === "string" && entry.name.trim().length > 0) {
      normalized.name = entry.name;
    }

    if (typeof entry.from === "string" && entry.from.trim().length > 0) {
      normalized.from = entry.from;
    }

    if (typeof entry.export === "string" && entry.export.trim().length > 0) {
      normalized.export = entry.export;
    }

    if (typeof entry.factory === "string" && entry.factory.trim().length > 0) {
      normalized.factory = entry.factory;
    }

    if (isRecord(entry.options)) {
      normalized.options = entry.options;
    }

    if (Object.keys(normalized).length > 0) {
      validated.push(normalized as PluginConfigEntry);
    }
  }

  return validated;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
