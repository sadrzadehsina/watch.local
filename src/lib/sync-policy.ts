export function shouldRunSync(
  lastSyncedAt: Date | null | undefined,
  intervalMs: number,
  options?: { force?: boolean; now?: Date },
) {
  if (options?.force) {
    return true;
  }

  if (!lastSyncedAt) {
    return true;
  }

  const now = options?.now ?? new Date();
  return now.getTime() - lastSyncedAt.getTime() >= intervalMs;
}

export function summarizeSyncErrors(errors: string[], limit = 5) {
  if (errors.length === 0) {
    return null;
  }

  const visible = errors.slice(0, limit);
  const remaining = errors.length - visible.length;

  if (remaining <= 0) {
    return visible.join("\n");
  }

  return `${visible.join("\n")}\n${remaining} more channel errors.`;
}
