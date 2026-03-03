import { Command } from "@cliffy/command";
import { buildCommand, devCommand } from "./build.ts";
import { initCommand } from "./init.ts";

const VERSION = "0.1.1";

export const rigCommand = new Command()
  .name("rig")
  .description("🚀 A fast and opinionated static site generator for Deno")
  .version(VERSION)
  .example("Initialize a new site", "rig init")
  .example("Build the site", "rig build")
  .example("Start development mode", "rig dev")
  .example("Build with verbose output", "rig build --verbose");

// Add subcommands
rigCommand
  .command("init", initCommand)
  .command("build", buildCommand)
  .command("dev", devCommand);

export default rigCommand;
