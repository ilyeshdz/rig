import { assertEquals } from "@std/assert";
import { buildUpdateInstallArgs } from "../../src/commands/update.ts";

Deno.test("buildUpdateInstallArgs - defaults to latest package", () => {
  const args = buildUpdateInstallArgs({ name: "rig" });

  assertEquals(args, [
    "install",
    "-gA",
    "--force",
    "--name",
    "rig",
    "jsr:@hdzilyes/rig",
  ]);
});

Deno.test("buildUpdateInstallArgs - supports specific version", () => {
  const args = buildUpdateInstallArgs({
    name: "rig",
    version: "0.2.1",
  });

  assertEquals(args, [
    "install",
    "-gA",
    "--force",
    "--name",
    "rig",
    "jsr:@hdzilyes/rig@0.2.1",
  ]);
});

Deno.test("buildUpdateInstallArgs - treats latest as default", () => {
  const args = buildUpdateInstallArgs({
    name: "rig",
    version: "latest",
  });

  assertEquals(args, [
    "install",
    "-gA",
    "--force",
    "--name",
    "rig",
    "jsr:@hdzilyes/rig",
  ]);
});
