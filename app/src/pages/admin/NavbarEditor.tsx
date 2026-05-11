import { useEffect, useState } from 'react';
import { getNav, updateNav, type NavItemData } from '@/lib/api';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableNavRow({ item, onUpdate, onDelete, onEdit }: {
  item: NavItemData & { _id: string };
  onUpdate: (i: NavItemData) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', borderRadius: 12, marginBottom: 8, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#cbd5e1', flexShrink: 0, fontSize: 16 }}>⠿</span>
      <input value={item.label} onChange={e => onUpdate({ ...item, label: e.target.value })} style={{ flex: 1, background: 'none', border: 'none', color: '#0f172a', fontSize: 13, fontWeight: 600, outline: 'none', minWidth: 0 }} />
      <input value={item.href} onChange={e => onUpdate({ ...item, href: e.target.value })} style={{ flex: 1, background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, outline: 'none', minWidth: 0, fontFamily: 'monospace' }} />
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <button onClick={() => onUpdate({ ...item, isVisible: !item.isVisible })} style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: item.isVisible ? '#f0fdf4' : '#f1f5f9', color: item.isVisible ? '#16a34a' : '#94a3b8', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
          {item.isVisible ? 'Visible' : 'Hidden'}
        </button>
        <button onClick={() => onUpdate({ ...item, isCta: !item.isCta })} style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: item.isCta ? '#f0fdf4' : '#f1f5f9', color: item.isCta ? '#16a34a' : '#94a3b8', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>CTA</button>
        <button onClick={onEdit} style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>
          Dropdown ({item.dropdownItems?.length ?? 0})
        </button>
        <button onClick={onDelete} style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>Del</button>
      </div>
    </div>
  );
}

export function NavbarEditor() {
  const [items, setItems] = useState<(NavItemData & { _id: string })[]>([]);
  const [editing, setEditing] = useState<(NavItemData & { _id: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => { getNav().then(r => setItems(r.data as (NavItemData & { _id: string })[])); }, []);

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
    await updateNav(toSave as typeof ordered);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Navbar Editor</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Drag to reorder · toggle CTA & visibility</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setItems([...items, { _id: `new_${Date.now()}`, label: 'New Link', href: '#', order: items.length + 1, isCta: false, isVisible: true, dropdownItems: [] }])}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 13, cursor: 'pointer' }}>+ Add</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Nav'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i._id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableNavRow key={item._id} item={item}
              onUpdate={updated => setItems(items.map(i => i._id === item._id ? { ...updated, _id: item._id } : i))}
              onDelete={() => setItems(items.filter(i => i._id !== item._id))}
              onEdit={() => setEditing({ ...item })}
            />
          ))}
        </SortableContext>
      </DndContext>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 600, maxHeight: '80vh', overflow: 'auto', background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Dropdown — {editing.label}</h2>
            {(editing.dropdownItems || []).map((d, di) => (
              <div key={di} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={d.label} placeholder="Label" onChange={e => { const dd = [...editing.dropdownItems]; dd[di] = { ...d, label: e.target.value }; setEditing({ ...editing, dropdownItems: dd }); }}
                  style={{ flex: 1, padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 7, color: '#0f172a', fontSize: 12 }} />
                <input value={d.href} placeholder="href" onChange={e => { const dd = [...editing.dropdownItems]; dd[di] = { ...d, href: e.target.value }; setEditing({ ...editing, dropdownItems: dd }); }}
                  style={{ flex: 1, padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 7, color: '#64748b', fontSize: 12, fontFamily: 'monospace' }} />
                <input value={d.desc} placeholder="Description (optional)" onChange={e => { const dd = [...editing.dropdownItems]; dd[di] = { ...d, desc: e.target.value }; setEditing({ ...editing, dropdownItems: dd }); }}
                  style={{ flex: 2, padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 7, color: '#94a3b8', fontSize: 12 }} />
                <button onClick={() => setEditing({ ...editing, dropdownItems: editing.dropdownItems.filter((_, i) => i !== di) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={() => setEditing({ ...editing, dropdownItems: [...(editing.dropdownItems || []), { label: '', href: '', desc: '' }] })}
              style={{ padding: '5px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>+ Add item</button>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 18px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={() => { setItems(items.map(i => i._id === editing._id ? editing : i)); setEditing(null); }}
                style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Save Dropdown</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
