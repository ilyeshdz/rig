import { marked } from "marked";
import { relative } from "@std/path";
import { ContentFile, FrontMatter } from "../types/index.ts";
import { slugFromFilePath } from "./routing.ts";

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
      slug: slugFromFilePath(filePath),
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

  const slug = slugFromFilePath(filePath);

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
    await walkContentDirectory(contentDir, contentDir, contentFiles);
  } catch (error) {
    console.error("Error reading content directory:", error);
  }

  return contentFiles;
}

async function walkContentDirectory(
  rootDir: string,
  currentDir: string,
  contentFiles: ContentFile[],
): Promise<void> {
  for await (const entry of Deno.readDir(currentDir)) {
    const fullPath = `${currentDir}/${entry.name}`;

    if (entry.isDirectory) {
      await walkContentDirectory(rootDir, fullPath, contentFiles);
      continue;
    }

    if (!entry.isFile || !entry.name.endsWith(".md")) {
      continue;
    }

    const content = await Deno.readTextFile(fullPath);
    const relativePath = relative(rootDir, fullPath).replaceAll("\\", "/");
    const parsed = parseFrontMatter(content, relativePath);
    contentFiles.push(parsed);
  }
}
