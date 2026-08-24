import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLoader, TableSkeleton } from '@/components/ui/SkeletonLoader';
import { hasPermission } from '@/lib/permissions';
import { formatDate, fullName } from '@/lib/utils';
import { ArrowLeft, ShieldAlert, Activity, Phone, Mail, MapPin, Heart, Users, Plus, Trash2, Award } from 'lucide-react';
import type { Member, MemberEmergencyContact, MemberGuardian, MemberMedicalInfo, MemberActivity } from '@/types/database';
import { Select } from '@/components/ui/FormField';

export function MemberDetail() {
  const { id } = useParams();
  const { activeOrg } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<MemberEmergencyContact[]>([]);
  const [guardians, setGuardians] = useState<MemberGuardian[]>([]);
  const [medical, setMedical] = useState<MemberMedicalInfo | null>(null);
  const [activity, setActivity] = useState<MemberActivity[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id || !activeOrg) return;
    async function load() {
      const { data: m } = await supabase
        .from('members')
        .select('*, memberships(membership_types(*))')
        .eq('id', id!)
        .maybeSingle();
      setMember(m as unknown as Member);

      const { data: ec } = await supabase.from('member_emergency_contacts').select('*').eq('member_id', id!).order('sort_order');
      setEmergencyContacts(ec ?? []);

      const { data: g } = await supabase.from('member_guardians').select('*').eq('member_id', id!).order('sort_order');
      setGuardians(g ?? []);

      const { data: a } = await supabase.from('member_activity').select('*').eq('member_id', id!).order('created_at', { ascending: false });
      setActivity(a ?? []);
      const { data: aw } = await supabase.from('member_awards').select('id,awarded_on,season,citation,visibility,award_types(name)').eq('member_id', id!).order('awarded_on',{ascending:false});
      setAwards(aw ?? []);

      if (hasPermission('members.medical.view')) {
        const { data: med } = await supabase.from('member_medical_information').select('*').eq('member_id', id!).maybeSingle();
        setMedical(med);
      }

      setLoading(false);
    }
    load();
  }, [id, activeOrg]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-8 w-48" />
        <SkeletonLoader lines={3} />
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  if (!member) {
    return (
      <EmptyState title="Member not found" description="This member may have been archived or removed." action={<Link to="/admin/members" className="btn-primary">Back to Member Register</Link>} />
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'personal', label: 'Personal Details' },
    { id: 'contact', label: 'Contact' },
    { id: 'emergency', label: 'Emergency Contacts', visible: hasPermission('members.emergency.view') },
    { id: 'guardians', label: 'Guardians', visible: hasPermission('members.guardians.view') || guardians.length > 0 },
    { id: 'medical', label: 'Medical & Safety', visible: hasPermission('members.medical.view') },
    { id: 'membership', label: 'Membership' },
    { id: 'teams', label: 'Teams' },
    { id: 'awards', label: `Awards (${awards.length})` },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin/members" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Member Register
        </Link>
      </div>

      <PageHeader
        title={fullName(member.first_name, member.last_name, member.preferred_name)}
        description={`${member.member_number} · ${member.email ?? 'No email'}`}
        actions={<StatusBadge status={member.status} />}
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'overview' && <OverviewTab member={member} />}
        {activeTab === 'personal' && <PersonalTab member={member} />}
        {activeTab === 'contact' && <ContactTab member={member} />}
        {activeTab === 'emergency' && <EmergencyTab contacts={emergencyContacts} />}
        {activeTab === 'guardians' && <GuardiansTab guardians={guardians} />}
        {activeTab === 'medical' && <MedicalTab medical={medical} />}
        {activeTab === 'membership' && <MembershipTab member={member} />}
        {activeTab === 'teams' && <TeamsTab memberId={member.id} />}
        {activeTab === 'awards' && <AwardsTab awards={awards} />}
        {activeTab === 'activity' && <ActivityTab activity={activity} />}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value ?? '—'}</span>
    </div>
  );
}

function OverviewTab({ member }: { member: Member }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard title="Membership">
        <InfoRow label="Member Number" value={<span className="font-mono text-xs">{member.member_number}</span>} />
        <InfoRow label="Status" value={<StatusBadge status={member.status} />} />
        <InfoRow label="Type" value={member.memberships?.[0]?.membership_types?.name} />
        <InfoRow label="Member Since" value={formatDate(member.member_since)} />
        <InfoRow label="Paid Until" value={member.paid_until ? formatDate(member.paid_until) : '—'} />
        <InfoRow label="Voting Eligible" value={member.voting_eligible ? 'Yes' : 'No'} />
      </InfoCard>
      <InfoCard title="Contact">
        <InfoRow label="Email" value={member.email} />
        <InfoRow label="Mobile" value={member.mobile} />
        <InfoRow label="City" value={member.city} />
        <InfoRow label="Country" value={member.country} />
      </InfoCard>
    </div>
  );
}

