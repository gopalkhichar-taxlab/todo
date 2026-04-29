/**
 * TAL-85: Purge soft-deleted tasks.
 *
 * Permanently removes Task records where `deletedAt` is older than the
 * configured retention window (default: 30 days). Meant to run on a schedule
 * (e.g. daily via a cron trigger or a background queue worker).
 *
 * Wire it up to your scheduler of choice:
 *   // every day at 03:00 UTC
 *   cron.schedule('0 3 * * *', () => purgeDeletedTasks());
 */

import { prisma } from '../lib/prisma.js';

export async function purgeDeletedTasks(retentionDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

  const result = await prisma.task.deleteMany({
    where: {
      deletedAt: { lt: cutoff },
    },
  });

  return result.count;
}
