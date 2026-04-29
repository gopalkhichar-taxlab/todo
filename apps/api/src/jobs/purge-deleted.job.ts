/**
 * TAL-85: Purge soft-deleted tasks.
 *
 * This job permanently removes Task records where `deletedAt` is older than
 * the configured retention window (default: 30 days). It is intended to run
 * on a schedule (e.g. daily via a cron trigger or a background queue worker).
 *
 * Implementation is deferred to TAL-85.
 */

// stub — implementation in TAL-85
export async function purgeDeletedTasks(_retentionDays = 30): Promise<void> {
  // TODO(TAL-85): implement purge logic
  //   const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  //   await prisma.task.deleteMany({ where: { deletedAt: { lt: cutoff } } });
}
