import { Builder } from "../../src/core/builder.ts";
import { loadConfig } from "../../src/core/config.ts";

interface BenchmarkResult {
  operation: string;
  duration: number;
  memoryUsage?: Deno.MemoryUsage;
}

async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const memBefore = Deno.memoryUsage();

  const result = await fn();

  const end = performance.now();
  const memAfter = Deno.memoryUsage();

  return {
    result,
    duration: end - start,
  };
}

async function createTestEnvironment(): Promise<{
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

  // Create template
  const template = `<!DOCTYPE html>
<html><head><title><%= title %></title></head>
<body><main><%= content %></main></body>
</html>`;
  await Deno.writeTextFile(`${templateDir}/layout.html`, template);

  return {
    contentDir,
    templateDir,
    outputDir,
    cleanup: async () => {
      await Deno.remove(testDir, { recursive: true });
    },
  };
}

async function createTestFiles(
  contentDir: string,
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i++) {
    const content = `---
title: "Test Page ${i + 1}"
---

# Content ${i + 1}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Features

- Feature ${i + 1}.1
- Feature ${i + 1}.2
- Feature ${i + 1}.3

\`\`\`typescript
console.log('Hello ${i + 1}');
\`\`\`

## Links

[Link ${i + 1}](https://example.com/${i + 1})
[Link ${i + 1}](https://example.com/${i + 1})
`;
    await Deno.writeTextFile(`${contentDir}/test-${i + 1}.md`, content);
  }
}

// Benchmark 1: Small site build
export async function benchmarkSmallSite(): Promise<BenchmarkResult> {
  console.log("🏃 Benchmark: Small site (10 files)...");

  const env = await createTestEnvironment();
  try {
    await createTestFiles(env.contentDir, 10);

    const config = {
      contentDir: env.contentDir,
      templateDir: env.templateDir,
      outputDir: env.outputDir,
    };
    const builder = new Builder(config);

    const { duration } = await measurePerformance(
      "build",
      () => builder.build({ config, clean: true, verbose: false }),
    );

    return { operation: "Small site build (10 files)", duration };
  } finally {
    await env.cleanup();
  }
}

// Benchmark 2: Medium site build
export async function benchmarkMediumSite(): Promise<BenchmarkResult> {
  console.log("🏃 Benchmark: Medium site (100 files)...");

  const env = await createTestEnvironment();
  try {
    await createTestFiles(env.contentDir, 100);

    const config = {
      contentDir: env.contentDir,
      templateDir: env.templateDir,
      outputDir: env.outputDir,
    };
    const builder = new Builder(config);

    const { duration } = await measurePerformance(
      "build",
      () => builder.build({ config, clean: true, verbose: false }),
    );

    return { operation: "Medium site build (100 files)", duration };
  } finally {
    await env.cleanup();
  }
}

// Benchmark 3: Large site build
export async function benchmarkLargeSite(): Promise<BenchmarkResult> {
  console.log("🏃 Benchmark: Large site (1000 files)...");

  const env = await createTestEnvironment();
  try {
    await createTestFiles(env.contentDir, 1000);

    const config = {
      contentDir: env.contentDir,
      templateDir: env.templateDir,
      outputDir: env.outputDir,
    };
    const builder = new Builder(config);

    const { duration } = await measurePerformance(
      "build",
      () => builder.build({ config, clean: true, verbose: false }),
    );

    return { operation: "Large site build (1000 files)", duration };
  } finally {
    await env.cleanup();
  }
}

// Run all benchmarks
export async function runAllBenchmarks(): Promise<void> {
  console.log("🚀 Starting Rig performance benchmarks...\n");

  const results: BenchmarkResult[] = [];

  results.push(await benchmarkSmallSite());
  results.push(await benchmarkMediumSite());
  results.push(await benchmarkLargeSite());

  console.log("\n📊 Benchmark Results:");
  console.log("=".repeat(50));

  results.forEach((result) => {
    const files = result.operation.match(/\((\d+) files\)/)?.[1] || "unknown";
    console.log(
      `${result.operation.padEnd(35)} | ${result.duration.toFixed(2)}ms | ${
        (parseInt(files) / (result.duration / 1000)).toFixed(2)
      } files/sec`,
    );
  });

  console.log("=".repeat(50));

  // Performance analysis
  const smallPerFile = results[0].duration / 10;
  const mediumPerFile = results[1].duration / 100;
  const largePerFile = results[2].duration / 1000;

  console.log("\n📈 Performance Analysis:");
  console.log(
    `Average time per file: ${
      ((smallPerFile + mediumPerFile + largePerFile) / 3).toFixed(2)
    }ms`,
  );
  console.log(
    `Scalability: ${
      largePerFile > smallPerFile * 2
        ? "❌ Poor"
        : largePerFile > smallPerFile * 1.5
        ? "⚠️  Needs improvement"
        : "✅ Good"
    }`,
  );
}

async function withMutedConsole<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

Deno.bench({
  name: "Builder - small site build (10 files)",
  permissions: { read: true, write: true },
}, async (b) => {
  await withMutedConsole(async () => {
    b.start();
    await benchmarkSmallSite();
    b.end();
  });
});

Deno.bench({
  name: "Builder - medium site build (100 files)",
  permissions: { read: true, write: true },
}, async (b) => {
  await withMutedConsole(async () => {
    b.start();
    await benchmarkMediumSite();
    b.end();
  });
});
