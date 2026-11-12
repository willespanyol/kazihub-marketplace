import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const currencies = ["USD","GBP","EUR","KES","CAD","AUD","ZAR","NGN","AED","INR"];

export default function ConversationOffersPanel({ conversation, userId }) {
  const navigate = useNavigate();
  const [offers,setOffers] = useState([]);
  const [description,setDescription] = useState("");
  const [price,setPrice] = useState("");
  const [currency,setCurrency] = useState("USD");
  const [days,setDays] = useState("7");
  const [revisions,setRevisions] = useState("1");
  const [showForm,setShowForm] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const isSeller = userId && userId===conversation?.seller_id;
  const isBuyer = userId && userId===conversation?.buyer_id;
  const canUse = Boolean(isSeller||isBuyer);

  const refresh = useCallback(async () => {
    if (!conversation?.id || !canUse) return;
    const {data,error:fetchError} = await supabase.from("conversation_offers")
      .select("id,description,price,currency,delivery_days,revisions,status,created_at,expires_at,accepted_order_id")
      .eq("conversation_id",conversation.id).order("created_at",{ascending:false}).limit(50);
    if(fetchError)setError(fetchError.message);
    else setOffers(data||[]);
  },[conversation?.id,canUse]);

  useEffect(()=>{
    refresh();
    const refreshTimer=window.setInterval(refresh,15000);
    return ()=>window.clearInterval(refreshTimer);
  },[refresh]);

  const doAction=async(action,success)=>{
    setBusy(true);setError("");setNotice("");
    try{await action();setNotice(success);await refresh();}
    catch(cause){setError(cause?.message||"Request failed. Please retry.");}
    finally{setBusy(false);}
  };

  async function submit(event){
    event.preventDefault();
    const numericPrice=Number(price);
    if(description.trim().length<20 || !(numericPrice>=5) || !(numericPrice<=10000000) ||
       Math.round(numericPrice*100)!==numericPrice*100 || !Number.isInteger(Number(days)) || Number(days)<1 ||
       !Number.isInteger(Number(revisions)) || Number(revisions)<0){
      setError("Enter at least 20 characters of scope, a valid price (two decimals maximum), delivery days and revisions.");
      return;
    }
    await doAction(async()=>{
      const {error:sendError}=await supabase.rpc("create_conversation_offer",{
        p_conversation_id:conversation.id,p_description:description.trim(),p_price:numericPrice,
        p_currency:currency,p_delivery_days:Number(days),p_revisions:Number(revisions)
      });
      if(sendError)throw sendError;
      setDescription("");setPrice("");setShowForm(false);
    },"Offer sent. The buyer can accept it to create an order awaiting payment.");
  }

  async function accept(offer) {
    await doAction(async()=>{
      const {data,error:acceptError}=await supabase.rpc("accept_conversation_offer",{p_offer_id:offer.id});
      if(acceptError)throw acceptError;
      if(!data)throw new Error("The order could not be created.");
      navigate(`/orders/${data}`);
    },"Offer accepted. Proceed to order payment.");
  }

  async function respond(offer,action){
    await doAction(async()=>{
      const {error:responseError}=await supabase.rpc("respond_conversation_offer",{
        p_offer_id:offer.id,p_action:action
      });
      if(responseError)throw responseError;
    },action==="declined"?"Offer declined.":"Offer withdrawn.");
  }

  if(!canUse)return null;
  return <section aria-label="Conversation proposals" className="mb-5 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">Custom offers</h2>
        <p className="mt-1 text-sm text-slate-600">Agree on price, scope and delivery here. Payments remain inside KaziHub.</p></div>
      {isSeller&&<button type="button" disabled={busy} onClick={()=>setShowForm(v=>!v)}
        aria-expanded={showForm} className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
        {showForm?"Cancel":"Send priced offer"}
      </button>}
    </div>
    {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
    {isSeller&&showForm&&<form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border bg-slate-50 p-4">
      <label className="text-sm font-semibold">Scope and deliverables
        <textarea required minLength={20} maxLength={5000} value={description} onChange={event=>setDescription(event.target.value)}
          className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-base"
          placeholder="Describe exactly what the buyer will receive, exclusions, delivery format, and required inputs." />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Price
          <input type="number" min="5" max="10000000" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3 text-base"/>
        </label>
        <label className="text-sm font-semibold">Currency
          <select value={currency} onChange={e=>setCurrency(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3 text-base">
            {currencies.map(item=><option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Delivery days
          <input type="number" min="1" max="365" step="1" required value={days} onChange={e=>setDays(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3 text-base"/>
        </label>
        <label className="text-sm font-semibold">Included revisions
          <input type="number" min="0" max="50" step="1" required value={revisions} onChange={e=>setRevisions(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3 text-base"/>
        </label>
      </div>
      <p className="text-xs text-slate-600">KaziHub retains 20% of the agreed price. The seller receives 80%, before any separately disclosed payment-provider charges. Offers expire after seven days.</p>
      <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy?"Sending...":"Send offer to buyer"}
      </button>
    </form>}
    <div className="mt-4 grid gap-3">
      {offers.length===0&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No custom offers yet. The seller can send a proposal here.</p>}
      {offers.map(o=>{
        const expired=o.status==="submitted"&&new Date(o.expires_at)<=new Date();
        const available=o.status==="submitted"&&!expired;
        return <article key={o.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-bold">{o.currency} {Number(o.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{expired?"expired":o.status}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{o.description}</p>
          <p className="mt-2 text-xs text-slate-600">Delivery: {o.delivery_days} days · {o.revisions} revisions · Sent {new Date(o.created_at).toLocaleDateString()}</p>
          <p className="mt-1 text-xs text-slate-600">KaziHub fee: {o.currency} {(Math.round(Number(o.price)*20)/100).toFixed(2)} · Seller: {o.currency} {(Number(o.price)-Math.round(Number(o.price)*20)/100).toFixed(2)}</p>
          {available&&<div className="mt-3 flex flex-wrap gap-2">
            {isBuyer&&<>
              <button type="button" disabled={busy} onClick={()=>accept(o)}
                className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Accept & create order
              </button>
              <button type="button" disabled={busy} onClick={()=>respond(o,"declined")}
                className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold">Decline</button>
            </>}
            {isSeller&&<button type="button" disabled={busy} onClick={()=>respond(o,"withdrawn")}
              className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold">Withdraw offer</button>}
          </div>}
          {o.status==="accepted"&&o.accepted_order_id&&<Link to={`/orders/${o.accepted_order_id}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-teal-600 px-4 py-2 text-sm font-semibold text-primary">
            View order & payment
          </Link>}
        </article>;
      })}
    </div>
  </section>;
}
