import SEOPage from '../models/SEOPage';
import SiteSettings from '../models/SiteSettings';
import BlogPost from '../models/BlogPost';
import AuditReport from '../models/AuditReport';

export interface MCPToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresKey: boolean;
  run: (args: any) => Promise<unknown>;
}

async function seoGet(args: any) {
  const key = String(args?.pageKey || 'home');
  const [page, settings] = await Promise.all([
    SEOPage.findOne({ pageKey: key }).lean(),
    SiteSettings.findOne().lean() as Promise<any>,
  ]);
  const d = settings || {};
  return {
    pageKey: key,
    metaTitle: (page as any)?.metaTitle || d.defaultMetaTitle || '',
    metaDescription: (page as any)?.metaDescription || d.defaultMetaDescription || '',
    ogImage: (page as any)?.ogImage || d.ogImage || '',
    canonicalUrl: (page as any)?.canonicalUrl || '',
    noIndex: (page as any)?.noIndex || false,
    siteName: d.siteName || 'Serpely',
    siteUrl: d.siteUrl || 'https://serpely.com',
  };
}

async function blogList(args: any) {
  const limit = Math.min(Math.max(Number(args?.limit || 10), 1), 25);
  const posts = await BlogPost.find({ published: true }, { title: 1, slug: 1, excerpt: 1, publishedAt: 1, category: 1 })
    .sort({ publishedAt: -1 }).limit(limit).lean();
  return posts.map((p: any) => ({
    title: p.title, slug: p.slug, excerpt: (p.excerpt || '').slice(0, 160),
    category: p.category || '', publishedAt: p.publishedAt || null,
    url: `https://serpely.com/blog/${p.slug}`,
  }));
}

async function auditGet(args: any) {
  const id = String(args?.id || '');
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error('Valid audit report id required (from /audit page URL).');
  const doc = await AuditReport.findById(id).lean();
  if (!doc) throw new Error('Report not found');
  const d = doc as any;
  return {
    id: String(d._id), url: d.url, overall: d.overall, scores: d.scores,
    forecast: d.forecast,
    topIssues: Array.isArray(d.issues) ? d.issues.slice(0, 10).map((i: any) => ({
      title: i.title || i.check || '', severity: i.severity || '', detail: String(i.detail || i.message || '').slice(0, 300),
    })) : [],
  };
}

async function siteInfo() {
  const s = (await SiteSettings.findOne().lean() as any) || {};
  return {
    siteName: s.siteName || 'Serpely',
    siteUrl: s.siteUrl || 'https://serpely.com',
    tagline: s.tagline || 'Agentic SEO for the AI-first web',
    mcpEndpoint: '/mcp',
    docs: 'Connect Cursor/Claude to this same origin /mcp with your Serpely API key.',
  };
}

export const MCP_TOOLS: MCPToolDef[] = [
  {
    name: 'serpely_site_info',
    description: 'Get Serpely site info and MCP usage hints.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    requiresKey: false,
    run: siteInfo,
  },
  {
    name: 'serpely_seo_get',
    description: 'Get SEO meta for a Serpely page key (e.g. home, features, pricing, blog).',
    inputSchema: {
      type: 'object',
      properties: { pageKey: { type: 'string', description: 'SEO page key, e.g. home' } },
      required: [],
      additionalProperties: false,
    },
    requiresKey: false,
    run: seoGet,
  },
  {
    name: 'serpely_blog_list',
    description: 'List published Serpely blog posts with title, slug and URL.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: '1-25, default 10' } },
      required: [],
      additionalProperties: false,
    },
    requiresKey: false,
    run: blogList,
  },
  {
    name: 'serpely_audit_get',
    description: 'Fetch a saved SEO audit report by id (from the /audit page). Needs API key.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'AuditReport ObjectId' } },
      required: ['id'],
      additionalProperties: false,
    },
    requiresKey: true,
    run: auditGet,
  },
];
