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
