import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabaseClient";

const payoutOptions = [
  { value: "paypal", label: "PayPal", example: "PayPal account email", note: "PayPal Payouts integration requires approval. Until connected, payouts are reviewed manually." },
  { value: "payoneer", label: "Payoneer", example: "Payoneer account email", note: "Payoneer may require a separate payee registration step when provider integration is activated." },
  { value: "mpesa", label: "M-Pesa", example: "+254712345678", note: "Use the number associated with your M-Pesa account, including country code." },
];
const validPhone = (value) => /^\+[1-9]\d{7,14}$/.test(value.trim());
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function PaymentSettingsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [preferred, setPreferred] = useState("manual");
  const [method, setMethod] = useState("paypal");
  const [identifier, setIdentifier] = useState("");
  const [accountName, setAccountName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const [settings, preferences, authResult] = await Promise.all([
      supabase.from("payout_destinations").select("id,method,account_identifier,account_name,is_default,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("buyer_payment_preferences").select("preferred_method").eq("user_id",user.id).maybeSingle(),
      supabase.auth.getUser(),
    ]);
    if (settings.error) setError(settings.error.message);
    setDestinations(settings.data || []);
    if (preferences.data?.preferred_method) setPreferred(preferences.data.preferred_method);
    const verified = authResult.data?.user;
    setConfirmedPhone(verified?.phone_confirmed_at && verified?.phone ? verified.phone : "");
    const draft = sessionStorage.getItem("kazihub_signup_phone") || "";
    setPhone(verified?.phone || draft);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const perform = async (action, successMessage) => {
    setBusy(true); setNotice(""); setError("");
    try { await action(); setNotice(successMessage); await load(); }
    catch (cause) { setError(cause.message || "Could not save changes."); }
    finally { setBusy(false); }
  };

  async function sendCode(event) {
    event.preventDefault();
    if (!validPhone(phone)) { setError("Enter an international phone number, for example +254712345678."); return; }
    await perform(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ phone: phone.trim() });
      if (updateError) throw updateError;
      setCodeSent(true);
    }, "A verification code was requested. Enter the SMS code sent by your provider.");
  }
  async function verifyCode(event) {
    event.preventDefault();
    await perform(async () => {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: code.trim(), type: "phone_change" });
      if (verifyError) throw verifyError;
      sessionStorage.removeItem("kazihub_signup_phone");
      setCode(""); setCodeSent(false);
    }, "Phone verified successfully.");
  }
  async function saveDestination(event) {
    event.preventDefault();
    if (!accountName.trim() || !(method === "mpesa" ? validPhone(identifier) : validEmail(identifier))) {
      setError("Enter the account holder name and a valid email or international M-Pesa number."); return;
    }
    await perform(async () => {
      const makeDefault = destinations.length === 0;
      const { error: insertError } = await supabase.from("payout_destinations").insert({
        user_id: user.id, method, account_identifier: identifier.trim(), account_name: accountName.trim(), is_default: makeDefault,
      });
      if (insertError) throw insertError;
      setIdentifier(""); setAccountName("");
    }, "Payout destination saved. Provider payouts are not yet automatic.");
  }
  async function makeDefault(id) {
    await perform(async () => {
      // Partial unique index permits one default at a time.
      const { error: clearError } = await supabase.from("payout_destinations").update({ is_default: false }).eq("user_id",user.id).eq("is_default",true);
      if (clearError) throw clearError;
      const { error: setError } = await supabase.from("payout_destinations").update({ is_default: true }).eq("id",id).eq("user_id",user.id);
      if (setError) throw setError;
    }, "Default payout destination updated.");
  }
  async function deleteDestination(id) {
    await perform(async () => {
      const { error: removeError } = await supabase.from("payout_destinations").delete().eq("id",id).eq("user_id",user.id);
      if (removeError) throw removeError;
    }, "Payout destination removed.");
  }
  async function savePreference(event) {
    event.preventDefault();
    await perform(async () => {
      const { error: saveError } = await supabase.from("buyer_payment_preferences").upsert({ user_id:user.id, preferred_method:preferred, updated_at:new Date().toISOString() });
      if (saveError) throw saveError;
    }, "Payment preference saved. This does not charge or connect a payment account.");
  }

  if (authLoading) return <main className="mx-auto max-w-3xl px-4 py-12">Loading account settings...</main>;
  if (!user) return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold">Sign in required</h1><Link className="mt-4 inline-block text-primary underline" to="/login">Sign in</Link></main>;
  const option = payoutOptions.find((item) => item.value === method);
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-5 sm:py-12">
    <div><h1 className="text-3xl font-bold">Payment & phone settings</h1>
      <p className="mt-2 text-slate-600">Manage payout destinations, your preferred buyer payment method and phone verification.</p>
    </div>
    {notice && <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">Phone verification</h2>
      <p className="mt-2 text-sm text-slate-600">A verified phone is required before seller payout requests. SMS requires the site's Supabase SMS provider to be configured.</p>
      <p className="mt-3 text-sm font-semibold">{confirmedPhone ? `Verified: ${confirmedPhone}` : "Phone not verified"}</p>
      <form onSubmit={sendCode} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-semibold">Phone with country code
          <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event)=>setPhone(event.target.value)}
            placeholder="+254712345678" required className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" />
        </label>
        <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">Send SMS code</button>
      </form>
      {codeSent && <form onSubmit={verifyCode} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-semibold">Verification code
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event)=>setCode(event.target.value)}
            placeholder="Enter SMS code" required className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" />
        </label>
        <button disabled={busy} className="min-h-11 rounded-xl border border-primary px-5 py-3 font-semibold text-primary disabled:opacity-50">Verify phone</button>
      </form>}
    </section>
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">Seller payout destinations</h2>
      <p className="mt-2 text-sm text-slate-600">KaziHub retains 20% of the service price; the seller's earnings are 80% before any separately disclosed payment-provider fees. Saved details do not mean PayPal or Payoneer is connected.</p>
      <div className="mt-4 space-y-3">
        {destinations.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No payout method saved yet.</p>}
        {destinations.map(item => <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
          <div className="min-w-0 text-sm"><p className="font-semibold">{payoutOptions.find(o=>o.value===item.method)?.label || item.method}{item.is_default ? " · Default" : ""}</p>
            <p className="break-all text-slate-600">{item.account_identifier}</p><p className="text-slate-600">{item.account_name}</p></div>
          <div className="flex gap-2">{!item.is_default && <button type="button" disabled={busy} onClick={()=>makeDefault(item.id)} className="min-h-11 rounded-lg border px-3 text-sm font-semibold">Set default</button>}
            <button type="button" disabled={busy} onClick={()=>deleteDestination(item.id)} className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700">Remove</button></div>
        </div>)}
      </div>
      <form onSubmit={saveDestination} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Payout method
          <select value={method} onChange={(event)=>{setMethod(event.target.value);setIdentifier("");}} className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base">
            {payoutOptions.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Account holder name
          <input value={accountName} onChange={event=>setAccountName(event.target.value)} maxLength={120} required className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">{option.example}
          <input value={identifier} type={method==="mpesa"?"tel":"email"} inputMode={method==="mpesa"?"tel":"email"} onChange={event=>setIdentifier(event.target.value)}
            placeholder={option.example} maxLength={200} required className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" />
        </label>
        <p className="text-sm text-slate-600 sm:col-span-2">{option.note}</p>
        <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">Save payout destination</button>
      </form>
    </section>
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">Buyer payment preference</h2>
      <p className="mt-2 text-sm text-slate-600">This is a preference, not a stored credit card or a payment authorization. Payment collection remains manual until the chosen gateway is activated.</p>
      <form onSubmit={savePreference} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm font-semibold">Preferred payment method
          <select className="mt-2 min-h-11 w-full rounded-xl border px-3 py-3 text-base" value={preferred} onChange={event=>setPreferred(event.target.value)}>
            <option value="mpesa">M-Pesa</option><option value="paypal">PayPal</option><option value="card">Debit/credit card</option>
            <option value="crypto">Cryptocurrency</option><option value="manual">Manual payment</option>
          </select>
        </label>
        <button disabled={busy} className="min-h-11 self-end rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">Save preference</button>
      </form>
      <p className="mt-3 text-xs text-slate-500">Do not enter card numbers, CVV, passwords or PayPal/Payoneer login credentials. A payment gateway will collect sensitive payment details securely.</p>
    </section>
    <p className="text-sm text-slate-600">Role: {profile?.role || "account"}. <Link className="font-semibold text-primary underline" to={profile?.role==="seller"?"/seller-dashboard":"/buyer-dashboard"}>Return to dashboard</Link></p>
  </main>;
}
