import type {
  BuildResult,
  Config,
  ContentFile,
  HookContext,
  PluginBuildContext,
  PluginInitContext,
  PluginRenderContext,
  PluginWatchContext,
} from "../types/index.ts";

export const RIG_VERSION = "0.2.1";

export const HOOK_NAMES = [
  "register",
  "init",
  "beforeBuild",
  "afterBuild",
  "beforeParse",
  "afterParse",
  "beforeRender",
  "afterRender",
  "beforeWrite",
  "afterWrite",
  "onWatch",
  "beforeServe",
  "afterServe",
  "destroy",
] as const;

export type HookName = typeof HOOK_NAMES[number];

export type HookFn<T extends HookContext = HookContext> = (
  context: T,
) => Promise<void> | void;

type HookHandlerFn = (context: unknown) => Promise<unknown> | unknown;

export interface HookDefinition<T extends HookContext = HookContext> {
  name: HookName;
  handler: HookFn<T>;
  priority?: number;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  tags?: string[];
  rigVersion?: string;
  hooks?: Record<HookName, HookFn | HookFn[]>;
}

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  tags?: string[];
  rigVersion?: string;

  register?: (context: PluginInitContext) => Promise<void> | void;
  init?: (context: PluginInitContext) => Promise<void> | void;
  beforeBuild?: (context: PluginBuildContext) => Promise<void> | void;
  afterBuild?: (
    context: PluginBuildContext & { result: BuildResult },
  ) => Promise<void> | void;

  beforeParse?: (
    context: HookContext & { content: string; filePath: string },
  ) => Promise<{ content: string } | void> | void;
  afterParse?: (
    context: HookContext & { file: ContentFile },
  ) => Promise<{ file: ContentFile } | void> | void;

  beforeRender?: (
    context: PluginRenderContext,
  ) => Promise<{ html: string } | void> | void;
  afterRender?: (context: PluginRenderContext) => Promise<void> | void;

  beforeWrite?: (
    context: HookContext & { slug: string; html: string; outputPath: string },
  ) => Promise<{ html?: string; outputPath?: string } | void> | void;
  afterWrite?: (
    context: HookContext & { slug: string; html: string; outputPath: string },
  ) => Promise<void> | void;

  onWatch?: (context: PluginWatchContext) => Promise<void> | void;
  beforeServe?: (context: HookContext) => Promise<void> | void;
  afterServe?: (context: HookContext) => Promise<void> | void;

  destroy?: () => Promise<void> | void;
}

export interface PluginError extends Error {
  pluginName: string;
  hookName?: HookName;
  code?: string;
}

export function createPluginError(
  message: string,
  pluginName: string,
  hookName?: HookName,
  code?: string,
): PluginError {
  const error = new Error(message) as PluginError;
  error.pluginName = pluginName;
  error.hookName = hookName;
  error.code = code;
  return error;
}

export function validatePlugin(plugin: unknown): plugin is Plugin {
  if (!plugin || typeof plugin !== "object") return false;

  const p = plugin as Partial<Plugin>;

  if (!p.name || typeof p.name !== "string") return false;
  if (!p.version || typeof p.version !== "string") return false;
  if (!p.description || typeof p.description !== "string") return false;

  return true;
}

