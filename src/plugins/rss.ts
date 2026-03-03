import type { Plugin, PluginBuildContext } from "../core/plugins.ts";
import type { BuildResult, Config, ContentFile } from "../types/index.ts";
import { getPublicUrlForSlug } from "../core/routing.ts";

export interface RssOptions {
  title?: string;
  description?: string;
  baseUrl?: string;
  feedPath?: string;
  author?: string;
  language?: string;
  copyright?: string;
  managingEditor?: string;
  webMaster?: string;
  category?: string;
  ttl?: number;
  excludeDrafts?: boolean;
  maxItems?: number;
}

export function createRssPlugin(options: RssOptions = {}): Plugin {
  const {
    title = "My Website",
    description = "Latest content from my website",
    baseUrl = "https://example.com",
    feedPath = "rss.xml",
    author = "Website Author",
    language = "en-us",
    copyright,
    managingEditor,
    webMaster,
    category,
    ttl = 1440, // 24 hours in minutes
    excludeDrafts = true,
    maxItems,
  } = options;

  return {
    name: "rss",
    version: "1.0.0",
    description: "Generate RSS feed for content syndication",

    async afterBuild(context: PluginBuildContext & { result: BuildResult }) {
      const { config, files, result } = context;

      if (!result.success || files.length === 0) {
        return;
      }

      // Filter files for RSS feed
      let feedFiles = files.filter((file) => {
        // Skip drafts if excludeDrafts is enabled
        if (
          excludeDrafts &&
          (file.frontMatter.draft === true || file.frontMatter.draft === "true")
        ) {
          return false;
        }

        // Skip files with no-rss frontmatter
        if (
          typeof file.frontMatter.rss === "string" &&
          file.frontMatter.rss === "false"
        ) {
          return false;
        }

        // Only include files with dates (typically blog posts)
        return !!file.frontMatter.date;
      });

      // Sort by date (newest first)
      feedFiles.sort((a, b) => {
        const dateA = a.frontMatter.date
          ? new Date(a.frontMatter.date).getTime()
          : 0;
        const dateB = b.frontMatter.date
          ? new Date(b.frontMatter.date).getTime()
          : 0;
        return dateB - dateA;
      });

      // Limit number of items if specified
      if (maxItems && maxItems > 0) {
        feedFiles = feedFiles.slice(0, maxItems);
      }

      if (feedFiles.length === 0) {
        console.log("📡 No items found for RSS feed");
        return;
      }

      // Generate RSS XML
      const rssXml = generateRssXml(feedFiles, {
        title,
        description,
        baseUrl,
        config,
        author,
        language,
        copyright,
        managingEditor,
        webMaster,
        category,
        ttl,
        lastBuildDate: new Date().toUTCString(),
        feedPath,
      });

      // Write RSS feed to output directory
      const rssPath = `${config.outputDir}/${feedPath}`;
      const rssDir = rssPath.split("/").slice(0, -1).join("/");
      if (rssDir) {
        await Deno.mkdir(rssDir, { recursive: true });
      }
      await Deno.writeTextFile(rssPath, rssXml);

      console.log(
        `📡 Generated RSS feed with ${feedFiles.length} items: ${feedPath}`,
      );
    },
  };
}

interface RssFeedData {
  title: string;
  description: string;
  baseUrl: string;
  config: Config;
  author: string;
  language: string;
  copyright?: string;
  managingEditor?: string;
  webMaster?: string;
  category?: string;
  ttl: number;
  lastBuildDate: string;
  feedPath: string;
}

function generateRssXml(files: ContentFile[], feedData: RssFeedData): string {
  const {
    title,
    description,
    baseUrl,
    config,
    author,
    language,
    copyright,
    managingEditor,
    webMaster,
    category,
    ttl,
    lastBuildDate,
    feedPath,
  } = feedData;

  const normalizedFeedPath = feedPath.startsWith("/")
    ? feedPath.slice(1)
    : feedPath;

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(baseUrl)}</link>
    <atom:link href="${escapeXml(baseUrl)}/${
    escapeXml(normalizedFeedPath)
  }" rel="self" type="application/rss+xml"/>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <generator>Rig Static Site Generator</generator>`;

  const optionalElements = [];

  if (author) {
    optionalElements.push(`    <author>${escapeXml(author)}</author>`);
  }

  if (managingEditor) {
    optionalElements.push(
      `    <managingEditor>${escapeXml(managingEditor)}</managingEditor>`,
    );
  }

  if (webMaster) {
    optionalElements.push(`    <webMaster>${escapeXml(webMaster)}</webMaster>`);
  }

  if (copyright) {
    optionalElements.push(`    <copyright>${escapeXml(copyright)}</copyright>`);
  }

  if (category) {
    optionalElements.push(`    <category>${escapeXml(category)}</category>`);
  }

  if (ttl) {
    optionalElements.push(`    <ttl>${ttl}</ttl>`);
  }

  const itemElements = files.map((file) => {
    const itemTitle = file.frontMatter.title || file.slug;
    const itemDescription = file.frontMatter.description || "";
    const itemLink = getPublicUrlForSlug(config, baseUrl, file.slug);
    const itemGuid = itemLink;

    let pubDate = "";
    if (file.frontMatter.date) {
      try {
        pubDate = new Date(file.frontMatter.date).toUTCString();
      } catch {
        // Use current date if parsing fails
        pubDate = new Date().toUTCString();
      }
    } else {
      pubDate = new Date().toUTCString();
    }

    const item = [
      `      <item>`,
      `        <title>${escapeXml(itemTitle)}</title>`,
      `        <description>${escapeXml(itemDescription)}</description>`,
      `        <link>${escapeXml(itemLink)}</link>`,
      `        <guid isPermaLink="true">${escapeXml(itemGuid)}</guid>`,
      `        <pubDate>${escapeXml(pubDate)}</pubDate>`,
    ];

    // Add categories if present
    if (file.frontMatter.tags) {
      const tags = Array.isArray(file.frontMatter.tags)
        ? file.frontMatter.tags
        : file.frontMatter.tags.split(",").map((tag: string) => tag.trim());

      for (const tag of tags) {
        item.push(`        <category>${escapeXml(tag)}</category>`);
      }
    }

    // Add author if present
    if (file.frontMatter.author) {
      item.push(
        `        <author>${escapeXml(file.frontMatter.author)}</author>`,
      );
    }

    item.push(`      </item>`);

    return item.join("\n");
  }).join("\n");

  const footer = `  </channel>
</rss>`;

  return [header, ...optionalElements, itemElements, footer].join("\n");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Export a default plugin instance
export const rssPlugin = createRssPlugin();
