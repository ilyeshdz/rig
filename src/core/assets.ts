import { Config } from "../types/index.ts";

const DEFAULT_STATIC_DIR = "static";

export interface AssetOptions {
  verbose?: boolean;
}

export async function copyStaticAssets(
  config: Config,
  options: AssetOptions = {},
): Promise<number> {
  const staticDir = DEFAULT_STATIC_DIR;
  let copiedCount = 0;

  try {
    const staticPath = staticDir;
    await Deno.stat(staticPath);
  } catch {
    if (options.verbose) {
      console.log(`📁 No static directory found (${staticDir}), skipping asset copy`);
    }
    return 0;
  }

  const destDir = config.outputDir;

  try {
    await Deno.mkdir(destDir, { recursive: true });
  } catch {
  }

  await copyDirectory(DEFAULT_STATIC_DIR, destDir, () => {
    copiedCount++;
  });

  if (options.verbose && copiedCount > 0) {
    console.log(`📦 Copied ${copiedCount} static assets`);
  }

  return copiedCount;
}

async function copyDirectory(
  src: string,
  dest: string,
  onFile: () => void,
): Promise<void> {
  try {
    for await (const entry of Deno.readDir(src)) {
      const srcPath = `${src}/${entry.name}`;
      const destPath = `${dest}/${entry.name}`;

      if (entry.isDirectory) {
        await Deno.mkdir(destPath, { recursive: true });
        await copyDirectory(srcPath, destPath, onFile);
      } else if (entry.isFile) {
        await Deno.copyFile(srcPath, destPath);
        onFile();
      }
    }
  } catch (error) {
    console.error(`Error copying directory ${src}:`, error);
  }
}

export function getStaticAssetPaths(config: Config): string[] {
  return [DEFAULT_STATIC_DIR];
}
