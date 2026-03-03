import { assertEquals } from "@std/assert";

// Test data for benchmarking
const TEST_CONTENT_SMALL = `---
title: "Test Page 1"
---

# Content 1

Lorem ipsum dolor sit amet.`;

const TEST_CONTENT_MEDIUM = `---
title: "Test Page 2"
---

# Content 2

Sed do eiusmod tempor incididunt ut labore.`;

const TEST_CONTENT_LARGE = `---
title: "Test Page 3"
---

# Content 3

Ut enim ad minim veniam, quis nostrud exercitation ullamco.`;

// Template for benchmarking
const TEST_TEMPLATE = `<!DOCTYPE html>
<html>
<head><title><%= title %></title></head>
<body><main><%= content %></main></body>
</html>`;

// Benchmark configuration
interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupIterations: number;
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

// Create test environment
async function createBenchmarkEnv(): Promise<{
  contentDir: string;
  templateDir: string;
  outputDir: string;
  cleanup: () => Promise<void>;
}> {
  const testDir = Deno.makeTempDirSync();
  const contentDir = `${testDir}/content`;
  const templateDir = `${testDir}/templates`;
  const outputDir = `${testDir}/dist`;

  await Deno.mkdir(contentDir);
  await Deno.mkdir(templateDir);
  await Deno.mkdir(outputDir);
  
  await Deno.writeTextFile(`${templateDir}/layout.html`, TEST_TEMPLATE);
  
  return {
    contentDir,
    templateDir,
    outputDir,
    cleanup: async () => {
      await Deno.remove(testDir, { recursive: true });
    }
  };
}

// Create test files
async function createTestFiles(contentDir: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await Deno.writeTextFile(`${contentDir}/test-${i + 1}.md`, 
      i === 0 ? TEST_CONTENT_SMALL : 
      i === 1 ? TEST_CONTENT_MEDIUM : 
      TEST_CONTENT_LARGE
    );
  }
}

// Simple markdown parser for benchmarking
function simpleMarkdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// Simple template renderer for benchmarking
function simpleRenderTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`<%= ${key} %>`, 'g'), value);
  }
  return result;
}

// Benchmark functions
export async function benchmarkMarkdownParsing(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log(`🏃 Benchmark: ${config.name} - Markdown Parsing`);
  
  const env = await createBenchmarkEnv();
  try {
    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      simpleMarkdownToHtml(TEST_CONTENT_MEDIUM);
    }
    
    // Main benchmark
    const start = performance.now();
    for (let i = 0; i < config.iterations; i++) {
      simpleMarkdownToHtml(TEST_CONTENT_MEDIUM);
    }
    const end = performance.now();
    
    const totalTime = end - start;
    const avgTime = totalTime / config.iterations;
    const throughput = config.iterations / (totalTime / 1000);
    
    return {
      name: config.name,
      iterations: config.iterations,
      totalTime,
      avgTime,
      minTime: avgTime, // Simplified for demo
      maxTime: avgTime, // Simplified for demo
      throughput
    };
  } finally {
    await env.cleanup();
  }
}

export async function benchmarkTemplateRendering(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log(`🎨 Benchmark: ${config.name} - Template Rendering`);
  
  const env = await createBenchmarkEnv();
  try {
    const data = { title: "Test Title", content: "Test Content" };
    
    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      simpleRenderTemplate(TEST_TEMPLATE, data);
    }
    
    // Main benchmark
    const start = performance.now();
    for (let i = 0; i < config.iterations; i++) {
      simpleRenderTemplate(TEST_TEMPLATE, data);
    }
    const end = performance.now();
    
    const totalTime = end - start;
    const avgTime = totalTime / config.iterations;
    const throughput = config.iterations / (totalTime / 1000);
    
    return {
      name: config.name,
      iterations: config.iterations,
      totalTime,
      avgTime,
      minTime: avgTime, // Simplified for demo
      maxTime: avgTime, // Simplified for demo
      throughput
    };
  } finally {
    await env.cleanup();
  }
}

export async function benchmarkFullBuild(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log(`🔨 Benchmark: ${config.name} - Full Build Process`);
  
  const env = await createBenchmarkEnv();
  try {
    await createTestFiles(env.contentDir, 10);
    
    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      // Simulate build process
      const files = Array.from({ length: 10 }, (_, i) => ({
        frontMatter: { title: `Test ${i + 1}` },
        content: TEST_CONTENT_SMALL,
        slug: `test-${i + 1}`
      }));
      
      for (const file of files) {
        simpleMarkdownToHtml(file.content);
        simpleRenderTemplate(TEST_TEMPLATE, {
          title: file.frontMatter.title,
          content: simpleMarkdownToHtml(file.content)
        });
      }
    }
    
    // Main benchmark
    const start = performance.now();
    for (let i = 0; i < config.iterations; i++) {
      // Simulate full build process
      const files = Array.from({ length: 10 }, (_, i) => ({
        frontMatter: { title: `Test ${i + 1}` },
        content: TEST_CONTENT_SMALL,
        slug: `test-${i + 1}`
      }));
      
      for (const file of files) {
        simpleMarkdownToHtml(file.content);
        simpleRenderTemplate(TEST_TEMPLATE, {
          title: file.frontMatter.title,
          content: simpleMarkdownToHtml(file.content)
        });
      }
    }
    const end = performance.now();
    
    const totalTime = end - start;
    const avgTime = totalTime / config.iterations;
    const throughput = (config.iterations * 10) / (totalTime / 1000);
    
    return {
      name: config.name,
      iterations: config.iterations,
      totalTime,
      avgTime,
      minTime: avgTime, // Simplified for demo
      maxTime: avgTime, // Simplified for demo
      throughput
    };
  } finally {
    await env.cleanup();
  }
}

// Run all benchmarks using Deno.bench
Deno.bench("Markdown Parsing", async (b) => {
  b.start();
  for (let i = 0; i < 1000; i++) {
    simpleMarkdownToHtml(TEST_CONTENT_MEDIUM);
  }
  b.end();
});

Deno.bench("Template Rendering", async (b) => {
  const data = { title: "Test Title", content: "Test Content" };
  b.start();
  for (let i = 0; i < 1000; i++) {
    simpleRenderTemplate(TEST_TEMPLATE, data);
  }
  b.end();
});

Deno.bench("Full Build Process", async (b) => {
  const testFiles = Array.from({ length: 10 }, (_, i) => ({
    frontMatter: { title: `Test ${i + 1}` },
    content: TEST_CONTENT_SMALL,
    slug: `test-${i + 1}`
  }));
  
  b.start();
  for (let i = 0; i < 100; i++) {
    for (const file of testFiles) {
      simpleMarkdownToHtml(file.content);
      simpleRenderTemplate(TEST_TEMPLATE, {
        title: file.frontMatter.title,
        content: simpleMarkdownToHtml(file.content)
      });
    }
  }
  b.end();
});

export async function runBenchmarks() {
  console.log("Run benchmarks using: deno bench tests/benchmarks/");
}
