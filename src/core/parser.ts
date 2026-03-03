import { marked } from "marked";
import { ContentFile, FrontMatter } from "../types/index.ts";

export function parseFrontMatter(
  content: string,
  filePath: string,
): ContentFile {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return {
      frontMatter: {},
      content,
      slug: "untitled",
      filePath,
    };
  }

  const frontMatterText = match[1];
  const markdownContent = match[2];

  const frontMatter: FrontMatter = {};
  frontMatterText.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      const value = valueParts.join(":").trim().replace(/^["']|["']$/g, "");

      // Handle special types
      if (key === "tags" || key === "categories") {
        // Handle comma-separated tags/categories
        frontMatter[key.trim()] = value.includes(",")
          ? value.split(",").map((tag) => tag.trim()).filter((tag) => tag)
          : value;
      } else if (key === "draft") {
        // Handle boolean draft
        frontMatter[key.trim()] = value === "true";
      } else if (key === "priority") {
        // Handle numeric priority
        const numValue = Number(value);
        frontMatter[key.trim()] = isNaN(numValue) ? value : numValue;
      } else {
        frontMatter[key.trim()] = value;
      }
    }
  });

  const slug = frontMatter.title?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "untitled";

  return {
    frontMatter,
    content: markdownContent,
    slug,
    filePath,
  };
}

export async function markdownToHtml(markdown: string): Promise<string> {
  return await marked(markdown);
}

export async function processContentFiles(
  contentDir: string,
): Promise<ContentFile[]> {
  const contentFiles: ContentFile[] = [];

  try {
    for await (const entry of Deno.readDir(contentDir)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        const content = await Deno.readTextFile(`${contentDir}/${entry.name}`);
        const parsed = parseFrontMatter(content, entry.name);
        contentFiles.push(parsed);
      }
    }
  } catch (error) {
    console.error("Error reading content directory:", error);
  }

  return contentFiles;
}
