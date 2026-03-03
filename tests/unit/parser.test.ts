import { assertEquals } from "@std/assert";
import { parseFrontMatter } from "../../src/core/parser.ts";

Deno.test("parseFrontMatter - basic parsing", () => {
  const content = `---
title: "Test Post"
date: "2026-03-03"
---

# Test Content

This is a test markdown file.`;

  const result = parseFrontMatter(content);

  assertEquals(result.frontMatter.title, "Test Post");
  assertEquals(result.frontMatter.date, "2026-03-03");
  assertEquals(result.slug, "test-post");
  assertEquals(result.content, "# Test Content\n\nThis is a test markdown file.");
});

Deno.test("parseFrontMatter - no frontmatter", () => {
  const content = `# Simple Content

No frontmatter here.`;

  const result = parseFrontMatter(content);

  assertEquals(result.frontMatter, {});
  assertEquals(result.slug, "untitled");
  assertEquals(result.content, "# Simple Content\n\nNo frontmatter here.");
});

Deno.test("parseFrontMatter - complex frontmatter", () => {
  const content = `---
title: "Complex Post"
date: "2026-03-03"
author: "John Doe"
tags: "web, development"
---

# Complex Content`;

  const result = parseFrontMatter(content);

  assertEquals(result.frontMatter.title, "Complex Post");
  assertEquals(result.frontMatter.date, "2026-03-03");
  assertEquals(result.frontMatter.author, "John Doe");
  assertEquals(result.frontMatter.tags, "web, development");
  assertEquals(result.slug, "complex-post");
});
