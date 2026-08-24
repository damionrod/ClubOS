import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { notifySuccess } from '@/lib/notifications';

type MembershipType = { id:string; name:string; voting_rights:boolean };
type TeamOption = { id:string; name:string; season:string|null; status:string };
type SubscriptionOption={id:string;name:string;fee:number;billing_period:string;season:string|null};

export function AddMember() {
  const { activeOrg } = useAuth();
  const navigate = useNavigate();
  const [types,setTypes] = useState<MembershipType[]>([]);
  const [teams,setTeams] = useState<TeamOption[]>([]);
  const [subscriptions,setSubscriptions]=useState<SubscriptionOption[]>([]);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [photo,setPhoto] = useState<File|null>(null);
  const [photoPreview,setPhotoPreview] = useState('');
  const [form,setForm] = useState({ first_name:'', last_name:'', preferred_name:'', email:'', mobile:'', date_of_birth:'', address_line1:'', suburb:'', city:'', region:'', postcode:'', country:'New Zealand', status:'active', membership_type_id:'', team_id:'', subscription_type_id:'', emergency_name:'', emergency_relationship:'', emergency_mobile:'', medical_conditions:'', allergies:'', dietary_requirements:'', guardian_name:'', guardian_relationship:'Parent', guardian_email:'', guardian_mobile:'' });
  useEffect(()=>{ if(!activeOrg) return; Promise.all([
    supabase.from('membership_types').select('id,name,voting_rights').eq('organisation_id',activeOrg.id).eq('is_active',true).order('sort_order'),
    supabase.from('teams').select('id,name,season,status').eq('organisation_id',activeOrg.id).eq('status','active').eq('is_archived',false).order('name')
  ]).then(([typeResult,teamResult])=>{setTypes((typeResult.data??[]) as MembershipType[]);setTeams((teamResult.data??[]) as TeamOption[]);}); },[activeOrg]);
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));
  useEffect(()=>{
    setSubscriptions([]);
    if(!activeOrg||!form.team_id){set('subscription_type_id','');return;}
    supabase.rpc('get_signup_team_subscriptions',{p_org_id:activeOrg.id,p_team_id:form.team_id}).then(({data,error})=>{
      if(error){setError(error.message);return;}
      const rows=(data??[]) as SubscriptionOption[];setSubscriptions(rows);
      if(rows.length===1)set('subscription_type_id',rows[0].id);
    });
  },[activeOrg?.id,form.team_id]);

  async function submit(e:FormEvent){
    e.preventDefault(); if(!activeOrg) return; setSaving(true); setError('');
    try {
      const { count } = await supabase.from('members').select('id',{count:'exact',head:true}).eq('organisation_id',activeOrg.id);
      const memberNumber = `DSC-${String((count??0)+1).padStart(6,'0')}`;
      const selected = types.find(t=>t.id===form.membership_type_id);
      const { data:member,error:memberErr } = await supabase.from('members').insert({ organisation_id:activeOrg.id, member_number:memberNumber, first_name:form.first_name.trim(), last_name:form.last_name.trim(), preferred_name:form.preferred_name||null, email:form.email||null, mobile:form.mobile||null, date_of_birth:form.date_of_birth||null, address_line1:form.address_line1||null, suburb:form.suburb||null, city:form.city||null, region:form.region||null, postcode:form.postcode||null, country:form.country||null, status:form.status, joined_date:new Date().toISOString().slice(0,10), member_since:new Date().toISOString().slice(0,10), voting_eligible:selected?.voting_rights??false }).select('id').single();
      if(photo){
        const ext=(photo.name.split('.').pop()||'jpg').toLowerCase();
        const path=`${activeOrg.id}/${member.id}/profile.${ext}`;
        const {error:uploadError}=await supabase.storage.from('member-photos').upload(path,photo,{upsert:true,contentType:photo.type||undefined});
        if(uploadError) throw uploadError;
        const {data:urlData}=supabase.storage.from('member-photos').getPublicUrl(path);
        const {error:photoUpdateError}=await supabase.from('members').update({photo_url:urlData.publicUrl}).eq('id',member.id);
        if(photoUpdateError) throw photoUpdateError;
      }
      if(memberErr) throw memberErr;
      if(form.team_id) { const selectedTeam=teams.find(t=>t.id===form.team_id); const selectedSub=subscriptions.find(s=>s.id===form.subscription_type_id); if(subscriptions.length>0&&!form.subscription_type_id) throw new Error('Please select a subscription for the selected team.'); const {error}=await supabase.from('team_members').insert({organisation_id:activeOrg.id,team_id:form.team_id,member_id:member.id,season:selectedTeam?.season||null,role:'player',subscription_type_id:form.subscription_type_id||null,subscription_fee:selectedSub?.fee??null,subscription_status:'active'}); if(error) throw error; }
      if(form.membership_type_id) { const {error}=await supabase.from('memberships').insert({organisation_id:activeOrg.id,member_id:member.id,membership_type_id:form.membership_type_id,status:'active',start_date:new Date().toISOString().slice(0,10)}); if(error) throw error; }
      if(form.emergency_name){ const {error}=await supabase.from('member_emergency_contacts').insert({organisation_id:activeOrg.id,member_id:member.id,full_name:form.emergency_name,relationship:form.emergency_relationship||null,mobile:form.emergency_mobile||null}); if(error) throw error; }
      if(form.medical_conditions||form.allergies||form.dietary_requirements){ const {error}=await supabase.from('member_medical_information').insert({organisation_id:activeOrg.id,member_id:member.id,medical_conditions:form.medical_conditions||null,allergies:form.allergies||null,dietary_requirements:form.dietary_requirements||null}); if(error) throw error; }
      if(form.guardian_name){ const {error}=await supabase.from('member_guardians').insert({organisation_id:activeOrg.id,member_id:member.id,full_name:form.guardian_name,relationship:form.guardian_relationship||null,email:form.guardian_email||null,mobile:form.guardian_mobile||null,is_primary:true,is_legal_guardian:true,is_emergency_contact:true}); if(error) throw error; }
      await supabase.from('member_activity').insert({organisation_id:activeOrg.id,member_id:member.id,activity_type:'member_created',description:'Member record created'});
      notifySuccess('Member created successfully.');
      navigate(`/admin/members/${member.id}`);
    } catch(err:any){ setError(err?.message??'Unable to create member'); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="flex items-center justify-between"><div><button type="button" onClick={()=>navigate('/admin/members')} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="h-4 w-4"/>Member Register</button><h1 className="text-2xl font-bold">Add Member</h1><p className="text-sm text-slate-500">Create a complete member record including membership and safety contacts.</p></div><button disabled={saving} className="btn-primary"><Save className="h-4 w-4"/>{saving?'Saving…':'Save Member'}</button></div>
    {error&&<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="card p-5"><h2 className="font-semibold">Personal & contact details</h2><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <FormField label="First name" required><TextInput required value={form.first_name} onChange={e=>set('first_name',e.target.value)}/></FormField><FormField label="Last name" required><TextInput required value={form.last_name} onChange={e=>set('last_name',e.target.value)}/></FormField><FormField label="Preferred name"><TextInput value={form.preferred_name} onChange={e=>set('preferred_name',e.target.value)}/></FormField>
      <FormField label="Email"><TextInput type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField><FormField label="Mobile"><TextInput value={form.mobile} onChange={e=>set('mobile',e.target.value)}/></FormField><FormField label="Date of birth"><TextInput type="date" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)}/></FormField>
      <FormField label="Address"><TextInput value={form.address_line1} onChange={e=>set('address_line1',e.target.value)}/></FormField><FormField label="Suburb"><TextInput value={form.suburb} onChange={e=>set('suburb',e.target.value)}/></FormField><FormField label="City"><TextInput value={form.city} onChange={e=>set('city',e.target.value)}/></FormField><FormField label="Region"><TextInput value={form.region} onChange={e=>set('region',e.target.value)}/></FormField><FormField label="Postcode"><TextInput value={form.postcode} onChange={e=>set('postcode',e.target.value)}/></FormField><FormField label="Country"><TextInput value={form.country} onChange={e=>set('country',e.target.value)}/></FormField>
    </div></section>

    <section className="card p-5"><h2 className="font-semibold">Member photo</h2><p className="mt-1 text-xs text-slate-500">Upload a clear JPG, PNG or WebP profile photo. Maximum 5 MB.</p><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">{photoPreview?<img src={photoPreview} alt="Member preview" className="h-full w-full object-cover"/>:<ImageIcon className="h-8 w-8 text-slate-300"/>}</div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4"/>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0]||null;if(f&&f.size>5*1024*1024){setError('Member photo must be 5 MB or smaller.');return;}setPhoto(f);setPhotoPreview(f?URL.createObjectURL(f):'')}}/></label>
      {photo&&<button type="button" className="text-sm text-slate-500 hover:text-red-600" onClick={()=>{setPhoto(null);setPhotoPreview('')}}>Remove selected photo</button>}
    </div></section>
    <section className="card p-5"><h2 className="font-semibold">Membership</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><FormField label="Membership type"><Select value={form.membership_type_id} onChange={e=>set('membership_type_id',e.target.value)}><option value="">No membership type</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select></FormField><FormField label="Team" helpText="Optional. The member can change this later from their profile."><Select value={form.team_id} onChange={e=>{set('team_id',e.target.value);set('subscription_type_id','')}}><option value="">No team selected</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.season?` · ${t.season}`:''}</option>)}</Select></FormField>{form.team_id&&<FormField label="Subscription" required={subscriptions.length>0}><Select value={form.subscription_type_id} onChange={e=>set('subscription_type_id',e.target.value)}><option value="">Select subscription</option>{subscriptions.map(s=><option key={s.id} value={s.id}>{s.name} · {Number(s.fee).toFixed(2)}</option>)}</Select></FormField>}<FormField label="Status"><Select value={form.status} onChange={e=>set('status',e.target.value)}><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></Select></FormField></div></section>
    <section className="card p-5"><h2 className="font-semibold">Emergency contact</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><FormField label="Name"><TextInput value={form.emergency_name} onChange={e=>set('emergency_name',e.target.value)}/></FormField><FormField label="Relationship"><TextInput value={form.emergency_relationship} onChange={e=>set('emergency_relationship',e.target.value)}/></FormField><FormField label="Mobile"><TextInput value={form.emergency_mobile} onChange={e=>set('emergency_mobile',e.target.value)}/></FormField></div></section>
    <section className="card p-5"><h2 className="font-semibold">Guardian (for junior members)</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><FormField label="Guardian name"><TextInput value={form.guardian_name} onChange={e=>set('guardian_name',e.target.value)}/></FormField><FormField label="Relationship"><TextInput value={form.guardian_relationship} onChange={e=>set('guardian_relationship',e.target.value)}/></FormField><FormField label="Email"><TextInput type="email" value={form.guardian_email} onChange={e=>set('guardian_email',e.target.value)}/></FormField><FormField label="Mobile"><TextInput value={form.guardian_mobile} onChange={e=>set('guardian_mobile',e.target.value)}/></FormField></div></section>
    <section className="card p-5"><h2 className="font-semibold">Medical & accessibility information</h2><p className="text-xs text-slate-500">Sensitive information — collect only where necessary and with appropriate consent.</p><div className="mt-4 grid gap-4 md:grid-cols-3"><FormField label="Medical conditions"><TextArea value={form.medical_conditions} onChange={e=>set('medical_conditions',e.target.value)}/></FormField><FormField label="Allergies"><TextArea value={form.allergies} onChange={e=>set('allergies',e.target.value)}/></FormField><FormField label="Dietary requirements"><TextArea value={form.dietary_requirements} onChange={e=>set('dietary_requirements',e.target.value)}/></FormField></div></section>
  </form>;
}
