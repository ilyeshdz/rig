import { marked } from "marked";
import { ContentFile, FrontMatter } from "../types/index.ts";

export function parseFrontMatter(content: string): ContentFile {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return {
      frontMatter: {},
      content,
      slug: "untitled",
    };
  }

  const frontMatterText = match[1];
  const markdownContent = match[2];

  const frontMatter: FrontMatter = {};
  frontMatterText.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      frontMatter[key.trim()] = valueParts.join(":").trim().replace(
        /^["']|["']$/g,
        "",
      );
    }
  });

  const slug = frontMatter.title?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "untitled";

  return {
    frontMatter,
    content: markdownContent,
    slug,
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
        const parsed = parseFrontMatter(content);
        contentFiles.push(parsed);
      }
    }
  } catch (error) {
    console.error("Error reading content directory:", error);
  }

  return contentFiles;
}
