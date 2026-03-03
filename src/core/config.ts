import { Config } from "../types/index.ts";

const defaultConfig: Config = {
  contentDir: "content",
  templateDir: "templates",
  outputDir: "dist",
};

export async function loadConfig(): Promise<Config> {
  try {
    const text = await Deno.readTextFile("deno.json");
    const json = JSON.parse(text);
    return json.rig || defaultConfig;
  } catch {
    return defaultConfig;
  }
}

export function getDefaultConfig(): Config {
  return { ...defaultConfig };
}

export function validateConfig(config: Partial<Config>): Config {
  return {
    contentDir: config.contentDir || defaultConfig.contentDir,
    templateDir: config.templateDir || defaultConfig.templateDir,
    outputDir: config.outputDir || defaultConfig.outputDir,
  };
}