function PersonalTab({ member }: { member: Member }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard title="Personal Details">
        <InfoRow label="Title" value={member.title} />
        <InfoRow label="First Name" value={member.first_name} />
        <InfoRow label="Middle Name" value={member.middle_name} />
        <InfoRow label="Last Name" value={member.last_name} />
        <InfoRow label="Preferred Name" value={member.preferred_name} />
        <InfoRow label="Date of Birth" value={formatDate(member.date_of_birth)} />
        <InfoRow label="Gender" value={member.gender} />
        <InfoRow label="Occupation" value={member.occupation} />
      </InfoCard>
    </div>
  );
}

function ContactTab({ member }: { member: Member }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard title="Address">
        <InfoRow label="Address Line 1" value={member.address_line1} />
        <InfoRow label="Address Line 2" value={member.address_line2} />
        <InfoRow label="Suburb" value={member.suburb} />
        <InfoRow label="City" value={member.city} />
        <InfoRow label="Region" value={member.region} />
        <InfoRow label="Postcode" value={member.postcode} />
        <InfoRow label="Country" value={member.country} />
      </InfoCard>
      <InfoCard title="Phone & Email">
        <InfoRow label="Email" value={member.email} />
        <InfoRow label="Mobile" value={member.mobile} />
        <InfoRow label="Alternative Phone" value={member.alternative_phone} />
      </InfoCard>
    </div>
  );
}

function EmergencyTab({ contacts }: { contacts: MemberEmergencyContact[] }) {
  if (contacts.length === 0) return <EmptyState icon={<Phone className="h-6 w-6" />} title="No emergency contacts" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {contacts.map((c) => (
        <InfoCard key={c.id} title={`Emergency Contact ${c.sort_order + 1}`}>
          <InfoRow label="Full Name" value={c.full_name} />
          <InfoRow label="Relationship" value={c.relationship} />
          <InfoRow label="Mobile" value={c.mobile} />
          <InfoRow label="Alternative Phone" value={c.alternative_phone} />
          <InfoRow label="Email" value={c.email} />
        </InfoCard>
      ))}
    </div>
  );
}

function GuardiansTab({ guardians }: { guardians: MemberGuardian[] }) {
  if (guardians.length === 0) return <EmptyState icon={<Users className="h-6 w-6" />} title="No guardians recorded" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {guardians.map((g) => (
        <InfoCard key={g.id} title={`Guardian ${g.sort_order + 1}${g.is_primary ? ' (Primary)' : ''}`}>
          <InfoRow label="Full Name" value={g.full_name} />
          <InfoRow label="Relationship" value={g.relationship} />
          <InfoRow label="Email" value={g.email} />
          <InfoRow label="Mobile" value={g.mobile} />
          <InfoRow label="Address" value={g.address} />
          <div className="flex flex-wrap gap-2 pt-2">
            {g.is_legal_guardian && <StatusBadge status="active" variant="info">Legal Guardian</StatusBadge>}
            {g.is_billing_contact && <StatusBadge status="active" variant="primary">Billing Contact</StatusBadge>}
            {g.is_emergency_contact && <StatusBadge status="active" variant="success">Emergency Contact</StatusBadge>}
          </div>
        </InfoCard>
      ))}
    </div>
  );
}

function MedicalTab({ medical }: { medical: MemberMedicalInfo | null }) {
  if (!medical) return <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="No medical information recorded" />;
  return (
    <div className="card border-error-200 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-error-600" />
        <h3 className="text-sm font-semibold text-slate-900">Medical & Safety Information</h3>
        <span className="text-xs text-error-600 font-medium">HIGHLY SENSITIVE</span>
      </div>
      <div className="space-y-2">
        <InfoRow label="Medical Conditions" value={medical.medical_conditions} />
        <InfoRow label="Allergies" value={medical.allergies} />
        <InfoRow label="Medication" value={medical.medication} />
        <InfoRow label="Existing Injuries" value={medical.existing_injuries} />
        <InfoRow label="Accessibility Requirements" value={medical.accessibility_requirements} />
        <InfoRow label="Dietary Requirements" value={medical.dietary_requirements} />
        <InfoRow label="Emergency Notes" value={medical.emergency_notes} />
      </div>
    </div>
  );
}

