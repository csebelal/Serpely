import { useEffect, useState } from 'react';
import { getAllTestimonials, updateTestimonials, type TestimonialData } from '@/lib/api';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ item, onToggle, onEdit, onDelete }: {
  item: TestimonialData;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._id! });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 12, marginBottom: 8, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#cbd5e1', paddingTop: 3, flexShrink: 0, fontSize: 16 }}>⠿</span>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#00C27A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0, fontSize: 13 }}>{item.initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{item.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {item.role}</span></div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.quote}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <button onClick={onToggle} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: item.isVisible ? '#f0fdf4' : '#f1f5f9', color: item.isVisible ? '#16a34a' : '#94a3b8', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          {item.isVisible ? 'Visible' : 'Hidden'}
        </button>
        <button onClick={onEdit} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Edit</button>
        <button onClick={onDelete} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Del</button>
      </div>
    </div>
  );
}

const EMPTY: TestimonialData = { quote: '', name: '', role: '', initial: '', order: 0, isVisible: true };

export function TestimonialsManager() {
  const [items, setItems] = useState<TestimonialData[]>([]);
  const [editing, setEditing] = useState<TestimonialData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => { getAllTestimonials().then(r => setItems(r.data)); }, []);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oi = items.findIndex(i => i._id === active.id);
      const ni = items.findIndex(i => i._id === over.id);
      setItems(arrayMove(items, oi, ni));
    }
  }

  async function save() {
    setSaving(true);
    const ordered = items.map((item, i) => ({ ...item, order: i + 1 }));
    const toSave = ordered.map(({ _id, ...rest }) => (_id?.startsWith('new_') ? rest : { _id, ...rest }));
    await updateTestimonials(toSave as TestimonialData[]);
    setItems(ordered);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function saveEdit() {
    if (!editing) return;
    if (editing._id) setItems(items.map(i => i._id === editing._id ? editing : i));
    else setItems([...items, { ...editing, _id: `new_${Date.now()}`, order: items.length + 1 }]);
    setEditing(null);
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Testimonials</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Drag to reorder · toggle visibility</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing({ ...EMPTY })} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 13, cursor: 'pointer' }}>+ Add</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i._id!)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableRow key={item._id} item={item}
              onToggle={() => setItems(items.map(i => i._id === item._id ? { ...i, isVisible: !i.isVisible } : i))}
              onEdit={() => setEditing({ ...item })}
              onDelete={() => setItems(items.filter(i => i._id !== item._id))}
            />
          ))}
        </SortableContext>
      </DndContext>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 520, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
            <h2 style={{ margin: '0 0 22px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{editing._id ? 'Edit' : 'New'} Testimonial</h2>
            {(['quote', 'name', 'role', 'initial'] as const).map(field => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field}</label>
                {field === 'quote'
                  ? <textarea value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} rows={3} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  : <input value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, boxSizing: 'border-box' }} />
                }
              </div>
            ))}
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
