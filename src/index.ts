import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./core/server.js";

const server = createServer();
await server.connect(new StdioServerTransport());
console.error("[opf-br-mcp] server pronto (stdio)");
