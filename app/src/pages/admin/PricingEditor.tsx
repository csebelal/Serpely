import { useEffect, useState } from 'react';
import { getPricing, updatePricing, type PricingPlanData } from '@/lib/api';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function PlanCard({ plan, onUpdate, onDelete }: {
  plan: PricingPlanData & { _id: string };
  onUpdate: (p: PricingPlanData) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: plan._id });
  const [open, setOpen] = useState(false);
  const inp = (style?: React.CSSProperties) => ({ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, boxSizing: 'border-box' as const, width: '100%', ...style });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, background: '#fff', borderRadius: 16, padding: '20px 22px', flex: '1 1 280px', minWidth: 260, boxShadow: plan.isFeatured ? '0 0 0 2px #00C27A, 0 4px 16px rgba(0,194,122,0.1)' : '0 1px 4px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16 }}>⠿</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
          <input type="checkbox" checked={plan.isFeatured} onChange={e => onUpdate({ ...plan, isFeatured: e.target.checked })} style={{ accentColor: '#00C27A' }} />
          Featured
        </label>
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Plan Name</label>
        <input value={plan.name} onChange={e => onUpdate({ ...plan, name: e.target.value })} style={{ ...inp(), fontSize: 16, fontWeight: 800 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Badge</label>
        <input value={plan.badge} onChange={e => onUpdate({ ...plan, badge: e.target.value })} style={inp()} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Description</label>
        <input value={plan.description} onChange={e => onUpdate({ ...plan, description: e.target.value })} style={inp({ fontSize: 12 })} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Monthly $</label>
          <input type="number" value={plan.monthlyPrice} onChange={e => onUpdate({ ...plan, monthlyPrice: +e.target.value })} style={inp()} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Annual $</label>
          <input type="number" value={plan.annualPrice} onChange={e => onUpdate({ ...plan, annualPrice: +e.target.value })} style={inp()} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Annual Billed-As Text</label>
        <input value={plan.annualBilledAs} onChange={e => onUpdate({ ...plan, annualBilledAs: e.target.value })} style={inp({ fontSize: 12 })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>CTA Label</label>
        <input value={plan.ctaLabel} onChange={e => onUpdate({ ...plan, ctaLabel: e.target.value })} style={inp({ fontSize: 12 })} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Features ({plan.features.length})</span>
          <button onClick={() => setOpen(o => !o)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#00C27A', cursor: 'pointer', fontWeight: 600 }}>{open ? '▲ Hide' : '▼ Edit'}</button>
        </div>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {plan.features.map((f, fi) => (
              <div key={fi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={f.included} style={{ accentColor: '#00C27A' }} onChange={e => {
                  const feats = [...plan.features]; feats[fi] = { ...f, included: e.target.checked }; onUpdate({ ...plan, features: feats });
                }} />
                <input value={f.text} style={{ flex: 1, padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 6, color: '#0f172a', fontSize: 12 }} onChange={e => {
                  const feats = [...plan.features]; feats[fi] = { ...f, text: e.target.value }; onUpdate({ ...plan, features: feats });
                }} />
                <button onClick={() => onUpdate({ ...plan, features: plan.features.filter((_, i) => i !== fi) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
            <button onClick={() => onUpdate({ ...plan, features: [...plan.features, { text: '', included: true }] })} style={{ marginTop: 2, padding: '4px', background: '#f1f5f9', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>+ Add feature</button>
          </div>
        )}
      </div>

      <button onClick={onDelete} style={{ marginTop: 14, width: '100%', padding: '6px', background: '#fef2f2', border: 'none', borderRadius: 8, color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Delete Plan</button>
    </div>
  );
}

export function PricingEditor() {
  const [plans, setPlans] = useState<(PricingPlanData & { _id: string })[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => { getPricing().then(r => setPlans(r.data as (PricingPlanData & { _id: string })[])); }, []);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oi = plans.findIndex(p => p._id === active.id);
      const ni = plans.findIndex(p => p._id === over.id);
      setPlans(arrayMove(plans, oi, ni));
    }
  }

  async function save() {
    setSaving(true);
    const ordered = plans.map((p, i) => ({ ...p, order: i + 1 }));
    const toSave = ordered.map(({ _id, ...rest }) => (_id?.startsWith('new_') ? rest : { _id, ...rest }));
    await updatePricing(toSave as typeof ordered);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: '36px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Pricing Editor</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Drag to reorder · edit inline</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setPlans([...plans, { _id: `new_${Date.now()}`, name: 'New Plan', badge: '', description: '', monthlyPrice: 0, annualPrice: 0, annualBilledAs: '', features: [], isFeatured: false, ctaLabel: 'Get Started', order: plans.length + 1 }])}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 13, cursor: 'pointer' }}>+ Add Plan</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Plans'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={plans.map(p => p._id)} strategy={horizontalListSortingStrategy}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {plans.map(plan => (
              <PlanCard key={plan._id} plan={plan}
                onUpdate={updated => setPlans(plans.map(p => p._id === plan._id ? { ...updated, _id: plan._id } : p))}
                onDelete={() => setPlans(plans.filter(p => p._id !== plan._id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
