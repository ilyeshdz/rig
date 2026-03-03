<div align="center">

# Rig

**A fast, opinionated static site generator built with Deno.**

[![Deno](https://img.shields.io/badge/Deno-fff?logo=deno)](https://deno.land)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Test](https://img.shields.io/badge/tests-14%20passed-brightgreen)](#testing)

</div>

---

## Why Rig?

Rig is a modern static site generator that prioritizes **speed**, **simplicity**, and **developer experience**. Built from the ground up with Deno, it brings native TypeScript support, modern tooling, and excellent performance out of the box.

### Key Features

- 🚀 **Blazing Fast** — Sub-millisecond template rendering with optimized build pipeline
- 📝 **Markdown First** — Write content in Markdown with full frontmatter support
- 🎨 **Custom Template Engine** — Simple yet powerful templating with conditionals and loops
- 🔌 **Plugin System** — Extensible architecture with lifecycle hooks
- 📁 **Modular Architecture** — Clean, maintainable codebase
- 🧪 **Full Test Suite** — Unit, integration, and benchmark tests included

---

## Quick Start

```bash
# Install Deno (if you haven't)
curl -fsSL https://deno.land/install.sh | sh

# Run the development server
deno run --watch src/main.ts

# Or use the CLI after installation
rig init my-site
cd my-site
rig dev
```

---

## Project Structure

```
rig/
├── src/
│   ├── main.ts              # CLI entry point
│   ├── types/               # TypeScript type definitions
│   ├── core/                # Core functionality
│   │   ├── builder.ts       # Build & watch engine
│   │   ├── config.ts        # Configuration management
│   │   ├── parser.ts        # Markdown & frontmatter parser
│   │   ├── template.ts      # Template rendering engine
│   │   ├── errors.ts        # Custom error classes
│   │   ├── plugins.ts       # Plugin system
│   │   └── validation.ts    # Config validation
│   └── commands/             # CLI commands
│       ├── build.ts         # Build & dev commands
│       └── init.ts          # Project initialization
├── tests/                    # Test suite
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── benchmarks/          # Performance benchmarks
├── playground/              # Example project
│   ├── content/             # Sample markdown content
│   └── templates/           # Sample templates
├── deno.json               # Deno configuration
└── README.md
```

---

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

### CLI Options

```bash
rig build           # Build for production
rig build --verbose # Verbose output
rig dev             # Development mode with hot reload
rig dev --port 3000 # Custom port
rig dev --open      # Auto-open browser
```

---

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

---

## Performance

Rig is designed for speed:

| Site Size | Files | Avg Time/File | Throughput |
|-----------|-------|---------------|------------|
| Small     | 10    | ~2.5ms        | 400/sec    |
| Medium    | 100   | ~3.2ms        | 312/sec    |
| Large     | 1000  | ~4.1ms        | 244/sec    |

---

## Testing

```bash
# Run all tests
deno test tests/ --allow-read --allow-write --allow-env

# Run benchmarks
deno bench tests/benchmarks/deno-native.test.ts
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ using Deno**

</div>
