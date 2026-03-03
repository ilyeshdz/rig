import type {
  BuildResult,
  Config,
  ContentFile,
  FrontMatter,
} from "../../src/types/index.ts";

export interface TestSite {
  rootDir: string;
  contentDir: string;
  templateDir: string;
  outputDir: string;
  config: Config;
  cleanup: () => Promise<void>;
}

export async function createTestSite(
  collections?: Config["collections"],
): Promise<TestSite> {
  const rootDir = Deno.makeTempDirSync({ prefix: "rig-test-" });
  const contentDir = `${rootDir}/content`;
  const templateDir = `${rootDir}/templates`;
  const outputDir = `${rootDir}/dist`;

  await Deno.mkdir(contentDir, { recursive: true });
  await Deno.mkdir(templateDir, { recursive: true });
  await Deno.mkdir(outputDir, { recursive: true });

  await Deno.writeTextFile(
    `${templateDir}/layout.html`,
    "<html><head><title><%= title %></title></head><body><main><%= content %></main></body></html>",
  );

  const config: Config = {
    contentDir,
    templateDir,
    outputDir,
    ...(collections ? { collections } : {}),
  };

  return {
    rootDir,
    contentDir,
    templateDir,
    outputDir,
    config,
    cleanup: async () => {
      await Deno.remove(rootDir, { recursive: true });
    },
  };
}

export function createContentFile(options: {
  slug: string;
  frontMatter?: FrontMatter;
  content?: string;
  filePath?: string;
  collection?: string;
}): ContentFile {
  return {
    slug: options.slug,
    frontMatter: options.frontMatter ?? {},
    content: options.content ?? "# Test content",
    filePath: options.filePath ?? `${options.slug}.md`,
    ...(options.collection ? { collection: options.collection } : {}),
  };
}

export function createBuildResult(
  config: Config,
  filesGenerated: number,
): BuildResult {
  return {
    success: true,
    filesGenerated,
    duration: 1,
    outputDir: config.outputDir,
    contentDir: config.contentDir,
  };
}
