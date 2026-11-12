import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "../context/useAuth";
import {supabase} from "../lib/supabaseClient";
export default function SellerAvailabilityPage(){
 const {user,profile,loading:authLoading}=useAuth();
 const [accepting,setAccepting]=useState(true);
 const [capacity,setCapacity]=useState("");
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
 const eligible=!!(user&&profile?.role==="seller"&&profile?.account_status==="active");
 useEffect(()=>{
  if(!eligible){setLoading(false);return;}
  let active=true;
  supabase.from("seller_availability").select("accepting_orders,availability_note,max_active_orders")
   .eq("seller_id",user.id).maybeSingle().then(({data,error:e})=>{
    if(!active)return;
    if(e)setError(e.message);
    else if(data){setAccepting(data.accepting_orders);setNote(data.availability_note||"");setCapacity(data.max_active_orders==null?"":String(data.max_active_orders));}
    setLoading(false);
   });
  return ()=>{active=false;};
 },[eligible,user?.id]);
 async function save(event){
  event.preventDefault();if(!eligible)return;
  setBusy(true);setError("");setMessage("");
  const max=capacity===""?null:Number(capacity);
  if(max!=null&&(!Number.isInteger(max)||max<1||max>50)){
   setError("Capacity must be between 1 and 50 or left blank.");setBusy(false);return;
  }
  const {error:e}=await supabase.from("seller_availability").upsert({
   seller_id:user.id,accepting_orders:accepting,availability_note:note.trim(),
   max_active_orders:max,updated_at:new Date().toISOString()
  });
  if(e)setError(e.message);else setMessage("Availability saved. Existing orders are unaffected.");
  setBusy(false);
 }
 if(authLoading||loading)return <main className="mx-auto max-w-3xl px-4 py-12">Loading availability...</main>;
 if(!eligible)return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold">Seller availability</h1><p>Only active seller accounts may update availability.</p></main>;
 return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-5 sm:py-12">
  <div><h1 className="text-3xl font-bold">Seller availability</h1>
   <p className="mt-2 text-sm text-slate-600">Control whether you accept new orders. Current paid work, deliveries and payouts remain available.</p></div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  {message&&<p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">{message}</p>}
  <form onSubmit={save} className="space-y-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
   <label className="flex min-h-12 items-center gap-3 font-semibold">
    <input type="checkbox" checked={accepting} onChange={e=>setAccepting(e.target.checked)} className="h-5 w-5 accent-teal-700"/>
    Accept new orders
   </label>
   <p className="text-sm text-slate-600">{accepting?"Buyers can place new orders, subject to capacity.":"New orders are temporarily blocked; your existing orders stay active."}</p>
   <label className="block text-sm font-semibold">Maximum open orders (optional)
    <input type="number" min="1" max="50" step="1" value={capacity} onChange={e=>setCapacity(e.target.value)}
     placeholder="No capacity limit" className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/>
   </label>
   <p className="text-xs text-slate-600">Open orders include pending-payment orders, active work, delivered work, revisions and disputes.</p>
   <label className="block text-sm font-semibold">Availability message
    <textarea maxLength={300} value={note} onChange={e=>setNote(e.target.value)}
     placeholder="For example: Available for new projects from next Monday."
     className="mt-2 min-h-24 w-full rounded-xl border p-3 text-base"/>
   </label>
   <button disabled={busy} className="min-h-11 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">
    {busy?"Saving...":"Save availability"}
   </button>
  </form>
  <Link to="/seller-dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Return to seller dashboard</Link>
 </main>;
}