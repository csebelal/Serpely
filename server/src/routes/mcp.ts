import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { MCP_TOOLS } from '../mcp/tools';
import { verifyMCPKey } from '../middleware/apiKeyAuth';

const router = Router();

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'serpely', version: '1.0.0' };

// 60 req/min/IP — same VPS, no extra infra.
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

router.use(limiter);
router.use(verifyMCPKey as any);

// CORS preflight for MCP clients (Cursor/Claude send Authorization + content-type)
router.options('/', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Mcp-Session-Id');
  res.status(204).end();
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, server: SERVER_INFO.name, version: SERVER_INFO.version, tools: MCP_TOOLS.map(t => t.name), time: new Date().toISOString() });
});

// Stateless Streamable HTTP: single JSON-RPC object per POST, no session needed.
router.post('/', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const body: any = req.body;

  if (!body || typeof body.method !== 'string') {
    res.status(400).json({ jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request' } });
    return;
  }

  const id = body.id ?? null;
  const authed = Boolean((req as any).adminId);

  try {
    if (body.method === 'initialize') {
      res.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        },
      });
      return;
    }

    if (body.method === 'notifications/initialized' || body.method.startsWith('notifications/')) {
      res.status(202).end();
      return;
    }

    if (body.method === 'ping') {
      res.json({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    if (body.method === 'tools/list') {
      res.json({
        jsonrpc: '2.0', id,
        result: {
          tools: MCP_TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        },
      });
      return;
    }

    if (body.method === 'tools/call') {
      const name = body.params?.name;
      const args = body.params?.arguments || {};
      const tool = MCP_TOOLS.find(t => t.name === name);
      if (!tool) {
        res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } });
        return;
      }
      if (tool.requiresKey && !authed) {
        res.json({
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: 'This tool needs a Serpely API key. Add header Authorization: Bearer sk_live_... (generate from Profile > API Keys).' }],
            isError: true,
          },
        });
        return;
      }
      try {
        const data = await tool.run(args);
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } });
      } catch (e) {
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Tool error: ${(e as Error).message}` }], isError: true } });
      }
      return;
    }

    res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${body.method}` } });
  } catch (e) {
    res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: (e as Error).message || 'Internal error' } });
  }
});

export default router;
