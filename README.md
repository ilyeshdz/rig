<div align="center">

# Rig

A static site generator for people who want simple content workflows, fast
builds, and an extensible plugin system.

[![Deno](https://img.shields.io/badge/Deno-fff?logo=deno)](https://deno.land)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

## What Rig Is

Rig is a Markdown-first static site generator built with Deno and TypeScript.

You write content in `.md`, use a layout template, and Rig generates static HTML
files in `dist/`.

It is intentionally small and explicit: easy to understand, easy to change, easy
to extend.

## Why You Might Use It

- You want a straightforward static generator without a lot of framework
  ceremony.
- You prefer TypeScript + Deno tooling.
- You want plugin hooks for things like feeds, sitemaps, pagination, and
  taxonomy pages.
- You care about fast local feedback while writing content.

## Core Features

- Markdown content with frontmatter support
- Lightweight template syntax (variables, conditionals, loops)
- Plugin lifecycle hooks
- Official plugins:
  - `sitemap` for `sitemap.xml`
  - `rss` for RSS feed generation
  - `pagination` for paginated collection pages
  - `taxonomy` for tags/categories pages
- Unit, integration, and benchmark coverage

## Quick Start

```bash
# Install dependencies (Deno)
curl -fsSL https://deno.land/install.sh | sh

# Run tests
deno task test

# Run all benchmarks
deno task bench
```

## Install The CLI

### Run without global install

```bash
deno run -A jsr:@hdzilyes/rig init
deno run -A jsr:@hdzilyes/rig build
deno run -A jsr:@hdzilyes/rig dev
```

### Install globally

```bash
deno install -gA --name rig jsr:@hdzilyes/rig
rig init
rig build
rig dev
```

## JSR Documentation

Rig is published on JSR as [`@hdzilyes/rig`](https://jsr.io/@hdzilyes/rig).

- Package page: `https://jsr.io/@hdzilyes/rig`
- API docs: `https://jsr.io/@hdzilyes/rig/doc`
- Source repository: `https://github.com/ilyeshdz/rig`

### JSR Usage Example

```bash
deno run -A jsr:@hdzilyes/rig@0.1.1 init
deno run -A jsr:@hdzilyes/rig@0.1.1 build
```

## Typical Project Layout

```txt
rig/
├── src/
│   ├── core/          # parser, builder, template engine, plugins, collections
│   ├── commands/      # CLI commands
│   └── plugins/       # official plugins
├── tests/
│   ├── unit/
│   ├── integration/
│   └── benchmarks/
├── playground/
├── deno.json
└── README.md
```

## Configuration

Configure Rig in `deno.json`:

```json
{
  "rig": {
    "contentDir": "content",
    "templateDir": "templates",
    "outputDir": "dist"
  }
}
```

## Template Syntax

### Variables

```html
<h1><%= title %></h1>
<p><%= description %></p>
```

### Conditionals

```html
<% if (showSidebar) %>
<aside>Sidebar content</aside>
<% endif %>
```

### Loops

```html
<ul>
  <% for (item in items) %>
  <li><%= item.name %></li>
  <% endfor %>
</ul>
```

## Performance In Real Use

Benchmarks are useful, but what matters is day-to-day behavior:

- While writing content, rebuilds are fast enough to keep your flow intact
  instead of waiting on tooling.
- For small and medium sites, full builds generally feel near-instant to very
  quick on modern laptops.
- As content volume grows, build time increases in a predictable way rather than
  exploding suddenly.
- Plugin hook overhead is low, so adding official plugins does not usually make
  builds feel heavy.

How to read this as a developer:

- Rig is optimized for fast iteration loops (edit -> build -> review).
- You can scale from a handful of pages to larger collections without needing
  architecture changes immediately.
- Benchmark numbers should be treated as directional signals, not hard
  guarantees for every machine/project.

## Testing and Benchmarks

```bash
# Test suite
deno task test

# All benchmarks
deno task bench

# Core parsing/rendering benchmarks
deno task bench:core

# Official plugin benchmarks
deno task bench:plugins

# Plugin manager internals
deno task bench:manager
```

## Documentation Site

Rig now includes a Docusaurus site in `docs/`.

```bash
cd docs
npm install
npm run start
```

This site includes guides for setup, configuration, templating, plugins,
incremental dev with HMR, testing, architecture, and contribution workflow.

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-change`)
3. Commit your changes (`git commit -m 'feat: add X'`)
4. Push to your branch
5. Open a pull request

## License

MIT License — see [LICENSE](LICENSE).
