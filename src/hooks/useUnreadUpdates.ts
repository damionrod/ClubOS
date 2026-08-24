import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function storageKey(organisationId: string, userId: string) {
  return `clubos-news-seen:${organisationId}:${userId}`;
}

function defaultSeenAt() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

export function useUnreadUpdates(organisationId?: string, userId?: string) {
  const [count, setCount] = useState(0);

  const getSeenAt = useCallback(() => {
    if (!organisationId || !userId) return new Date().toISOString();
    return localStorage.getItem(storageKey(organisationId, userId)) || defaultSeenAt();
  }, [organisationId, userId]);

  const refresh = useCallback(async () => {
    if (!organisationId || !userId) {
      setCount(0);
      return;
    }

    const seenAt = getSeenAt();
    const [posts, awards] = await Promise.all([
      supabase
        .from('news_posts')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisationId)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .gt('published_at', seenAt),
      supabase
        .from('member_awards')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisationId)
        .eq('visibility', 'members')
        .gt('awarded_on', seenAt.slice(0, 10)),
    ]);

    setCount((posts.count ?? 0) + (awards.count ?? 0));
  }, [organisationId, userId, getSeenAt]);

  const markSeen = useCallback(() => {
    if (!organisationId || !userId) return;
    localStorage.setItem(storageKey(organisationId, userId), new Date().toISOString());
    setCount(0);
  }, [organisationId, userId]);

  useEffect(() => {
    refresh();
    if (!organisationId) return;

    const channel = supabase
      .channel(`member-updates-${organisationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news_posts', filter: `organisation_id=eq.${organisationId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_awards', filter: `organisation_id=eq.${organisationId}` },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organisationId, refresh]);

  return { count, refresh, markSeen };
}
