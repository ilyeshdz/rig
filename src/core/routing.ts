import type { Config } from "../types/index.ts";

export type RoutingStyle = "html" | "directory";

export interface ResolvedRoutingConfig {
  mode: "file";
  style: RoutingStyle;
}

export function resolveRouting(config: Config): ResolvedRoutingConfig {
  const style = config.routing?.style ?? "html";

  return {
    mode: "file",
    style: style === "directory" ? "directory" : "html",
  };
}

export function slugFromFilePath(filePath: string): string {
  const normalizedPath = filePath
    .replaceAll("\\", "/")
    .replace(/^\.?\//, "")
    .trim();

  const withoutExt = normalizedPath.replace(/\.[^/.]+$/, "");
  if (!withoutExt) return "index";

  const parts = withoutExt
    .split("/")
    .map((part) => slugifySegment(part))
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts.join("/") : "index";
}

export function getOutputPathForSlug(config: Config, slug: string): string {
  const normalizedSlug = normalizeSlug(slug);
  const routing = resolveRouting(config);

  if (routing.style === "directory") {
    if (normalizedSlug === "index" || normalizedSlug.endsWith("/index")) {
      return `${config.outputDir}/${normalizedSlug}.html`;
    }

    return `${config.outputDir}/${normalizedSlug}/index.html`;
  }

  return `${config.outputDir}/${normalizedSlug}.html`;
}

export function getPublicPathForSlug(config: Config, slug: string): string {
  const normalizedSlug = normalizeSlug(slug);
  const routing = resolveRouting(config);

  if (routing.style === "directory") {
    if (normalizedSlug === "index") return "/";
    if (normalizedSlug.endsWith("/index")) {
      const base = normalizedSlug
        .slice(0, normalizedSlug.length - "index".length)
        .replace(/\/+$/, "");
      return `/${base}/`;
    }

    return `/${normalizedSlug}/`;
  }

  return `/${normalizedSlug}.html`;
}

export function getPublicUrlForSlug(
  config: Config,
  baseUrl: string,
  slug: string,
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const publicPath = getPublicPathForSlug(config, slug);
  return `${normalizedBase}${publicPath}`;
}

function normalizeSlug(slug: string): string {
  const normalized = slug
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return normalized || "index";
}

function slugifySegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
