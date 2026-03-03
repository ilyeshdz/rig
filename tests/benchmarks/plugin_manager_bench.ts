import { type Plugin, PluginManager } from "../../src/core/plugins.ts";
import type { Config } from "../../src/types/index.ts";

const TEST_CONFIG: Config = {
  contentDir: "content",
  templateDir: "templates",
  outputDir: "dist",
};

function createTestPlugin(name: string, hasHook: boolean = true): Plugin {
  return {
    name,
    version: "1.0.0",
    description: `Test plugin ${name}`,
    init: hasHook ? async () => {} : undefined,
    beforeBuild: hasHook ? async () => {} : undefined,
    afterBuild: hasHook ? async () => {} : undefined,
  };
}

Deno.bench("PluginManager - create instance", (b) => {
  b.start();
  for (let i = 0; i < 1000; i++) {
    new PluginManager();
  }
  b.end();
});

Deno.bench("PluginManager - register single plugin", (b) => {
  const pm = new PluginManager();
  b.start();
  for (let i = 0; i < 1000; i++) {
    pm.register(createTestPlugin(`plugin-${i}`));
  }
  b.end();
});

Deno.bench("PluginManager - register 10 plugins", (b) => {
  b.start();
  for (let i = 0; i < 100; i++) {
    const pm = new PluginManager();
    for (let j = 0; j < 10; j++) {
      pm.register(createTestPlugin(`plugin-${j}`));
    }
  }
  b.end();
});

Deno.bench("PluginManager - executeHook with no plugins", async (b) => {
  const pm = new PluginManager();
  b.start();
  for (let i = 0; i < 1000; i++) {
    await pm.executeHook("init", { config: TEST_CONFIG, rigVersion: "0.1.0" });
  }
  b.end();
});

Deno.bench("PluginManager - executeHook with 1 plugin", async (b) => {
  const pm = new PluginManager();
  pm.register(createTestPlugin("test-plugin"));

  b.start();
  for (let i = 0; i < 1000; i++) {
    await pm.executeHook("init", { config: TEST_CONFIG, rigVersion: "0.1.0" });
  }
  b.end();
});

Deno.bench("PluginManager - executeHook with 5 plugins", async (b) => {
  const pm = new PluginManager();
  for (let i = 0; i < 5; i++) {
    pm.register(createTestPlugin(`plugin-${i}`));
  }

  b.start();
  for (let i = 0; i < 500; i++) {
    await pm.executeHook("beforeBuild", {
      config: TEST_CONFIG,
      files: [],
      outputDir: "dist",
      timestamp: Date.now(),
    });
  }
  b.end();
});

Deno.bench("PluginManager - executeHook with 10 plugins", async (b) => {
  const pm = new PluginManager();
  for (let i = 0; i < 10; i++) {
    pm.register(createTestPlugin(`plugin-${i}`));
  }

  b.start();
  for (let i = 0; i < 250; i++) {
    await pm.executeHook("afterBuild", {
      config: TEST_CONFIG,
      files: [],
      outputDir: "dist",
      timestamp: Date.now(),
    });
  }
  b.end();
});

Deno.bench("PluginManager - hasHook check", (b) => {
  const pm = new PluginManager();
  pm.register(createTestPlugin("test-plugin"));

  b.start();
  for (let i = 0; i < 10000; i++) {
    pm.hasHook("beforeBuild");
    pm.hasHook("init");
    pm.hasHook("destroy");
  }
  b.end();
});

Deno.bench("PluginManager - getPlugin lookup", (b) => {
  const pm = new PluginManager();
  for (let i = 0; i < 10; i++) {
    pm.register(createTestPlugin(`plugin-${i}`));
  }

  b.start();
  for (let i = 0; i < 10000; i++) {
    pm.getPlugin("plugin-5");
  }
  b.end();
});

Deno.bench("PluginManager - listPlugins", (b) => {
  const pm = new PluginManager();
  for (let i = 0; i < 10; i++) {
    pm.register(createTestPlugin(`plugin-${i}`));
  }

  b.start();
  for (let i = 0; i < 10000; i++) {
    pm.listPlugins();
  }
  b.end();
});

Deno.bench("PluginManager - unregister plugin", (b) => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    b.start();
    for (let i = 0; i < 100; i++) {
      const pm = new PluginManager();
      for (let j = 0; j < 10; j++) {
        pm.register(createTestPlugin(`plugin-${j}`));
      }
      for (let j = 0; j < 10; j++) {
        pm.unregister(`plugin-${j}`);
      }
    }
    b.end();
  } finally {
    console.log = originalLog;
  }
});

Deno.bench("Hook execution - empty to async context", async (b) => {
  const pm = new PluginManager();

  b.start();
  for (let i = 0; i < 5000; i++) {
    await pm.executeHook("init", { config: TEST_CONFIG, rigVersion: "0.1.0" });
  }
  b.end();
});

export function runPluginBenchmarks() {
  console.log(
    "Run plugin benchmarks: deno bench tests/benchmarks/plugin_manager_bench.ts",
  );
}
