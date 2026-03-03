import { assertEquals } from "@std/assert";
import { Builder } from "../../src/core/builder.ts";
import { loadConfig } from "../../src/core/config.ts";

Deno.test("Builder - integration test", async () => {
  // Create temporary directories for testing
  const testDir = Deno.makeTempDirSync();
  const contentDir = `${testDir}/content`;
  const templateDir = `${testDir}/templates`;
  const outputDir = `${testDir}/dist`;

  await Deno.mkdir(contentDir);
  await Deno.mkdir(templateDir);
  
  // Create test template
  const template = `<!DOCTYPE html>
<html>
<head><title><%= title %></title></head>
<body><main><%= content %></main></body>
</html>`;
  await Deno.writeTextFile(`${templateDir}/layout.html`, template);
  
  // Create test content
  const content = `---
title: "Test Page"
---

# Hello World

This is a test.`;
  await Deno.writeTextFile(`${contentDir}/test.md`, content);

  try {
    const config = { contentDir, templateDir, outputDir };
    const builder = new Builder(config);
    
    await builder.build({ config, clean: true, verbose: false });
    
    // Verify output
    const outputPath = `${outputDir}/test-page.html`;
    const output = await Deno.readTextFile(outputPath);
    
    // Check if template was rendered correctly
    assertEquals(output.includes("<title>Test Page</title>"), true);
    assertEquals(output.includes("<h1>Hello World</h1>"), true);
    assertEquals(output.includes("<main>"), true);
    assertEquals(output.includes("Hello World"), true);
    
    console.log("✅ Integration test passed");
  } finally {
    // Cleanup
    await Deno.remove(testDir, { recursive: true });
  }
});
