import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, CreditCard, FileText, Newspaper, ShoppingBag,
  User, Vote
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePendingVotes } from '@/hooks/usePendingVotes';
import { useUnreadUpdates } from '@/hooks/useUnreadUpdates';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { formatCurrency } from '@/lib/utils';
import type { Member } from '@/types/database';

type FeedItem = {
  id: string;
  kind: 'announcement' | 'award' | 'document' | 'event';
  title: string;
  date: string;
  to: string;
};

export function MemberDashboard() {
  const { profile, activeOrg } = useAuth();
  const { currency } = useOrganisationCurrency();
  const { count: pendingVotes } = usePendingVotes(activeOrg?.id);
  const { count: unreadUpdates, seenAt } = useUnreadUpdates(activeOrg?.id, profile?.id);

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [nextEvents, setNextEvents] = useState<any[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (!profile || !activeOrg) return;

    (async () => {
      setLoading(true);

      const { data } = await supabase
        .from('members')
        .select('*, memberships(membership_types(*))')
        .eq('organisation_id', activeOrg.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      setMember(data as unknown as Member);

      const [eventResult, postResult, awardResult, docResult] = await Promise.all([
        supabase
          .from('events')
          .select('id,title,start_at,venue,public_slug,created_at')
          .eq('organisation_id', activeOrg.id)
          .eq('status', 'published')
          .gte('start_at', new Date().toISOString())
          .order('start_at')
          .limit(3),
        supabase
          .from('news_posts')
          .select('id,title,published_at')
          .eq('organisation_id', activeOrg.id)
          .eq('status', 'published')
          .lte('published_at', new Date().toISOString())
          .order('published_at', { ascending: false })
          .limit(5),
        supabase
          .from('member_awards')
          .select('id,awarded_on,award_types(name),members(first_name,last_name,preferred_name)')
          .eq('organisation_id', activeOrg.id)
          .eq('visibility', 'members')
          .order('awarded_on', { ascending: false })
          .limit(5),
        supabase
          .from('club_documents')
          .select('id,title,updated_at')
          .eq('organisation_id', activeOrg.id)
          .in('visibility', ['members', 'public'])
          .order('updated_at', { ascending: false })
          .limit(5),
      ]);

      setNextEvents(eventResult.data ?? []);

      const feedItems: FeedItem[] = [
        ...(postResult.data ?? []).map((post: any) => ({
          id: `post-${post.id}`,
          kind: 'announcement' as const,
          title: post.title,
          date: post.published_at,
          to: '/member/news',
        })),
        ...(awardResult.data ?? []).map((award: any) => ({
          id: `award-${award.id}`,
          kind: 'award' as const,
          title: `${award.award_types?.name || 'Award'} — ${award.members?.preferred_name || award.members?.first_name || ''} ${award.members?.last_name || ''}`.trim(),
          date: award.awarded_on,
          to: '/member/club#awards',
        })),
        ...(docResult.data ?? []).map((doc: any) => ({
          id: `doc-${doc.id}`,
          kind: 'document' as const,
          title: `${doc.title} uploaded`,
          date: doc.updated_at,
          to: '/member/club#documents',
        })),
        ...(eventResult.data ?? []).map((event: any) => ({
          id: `event-${event.id}`,
          kind: 'event' as const,
          title: `${event.title} announced`,
          date: event.created_at,
          to: '/member/events',
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setFeed(feedItems);

      if (data?.id) {
        const [{ data: charges }, { data: donations }] = await Promise.all([
          supabase
            .from('member_subscription_charges')
            .select('amount,status')
            .eq('organisation_id', activeOrg.id)
            .eq('member_id', data.id),
          supabase
            .from('donations')
            .select('amount,status')
            .eq('organisation_id', activeOrg.id)
            .eq('member_id', data.id)
            .eq('status', 'pending'),
        ]);

        const pendingCharges = (charges ?? []).filter((item: any) =>
          ['pending', 'unpaid'].includes(String(item.status).toLowerCase()),
        );
        const pending = [...pendingCharges, ...(donations ?? [])];
        setPendingAmount(pending.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0));
        setPendingCount(pending.length);
      }

      setLoading(false);
    })();
  }, [profile?.id, activeOrg?.id]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />)}</div>;
  }

  if (!member) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white">
        <EmptyState
          icon={<User className="h-6 w-6" />}
          title="No membership found"
          description="You don't have a membership linked to this organisation yet. Contact your club administrator."
        />
      </div>
    );
  }

  const membershipType = (member as any).memberships?.[0]?.membership_types?.name ?? 'Member';
  const displayName = (member as any).preferred_name ?? member.first_name;
  const hasActions = pendingVotes > 0 || pendingCount > 0;

  const feedKind = {
    announcement: 'ANNOUNCEMENT',
    award: 'RECOGNITION',
    document: 'DOCUMENT',
    event: 'EVENT',
  } as const;

  return (
    <div className="space-y-7">
      {/* Compact member header */}
      <section className="flex items-center gap-3">
        <Avatar
          firstName={member.first_name}
          lastName={member.last_name}
          photoUrl={(member as any).photo_url}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-900">{greeting}, {displayName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <span>#{(member as any).member_number}</span>
            <span>·</span>
            <span>{membershipType}</span>
            <span>·</span>
            <StatusBadge status={(member as any).status} />
          </div>
        </div>
      </section>

      {/* Action Required: only when needed */}
      {hasActions && (
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Action Required</p>
          <div className="space-y-2">
            {pendingVotes > 0 && (
              <Link
                to="/member/voting"
                className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
              >
                <Vote className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pendingVotes} motion{pendingVotes === 1 ? '' : 's'} waiting for your vote</p>
                  <p className="text-sm text-red-700">Vote before the motion closes.</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">Vote now</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            )}
            {pendingCount > 0 && (
              <Link
                to="/member/payments"
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
              >
                <CreditCard className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Payment due</p>
                  <p className="text-sm">{pendingCount} outstanding item{pendingCount === 1 ? '' : 's'} · {formatCurrency(pendingAmount, currency)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">Pay now</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {nextEvents.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming</p>
            <Link to="/member/events" className="text-sm font-medium text-primary-700">View all events</Link>
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
            {nextEvents.slice(0, 2).map((event: any) => (
              <Link key={event.id} to="/member/events" className="flex items-center gap-4 py-4">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-lg font-bold text-slate-900">{new Date(event.start_at).getDate()}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {new Date(event.start_at).toLocaleString('en-NZ', { month: 'short' })}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {new Date(event.start_at).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}
                    {event.venue ? ` · ${event.venue}` : ''}
                  </p>
                </div>
                <ChevronRightIcon />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest from club */}
      {feed.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest from the Club</p>
            <Link to="/member/news" className="text-sm font-medium text-primary-700">View all</Link>
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
            {feed.map((item, index) => {
              const isNew = unreadUpdates > 0 && new Date(item.date).getTime() > new Date(seenAt).getTime();
              return (
                <Link key={item.id} to={item.to} className="flex items-start gap-3 py-4">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNew ? 'bg-primary-600' : 'bg-slate-200'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isNew && <span className="text-[10px] font-bold uppercase tracking-wide text-primary-700">New</span>}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{feedKind[item.kind]}</span>
                    </div>
                    <p className={`mt-1 text-sm ${isNew ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(item.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <ChevronRightIcon />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Small quick access, not large cards */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Access</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 sm:grid-cols-4">
          {[
            [User, 'Member Card', '/member/me'],
            [CreditCard, 'Payments', '/member/payments'],
            [FileText, 'Documents', '/member/club#documents'],
            [ShoppingBag, 'Shop', '/member/shop'],
          ].map(([Icon, label, to]: any) => (
            <Link key={label} to={to} className="flex items-center gap-2 py-3.5 text-sm font-medium text-slate-700 hover:text-primary-700">
              <Icon className="h-4 w-4 text-slate-400" />
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChevronRightIcon() {
  return <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />;
}
