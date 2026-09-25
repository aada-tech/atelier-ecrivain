'use client';

import { useEffect, useState } from 'react';
import { computeStreak, subscribeRecentStats, type DayStat } from '@/lib/data/stats';
import { dayKey } from '@/lib/utils';

export function useWritingStats(uid: string | undefined, days = 30) {
  const [stats, setStats] = useState<DayStat[]>([]);
  useEffect(() => {
    if (!uid) return;
    return subscribeRecentStats(uid, days, setStats);
  }, [uid, days]);
  const today = stats.find((s) => s.day === dayKey())?.words ?? 0;
  return { stats, today, streak: computeStreak(stats) };
}
