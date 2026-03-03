import type { Plugin, PluginBuildContext } from "../core/plugins.ts";
import type { BuildResult } from "../types/index.ts";

export interface SitemapOptions {
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  excludePaths?: string[];
  baseUrl?: string;
}

export function createSitemapPlugin(options: SitemapOptions = {}): Plugin {
  const {
    changefreq = "weekly",
    priority = 0.8,
    excludePaths = [],
    baseUrl = "https://example.com",
  } = options;

  return {
    name: "sitemap",
    version: "1.0.0",
    description: "Generate sitemap.xml for better SEO",

    async afterBuild(context: PluginBuildContext & { result: BuildResult }) {
      const { config, files, result } = context;

      if (!result.success || files.length === 0) {
        return;
      }

      const sitemapUrls: string[] = [];

      // Add homepage
      sitemapUrls.push(createSitemapEntry(baseUrl, changefreq, priority));

      // Add all content pages
      for (const file of files) {
        const url = `${baseUrl}/${file.slug}.html`;

        // Skip if path is in exclude list
        if (excludePaths.some((path) => url.includes(path))) {
          continue;
        }

        // Determine priority based on frontmatter or default
        let pagePriority = priority;
        if (
          file.frontMatter.priority &&
          typeof file.frontMatter.priority === "number"
        ) {
          pagePriority = file.frontMatter.priority;
        }

        // Determine changefreq based on frontmatter or default
        let pageChangefreq = changefreq;
        if (
          file.frontMatter.changefreq &&
          typeof file.frontMatter.changefreq === "string"
        ) {
          pageChangefreq = file.frontMatter.changefreq as
            | "always"
            | "hourly"
            | "daily"
            | "weekly"
            | "monthly"
            | "yearly"
            | "never";
        }

        // Get last modified date from frontmatter or use current date
        let lastmod = new Date().toISOString().split("T")[0];
        if (file.frontMatter.date) {
          try {
            const date = new Date(file.frontMatter.date);
            lastmod = date.toISOString().split("T")[0];
          } catch {
            // Use current date if parsing fails
          }
        }

        sitemapUrls.push(
          createSitemapEntry(url, pageChangefreq, pagePriority, lastmod),
        );
      }

      // Generate sitemap XML
      const sitemapXml = generateSitemapXml(sitemapUrls);

      // Write sitemap to output directory
      const sitemapPath = `${config.outputDir}/sitemap.xml`;
      await Deno.writeTextFile(sitemapPath, sitemapXml);

      console.log(`🗺️ Generated sitemap.xml with ${sitemapUrls.length} URLs`);
    },
  };
}

function createSitemapEntry(
  url: string,
  changefreq: string,
  priority: number,
  lastmod?: string,
): string {
  const entry = [
    `    <url>`,
    `      <loc>${escapeXml(url)}</loc>`,
  ];

  if (lastmod) {
    entry.push(`      <lastmod>${lastmod}</lastmod>`);
  }

  entry.push(`      <changefreq>${changefreq}</changefreq>`);
  entry.push(`      <priority>${priority.toFixed(1)}</priority>`);
  entry.push(`    </url>`);

  return entry.join("\n");
}

function generateSitemapXml(urls: string[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const footer = `</urlset>`;

  return [header, ...urls, footer].join("\n");
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
export const sitemapPlugin = createSitemapPlugin();
