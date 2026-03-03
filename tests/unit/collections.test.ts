import { assertEquals } from "@std/assert";
import { CollectionManager } from "../../src/core/collections.ts";
import type { Config } from "../../src/types/index.ts";
import { createContentFile } from "../helpers/test_utils.ts";

Deno.test("CollectionManager - processes collections, sorts, and filters drafts", () => {
  const config: Config = {
    contentDir: "content",
    templateDir: "templates",
    outputDir: "dist",
    collections: {
      blog: {
        name: "blog",
        sortBy: "date",
        sortOrder: "desc",
        excludeDrafts: true,
        perPage: 1,
      },
    },
  };

  const manager = new CollectionManager(config);
  const files = [
    createContentFile({
      slug: "blog/older",
      filePath: "blog/older.md",
      frontMatter: {
        title: "Older",
        date: "2026-01-01",
        collection: "blog",
      },
    }),
    createContentFile({
      slug: "blog/newer",
      filePath: "blog/newer.md",
      frontMatter: {
        title: "Newer",
        date: "2026-02-01",
        collection: "blog",
      },
    }),
    createContentFile({
      slug: "blog/draft",
      filePath: "blog/draft.md",
      frontMatter: {
        title: "Draft",
        date: "2026-03-01",
        collection: "blog",
        draft: true,
      },
    }),
  ];

  const collections = manager.processCollections(files);
  assertEquals(collections.length, 1);

  const blog = manager.getCollection("blog");
  assertEquals(blog?.files.length, 2);
  assertEquals(blog?.files[0].slug, "blog/newer");
  assertEquals(blog?.files[1].slug, "blog/older");

  const page1 = manager.paginateCollection(blog!, 1);
  const page2 = manager.paginateCollection(blog!, 2);

  assertEquals(page1.files.length, 1);
  assertEquals(page1.currentPage, 1);
  assertEquals(page1.hasNextPage, true);
  assertEquals(page2.currentPage, 2);
  assertEquals(page2.hasPrevPage, true);
});

Deno.test("CollectionManager - creates taxonomy for tags and categories", () => {
  const config: Config = {
    contentDir: "content",
    templateDir: "templates",
    outputDir: "dist",
    collections: {
      blog: {
        name: "blog",
      },
    },
  };

  const manager = new CollectionManager(config);
  manager.processCollections([
    createContentFile({
      slug: "blog/a",
      filePath: "blog/a.md",
      frontMatter: {
        title: "A",
        collection: "blog",
        tags: ["Deno", "Rig"],
        category: "Tutorial",
      },
    }),
    createContentFile({
      slug: "blog/b",
      filePath: "blog/b.md",
      frontMatter: {
        title: "B",
        collection: "blog",
        tags: ["Deno"],
        category: "Guide",
      },
    }),
  ]);

  const blog = manager.getCollection("blog")!;

  const tags = manager.getAllTags(blog);
  const categories = manager.getAllCategories(blog);

  const denoTag = tags.terms.find((term) => term.slug === "deno");
  const tutorialCategory = categories.terms.find((term) =>
    term.slug === "tutorial"
  );

  assertEquals(denoTag?.count, 2);
  assertEquals(tutorialCategory?.count, 1);
  assertEquals(manager.getFilesByTag(blog, "deno").length, 2);
  assertEquals(manager.getFilesByCategory(blog, "tutorial").length, 1);
});
