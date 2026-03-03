import {
  createPaginationPlugin,
  createRssPlugin,
  createSitemapPlugin,
  createTaxonomyPlugin,
} from "../../src/plugins/index.ts";
import {
  createBuildResult,
  createContentFile,
  createTestSite,
} from "../helpers/test_utils.ts";

function buildBlogFiles(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const i = index + 1;
    return createContentFile({
      slug: `blog/post-${i}`,
      filePath: `blog/post-${i}.md`,
      frontMatter: {
        title: `Post ${i}`,
        date: `2026-02-${String((i % 28) + 1).padStart(2, "0")}`,
        collection: "blog",
        tags: i % 2 === 0 ? ["Deno", "Rig"] : ["Rig"],
        category: i % 2 === 0 ? "Guides" : "Tutorial",
      },
    });
  });
}

async function withMutedConsole<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

Deno.bench({
  name: "Official plugins - sitemap",
  permissions: { read: true, write: true },
}, async (b) => {
  const site = await createTestSite();
  const files = buildBlogFiles(30);
  const plugin = createSitemapPlugin({ baseUrl: "https://rig.dev" });

  try {
    await withMutedConsole(async () => {
      b.start();
      for (let i = 0; i < 20; i++) {
        await plugin.afterBuild?.({
          config: site.config,
          files,
          outputDir: site.outputDir,
          timestamp: Date.now(),
          result: createBuildResult(site.config, files.length),
        });
      }
      b.end();
    });
  } finally {
    await site.cleanup();
  }
});

Deno.bench({
  name: "Official plugins - rss",
  permissions: { read: true, write: true },
}, async (b) => {
  const site = await createTestSite();
  const files = buildBlogFiles(30);
  const plugin = createRssPlugin({
    baseUrl: "https://rig.dev",
    feedPath: "feeds/rss.xml",
    maxItems: 20,
  });

  try {
    await withMutedConsole(async () => {
      b.start();
      for (let i = 0; i < 20; i++) {
        await plugin.afterBuild?.({
          config: site.config,
          files,
          outputDir: site.outputDir,
          timestamp: Date.now(),
          result: createBuildResult(site.config, files.length),
        });
      }
      b.end();
    });
  } finally {
    await site.cleanup();
  }
});

Deno.bench({
  name: "Official plugins - pagination",
  permissions: { read: true, write: true },
}, async (b) => {
  const site = await createTestSite({
    blog: {
      name: "blog",
      sortBy: "date",
      sortOrder: "desc",
      perPage: 5,
      paginate: true,
      excludeDrafts: false,
    },
  });
  const files = buildBlogFiles(30);
  const plugin = createPaginationPlugin({ collections: ["blog"], perPage: 5 });

  try {
    await withMutedConsole(async () => {
      b.start();
      for (let i = 0; i < 10; i++) {
        await plugin.afterBuild?.({
          config: site.config,
          files,
          outputDir: site.outputDir,
          timestamp: Date.now(),
          result: createBuildResult(site.config, files.length),
        });
      }
      b.end();
    });
  } finally {
    await site.cleanup();
  }
});

Deno.bench({
  name: "Official plugins - taxonomy",
  permissions: { read: true, write: true },
}, async (b) => {
  const site = await createTestSite({
    blog: {
      name: "blog",
      sortBy: "date",
      sortOrder: "desc",
      excludeDrafts: false,
    },
  });
  const files = buildBlogFiles(30);
  const plugin = createTaxonomyPlugin({
    collections: ["blog"],
    taxonomies: ["tags", "categories"],
  });

  try {
    await withMutedConsole(async () => {
      b.start();
      for (let i = 0; i < 10; i++) {
        await plugin.afterBuild?.({
          config: site.config,
          files,
          outputDir: site.outputDir,
          timestamp: Date.now(),
          result: createBuildResult(site.config, files.length),
        });
      }
      b.end();
    });
  } finally {
    await site.cleanup();
  }
});
