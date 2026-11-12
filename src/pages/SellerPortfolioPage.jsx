import {useCallback,useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "../context/useAuth";
import {supabase} from "../lib/supabaseClient";
const empty={title:"",description:"",category:"",skills:"",external_url:"",completed_year:"",published:true};
export default function SellerPortfolioPage(){
 const {user,profile,loading:authLoading}=useAuth();
 const seller=!!(user&&profile?.role==="seller"&&profile?.account_status==="active");
 const [items,setItems]=useState([]),[form,setForm]=useState(empty),[file,setFile]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!seller)return;
  const {data,error:e}=await supabase.from("seller_portfolio_projects").select("*").eq("seller_id",user.id).order("created_at",{ascending:false}).limit(100);
  if(e)setError(e.message);else setItems(data||[]);
 },[seller,user?.id]);
 useEffect(()=>{load();},[load]);
 const change=(key,value)=>setForm(f=>({...f,[key]:value}));
 const save=async(event)=>{
  event.preventDefault();if(!seller)return;
  setBusy(true);setError("");setNotice("");
  let path=null;
  try{
   if(file){
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8388608)throw Error("Image must be JPG, PNG or WebP under 8 MB.");
    const ext=file.type.split("/")[1]==="jpeg"?"jpg":file.type.split("/")[1];
    path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error:e}=await supabase.storage.from("portfolio-images").upload(path,file,{contentType:file.type,upsert:false});
    if(e)throw e;
   }
   const {error:e}=await supabase.from("seller_portfolio_projects").insert({
    seller_id:user.id,title:form.title.trim(),description:form.description.trim(),category:form.category.trim(),
    skills:form.skills.trim()||null,external_url:form.external_url.trim()||null,
    completed_year:form.completed_year?Number(form.completed_year):null,published:form.published,cover_image_path:path
   });
   if(e)throw e;
   setForm(empty);setFile(null);setNotice("Portfolio project saved.");await load();
  }catch(e){setError(e.message);if(path)await supabase.storage.from("portfolio-images").remove([path]);}
  finally{setBusy(false);}
 };
 const action=async(project,method)=>{
  setBusy(true);setError("");setNotice("");
  const q=supabase.from("seller_portfolio_projects");
  const {error:e}=method==="remove"
   ?await q.delete().eq("id",project.id).eq("seller_id",user.id)
   :await q.update({published:!project.published,updated_at:new Date().toISOString()}).eq("id",project.id).eq("seller_id",user.id);
  if(e)setError(e.message);
  else{if(method==="remove"&&project.cover_image_path)await supabase.storage.from("portfolio-images").remove([project.cover_image_path]);setNotice("Project updated.");await load();}
  setBusy(false);
 };
 if(authLoading)return <main className="mx-auto max-w-5xl p-6">Loading...</main>;
 if(!seller)return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-bold">Seller portfolio</h1><p>Only active sellers can manage portfolios.</p></main>;
 return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">My portfolio</h1>
   <p className="mt-2 text-sm text-slate-600">Show genuine past work. Publish only material you have permission to share.</p></div>
   <Link to={`/sellers/${user.id}`} className="rounded-xl border px-4 py-3 text-sm font-semibold">View public profile</Link></div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
  <form onSubmit={save} className="grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2 sm:p-6">
   <h2 className="text-xl font-bold sm:col-span-2">Add a project</h2>
   <label className="text-sm font-semibold sm:col-span-2">Project title<input required minLength={5} maxLength={140} value={form.title} onChange={e=>change("title",e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
   <label className="text-sm font-semibold sm:col-span-2">Project details and deliverables<textarea required minLength={30} maxLength={3000} value={form.description} onChange={e=>change("description",e.target.value)} className="mt-2 min-h-32 w-full rounded-xl border p-3 text-base"/></label>
   <label className="text-sm font-semibold">Category<input required minLength={2} maxLength={100} value={form.category} onChange={e=>change("category",e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
   <label className="text-sm font-semibold">Year completed (optional)<input type="number" min="1990" max="2100" value={form.completed_year} onChange={e=>change("completed_year",e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
   <label className="text-sm font-semibold">Skills and tools<input maxLength={350} value={form.skills} onChange={e=>change("skills",e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
   <label className="text-sm font-semibold">External HTTPS project link<input type="url" pattern="https://.*" maxLength={500} value={form.external_url} onChange={e=>change("external_url",e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base"/></label>
   <label className="text-sm font-semibold sm:col-span-2">Cover image (JPG, PNG or WebP; max 8 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 min-h-11 w-full rounded-xl border p-3 text-sm"/></label>
   <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.published} onChange={e=>change("published",e.target.checked)} className="h-5 w-5"/>Show on public profile</label>
   <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy?"Saving...":"Publish project"}</button>
  </form>
  <section><h2 className="text-xl font-bold">Portfolio projects ({items.length})</h2>
   <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(p=>{
    const url=p.cover_image_path?supabase.storage.from("portfolio-images").getPublicUrl(p.cover_image_path).data.publicUrl:null;
    return <article key={p.id} className="overflow-hidden rounded-2xl border bg-white">
     {url&&<img src={url} alt={p.title} loading="lazy" className="aspect-video w-full object-cover"/>}
     <div className="space-y-2 p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-slate-600">{p.category} · {p.published?"Published":"Hidden"}</p>
     <p className="line-clamp-4 whitespace-pre-wrap text-sm">{p.description}</p>
     <div className="flex flex-wrap gap-2 pt-2"><button type="button" disabled={busy} onClick={()=>action(p,"toggle")} className="min-h-11 rounded-lg border px-3 text-sm font-semibold">{p.published?"Hide":"Publish"}</button>
     <button type="button" disabled={busy} onClick={()=>action(p,"remove")} className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700">Delete</button></div></div>
    </article>;
   })}</div>
   {!items.length&&<p className="mt-4 text-sm text-slate-600">Add your first project above.</p>}
  </section>
 </main>;
}