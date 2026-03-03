#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { runAllBenchmarks } from "./benchmarks/performance_bench.ts";

console.log("🧪 Running Rig Test Suite\n");

console.log("1️⃣  Running unit tests...");
const unitTestCmd = new Deno.Command("deno", {
  args: ["test", "unit/", "--allow-read", "--allow-write", "--allow-env"],
  stdout: "piped",
  stderr: "piped",
});
const unitTestOutput = await unitTestCmd.output();
const unitTestCode = unitTestOutput.code;

console.log(`\n✅ Unit tests completed with exit code: ${unitTestCode}`);

console.log("2️⃣  Running integration tests...");
const integrationTestCmd = new Deno.Command("deno", {
  args: [
    "test",
    "integration/",
    "--allow-read",
    "--allow-write",
    "--allow-env",
  ],
  stdout: "piped",
  stderr: "piped",
});
const integrationTestOutput = await integrationTestCmd.output();
const integrationTestCode = integrationTestOutput.code;

console.log(
  `\n✅ Integration tests completed with exit code: ${integrationTestCode}`,
);

console.log("3️⃣  Running performance benchmarks...");
await runAllBenchmarks();

console.log("\n🎉 All tests completed!");

if (unitTestCode !== 0 || integrationTestCode !== 0) {
  console.log("\n❌ Some tests failed!");
  Deno.exit(1);
} else {
  console.log("\n✅ All tests passed!");
}
