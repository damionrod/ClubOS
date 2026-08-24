import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Award, Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { hasModuleAccess, hasPermission } from '@/lib/permissions';
import { formatDate } from '@/lib/utils';
import { notifySuccess } from '@/lib/notifications';

type AwardType = { id:string; name:string; description:string|null; category:string; is_active:boolean };
type MemberOption = { id:string; member_number:string; first_name:string; last_name:string; preferred_name:string|null; email:string|null };
type AwardRow = { id:string; member_id:string; award_type_id:string; awarded_on:string; award_year:number|null; season:string|null; citation:string|null; notes:string|null; visibility:'members'|'private'; award_types?:{name:string}|null; members?:MemberOption|null };

const emptyType = { name:'', description:'', category:'recognition' };
const emptyAward = { award_type_id:'', member_id:'', awarded_on:new Date().toISOString().slice(0,10), award_year:new Date().getFullYear().toString(), season:'', citation:'', notes:'', visibility:'members' as 'members'|'private' };

export function AwardsRecognition() {
  const { activeOrg, profile } = useAuth();
  const [types,setTypes] = useState<AwardType[]>([]);
  const [members,setMembers] = useState<MemberOption[]>([]);
  const [awards,setAwards] = useState<AwardRow[]>([]);
  const [search,setSearch] = useState('');
  const [typeForm,setTypeForm] = useState(emptyType);
  const [awardForm,setAwardForm] = useState(emptyAward);
  const [editingType,setEditingType] = useState<string|null>(null);
  const [editingAward,setEditingAward] = useState<string|null>(null);
  const [showTypeForm,setShowTypeForm] = useState(false);
  const [showAwardForm,setShowAwardForm] = useState(false);
  const [message,setMessage] = useState('');
  const canManage = hasPermission('awards.manage') || hasModuleAccess('governance','full_admin');

  async function load(){
    if(!activeOrg) return;
    const [{data:t},{data:m},{data:a}] = await Promise.all([
      supabase.from('award_types').select('*').eq('organisation_id',activeOrg.id).order('sort_order').order('name'),
      supabase.from('members').select('id,member_number,first_name,last_name,preferred_name,email').eq('organisation_id',activeOrg.id).eq('is_archived',false).order('first_name'),
      supabase.from('member_awards').select('*,award_types(name),members(id,member_number,first_name,last_name,preferred_name,email)').eq('organisation_id',activeOrg.id).order('awarded_on',{ascending:false}),
    ]);
    setTypes((t??[]) as AwardType[]); setMembers((m??[]) as MemberOption[]); setAwards((a??[]) as unknown as AwardRow[]);
  }
  useEffect(()=>{load();},[activeOrg?.id]);

  const filteredMembers = useMemo(()=>{
    const q=search.toLowerCase().trim();
    if(!q) return members.slice(0,30);
    return members.filter(m=>`${m.member_number} ${m.first_name} ${m.last_name} ${m.preferred_name??''} ${m.email??''}`.toLowerCase().includes(q)).slice(0,50);
  },[members,search]);

  async function saveType(e:FormEvent){e.preventDefault(); if(!activeOrg||!canManage||!typeForm.name.trim())return;
    const payload={organisation_id:activeOrg.id,name:typeForm.name.trim(),description:typeForm.description||null,category:typeForm.category||'recognition',is_active:true};
    const result=editingType?await supabase.from('award_types').update(payload).eq('id',editingType):await supabase.from('award_types').insert(payload);
    if(result.error)return setMessage(result.error.message); setMessage('Award type saved.'); notifySuccess('Award type saved.'); setTypeForm(emptyType);setEditingType(null);setShowTypeForm(false);await load();}
  async function deleteType(id:string){if(!canManage||!confirm('Delete this award type? This is only possible when it has not been used.'))return; const {error}=await supabase.from('award_types').delete().eq('id',id); setMessage(error?.message??'Award type deleted.'); if(!error){notifySuccess('Award type deleted.');await load();}}
  function editType(t:AwardType){setTypeForm({name:t.name,description:t.description??'',category:t.category});setEditingType(t.id);setShowTypeForm(true);}

  async function saveAward(e:FormEvent){e.preventDefault(); if(!activeOrg||!canManage||!awardForm.member_id||!awardForm.award_type_id)return;
    const payload={organisation_id:activeOrg.id,member_id:awardForm.member_id,award_type_id:awardForm.award_type_id,awarded_on:awardForm.awarded_on,award_year:awardForm.award_year?Number(awardForm.award_year):null,season:awardForm.season||null,citation:awardForm.citation||null,notes:awardForm.notes||null,visibility:awardForm.visibility,announced_at:awardForm.visibility==='members'?new Date().toISOString():null,created_by:profile?.id??null};
    const result=editingAward?await supabase.from('member_awards').update(payload).eq('id',editingAward):await supabase.from('member_awards').insert(payload);
    if(result.error)return setMessage(result.error.message); setMessage('Award recorded on the member profile.');setAwardForm(emptyAward);setEditingAward(null);setSearch('');setShowAwardForm(false);await load();}
  function editAward(a:AwardRow){setAwardForm({award_type_id:a.award_type_id,member_id:a.member_id,awarded_on:a.awarded_on,award_year:a.award_year?.toString()??'',season:a.season??'',citation:a.citation??'',notes:a.notes??'',visibility:a.visibility});setEditingAward(a.id);setShowAwardForm(true);setSearch('');}
  async function deleteAward(id:string){if(!canManage||!confirm('Remove this award from the member history?'))return; const {error}=await supabase.from('member_awards').delete().eq('id',id);setMessage(error?.message??'Award removed.');if(!error){notifySuccess('Award removed.');await load();}}

  return <div className="space-y-6">
    <PageHeader title="Awards & Recognition" description="Create award types and build a permanent recognition history for your members." actions={canManage?<div className="flex gap-2"><button className="btn-secondary" onClick={()=>{setShowTypeForm(true);setEditingType(null);setTypeForm(emptyType)}}><Plus className="h-4 w-4"/> Award Type</button><button className="btn-primary" onClick={()=>{setShowAwardForm(true);setEditingAward(null);setAwardForm(emptyAward)}}><Award className="h-4 w-4"/> Give Award</button></div>:undefined}/>
    {message&&<div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</div>}

    {showTypeForm&&<form onSubmit={saveType} className="card space-y-4 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editingType?'Edit Award Type':'New Award Type'}</h2><button type="button" onClick={()=>setShowTypeForm(false)}><X className="h-4 w-4"/></button></div><div className="grid gap-4 md:grid-cols-2"><FormField label="Award name" required><TextInput value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})} placeholder="e.g. Best Bowler"/></FormField><FormField label="Category"><Select value={typeForm.category} onChange={e=>setTypeForm({...typeForm,category:e.target.value})}><option value="recognition">Recognition</option><option value="sporting">Sporting</option><option value="service">Service / Volunteer</option><option value="leadership">Leadership</option><option value="achievement">Achievement</option></Select></FormField></div><FormField label="Description"><TextArea value={typeForm.description} onChange={e=>setTypeForm({...typeForm,description:e.target.value})}/></FormField><button className="btn-primary" type="submit">Save Award Type</button></form>}

    {showAwardForm&&<form onSubmit={saveAward} className="card space-y-4 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editingAward?'Edit Recognition':'Give an Award / Recognition'}</h2><button type="button" onClick={()=>setShowAwardForm(false)}><X className="h-4 w-4"/></button></div>
      <div className="grid gap-4 md:grid-cols-2"><FormField label="Award type" required><Select value={awardForm.award_type_id} onChange={e=>setAwardForm({...awardForm,award_type_id:e.target.value})}><option value="">Select award…</option>{types.filter(t=>t.is_active).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select></FormField><FormField label="Award date" required><TextInput type="date" value={awardForm.awarded_on} onChange={e=>setAwardForm({...awardForm,awarded_on:e.target.value})}/></FormField></div>
      <FormField label="Find member" required helpText="Search by member name, member number or email."><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><TextInput className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members…"/></div><div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">{filteredMembers.map(m=>{const selected=awardForm.member_id===m.id;return <button type="button" key={m.id} onClick={()=>setAwardForm({...awardForm,member_id:m.id})} className={`flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 ${selected?'bg-primary-50 text-primary-800':'hover:bg-slate-50'}`}><span><b>{m.preferred_name||m.first_name} {m.last_name}</b><span className="ml-2 text-xs text-slate-400">{m.member_number}</span></span>{selected&&<span className="text-xs font-semibold">Selected</span>}</button>})}</div></FormField>
      <div className="grid gap-4 md:grid-cols-3"><FormField label="Award year"><TextInput type="number" min="1900" max="2200" value={awardForm.award_year} onChange={e=>setAwardForm({...awardForm,award_year:e.target.value})}/></FormField><FormField label="Season"><TextInput value={awardForm.season} onChange={e=>setAwardForm({...awardForm,season:e.target.value})} placeholder="2026/27"/></FormField><FormField label="Visibility"><Select value={awardForm.visibility} onChange={e=>setAwardForm({...awardForm,visibility:e.target.value as 'members'|'private'})}><option value="members">Publish to members / News</option><option value="private">Private / internal only</option></Select></FormField></div>
      <FormField label="Recognition / citation"><TextArea value={awardForm.citation} onChange={e=>setAwardForm({...awardForm,citation:e.target.value})} placeholder="Why is this member receiving the award?"/></FormField><FormField label="Internal notes"><TextArea value={awardForm.notes} onChange={e=>setAwardForm({...awardForm,notes:e.target.value})}/></FormField><button className="btn-primary" type="submit">{editingAward?'Save Changes':'Record Award'}</button>
    </form>}

    <div className="grid gap-5 lg:grid-cols-[320px_1fr]"><div className="card p-5"><h2 className="mb-3 font-semibold">Award Types</h2>{types.length===0?<EmptyState title="No award types"/>:<div className="space-y-2">{types.map(t=><div key={t.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs capitalize text-slate-400">{t.category}</p>{t.description&&<p className="mt-1 text-xs text-slate-500">{t.description}</p>}</div>{canManage&&<div className="flex"><button className="p-1.5 text-slate-400 hover:text-primary-700" onClick={()=>editType(t)}><Pencil className="h-4 w-4"/></button><button className="p-1.5 text-slate-400 hover:text-red-600" onClick={()=>deleteType(t.id)}><Trash2 className="h-4 w-4"/></button></div>}</div></div>)}</div>}</div>
    <div className="card overflow-hidden"><div className="border-b p-5"><h2 className="font-semibold">Recognition History</h2><p className="text-xs text-slate-500">Public awards also appear in Member News & Updates.</p></div>{awards.length===0?<EmptyState icon={<Award className="h-6 w-6"/>} title="No awards recorded"/>:<div className="divide-y">{awards.map(a=><div key={a.id} className="flex items-start gap-4 p-4"><div className="rounded-full bg-amber-50 p-2 text-amber-700"><Award className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{a.award_types?.name}</p><p className="text-sm text-slate-700">{a.members?.preferred_name||a.members?.first_name} {a.members?.last_name} <span className="text-xs text-slate-400">· {a.members?.member_number}</span></p><p className="text-xs text-slate-500">{formatDate(a.awarded_on)}{a.season?` · ${a.season}`:''} · {a.visibility==='members'?'Published to members':'Private'}</p>{a.citation&&<p className="mt-1 text-sm text-slate-600">{a.citation}</p>}</div>{canManage&&<div className="flex"><button className="p-2 text-slate-400 hover:text-primary-700" onClick={()=>editAward(a)}><Pencil className="h-4 w-4"/></button><button className="p-2 text-slate-400 hover:text-red-600" onClick={()=>deleteAward(a.id)}><Trash2 className="h-4 w-4"/></button></div>}</div>)}</div>}</div></div>
  </div>;
}
