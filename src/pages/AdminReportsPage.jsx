import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabaseClient";

const statuses = ["open","investigating","resolved","dismissed"];
export default function AdminReportsPage() {
  const { user, profile, loading } = useAuth();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("open");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const allowed = user && profile?.role==="admin" && profile?.account_status==="active";
  const fetchReports = useCallback(async () => {
    if (!allowed) return;
    const { data, error: queryError } = await supabase.from("marketplace_reports")
      .select("id,reporter_id,reported_user_id,conversation_id,category,details,status,created_at,reviewed_at")
      .order("created_at",{ascending:false}).limit(150);
    if (queryError) setError(queryError.message);
    else { setReports(data || []); setError(""); }
  }, [allowed]);
  useEffect(() => { fetchReports(); }, [fetchReports]);
  async function updateStatus(report, status) {
    setBusy(report.id);setError("");setNotice("");
    const { error: updateError } = await supabase.from("marketplace_reports")
      .update({status,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",report.id);
    if (updateError) setError(updateError.message);
    else {setNotice("Report updated."); await fetchReports();}
    setBusy("");
  }
  if (loading) return <main className="mx-auto max-w-5xl p-6">Checking administrator access...</main>;
  if (!allowed) return <Navigate to={user ? profile?.role==="seller" ? "/seller-dashboard" : "/buyer-dashboard" : "/"} replace/>;
  const visible = filter==="all" ? reports : reports.filter(report=>report.status===filter);
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-bold">Marketplace reports</h1>
        <p className="mt-1 text-sm text-slate-600">Review suspected fraud, harassment, spam and other violations. Accounts are not automatically suspended.</p></div>
      <Link to="/admin" className="min-h-11 rounded-xl border px-4 py-3 text-sm font-semibold">Admin dashboard</Link>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-teal-50 p-3 text-teal-900">{notice}</p>}
    <label className="block max-w-xs text-sm font-semibold">Filter by status
      <select className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" value={filter} onChange={event=>setFilter(event.target.value)}>
        <option value="all">All reports</option>{statuses.map(status=><option key={status} value={status}>{status}</option>)}
      </select>
    </label>
    <div className="grid gap-4">
      {visible.length===0 && <p className="rounded-xl border bg-white p-6 text-slate-600">No reports match this filter.</p>}
      {visible.map(report=><article key={report.id} className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-bold capitalize">{report.category.replaceAll("_"," ")}</h2>
            <p className="mt-1 text-xs text-slate-600">{new Date(report.created_at).toLocaleString()} · {report.status}</p></div>
          {report.conversation_id && <Link to={`/admin/activity?conversation=${report.conversation_id}`} className="min-h-11 rounded-xl border px-3 py-3 text-sm font-semibold text-primary">Open conversation review</Link>}
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{report.details}</p>
        <dl className="mt-3 grid gap-1 text-xs text-slate-600">
          <div>Reporter: {report.reporter_id}</div><div>Reported account: {report.reported_user_id}</div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {statuses.filter(s=>s!==report.status).map(status=><button key={status} type="button" disabled={busy===report.id}
            onClick={()=>updateStatus(report,status)}
            className="min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold capitalize hover:bg-slate-50 disabled:opacity-50">{status}</button>)}
        </div>
      </article>)}
    </div>
  </main>;
}
