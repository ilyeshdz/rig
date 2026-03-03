import { Config } from "../types/index.ts";

export interface Plugin {
  name: string;
  version: string;
  description: string;
  init?: (config: Config) => Promise<void>;
  beforeBuild?: (config: Config) => Promise<void>;
  afterBuild?: (config: Config, result: BuildResult) => Promise<void>;
  destroy?: () => Promise<void>;
}

export interface BuildResult {
  success: boolean;
  filesGenerated: number;
  duration: number;
  errors?: string[];
}

export interface PluginContext {
  config: Config;
  plugins: Plugin[];
  startTime: number;
}

export class PluginManager {
  private plugins: Plugin[] = [];

  register(plugin: Plugin): void {
    this.plugins.push(plugin);
    console.log(`🔌 Registered plugin: ${plugin.name} v${plugin.version}`);
  }

  unregister(pluginName: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== pluginName);
    console.log(`🔌 Unregistered plugin: ${pluginName}`);
  }

  async executeHook(
    hookName: keyof Omit<Plugin, "name" | "version" | "description">,
    ...args: unknown[]
  ): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin[hookName as keyof Plugin];
      if (typeof hook === "function") {
        try {
          await (hook as (...args: unknown[]) => Promise<void>)(...args);
        } catch (error) {
          console.error(
            `❌ Plugin ${plugin.name} ${String(hookName)} failed:`,
            error,
          );
        }
      }
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.find((p) => p.name === name);
  }

  listPlugins(): Plugin[] {
    return [...this.plugins];
  }
}
