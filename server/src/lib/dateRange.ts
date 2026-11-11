/**
 * Parses optional `from` / `to` query date strings into MongoDB `$gte` / `$lte` bounds.
 * Date-only `to` values (`YYYY-MM-DD`) are expanded to end-of-day UTC so the
 * selected end date is inclusive. Returns `{ error }` on invalid date inputs.
 */
export function parseDateRange(
  from?: unknown,
  to?: unknown,
): { range?: { $gte?: Date; $lte?: Date }; error?: string } {
  const f = typeof from === 'string' ? from.trim() : '';
  const t = typeof to === 'string' ? to.trim() : '';
  if (!f && !t) return {};

  const range: { $gte?: Date; $lte?: Date } = {};
  if (f) {
    const d = new Date(f);
    if (Number.isNaN(d.getTime())) return { error: 'Invalid from date' };
    range.$gte = d;
  }
  if (t) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return { error: 'Invalid to date' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) d.setUTCHours(23, 59, 59, 999);
    range.$lte = d;
  }
  return { range };
}
