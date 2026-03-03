#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-run

// Rig: A fast and opinionated static site generator for Deno

import rigCommand from "./commands/index.ts";

if (import.meta.main) {
  await rigCommand.parse(Deno.args);
}
