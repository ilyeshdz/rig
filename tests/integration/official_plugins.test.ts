import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { createSitemapPlugin } from "../../src/plugins/sitemap.ts";
import { createRssPlugin } from "../../src/plugins/rss.ts";
import { createPaginationPlugin } from "../../src/plugins/pagination.ts";
import { createTaxonomyPlugin } from "../../src/plugins/taxonomy.ts";
import {
  createBuildResult,
  createContentFile,
  createTestSite,
} from "../helpers/test_utils.ts";

Deno.test("official plugin: sitemap generates sitemap.xml with filters and metadata", async () => {
  const site = await createTestSite();

  try {
    const plugin = createSitemapPlugin({
      baseUrl: "https://rig.dev",
      excludePaths: ["private"],
      priority: 0.7,
    });

    const files = [
      createContentFile({
        slug: "posts/intro",
        frontMatter: {
          title: "Intro",
          date: "2026-01-15",
          changefreq: "daily",
          priority: 0.9,
        },
      }),
      createContentFile({
        slug: "private/notes",
        frontMatter: {
          title: "Private",
          date: "2026-01-01",
        },
      }),
    ];

    await plugin.afterBuild?.({
      config: site.config,
      files,
      outputDir: site.outputDir,
      timestamp: Date.now(),
      result: createBuildResult(site.config, files.length),
    });

    const sitemapPath = `${site.outputDir}/sitemap.xml`;
    const xml = await Deno.readTextFile(sitemapPath);

    assertStringIncludes(xml, "<loc>https://rig.dev</loc>");
    assertStringIncludes(xml, "<loc>https://rig.dev/posts/intro.html</loc>");
    assertStringIncludes(xml, "<changefreq>daily</changefreq>");
    assertStringIncludes(xml, "<priority>0.9</priority>");
    assertStringIncludes(xml, "<lastmod>2026-01-15</lastmod>");
    assertEquals(xml.includes("private/notes"), false);
  } finally {
    await site.cleanup();
  }
});

Deno.test("official plugin: rss generates feed and filters drafts/no-rss entries", async () => {
  const site = await createTestSite();

  try {
    const plugin = createRssPlugin({
      title: "Rig Blog",
      description: "Latest posts",
      baseUrl: "https://rig.dev",
      feedPath: "feeds/news.xml",
      excludeDrafts: true,
      maxItems: 2,
    });

    const files = [
      createContentFile({
        slug: "post-1",
        frontMatter: {
          title: "Post 1",
          date: "2026-03-01",
          tags: ["deno", "rig"],
        },
      }),
      createContentFile({
        slug: "post-2",
        frontMatter: {
          title: "Post 2",
          date: "2026-03-02",
          draft: true,
        },
      }),
      createContentFile({
        slug: "post-3",
        frontMatter: {
          title: "Post 3",
          date: "2026-03-03",
          rss: "false",
        },
      }),
      createContentFile({
        slug: "post-4",
        frontMatter: {
          title: "Post 4",
          date: "2026-03-04",
          description: "Visible in feed",
        },
      }),
    ];

    await plugin.afterBuild?.({
      config: site.config,
      files,
      outputDir: site.outputDir,
      timestamp: Date.now(),
      result: createBuildResult(site.config, files.length),
    });

    const feedPath = `${site.outputDir}/feeds/news.xml`;
    const xml = await Deno.readTextFile(feedPath);

    assertStringIncludes(xml, "<title>Rig Blog</title>");
    assertStringIncludes(
      xml,
      '<atom:link href="https://rig.dev/feeds/news.xml" rel="self" type="application/rss+xml"/>',
    );
    assertStringIncludes(xml, "<title>Post 4</title>");
    assertStringIncludes(xml, "<title>Post 1</title>");
    assertEquals(xml.includes("Post 2"), false);
    assertEquals(xml.includes("Post 3"), false);

    const itemCount = (xml.match(/<item>/g) ?? []).length;
    assertEquals(itemCount, 2);
  } finally {
    await site.cleanup();
  }
});

Deno.test("official plugin: pagination generates index and paginated pages", async () => {
  const site = await createTestSite({
    blog: {
      name: "blog",
      sortBy: "date",
      sortOrder: "desc",
      paginate: true,
      perPage: 2,
      excludeDrafts: false,
    },
  });

  try {
    const plugin = createPaginationPlugin({
      collections: ["blog"],
      perPage: 2,
      indexPath: "{collection}/index.html",
      pagePath: "{collection}/page/{page}/index.html",
    });

    const files = [1, 2, 3, 4, 5].map((i) =>
      createContentFile({
        slug: `blog/post-${i}`,
        filePath: `blog/post-${i}.md`,
        frontMatter: {
          title: `Post ${i}`,
          date: `2026-01-0${i}`,
          collection: "blog",
        },
      })
    );

    await plugin.afterBuild?.({
      config: site.config,
      files,
      outputDir: site.outputDir,
      timestamp: Date.now(),
      result: createBuildResult(site.config, files.length),
    });

    const page1 = `${site.outputDir}/blog/index.html`;
    const page2 = `${site.outputDir}/blog/page/2/index.html`;
    const page3 = `${site.outputDir}/blog/page/3/index.html`;

    assertExists(await Deno.stat(page1));
    assertExists(await Deno.stat(page2));
    assertExists(await Deno.stat(page3));

    const page2Html = await Deno.readTextFile(page2);
    assertStringIncludes(page2Html, "Page 2 of 3");
    assertStringIncludes(page2Html, "Previous");
    assertStringIncludes(page2Html, "Next");
  } finally {
    await site.cleanup();
  }
});

Deno.test("official plugin: taxonomy generates index and term pages", async () => {
  const site = await createTestSite({
    blog: {
      name: "blog",
      sortBy: "date",
      sortOrder: "desc",
      excludeDrafts: false,
    },
  });

  try {
    const plugin = createTaxonomyPlugin({
      collections: ["blog"],
      taxonomies: ["tags", "categories"],
      indexPath: "{taxonomy}/index.html",
      termPath: "{taxonomy}/{term}/index.html",
    });

    const files = [
      createContentFile({
        slug: "blog/a",
        filePath: "blog/a.md",
        frontMatter: {
          title: "A",
          date: "2026-01-01",
          collection: "blog",
          tags: ["Deno", "Static"],
          category: "Tutorial",
        },
      }),
      createContentFile({
        slug: "blog/b",
        filePath: "blog/b.md",
        frontMatter: {
          title: "B",
          date: "2026-01-02",
          collection: "blog",
          tags: ["Deno"],
          category: "Guide",
        },
      }),
    ];

    await plugin.afterBuild?.({
      config: site.config,
      files,
      outputDir: site.outputDir,
      timestamp: Date.now(),
      result: createBuildResult(site.config, files.length),
    });

    const expectedPaths = [
      `${site.outputDir}/tags/index.html`,
      `${site.outputDir}/tags/deno/index.html`,
      `${site.outputDir}/categories/index.html`,
      `${site.outputDir}/categories/tutorial/index.html`,
      `${site.outputDir}/categories/guide/index.html`,
    ];

    for (const path of expectedPaths) {
      assert(await Deno.stat(path));
    }

    const termHtml = await Deno.readTextFile(
      `${site.outputDir}/tags/deno/index.html`,
    );
    assertStringIncludes(termHtml, "2 items tagged with");
    assertStringIncludes(termHtml, "A");
  } finally {
    await site.cleanup();
  }
});
