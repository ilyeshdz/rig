import { basename, dirname, extname, relative, resolve } from "@std/path";
import { Config } from "../types/index.ts";
import type {
  BuildOptions,
  BuildResult,
  ContentFile,
  DevServerUpdate,
} from "../types/index.ts";
import {
  markdownToHtml,
  parseFrontMatter,
  processContentFiles,
} from "./parser.ts";
import { loadTemplate, renderTemplate } from "./template.ts";
import { copyStaticAssets } from "./assets.ts";
import {
  type PluginBuildContext,
  PluginManager,
  type PluginRenderContext,
} from "./plugins.ts";
import { CollectionManager } from "./collections.ts";
import { registerConfiguredPlugins } from "./plugin_loader.ts";
import { getOutputPathForSlug } from "./routing.ts";

export interface WatchOptions {
  onUpdate?: (update: DevServerUpdate) => void | Promise<void>;
  signal?: AbortSignal;
}

export class Builder {
  private config: Config;
  private pluginManager = new PluginManager();
  private collectionManager: CollectionManager;
  private contentCache: Map<string, ContentFile> = new Map();
  private layoutTemplate = "";

  constructor(config: Config) {
    this.config = config;
    this.collectionManager = new CollectionManager(config);
  }

  async build(options: BuildOptions = { config: this.config }): Promise<void> {
    const { verbose, clean = true } = options;
    const startTime = Date.now();

    await registerConfiguredPlugins(this.config, this.pluginManager);
    await this.pluginManager.initialize(this.config);

    if (verbose) {
      console.log("🔨 Building site...");
      console.log(`📂 Content: ${this.config.contentDir}`);
      console.log(`🎨 Templates: ${this.config.templateDir}`);
      console.log(`📤 Output: ${this.config.outputDir}`);
    }

    try {
      const buildContext: PluginBuildContext = {
        config: this.config,
        files: [],
        outputDir: this.config.outputDir,
        timestamp: startTime,
      };
      await this.pluginManager.executeHook("beforeBuild", buildContext);

      if (clean) {
        try {
          await Deno.remove(this.config.outputDir, { recursive: true });
          if (verbose) console.log("🧹 Cleaned output directory");
        } catch {
          // Directory might not exist
        }
      }
      await Deno.mkdir(this.config.outputDir, { recursive: true });

      await copyStaticAssets(this.config, { verbose });

      this.layoutTemplate = await this.loadLayoutTemplate();
      if (verbose) console.log("📄 Loaded layout template");

      const contentFiles = await processContentFiles(this.config.contentDir);
      if (verbose) console.log(`📝 Found ${contentFiles.length} content files`);

      const processedFiles = await this.runAfterParseHooks(contentFiles);

      const collections = this.collectionManager.processCollections(
        processedFiles,
      );
      if (verbose) {
        console.log(`📚 Processed ${collections.length} collections`);
      }

      buildContext.files = processedFiles;

      for (const file of processedFiles) {
        const outputPath = await this.renderAndWriteFile(file, startTime);
        if (verbose) {
          console.log(`✅ Generated: ${outputPath}`);
        } else {
          console.log(`Generated: ${outputPath}`);
        }
      }

      this.refreshCache(processedFiles);

      await this.runAfterBuildHooks(
        processedFiles,
        startTime,
        processedFiles.length,
      );

      const duration = Date.now() - startTime;
      console.log(
        `\n🎉 Build completed! Generated ${processedFiles.length} pages in ${duration}ms.`,
      );
    } catch (error) {
      console.error("❌ Build failed:", error);

      const failedResult: BuildResult = {
        success: false,
        filesGenerated: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
        outputDir: this.config.outputDir,
        contentDir: this.config.contentDir,
      };

      try {
        await this.pluginManager.executeHook("afterBuild", {
          config: this.config,
          files: [],
          outputDir: this.config.outputDir,
          result: failedResult,
          timestamp: startTime,
          duration: failedResult.duration,
        });
      } catch (hookError) {
        console.error("❌ Error executing afterBuild hooks:", hookError);
      }

      throw error;
    }
  }

