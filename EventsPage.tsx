import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Plus, QrCode, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EventRow { id:string; title:string; description:string|null; venue:string|null; start_at:string; end_at:string|null; capacity:number|null; status:string; event_ticket_types?: { id:string; name:string; price:number; member_price:number|null; quantity_available:number|null }[]; event_tickets?: { id:string; status:string }[] }

export function EventsPage() {
  const { activeOrg } = useAuth();
  const [events,setEvents] = useState<EventRow[]>([]);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{ if(!activeOrg)return; setLoading(true); supabase.from('events').select('*, event_ticket_types(*), event_tickets(id,status)').eq('organisation_id',activeOrg.id).order('start_at').then(({data})=>{setEvents((data??[]) as EventRow[]);setLoading(false);});},[activeOrg]);
  const totalTickets=useMemo(()=>events.reduce((n,e)=>n+(e.event_tickets?.length??0),0),[events]);
  return <div className="space-y-6">
    <PageHeader title="Events & Ticketing" description={`${events.length} events · ${totalTickets} issued tickets`} actions={<div className="flex gap-2"><Link className="btn-secondary" to="/admin/events/checkin"><QrCode className="h-4 w-4"/> Check-in Scanner</Link><button className="btn-primary" title="Event creation form can be connected next"><Plus className="h-4 w-4"/> New Event</button></div>} />
    <div className="grid gap-4 md:grid-cols-3"><div className="card p-4"><p className="text-xs text-slate-500">Published</p><p className="mt-1 text-2xl font-bold">{events.filter(e=>e.status==='published').length}</p></div><div className="card p-4"><p className="text-xs text-slate-500">Tickets issued</p><p className="mt-1 text-2xl font-bold">{totalTickets}</p></div><div className="card p-4"><p className="text-xs text-slate-500">Checked in</p><p className="mt-1 text-2xl font-bold">{events.reduce((n,e)=>n+(e.event_tickets?.filter(t=>t.status==='used').length??0),0)}</p></div></div>
    {loading?<div className="card h-40 animate-pulse"/>:<div className="grid gap-4 lg:grid-cols-2">{events.map(e=><div key={e.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary-700"/><h3 className="font-semibold text-slate-900">{e.title}</h3></div><p className="mt-2 text-sm text-slate-500">{e.description}</p></div><StatusBadge status={e.status}/></div><div className="mt-4 space-y-2 text-sm text-slate-600"><p>{new Date(e.start_at).toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short'})}</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{e.venue??'Venue TBC'}</p><p className="flex items-center gap-2"><Ticket className="h-4 w-4"/>{e.event_tickets?.length??0} issued · {e.capacity??'Unlimited'} capacity</p></div><div className="mt-4 border-t pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket types</p><div className="mt-2 flex flex-wrap gap-2">{e.event_ticket_types?.map(t=><span key={t.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{t.name}: {Number(t.price)===0?'Free':`$${Number(t.price).toFixed(2)}`}</span>)}</div></div></div>)}</div>}
  </div>;
}
