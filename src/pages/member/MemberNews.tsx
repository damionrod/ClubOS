import { useEffect, useState } from 'react';
import { Award, Newspaper, Paperclip } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { useUnreadUpdates } from '@/hooks/useUnreadUpdates';

type NewsAward = {
  id:string; awarded_on:string; citation:string|null; season:string|null;
  award_types?:{name:string}|null;
  members?:{first_name:string;last_name:string;preferred_name:string|null;photo_url:string|null}|null
};
type NewsPost = {
  id:string; title:string; body:string; published_at:string;
  attachment_path:string|null; attachment_name:string|null; attachment_type:string|null;
  signed_url?:string|null;
};

export function MemberNews(){
  const {activeOrg,profile}=useAuth();
  const {markSeen}=useUnreadUpdates(activeOrg?.id,profile?.id);
  const [awards,setAwards]=useState<NewsAward[]>([]);
  const [posts,setPosts]=useState<NewsPost[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!activeOrg)return;
    setLoading(true);
    Promise.all([
      supabase.from('member_awards')
        .select('id,awarded_on,citation,season,award_types(name),members(first_name,last_name,preferred_name,photo_url)')
        .eq('organisation_id',activeOrg.id)
        .eq('visibility','members')
        .order('awarded_on',{ascending:false}),
      supabase.from('news_posts')
        .select('id,title,body,published_at,attachment_path,attachment_name,attachment_type')
        .eq('organisation_id',activeOrg.id)
        .eq('status','published')
        .lte('published_at',new Date().toISOString())
        .order('published_at',{ascending:false}),
    ]).then(async([awardResult,postResult])=>{
      setAwards((awardResult.data??[]) as unknown as NewsAward[]);
      const raw=(postResult.data??[]) as NewsPost[];
      const signed=await Promise.all(raw.map(async(post)=>{
        if(!post.attachment_path)return {...post,signed_url:null};
        const {data}=await supabase.storage.from('club-record-files').createSignedUrl(post.attachment_path,3600);
        return {...post,signed_url:data?.signedUrl??null};
      }));
      setPosts(signed);
      setLoading(false);
      markSeen();
    });
  },[activeOrg?.id,profile?.id]);

  const combined=[
    ...posts.map(p=>({kind:'post' as const,date:p.published_at,data:p})),
    ...awards.map(a=>({kind:'award' as const,date:a.awarded_on,data:a})),
  ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());

  return <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">News & Updates</h1>
      <p className="mt-1 text-sm text-slate-500">Club announcements, articles, appointments, awards and member achievements.</p>
    </div>
    {loading?<div className="card h-32 animate-pulse"/>:combined.length===0?
      <div className="card"><EmptyState icon={<Newspaper className="h-6 w-6"/>} title="No updates yet" description="Published club updates will appear here."/></div>:
      <div className="space-y-4">{combined.map(item=>{
        if(item.kind==='award'){
          const a=item.data as NewsAward;
          return <article key={`award-${a.id}`} className="card p-5">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><Award className="h-6 w-6"/></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Award & Recognition</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{a.members?.preferred_name||a.members?.first_name} {a.members?.last_name} — {a.award_types?.name}</h2>
                <p className="mt-1 text-xs text-slate-400">{formatDate(a.awarded_on)}{a.season?` · ${a.season}`:''}</p>
                {a.citation&&<p className="mt-3 text-sm leading-6 text-slate-600">{a.citation}</p>}
              </div>
            </div>
          </article>;
        }
        const post=item.data as NewsPost;
        const isImage=!!post.attachment_type?.startsWith('image/');
        return <article key={`post-${post.id}`} className="card overflow-hidden">
          {isImage&&post.signed_url&&<img src={post.signed_url} alt={post.attachment_name||post.title} className="max-h-96 w-full object-cover"/>}
          <div className="p-5">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"><Newspaper className="h-6 w-6"/></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Club Update</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{post.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{formatDate(post.published_at)}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{post.body}</p>
                {post.attachment_name&&post.signed_url&&!isImage&&
                  <a href={post.signed_url} target="_blank" rel="noreferrer" className="btn-secondary mt-4 inline-flex">
                    <Paperclip className="h-4 w-4"/> {post.attachment_name}
                  </a>}
              </div>
            </div>
          </div>
        </article>;
      })}</div>}
  </div>;
}
