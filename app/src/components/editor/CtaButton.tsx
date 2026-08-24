import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, type KeyboardEvent } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
function CtaButtonView({ node, updateAttributes }: any) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(node.attrs.text as string);
  const [url, setUrl] = useState(node.attrs.url as string);
  const [style, setStyle] = useState(node.attrs.style as string);

  function save() {
    updateAttributes({ text, url, style });
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { setEditing(false); setText(node.attrs.text); setUrl(node.attrs.url); setStyle(node.attrs.style); }
  }

  if (editing) {
    return (
      <NodeViewWrapper>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 14px', background: '#f0fdf4', border: '2px dashed #00C27A', borderRadius: 10, margin: '12px 0' }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Button text" autoFocus style={{ flex: 1, padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#0f172a' }} />
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKeyDown} placeholder="https://..." style={{ flex: 1, padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#0f172a', fontFamily: 'monospace' }} />
          <select value={style} onChange={e => setStyle(e.target.value)} style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#0f172a' }}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
          <button onClick={save} style={{ padding: '6px 14px', background: '#00C27A', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        data-cta-button=""
        onClick={() => setEditing(true)}
        style={{ display: 'flex', justifyContent: 'center', margin: '16px 0', cursor: 'pointer' }}
      >
        <span style={{
          display: 'inline-block',
          padding: '12px 28px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          ...(style === 'primary'
            ? { background: '#00C27A', color: '#fff' }
            : { background: 'transparent', border: '2px solid #00C27A', color: '#00C27A' }),
        }}>
          {text || 'Button'} →
        </span>
      </div>
    </NodeViewWrapper>
  );
}

export const CtaButton = Node.create({
  name: 'ctaButton',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      text: { default: 'Get Started →' },
      url: { default: '#' },
      style: { default: 'primary' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-cta-button]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { text, url, style } = HTMLAttributes;
    return ['div', mergeAttributes(HTMLAttributes, { 'data-cta-button': '' }),
      ['a', { href: url, class: `cta-body-btn cta-body-btn-${style || 'primary'}` }, text || 'Button'],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaButtonView);
  },
});
