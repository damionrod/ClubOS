import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Image as ImageIcon, QrCode, Search, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';

type Result = { type:'success'|'used'|'invalid'; title:string; detail:string } | null;

export function EventCheckin(){
  const { activeOrg, profile }=useAuth();
  const [token,setToken]=useState('');
  const [result,setResult]=useState<Result>(null);
  const [scanning,setScanning]=useState(false);
  const [cameraMessage,setCameraMessage]=useState('');
  const scannerRef=useRef<any>(null);
  const scannerId='clubos-qr-reader';

  async function verify(raw:string){
    const clean=raw.trim().split('/').pop()||raw.trim(); if(!clean||!activeOrg)return;
    const {data,error}=await supabase.from('event_tickets').select('id,status,attendee_name,checked_in_at,events(title),event_ticket_types(name)').eq('organisation_id',activeOrg.id).eq('qr_token',clean).maybeSingle();
    if(error||!data){setResult({type:'invalid',title:'Invalid ticket',detail:'No ticket was found for this club.'});return;}
    const d:any=data;
    if(d.status==='used'||d.checked_in_at){setResult({type:'used',title:'Already checked in',detail:`${d.attendee_name} · ${d.events?.title??'Event'} · first scan ${new Date(d.checked_in_at).toLocaleString()}`});return;}
    if(d.status!=='valid'){setResult({type:'invalid',title:'Ticket not valid',detail:`This ticket is ${d.status}.`});return;}
    const now=new Date().toISOString();
    const {error:updateError}=await supabase.from('event_tickets').update({status:'used',checked_in_at:now,checked_in_by:profile?.id??null,checkin_method:'qr'}).eq('id',d.id).eq('status','valid');
    if(updateError){setResult({type:'invalid',title:'Could not check in',detail:updateError.message});return;}
    setResult({type:'success',title:'Check-in successful',detail:`${d.attendee_name} · ${d.event_ticket_types?.name??'Ticket'} · ${d.events?.title??'Event'}`}); setToken('');
  }

  async function stop(){
    const scanner=scannerRef.current;
    scannerRef.current=null;
    if(scanner){try{if(scanner.isScanning)await scanner.stop();}catch{} try{await scanner.clear();}catch{}}
    setScanning(false);
  }

  async function start(){
    setResult(null); setCameraMessage('');
    try{
      if(!navigator.mediaDevices?.getUserMedia){throw new Error('Camera access is not available in this browser. Use QR image upload or manual ticket code instead.');}
      const { Html5Qrcode }=await import('html5-qrcode');
      await stop();
      const scanner=new Html5Qrcode(scannerId, { verbose:false }); scannerRef.current=scanner;
      const cameras=await Html5Qrcode.getCameras();
      if(!cameras.length)throw new Error('No camera was found. You can upload a QR image or enter the ticket code manually.');
      const rear=cameras.find((c:any)=>/back|rear|environment/i.test(c.label)) || cameras[cameras.length-1];
      setScanning(true);
      await scanner.start(rear.id,{fps:10,qrbox:{width:220,height:220},aspectRatio:1.333},async(text:string)=>{await stop();await verify(text);},()=>{});
    }catch(e:any){await stop();setCameraMessage(e?.message??'Camera could not start. Try QR image upload or manual check-in.');}
  }

  async function scanImage(file:File|null){
    if(!file)return; setResult(null); setCameraMessage('');
    try{
      const { Html5Qrcode }=await import('html5-qrcode');
      await stop();
      const scanner=new Html5Qrcode(scannerId,{verbose:false}); scannerRef.current=scanner;
      const decoded=await scanner.scanFile(file,true);
      await scanner.clear(); scannerRef.current=null;
      await verify(decoded);
    }catch(e:any){setResult({type:'invalid',title:'QR code not found',detail:'We could not read a QR code from that image. Try another photo or enter the ticket code manually.'});}
  }

  useEffect(()=>()=>{void stop();},[]);

  return <div className="space-y-6"><PageHeader title="Event Check-in" description="Cross-browser QR scanning with camera, image upload and manual fallback."/><div className="grid gap-6 lg:grid-cols-2"><div className="card p-5"><div className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary-700"/><h2 className="font-semibold">QR scanner</h2></div>
    <div className="mt-4 min-h-64 overflow-hidden rounded-xl bg-slate-950"><div id={scannerId} className="min-h-64 w-full"/></div>
    <div className="mt-4 flex flex-wrap gap-2">{scanning?<button type="button" className="btn-secondary" onClick={()=>void stop()}>Stop camera</button>:<button type="button" className="btn-primary" onClick={()=>void start()}><Camera className="h-4 w-4"/> Start camera</button>}
      <label className="btn-secondary cursor-pointer"><ImageIcon className="h-4 w-4"/> Scan QR image<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>void scanImage(e.target.files?.[0]??null)}/></label>
    </div>
    {cameraMessage&&<div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{cameraMessage}</div>}
    <p className="mt-2 text-xs text-slate-500">Camera scanning requires HTTPS and camera permission. On older or restricted browsers, use “Scan QR image” or the manual ticket code.</p>
    <div className="mt-6 border-t pt-5"><label className="text-sm font-medium">Manual ticket code</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input className="input min-w-0 flex-1" value={token} onChange={e=>setToken(e.target.value)} placeholder="e.g. CLUBOS-DEMO-VALID-001"/><button type="button" className="btn-secondary" onClick={()=>void verify(token)}><Search className="h-4 w-4"/> Verify</button></div><p className="mt-2 text-xs text-slate-500">Manual entry remains available on every browser and device.</p></div>
  </div><div className="card p-6">{!result?<div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-slate-500"><QrCode className="h-12 w-12"/><p className="mt-3 font-medium">Ready to scan</p><p className="mt-1 text-sm">The result will appear here.</p></div>:<div className={`rounded-xl p-5 ${result.type==='success'?'bg-emerald-50 text-emerald-800':result.type==='used'?'bg-amber-50 text-amber-800':'bg-red-50 text-red-800'}`}>{result.type==='success'?<CheckCircle2 className="h-10 w-10"/>:<XCircle className="h-10 w-10"/>}<h2 className="mt-3 text-xl font-bold">{result.title}</h2><p className="mt-2 text-sm">{result.detail}</p></div>}</div></div></div>;
}
