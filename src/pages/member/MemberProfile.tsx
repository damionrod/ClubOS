import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Award, Camera, Image as ImageIcon, Save, Trash2, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';

type MemberRow = {
  id: string;
  organisation_id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  photo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  email: string | null;
  mobile: string | null;
  alternative_phone: string | null;
};

type Emergency = { id?: string; full_name: string; relationship: string; mobile: string; alternative_phone: string; email: string };
type Medical = { id?: string; medical_conditions: string; allergies: string; medication: string; existing_injuries: string; accessibility_requirements: string; dietary_requirements: string; emergency_notes: string };
type TeamOption = { id:string; name:string; season:string|null };

const emptyEmergency: Emergency = { full_name: '', relationship: '', mobile: '', alternative_phone: '', email: '' };
const emptyMedical: Medical = { medical_conditions: '', allergies: '', medication: '', existing_injuries: '', accessibility_requirements: '', dietary_requirements: '', emergency_notes: '' };

export function MemberProfile() {
  const { user, activeOrg, refresh } = useAuth();
  const [member, setMember] = useState<MemberRow | null>(null);
  const [emergency, setEmergency] = useState<Emergency>(emptyEmergency);
  const [medical, setMedical] = useState<Medical>(emptyMedical);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [message, setMessage] = useState('');
  const [awards, setAwards] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !activeOrg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      // First repair/resolve the signed-in member link. This supports older demo
      // databases where the member row existed before the Auth account was linked.
      const { data: linkedMemberId, error: linkError } = await supabase.rpc('ensure_my_member_link', { p_org_id: activeOrg.id });
      if (linkError) console.warn('Member link repair:', linkError.message);

      let memberQuery = supabase
        .from('members')
        .select('id,organisation_id,member_number,first_name,last_name,preferred_name,date_of_birth,occupation,photo_url,address_line1,address_line2,suburb,city,region,postcode,country,email,mobile,alternative_phone')
        .eq('organisation_id', activeOrg.id);
      memberQuery = linkedMemberId ? memberQuery.eq('id', linkedMemberId) : memberQuery.eq('user_id', user.id);
      const { data: memberData, error: memberError } = await memberQuery.maybeSingle();
      if (memberError) {
        if (!cancelled) setError(memberError.message);
        if (!cancelled) setLoading(false);
        return;
      }
      if (!memberData) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [{ data: emergencyData }, { data: medicalData }, { data: teamOptions }, { data: currentTeam }, { data: awardData }] = await Promise.all([
        supabase.from('member_emergency_contacts').select('id,full_name,relationship,mobile,alternative_phone,email').eq('member_id', memberData.id).order('sort_order').limit(1).maybeSingle(),
        supabase.from('member_medical_information').select('id,medical_conditions,allergies,medication,existing_injuries,accessibility_requirements,dietary_requirements,emergency_notes').eq('member_id', memberData.id).maybeSingle(),
        supabase.from('teams').select('id,name,season').eq('organisation_id', activeOrg.id).eq('status','active').eq('is_archived',false).order('name'),
        supabase.from('team_members').select('team_id').eq('member_id', memberData.id).eq('role','player').limit(1).maybeSingle(),
        supabase.from('member_awards').select('id,awarded_on,award_year,season,citation,visibility,award_types(name,description)').eq('member_id', memberData.id).order('awarded_on',{ascending:false}),
      ]);
      if (!cancelled) {
        setMember(memberData as MemberRow);
        setTeams((teamOptions ?? []) as TeamOption[]);
        setTeamId(currentTeam?.team_id ?? '');
        setAwards(awardData ?? []);
        setPhotoPreview(memberData.photo_url ?? '');
        setEmergency(emergencyData ? {
          id: emergencyData.id,
          full_name: emergencyData.full_name ?? '', relationship: emergencyData.relationship ?? '', mobile: emergencyData.mobile ?? '', alternative_phone: emergencyData.alternative_phone ?? '', email: emergencyData.email ?? '',
        } : emptyEmergency);
        setMedical(medicalData ? {
          id: medicalData.id,
          medical_conditions: medicalData.medical_conditions ?? '', allergies: medicalData.allergies ?? '', medication: medicalData.medication ?? '', existing_injuries: medicalData.existing_injuries ?? '', accessibility_requirements: medicalData.accessibility_requirements ?? '', dietary_requirements: medicalData.dietary_requirements ?? '', emergency_notes: medicalData.emergency_notes ?? '',
        } : emptyMedical);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, activeOrg?.id]);

  const initials = useMemo(() => member ? `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}` : '', [member]);
  const updateMember = (key: keyof MemberRow, value: string) => setMember(m => m ? { ...m, [key]: value } : m);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!member || !activeOrg) return;
    setSaving(true); setError(''); setMessage('');
    try {
      let photoUrl = member.photo_url;
      if (photo) {
        const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${activeOrg.id}/${member.id}/profile.${ext}`;
        const { error: uploadError } = await supabase.storage.from('member-photos').upload(path, photo, { upsert: true, contentType: photo.type || undefined });
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from('member-photos').getPublicUrl(path).data.publicUrl;
      }

      const { error: memberError } = await supabase.from('members').update({
        first_name: member.first_name.trim(), last_name: member.last_name.trim(), preferred_name: member.preferred_name || null,
        date_of_birth: member.date_of_birth || null, occupation: member.occupation || null, photo_url: photoUrl,
        address_line1: member.address_line1 || null, address_line2: member.address_line2 || null, suburb: member.suburb || null,
        city: member.city || null, region: member.region || null, postcode: member.postcode || null, country: member.country || null,
        email: member.email || null, mobile: member.mobile || null, alternative_phone: member.alternative_phone || null,
      }).eq('id', member.id).eq('user_id', user?.id ?? '');
      if (memberError) throw memberError;

      if (emergency.id) {
        const { error: emergencyError } = await supabase.from('member_emergency_contacts').update({
          full_name: emergency.full_name, relationship: emergency.relationship || null, mobile: emergency.mobile || null,
          alternative_phone: emergency.alternative_phone || null, email: emergency.email || null,
        }).eq('id', emergency.id).eq('member_id', member.id);
        if (emergencyError) throw emergencyError;
      } else if (emergency.full_name.trim()) {
        const { data, error: emergencyError } = await supabase.from('member_emergency_contacts').insert({
          organisation_id: activeOrg.id, member_id: member.id, full_name: emergency.full_name.trim(), relationship: emergency.relationship || null,
          mobile: emergency.mobile || null, alternative_phone: emergency.alternative_phone || null, email: emergency.email || null, sort_order: 0,
        }).select('id').single();
        if (emergencyError) throw emergencyError;
        setEmergency(v => ({ ...v, id: data.id }));
      }

      const hasMedical = Object.entries(medical).some(([k, v]) => k !== 'id' && Boolean(v));
      if (medical.id) {
        const { error: medicalError } = await supabase.from('member_medical_information').update({
          medical_conditions: medical.medical_conditions || null, allergies: medical.allergies || null, medication: medical.medication || null,
          existing_injuries: medical.existing_injuries || null, accessibility_requirements: medical.accessibility_requirements || null,
          dietary_requirements: medical.dietary_requirements || null, emergency_notes: medical.emergency_notes || null,
        }).eq('id', medical.id).eq('member_id', member.id);
        if (medicalError) throw medicalError;
      } else if (hasMedical) {
        const { data, error: medicalError } = await supabase.from('member_medical_information').insert({
          organisation_id: activeOrg.id, member_id: member.id,
          medical_conditions: medical.medical_conditions || null, allergies: medical.allergies || null, medication: medical.medication || null,
          existing_injuries: medical.existing_injuries || null, accessibility_requirements: medical.accessibility_requirements || null,
          dietary_requirements: medical.dietary_requirements || null, emergency_notes: medical.emergency_notes || null,
        }).select('id').single();
        if (medicalError) throw medicalError;
        setMedical(v => ({ ...v, id: data.id }));
      }

      // Members may maintain their own player-team assignment. Other role assignments
      // such as captain/manager are left untouched.
      const { error: clearTeamError } = await supabase.from('team_members').delete().eq('member_id', member.id).eq('role', 'player');
      if (clearTeamError) throw clearTeamError;
      if (teamId) {
        const selectedTeam = teams.find(t => t.id === teamId);
        const { error: addTeamError } = await supabase.from('team_members').insert({
          organisation_id: activeOrg.id, team_id: teamId, member_id: member.id, season: selectedTeam?.season || null, role: 'player'
        });
        if (addTeamError) throw addTeamError;
      }

      await supabase.from('member_activity').insert({ organisation_id: activeOrg.id, member_id: member.id, activity_type: 'profile_updated', description: 'Member updated their profile details' });
      if (photoUrl && user) {
        await supabase.from('profiles').update({ avatar_url: photoUrl, updated_at: new Date().toISOString() }).eq('id', user.id);
      }
      setMember(m => m ? { ...m, photo_url: photoUrl } : m);
      setPhotoPreview(photoUrl ?? '');
      setPhoto(null);
      setMessage('Your profile has been updated successfully.');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto() {
    if (!member || !activeOrg || !user || !photo) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${activeOrg.id}/${member.id}/profile.${ext}`;
      const { error: uploadError } = await supabase.storage.from('member-photos').upload(path, photo, { upsert: true, contentType: photo.type || undefined });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('member-photos').getPublicUrl(path).data.publicUrl;
      const { error: memberError } = await supabase.from('members').update({ photo_url: publicUrl }).eq('id', member.id).eq('user_id', user.id);
      if (memberError) throw memberError;
      await supabase.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id);
      setMember(m => m ? { ...m, photo_url: publicUrl } : m);
      setPhotoPreview(publicUrl); setPhoto(null); setMessage('Profile photo uploaded successfully.');
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to upload your profile photo.');
    } finally { setSaving(false); }
  }

  async function removePhoto() {
    if (!member) return;
    setError(''); setMessage('');
    const { error: updateError } = await supabase.from('members').update({ photo_url: null }).eq('id', member.id).eq('user_id', user?.id ?? '');
    if (!updateError && user) await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (updateError) { setError(updateError.message); return; }
    setMember({ ...member, photo_url: null }); setPhoto(null); setPhotoPreview(''); setMessage('Profile photo removed.');
  }

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse" />)}</div>;
  if (!member) return <div className="card p-6"><h1 className="text-xl font-bold">My Profile</h1><p className="mt-2 text-sm text-slate-500">No member record is linked to this login. Please contact your club administrator.</p></div>;

  return <form onSubmit={save} className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">My Profile</h1><p className="text-sm text-slate-500">Update your contact, emergency and health information.</p></div><button disabled={saving} className="btn-primary"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save Changes'}</button></div>
    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

    <section className="card p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">Profile photo</h2><p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP, up to 5 MB.</p></div><span className="text-xs text-slate-400">#{member.member_number}</span></div><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{photoPreview ? <img src={photoPreview} alt="Profile" className="h-full w-full object-cover"/> : initials ? <span className="text-2xl font-bold text-slate-400">{initials}</span> : <UserRound className="h-10 w-10 text-slate-300"/>}</div>
      <div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"><Camera className="h-4 w-4"/>Choose photo<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0]??null;if(f&&f.size>5*1024*1024){setError('Profile photo must be 5 MB or smaller.');return;}setPhoto(f);if(f)setPhotoPreview(URL.createObjectURL(f));}}/></label>{photo && <button type="button" disabled={saving} onClick={uploadPhoto} className="btn-primary"><ImageIcon className="h-4 w-4"/>Upload photo</button>}{photoPreview && <button type="button" onClick={removePhoto} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-red-600"><Trash2 className="h-4 w-4"/>Remove</button>}</div>
    </div></section>

    <section className="card p-5"><h2 className="font-semibold">Personal & contact details</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <FormField label="First name" required><TextInput required value={member.first_name} onChange={e=>updateMember('first_name',e.target.value)}/></FormField>
      <FormField label="Last name" required><TextInput required value={member.last_name} onChange={e=>updateMember('last_name',e.target.value)}/></FormField>
      <FormField label="Preferred name"><TextInput value={member.preferred_name ?? ''} onChange={e=>updateMember('preferred_name',e.target.value)}/></FormField>
      <FormField label="Date of birth"><TextInput type="date" value={member.date_of_birth ?? ''} onChange={e=>updateMember('date_of_birth',e.target.value)}/></FormField>
      <FormField label="Contact email"><TextInput type="email" value={member.email ?? ''} onChange={e=>updateMember('email',e.target.value)}/></FormField>
      <FormField label="Mobile"><TextInput value={member.mobile ?? ''} onChange={e=>updateMember('mobile',e.target.value)}/></FormField>
      <FormField label="Alternative phone"><TextInput value={member.alternative_phone ?? ''} onChange={e=>updateMember('alternative_phone',e.target.value)}/></FormField>
      <FormField label="Occupation"><TextInput value={member.occupation ?? ''} onChange={e=>updateMember('occupation',e.target.value)}/></FormField>
      <FormField label="Address line 1"><TextInput value={member.address_line1 ?? ''} onChange={e=>updateMember('address_line1',e.target.value)}/></FormField>
      <FormField label="Address line 2"><TextInput value={member.address_line2 ?? ''} onChange={e=>updateMember('address_line2',e.target.value)}/></FormField>
      <FormField label="Suburb"><TextInput value={member.suburb ?? ''} onChange={e=>updateMember('suburb',e.target.value)}/></FormField>
      <FormField label="City"><TextInput value={member.city ?? ''} onChange={e=>updateMember('city',e.target.value)}/></FormField>
      <FormField label="Region"><TextInput value={member.region ?? ''} onChange={e=>updateMember('region',e.target.value)}/></FormField>
      <FormField label="Postcode"><TextInput value={member.postcode ?? ''} onChange={e=>updateMember('postcode',e.target.value)}/></FormField>
      <FormField label="Country"><TextInput value={member.country ?? ''} onChange={e=>updateMember('country',e.target.value)}/></FormField>
    </div><p className="mt-3 text-xs text-slate-500">Changing the contact email here does not change your ClubOS sign-in email.</p></section>


    <section className="card p-5"><h2 className="font-semibold">Team</h2><p className="mt-1 text-xs text-slate-500">Select the active team you participate in. You can update this later.</p><div className="mt-4 max-w-xl"><FormField label="My team"><Select value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">No team selected</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.season?` · ${t.season}`:''}</option>)}</Select></FormField></div></section>

    <section className="card p-5"><h2 className="font-semibold">Emergency contact</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <FormField label="Full name"><TextInput value={emergency.full_name} onChange={e=>setEmergency(v=>({...v,full_name:e.target.value}))}/></FormField>
      <FormField label="Relationship"><TextInput value={emergency.relationship} onChange={e=>setEmergency(v=>({...v,relationship:e.target.value}))}/></FormField>
      <FormField label="Mobile"><TextInput value={emergency.mobile} onChange={e=>setEmergency(v=>({...v,mobile:e.target.value}))}/></FormField>
      <FormField label="Alternative phone"><TextInput value={emergency.alternative_phone} onChange={e=>setEmergency(v=>({...v,alternative_phone:e.target.value}))}/></FormField>
      <FormField label="Email"><TextInput type="email" value={emergency.email} onChange={e=>setEmergency(v=>({...v,email:e.target.value}))}/></FormField>
    </div></section>

    <section className="card p-5"><h2 className="font-semibold">Medical, dietary & accessibility information</h2><p className="mt-1 text-xs text-slate-500">This information is sensitive. Only provide information your club genuinely needs for your safety and participation.</p><div className="mt-4 grid gap-4 md:grid-cols-2">
      <FormField label="Medical conditions"><TextArea value={medical.medical_conditions} onChange={e=>setMedical(v=>({...v,medical_conditions:e.target.value}))}/></FormField>
      <FormField label="Allergies"><TextArea value={medical.allergies} onChange={e=>setMedical(v=>({...v,allergies:e.target.value}))}/></FormField>
      <FormField label="Medication"><TextArea value={medical.medication} onChange={e=>setMedical(v=>({...v,medication:e.target.value}))}/></FormField>
      <FormField label="Existing injuries"><TextArea value={medical.existing_injuries} onChange={e=>setMedical(v=>({...v,existing_injuries:e.target.value}))}/></FormField>
      <FormField label="Accessibility requirements"><TextArea value={medical.accessibility_requirements} onChange={e=>setMedical(v=>({...v,accessibility_requirements:e.target.value}))}/></FormField>
      <FormField label="Dietary requirements"><TextArea value={medical.dietary_requirements} onChange={e=>setMedical(v=>({...v,dietary_requirements:e.target.value}))}/></FormField>
      <div className="md:col-span-2"><FormField label="Emergency notes"><TextArea value={medical.emergency_notes} onChange={e=>setMedical(v=>({...v,emergency_notes:e.target.value}))}/></FormField></div>
    </div></section>

    <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-amber-600"/><div><h2 className="font-semibold text-slate-900">Awards & Recognition</h2><p className="text-xs text-slate-500">Your permanent recognition history with {activeOrg?.trading_name}.</p></div></div>{awards.length===0?<p className="text-sm text-slate-500">No awards or recognition recorded yet.</p>:<div className="space-y-3">{awards.map((a:any)=><div key={a.id} className="rounded-lg border border-amber-100 bg-amber-50/40 p-4"><p className="font-semibold text-slate-900">{a.award_types?.name}</p><p className="text-xs text-slate-500">{new Date(a.awarded_on).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}{a.season?` · ${a.season}`:''}</p>{a.citation&&<p className="mt-2 text-sm text-slate-600">{a.citation}</p>}</div>)}</div>}</section>
  </form>;
}
