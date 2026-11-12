import {useCallback,useEffect,useMemo,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useAuth} from "../context/useAuth";
import {supabase} from "../lib/supabaseClient";

export default function MyOffersPage(){
  const {user,profile,loading:authLoading}=useAuth();
  const navigate=useNavigate();
  const [conversationOffers,setConversationOffers]=useState([]);
  const [projectOffers,setProjectOffers]=useState([]);
  const [conversations,setConversations]=useState({});
  const [requests,setRequests]=useState({});
  const [filter,setFilter]=useState("available");
  const [sort,setSort]=useState("latest");
  const [busy,setBusy]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const role=profile?.role;
  const isBuyer=role==="buyer",isSeller=role==="seller";
  const load=useCallback(async()=>{
    if(!user || (!isBuyer&&!isSeller)){setLoading(false);return;}
    setLoading(true);
    const column=isBuyer?"buyer_id":"seller_id";
    const [convo,project]=await Promise.all([
      supabase.from("conversation_offers")
        .select("id,conversation_id,buyer_id,seller_id,description,price,currency,delivery_days,revisions,status,expires_at,accepted_order_id,created_at")
        .eq(column,user.id).order("created_at",{ascending:false}).limit(200),
      supabase.from("custom_offers")
        .select("id,project_request_id,buyer_id,seller_id,message,price,currency,delivery_days,revisions,status,created_at")
        .eq(column,user.id).order("created_at",{ascending:false}).limit(200)
    ]);
    if(convo.error || project.error){setError(convo.error?.message||project.error?.message);setLoading(false);return;}
    setConversationOffers(convo.data||[]);
    setProjectOffers(project.data||[]);
    const conversationIds=[...new Set((convo.data||[]).map(x=>x.conversation_id))];
    const requestIds=[...new Set((project.data||[]).map(x=>x.project_request_id))];
    const [chats,jobs]=await Promise.all([
      conversationIds.length?supabase.from("direct_conversations").select("id,subject").in("id",conversationIds):Promise.resolve({data:[]}),
      requestIds.length?supabase.from("project_requests").select("id,title").in("id",requestIds):Promise.resolve({data:[]})
    ]);
    setConversations(Object.fromEntries((chats.data||[]).map(x=>[x.id,x.subject])));
    setRequests(Object.fromEntries((jobs.data||[]).map(x=>[x.id,x.title])));
    setError("");setLoading(false);
  },[user?.id,isBuyer,isSeller]);
  useEffect(()=>{load();},[load]);
  const items=useMemo(()=>{
    const all=[
      ...conversationOffers.map(o=>({...o,kind:"conversation",title:conversations[o.conversation_id]||"Conversation offer",body:o.description,
       link:`/messages/${o.conversation_id}`,expired:o.status==="submitted"&&new Date(o.expires_at)<=new Date()})),
      ...projectOffers.map(o=>({...o,kind:"project",title:requests[o.project_request_id]||"Project proposal",body:o.message,
       link:isBuyer?"/buyer-dashboard":"/seller-dashboard",expired:false}))
    ];
    return all.filter(o=>filter==="all"||(
      filter==="available"?o.status==="submitted"&&!o.expired:
      filter==="closed"?o.status!=="submitted"||o.expired:o.status===filter
    )).sort((a,b)=>sort==="lowest"?Number(a.price)-Number(b.price):
      sort==="fastest"?a.delivery_days-b.delivery_days:
      new Date(b.created_at)-new Date(a.created_at));
  },[conversationOffers,projectOffers,conversations,requests,filter,sort,isBuyer]);
  async function change(offer,action){
    if(!user)return;
    setBusy(offer.id);setError("");setNotice("");
    try{
      if(action==="accept"){
        const method=offer.kind==="conversation"?"accept_conversation_offer":"accept_custom_offer_order";
        const args=offer.kind==="conversation"?{p_offer_id:offer.id}:{p_offer_id:offer.id};
        const {data,error:acceptError}=await supabase.rpc(method,args);
        if(acceptError)throw acceptError;
        if(!data)throw new Error("The order was not created.");
        navigate(`/orders/${data}`);
        return;
      }
      if(offer.kind!=="conversation")throw new Error("Open your project dashboard to manage this proposal.");
      const {error:changeError}=await supabase.rpc("respond_conversation_offer",{p_offer_id:offer.id,p_action:action});
      if(changeError)throw changeError;
      setNotice("Offer updated.");await load();
    }catch(cause){setError(cause.message||"Could not update offer.");}
    finally{setBusy("");}
  }
  if(authLoading)return <main className="mx-auto max-w-6xl p-6">Loading your proposals...</main>;
  if(!user)return <main className="mx-auto max-w-4xl p-6"><h1 className="text-2xl font-bold">Sign in to see your offers</h1><Link to="/login" className="mt-3 inline-block text-primary underline">Sign in</Link></main>;
  if(!isBuyer&&!isSeller)return <main className="mx-auto max-w-4xl p-6"><h1 className="text-2xl font-bold">Buyer and seller offers</h1><Link to="/admin" className="text-primary underline">Admin dashboard</Link></main>;
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-5 sm:py-12">
    <div><h1 className="text-3xl font-bold">{isBuyer?"Compare your offers":"Your sent offers"}</h1>
      <p className="mt-2 text-sm text-slate-600">Review scope, price, delivery and revisions before deciding. Accepting creates an unpaid order, never an automatic charge.</p>
    </div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
    <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Show
        <select className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="available">Available offers</option><option value="all">All offers</option><option value="accepted">Accepted</option><option value="closed">Closed or expired</option>
        </select>
      </label>
      <label className="text-sm font-semibold">Sort
        <select className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="latest">Newest first</option><option value="lowest">Lowest price</option><option value="fastest">Fastest delivery</option>
        </select>
      </label>
    </div>
    {loading?<p className="rounded-xl border bg-white p-5">Loading offers...</p>:items.length===0?
      <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">No offers match this filter. {isBuyer?"Ask a seller for a custom offer from a conversation.":"Browse project requests or respond to buyer inquiries."}</div>:
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(o=>{
          const available=o.status==="submitted"&&!o.expired;
          return <article key={`${o.kind}-${o.id}`} className="flex min-w-0 flex-col rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">{o.kind==="conversation"?"Conversation offer":"Project proposal"}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{o.expired?"Expired":o.status}</span>
            </div>
            <h2 className="mt-2 text-lg font-bold">{o.title}</h2>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-slate-700">{o.body}</p>
            <p className="mt-4 text-2xl font-bold">{o.currency} {Number(o.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            <p className="mt-2 text-sm text-slate-600">{o.delivery_days} delivery days · {o.revisions} revisions</p>
            <p className="mt-1 text-xs text-slate-600">Platform fee: 20% · Seller share: 80%</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Link to={o.link} className="inline-flex min-h-11 items-center rounded-xl border px-3 py-2 text-sm font-semibold">View details</Link>
              {available&&isBuyer&&<button type="button" disabled={busy===o.id} onClick={()=>change(o,"accept")}
                className="min-h-11 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Accept offer</button>}
              {available&&isBuyer&&o.kind==="conversation"&&<button type="button" disabled={busy===o.id} onClick={()=>change(o,"declined")}
                className="min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold">Decline</button>}
              {available&&isSeller&&o.kind==="conversation"&&<button type="button" disabled={busy===o.id} onClick={()=>change(o,"withdrawn")}
                className="min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold">Withdraw</button>}
              {o.accepted_order_id&&<Link to={`/orders/${o.accepted_order_id}`}
                className="inline-flex min-h-11 items-center rounded-xl border border-teal-600 px-3 py-2 text-sm font-semibold text-primary">Open order</Link>}
            </div>
          </article>;
        })}
      </div>}
  </main>;
}
