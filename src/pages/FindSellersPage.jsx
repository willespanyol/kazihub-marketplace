import {useEffect,useMemo,useState} from "react";
import {Link,useLocation,useNavigate} from "react-router-dom";
import {Search,Star,ShieldCheck,ChevronLeft,ChevronRight} from "lucide-react";
import {supabase} from "../lib/supabaseClient";
const PER_PAGE=12;
export default function FindSellersPage(){
 const navigate=useNavigate(),location=useLocation();
 const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);
 const q=(params.get("q")||"").slice(0,100),country=params.get("country")||"",verified=params.get("verified")==="1";
 const sort=["recommended","top_rated","most_orders"].includes(params.get("sort"))?params.get("sort"):"recommended";
 const page=Math.max(1,Math.min(10000,Number(params.get("page"))||1));
 const [draft,setDraft]=useState(q),[countryDraft,setCountryDraft]=useState(country);
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[total,setTotal]=useState(0);
 useEffect(()=>{setDraft(q);setCountryDraft(country)},[q,country]);
 const update=(values)=>{
  const next={q,country,verified,sort,page:1,...values};
  const search=new URLSearchParams();
  if(next.q)search.set("q",next.q);
  if(next.country)search.set("country",next.country);
  if(next.verified)search.set("verified","1");
  if(next.sort!=="recommended")search.set("sort",next.sort);
  if(next.page>1)search.set("page",String(next.page));
  navigate({pathname:"/sellers",search:search.toString()?"?"+search.toString():""});
 };
 useEffect(()=>{
  let live=true;setLoading(true);setError("");
  supabase.rpc("search_marketplace_sellers",{
   p_query:q,p_country:country||null,p_verified_only:verified,
   p_sort:sort,p_page:page,p_page_size:PER_PAGE
  }).then(({data,error:queryError})=>{
   if(!live)return;
   if(queryError){setError(queryError.message);setRows([]);setTotal(0);}
   else{setRows(data||[]);setTotal(data?.length?Number(data[0].total_results):0);}
   setLoading(false);
  });
  return ()=>{live=false};
 },[q,country,verified,sort,page]);
 const pages=Math.max(1,Math.ceil(total/PER_PAGE));
 return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
  <h1 className="text-3xl font-bold sm:text-4xl">Find freelancers</h1>
  <p className="mt-2 text-slate-600">Compare professionals by expertise, ratings, published work and completed orders.</p>
  <form role="search" className="mt-6 flex flex-col gap-2 rounded-2xl border bg-white p-3 sm:flex-row"
   onSubmit={e=>{e.preventDefault();update({q:draft.trim().slice(0,100),country:countryDraft.trim()})}}>
   <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3">
    <Search size={19} className="shrink-0 text-slate-500" aria-hidden="true"/>
    <span className="sr-only">Find freelancers by skill or name</span>
    <input type="search" maxLength={100} value={draft} onChange={e=>setDraft(e.target.value)}
     placeholder="Skills, names, services..." className="min-h-12 min-w-0 flex-1 text-base outline-none"/>
   </label>
   <label className="sm:w-48"><span className="sr-only">Country</span><input type="text" maxLength={80} value={countryDraft}
    onChange={e=>setCountryDraft(e.target.value)} placeholder="Country (optional)" className="min-h-12 w-full rounded-xl border px-3 text-base"/></label>
   <button type="submit" className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-white">Search</button>
  </form>
  <div className="my-5 flex flex-wrap items-center justify-between gap-3">
   <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={verified}
    onChange={e=>update({verified:e.target.checked})} className="h-5 w-5"/>Verified sellers only</label>
   <label className="text-sm font-semibold">Sort
    <select value={sort} onChange={e=>update({sort:e.target.value})} className="ml-2 min-h-11 rounded-xl border px-3 text-base">
     <option value="recommended">Best match</option><option value="top_rated">Highest rated</option>
     <option value="most_orders">Most completed orders</option>
    </select>
   </label>
  </div>
  <p className="mb-4 text-sm text-slate-600" aria-live="polite">{loading?"Finding freelancers...":`${rows.length?((page-1)*PER_PAGE+1):0}–${Math.min(page*PER_PAGE,total)} of ${total} freelancers`}</p>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  {loading?<p>Loading freelancers...</p>:rows.length===0?<div className="rounded-xl border bg-white p-6">No freelancers match these filters. Try another skill or country.</div>:
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(s=><article key={s.id} className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start gap-3">
     {s.profile_image_url?<img src={s.profile_image_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-full object-cover"/>:
      <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xl font-bold text-teal-800">{(s.full_name||"S").slice(0,1)}</span>}
     <div className="min-w-0"><Link to={`/sellers/${s.id}`} className="font-bold hover:text-primary">{s.full_name||"Freelancer"}</Link>
      <p className="mt-1 text-sm text-slate-600">{s.headline||"Independent professional"}</p>
      {s.is_verified&&<span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-800"><ShieldCheck size={14}/> Verified</span>}
     </div>
    </div>
    <p className="mt-3 line-clamp-3 text-sm text-slate-700">{s.seller_description||s.skills||"View this freelancer's services and portfolio."}</p>
    <p className="mt-3 text-xs text-slate-600">{s.country||"Location not specified"}</p>
    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
     {Number(s.review_count)>0?<span className="inline-flex items-center gap-1 font-semibold"><Star size={15} className="fill-amber-400 text-amber-500"/>{Number(s.average_rating).toFixed(1)} ({s.review_count})</span>:<span>New seller</span>}
     <span>{s.completed_orders} completed orders</span>
    </p>
    <p className="mt-2 text-xs text-slate-600">{s.active_services} active gigs · {s.portfolio_projects} portfolio projects</p>
    <Link to={`/sellers/${s.id}`} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white pt-3">View profile</Link>
   </article>)}</div>}
  {!loading&&pages>1&&<nav aria-label="Freelancer result pages" className="mt-8 flex items-center justify-center gap-3">
   <button type="button" disabled={page<=1} onClick={()=>update({page:page-1})}
    className="inline-flex min-h-11 items-center rounded-xl border px-3 text-sm disabled:opacity-40"><ChevronLeft size={17}/>Previous</button>
   <span className="text-sm">Page {page} of {pages}</span>
   <button type="button" disabled={page>=pages} onClick={()=>update({page:page+1})}
    className="inline-flex min-h-11 items-center rounded-xl border px-3 text-sm disabled:opacity-40">Next<ChevronRight size={17}/></button>
  </nav>}
 </main>;
}