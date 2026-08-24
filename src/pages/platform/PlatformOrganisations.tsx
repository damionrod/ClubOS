import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { notifySuccess } from '@/lib/notifications';

type Plan = { id:string; name:string; description:string|null; price:number; billing_cycle:string; member_limit:number|null; is_active:boolean };
type Organisation = { id:string; legal_name:string; trading_name:string; slug:string; organisation_type:string; email:string|null; city:string|null; country:string; status:string; subscriptions?: Array<{status:string; plan_id:string; subscription_plans?: {name:string; price:number}|null}> };

const emptyForm = { legal_name:'', trading_name:'', slug:'', organisation_type:'sports_club', email:'', phone:'', city:'', region:'', country:'NZ', currency:'NZD', status:'active', plan_id:'' };

export function PlatformOrganisations(){
  const [plans,setPlans]=useState<Plan[]>([]); const [orgs,setOrgs]=useState<Organisation[]>([]); const [q,setQ]=useState('');
  const [open,setOpen]=useState(false); const [form,setForm]=useState(emptyForm); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState('');

  async function load(){
    setLoading(true); setError('');
    const [plansRes,orgsRes]=await Promise.all([
      supabase.from('subscription_plans').select('id,name,description,price,billing_cycle,member_limit,is_active').eq('is_active',true).order('sort_order'),
      supabase.from('organisations').select('id,legal_name,trading_name,slug,organisation_type,email,city,country,status,subscriptions(status,plan_id,subscription_plans(name,price))').order('created_at',{ascending:false})
    ]);
    if(plansRes.error) setError(plansRes.error.message); else setPlans((plansRes.data??[]) as Plan[]);
    if(orgsRes.error) setError(orgsRes.error.message); else setOrgs((orgsRes.data??[]) as unknown as Organisation[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);
  useEffect(()=>{ if(open && !form.plan_id && plans.length) setForm(f=>({...f,plan_id:plans[0].id})); },[open,plans]);
  const shown=useMemo(()=>orgs.filter(o=>`${o.trading_name} ${o.legal_name} ${o.email??''} ${o.city??''}`.toLowerCase().includes(q.toLowerCase())),[orgs,q]);
  const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  async function createOrganisation(){
    if(!form.legal_name.trim()||!form.trading_name.trim()||!form.plan_id){setError('Legal name, trading name and subscription plan are required.');return}
    setSaving(true); setError('');
    const slug=form.slug.trim()||slugify(form.trading_name);
    const {data:org,error:orgError}=await supabase.from('organisations').insert({legal_name:form.legal_name.trim(),trading_name:form.trading_name.trim(),slug,organisation_type:form.organisation_type,email:form.email||null,phone:form.phone||null,city:form.city||null,region:form.region||null,country:form.country,status:form.status}).select('id').single();
    if(orgError){setError(orgError.message);setSaving(false);return}
    const plan=plans.find(p=>p.id===form.plan_id);
    const {error:subError}=await supabase.from('subscriptions').insert({organisation_id:org.id,plan_id:form.plan_id,status:'active',billing_cycle:plan?.billing_cycle??'monthly',start_date:new Date().toISOString()});
    if(subError){await supabase.from('organisations').delete().eq('id',org.id);setError(subError.message);setSaving(false);return}
    const { error: settingsError } = await supabase.from('organisation_settings').insert({organisation_id:org.id,currency:form.currency}).select();
    if(settingsError){await supabase.from('subscriptions').delete().eq('organisation_id',org.id);await supabase.from('organisations').delete().eq('id',org.id);setError(settingsError.message);setSaving(false);return}
    setForm(emptyForm); setOpen(false); setSaving(false); notifySuccess('Organisation created successfully.'); await load();
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Organisations</h1><p className="mt-1 text-sm text-slate-500">Create and manage ClubOS organisations and assign a subscription plan.</p></div><button onClick={()=>{setError('');setForm({...emptyForm,plan_id:plans[0]?.id??''});setOpen(true)}} className="btn-primary inline-flex items-center gap-2"><Plus className="h-4 w-4"/>Create Organisation</button></div>
    {error&&!open&&<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="card p-4"><p className="text-xs uppercase text-slate-400">Organisations</p><p className="mt-1 text-2xl font-semibold">{orgs.length}</p></div><div className="card p-4"><p className="text-xs uppercase text-slate-400">Active Plans</p><p className="mt-1 text-2xl font-semibold">{plans.length}</p></div><div className="card p-4"><p className="text-xs uppercase text-slate-400">Active Organisations</p><p className="mt-1 text-2xl font-semibold">{orgs.filter(o=>o.status==='active').length}</p></div></div>
    <div className="card overflow-hidden"><div className="flex items-center justify-between border-b p-4"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input className="input pl-9" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search organisations…"/></div><button onClick={load} className="ml-3 btn-secondary"><RefreshCw className="h-4 w-4"/></button></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Organisation</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={5} className="p-8 text-center">Loading…</td></tr>:shown.map(o=>{const sub=o.subscriptions?.[0];return <tr key={o.id}><td className="px-4 py-3"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400"/><div><div className="font-medium">{o.trading_name}</div><div className="text-xs text-slate-400">{o.legal_name}</div></div></div></td><td className="px-4 py-3">{sub?.subscription_plans?.name??'No plan'}</td><td className="px-4 py-3">{[o.city,o.country].filter(Boolean).join(', ')||'—'}</td><td className="px-4 py-3">{o.email??'—'}</td><td className="px-4 py-3 capitalize">{o.status}</td></tr>})}</tbody></table></div></div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Create Organisation" size="lg" footer={<><button onClick={()=>setOpen(false)} className="btn-secondary">Cancel</button><button onClick={createOrganisation} disabled={saving} className="btn-primary">{saving?'Creating…':'Create Organisation'}</button></>}>
      <div className="grid gap-4 md:grid-cols-2">{error&&<div className="md:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label><span className="label">Legal name *</span><input className="input" value={form.legal_name} onChange={e=>setForm(f=>({...f,legal_name:e.target.value}))}/></label>
        <label><span className="label">Trading name *</span><input className="input" value={form.trading_name} onChange={e=>setForm(f=>({...f,trading_name:e.target.value,slug:f.slug||slugify(e.target.value)}))}/></label>
        <label><span className="label">Slug</span><input className="input" value={form.slug} onChange={e=>setForm(f=>({...f,slug:slugify(e.target.value)}))}/></label>
        <label><span className="label">Organisation type</span><select className="input" value={form.organisation_type} onChange={e=>setForm(f=>({...f,organisation_type:e.target.value}))}><option value="sports_club">Sports club</option><option value="community_club">Community club</option><option value="association">Association</option><option value="charity">Charity</option><option value="other">Other</option></select></label>
        <label className="md:col-span-2"><span className="label">Subscription plan *</span><select className="input" value={form.plan_id} onChange={e=>setForm(f=>({...f,plan_id:e.target.value}))}><option value="" disabled>Select an active plan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toFixed(2)}/{p.billing_cycle}{p.member_limit?` — up to ${p.member_limit} members`:''}</option>)}</select><span className="mt-1 block text-xs text-slate-500">Plans are loaded live from Platform Admin → Plans.</span></label>
        <label><span className="label">Email</span><input type="email" className="input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></label><label><span className="label">Phone</span><input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></label>
        <label><span className="label">City</span><input className="input" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/></label><label><span className="label">Region</span><input className="input" value={form.region} onChange={e=>setForm(f=>({...f,region:e.target.value}))}/></label>
        <label><span className="label">Country</span><input className="input" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value.toUpperCase()}))}/></label><label><span className="label">Currency *</span><select className="input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>{SUPPORTED_CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}</select><span className="mt-1 block text-xs text-slate-500">Sets the organisation's financial currency across ClubOS.</span></label><label><span className="label">Status</span><select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option></select></label>
      </div>
    </Modal>
  </div>
}
