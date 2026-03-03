import { Command } from "@cliffy/command";

const PACKAGE_SPEC = "jsr:@hdzilyes/rig";

export interface UpdateInstallOptions {
  name: string;
  version?: string;
}

export function buildUpdateInstallArgs(
  options: UpdateInstallOptions,
): string[] {
  const version = options.version?.trim();
  const versionSuffix = version && version !== "latest" ? `@${version}` : "";
  const packageTarget = `${PACKAGE_SPEC}${versionSuffix}`;

  return [
    "install",
    "-gA",
    "--force",
    "--name",
    options.name,
    packageTarget,
  ];
}

export const updateCommand = new Command()
  .name("update")
  .description("Update Rig globally using Deno install")
  .option(
    "-V, --version <version:string>",
    "Specific Rig version (default: latest)",
  )
  .option("--name <name:string>", "Binary name to update", {
    default: "rig",
  })
  .option("--dry-run", "Print update command without executing")
  .action(async (options) => {
    try {
      const args = buildUpdateInstallArgs({
        name: options.name,
        version: options.version,
      });
      const commandPreview = `${Deno.execPath()} ${args.join(" ")}`;

      if (options.dryRun) {
        console.log(commandPreview);
        return;
      }

      console.log("⬆️ Updating Rig...");
      console.log(`$ ${commandPreview}`);

      const process = new Deno.Command(Deno.execPath(), {
        args,
        stdout: "inherit",
        stderr: "inherit",
      }).spawn();

      const status = await process.status;
      if (!status.success) {
        console.error("❌ Update failed.");
        Deno.exit(status.code || 1);
      }

      console.log("✅ Rig updated successfully.");
      console.log("Run `rig --version` to verify the installed version.");
    } catch (error) {
      console.error(
        "❌ Update failed:",
        error instanceof Error ? error.message : String(error),
      );
      Deno.exit(1);
    }
  });
