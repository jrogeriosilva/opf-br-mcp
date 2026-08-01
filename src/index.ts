import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./core/server.js";
import { PACKAGE_VERSION } from "./core/version.js";

// Escrever em stdout só é seguro aqui porque saímos antes de abrir o transporte
// stdio — depois disso o canal é exclusivo do JSON-RPC.
if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(PACKAGE_VERSION);
  process.exit(0);
}

const server = createServer();
await server.connect(new StdioServerTransport());
console.error(`[opf-br-mcp] server pronto (stdio) — v${PACKAGE_VERSION}`);
