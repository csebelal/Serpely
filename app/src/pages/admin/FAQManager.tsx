import { useEffect, useState } from 'react';
import { getAllFaq, updateFaq, type FaqItemData } from '@/lib/api';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Section = 'home' | 'pricing' | 'faq-page';
const SECTIONS: { value: Section; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'faq-page', label: 'FAQ Page' },
];
const EMPTY: FaqItemData = { question: '', answer: '', category: '', section: 'home', order: 0, isVisible: true };
const FAQ_CATEGORIES = ['General', 'Pricing', 'Features', 'Technical', 'Account', 'Integrations', 'API', 'Support', 'Other'];

function SortableRow({ item, onEdit, onDelete, onToggle }: {
  item: FaqItemData; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._id! });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: '#fff', borderRadius: 12, marginBottom: 8, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#cbd5e1', flexShrink: 0, fontSize: 16 }}>⠿</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.question}</div>
        {item.category && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.category}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onToggle} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: item.isVisible ? '#f0fdf4' : '#f1f5f9', color: item.isVisible ? '#16a34a' : '#94a3b8', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          {item.isVisible ? 'Visible' : 'Hidden'}
        </button>
        <button onClick={onEdit} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Edit</button>
        <button onClick={onDelete} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Del</button>
      </div>
    </div>
  );
}

export function FAQManager() {
  const [all, setAll] = useState<FaqItemData[]>([]);
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [editing, setEditing] = useState<FaqItemData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => { getAllFaq().then(r => setAll(r.data)); }, []);

  const items = all.filter(i => i.section === activeSection);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = items.findIndex(i => i._id === active.id);
    const ni = items.findIndex(i => i._id === over.id);
    setAll([...all.filter(i => i.section !== activeSection), ...arrayMove(items, oi, ni)]);
  }

  async function save() {
    setSaving(true);
    const ordered = all.map((item, i) => ({ ...item, order: i + 1 }));
    const toSave = ordered.map(({ _id, ...rest }) => (_id?.startsWith('new_') ? rest : { _id, ...rest }));
    await updateFaq(toSave as FaqItemData[]);
    setAll(ordered);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function saveEdit() {
    if (!editing) return;
    if (editing._id) setAll(all.map(i => i._id === editing._id ? editing : i));
    else setAll([...all, { ...editing, _id: `new_${Date.now()}`, order: all.length + 1 }]);
    setEditing(null);
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>FAQ Manager</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing({ ...EMPTY, section: activeSection })} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 13, cursor: 'pointer' }}>+ Add</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {SECTIONS.map(s => (
          <button key={s.value} onClick={() => setActiveSection(s.value)} style={{
            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: activeSection === s.value ? 'rgba(0,194,122,0.1)' : '#f1f5f9',
            color: activeSection === s.value ? '#00C27A' : '#64748b',
          }}>{s.label} ({all.filter(i => i.section === s.value).length})</button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i._id!)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableRow key={item._id} item={item}
              onToggle={() => setAll(all.map(i => i._id === item._id ? { ...i, isVisible: !i.isVisible } : i))}
              onEdit={() => setEditing({ ...item })}
              onDelete={() => setAll(all.filter(i => i._id !== item._id))}
            />
          ))}
        </SortableContext>
      </DndContext>
      {items.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No items yet.</p>}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 560, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
            <h2 style={{ margin: '0 0 22px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{editing._id ? 'Edit' : 'New'} FAQ</h2>
            {(['question', 'answer', 'category'] as const).map(field => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field}</label>
                {field === 'answer'
                  ? <textarea value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} rows={4} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  : field === 'category'
                  ? <select value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, cursor: 'pointer' }}>
                      <option value="">— Select category —</option>
                      {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  : <input value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, boxSizing: 'border-box' }} />
                }
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</label>
              <select value={editing.section} onChange={e => setEditing({ ...editing, section: e.target.value as Section })} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13 }}>
                {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 18px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveEdit} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
