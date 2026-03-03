import { assertEquals } from "@std/assert";
import {
  parseFrontMatter,
  processContentFiles,
} from "../../src/core/parser.ts";

Deno.test("parseFrontMatter - basic parsing", () => {
  const content = `---
title: "Test Post"
date: "2026-03-03"
---

# Test Content

This is a test markdown file.`;

  const result = parseFrontMatter(content, "test.md");

  assertEquals(result.frontMatter.title, "Test Post");
  assertEquals(result.frontMatter.date, "2026-03-03");
  assertEquals(result.slug, "test");
  assertEquals(result.filePath, "test.md");
  assertEquals(
    result.content,
    "# Test Content\n\nThis is a test markdown file.",
  );
});

Deno.test("parseFrontMatter - no frontmatter", () => {
  const content = `# Simple Content

No frontmatter here.`;

  const result = parseFrontMatter(content, "simple.md");

  assertEquals(result.frontMatter, {});
  assertEquals(result.slug, "simple");
  assertEquals(result.filePath, "simple.md");
  assertEquals(result.content, "# Simple Content\n\nNo frontmatter here.");
});

Deno.test("parseFrontMatter - parses typed fields", () => {
  const content = `---
title: "Complex Post"
date: "2026-03-03"
author: "John Doe"
tags: "web, development"
draft: true
priority: 0.9
---

# Complex Content`;

  const result = parseFrontMatter(content, "complex.md");

  assertEquals(result.frontMatter.title, "Complex Post");
  assertEquals(result.frontMatter.date, "2026-03-03");
  assertEquals(result.frontMatter.author, "John Doe");
  assertEquals(result.frontMatter.tags, ["web", "development"]);
  assertEquals(result.frontMatter.draft, true);
  assertEquals(result.frontMatter.priority, 0.9);
  assertEquals(result.slug, "complex");
});

Deno.test("parseFrontMatter - derives slug from nested file path", () => {
  const content = `---
title: "Nested"
---

# Nested`;

  const result = parseFrontMatter(content, "blog/my-first-post.md");
  assertEquals(result.slug, "blog/my-first-post");
});

Deno.test("processContentFiles - reads markdown recursively", async () => {
  const root = Deno.makeTempDirSync({ prefix: "rig-parser-" });
  const contentDir = `${root}/content`;

  try {
    await Deno.mkdir(`${contentDir}/blog`, { recursive: true });
    await Deno.writeTextFile(
      `${contentDir}/index.md`,
      "# Home",
    );
    await Deno.writeTextFile(
      `${contentDir}/blog/post.md`,
      "# Blog Post",
    );

    const files = await processContentFiles(contentDir);
    const slugs = files.map((file) => file.slug).sort();

    assertEquals(slugs, ["blog/post", "index"]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
