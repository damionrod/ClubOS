import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, ChevronRight, CreditCard, FileText, Heart, Medal, Newspaper,
  Search, ShieldCheck, ShoppingBag, Ticket, User, Users, Vote
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MemberMerchandise } from '@/pages/member/MemberMerchandise';
import { MemberDonations } from '@/pages/member/MemberDonations';
import { formatCurrency } from '@/lib/utils';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';

function MenuRow({
  icon: Icon, title, description, to, badge,
}: {
  icon: any; title: string; description?: string; to: string; badge?: string | number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-b border-slate-100 px-1 py-4 last:border-b-0 hover:text-primary-700"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{title}</p>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {badge !== undefined && badge !== '' && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}

/* CLUB ------------------------------------------------------------------- */
export function MemberClubHub() {
  const { activeOrg } = useAuth();
  const [committee, setCommittee] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [docSearch, setDocSearch] = useState('');

  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([
      supabase
        .from('committee_appointments')
        .select('id,appointed_on,committee_positions(name),members(first_name,last_name,preferred_name,photo_url)')
        .eq('organisation_id', activeOrg.id)
        .eq('status', 'active')
        .order('appointed_on'),
      supabase
        .from('club_documents')
        .select('id,title,category,version,file_path,file_name')
        .eq('organisation_id', activeOrg.id)
        .in('visibility', ['members', 'public'])
        .order('title'),
      supabase
        .from('member_awards')
        .select('id,awarded_on,citation,award_types(name),members(first_name,last_name,preferred_name,photo_url)')
        .eq('organisation_id', activeOrg.id)
        .eq('visibility', 'members')
        .order('awarded_on', { ascending: false })
        .limit(8),
    ]).then(([committeeResult, documentResult, awardResult]) => {
      setCommittee(committeeResult.data ?? []);
      setDocuments(documentResult.data ?? []);
      setAwards(awardResult.data ?? []);
    });
  }, [activeOrg?.id]);

  async function openDocument(doc: any) {
    if (!doc.file_path) return;
    const { data, error } = await supabase.storage
      .from('club-record-files')
      .createSignedUrl(doc.file_path, 120);
    if (error) return;
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) =>
      `${d.title} ${d.category ?? ''} ${d.file_name ?? ''}`.toLowerCase().includes(q),
    );
  }, [documents, docSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Club</h1>
        <p className="mt-1 text-sm text-slate-500">Club information, voting, documents and recognition.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white px-4">
        <MenuRow icon={Vote} title="Motions & Voting" description="Active motions, past motions and your voting history" to="/member/voting" />
        <MenuRow icon={Newspaper} title="News & Updates" description="Announcements and the latest from the club" to="/member/news" />
        <a href="#committee" className="flex items-center gap-3 border-b border-slate-100 px-1 py-4 hover:text-primary-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Users className="h-4.5 w-4.5" /></div>
          <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">Committee</p><p className="mt-0.5 text-sm text-slate-500">Current club committee</p></div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </a>
        <a href="#documents" className="flex items-center gap-3 border-b border-slate-100 px-1 py-4 hover:text-primary-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileText className="h-4.5 w-4.5" /></div>
          <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">Documents</p><p className="mt-0.5 text-sm text-slate-500">Constitution, policies, minutes and reports</p></div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </a>
        <a href="#awards" className="flex items-center gap-3 px-1 py-4 hover:text-primary-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Award className="h-4.5 w-4.5" /></div>
          <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">Awards & Recognition</p><p className="mt-0.5 text-sm text-slate-500">Recent member achievements</p></div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </a>
      </section>

      {committee.length > 0 && (
        <section id="committee">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Committee</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
            {committee.map((row: any) => (
              <div key={row.id} className="flex items-center gap-3 py-3.5">
                <Avatar
                  firstName={row.members?.first_name}
                  lastName={row.members?.last_name}
                  photoUrl={row.members?.photo_url}
                  size="sm"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {row.committee_positions?.name}
                  </p>
                  <p className="font-medium text-slate-900">
                    {row.members?.preferred_name || row.members?.first_name} {row.members?.last_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="documents">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <span className="text-xs text-slate-400">{documents.length} available</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search documents"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
            />
          </div>
          {filteredDocs.length === 0 ? (
            <p className="py-5 text-center text-sm text-slate-500">No documents found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDocs.map((doc: any) => (
                <button
                  type="button"
                  key={doc.id}
                  disabled={!doc.file_path}
                  onClick={() => openDocument(doc)}
                  className="flex w-full items-center gap-3 py-3.5 text-left disabled:opacity-50"
                >
                  <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{doc.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {doc.category || 'Document'}{doc.version ? ` · ${doc.version}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {awards.length > 0 && (
        <section id="awards">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Awards & Recognition</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
            {awards.map((award: any) => (
              <div key={award.id} className="flex gap-3 py-3.5">
                <Medal className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-slate-900">{award.award_types?.name}</p>
                  <p className="text-sm text-slate-600">
                    {award.members?.preferred_name || award.members?.first_name} {award.members?.last_name}
                  </p>
                  {award.citation && <p className="mt-1 text-xs text-slate-500">{award.citation}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* SHOP ------------------------------------------------------------------- */
export function MemberShopHub() {
  const { activeOrg, profile } = useAuth();
  const { currency } = useOrganisationCurrency();
  const [tab, setTab] = useState<'merchandise' | 'orders' | 'donate'>('merchandise');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!activeOrg || !profile) return;
    supabase
      .from('merchandise_orders')
      .select('id,quantity,total_amount,payment_status,selected_size,created_at,merchandise_products(name)')
      .eq('organisation_id', activeOrg.id)
      .eq('purchaser_user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setOrders(data ?? []));
  }, [activeOrg?.id, profile?.id]);

  const tabs = [
    ['merchandise', 'Merchandise'],
    ['orders', 'My Orders'],
    ['donate', 'Donations'],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shop</h1>
        <p className="mt-1 text-sm text-slate-500">Merchandise, orders and donations.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium ${
              tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'merchandise' && <MemberMerchandise compact />}
      {tab === 'donate' && <MemberDonations compact />}
      {tab === 'orders' && (
        <div className="rounded-xl border border-slate-200 bg-white px-4">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No merchandise orders yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{order.merchandise_products?.name || 'Merchandise order'}</p>
                    <p className="text-xs text-slate-500">
                      Qty {order.quantity}
                      {order.selected_size ? ` · Size ${order.selected_size}` : ''}
                      {' · '}
                      {new Date(order.created_at).toLocaleDateString('en-NZ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(order.total_amount || 0), currency)}</p>
                    <p className="text-xs capitalize text-slate-500">{order.payment_status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ME --------------------------------------------------------------------- */
export function MemberMeHub() {
  const { activeOrg, profile } = useAuth();
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    if (!activeOrg || !profile) return;
    supabase
      .from('members')
      .select('id,member_number,first_name,last_name,preferred_name,photo_url,status,member_since,memberships(membership_types(name))')
      .eq('organisation_id', activeOrg.id)
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => setMember(data));
  }, [activeOrg?.id, profile?.id]);

  const membershipType = member?.memberships?.[0]?.membership_types?.name ?? 'Member';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar
          firstName={member?.first_name || profile?.first_name}
          lastName={member?.last_name || profile?.last_name}
          photoUrl={member?.photo_url || profile?.avatar_url}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-900">
            {member?.preferred_name || member?.first_name || profile?.first_name} {member?.last_name || profile?.last_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {member?.member_number ? `Member #${member.member_number}` : 'Member'} · {membershipType}
          </p>
          {member?.status && <div className="mt-2"><StatusBadge status={member.status} /></div>}
        </div>
      </div>

      <Link to="/member/profile" className="btn-primary inline-flex">Edit Profile</Link>

      <section className="rounded-xl border border-slate-200 bg-white px-4">
        <MenuRow icon={User} title="Personal Details" description="Contact, emergency and health information" to="/member/profile" />
        <MenuRow icon={ShieldCheck} title="Membership" description="Membership details and teams/groups" to="/member/membership" />
        <MenuRow icon={CreditCard} title="Payments & Membership Fees" description="Outstanding fees and payment history" to="/member/payments" />
        <MenuRow icon={Ticket} title="My Tickets" description="Event tickets and registrations" to="/member/events" />
        <MenuRow icon={Award} title="Awards & Recognition" description="Your awards and achievements" to="/member/profile" />
      </section>

      {member && (
        <section className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-5 text-white shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-200">{activeOrg?.trading_name}</p>
              <p className="mt-3 text-xl font-bold">
                {member.preferred_name || member.first_name} {member.last_name}
              </p>
              <p className="mt-1 text-sm text-primary-100">Member #{member.member_number}</p>
            </div>
            <StatusBadge status={member.status} variant={member.status === 'active' ? 'success' : 'warning'} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-primary-200">Membership</p><p className="font-semibold">{membershipType}</p></div>
            <div><p className="text-xs text-primary-200">Member since</p><p className="font-semibold">{member.member_since ? new Date(member.member_since).getFullYear() : '—'}</p></div>
          </div>
        </section>
      )}
    </div>
  );
}
