import type { Plugin, PluginBuildContext } from "../../src/core/plugins.ts";
import type { BuildResult } from "../../src/types/index.ts";

interface PlaygroundPluginOptions {
  markerFile?: string;
}

export function createPlugin(options: PlaygroundPluginOptions = {}): Plugin {
  const markerFile = options.markerFile ?? "plugin-marker.txt";

  return {
    name: "playground-plugin",
    version: "1.0.0",
    description: "Playground verification plugin",
    async afterBuild(context: PluginBuildContext & { result: BuildResult }) {
      if (!context.result.success) return;
      await Deno.writeTextFile(
        `${context.outputDir}/${markerFile}`,
        "playground plugin executed",
      );
    },
  };
}

export default createPlugin;
