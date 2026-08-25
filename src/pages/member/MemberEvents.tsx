import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, QrCode, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface EventRow {
  id: string; title: string; description: string | null; venue: string | null;
  start_at: string; status: string; banner_url?: string | null; public_slug?: string | null;
  event_ticket_types?: { id: string; name: string; price: number; member_price: number | null }[];
}
interface TicketRow { id: string; qr_token: string; status: string; attendee_name: string; events: any; event_ticket_types: any }

export function MemberEvents() {
  const { activeOrg, profile } = useAuth();
  const { currency } = useOrganisationCurrency();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'calendar' | 'tickets' | 'past'>('upcoming');

  useEffect(() => {
    if (!activeOrg) return;

    supabase
      .from('events')
      .select('*,event_ticket_types(*)')
      .eq('organisation_id', activeOrg.id)
      .eq('status', 'published')
      .order('start_at')
      .then(({ data }) => setEvents((data ?? []) as EventRow[]));

    if (profile) {
      supabase
        .from('members')
        .select('id')
        .eq('organisation_id', activeOrg.id)
        .eq('user_id', profile.id)
        .maybeSingle()
        .then(({ data: member }) => {
          if (!member) return;
          supabase
            .from('event_tickets')
            .select('*,events(title,start_at,venue),event_ticket_types(name)')
            .eq('member_id', member.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => setTickets((data ?? []) as TicketRow[]));
        });
    }
  }, [activeOrg?.id, profile?.id]);

  const now = Date.now();
  const upcoming = useMemo(() => events.filter((event) => new Date(event.start_at).getTime() >= now), [events]);
  const past = useMemo(() => [...events].filter((event) => new Date(event.start_at).getTime() < now).reverse(), [events]);

  const tabs = [
    ['upcoming', 'Upcoming'],
    ['calendar', 'Calendar'],
    ['tickets', 'My Tickets'],
    ['past', 'Past Events'],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <p className="mt-1 text-sm text-slate-500">Club events, registrations and your tickets.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
              tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tickets' && (
        tickets.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">You do not have any event tickets yet.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4" key={ticket.id}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{ticket.events?.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{ticket.event_ticket_types?.name} · {ticket.attendee_name}</p>
                    <p className="mt-2 text-xs font-semibold uppercase text-slate-400">{ticket.status}</p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-500">{ticket.qr_token}</p>
                  </div>
                  <img
                    className="h-24 w-24 shrink-0 rounded border bg-white p-1"
                    alt="Ticket QR code"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(ticket.qr_token)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'calendar' && (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No upcoming events.</p>
          ) : upcoming.map((event) => (
            <div key={event.id} className="flex items-center gap-4 py-4">
              <div className="w-12 shrink-0 text-center">
                <p className="text-lg font-bold">{new Date(event.start_at).getDate()}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">{new Date(event.start_at).toLocaleString('en-NZ', { month: 'short' })}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{event.title}</p>
                <p className="text-sm text-slate-500">{new Date(event.start_at).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}{event.venue ? ` · ${event.venue}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(tab === 'upcoming' || tab === 'past') && (
        <div className="space-y-3">
          {(tab === 'upcoming' ? upcoming : past).length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {tab === 'upcoming' ? 'No upcoming events. New club events will appear here.' : 'No past events to show.'}
            </p>
          ) : (
            (tab === 'upcoming' ? upcoming : past).map((event) => (
              <article key={event.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col sm:flex-row">
                  {event.banner_url && <img src={event.banner_url} alt={`${event.title} banner`} className="h-40 w-full object-cover sm:h-auto sm:w-48" />}
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex gap-3">
                      <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" />
                      <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900">{event.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {new Date(event.start_at).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {event.venue ?? 'Venue TBC'}</p>
                      </div>
                    </div>

                    {event.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{event.description}</p>}

                    {tab === 'upcoming' && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {event.event_ticket_types?.map((type) => (
                            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-800" key={type.id}>
                              <Ticket className="mr-1 inline h-3 w-3" />
                              {type.name}: {Number(type.member_price ?? type.price) === 0 ? 'Free' : formatCurrency(Number(type.member_price ?? type.price), currency)}
                            </span>
                          ))}
                        </div>
                        <a className="btn-primary mt-4 inline-flex" href={event.public_slug ? `/events/${event.public_slug}` : '#'}>
                          <QrCode className="h-4 w-4" /> View Details
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
