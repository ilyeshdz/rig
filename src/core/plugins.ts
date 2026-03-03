import {
  Config,
  BuildResult,
  PluginInitContext,
  PluginBuildContext,
  PluginRenderContext,
  PluginWatchContext,
  HookContext,
  ContentFile,
  FrontMatter,
} from "../types/index.ts";

export const RIG_VERSION = "0.1.0";

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
  context: T
) => Promise<void> | void;

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
  afterBuild?: (context: PluginBuildContext & { result: BuildResult }) => Promise<void> | void;
  
  beforeParse?: (context: HookContext & { content: string; filePath: string }) => Promise<{ content: string } | void> | void;
  afterParse?: (context: HookContext & { file: ContentFile }) => Promise<{ file: ContentFile } | void> | void;
  
  beforeRender?: (context: PluginRenderContext) => Promise<{ html: string } | void> | void;
  afterRender?: (context: PluginRenderContext) => Promise<void> | void;
  
  beforeWrite?: (context: HookContext & { slug: string; html: string; outputPath: string }) => Promise<{ html?: string; outputPath?: string } | void> | void;
  afterWrite?: (context: HookContext & { slug: string; html: string; outputPath: string }) => Promise<void> | void;
  
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
  code?: string
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
  manifest: PluginManifest
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
    init: typeof hooks.init === "function" ? hooks.init as Plugin["init"] : undefined,
    beforeBuild: typeof hooks.beforeBuild === "function" ? hooks.beforeBuild as Plugin["beforeBuild"] : undefined,
    afterBuild: typeof hooks.afterBuild === "function" ? hooks.afterBuild as Plugin["afterBuild"] : undefined,
    beforeParse: typeof hooks.beforeParse === "function" ? hooks.beforeParse as Plugin["beforeParse"] : undefined,
    afterParse: typeof hooks.afterParse === "function" ? hooks.afterParse as Plugin["afterParse"] : undefined,
    beforeRender: typeof hooks.beforeRender === "function" ? hooks.beforeRender as Plugin["beforeRender"] : undefined,
    afterRender: typeof hooks.afterRender === "function" ? hooks.afterRender as Plugin["afterRender"] : undefined,
    beforeWrite: typeof hooks.beforeWrite === "function" ? hooks.beforeWrite as Plugin["beforeWrite"] : undefined,
    afterWrite: typeof hooks.afterWrite === "function" ? hooks.afterWrite as Plugin["afterWrite"] : undefined,
    onWatch: typeof hooks.onWatch === "function" ? hooks.onWatch as Plugin["onWatch"] : undefined,
    beforeServe: typeof hooks.beforeServe === "function" ? hooks.beforeServe as Plugin["beforeServe"] : undefined,
    afterServe: typeof hooks.afterServe === "function" ? hooks.afterServe as Plugin["afterServe"] : undefined,
    destroy: typeof hooks.destroy === "function" ? hooks.destroy as Plugin["destroy"] : undefined,
  };
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hookHandlers: Map<HookName, Array<{ plugin: Plugin; fn: Function; priority: number }>> = new Map();
  private initialized = false;
  
  constructor() {
    HOOK_NAMES.forEach((hook) => this.hookHandlers.set(hook, []));
  }
  
  register(plugin: Plugin | PluginManifest): void {
    const normalized = validatePlugin(plugin) 
      ? plugin as Plugin 
      : normalizePlugin(plugin as PluginManifest);
    
    this.plugins.set(normalized.name, normalized);
    
    const hooks: Array<{ name: HookName; fn: Function; priority: number }> = [];
    
    if (normalized.register) hooks.push({ name: "register", fn: normalized.register, priority: 100 });
    if (normalized.init) hooks.push({ name: "init", fn: normalized.init, priority: 100 });
    if (normalized.beforeBuild) hooks.push({ name: "beforeBuild", fn: normalized.beforeBuild, priority: 50 });
    if (normalized.afterBuild) hooks.push({ name: "afterBuild", fn: normalized.afterBuild, priority: -50 });
    if (normalized.beforeParse) hooks.push({ name: "beforeParse", fn: normalized.beforeParse, priority: 50 });
    if (normalized.afterParse) hooks.push({ name: "afterParse", fn: normalized.afterParse, priority: -50 });
    if (normalized.beforeRender) hooks.push({ name: "beforeRender", fn: normalized.beforeRender, priority: 50 });
    if (normalized.afterRender) hooks.push({ name: "afterRender", fn: normalized.afterRender, priority: -50 });
    if (normalized.beforeWrite) hooks.push({ name: "beforeWrite", fn: normalized.beforeWrite, priority: 50 });
    if (normalized.afterWrite) hooks.push({ name: "afterWrite", fn: normalized.afterWrite, priority: -50 });
    if (normalized.onWatch) hooks.push({ name: "onWatch", fn: normalized.onWatch, priority: 0 });
    if (normalized.beforeServe) hooks.push({ name: "beforeServe", fn: normalized.beforeServe, priority: 50 });
    if (normalized.afterServe) hooks.push({ name: "afterServe", fn: normalized.afterServe, priority: -50 });
    if (normalized.destroy) hooks.push({ name: "destroy", fn: normalized.destroy, priority: 0 });
    
    for (const { name, fn, priority } of hooks) {
      const handlers = this.hookHandlers.get(name)!;
      handlers.push({ plugin: normalized, fn, priority });
      handlers.sort((a, b) => b.priority - a.priority);
    }
  }

  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;
    
    this.plugins.delete(pluginName);
    
    for (const [hookName, handlers] of this.hookHandlers) {
      const index = handlers.findIndex((h) => h.plugin.name === pluginName);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    
    console.log(`🔌 Unregistered plugin: ${pluginName}`);
    return true;
  }
  
  async executeHook<T extends HookContext>(
    hookName: HookName,
    context: T
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
          error
        );
      }
    }
    
    return result;
  }
  
  async executeHookBatch<T extends HookContext>(
    hookNames: HookName[],
    context: T
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
            error
          );
        }
      }
    }
    
    this.plugins.clear();
    this.initialized = false;
  }
  
  get count(): number {
    return this.plugins.size;
  }
  
  get isInitialized(): boolean {
    return this.initialized;
  }
}

export const globalPluginManager = new PluginManager();
