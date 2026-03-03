export interface Config {
  contentDir: string;
  templateDir: string;
  outputDir: string;
}

export interface FrontMatter {
  title?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface ContentFile {
  frontMatter: FrontMatter;
  content: string;
  slug: string;
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
