import {useCallback,useEffect,useMemo,useState} from "react";
import {Link,useLocation,useNavigate} from "react-router-dom";
import {Heart,Search,Star,ShieldCheck,ChevronLeft,ChevronRight,SlidersHorizontal} from "lucide-react";
import {useAuth} from "../context/useAuth";
import {supabase} from "../lib/supabaseClient";

const PAGE_SIZE=12;
const SORT_OPTIONS=[
 ["recommended","Best match"],["newest","Newest"],["top_rated","Highest rated"],
 ["lowest_price","Lowest price"],["highest_price","Highest price"],["fastest_delivery","Fastest delivery"]
];
function initialFilters(search){
 const params=new URLSearchParams(search);
 const n=(key)=>{const v=params.get(key);return v && /^\d+(\.\d{1,2})?$/.test(v)?v:"";};
 const order=params.get("sort")||"recommended";
 return {
  query:(params.get("q")||"").slice(0,100),
  category:params.get("category")||"",
  min:n("min"),max:n("max"),days:n("days"),
  verified:params.get("verified")==="1",
  country:params.get("country")||"",
  sort:SORT_OPTIONS.some(o=>o[0]===order)?order:"recommended",
  page:Math.max(1,Math.min(10000,Number.parseInt(params.get("page")||"1",10)||1))
 };
}
export default function MarketplaceSearchPage(){
 const {user,profile}=useAuth();
 const navigate=useNavigate(),location=useLocation();
 const filters=useMemo(()=>initialFilters(location.search),[location.search]);
 const [queryDraft,setQueryDraft]=useState(filters.query);
 const [offers,setOffers]=useState([]);
 const [categories,setCategories]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [saved,setSaved]=useState([]);
 const [saving,setSaving]=useState("");
 const [total,setTotal]=useState(0);
 useEffect(()=>{setQueryDraft(filters.query)},[filters.query]);
 const navigateFilters=useCallback((updates)=>{
  const next={...filters,...updates};
  const q=new URLSearchParams();
  for(const [key,value] of Object.entries({
   q:next.query,category:next.category,min:next.min,max:next.max,days:next.days,
   verified:next.verified?"1":"",country:next.country,sort:next.sort==="recommended"?"":next.sort,
   page:next.page>1?String(next.page):""
  })){if(value!==""&&value!=null)q.set(key,value);}
  navigate({pathname:"/services",search:q.toString()?"?"+q.toString():""},{replace:false});
 },[filters,navigate]);
 useEffect(()=>{
  let active=true;
  supabase.from("marketplace_categories").select("name").eq("is_active",true)
   .order("display_order",{ascending:true}).then(({data})=>{if(active)setCategories(data||[])});
  return ()=>{active=false};
 },[]);
 useEffect(()=>{
  let alive=true;
  setLoading(true);setError("");
  supabase.rpc("search_marketplace_services",{
   p_query:filters.query,
   p_category:filters.category||null,
   p_min_price:filters.min!==""?Number(filters.min):null,
   p_max_price:filters.max!==""?Number(filters.max):null,
   p_max_delivery_days:filters.days!==""?Number(filters.days):null,
   p_sort:filters.sort,p_page:filters.page,p_page_size:PAGE_SIZE,
   p_verified_only:filters.verified,p_seller_country:filters.country||null
  }).then(({data,error:fetchError})=>{
   if(!alive)return;
   if(fetchError){setError(fetchError.message);setOffers([]);setTotal(0);}
   else {
    setOffers(data||[]);
    setTotal(data?.length?Number(data[0].total_results):0);
   }
   setLoading(false);
  });
  return ()=>{alive=false};
 },[filters]);
 useEffect(()=>{
  let active=true;
  if(!user){setSaved([]);return;}
  supabase.from("saved_services").select("service_offer_id").eq("buyer_id",user.id)
   .then(({data})=>{if(active)setSaved((data||[]).map(row=>row.service_offer_id))});
  return ()=>{active=false};
 },[user?.id]);
 const toggleSaved=async(offer)=>{
  if(!user){navigate("/login");return;}
  if(profile?.role==="seller")return;
  setSaving(offer.id);setError("");
  const wasSaved=saved.includes(offer.id);
  const req=wasSaved
   ?supabase.from("saved_services").delete().eq("buyer_id",user.id).eq("service_offer_id",offer.id)
   :supabase.from("saved_services").insert({buyer_id:user.id,service_offer_id:offer.id});
  const {error:saveError}=await req;
  if(saveError)setError(saveError.message);
  else setSaved(current=>wasSaved?current.filter(id=>id!==offer.id):[...current,offer.id]);
  setSaving("");
 };
 const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 const from=total?(filters.page-1)*PAGE_SIZE+1:0;
 const to=total?Math.min(filters.page*PAGE_SIZE,total):0;
 const update=(key,value)=>navigateFilters({[key]:value,page:1});
 const clear=()=>{setQueryDraft("");navigate({pathname:"/services"})};
 return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
  <div className="mb-6"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find freelance services</h1>
   <p className="mt-2 text-slate-600">Search independent professionals across AI, software, design, business, engineering and more.</p>
  </div>
  <form onSubmit={event=>{event.preventDefault();update("query",queryDraft.trim().slice(0,100))}}
   role="search" className="mb-5 flex flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row">
   <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 focus-within:ring-2 focus-within:ring-teal-600">
    <Search size={20} aria-hidden="true" className="shrink-0 text-slate-500"/>
    <span className="sr-only">Search services</span>
    <input type="search" maxLength={100} value={queryDraft} onChange={event=>setQueryDraft(event.target.value)}
     placeholder="What service do you need?" className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"/>
   </label>
   <button type="submit" className="min-h-12 rounded-xl bg-primary px-6 text-base font-semibold text-white">Search</button>
  </form>
  <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
   <aside aria-label="Search filters" className="h-fit space-y-4 rounded-2xl border bg-white p-4 lg:sticky lg:top-24">
    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal size={17}/> Filters</h2>
     <button type="button" onClick={clear} className="min-h-11 px-2 text-sm font-semibold text-primary underline">Clear all</button></div>
    <label className="block text-sm font-semibold">Category
     <select value={filters.category} onChange={e=>update("category",e.target.value)}
      className="mt-2 min-h-12 w-full rounded-xl border px-3 text-base">
      <option value="">All categories</option>
      {categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
     </select>
    </label>
    <div className="grid grid-cols-2 gap-2">
     <label className="text-sm font-semibold">Min price
      <input type="number" min="0" step="0.01" placeholder="0" aria-label="Minimum price"
       value={filters.min} onChange={e=>update("min",e.target.value)}
       className="mt-2 min-h-12 w-full rounded-xl border px-3 text-base"/>
     </label>
     <label className="text-sm font-semibold">Max price
      <input type="number" min="0" step="0.01" placeholder="Any" aria-label="Maximum price"
       value={filters.max} onChange={e=>update("max",e.target.value)}
       className="mt-2 min-h-12 w-full rounded-xl border px-3 text-base"/>
     </label>
    </div>
    <p className="text-xs text-slate-500">Prices are shown in each gig's listed currency. Numeric price filters do not convert between currencies.</p>
    <label className="block text-sm font-semibold">Delivery within
     <select value={filters.days} onChange={e=>update("days",e.target.value)}
      className="mt-2 min-h-12 w-full rounded-xl border px-3 text-base">
      <option value="">Any delivery time</option>
      <option value="1">One day</option><option value="3">Three days</option>
      <option value="7">Seven days</option><option value="14">Fourteen days</option>
      <option value="30">Thirty days</option>
     </select>
    </label>
    <label className="block text-sm font-semibold">Seller country
     <input type="text" maxLength={80} value={filters.country} onChange={e=>update("country",e.target.value)}
      placeholder="Any country" className="mt-2 min-h-12 w-full rounded-xl border px-3 text-base"/>
    </label>
    <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
     <input type="checkbox" checked={filters.verified} onChange={e=>update("verified",e.target.checked)}
      className="h-5 w-5 accent-teal-700"/> Verified sellers only
    </label>
   </aside>
   <section aria-label="Service results" className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
     <p className="text-sm text-slate-600" aria-live="polite">
      {loading?"Searching services...":`${from}–${to} of ${total} services`}
     </p>
     <label className="flex items-center gap-2 text-sm font-semibold">Sort
      <select value={filters.sort} onChange={e=>update("sort",e.target.value)}
       className="min-h-11 max-w-full rounded-xl border px-3 text-base">
       {SORT_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
     </label>
    </div>
    {error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({length:6},(_,i)=><div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100"/>)}
     </div>:offers.length===0?<div className="rounded-2xl border bg-white p-8">
      <h2 className="text-xl font-bold">No matching services</h2>
      <p className="mt-2 text-sm text-slate-600">Try a different phrase, remove a filter or browse all categories.</p>
      <button type="button" onClick={clear} className="mt-4 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white">Show all services</button>
     </div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {offers.map(offer=><article key={offer.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
       <Link to={`/services/${offer.id}`} className="block">
        <img src={offer.image_url||"https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"}
         alt={offer.title} loading="lazy" className="aspect-[16/10] w-full object-cover"/>
       </Link>
       <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-primary">{offer.category}</p>
        <Link to={`/services/${offer.id}`} className="mt-2 line-clamp-2 min-h-12 font-bold hover:text-primary">{offer.title}</Link>
        <div className="mt-3 flex items-center gap-2">
         {offer.seller_image&&<img src={offer.seller_image} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover"/>}
         <Link to={`/sellers/${offer.seller_id}`} className="min-w-0 truncate text-sm font-medium text-slate-700 hover:underline">{offer.seller_name||"Seller"}</Link>
         {offer.seller_verified&&<ShieldCheck size={16} className="shrink-0 text-teal-700" aria-label="Verified seller"/>}
        </div>
        <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
         {Number(offer.seller_review_count)>0?<><Star size={15} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
          {Number(offer.seller_rating).toFixed(1)} ({offer.seller_review_count} reviews)</>:"New seller"}
         {Number(offer.seller_completed_orders)>0&&<span> · {offer.seller_completed_orders} completed</span>}
        </p>
        <p className="mt-1 text-xs text-slate-600">{offer.delivery_days} day delivery{offer.seller_country?" · "+offer.seller_country:""}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
         <p className="font-bold">From {offer.currency} {Number(offer.basic_price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
         {profile?.role!=="seller"&&<button type="button" disabled={saving===offer.id} onClick={()=>toggleSaved(offer)}
          aria-label={saved.includes(offer.id)?"Remove saved service":"Save service"}
          aria-pressed={saved.includes(offer.id)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full border hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <Heart size={19} className={saved.includes(offer.id)?"fill-red-500 text-red-500":"text-slate-500"}/>
         </button>}
        </div>
       </div>
      </article>)}
     </div>}
    {!loading&&pages>1&&<nav aria-label="Search results pages" className="mt-7 flex flex-wrap items-center justify-center gap-3">
     <button type="button" disabled={filters.page<=1} onClick={()=>navigateFilters({page:filters.page-1})}
      className="inline-flex min-h-11 items-center gap-1 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-40">
      <ChevronLeft size={18}/>Previous</button>
     <span className="px-2 text-sm font-medium">Page {filters.page} of {pages}</span>
     <button type="button" disabled={filters.page>=pages} onClick={()=>navigateFilters({page:filters.page+1})}
      className="inline-flex min-h-11 items-center gap-1 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-40">
      Next<ChevronRight size={18}/></button>
    </nav>}
   </section>
  </div>
 </main>;
}