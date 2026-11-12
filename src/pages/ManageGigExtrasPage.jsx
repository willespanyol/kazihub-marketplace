import {useCallback,useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {useAuth} from "../context/useAuth";
import {supabase} from "../lib/supabaseClient";
const initial={title:"",description:"",price:"",delivery_days_delta:"0",extra_revisions:"0"};
export default function ManageGigExtrasPage(){
 const {id}=useParams(),{user,profile,loading:authLoading}=useAuth();
 const [gig,setGig]=useState(null),[extras,setExtras]=useState([]),[form,setForm]=useState(initial);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!user||!id)return;
  const [g,e]=await Promise.all([
   supabase.from("service_offers").select("id,title,currency,seller_id").eq("id",id).maybeSingle(),
   supabase.from("service_offer_extras").select("*").eq("service_offer_id",id).order("created_at",{ascending:false})
  ]);
  if(g.error||e.error)setError(g.error?.message||e.error?.message);
  else{setGig(g.data);setExtras(e.data||[]);}
 },[user?.id,id]);
 useEffect(()=>{load();},[load]);
 const own=Boolean(user&&profile?.role==="seller"&&profile?.account_status==="active"&&gig?.seller_id===user.id);
 const run=async(fn,msg)=>{
  setBusy(true);setError("");setNotice("");
  try{await fn();await load();setNotice(msg);}
  catch(e){setError(e.message||"Could not save your gig extras.");}
  finally{setBusy(false);}
 };
 const save=e=>{e.preventDefault();if(!own)return;
  if(!form.title.trim()||Number(form.price)<=0){setError("A title and price are required.");return;}
  run(async()=>{
   const {error:saveError}=await supabase.from("service_offer_extras").insert({
    service_offer_id:id,seller_id:user.id,title:form.title.trim(),description:form.description.trim(),
    price:Number(form.price),delivery_days_delta:Number(form.delivery_days_delta),
    extra_revisions:Number(form.extra_revisions),active:true
   });
   if(saveError)throw saveError;setForm(initial);
  },"Gig extra added.");
 };
 const toggle=item=>run(async()=>{
  const {error:e}=await supabase.from("service_offer_extras").update({active:!item.active})
   .eq("id",item.id).eq("seller_id",user.id);if(e)throw e;
 },"Gig extra updated.");
 if(authLoading)return <main className="mx-auto max-w-3xl px-4 py-10">Loading...</main>;
 if(!user)return <main className="mx-auto max-w-3xl px-4 py-10"><Link to="/login" className="text-primary underline">Sign in to manage extras</Link></main>;
 return <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-5">
  <Link className="text-sm font-semibold text-primary underline" to="/seller-dashboard?section=services">Back to My Gigs</Link>
  <h1 className="text-3xl font-bold">Gig extras</h1>
  <p className="text-sm text-slate-600">Offer optional add-ons such as rush delivery, additional revisions or extra deliverables. Buyer totals and the 20% platform commission are verified by the database.</p>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
  {!own?<p className="rounded-xl border p-4">Only the seller who owns this gig can manage its extras.</p>:<>
   <p className="text-sm font-semibold">Gig: {gig.title} · {gig.currency}</p>
   <form onSubmit={save} className="grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2 sm:p-6">
    <h2 className="text-xl font-bold sm:col-span-2">Add an optional extra</h2>
    <label className="text-sm font-semibold sm:col-span-2">Title
     <input required minLength={4} maxLength={100} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
      placeholder="Additional two revisions" className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
    <label className="text-sm font-semibold sm:col-span-2">Description
     <textarea maxLength={800} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
      className="mt-2 min-h-24 w-full rounded-xl border p-3 text-base"/></label>
    <label className="text-sm font-semibold">Extra price ({gig.currency})
     <input type="number" required min="0.01" max="1000000" step="0.01" value={form.price}
      onChange={e=>setForm(f=>({...f,price:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
    <label className="text-sm font-semibold">Extra revisions
     <input type="number" min="0" max="20" step="1" value={form.extra_revisions}
      onChange={e=>setForm(f=>({...f,extra_revisions:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
    <label className="text-sm font-semibold sm:col-span-2">Change delivery by days (negative = faster)
     <input type="number" min="-60" max="60" step="1" value={form.delivery_days_delta}
      onChange={e=>setForm(f=>({...f,delivery_days_delta:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/>
     <span className="mt-1 block text-xs text-slate-500">A rush extra can reduce delivery time; final delivery is never below one day.</span>
    </label>
    <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-50 sm:col-span-2">Add gig extra</button>
   </form>
   <section className="space-y-3"><h2 className="text-xl font-bold">Available extras</h2>
    {extras.length===0&&<p className="rounded-xl border bg-white p-4 text-sm">No extras yet.</p>}
    {extras.map(x=><article key={x.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4">
     <div className="min-w-0 flex-1"><h3 className="font-bold">{x.title} · {gig.currency} {Number(x.price).toFixed(2)}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{x.description}</p>
      <p className="mt-1 text-xs text-slate-600">Delivery: {x.delivery_days_delta>0?"+":""}{x.delivery_days_delta} days · Additional revisions: {x.extra_revisions} · {x.active?"Active":"Paused"}</p>
     </div>
     <button type="button" disabled={busy} onClick={()=>toggle(x)} className="min-h-11 rounded-xl border px-4 text-sm font-semibold">{x.active?"Pause":"Activate"}</button>
    </article>)}
   </section>
  </>}
 </main>;
}