  async watch(options: WatchOptions = {}): Promise<void> {
    const { onUpdate, signal } = options;

    console.log(
      `👀 Watching ${this.config.contentDir} and ${this.config.templateDir} for changes...`,
    );

    await this.build({ config: this.config, verbose: false });

    const watchPaths = await this.getWatchPaths();
    const watcher = Deno.watchFs(watchPaths);
    const abortWatcher = () => watcher.close();

    if (signal) {
      if (signal.aborted) {
        watcher.close();
        return;
      }
      signal.addEventListener("abort", abortWatcher, { once: true });
    }

    try {
      for await (const event of watcher) {
        if (signal?.aborted) {
          break;
        }

        if (!this.isRelevantWatchEvent(event.kind)) {
          continue;
        }

        const changedPaths = event.paths.map((path) => resolve(path));
        const contentPaths = changedPaths.filter((path) =>
          this.isMarkdownContentPath(path)
        );
        const templateChanged = changedPaths.some((path) =>
          this.isTemplatePath(path)
        );
        const staticPaths = changedPaths.filter((path) =>
          this.isStaticPath(path)
        );

        if (
          contentPaths.length === 0 &&
          staticPaths.length === 0 &&
          !templateChanged
        ) {
          continue;
        }

        console.log(`\n🔄 Changes detected in ${changedPaths.join(", ")}`);

        let contentChanged = false;
        let generatedCount = 0;
        let needsFullReload = templateChanged;
        const pageUpdates: string[] = [];

        if (templateChanged) {
          const rendered = await this.rerenderAllCachedFiles();
          generatedCount += rendered;
          contentChanged = true;
          console.log("♻️ Re-rendered all pages (template changed)");
        } else {
          for (const path of contentPaths) {
            const result = await this.handleContentFileChange(path, event.kind);
            contentChanged = contentChanged || result.contentChanged;
            generatedCount += result.generatedCount;
            if (result.updatePath) {
              pageUpdates.push(result.updatePath);
            }
            needsFullReload = needsFullReload || result.requiresFullReload;
          }
        }

        for (const path of staticPaths) {
          const updatePath = await this.handleStaticAssetChange(
            path,
            event.kind,
          );
          if (updatePath && onUpdate) {
            await onUpdate({ type: "asset-update", path: updatePath });
          }
        }

        if (contentChanged) {
          await this.runAfterBuildHooks(
            Array.from(this.contentCache.values()),
            Date.now(),
            generatedCount,
          );
        }

        if (onUpdate) {
          if (needsFullReload) {
            await onUpdate({ type: "full-reload" });
          } else {
            for (const path of pageUpdates) {
              await onUpdate({ type: "page-update", path });
            }
          }
        }

        console.log("✅ Incremental update complete");
      }
    } catch (error) {
      console.error("❌ Error in watch mode:", error);
    } finally {
      signal?.removeEventListener("abort", abortWatcher);
      watcher.close();
    }
  }

  private async runAfterParseHooks(
    contentFiles: ContentFile[],
  ): Promise<ContentFile[]> {
    const processedFiles: ContentFile[] = [];

    for (const file of contentFiles) {
      const parseContext = { config: this.config, file };
      const result = await this.pluginManager.executeHook(
        "afterParse",
        parseContext,
      );
      processedFiles.push(result.file);
    }

    return processedFiles;
  }

  private async runAfterBuildHooks(
    files: ContentFile[],
    startTime: number,
    filesGenerated: number,
  ): Promise<void> {
    const duration = Date.now() - startTime;
    const buildResult: BuildResult = {
      success: true,
      filesGenerated,
      duration,
      outputDir: this.config.outputDir,
      contentDir: this.config.contentDir,
    };

    const afterBuildContext: PluginBuildContext & { result: BuildResult } = {
      config: this.config,
      files,
      outputDir: this.config.outputDir,
      result: buildResult,
      timestamp: startTime,
      duration,
    };

    await this.pluginManager.executeHook("afterBuild", afterBuildContext);
  }

  private async renderAndWriteFile(
    file: ContentFile,
    startTime: number,
  ): Promise<string> {
    const layoutTemplate = this.layoutTemplate ||
      await this.loadLayoutTemplate();
    this.layoutTemplate = layoutTemplate;

    let htmlContent = await markdownToHtml(file.content);

    const renderContext: PluginRenderContext = {
      config: this.config,
      file,
      html: htmlContent,
      timestamp: startTime,
    };
    const renderResult = await this.pluginManager.executeHook(
      "beforeRender",
      renderContext,
    );
    htmlContent = renderResult.html;

    const title = file.frontMatter.title || "Untitled";

    let finalHtml = renderTemplate(layoutTemplate, {
      title,
      content: htmlContent,
      date: file.frontMatter.date || "",
      ...file.frontMatter,
    });

    const afterRenderContext: PluginRenderContext = {
      config: this.config,
      file,
      html: finalHtml,
      timestamp: startTime,
    };
    const afterRenderResult = await this.pluginManager.executeHook(
      "afterRender",
      afterRenderContext,
    );
    finalHtml = afterRenderResult.html;

    let outputPath = getOutputPathForSlug(this.config, file.slug);

    const beforeWriteContext = {
      config: this.config,
      slug: file.slug,
      html: finalHtml,
      outputPath,
      timestamp: startTime,
    };
    const writeResult = await this.pluginManager.executeHook(
      "beforeWrite",
      beforeWriteContext,
    );

    if (writeResult.html !== undefined) finalHtml = writeResult.html;
    if (writeResult.outputPath !== undefined) {
      outputPath = writeResult.outputPath;
    }

    await Deno.mkdir(dirname(outputPath), { recursive: true });
    await Deno.writeTextFile(outputPath, finalHtml);

    const afterWriteContext = {
      config: this.config,
      slug: file.slug,
      html: finalHtml,
      outputPath,
      timestamp: startTime,
    };
    await this.pluginManager.executeHook("afterWrite", afterWriteContext);

    return outputPath;
  }

