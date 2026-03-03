import { assertEquals } from "@std/assert";
import { loadConfig, validateConfig } from "../../src/core/config.ts";

Deno.test("validateConfig - defaults include routing and plugins", () => {
  const validated = validateConfig({});

  assertEquals(validated.contentDir, "content");
  assertEquals(validated.templateDir, "templates");
  assertEquals(validated.outputDir, "dist");
  assertEquals(validated.routing, { mode: "file", style: "html" });
  assertEquals(validated.plugins, []);
});

Deno.test("validateConfig - keeps partial values", () => {
  const validated = validateConfig({
    contentDir: "custom-content",
    outputDir: "build",
    routing: { style: "directory" },
    plugins: ["sitemap"],
  });

  assertEquals(validated.contentDir, "custom-content");
  assertEquals(validated.templateDir, "templates");
  assertEquals(validated.outputDir, "build");
  assertEquals(validated.routing, { mode: "file", style: "directory" });
  assertEquals(validated.plugins, ["sitemap"]);
});

Deno.test("loadConfig - reads rig.toml when present", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = Deno.makeTempDirSync({ prefix: "rig-config-" });

  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      "rig.toml",
      `contentDir = "posts"
templateDir = "views"
outputDir = "site"

plugins = [
  "sitemap",
  { name = "rss", options = { title = "Rig Blog", baseUrl = "https://rig.dev" } }
]

[routing]
style = "directory"
`,
    );

    const config = await loadConfig();
    assertEquals(config.contentDir, "posts");
    assertEquals(config.templateDir, "views");
    assertEquals(config.outputDir, "site");
    assertEquals(config.routing, { mode: "file", style: "directory" });
    assertEquals(config.plugins?.length, 2);
    assertEquals(config.plugins?.[0], "sitemap");
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("loadConfig - falls back to deno.json rig config", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = Deno.makeTempDirSync({ prefix: "rig-config-json-" });

  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      "deno.json",
      JSON.stringify({
        rig: {
          contentDir: "docs",
          templateDir: "theme",
          outputDir: "public",
          plugins: ["taxonomy"],
        },
      }),
    );

    const config = await loadConfig();
    assertEquals(config.contentDir, "docs");
    assertEquals(config.templateDir, "theme");
    assertEquals(config.outputDir, "public");
    assertEquals(config.plugins, ["taxonomy"]);
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
