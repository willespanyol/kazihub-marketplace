import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const blank = () => ({title:"",description:"",amount:"",due_days:"7"});
export default function OrderMilestonesPanel({order,userId}){
 const [plan,setPlan]=useState(null),[milestones,setMilestones]=useState([]);
 const [draft,setDraft]=useState([blank(),blank()]);
 const [note,setNote]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const seller=userId===order?.seller_id,buyer=userId===order?.buyer_id;
 const load=useCallback(async()=>{
  if(!order?.id)return;
  const {data:p,error:planError}=await supabase.from("order_milestone_plans")
   .select("id,status,created_at,approved_at").eq("order_id",order.id).maybeSingle();
  if(planError){setError(planError.message);return;}
  setPlan(p||null);
  if(p){const {data, error:itemsError}=await supabase.from("order_milestones").select("*").eq("plan_id",p.id).order("sequence_no");
    if(itemsError)setError(itemsError.message);else setMilestones(data||[]);}
  else setMilestones([]);
 },[order?.id]);
 useEffect(()=>{load();},[load]);
 const run=async(action)=>{
  setBusy(true);setError("");setMessage("");
  try{await action();await load();setMessage("Milestone details updated.");}
  catch(err){setError(err.message||"Could not update milestones.");}
  finally{setBusy(false);}
 };
 const sum=draft.reduce((n,v)=>n+(Number(v.amount)||0),0);
 async function propose(event){
  event.preventDefault();
  const items=draft.map(x=>({...x,amount:Number(x.amount),due_days:Number(x.due_days)}));
  await run(async()=>{
   const {error:e}=await supabase.rpc("propose_order_milestones",{p_order_id:order.id,p_items:items});
   if(e)throw e;
  });
 }
 const changeDraft=(index,key,value)=>setDraft(items=>items.map((v,i)=>i===index?{...v,[key]:value}:v));
 const review=(approve)=>run(async()=>{
  const {error:e}=await supabase.rpc("review_order_milestone_plan",{p_order_id:order.id,p_approve:approve});
  if(e)throw e;
 });
 const progress=(item,action)=>run(async()=>{
  const {error:e}=await supabase.rpc("update_order_milestone_progress",{
   p_milestone_id:item.id,p_action:action,p_note:(note[item.id]||"").trim()
  });
  if(e)throw e;
  setNote(v=>({...v,[item.id]:""}));
 });
 if(!seller&&!buyer)return null;
 return <section aria-label="Order milestones" className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
  <h2 className="text-xl font-bold">Milestone work plan</h2>
  <p className="mt-2 text-sm text-slate-600">Break the order into deliverables for buyer approval. These are progress checkpoints, not separate escrow payments or automatic partial payouts. The full order remains governed by KaziHub's existing payment and payout rules.</p>
  {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  {message&&<p role="status" className="mt-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
  {!plan&&seller&&<form onSubmit={propose} className="mt-4 grid gap-4">
   {draft.map((v,i)=><div key={i} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
    <h3 className="font-semibold sm:col-span-2">Milestone {i+1}</h3>
    <label className="text-sm font-medium sm:col-span-2">Deliverable
     <input required minLength={3} maxLength={120} value={v.title} onChange={e=>changeDraft(i,"title",e.target.value)}
      className="mt-1 min-h-11 w-full rounded-lg border p-3 text-base"/></label>
    <label className="text-sm font-medium sm:col-span-2">Scope and acceptance criteria
     <textarea required minLength={10} maxLength={1500} value={v.description} onChange={e=>changeDraft(i,"description",e.target.value)}
      className="mt-1 min-h-24 w-full rounded-lg border p-3 text-base"/></label>
    <label className="text-sm font-medium">Amount ({order.currency})
     <input required type="number" min="0.01" step="0.01" value={v.amount} onChange={e=>changeDraft(i,"amount",e.target.value)}
      className="mt-1 min-h-11 w-full rounded-lg border p-3 text-base"/></label>
    <label className="text-sm font-medium">Due within days of starting
     <input required type="number" min="1" max="365" step="1" value={v.due_days} onChange={e=>changeDraft(i,"due_days",e.target.value)}
      className="mt-1 min-h-11 w-full rounded-lg border p-3 text-base"/></label>
   </div>)}
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={draft.length>=10} onClick={()=>setDraft(v=>[...v,blank()])}
      className="min-h-11 rounded-lg border px-4 text-sm font-semibold">Add milestone</button>
    <button type="button" disabled={draft.length<=2} onClick={()=>setDraft(v=>v.slice(0,-1))}
      className="min-h-11 rounded-lg border px-4 text-sm font-semibold">Remove last</button>
   </div>
   <p className="text-sm font-semibold">Allocated: {order.currency} {sum.toFixed(2)} / {Number(order.price).toFixed(2)}</p>
   <button disabled={busy||Math.abs(sum-Number(order.price))>0.001} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-50">Submit plan to buyer</button>
  </form>}
  {!plan&&buyer&&<p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">No milestone plan yet. The seller may propose one.</p>}
  {plan&&<div className="mt-4 space-y-3">
   <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold capitalize">Plan status: {plan.status}</p>
   {plan.status==="rejected"&&<p className="text-sm text-amber-800">The plan was rejected. Contact KaziHub support to revise the agreed scope. Existing order terms remain unchanged.</p>}
   {milestones.map(m=><div key={m.id} className="rounded-xl border p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{m.sequence_no}. {m.title}</h3><span className="text-sm font-semibold capitalize">{m.status.replaceAll("_"," ")}</span></div>
    <p className="mt-2 whitespace-pre-wrap text-sm">{m.description}</p>
    <p className="mt-2 text-sm text-slate-600">{order.currency} {Number(m.amount).toFixed(2)} · {m.due_days} days</p>
    {m.submission_note&&<p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">Seller's submission: {m.submission_note}</p>}
    {m.review_note&&<p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">Buyer's review: {m.review_note}</p>}
    {plan.status==="approved"&&order.payment_status==="paid"&&
       ((seller&&["planned","revision_requested"].includes(m.status))||(buyer&&m.status==="submitted"))&&
       <div className="mt-3 grid gap-2">
        <label className="text-sm font-medium">Review or delivery note
         <textarea value={note[m.id]||""} onChange={e=>setNote(v=>({...v,[m.id]:e.target.value}))}
          minLength={10} maxLength={1500} placeholder="Describe delivered files, findings, or requested corrections."
          className="mt-1 min-h-24 w-full rounded-lg border p-3 text-base"/></label>
        <div className="flex flex-wrap gap-2">
        {seller&&<button type="button" disabled={busy||(note[m.id]||"").trim().length<10}
          onClick={()=>progress(m,"submit")} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-50">Submit milestone</button>}
        {buyer&&<><button type="button" disabled={busy||(note[m.id]||"").trim().length<10}
          onClick={()=>progress(m,"approve")} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-50">Approve progress</button>
         <button type="button" disabled={busy||(note[m.id]||"").trim().length<10}
          onClick={()=>progress(m,"revision")} className="min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50">Request changes</button></>}
        </div>
       </div>}
   </div>)}
   {plan.status==="proposed"&&buyer&&<div className="flex flex-wrap gap-2">
    <button type="button" disabled={busy} onClick={()=>review(true)} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white">Approve work plan</button>
    <button type="button" disabled={busy} onClick={()=>review(false)} className="min-h-11 rounded-xl border px-4 font-semibold">Reject plan</button>
   </div>}
  </div>}
 </section>;
}