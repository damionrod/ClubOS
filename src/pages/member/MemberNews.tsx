import { useEffect, useState } from 'react';
import { Award, Newspaper } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

type NewsAward = { id:string; awarded_on:string; citation:string|null; season:string|null; award_types?:{name:string}|null; members?:{first_name:string;last_name:string;preferred_name:string|null;photo_url:string|null}|null };
export function MemberNews(){
 const {activeOrg}=useAuth(); const [items,setItems]=useState<NewsAward[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!activeOrg)return;setLoading(true);supabase.from('member_awards').select('id,awarded_on,citation,season,award_types(name),members(first_name,last_name,preferred_name,photo_url)').eq('organisation_id',activeOrg.id).eq('visibility','members').order('awarded_on',{ascending:false}).then(({data})=>{setItems((data??[]) as unknown as NewsAward[]);setLoading(false);});},[activeOrg?.id]);
 return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-slate-900">News & Updates</h1><p className="mt-1 text-sm text-slate-500">Club recognition, awards and member achievements.</p></div>{loading?<div className="card h-32 animate-pulse"/>:items.length===0?<div className="card"><EmptyState icon={<Newspaper className="h-6 w-6"/>} title="No updates yet" description="Published club awards and recognition will appear here."/></div>:<div className="space-y-3">{items.map(a=><article key={a.id} className="card p-5"><div className="flex gap-4"><div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><Award className="h-6 w-6"/></div><div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Award & Recognition</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{a.members?.preferred_name||a.members?.first_name} {a.members?.last_name} — {a.award_types?.name}</h2><p className="mt-1 text-xs text-slate-400">{formatDate(a.awarded_on)}{a.season?` · ${a.season}`:''}</p>{a.citation&&<p className="mt-3 text-sm leading-6 text-slate-600">{a.citation}</p>}</div></div></article>)}</div>}</div>
}
