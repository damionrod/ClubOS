import { useEffect, useState, type ReactNode } from 'react';
import { User, Shield, Phone, HeartPulse, CreditCard, FileText, Trophy, Bell, Users, Download, ShoppingBag } from 'lucide-react';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
const member={number:'DSC-000001',name:'James Wilson',preferred:'Jim',dob:'15 Mar 1985',email:'james.wilson@example.com',mobile:'+64 21 555 0001',address:'45 Oak Street, Wellington 6011',type:'Senior',status:'Active',since:'1 Sep 2020',paidUntil:'31 Aug 2027',emergency:'Anna Wilson · Spouse · +64 21 555 1010',medical:'Asthma – salbutamol inhaler as required',allergies:'Penicillin',team:'Premier Cricket',position:'Player',award:'Club Service Award 2025'};
function Card({title,children}:{title:string;children:ReactNode}){return <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2><div className="mt-4">{children}</div></div>}
export function MemberMembership(){return <div className="space-y-5"><div><h1 className="text-2xl font-bold">My Membership</h1><p className="text-sm text-slate-500">Sample member record for testing the member portal.</p></div><div className="grid gap-4 sm:grid-cols-3"><Card title="Membership"><p className="text-2xl font-semibold text-primary-700">{member.type}</p><p className="text-sm text-slate-500">{member.status} · #{member.number}</p></Card><Card title="Member since"><p className="text-lg font-semibold">{member.since}</p><p className="text-sm text-slate-500">Voting eligible</p></Card><Card title="Paid until"><p className="text-lg font-semibold">{member.paidUntil}</p><p className="text-sm text-success-600">Paid in full</p></Card></div><Card title="Participation & recognition"><div className="grid gap-3 sm:grid-cols-2"><p><Trophy className="inline h-4 w-4 mr-2"/>{member.team} · {member.position}</p><p><Shield className="inline h-4 w-4 mr-2"/>{member.award}</p></div></Card></div>}
function LegacyReadOnlyMemberProfile(){return <div className="space-y-5"><div><h1 className="text-2xl font-bold">My Profile</h1><p className="text-sm text-slate-500">Personal, emergency and health information.</p></div><Card title="Personal details"><div className="grid gap-4 sm:grid-cols-2">{[['Name',member.name],['Preferred name',member.preferred],['Date of birth',member.dob],['Email',member.email],['Mobile',member.mobile],['Address',member.address]].map(([a,b])=><div key={a}><p className="text-xs uppercase text-slate-400">{a}</p><p className="text-sm font-medium">{b}</p></div>)}</div></Card><Card title="Emergency contact"><p><Phone className="inline h-4 w-4 mr-2"/>{member.emergency}</p></Card><Card title="Medical & accessibility"><div className="space-y-2 text-sm"><p><HeartPulse className="inline h-4 w-4 mr-2"/><b>Medical:</b> {member.medical}</p><p><b>Allergies:</b> {member.allergies}</p><p><b>Dietary:</b> No special requirements</p></div></Card></div>}
export function MemberPayments(){const {currency}=useOrganisationCurrency();const rows:[string,string,number,string,string][]=[['INV-2026-0198','2026/27 Senior Membership',220,'Paid','Stripe'],['EVT-2026-0084','Awards Night Ticket',85,'Paid','POLi'],['ORD-2026-0031','Club Cap',25,'Paid','Card'],['DON-2026-0014','Junior Equipment Donation',100,'Paid','Card']];const paid=rows.reduce((n,r)=>n+r[2],0);return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Payments</h1><p className="text-sm text-slate-500">Fees, tickets, merchandise and donations.</p></div><div className="grid grid-cols-2 gap-3"><Card title="Paid this year"><p className="text-2xl font-semibold">{formatCurrency(paid,currency)}</p></Card><Card title="Outstanding"><p className="text-2xl font-semibold">{formatCurrency(0,currency)}</p></Card></div><Card title="Transaction history"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-slate-400">{['Reference','Description','Amount','Status','Method'].map(x=><th className="py-2 pr-4" key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr className="border-t" key={i}><td className="py-3 pr-4">{r[0]}</td><td className="py-3 pr-4">{r[1]}</td><td className="py-3 pr-4">{formatCurrency(r[2],currency)}</td><td className="py-3 pr-4">{r[3]}</td><td className="py-3 pr-4">{r[4]}</td></tr>)}</tbody></table></div></Card></div>}
export function MemberMore(){
  const {activeOrg}=useAuth();
  const [documents,setDocuments]=useState<any[]>([]);
  const [loadingDocs,setLoadingDocs]=useState(true);

  useEffect(()=>{
    if(!activeOrg)return;
    setLoadingDocs(true);
    supabase.from('club_documents')
      .select('id,title,category,version,review_date,file_path,file_name')
      .eq('organisation_id',activeOrg.id)
      .in('visibility',['members','public'])
      .order('title')
      .then(({data})=>{setDocuments(data??[]);setLoadingDocs(false);});
  },[activeOrg?.id]);

  async function openDocument(doc:any){
    if(!doc.file_path)return;
    const {data,error}=await supabase.storage.from('club-record-files').createSignedUrl(doc.file_path,120);
    if(error){alert(error.message);return;}
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }

  const links=[
    [User,'My Profile','Personal details, photo and contacts','/member/profile'],
    [Users,'Membership','Membership and team information','/member/membership'],
    [CreditCard,'Payments','Fees, subscriptions and receipts','/member/payments'],
    [ShoppingBag,'Shop','Browse club merchandise','/member/merchandise'],
    [HeartPulse,'Donate','Make a donation to the club','/member/donations'],
  ];

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold text-slate-900">More</h1><p className="mt-1 text-sm text-slate-500">Your account and other club services.</p></div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {links.map(([Icon,title,desc,href]:any)=>
        <a href={href} key={title} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300">
          <Icon className="h-5 w-5 text-primary-600"/>
          <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{desc}</p>
        </a>
      )}
    </div>

    <div id="documents" className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary-600"/><h2 className="font-semibold text-slate-900">Club Documents</h2></div>
      <div className="mt-3">
        {loadingDocs?<p className="text-sm text-slate-500">Loading documents…</p>:documents.length===0?
          <p className="text-sm text-slate-500">No member documents are currently available.</p>:
          <div className="divide-y divide-slate-100">{documents.map((d:any)=>
            <button key={d.id} disabled={!d.file_path} onClick={()=>openDocument(d)} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-primary-700 disabled:opacity-60">
              <span className="min-w-0"><span className="block truncate font-medium">{d.title}</span><span className="block truncate text-xs text-slate-500">{d.category||'Document'}{d.version?` · ${d.version}`:''}</span></span>
              <Download className="h-4 w-4 shrink-0"/>
            </button>
          )}</div>}
      </div>
    </div>
  </div>;
}
