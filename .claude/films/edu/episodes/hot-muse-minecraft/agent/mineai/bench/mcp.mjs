// mcp.mjs - scripted MCP client for the Tst_rv crafting bench (no model). node mcp.mjs <url> call <tool> '<json>'
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function connect(url) {
  const client = new Client({ name: 'rv-craft-bench', version: '0.0.1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, cmd, a, b] = process.argv.slice(2);
  const c = await connect(url);
  if (cmd === 'call') {
    const r = await c.callTool({ name: a, arguments: JSON.parse(b || '{}') }, undefined, { timeout: 600000 });
    console.log(process.env.FULL ? JSON.stringify(r) : JSON.stringify(r.structuredContent ?? r, null, 1).slice(0, Number(process.env.MAX || 6000)));
  }
  await c.close();
}