  private refreshCache(files: ContentFile[]): void {
    this.contentCache.clear();

    for (const file of files) {
      const absolutePath = resolve(this.config.contentDir, file.filePath);
      this.contentCache.set(absolutePath, file);
    }
  }

  private async rerenderAllCachedFiles(): Promise<number> {
    this.layoutTemplate = await this.loadLayoutTemplate();
    let renderedCount = 0;

    for (const file of this.contentCache.values()) {
      await this.renderAndWriteFile(file, Date.now());
      renderedCount++;
    }

    return renderedCount;
  }

  private async handleContentFileChange(
    absolutePath: string,
    eventKind: string,
  ): Promise<{
    contentChanged: boolean;
    generatedCount: number;
    updatePath?: string;
    requiresFullReload: boolean;
  }> {
    if (eventKind === "remove") {
      const cached = this.contentCache.get(absolutePath);
      if (!cached) {
        return {
          contentChanged: false,
          generatedCount: 0,
          requiresFullReload: false,
        };
      }

      const outputPath = getOutputPathForSlug(this.config, cached.slug);
      this.contentCache.delete(absolutePath);

      try {
        await Deno.remove(outputPath);
      } catch {
        // File might already be removed
      }

      console.log(`🗑️ Removed: ${outputPath}`);

      return {
        contentChanged: true,
        generatedCount: 0,
        requiresFullReload: true,
      };
    }

    let content: string;
    try {
      content = await Deno.readTextFile(absolutePath);
    } catch {
      return {
        contentChanged: false,
        generatedCount: 0,
        requiresFullReload: false,
      };
    }

    const relativePath = relative(this.config.contentDir, absolutePath)
      .replaceAll("\\", "/");
    const parsedFile = parseFrontMatter(content, relativePath);

    const parseResult = await this.pluginManager.executeHook("afterParse", {
      config: this.config,
      file: parsedFile,
    });
    const file = parseResult.file;

    const outputPath = await this.renderAndWriteFile(file, Date.now());
    this.contentCache.set(absolutePath, file);

    console.log(`♻️ Updated: ${outputPath}`);

    return {
      contentChanged: true,
      generatedCount: 1,
      updatePath: this.toWebPath(outputPath),
      requiresFullReload: false,
    };
  }

  private async handleStaticAssetChange(
    absolutePath: string,
    eventKind: string,
  ): Promise<string | undefined> {
    const staticRoot = resolve("static");
    const relativePath = relative(staticRoot, absolutePath).replaceAll(
      "\\",
      "/",
    );

    if (relativePath.startsWith("..")) {
      return undefined;
    }

    const outputPath = resolve(this.config.outputDir, relativePath);

    if (eventKind === "remove") {
      try {
        await Deno.remove(outputPath);
      } catch {
        // Already removed
      }
      console.log(`🗑️ Removed asset: ${outputPath}`);
      return `/${relativePath}`;
    }

    try {
      await Deno.mkdir(dirname(outputPath), { recursive: true });
      await Deno.copyFile(absolutePath, outputPath);
      console.log(`📦 Updated asset: ${outputPath}`);
      return `/${relativePath}`;
    } catch {
      return undefined;
    }
  }

  private async loadLayoutTemplate(): Promise<string> {
    return await loadTemplate(`${this.config.templateDir}/layout.html`);
  }

  private async getWatchPaths(): Promise<string[]> {
    const candidates = [
      this.config.contentDir,
      this.config.templateDir,
      "static",
    ];
    const existing: string[] = [];

    for (const path of candidates) {
      try {
        const info = await Deno.stat(path);
        if (info.isDirectory) {
          existing.push(path);
        }
      } catch {
        // Directory does not exist
      }
    }

    return existing;
  }

  private isRelevantWatchEvent(kind: string): boolean {
    return kind === "modify" || kind === "create" || kind === "remove";
  }

  private isMarkdownContentPath(path: string): boolean {
    const contentRoot = resolve(this.config.contentDir);
    return path.startsWith(contentRoot) && extname(path) === ".md";
  }

  private isTemplatePath(path: string): boolean {
    const templateRoot = resolve(this.config.templateDir);
    return path.startsWith(templateRoot) && extname(path) === ".html";
  }

  private isStaticPath(path: string): boolean {
    const staticRoot = resolve("static");
    return path.startsWith(staticRoot);
  }

  private toWebPath(outputPath: string): string {
    const relativeOutput = relative(this.config.outputDir, outputPath)
      .replaceAll("\\", "/");

    if (!relativeOutput || relativeOutput === ".") {
      const base = basename(outputPath);
      return `/${base}`;
    }

    return `/${relativeOutput}`;
  }
}
