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
  const [seenAt, setSeenAt] = useState<string>(() => new Date().toISOString());

  const getSeenAt = useCallback(() => {
    if (!organisationId || !userId) return new Date().toISOString();
    const value = localStorage.getItem(storageKey(organisationId, userId)) || defaultSeenAt();
    setSeenAt(value);
    return value;
  }, [organisationId, userId]);

  const refresh = useCallback(async () => {
    if (!organisationId || !userId) {
      setCount(0);
      return;
    }

    const seenAt = getSeenAt();
    const [posts, awards, documents, events] = await Promise.all([
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
      supabase
        .from('club_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisationId)
        .in('visibility', ['members', 'public'])
        .gt('updated_at', seenAt),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisationId)
        .eq('status', 'published')
        .gt('created_at', seenAt),
    ]);

    setCount(
      (posts.count ?? 0) +
      (awards.count ?? 0) +
      (documents.count ?? 0) +
      (events.count ?? 0),
    );
  }, [organisationId, userId, getSeenAt]);

  const markSeen = useCallback(() => {
    if (!organisationId || !userId) return;
    const now = new Date().toISOString();
    localStorage.setItem(storageKey(organisationId, userId), now);
    setSeenAt(now);
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_documents', filter: `organisation_id=eq.${organisationId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `organisation_id=eq.${organisationId}` },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organisationId, refresh]);

  return { count, refresh, markSeen, seenAt };
}
