import { assertEquals, assertStringIncludes } from "@std/assert";
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
    const outputPath = `${outputDir}/test.html`;
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

Deno.test("Builder - file-based routing with directory style", async () => {
  const testDir = Deno.makeTempDirSync();
  const contentDir = `${testDir}/content`;
  const templateDir = `${testDir}/templates`;
  const outputDir = `${testDir}/dist`;

  await Deno.mkdir(`${contentDir}/blog`, { recursive: true });
  await Deno.mkdir(templateDir, { recursive: true });

  await Deno.writeTextFile(
    `${templateDir}/layout.html`,
    "<html><head><title><%= title %></title></head><body><%= content %></body></html>",
  );

  await Deno.writeTextFile(
    `${contentDir}/blog/my-post.md`,
    `---
title: "Title should not affect route"
---

# Hello`,
  );

  try {
    const config = {
      contentDir,
      templateDir,
      outputDir,
      routing: {
        mode: "file" as const,
        style: "directory" as const,
      },
    };
    const builder = new Builder(config);
    await builder.build({ config, clean: true, verbose: false });

    const generatedPath = `${outputDir}/blog/my-post/index.html`;
    const generatedHtml = await Deno.readTextFile(generatedPath);

    assertEquals(generatedHtml.includes("Title should not affect route"), true);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Builder - rig.toml workflow with configured plugins", async () => {
  const originalCwd = Deno.cwd();
  const testDir = Deno.makeTempDirSync({ prefix: "rig-builder-flow-" });

  try {
    Deno.chdir(testDir);
    await Deno.mkdir("content/blog", { recursive: true });
    await Deno.mkdir("templates", { recursive: true });
    await Deno.mkdir("plugins", { recursive: true });

    await Deno.writeTextFile(
      "templates/layout.html",
      "<html><head><title><%= title %></title></head><body><main><%= content %></main></body></html>",
    );

    await Deno.writeTextFile(
      "content/index.md",
      `---
title: "Home"
date: "2026-03-03"
---

# Home`,
    );

    await Deno.writeTextFile(
      "content/blog/hello-world.md",
      `---
title: "Title Should Not Be The Route"
date: "2026-03-03"
---

# Hello World`,
    );

    await Deno.writeTextFile(
      "plugins/marker-plugin.ts",
      `export default {
  name: "marker-plugin",
  version: "1.0.0",
  description: "Writes a marker file after build",
  async afterBuild(context) {
    if (!context.result.success) return;
    await Deno.writeTextFile(\`\${context.outputDir}/marker.txt\`, "ok");
  }
};`,
    );

    await Deno.writeTextFile(
      "rig.toml",
      `contentDir = "content"
templateDir = "templates"
outputDir = "dist"

plugins = [
  "sitemap",
  { from = "./plugins/marker-plugin.ts" }
]

[routing]
mode = "file"
style = "directory"
`,
    );

    const config = await loadConfig();
    const builder = new Builder(config);
    await builder.build({ config, clean: true, verbose: false });

    await Deno.stat("dist/index.html");
    await Deno.stat("dist/blog/hello-world/index.html");
    await Deno.stat("dist/marker.txt");

    const marker = await Deno.readTextFile("dist/marker.txt");
    assertEquals(marker, "ok");

    const sitemap = await Deno.readTextFile("dist/sitemap.xml");
    assertStringIncludes(
      sitemap,
      "<loc>https://example.com/blog/hello-world/</loc>",
    );

    let titleRouteExists = true;
    try {
      await Deno.stat("dist/title-should-not-be-the-route/index.html");
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        titleRouteExists = false;
      } else {
        throw error;
      }
    }
    assertEquals(titleRouteExists, false);
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(testDir, { recursive: true });
  }
});
