import { assertEquals } from "@std/assert";
import { loadConfig, validateConfig } from "../../src/core/config.ts";

Deno.test("loadConfig - default config", async () => {
  // This test would require mocking Deno.readTextFile
  // For now, just test the default config structure
  const defaultConfig = {
    contentDir: "content",
    templateDir: "templates", 
    outputDir: "dist"
  };

  const validated = validateConfig({});
  assertEquals(validated.contentDir, defaultConfig.contentDir);
  assertEquals(validated.templateDir, defaultConfig.templateDir);
  assertEquals(validated.outputDir, defaultConfig.outputDir);
});

Deno.test("validateConfig - partial config", () => {
  const partialConfig = {
    contentDir: "custom_content",
    outputDir: "build"
  };

  const validated = validateConfig(partialConfig);

  assertEquals(validated.contentDir, "custom_content");
  assertEquals(validated.templateDir, "templates"); // default
  assertEquals(validated.outputDir, "build");
});

Deno.test("validateConfig - empty config", () => {
  const validated = validateConfig({});

  assertEquals(validated.contentDir, "content");
  assertEquals(validated.templateDir, "templates");
  assertEquals(validated.outputDir, "dist");
});
