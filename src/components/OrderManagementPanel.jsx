import { useCallback,useEffect,useState } from "react";
import { supabase } from "../lib/supabaseClient";
const steps=[
 ["Order placed","created_at"],
 ["Payment submitted","payment_submitted_at"],
 ["Payment verified","payment_verified_at"],
 ["Work delivered","delivered_at"],
 ["Revision requested","revision_requested_at"],
 ["Order completed","completed_at"],
 ["Payout issued","payout_paid_at"]
];
export default function OrderManagementPanel({order,userId,isAdmin=false}){
 const [requests,setRequests]=useState([]),[reason,setReason]=useState(""),[reply,setReply]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [adminDecisionNote,setAdminDecisionNote]=useState("");
 const participant=userId===order?.buyer_id||userId===order?.seller_id;
 const eligible=participant&&!["completed","cancelled"].includes(order.status)&&order.payout_status!=="paid";
 const load=useCallback(async()=>{
  if(!order?.id)return;
  const {data,error:e}=await supabase.from("order_cancellation_requests")
   .select("id,requested_by,requested_to,reason,status,response_note,created_at,responded_at")
   .eq("order_id",order.id).order("created_at",{ascending:false}).limit(30);
  if(e)setError(e.message);else setRequests(data||[]);
 },[order?.id]);
 useEffect(()=>{load();},[load]);
 const active=requests.find(r=>["pending","agreed","admin_review"].includes(r.status));
 async function run(action){
  setBusy(true);setError("");setSuccess("");
  try{await action();await load();setSuccess("Cancellation request updated.");setReason("");setReply("");}
  catch(e){setError(e.message||"Could not complete your request.");}
  finally{setBusy(false);}
 }
 const request=(event)=>{event.preventDefault();run(async()=>{
  const {error:e}=await supabase.rpc("request_order_cancellation",{p_order_id:order.id,p_reason:reason.trim()});
  if(e)throw e;
 });};
 const adminResolve=(item,cancel)=>run(async()=>{
  const {error:e}=await supabase.rpc("resolve_order_cancellation",{
    p_request_id:item.id,p_cancel_unpaid:cancel,p_note:adminDecisionNote.trim()
  });if(e)throw e;
  setAdminDecisionNote("");
 });
 const respond=(item,agree)=>run(async()=>{
  const {error:e}=await supabase.rpc("respond_order_cancellation",{p_request_id:item.id,p_agree:agree,p_note:reply.trim()});
  if(e)throw e;
 });
 if(!participant&&!isAdmin)return null;
 return <section aria-label="Order timeline and cancellations" className="mt-6 space-y-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
  <div><h2 className="text-xl font-bold">Order timeline</h2>
   <p className="mt-2 text-sm text-slate-600">Dates recorded by KaziHub for the main steps in this order.</p></div>
  <ol className="space-y-3 border-l-2 border-slate-200 pl-5">
   {steps.filter(([,field])=>Boolean(order[field])).map(([label,field])=><li key={field} className="relative">
    <span aria-hidden="true" className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-teal-600"/>
    <p className="text-sm font-semibold">{label}</p>
    <time className="text-xs text-slate-600" dateTime={order[field]}>{new Date(order[field]).toLocaleString()}</time>
   </li>)}
  </ol>
  <div className="border-t pt-5">
   <h3 className="text-lg font-bold">Cancellation requests</h3>
   <p className="mt-2 text-sm text-slate-600">Either party can request cancellation. Approval by the other party does not refund money or immediately close an order. An administrator must review the payment and settlement position first.</p>
   {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
   {success&&<p role="status" className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{success}</p>}
   {requests.map(item=><div key={item.id} className="mt-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <p className="text-sm font-bold capitalize">{item.status.replaceAll("_"," ")}</p>
     <time dateTime={item.created_at} className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time>
    </div>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reason}</p>
    {item.response_note&&<p className="mt-2 text-xs text-slate-600">Response: {item.response_note}</p>}
    {item.status==="pending"&&item.requested_to===userId&&<div className="mt-3 space-y-3">
     <label className="block text-sm font-medium">Response note (optional)
      <textarea maxLength={1000} value={reply} onChange={e=>setReply(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-base" />
     </label>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={()=>respond(item,true)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Agree and request admin review</button>
      <button type="button" disabled={busy} onClick={()=>respond(item,false)} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">Decline</button>
     </div>
    </div>}
    {item.status==="admin_review"&&<p className="mt-2 text-xs font-medium text-amber-800">Awaiting administrator payment/refund review. Do not assume funds have been refunded.</p>}
    {item.status==="admin_review"&&isAdmin&&<div className="mt-3 space-y-3 rounded-lg border bg-slate-50 p-3">
      <p className="text-sm font-semibold">Administrator cancellation decision</p>
      <label className="block text-sm">Decision note
       <textarea minLength={10} maxLength={1000} value={adminDecisionNote} onChange={e=>setAdminDecisionNote(e.target.value)}
        className="mt-1 min-h-20 w-full rounded-lg border bg-white p-3 text-base"/>
      </label>
      <div className="flex flex-wrap gap-2">
       <button type="button" disabled={busy||adminDecisionNote.trim().length<10||
         !["unpaid","payment_rejected"].includes(order.payment_status)||order.status!=="payment_pending"}
        onClick={()=>adminResolve(item,true)} className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
        Cancel unpaid order
       </button>
       <button type="button" disabled={busy||adminDecisionNote.trim().length<10} onClick={()=>adminResolve(item,false)}
        className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">Close request without cancelling order</button>
      </div>
      <p className="text-xs text-slate-600">Paid or payment-submitted orders must have payment/refund status reconciled before cancellation. The system never automatically refunds funds.</p>
    </div>}
   </div>)}
   {requests.length===0&&<p className="mt-3 text-sm text-slate-600">No cancellation requests have been submitted.</p>}
   {eligible&&!active&&<form onSubmit={request} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
    <label className="block text-sm font-semibold">Request an order cancellation
     <textarea required minLength={15} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}
      placeholder="Explain why you want to cancel and what work has already been completed."
      className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-base"/>
    </label>
    <button disabled={busy||reason.trim().length<15} className="min-h-11 rounded-xl border border-red-300 px-4 font-semibold text-red-700 disabled:opacity-50">
     Submit cancellation request
    </button>
   </form>}
  </div>
 </section>;
}