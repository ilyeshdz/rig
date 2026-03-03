# Rig

Rig is a fast, Markdown-first static site generator for Deno.

It is designed for CLI workflows: write content, run one command, ship static
HTML.

## Why Rig

- Minimal setup and explicit behavior.
- File-based routing by default (route comes from file path, not metadata).
- `rig.toml` configuration with plugin loading from official names, local files,
  URLs, `jsr:`, and `npm:` specifiers.
- Good developer feedback loop in build and dev modes.
- Extensible plugin lifecycle without framework lock-in.

## Core Idea

Rig keeps content simple:

1. You write Markdown files in `content/`.
2. Rig parses frontmatter + Markdown.
3. A layout template renders the final page.
4. Plugins hook into parse/render/build phases.
5. Static files are emitted to `dist/`.

The goal is predictable static generation with low cognitive overhead.

## Installation

### Run directly

```bash
deno run -A jsr:@hdzilyes/rig init
deno run -A jsr:@hdzilyes/rig build
deno run -A jsr:@hdzilyes/rig dev
```

### Install globally

```bash
deno install -gA --name rig jsr:@hdzilyes/rig
rig init
```

## CLI Commands

```bash
rig init
rig build
rig dev
rig update
```

Useful flags:

```bash
rig build --verbose --no-clean
rig dev --port 8000 --host localhost --open
rig update
rig update --version 0.2.1
rig update --dry-run
```

## Updating Rig

If Rig is installed globally, update it with:

```bash
rig update
```

Install a specific version:

```bash
rig update --version 0.2.1
```

## Configuration (`rig.toml`)

```toml
contentDir = "content"
templateDir = "templates"
outputDir = "dist"

plugins = [
  "sitemap",
  { name = "rss", options = { title = "Rig Blog", baseUrl = "https://example.com" } },
  { from = "./plugins/my-plugin.ts" },
  { from = "https://example.com/remote-plugin.ts", export = "default" },
  { from = "jsr:@scope/rig-plugin" },
  { from = "npm:my-rig-plugin" }
]

[routing]
mode = "file"
style = "html" # "html" => post.html, "directory" => post/index.html
```

Rig reads `rig.toml` first, then falls back to `deno.json` (`rig` key) for
backward compatibility.

## File-Based Routing

Route generation is based on content file path:

- `content/index.md` -> `dist/index.html`
- `content/blog/hello-world.md` -> `dist/blog/hello-world.html`

With `style = "directory"`:

- `content/blog/hello-world.md` -> `dist/blog/hello-world/index.html`

Frontmatter `title` is used for rendering, not route naming.

## Template Syntax

Variables:

```html
<h1><%= title %></h1>
<p><%= description %></p>
```

Conditionals:

```html
<% if (date) %>
<p><%= date %></p>
<% endif %>
```

Loops:

```html
<ul>
  <% for (item in items) %>
  <li><%= item.name %></li>
  <% endfor %>
</ul>
```

## Official Plugins

- `sitemap`
- `rss`
- `pagination`
- `taxonomy`

## Benchmarks

The following results were measured locally on **March 3, 2026**, using:

- **CPU:** Apple M2
- **Runtime:** Deno 2.6.8 (`aarch64-apple-darwin`)

### Core Benchmarks (`deno task bench:core`)

| Benchmark                               | Avg time | Iter/s |
| --------------------------------------- | -------: | -----: |
| Markdown Parsing                        | 955.8 µs |  1,046 |
| Template Rendering                      | 587.7 µs |  1,701 |
| Full Build Process                      |   3.0 ms |  338.2 |
| Builder - small site build (10 files)   |   4.9 ms |  203.1 |
| Builder - medium site build (100 files) |  38.5 ms |   26.0 |

### Plugin Manager Benchmarks (`deno task bench:manager`)

| Benchmark                                   | Avg time |  Iter/s |
| ------------------------------------------- | -------: | ------: |
| PluginManager - create instance             | 258.6 µs |   3,867 |
| PluginManager - executeHook with no plugins |  63.6 µs |  15,730 |
| PluginManager - executeHook with 10 plugins | 145.7 µs |   6,864 |
| PluginManager - getPlugin lookup            |   3.2 µs | 314,800 |

These numbers are directional and machine-dependent, but they show that Rig is
optimized for fast local iteration and low plugin overhead.

## Development

Run tests:

```bash
deno task test
```

Run benchmarks:

```bash
deno task bench
deno task bench:core
deno task bench:manager
```

## Project Structure

```txt
src/
  commands/     CLI commands
  core/         parser, builder, config, server, plugin system
  plugins/      official plugins
tests/
  unit/
  integration/
  benchmarks/
playground/     real-world local test bed
```

## License

MIT - see `LICENSE`.
