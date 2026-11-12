import {useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
export default function SellerPerformancePanel({userId}){
 const [metrics,setMetrics]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
  if(!userId){setLoading(false);return;}
  let active=true;
  supabase.rpc("my_seller_performance").then(({data,error:e})=>{
   if(!active)return;
   if(e)setError(e.message);else setMetrics(data?.[0]||null);
   setLoading(false);
  });
  return ()=>{active=false;};
 },[userId]);
 if(loading)return <section className="mt-6 rounded-xl border bg-white p-4 text-sm">Loading seller performance...</section>;
 if(error)return <section role="alert" className="mt-6 rounded-xl border bg-red-50 p-4 text-sm text-red-800">Performance data unavailable: {error}</section>;
 if(!metrics)return null;
 const blocks=[
  ["Completed orders",metrics.completed_orders],
  ["Open work",metrics.active_orders],
  ["Repeat buyers",metrics.repeat_buyers],
  ["Customer reviews",metrics.rated_orders],
  ["Average rating",Number(metrics.rated_orders)>0?Number(metrics.average_rating).toFixed(2)+"/5":"Not rated"],
  ["On-time first deliveries",Number(metrics.measured_deliveries)>0?
     `${metrics.on_time_deliveries} of ${metrics.measured_deliveries}`:"Not enough data"],
 ];
 return <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
  <h2 className="text-xl font-bold">Seller performance</h2>
  <p className="mt-2 text-sm text-slate-600">Calculated from recorded orders and genuine customer reviews, without estimated performance scores.</p>
  <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
   {blocks.map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3">
    <dt className="text-xs font-medium text-slate-600">{label}</dt>
    <dd className="mt-1 text-xl font-bold">{value}</dd>
   </div>)}
  </dl>
  <p className="mt-4 text-xs text-slate-500">On-time delivery compares the recorded first delivery timestamp against payment verification plus agreed delivery days. Pauses and approved extensions are not yet factored in. Repeat buyers means at least two paid orders by the same buyer.</p>
 </section>;
}