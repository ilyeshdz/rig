import { assertEquals, assertStringIncludes } from "@std/assert";
import { startServer } from "../../src/core/server.ts";
import type { DevServerUpdate } from "../../src/types/index.ts";
import { createTestSite } from "../helpers/test_utils.ts";

function getFreePort(): number {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const addr = listener.addr as Deno.NetAddr;
  const { port } = addr;
  listener.close();
  return port;
}

Deno.test("Dev server injects HMR client and broadcasts updates", async () => {
  const site = await createTestSite();
  const port = getFreePort();

  await Deno.writeTextFile(
    `${site.outputDir}/index.html`,
    "<html><head><title>Home</title></head><body><main>Hello</main></body></html>",
  );

  const server = await startServer(site.config, {
    port,
    host: "127.0.0.1",
    open: false,
  });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();

    assertStringIncludes(html, "window.__RIG_HMR__");
    assertStringIncludes(html, "/__rig_hmr");

    const socket = new WebSocket(`ws://127.0.0.1:${port}/__rig_hmr`);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("WebSocket did not open")),
        3000,
      );
      socket.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(timer);
        reject(new Error("WebSocket connection failed"));
      };
    });

    const updatePromise = new Promise<DevServerUpdate>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("No HMR payload received")),
        3000,
      );
      socket.onmessage = (event) => {
        clearTimeout(timer);
        resolve(JSON.parse(String(event.data)) as DevServerUpdate);
      };
    });

    server.notify({ type: "page-update", path: "/index.html" });

    const update = await updatePromise;
    assertEquals(update.type, "page-update");
    assertEquals(update.path, "/index.html");

    socket.close();
  } finally {
    server.shutdown();
    await site.cleanup();
  }
});