function MembershipTab({ member }: { member: Member }) {
  const memberships = member.memberships ?? [];
  if (memberships.length === 0) return <EmptyState title="No memberships" />;
  return (
    <div className="space-y-3">
      {memberships.map((m) => (
        <div key={m.id} className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{m.membership_types?.name}</p>
              <p className="text-xs text-slate-500">{formatDate(m.start_date)} — {m.end_date ? formatDate(m.end_date) : 'Ongoing'}</p>
            </div>
            <StatusBadge status={m.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({ memberId }: { memberId: string }) {
  const { activeOrg } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [message, setMessage] = useState('');
  const canManage = hasPermission('teams.manage') || hasPermission('members.edit');

  async function load() {
    if (!activeOrg) return;
    const [{ data: memberships }, { data: teamOptions }] = await Promise.all([
      supabase.from('team_members').select('*, teams(name, season, sports(name))').eq('member_id', memberId).order('created_at'),
      supabase.from('teams').select('id,name,season,status').eq('organisation_id', activeOrg.id).eq('status','active').eq('is_archived',false).order('name'),
    ]);
    setTeams(memberships ?? []);
    setOptions(teamOptions ?? []);
  }

  useEffect(() => { load(); }, [memberId, activeOrg?.id]);

  async function addTeam() {
    if (!activeOrg || !selectedTeamId || !canManage) return;
    setMessage('');
    const team = options.find(t => t.id === selectedTeamId);
    const exists = teams.some(t => t.team_id === selectedTeamId);
    if (exists) return setMessage('This member is already assigned to that team.');
    const { error } = await supabase.from('team_members').insert({
      organisation_id: activeOrg.id,
      team_id: selectedTeamId,
      member_id: memberId,
      season: team?.season || null,
      role: 'player',
    });
    if (error) return setMessage(error.message);
    setSelectedTeamId('');
    setMessage('Team assigned.');
    await load();
  }

  async function removeTeam(id: string) {
    if (!canManage || !confirm('Remove this member from the team?')) return;
    const { error } = await supabase.from('team_members').delete().eq('id', id).eq('member_id', memberId);
    if (error) return setMessage(error.message);
    setMessage('Team assignment removed.');
    await load();
  }

  return (
    <div className="space-y-4">
      {canManage && <div className="card p-4"><h3 className="text-sm font-semibold">Assign team</h3><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Select value={selectedTeamId} onChange={e=>setSelectedTeamId(e.target.value)}><option value="">Select an active team</option>{options.map(t=><option key={t.id} value={t.id}>{t.name}{t.season?` · ${t.season}`:''}</option>)}</Select><button type="button" onClick={addTeam} disabled={!selectedTeamId} className="btn-primary whitespace-nowrap"><Plus className="h-4 w-4"/>Add to team</button></div>{message&&<p className="mt-2 text-xs text-slate-600">{message}</p>}</div>}
      {teams.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title="Not in any teams" description={canManage?'Use the selector above to assign a team.':'No team assignment has been recorded.'} /> : <div className="space-y-3">{teams.map((t) => (
        <div key={t.id} className="card flex items-center justify-between gap-3 p-4">
          <div><p className="text-sm font-semibold text-slate-900">{t.teams?.name}</p><p className="text-xs text-slate-500">{t.teams?.sports?.name} · {t.season || t.teams?.season || 'Current'} · {t.role}</p></div>
          {canManage && <button type="button" onClick={()=>removeTeam(t.id)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/>Remove</button>}
        </div>
      ))}</div>}
    </div>
  );
}


function AwardsTab({ awards }: { awards: any[] }) {
  if (awards.length === 0) return <EmptyState icon={<Award className="h-6 w-6" />} title="No awards recorded" description="Awards assigned through Governance → Awards & Recognition will appear here." />;
  return <div className="space-y-3">{awards.map((a:any)=><div key={a.id} className="card flex gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700"><Award className="h-5 w-5"/></div><div><p className="font-semibold text-slate-900">{a.award_types?.name}</p><p className="text-xs text-slate-500">{formatDate(a.awarded_on)}{a.season?` · ${a.season}`:''} · {a.visibility==='members'?'Member-visible':'Private'}</p>{a.citation&&<p className="mt-1 text-sm text-slate-600">{a.citation}</p>}</div></div>)}</div>;
}

function ActivityTab({ activity }: { activity: MemberActivity[] }) {
  if (activity.length === 0) return <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity recorded" />;
  return (
    <div className="space-y-3">
      {activity.map((a) => (
        <div key={a.id} className="flex gap-3 rounded-lg border border-slate-100 p-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50">
            <Activity className="h-4 w-4 text-primary-700" />
          </div>
          <div>
            <p className="text-sm text-slate-900">{a.description}</p>
            <p className="text-xs text-slate-400">{formatDate(a.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
