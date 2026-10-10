"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb, review, toCsv } from "@/lib/admin";
import { naira } from "@/lib/api";

const COLS = "id,registration_id,full_name,email,phone,whatsapp,gender,age,institution,department,level,state,learning_track,skill_level,referral_source,motivation,amount_due,pricing_type,registration_status,payment_status,payment_reference,payment_date,payment_method,sender_account_name,receipt_path,rejection_reason,verified_at,group_link_sent,created_at";
const TABS = [["dashboard", "Dashboard"], ["all", "Registrations"], ["pending", "Pending Payments"], ["verified", "Verified Students"], ["rejected", "Rejected Payments"], ["settings", "Settings"]] as const;
const MSG: Record<string, string> = { not_pending: "This payment is no longer pending. Refresh the list.", reason_required: "Enter a rejection reason.",
  group_link_not_configured: "Payment verified, but no group link is set. Add one in Settings, then resend.", email_failed_use_resend: "Payment verified, but the email failed. Use Resend email." };
const pretty = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const when = (d?: string) => (d ? new Date(d).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "-");

export default function Admin() {
  const [ready, setReady] = useState(false); const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("dashboard");

  const check = useCallback(async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { setAuthed(false); setReady(true); return; }
    const { data } = await sb.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (!data) { await sb.auth.signOut(); setAuthed(false); } else setAuthed(true);
    setReady(true);
  }, []);
  useEffect(() => { check(); }, [check]);

  if (!ready) return null;
  if (!authed) return <Login onDone={check} />;
  return (
    <div className="wrap adm">
      <nav><div className="brand">SYNTHAX<i>LAB</i> ADMIN</div><button className="btn ghost" onClick={async () => { await sb.auth.signOut(); setAuthed(false); }}>Sign out</button></nav>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "dashboard" && <Dashboard />}
      {tab === "settings" && <Settings />}
      {["all", "pending", "verified", "rejected"].includes(tab) && <Registrations key={tab} preset={tab === "all" ? "" : tab} />}
    </div>);
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setErr("Incorrect email or password."); else await onDone();
    setBusy(false);
  }
  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
      <form onSubmit={go}><div className="brand" style={{ marginBottom: 18 }}>SYNTHAX<i>LAB</i> ADMIN</div>
        {err && <div className="banner" role="alert">{err}</div>}
        <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
          <div><label htmlFor="e">Email</label><input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label htmlFor="p">Password</label><input id="p" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div></div>
        <p style={{ margin: "20px 0 0" }}><button className="btn" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button></p></form>
    </div>);
}

function Dashboard() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { sb.rpc("admin_stats").then(({ data }) => setS(data)); }, []);
  if (!s) return <p style={{ color: "var(--mute)" }}>Loading...</p>;
  const cards = [["Total Registrations", s.total], ["Pending Payments", s.pending], ["Verified Students", s.verified], ["Rejected Payments", s.rejected],
    ["Early Bird Registrations", s.early_bird], ["Regular Registrations", s.regular], ["Total Revenue", naira(s.revenue)]];
  return <div className="grid">{cards.map(([k, v]) => <div className="card" key={k as string}><p>{k}</p><h3 style={{ fontSize: 30, marginTop: 6 }}>{v}</h3></div>)}</div>;
}

