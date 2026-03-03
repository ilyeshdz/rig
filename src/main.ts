#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-run

/**
 * Rig CLI entrypoint.
 *
 * Use this module to run Rig from Deno or from a JSR install:
 *
 * ```bash
 * deno install -gA --name rig jsr:@hdzilyes/rig
 * rig init
 * ```
 */

import rigCommand from "./commands/index.ts";

if (import.meta.main) {
  await rigCommand.parse(Deno.args);
}
