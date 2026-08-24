import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, Calendar, CreditCard, MoreHorizontal, LogOut, ArrowLeft, Vote, Newspaper, ShoppingBag, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useOrganisationBranding } from '@/hooks/useOrganisationBranding';
import { usePendingVotes } from '@/hooks/usePendingVotes';

const desktopNav=[
 {label:'Home',icon:Home,path:'/member'},{label:'Membership',icon:User,path:'/member/membership'},{label:'Events',icon:Calendar,path:'/member/events'},
 {label:'Payments',icon:CreditCard,path:'/member/payments'},{label:'Shop',icon:ShoppingBag,path:'/member/merchandise'},{label:'Donate',icon:Heart,path:'/member/donations'},
 {label:'Voting',icon:Vote,path:'/member/voting'},{label:'News',icon:Newspaper,path:'/member/news'},{label:'More',icon:MoreHorizontal,path:'/member/more'},
];
const mobileNav=[{label:'Home',icon:Home,path:'/member'},{label:'Events',icon:Calendar,path:'/member/events'},{label:'Payments',icon:CreditCard,path:'/member/payments'},{label:'Shop',icon:ShoppingBag,path:'/member/merchandise'},{label:'More',icon:MoreHorizontal,path:'/member/more'}];

export function MemberLayout({children}:{children:ReactNode}){
 const {profile,activeOrg,signOut}=useAuth();const location=useLocation();const {branding}=useOrganisationBranding(activeOrg?.id);const {count:pendingVotes}=usePendingVotes(activeOrg?.id);
 return <div className="flex min-h-screen flex-col bg-slate-50"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white"><div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"><NavLink to="/member" className="flex items-center gap-2">{branding?.logo_url?<img src={branding.logo_url} alt={`${activeOrg?.trading_name??'Club'} logo`} className="h-8 w-8 rounded-lg border bg-white object-contain p-0.5"/>:<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-white">{activeOrg?.trading_name?.[0]??'C'}</div>}<span className="text-sm font-semibold text-slate-900">{activeOrg?.trading_name??'ClubOS'}</span></NavLink><div className="flex items-center gap-2"><NavLink to="/admin" className="text-xs text-slate-400 hover:text-slate-600"><ArrowLeft className="inline h-4 w-4"/> Admin</NavLink><Avatar firstName={profile?.first_name} lastName={profile?.last_name} photoUrl={profile?.avatar_url} size="sm"/><button onClick={signOut} className="text-slate-400 hover:text-error-600"><LogOut className="h-4 w-4"/></button></div></div><div className="hidden border-t lg:block"><nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2">{desktopNav.map(item=>{const Icon=item.icon;return <NavLink key={item.path} to={item.path} end={item.path==='/member'} className={({isActive})=>cn('relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',isActive?'bg-primary-50 text-primary-700':'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}><Icon className="h-4 w-4"/>{item.label}{item.path==='/member/voting'&&pendingVotes>0&&<span className="min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[10px] font-bold leading-5 text-white">{pendingVotes}</span>}</NavLink>})}</nav></div></header><main className="flex-1 pb-20 lg:pb-0"><div className="mx-auto max-w-5xl px-4 py-6">{children}</div></main><nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white lg:hidden"><div className="flex">{mobileNav.map(item=>{const Icon=item.icon;const active=location.pathname===item.path;return <NavLink key={item.path} to={item.path} end={item.path==='/member'} className={({isActive})=>cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-xs',isActive||active?'text-primary-700':'text-slate-400')}><Icon className="h-5 w-5"/>{item.label}</NavLink>})}</div></nav></div>
}