export function normalizePlugin(
  manifest: PluginManifest,
): Plugin {
  const hooks = manifest.hooks || {} as Record<HookName, HookFn>;

  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    homepage: manifest.homepage,
    tags: manifest.tags,
    rigVersion: manifest.rigVersion,
    init: typeof hooks.init === "function"
      ? hooks.init as Plugin["init"]
      : undefined,
    beforeBuild: typeof hooks.beforeBuild === "function"
      ? hooks.beforeBuild as Plugin["beforeBuild"]
      : undefined,
    afterBuild: typeof hooks.afterBuild === "function"
      ? hooks.afterBuild as Plugin["afterBuild"]
      : undefined,
    beforeParse: typeof hooks.beforeParse === "function"
      ? hooks.beforeParse as Plugin["beforeParse"]
      : undefined,
    afterParse: typeof hooks.afterParse === "function"
      ? hooks.afterParse as Plugin["afterParse"]
      : undefined,
    beforeRender: typeof hooks.beforeRender === "function"
      ? hooks.beforeRender as Plugin["beforeRender"]
      : undefined,
    afterRender: typeof hooks.afterRender === "function"
      ? hooks.afterRender as Plugin["afterRender"]
      : undefined,
    beforeWrite: typeof hooks.beforeWrite === "function"
      ? hooks.beforeWrite as Plugin["beforeWrite"]
      : undefined,
    afterWrite: typeof hooks.afterWrite === "function"
      ? hooks.afterWrite as Plugin["afterWrite"]
      : undefined,
    onWatch: typeof hooks.onWatch === "function"
      ? hooks.onWatch as Plugin["onWatch"]
      : undefined,
    beforeServe: typeof hooks.beforeServe === "function"
      ? hooks.beforeServe as Plugin["beforeServe"]
      : undefined,
    afterServe: typeof hooks.afterServe === "function"
      ? hooks.afterServe as Plugin["afterServe"]
      : undefined,
    destroy: typeof hooks.destroy === "function"
      ? hooks.destroy as Plugin["destroy"]
      : undefined,
  };
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hookHandlers: Map<
    HookName,
    Array<{ plugin: Plugin; fn: HookHandlerFn; priority: number }>
  > = new Map();
  private initialized = false;

  constructor() {
    HOOK_NAMES.forEach((hook) => this.hookHandlers.set(hook, []));
  }

  register(plugin: Plugin | PluginManifest): void {
    const normalized = validatePlugin(plugin)
      ? plugin as Plugin
      : normalizePlugin(plugin as PluginManifest);

    this.removePluginHooks(normalized.name);
    this.plugins.set(normalized.name, normalized);

    const hooks: Array<
      { name: HookName; fn: HookHandlerFn; priority: number }
    > = [];
    const asHookHandler = (fn: unknown): HookHandlerFn => fn as HookHandlerFn;

    if (normalized.register) {
      hooks.push({
        name: "register",
        fn: asHookHandler(normalized.register),
        priority: 100,
      });
    }
    if (normalized.init) {
      hooks.push({
        name: "init",
        fn: asHookHandler(normalized.init),
        priority: 100,
      });
    }
    if (normalized.beforeBuild) {
      hooks.push({
        name: "beforeBuild",
        fn: asHookHandler(normalized.beforeBuild),
        priority: 50,
      });
    }
    if (normalized.afterBuild) {
      hooks.push({
        name: "afterBuild",
        fn: asHookHandler(normalized.afterBuild),
        priority: -50,
      });
    }
    if (normalized.beforeParse) {
      hooks.push({
        name: "beforeParse",
        fn: asHookHandler(normalized.beforeParse),
        priority: 50,
      });
    }
    if (normalized.afterParse) {
      hooks.push({
        name: "afterParse",
        fn: asHookHandler(normalized.afterParse),
        priority: -50,
      });
    }
    if (normalized.beforeRender) {
      hooks.push({
        name: "beforeRender",
        fn: asHookHandler(normalized.beforeRender),
        priority: 50,
      });
    }
    if (normalized.afterRender) {
      hooks.push({
        name: "afterRender",
        fn: asHookHandler(normalized.afterRender),
        priority: -50,
      });
    }
    if (normalized.beforeWrite) {
      hooks.push({
        name: "beforeWrite",
        fn: asHookHandler(normalized.beforeWrite),
        priority: 50,
      });
    }
    if (normalized.afterWrite) {
      hooks.push({
        name: "afterWrite",
        fn: asHookHandler(normalized.afterWrite),
        priority: -50,
      });
    }
    if (normalized.onWatch) {
      hooks.push({
        name: "onWatch",
        fn: asHookHandler(normalized.onWatch),
        priority: 0,
      });
    }
    if (normalized.beforeServe) {
      hooks.push({
        name: "beforeServe",
        fn: asHookHandler(normalized.beforeServe),
        priority: 50,
      });
    }
    if (normalized.afterServe) {
      hooks.push({
        name: "afterServe",
        fn: asHookHandler(normalized.afterServe),
        priority: -50,
      });
    }
    if (normalized.destroy) {
      hooks.push({
        name: "destroy",
        fn: asHookHandler(normalized.destroy),
        priority: 0,
      });
    }

    for (const { name, fn, priority } of hooks) {
      const handlers = this.hookHandlers.get(name)!;
      handlers.push({ plugin: normalized, fn, priority });
      handlers.sort((a, b) => b.priority - a.priority);
    }
  }

  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;

    this.removePluginHooks(pluginName);
    this.plugins.delete(pluginName);

    console.log(`🔌 Unregistered plugin: ${pluginName}`);
    return true;
  }

  async executeHook<T extends HookContext>(
    hookName: HookName,
    context: T,
  ): Promise<T> {
    const handlers = this.hookHandlers.get(hookName) || [];
    let result = context;

    for (const { plugin, fn } of handlers) {
      try {
        const hookResult = await fn(result);
        if (hookResult !== undefined) {
          result = { ...result, ...hookResult } as T;
        }
      } catch (error) {
        console.error(
          `❌ Plugin ${plugin.name} hook ${hookName} failed:`,
          error,
        );
      }
    }

    return result;
  }

  async executeHookBatch<T extends HookContext>(
    hookNames: HookName[],
    context: T,
  ): Promise<T> {
    let result = context;

    for (const hookName of hookNames) {
      result = await this.executeHook(hookName, result);
    }

    return result;
  }

  hasHook(hookName: HookName): boolean {
    const handlers = this.hookHandlers.get(hookName);
    return handlers ? handlers.length > 0 : false;
  }

  getHookCount(hookName: HookName): number {
    const handlers = this.hookHandlers.get(hookName);
    return handlers ? handlers.length : 0;
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  listByHook(hookName: HookName): Plugin[] {
    const handlers = this.hookHandlers.get(hookName) || [];
    return handlers.map((h) => h.plugin);
  }

  async initialize(config: Config): Promise<void> {
    if (this.initialized) return;

    const initContext: PluginInitContext = {
      config,
      rigVersion: RIG_VERSION,
    };

    await this.executeHook("init", initContext);
    this.initialized = true;
  }

  async destroy(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        try {
          await plugin.destroy();
        } catch (error) {
          console.error(
            `❌ Plugin ${plugin.name} destroy failed:`,
            error,
          );
        }
      }
    }

    this.plugins.clear();
    for (const handlers of this.hookHandlers.values()) {
      handlers.length = 0;
    }
    this.initialized = false;
  }

  get count(): number {
    return this.plugins.size;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  private removePluginHooks(pluginName: string): void {
    for (const handlers of this.hookHandlers.values()) {
      for (let index = handlers.length - 1; index >= 0; index--) {
        if (handlers[index].plugin.name === pluginName) {
          handlers.splice(index, 1);
        }
      }
    }
  }
}

export const globalPluginManager: PluginManager = new PluginManager();

// Re-export types for use in other modules
export type {
  HookContext,
  PluginBuildContext,
  PluginRenderContext,
  PluginWatchContext,
};
