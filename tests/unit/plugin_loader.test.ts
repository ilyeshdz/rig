import { assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { loadConfiguredPlugins } from "../../src/core/plugin_loader.ts";
import type { Config } from "../../src/types/index.ts";

function createBaseConfig(): Config {
  return {
    contentDir: "content",
    templateDir: "templates",
    outputDir: "dist",
    routing: { mode: "file", style: "html" },
    plugins: [],
  };
}

Deno.test("loadConfiguredPlugins - supports official plugins by name", async () => {
  const config: Config = {
    ...createBaseConfig(),
    plugins: [
      "sitemap",
      { name: "rss", options: { title: "Rig", baseUrl: "https://rig.dev" } },
    ],
  };

  const plugins = await loadConfiguredPlugins(config);
  assertEquals(plugins.map((plugin) => plugin.name), ["sitemap", "rss"]);
});

Deno.test("loadConfiguredPlugins - imports plugin from URL", async () => {
  const tempDir = Deno.makeTempDirSync({ prefix: "rig-plugin-" });
  const pluginPath = `${tempDir}/remote-plugin.ts`;

  try {
    await Deno.writeTextFile(
      pluginPath,
      `export default {
  name: "remote-plugin",
  version: "1.0.0",
  description: "Loaded from file URL"
};`,
    );

    const config: Config = {
      ...createBaseConfig(),
      plugins: [{ from: toFileUrl(pluginPath).href }],
    };

    const plugins = await loadConfiguredPlugins(config);
    assertEquals(plugins.length, 1);
    assertEquals(plugins[0].name, "remote-plugin");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("loadConfiguredPlugins - imports factory plugin with options", async () => {
  const tempDir = Deno.makeTempDirSync({ prefix: "rig-plugin-factory-" });
  const pluginPath = `${tempDir}/factory-plugin.ts`;

  try {
    await Deno.writeTextFile(
      pluginPath,
      `export function createPlugin(options = {}) {
  return {
    name: options.name ?? "factory-plugin",
    version: "1.0.0",
    description: "Factory plugin"
  };
}`,
    );

    const config: Config = {
      ...createBaseConfig(),
      plugins: [{
        from: toFileUrl(pluginPath).href,
        factory: "createPlugin",
        options: { name: "custom-factory-plugin" },
      }],
    };

    const plugins = await loadConfiguredPlugins(config);
    assertEquals(plugins.length, 1);
    assertEquals(plugins[0].name, "custom-factory-plugin");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("loadConfiguredPlugins - resolves local relative module paths", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = Deno.makeTempDirSync({ prefix: "rig-plugin-local-" });

  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      "local-plugin.ts",
      `export default {
  name: "local-plugin",
  version: "1.0.0",
  description: "Loaded from local path"
};`,
    );

    const config: Config = {
      ...createBaseConfig(),
      plugins: ["./local-plugin.ts"],
    };

    const plugins = await loadConfiguredPlugins(config);
    assertEquals(plugins.length, 1);
    assertEquals(plugins[0].name, "local-plugin");
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
