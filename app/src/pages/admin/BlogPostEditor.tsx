import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { getPostById, createPost, updatePost, uploadFile, type BlogPostData } from '@/lib/api';

const CATEGORIES = ['geo-aeo', 'agentic-seo', 'ai-seo-tools', 'technical-seo', 'keyword-strategy', 'llm-seo', 'reporting', 'case-studies', 'product-updates'];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function ToolbarBtn({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ padding: '4px 8px', background: active ? 'rgba(0,194,122,0.1)' : 'none', border: 'none', borderRadius: 5, color: active ? '#00C27A' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
      {children}
    </button>
  );
}

export function BlogPostEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [form, setForm] = useState<Partial<BlogPostData>>({
    title: '',
    slug: '',
    excerpt: '',
    author: '',
    authorInitials: '',
    tagLabel: '',
    tagColor: '',
    category: 'geo-aeo',
    published: false,
    publishedAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Image,
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height: 400px; padding: 20px; outline: none; font-size: 15px; line-height: 1.7; color: #0f172a;',
      },
    },
  });

  useEffect(() => {
    if (!isNew && id && editor) {
      getPostById(id).then(r => {
        setForm({ ...r.data, publishedAt: r.data.publishedAt ? r.data.publishedAt.slice(0, 10) : '' });
        editor.commands.setContent(r.data.body || '');
        setAutoSlug(false);
      }).catch(() => navigate('/sp-super-admin/blog'));
    }
  }, [id, isNew, editor]);

  function handleTitleChange(title: string) {
    setForm(f => ({ ...f, title, ...(autoSlug ? { slug: slugify(title) } : {}) }));
  }

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    setSaveError('');
    const payload = { ...form, body: editor.getHTML() };
    try {
      if (isNew) {
        await createPost(payload);
      } else {
        await updatePost(id!, payload);
      }
      navigate('/sp-super-admin/blog');
    } catch {
      setSaveError('Save failed. Check your connection and try again.');
      setSaving(false);
    }
  }

  const handleImageUpload = useCallback(async (file: File) => {
    const { data } = await uploadFile(file);
    editor?.chain().focus().setImage({ src: data.url }).run();
  }, [editor]);

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    setCoverError('');
    try {
      const { data } = await uploadFile(file);
      setForm(f => ({ ...f, coverImage: data.url }));
    } catch {
      setCoverError('Upload failed — check server/Cloudinary config.');
    }
    setCoverUploading(false);
  }

  const field = (label: string, key: keyof BlogPostData, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        type={type}
        value={(form[key] as string) || ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', padding: '8px 11px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div style={{ padding: '32px 44px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>{isNew ? 'New Post' : 'Edit Post'}</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
            <input type="checkbox" checked={!!form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} style={{ width: 15, height: 15, accentColor: '#00C27A' }} />
            Published
          </label>
          {saveError && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{saveError}</span>}
          <button onClick={() => navigate('/sp-super-admin/blog')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saving ? 'Saving…' : isNew ? 'Create Post' : 'Update Post'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 20 }}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <input
              value={form.title || ''}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Post title…"
              style={{ width: '100%', fontSize: 22, fontWeight: 800, background: 'none', border: 'none', borderBottom: '2px solid #f1f5f9', color: '#0f172a', outline: 'none', padding: '0 0 10px', letterSpacing: '-0.03em', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug</label>
            <input
              value={form.slug || ''}
              onChange={e => { setAutoSlug(false); setForm(f => ({ ...f, slug: e.target.value })); }}
              style={{ width: '100%', padding: '8px 11px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#64748b', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div style={{ display: 'flex', gap: 2, padding: '8px 10px', background: '#f8fafc', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 1 }}>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>B</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>I</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>H2</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}>H3</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>• List</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>1. List</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')}>Code</ToolbarBtn>
              <ToolbarBtn onClick={() => {
                const url = prompt('Enter URL:');
                if (url) editor?.chain().focus().setLink({ href: url }).run();
              }} active={editor?.isActive('link')}>Link</ToolbarBtn>
              <label style={{ padding: '4px 8px', background: 'none', border: 'none', borderRadius: 5, color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Img
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files && handleImageUpload(e.target.files[0])} />
              </label>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Metadata</h3>
            {field('Excerpt', 'excerpt')}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
              <select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '8px 11px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13 }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {field('Tag Label', 'tagLabel')}
            {field('Tag Color', 'tagColor')}
            {field('Author', 'author')}
            {field('Author Initials', 'authorInitials')}
            {field('Publish Date', 'publishedAt', 'date')}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cover Image</h3>
            {form.coverImage && <img src={form.coverImage} alt="Cover" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
            <input type="file" accept="image/*" onChange={e => e.target.files && handleCoverUpload(e.target.files[0])} style={{ fontSize: 12, color: '#64748b', width: '100%' }} />
            {coverUploading && <span style={{ fontSize: 11, color: '#94a3b8' }}>Uploading…</span>}
            {coverError && <span style={{ fontSize: 11, color: '#ef4444' }}>{coverError}</span>}
          </div>
        </div>
      </div>

      <style>{`
        .tiptap h2 { font-size: 20px; font-weight: 700; margin: 24px 0 10px; color: #0f172a; }
        .tiptap h3 { font-size: 16px; font-weight: 700; margin: 20px 0 8px; color: #0f172a; }
        .tiptap p { margin: 0 0 14px; color: #0f172a; }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin-bottom: 14px; }
        .tiptap li { margin-bottom: 4px; color: #0f172a; }
        .tiptap a { color: #00C27A; text-decoration: underline; }
        .tiptap code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #0f172a; }
        .tiptap pre { background: #f1f5f9; padding: 16px; border-radius: 10px; margin-bottom: 14px; overflow-x: auto; }
        .tiptap img { max-width: 100%; border-radius: 10px; margin: 16px 0; }
        .tiptap p.is-editor-empty:first-child::before { content: 'Start writing your post…'; color: #94a3b8; pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  );
}
