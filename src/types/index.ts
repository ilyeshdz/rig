export interface Config {
  contentDir: string;
  templateDir: string;
  outputDir: string;
  collections?: Record<string, CollectionConfig>;
  routing?: RoutingConfig;
  plugins?: PluginConfigEntry[];
}

export interface RoutingConfig {
  mode?: "file";
  style?: "html" | "directory";
}

export type PluginConfigEntry = string | PluginConfigObject;

export interface PluginConfigObject {
  name?: string;
  from?: string;
  export?: string;
  factory?: string;
  options?: Record<string, unknown>;
}

export interface CollectionConfig {
  name: string;
  directory?: string;
  template?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  paginate?: boolean;
  perPage?: number;
  outputPath?: string;
  excludeDrafts?: boolean;
}

export interface Collection {
  name: string;
  config: CollectionConfig;
  files: ContentFile[];
  totalPages?: number;
}

export interface PaginatedContent {
  files: ContentFile[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPagePath?: string;
  prevPagePath?: string;
}

export interface TaxonomyTerm {
  name: string;
  slug: string;
  count: number;
  files: ContentFile[];
}

export interface Taxonomy {
  name: string;
  terms: TaxonomyTerm[];
}

export interface FrontMatter {
  title?: string;
  date?: string;
  collection?: string;
  draft?: boolean | string;
  tags?: string | string[];
  category?: string;
  priority?: number;
  changefreq?: string;
  description?: string;
  author?: string;
  rss?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface ContentFile {
  frontMatter: FrontMatter;
  content: string;
  slug: string;
  collection?: string;
  filePath: string;
}

export interface BuildOptions {
  config: Config;
  verbose?: boolean;
  clean?: boolean;
}

export interface InitOptions {
  config?: Partial<Config>;
  force?: boolean;
}

export interface DevOptions {
  config: Config;
  port?: number;
  open?: boolean;
}

export interface BuildResult {
  success: boolean;
  filesGenerated: number;
  duration: number;
  errors?: string[];
  outputDir: string;
  contentDir: string;
}

export interface ParseResult {
  file: ContentFile;
  html?: string;
  error?: Error;
}

export interface RenderResult {
  slug: string;
  html: string;
  frontMatter: FrontMatter;
  duration: number;
}

export interface FileEvent {
  path: string;
  kind: "create" | "modify" | "remove" | "rename";
  isDirectory: boolean;
}

export interface WatchEvent {
  type: "add" | "change" | "unlink";
  path: string;
  content?: string;
}

export interface DevServerUpdate {
  type: "full-reload" | "page-update" | "asset-update";
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface HookContext {
  config: Config;
  buildResult?: BuildResult;
  timestamp?: number;
  duration?: number;
}

export interface PluginInitContext {
  config: Config;
  rigVersion: string;
}

export interface PluginBuildContext extends HookContext {
  files: ContentFile[];
  outputDir: string;
}

export interface PluginRenderContext extends HookContext {
  file: ContentFile;
  html: string;
}

export interface PluginWatchContext extends HookContext {
  event: WatchEvent;
}