function Registrations({ preset }: { preset: string }) {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [sel, setSel] = useState<any>(null);
  const [f, setF] = useState({ q: "", pay: preset, reg: "", price: "", track: "", from: "" });
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("registrations").select(COLS).order("created_at", { ascending: false }).limit(2000);
    setRows(data ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = f.q.toLowerCase();
    return rows.filter((r) => (!q || [r.registration_id, r.full_name, r.email, r.phone, r.institution].some((v) => String(v).toLowerCase().includes(q)))
      && (!f.pay || r.payment_status === f.pay) && (!f.reg || r.registration_status === f.reg) && (!f.price || r.pricing_type === f.price)
      && (!f.track || r.learning_track === f.track) && (!f.from || r.created_at.slice(0, 10) >= f.from));
  }, [rows, f]);

  const exportCsv = () => {
    const cols = COLS.split(",").filter((c) => !["id", "receipt_path"].includes(c));
    const blob = new Blob([toCsv(shown, cols)], { type: "text/csv" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `launchcode-registrations-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  const sel_ = (k: keyof typeof f, label: string, opts: string[]) =>
    <select aria-label={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">{label}</option>{opts.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}</select>;

  return (
    <>
      <div className="filters">
        <input placeholder="Search name, email, ID, phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        {sel_("pay", "Payment status", ["unpaid", "pending", "verified", "rejected"])}
        {sel_("reg", "Registration status", ["pending_payment", "payment_submitted", "verified", "rejected", "cancelled"])}
        {sel_("price", "Pricing type", ["early_bird", "regular"])}
        {sel_("track", "Learning track", ["web_development", "backend_development", "mobile_app_development", "ui_ux_design", "full_stack_development", "not_sure_yet"])}
        <input type="date" aria-label="Registered from" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <button className="btn ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
      </div>
      <p style={{ color: "var(--mute)", fontSize: 13 }}>{loading ? "Loading..." : `${shown.length} of ${rows.length} registrations`}</p>
      <div className="tbl"><table><thead><tr>{["Registration ID", "Student", "Email", "Phone", "Institution", "Track", "Pricing", "Amount", "Payment", "Status", "Registered", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{shown.map((r) => <tr key={r.id}><td>{r.registration_id}</td><td>{r.full_name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.institution}</td>
          <td>{pretty(r.learning_track)}</td><td>{pretty(r.pricing_type)}</td><td>{naira(r.amount_due)}</td><td><span className={`status ${r.payment_status === "verified" ? "ok" : r.payment_status === "rejected" ? "bad" : "wait"}`}>{pretty(r.payment_status)}</span></td>
          <td>{pretty(r.registration_status)}</td><td>{when(r.created_at)}</td><td><button className="copy" onClick={() => setSel(r)}>Open</button></td></tr>)}
          {!loading && !shown.length && <tr><td colSpan={12} style={{ textAlign: "center", color: "var(--mute)" }}>No registrations match these filters.</td></tr>}</tbody></table></div>
      {sel && <Detail r={sel} onClose={() => setSel(null)} onChanged={() => { setSel(null); load(); }} />}
    </>);
}

function Detail({ r, onClose, onChanged }: { r: any; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState(""); const [reason, setReason] = useState(""); const [rejecting, setRejecting] = useState(false);
  const act = async (action: string, extra: object = {}) => {
    setBusy(action); setMsg("");
    try {
      const d = await review({ action, registration_id: r.registration_id, ...extra });
      if (action === "receipt_url") { window.open(d.url, "_blank", "noopener"); }
      else if (d.warning) { setMsg(MSG[d.warning]); } else if (d.email_sent === false) { setMsg("Saved, but the email could not be sent."); } else onChanged();
    } catch (e: any) { setMsg(MSG[e.message] ?? "Action failed. Try again."); } finally { setBusy(""); }
  };
  const info: [string, string][] = [["Registration ID", r.registration_id], ["Name", r.full_name], ["Email", r.email], ["Phone", r.phone], ["WhatsApp", r.whatsapp], ["Gender", pretty(r.gender)], ["Age", r.age],
    ["Institution", r.institution], ["Department", r.department], ["Level", r.level], ["State", r.state], ["Track", pretty(r.learning_track)], ["Skill level", pretty(r.skill_level)],
    ["Heard via", pretty(r.referral_source)], ["Amount due", naira(r.amount_due)], ["Pricing type", pretty(r.pricing_type)], ["Payment reference", r.payment_reference ?? "-"],
    ["Sender account name", r.sender_account_name ?? "-"], ["Payment method", r.payment_method ?? "-"], ["Payment date", r.payment_date ?? "-"], ["Registered", when(r.created_at)],
    ["Verified at", when(r.verified_at)], ["Group link sent", r.group_link_sent ? "Yes" : "No"], ["Rejection reason", r.rejection_reason ?? "-"]] as any;
  return (
    <div className="overlay" onClick={onClose}><div className="modal" style={{ maxWidth: 640 }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
      <h3 style={{ fontSize: 22, marginBottom: 12 }}>{r.full_name}</h3>
      {msg && <div className="banner" role="alert">{msg}</div>}
      <div className="kv">{info.map(([k, v]) => <div key={k}><span>{k}</span><b style={{ fontSize: 14 }}>{String(v)}</b></div>)}
        {r.motivation && <div><span>Motivation</span><b style={{ fontSize: 14, fontWeight: 400 }}>{r.motivation}</b></div>}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {r.receipt_path && <button className="btn ghost" disabled={!!busy} onClick={() => act("receipt_url")}>View receipt</button>}
        {r.payment_status === "pending" && !rejecting && <>
          <button className="btn" disabled={!!busy} onClick={() => confirm(`Verify payment of ${naira(r.amount_due)} for ${r.registration_id}? The group link will be emailed.`) && act("verify")}>{busy === "verify" ? "Verifying..." : "VERIFY PAYMENT"}</button>
          <button className="btn ghost" onClick={() => setRejecting(true)}>REJECT PAYMENT</button></>}
        {r.payment_status === "verified" && !r.group_link_sent && <button className="btn" disabled={!!busy} onClick={() => act("resend")}>Resend email</button>}
        <button className="btn ghost" onClick={onClose}>Close</button></div>
      {rejecting && <div style={{ marginTop: 16 }}><label htmlFor="rr">Rejection reason (sent to the student)</label><textarea id="rr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <p style={{ margin: "12px 0 0", display: "flex", gap: 10 }}><button className="btn" disabled={!!busy || !reason.trim()} onClick={() => act("reject", { reason })}>{busy === "reject" ? "Rejecting..." : "Confirm rejection"}</button>
          <button className="btn ghost" onClick={() => setRejecting(false)}>Cancel</button></p></div>}
    </div></div>);
}

const SET: [string, string, string][] = [["bank_name", "Bank name", "text"], ["account_name", "Account name", "text"], ["account_number", "Account number", "text"],
  ["group_link", "Official LaunchCode group link", "url"], ["support_email", "Support email", "email"], ["whatsapp_contact", "WhatsApp contact", "text"],
  ["early_bird_fee", "Early bird fee (NGN)", "number"], ["regular_fee", "Regular fee (NGN)", "number"], ["registration_opens", "Registration opening date", "date"],
  ["early_bird_ends", "Early bird closing date", "date"], ["registration_deadline", "Registration deadline", "date"]];

function Settings() {
  const [s, setS] = useState<any>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from("settings").select("*").eq("id", 1).single().then(({ data }) => setS(data)); }, []);
  if (!s) return <p style={{ color: "var(--mute)" }}>Loading...</p>;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const { id, updated_at, ...v } = s;
    const { error } = await sb.from("settings").update({ ...v, early_bird_fee: Number(v.early_bird_fee), regular_fee: Number(v.regular_fee) }).eq("id", 1);
    setMsg(error ? "Not saved. Check that dates are in order (open, early bird end, deadline) and fees are above zero." : "Settings saved."); setBusy(false);
  }
  return (
    <form onSubmit={save}><div className="notice">Fee and date changes apply to new registrations immediately. Existing registrations keep the amount they were created with.</div>
      {msg && <div className={msg === "Settings saved." ? "notice" : "banner"} role="status">{msg}</div>}
      <div className="fields">{SET.map(([k, l, t]) => <div key={k}><label htmlFor={k}>{l}</label><input id={k} type={t} value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}</div>
      <p style={{ margin: "20px 0 0" }}><button className="btn" disabled={busy}>{busy ? "Saving..." : "Save settings"}</button></p></form>);
}
