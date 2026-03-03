import { assertEquals, assertExists } from "@std/assert";
import {
  createPluginError,
  HOOK_NAMES,
  normalizePlugin,
  type Plugin,
  PluginManager,
  type PluginManifest,
  RIG_VERSION,
  validatePlugin,
} from "../../src/core/plugins.ts";
import type { Config } from "../../src/types/index.ts";

Deno.test("PluginManager - creates instance", () => {
  const pm = new PluginManager();
  assertEquals(pm.count, 0);
  assertEquals(pm.isInitialized, false);
});

Deno.test("PluginManager - registers plugin from object", () => {
  const pm = new PluginManager();

  const testPlugin: Plugin = {
    name: "test-plugin",
    version: "1.0.0",
    description: "A test plugin",
    init: async () => {},
  };

  pm.register(testPlugin);

  assertEquals(pm.count, 1);
  assertExists(pm.getPlugin("test-plugin"));
});

Deno.test("PluginManager - registers plugin from manifest", () => {
  const pm = new PluginManager();

  const manifest: PluginManifest = {
    name: "manifest-plugin",
    version: "2.0.0",
    description: "A manifest plugin",
  };

  pm.register(manifest);

  assertEquals(pm.count, 1);
  const plugin = pm.getPlugin("manifest-plugin");
  assertExists(plugin);
  assertEquals(plugin?.version, "2.0.0");
});

Deno.test("PluginManager - unregisters plugin", () => {
  const pm = new PluginManager();

  const plugin: Plugin = {
    name: "remove-me",
    version: "1.0.0",
    description: "To be removed",
  };

  pm.register(plugin);
  assertEquals(pm.count, 1);

  const removed = pm.unregister("remove-me");
  assertEquals(removed, true);
  assertEquals(pm.count, 0);
});

Deno.test("PluginManager - lists plugins", () => {
  const pm = new PluginManager();

  pm.register({ name: "plugin-a", version: "1.0.0", description: "A" });
  pm.register({ name: "plugin-b", version: "1.0.0", description: "B" });

  const plugins = pm.listPlugins();
  assertEquals(plugins.length, 2);
});

Deno.test("PluginManager - hasHook returns correct value", () => {
  const pm = new PluginManager();

  const plugin: Plugin = {
    name: "hook-plugin",
    version: "1.0.0",
    description: "Has hooks",
    beforeBuild: async () => {},
    afterBuild: async () => {},
  };

  pm.register(plugin);

  assertEquals(pm.hasHook("beforeBuild"), true);
  assertEquals(pm.hasHook("afterBuild"), true);
  assertEquals(pm.hasHook("init"), false);
});

Deno.test("PluginManager - executeHook runs handlers", async () => {
  const pm = new PluginManager();
  let executed = false;

  const plugin: Plugin = {
    name: "exec-plugin",
    version: "1.0.0",
    description: "Execution test",
    init: () => {
      executed = true;
    },
  };

  pm.register(plugin);
  await pm.executeHook("init", {
    config: {} as Config,
    rigVersion: RIG_VERSION,
  });

  assertEquals(executed, true);
});

Deno.test("validatePlugin - validates correct plugin", () => {
  const valid: Plugin = {
    name: "valid",
    version: "1.0.0",
    description: "Valid",
  };

  assertEquals(validatePlugin(valid), true);
});

Deno.test("validatePlugin - rejects invalid plugin", () => {
  assertEquals(validatePlugin(null), false);
  assertEquals(validatePlugin({}), false);
  assertEquals(validatePlugin({ name: "test" }), false);
  assertEquals(validatePlugin({ name: "test", version: "1.0" }), false);
});

Deno.test("normalizePlugin - converts manifest to plugin", () => {
  const manifest: PluginManifest = {
    name: "normalized",
    version: "3.0.0",
    description: "Normalized plugin",
    author: "Test Author",
  };

  const plugin = normalizePlugin(manifest);

  assertEquals(plugin.name, "normalized");
  assertEquals(plugin.version, "3.0.0");
  assertEquals(plugin.author, "Test Author");
});

Deno.test("createPluginError - creates typed error", () => {
  const error = createPluginError("Test error", "my-plugin", "init", "E001");

  assertEquals(error.message, "Test error");
  assertEquals(error.pluginName, "my-plugin");
  assertEquals(error.hookName, "init");
  assertEquals(error.code, "E001");
});

Deno.test("HOOK_NAMES - contains all expected hooks", () => {
  const expected = [
    "register",
    "init",
    "beforeBuild",
    "afterBuild",
    "beforeParse",
    "afterParse",
    "beforeRender",
    "afterRender",
    "beforeWrite",
    "afterWrite",
    "onWatch",
    "beforeServe",
    "afterServe",
    "destroy",
  ];

  assertEquals(HOOK_NAMES.length, expected.length);
  expected.forEach((hook) => {
    assertEquals(HOOK_NAMES.includes(hook as typeof HOOK_NAMES[number]), true);
  });
});

Deno.test("PluginManager - getHookCount returns correct count", () => {
  const pm = new PluginManager();

  const plugin: Plugin = {
    name: "count-plugin",
    version: "1.0.0",
    description: "Count test",
    beforeBuild: async () => {},
    afterBuild: async () => {},
  };

  pm.register(plugin);

  assertEquals(pm.getHookCount("beforeBuild"), 1);
  assertEquals(pm.getHookCount("afterBuild"), 1);
  assertEquals(pm.getHookCount("init"), 0);
});

Deno.test("PluginManager - listByHook returns plugins with hook", () => {
  const pm = new PluginManager();

  pm.register({
    name: "a",
    version: "1.0.0",
    description: "A",
    beforeBuild: async () => {},
  });
  pm.register({
    name: "b",
    version: "1.0.0",
    description: "B",
    afterBuild: async () => {},
  });
  pm.register({ name: "c", version: "1.0.0", description: "C" });

  const withBeforeBuild = pm.listByHook("beforeBuild");
  assertEquals(withBeforeBuild.length, 1);
  assertEquals(withBeforeBuild[0].name, "a");
});
