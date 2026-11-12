import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function OrderDisputeEvidencePanel({ order, disputes = [], files = [], userId, isAdmin = false }) {
  const [entries, setEntries] = useState([]);
  const [disputeId, setDisputeId] = useState("");
  const [fileId, setFileId] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const eligibleDisputes = disputes.filter(item => ["open","under_review"].includes(item.status));
  const participant = userId && (userId === order?.buyer_id || userId === order?.seller_id);

  const load = useCallback(async () => {
    if (!order?.id || (!participant && !isAdmin)) return;
    const {data, error: readError} = await supabase.from("order_dispute_evidence")
      .select("id,dispute_id,order_file_id,submitted_by,description,created_at")
      .eq("order_id",order.id).order("created_at",{ascending:true}).limit(150);
    if (readError) setError(readError.message);
    else setEntries(data || []);
  },[order?.id,participant,isAdmin]);

  useEffect(() => { load(); },[load]);
  useEffect(() => {
    if (!disputeId && eligibleDisputes.length) setDisputeId(eligibleDisputes[0].id);
  },[disputeId,disputes]);

  async function submit(event) {
    event.preventDefault();
    if (!participant || !disputeId || details.trim().length < 15) {
      setError("Select an open dispute and describe the supporting evidence (at least 15 characters).");
      return;
    }
    setBusy(true);setError("");setNotice("");
    try {
      const {error: insertError} = await supabase.from("order_dispute_evidence").insert({
        dispute_id:disputeId,order_id:order.id,submitted_by:userId,
        order_file_id:fileId||null,description:details.trim()
      });
      if (insertError) throw insertError;
      setDetails("");setFileId("");
      setNotice("Evidence recorded. The order participants and KaziHub administrator can review it.");
      await load();
    } catch (cause) {
      setError(cause.message||"Unable to attach evidence.");
    } finally {setBusy(false);}
  }

  if ((!participant && !isAdmin) || !disputes.length) return null;
  return <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6" aria-label="Order dispute evidence">
    <h2 className="text-xl font-bold">Dispute evidence</h2>
    <p className="mt-2 text-sm text-slate-600">Attach a file that is already uploaded to this order, or add a written statement. Evidence is retained for case review and cannot be edited or deleted by participants.</p>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
    {participant && eligibleDisputes.length>0 && <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4">
      <label className="text-sm font-semibold">Dispute
        <select value={disputeId} onChange={e=>setDisputeId(e.target.value)}
         className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3 text-base">
          {eligibleDisputes.map(item=><option value={item.id} key={item.id}>{item.reason.replaceAll("_"," ")} · {new Date(item.opened_at).toLocaleDateString()}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Existing order file (optional)
        <select value={fileId} onChange={e=>setFileId(e.target.value)}
         className="mt-2 min-h-11 w-full rounded-xl border bg-white p-3 text-base">
          <option value="">Statement only</option>
          {files.map(file=><option key={file.id} value={file.id}>{file.file_name}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-600">To provide a new screenshot, PDF, or work sample, use Order Files above first, then return here to select it.</p>
      <label className="text-sm font-semibold">Evidence description
        <textarea minLength={15} maxLength={2000} required value={details} onChange={e=>setDetails(e.target.value)}
          placeholder="Explain what this file or statement establishes, with relevant dates and facts."
          className="mt-2 min-h-28 w-full rounded-xl border bg-white p-3 text-base" />
      </label>
      <button disabled={busy || details.trim().length<15 || !disputeId}
        className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">
        {busy?"Saving evidence...":"Add evidence to dispute"}
      </button>
    </form>}
    {entries.length>0 && <div className="mt-5 space-y-3">
      <h3 className="font-semibold">Evidence history ({entries.length})</h3>
      {entries.map(item=>{
        const file=files.find(f=>f.id===item.order_file_id);
        return <article key={item.id} className="rounded-xl border p-3">
          <p className="text-xs font-semibold text-slate-600">
            {item.submitted_by===userId?"You":"Other participant"} · {new Date(item.created_at).toLocaleString()}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.description}</p>
          {file && <p className="mt-2 break-all text-xs text-teal-800">Attached order file: {file.file_name} (available in Order Files)</p>}
        </article>;
      })}
    </div>}
  </section>;
}
