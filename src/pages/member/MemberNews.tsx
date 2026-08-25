import { useEffect, useState } from 'react';
import {
  Award, Calendar, FileText, Newspaper, Paperclip
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { useUnreadUpdates } from '@/hooks/useUnreadUpdates';

type FeedItem = {
  id: string;
  kind: 'news' | 'award' | 'document' | 'event';
  title: string;
  body?: string | null;
  date: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  signed_url?: string | null;
  event_slug?: string | null;
};

export function MemberNews() {
  const { activeOrg, profile } = useAuth();
  const { markSeen, seenAt } = useUnreadUpdates(activeOrg?.id, profile?.id);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('news_posts')
        .select('id,title,body,published_at,attachment_path,attachment_name,attachment_type')
        .eq('organisation_id', activeOrg.id)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false }),
      supabase
        .from('member_awards')
        .select('id,awarded_on,citation,award_types(name),members(first_name,last_name,preferred_name)')
        .eq('organisation_id', activeOrg.id)
        .eq('visibility', 'members')
        .order('awarded_on', { ascending: false }),
      supabase
        .from('club_documents')
        .select('id,title,updated_at,file_path,file_name,file_type')
        .eq('organisation_id', activeOrg.id)
        .in('visibility', ['members', 'public'])
        .order('updated_at', { ascending: false }),
      supabase
        .from('events')
        .select('id,title,description,created_at,public_slug')
        .eq('organisation_id', activeOrg.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
    ]).then(async ([postResult, awardResult, documentResult, eventResult]) => {
      const posts: FeedItem[] = await Promise.all(
        (postResult.data ?? []).map(async (post: any) => {
          let signed_url: string | null = null;
          if (post.attachment_path) {
            const { data } = await supabase.storage
              .from('club-record-files')
              .createSignedUrl(post.attachment_path, 3600);
            signed_url = data?.signedUrl ?? null;
          }
          return {
            id: `news-${post.id}`,
            kind: 'news',
            title: post.title,
            body: post.body,
            date: post.published_at,
            attachment_path: post.attachment_path,
            attachment_name: post.attachment_name,
            attachment_type: post.attachment_type,
            signed_url,
          };
        }),
      );

      const awards: FeedItem[] = (awardResult.data ?? []).map((award: any) => ({
        id: `award-${award.id}`,
        kind: 'award',
        title: `${award.award_types?.name || 'Award'} — ${award.members?.preferred_name || award.members?.first_name || ''} ${award.members?.last_name || ''}`.trim(),
        body: award.citation,
        date: award.awarded_on,
      }));

      const documents: FeedItem[] = (documentResult.data ?? []).map((doc: any) => ({
        id: `document-${doc.id}`,
        kind: 'document',
        title: `${doc.title} uploaded`,
        date: doc.updated_at,
        attachment_path: doc.file_path,
        attachment_name: doc.file_name,
        attachment_type: doc.file_type,
      }));

      const events: FeedItem[] = (eventResult.data ?? []).map((event: any) => ({
        id: `event-${event.id}`,
        kind: 'event',
        title: event.title,
        body: event.description,
        date: event.created_at,
        event_slug: event.public_slug,
      }));

      setItems(
        [...posts, ...awards, ...documents, ...events]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      );
      setLoading(false);

      // Opening News & Updates acknowledges all currently visible updates.
      setTimeout(markSeen, 250);
    });
  }, [activeOrg?.id, profile?.id]);

  async function openDocument(item: FeedItem) {
    if (!item.attachment_path) return;
    const { data, error } = await supabase.storage
      .from('club-record-files')
      .createSignedUrl(item.attachment_path, 120);
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  const meta = {
    news: { label: 'Announcement', icon: Newspaper, className: 'text-primary-700 bg-primary-50' },
    award: { label: 'Recognition', icon: Award, className: 'text-amber-700 bg-amber-50' },
    document: { label: 'Document', icon: FileText, className: 'text-slate-700 bg-slate-100' },
    event: { label: 'Event', icon: Calendar, className: 'text-indigo-700 bg-indigo-50' },
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">News & Updates</h1>
        <p className="mt-1 text-sm text-slate-500">The latest from your club.</p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-white" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState icon={<Newspaper className="h-6 w-6" />} title="No updates yet" description="Published club updates will appear here." />
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
          {items.map((item) => {
            const config = meta[item.kind];
            const Icon = config.icon;
            const isNew = new Date(item.date).getTime() > new Date(seenAt).getTime();

            return (
              <article key={item.id} className="py-4">
                <div className="flex gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isNew && <span className="text-[10px] font-bold uppercase tracking-wide text-primary-700">New</span>}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{config.label}</span>
                      <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                    </div>
                    <h2 className={`mt-1 ${isNew ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{item.title}</h2>
                    {item.body && <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body}</p>}

                    {item.kind === 'document' && item.attachment_path && (
                      <button onClick={() => openDocument(item)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700">
                        <Paperclip className="h-4 w-4" /> Open document
                      </button>
                    )}
                    {item.kind === 'news' && item.signed_url && item.attachment_name && (
                      <a href={item.signed_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700">
                        <Paperclip className="h-4 w-4" /> {item.attachment_name}
                      </a>
                    )}
                    {item.kind === 'event' && (
                      <Link to="/member/events" className="mt-2 inline-flex text-sm font-medium text-primary-700">View event</Link>
                    )}
                  </div>
                  {isNew && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
