import AdminUser from '../models/AdminUser';

/**
 * Idempotent, one-time role backfill for accounts created before roles existed.
 *
 * The oldest account keeps full control and the rest become admins, so the
 * operator can never be locked out of user management by this migration.
 */
export async function ensureAdminRoles(): Promise<void> {
  try {
    const missing = await AdminUser.find({ role: { $exists: false } })
      .sort({ createdAt: 1 })
      .select('_id')
      .lean();

    if (missing.length) {
      await AdminUser.updateOne({ _id: missing[0]._id }, { $set: { role: 'owner', active: true } });
      const rest = missing.slice(1).map(u => u._id);
      if (rest.length) {
        await AdminUser.updateMany({ _id: { $in: rest } }, { $set: { role: 'admin', active: true } });
      }
      console.log(`[roles] backfilled ${missing.length} admin account(s)`);
    }

    // Guarantee at least one active owner even if roles were mangled by hand.
    const owners = await AdminUser.countDocuments({ role: 'owner', active: true });
    if (owners === 0) {
      const oldest = await AdminUser.findOne().sort({ createdAt: 1 }).select('_id').lean();
      if (oldest) {
        await AdminUser.updateOne({ _id: oldest._id }, { $set: { role: 'owner', active: true } });
        console.log('[roles] promoted the oldest admin account to owner');
      }
    }
  } catch (err) {
    console.error('[roles] migration failed:', (err as Error)?.message);
  }
}
