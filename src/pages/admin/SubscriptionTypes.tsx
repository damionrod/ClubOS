import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';

type SubscriptionType = {
  id:string; organisation_id:string; name:string; description:string|null; fee:number;
  billing_period:string; is_active:boolean; sort_order:number;
};

const empty = { name:'', description:'', fee:'0', billing_period:'season', is_active:true, sort_order:'0' };

export function SubscriptionTypes(){
  const { activeOrg }=useAuth(); const { currency }=useOrganisationCurrency();
  const [rows,setRows]=useState<SubscriptionType[]>([]); const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState(false); const [editing,setEditing]=useState<SubscriptionType|null>(null); const [form,setForm]=useState<any>(empty); const [error,setError]=useState('');
  async function load(){if(!activeOrg)return;setLoading(true);const {data,error}=await supabase.from('subscription_types').select('*').eq('organisation_id',activeOrg.id).order('sort_order').order('name');if(error)setError(error.message);setRows((data??[]) as SubscriptionType[]);setLoading(false)}
  useEffect(()=>{load()},[activeOrg?.id]);
  function add(){setEditing(null);setForm({...empty,sort_order:String(rows.length+1)});setError('');setOpen(true)}
  function edit(r:SubscriptionType){setEditing(r);setForm({name:r.name,description:r.description??'',fee:String(r.fee),billing_period:r.billing_period,is_active:r.is_active,sort_order:String(r.sort_order)});setError('');setOpen(true)}
  async function save(){if(!activeOrg||!form.name.trim())return;setError('');const payload={organisation_id:activeOrg.id,name:form.name.trim(),description:form.description.trim()||null,fee:Number(form.fee||0),billing_period:form.billing_period,is_active:!!form.is_active,sort_order:Number(form.sort_order||0)};const res=editing?await supabase.from('subscription_types').update(payload).eq('id',editing.id):await supabase.from('subscription_types').insert(payload);if(res.error){setError(res.error.message);return}setOpen(false);load()}
  async function remove(r:SubscriptionType){if(!confirm(`Delete subscription type “${r.name}”?`))return;const {error}=await supabase.from('subscription_types').delete().eq('id',r.id);if(error)alert(error.message);else load()}
  return <div className="space-y-6">
    <PageHeader title="Subscription Types" description="Team-level subscriptions such as Full Time, Part Time, Casual or team-specific fees." actions={<button className="btn-primary" onClick={add}><Plus className="h-4 w-4"/> New Subscription</button>}/>
    {loading?<div className="card h-32 animate-pulse"/>:rows.length===0?<div className="card"><EmptyState icon={<CreditCard className="h-6 w-6"/>} title="No subscription types" description="Create subscriptions used when setting up teams." action={<button className="btn-primary" onClick={add}>New Subscription</button>}/></div>:<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rows.map(r=><div key={r.id} className="card p-5"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{r.name}</h3><p className="mt-1 text-sm text-slate-500">{r.description||'No description'}</p></div><StatusBadge status={r.is_active?'active':'inactive'}/></div><div className="mt-4 rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold">{formatCurrency(Number(r.fee),currency)}</p><p className="text-xs text-slate-500 capitalize">Per {r.billing_period.replace('_',' ')}</p></div><div className="mt-4 flex gap-2"><button className="btn-secondary flex-1" onClick={()=>edit(r)}><Pencil className="h-4 w-4"/> Edit</button><button className="btn-ghost text-red-600" onClick={()=>remove(r)}><Trash2 className="h-4 w-4"/></button></div></div>)}</div>}
    <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Subscription Type':'New Subscription Type'} size="lg" footer={<><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}><div className="grid gap-4 md:grid-cols-2">{error&&<div className="md:col-span-2 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}<FormField label="Subscription name" required className="md:col-span-2"><TextInput value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Full Time, Casual, Premier Team"/></FormField><FormField label="Description" className="md:col-span-2"><TextArea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></FormField><FormField label="Fee"><TextInput type="number" min="0" step="0.01" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})}/></FormField><FormField label="Billing period"><Select value={form.billing_period} onChange={e=>setForm({...form,billing_period:e.target.value})}><option value="season">Season</option><option value="annual">Annual</option><option value="monthly">Monthly</option><option value="term">Term</option><option value="one_off">One-off</option></Select></FormField><FormField label="Status"><Select value={form.is_active?'active':'inactive'} onChange={e=>setForm({...form,is_active:e.target.value==='active'})}><option value="active">Active</option><option value="inactive">Inactive</option></Select></FormField><FormField label="Sort order"><TextInput type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></FormField></div></Modal>
  </div>
}
