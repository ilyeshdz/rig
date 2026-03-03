import { resolve, toFileUrl } from "@std/path";
import type {
  Config,
  PluginConfigEntry,
  PluginConfigObject,
} from "../types/index.ts";
import type { Plugin } from "./plugins.ts";
import { PluginManager, validatePlugin } from "./plugins.ts";
import { createPaginationPlugin } from "../plugins/pagination.ts";
import { createRssPlugin } from "../plugins/rss.ts";
import { createSitemapPlugin } from "../plugins/sitemap.ts";
import { createTaxonomyPlugin } from "../plugins/taxonomy.ts";

type PluginFactory = (options?: Record<string, unknown>) => Plugin;

const OFFICIAL_PLUGIN_FACTORIES: Record<string, PluginFactory> = {
  sitemap: (options) => createSitemapPlugin(options),
  rss: (options) => createRssPlugin(options),
  pagination: (options) => createPaginationPlugin(options),
  taxonomy: (options) => createTaxonomyPlugin(options),
};

export async function registerConfiguredPlugins(
  config: Config,
  pluginManager: PluginManager,
): Promise<void> {
  const plugins = await loadConfiguredPlugins(config);
  for (const plugin of plugins) {
    pluginManager.register(plugin);
  }
}

export async function loadConfiguredPlugins(config: Config): Promise<Plugin[]> {
  const configuredPlugins = config.plugins ?? [];
  const loaded: Plugin[] = [];

  for (let index = 0; index < configuredPlugins.length; index++) {
    const entry = configuredPlugins[index];
    loaded.push(await loadConfiguredPlugin(entry, index));
  }

  return loaded;
}

async function loadConfiguredPlugin(
  entry: PluginConfigEntry,
  index: number,
): Promise<Plugin> {
  if (typeof entry === "string") {
    return await loadPluginFromString(entry, index);
  }

  return await loadPluginFromObject(entry, index);
}

async function loadPluginFromString(
  specifier: string,
  index: number,
): Promise<Plugin> {
  const normalizedSpecifier = specifier.trim();
  const officialFactory = OFFICIAL_PLUGIN_FACTORIES[normalizedSpecifier];
  if (officialFactory) {
    return officialFactory({});
  }

  const resolvedSpecifier = resolvePluginSpecifier(normalizedSpecifier);
  const module = await import(resolvedSpecifier);
  return await pluginFromModule(module, { from: resolvedSpecifier }, index);
}

async function loadPluginFromObject(
  entry: PluginConfigObject,
  index: number,
): Promise<Plugin> {
  const specifier = entry.from;
  const name = entry.name;

  if (name && !specifier && OFFICIAL_PLUGIN_FACTORIES[name]) {
    return OFFICIAL_PLUGIN_FACTORIES[name](entry.options ?? {});
  }

  if (!specifier) {
    throw new Error(
      `Invalid plugin config at index ${index}: missing "from" (or official "name").`,
    );
  }

  const resolvedSpecifier = resolvePluginSpecifier(specifier);
  const module = await import(resolvedSpecifier);
  return await pluginFromModule(
    module,
    { ...entry, from: resolvedSpecifier },
    index,
  );
}

async function pluginFromModule(
  module: Record<string, unknown>,
  entry: PluginConfigObject,
  index: number,
): Promise<Plugin> {
  const exportName = entry.export;
  const factoryName = entry.factory;
  const options = entry.options;

  if (exportName) {
    const exportedValue = module[exportName];
    return await coercePlugin(exportedValue, options, index, entry.from);
  }

  if (factoryName) {
    const factoryValue = module[factoryName];
    return await coercePlugin(factoryValue, options, index, entry.from);
  }

  const candidates = [
    module.default,
    module.plugin,
    module.createPlugin,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined) {
      return await coercePlugin(candidate, options, index, entry.from);
    }
  }

  return await coercePlugin(module, options, index, entry.from);
}

async function coercePlugin(
  candidate: unknown,
  options: Record<string, unknown> | undefined,
  index: number,
  source?: string,
): Promise<Plugin> {
  let value = candidate;

  if (typeof value === "function") {
    value = options !== undefined
      ? await (value as (options: Record<string, unknown>) => unknown)(options)
      : await (value as () => unknown)();
  }

  if (!validatePlugin(value)) {
    const sourceLabel = source ? ` from "${source}"` : "";
    throw new Error(
      `Invalid plugin at index ${index}${sourceLabel}: expected a Rig plugin object.`,
    );
  }

  return value;
}

function resolvePluginSpecifier(specifier: string): string {
  if (
    specifier.startsWith("http://") ||
    specifier.startsWith("https://") ||
    specifier.startsWith("file://") ||
    specifier.startsWith("jsr:") ||
    specifier.startsWith("npm:")
  ) {
    return specifier;
  }

  return toFileUrl(resolve(Deno.cwd(), specifier)).href;
}
