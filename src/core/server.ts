import type { Config, DevServerUpdate } from "../types/index.ts";

export interface ServerOptions {
  port: number;
  host: string;
  open: boolean;
}

export interface DevServerController {
  notify: (update: DevServerUpdate) => void;
  shutdown: () => void;
}

const HMR_ENDPOINT = "/__rig_hmr";

export async function startServer(
  config: Config,
  options: ServerOptions,
): Promise<DevServerController> {
  const { port, host, open } = options;
  const outputDir = config.outputDir;
  const clients = new Set<WebSocket>();

  await Deno.mkdir(outputDir, { recursive: true });

  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (url.pathname === HMR_ENDPOINT) {
      return handleHmrConnection(req, clients);
    }

    const filePath = normalizeRequestPath(url.pathname);
    if (filePath.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }

    const fullPath = `${outputDir}${filePath}`;

    try {
      const fileInfo = await Deno.stat(fullPath);

      if (fileInfo.isDirectory) {
        return await serveHtml(`${fullPath}/index.html`);
      }

      const contentType = getContentType(fullPath);
      if (contentType === "text/html") {
        return await serveHtml(fullPath);
      }

      const fileContent = await Deno.readFile(fullPath);
      return new Response(fileContent, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  };

  const server = Deno.serve({ port, hostname: host }, handler);

  const serverUrl = `http://${host}:${port}`;
  console.log(`🚀 Dev server running at ${serverUrl}`);

  if (open) {
    const proc = new Deno.Command("open", { args: [serverUrl] });
    await proc.spawn();
  }

  const notify = (update: DevServerUpdate) => {
    const payload = JSON.stringify(update);

    for (const client of clients) {
      if (client.readyState !== WebSocket.OPEN) {
        clients.delete(client);
        continue;
      }

      try {
        client.send(payload);
      } catch {
        clients.delete(client);
      }
    }
  };

  const cleanup = () => {
    shutdown();
    Deno.exit(0);
  };

  const shutdown = () => {
    console.log("\n👋 Shutting down server...");
    Deno.removeSignalListener("SIGINT", cleanup);
    Deno.removeSignalListener("SIGTERM", cleanup);
    for (const client of clients) {
      try {
        client.close();
      } catch {
        // Ignore close errors
      }
    }
    clients.clear();
    server.shutdown();
  };

  Deno.addSignalListener("SIGINT", cleanup);
  Deno.addSignalListener("SIGTERM", cleanup);

  return {
    notify,
    shutdown,
  };
}

function handleHmrConnection(
  req: Request,
  clients: Set<WebSocket>,
): Response {
  try {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      clients.add(socket);
    };

    socket.onclose = () => {
      clients.delete(socket);
    };

    socket.onerror = () => {
      clients.delete(socket);
      try {
        socket.close();
      } catch {
        // Ignore close errors
      }
    };

    return response;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
}

async function serveHtml(filePath: string): Promise<Response> {
  try {
    const html = await Deno.readTextFile(filePath);
    const withHmr = injectHmrClient(html);

    return new Response(withHmr, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

function normalizeRequestPath(pathname: string): string {
  if (pathname === "/") {
    return "/index.html";
  }

  return pathname;
}

function injectHmrClient(html: string): string {
  if (html.includes("window.__RIG_HMR__")) {
    return html;
  }

  const script = `<script>
(() => {
  if (window.__RIG_HMR__) return;
  window.__RIG_HMR__ = true;

  const normalizePath = (value) => {
    if (!value || value === "/") return "/index.html";
    if (value.endsWith("/")) return value + "index.html";
    return value;
  };

  const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(wsProtocol + "://" + location.host + "${HMR_ENDPOINT}");

  socket.addEventListener("message", async (event) => {
    let update;
    try {
      update = JSON.parse(event.data);
    } catch {
      return;
    }

    if (!update || !update.type) return;

    if (update.type === "full-reload") {
      location.reload();
      return;
    }

    if (update.type === "asset-update") {
      const target = update.path || "";
      if (target.endsWith(".css")) {
        document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
          const href = new URL(link.href, location.origin);
          if (href.pathname === target) {
            href.searchParams.set("__hmr", Date.now().toString());
            link.href = href.toString();
          }
        });
        return;
      }

      location.reload();
      return;
    }

    if (update.type === "page-update") {
      const currentPath = normalizePath(location.pathname);
      const changedPath = normalizePath(update.path || "");
      if (currentPath !== changedPath) {
        return;
      }

      try {
        const refreshUrl = new URL(location.href);
        refreshUrl.searchParams.set("__hmr", Date.now().toString());

        const response = await fetch(refreshUrl.toString(), { cache: "no-store" });
        if (!response.ok) {
          location.reload();
          return;
        }

        const nextHtml = await response.text();
        const nextDoc = new DOMParser().parseFromString(nextHtml, "text/html");

        if (!nextDoc.body) {
          location.reload();
          return;
        }

        document.title = nextDoc.title;
        document.body.replaceWith(nextDoc.body);
      } catch {
        location.reload();
      }
    }
  });

  socket.addEventListener("close", () => {
    setTimeout(() => location.reload(), 300);
  });
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}\n${script}`;
}

function getContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const contentTypes: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    mjs: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    txt: "text/plain",
    md: "text/markdown",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    webp: "image/webp",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
    otf: "font/otf",
    pdf: "application/pdf",
    zip: "application/zip",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };

  return contentTypes[ext] || "application/octet-stream";
}
