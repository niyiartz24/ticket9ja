"use client";
import { useEffect, useMemo, useState } from "react";
import { call, supabase, naira, errText } from "@/lib/api";

type Pricing = { phase: "not_open" | "early_bird" | "regular" | "closed"; amount: number | null; ends_on: string;
  early_bird_fee: number; regular_fee: number; registration_opens: string; early_bird_ends: string; registration_deadline: string };
type Reg = { registration_id: string; amount_due: number; pricing_type: string; access_token: string;
  payment: { bank_name: string; account_name: string; account_number: string }; name: string; email: string };

const TRACKS = [["web_development", "Web Development"], ["backend_development", "Backend Development"], ["mobile_app_development", "Mobile App Development"],
  ["ui_ux_design", "UI/UX Design"], ["full_stack_development", "Full Stack Development"], ["not_sure_yet", "Not Sure Yet"]];
const SOURCES = [["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["friend_referral", "Friend/Referral"], ["campus", "Campus"], ["synthaxlab", "SynthaxLab"], ["other", "Other"]];
const LEARN = [["Web Development", "Build and ship responsive websites and web apps."], ["Backend Development", "APIs, databases and authentication done properly."],
  ["Mobile App Development", "Design and build apps for phones."], ["UI/UX Design", "Research, wireframes and interface design."],
  ["Git & GitHub", "Version control and team workflows."], ["Real-world Project Development", "Ship projects you can show to employers."]];
const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const EMPTY = { full_name: "", email: "", phone: "", whatsapp: "", gender: "", age: "", institution: "", department: "", level: "", state: "",
  learning_track: "", skill_level: "", referral_source: "", motivation: "", confirmed: false };

function validate(f: typeof EMPTY) {
  const e: Record<string, string> = {};
  for (const k of ["full_name", "institution", "department", "level", "state", "gender", "learning_track", "skill_level", "referral_source"] as const)
    if (!f[k].trim()) e[k] = "Required";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = "Enter a valid email address";
  for (const k of ["phone", "whatsapp"] as const)
    if (!/^\+?[0-9]{10,15}$/.test(f[k].replace(/[\s-]/g, ""))) e[k] = "Enter a valid phone number, 10 to 15 digits";
  const a = Number(f.age); if (!Number.isInteger(a) || a < 10 || a > 80) e.age = "Enter a valid age";
  if (!f.confirmed) e.confirmed = "Confirm that your information is accurate";
  return e;
}

export default function Page() {
  const [pr, setPr] = useState<Pricing | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reg, setReg] = useState<Reg | null>(null);
  const [step, setStep] = useState<"form" | "created" | "submit" | "done">("form");
  const [bank, setBank] = useState(false);

  useEffect(() => { call("register", { action: "pricing" }).then(setPr).catch(() => {}); }, []);
  useEffect(() => {
    const s = sessionStorage.getItem("lcw"); if (s) { const v = JSON.parse(s); setReg(v.reg); setStep(v.step); setShowForm(true); }
  }, []);
  useEffect(() => { if (reg) sessionStorage.setItem("lcw", JSON.stringify({ reg, step })); }, [reg, step]);

  const open = pr?.phase === "early_bird" || pr?.phase === "regular";
  const go = () => { setShowForm(true); setTimeout(() => document.getElementById("register")?.scrollIntoView(), 50); };

  return (
    <>
      <div className="wrap">
        <nav><div className="brand">SYNTHAX<i>LAB</i> TECHNOLOGIES</div><a href="#pricing" style={{ color: "var(--mute)", fontSize: 14 }}>Pricing</a></nav>
        <header className="hero">
          <div>
            <h1>LAUNCHCODE BOOTCAMP<span>WINTER EDITION</span></h1>
            <p className="dates">December 2026 to February 2027</p>
            <button className="btn" disabled={!open} onClick={go}>{open ? "Register Now" : pr?.phase === "closed" ? "Registration Closed" : "Registration Opens October 7, 2026"}</button>
          </div>
          <PriceCard pr={pr} />
        </header>
      </div>

      <section><div className="wrap"><h2>About LaunchCode</h2>
        <p>LaunchCode is a practical technology bootcamp. You learn by building real projects and leave with digital skills you can use straight away.</p></div></section>

      <section><div className="wrap"><h2>What you will learn</h2>
        <div className="grid">{LEARN.map(([t, d]) => <div className="card" key={t}><h3>{t}</h3><p>{d}</p></div>)}</div></div></section>

      <section><div className="wrap"><h2>Program timeline</h2><div className="tl" style={{ marginTop: 24 }}>
        <div><b>Registration: October 7 to November 15, 2026</b><span>Registration closes automatically after November 15.</span></div>
        <div><b>Early Bird: October 7 to October 20</b><span>Lowest fee. Ends at midnight on October 20.</span></div>
        <div><b>Bootcamp: December 2026 to February 2027</b><span>Onboarding details are sent after your payment is verified.</span></div></div></div></section>

      <section id="pricing"><div className="wrap"><h2>Pricing</h2>
        <p>Your fee depends on the date you register, not the date you pay. Dates follow Lagos time.</p>
        <div className="grid" style={{ maxWidth: 560 }}>
          <div className="card"><h3>Early Bird</h3><p style={{ font: "700 30px var(--f-display)", color: "var(--text)", margin: "6px 0" }}>{naira(pr?.early_bird_fee ?? 20000)}</p><p>October 7 to October 20</p></div>
          <div className="card"><h3>Regular</h3><p style={{ font: "700 30px var(--f-display)", color: "var(--text)", margin: "6px 0" }}>{naira(pr?.regular_fee ?? 25000)}</p><p>October 21 to November 15</p></div></div></div></section>

      <section id="register"><div className="wrap" style={{ maxWidth: 760 }}><h2>Register</h2>
        <div className="notice">Payment is by manual bank transfer. You are not enrolled until the SynthaxLab team has checked your transfer and verified it. Verification is not instant.</div>
        {!showForm && <button className="btn" disabled={!open} onClick={go}>{open ? "Register Now" : "Registration unavailable"}</button>}
        {showForm && step === "form" && <RegForm disabled={!open} onDone={(r) => { setReg(r); setStep("created"); }} />}
        {showForm && reg && step === "created" && <Created reg={reg} onPay={() => setBank(true)} />}
        {showForm && reg && step === "submit" && <PayForm reg={reg} onDone={() => setStep("done")} />}
        {showForm && reg && step === "done" && <Done reg={reg} />}
      </div></section>

      {bank && reg && <Bank reg={reg} onClose={() => setBank(false)} onPaid={() => { setBank(false); setStep("submit"); }} />}
      <footer><div className="wrap">SynthaxLab Technologies. LaunchCode Bootcamp, Winter Edition.</div></footer>
    </>
  );
}

function PriceCard({ pr }: { pr: Pricing | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!pr) return <div className="price"><div className="tag">LOADING</div></div>;
  const label = { not_open: "OPENING SOON", early_bird: "EARLY BIRD", regular: "REGULAR", closed: "REGISTRATION CLOSED" }[pr.phase];
  const target = new Date(pr.ends_on + (pr.phase === "not_open" ? "T00:00:00+01:00" : "T23:59:59+01:00")).getTime();
  const left = Math.max(0, target - now), p = (n: number) => String(n).padStart(2, "0");
  const t = [["Days", Math.floor(left / 864e5)], ["Hours", Math.floor(left / 36e5) % 24], ["Min", Math.floor(left / 6e4) % 60], ["Sec", Math.floor(left / 1e3) % 60]];
  return (
    <div className="price" aria-live="polite">
      <div className="tag">{label}</div>
      {pr.amount ? <div className="amt">{naira(pr.amount)}</div> : <div className="amt" style={{ fontSize: 30 }}>{pr.phase === "closed" ? "Closed" : "Opens October 7, 2026"}</div>}
      <small>{pr.phase === "early_bird" ? "Ends October 20, 2026" : pr.phase === "regular" ? "Registration closes November 15, 2026" : pr.phase === "not_open" ? "Registration Opens October 7, 2026" : "The November 15 deadline has passed"}</small>
      {pr.phase !== "closed" && <div className="cd">{t.map(([l, v]) => <div key={l as string}><b>{p(v as number)}</b><span>{l}</span></div>)}</div>}
    </div>);
}

function Field({ id, label, err, children }: { id: string; label: string; err?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id}>{label}</label>{children}{err && <div className="err" role="alert">{err}</div>}</div>;
}

function RegForm({ disabled, onDone }: { disabled: boolean; onDone: (r: Reg) => void }) {
  const [f, setF] = useState(EMPTY); const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [fail, setFail] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const cls = (k: string) => (errs[k] ? "bad" : "");
  const txt = (k: keyof typeof EMPTY, label: string, type = "text", extra: any = {}) =>
    <Field id={k} label={label} err={errs[k]}><input id={k} type={type} className={cls(k)} value={f[k] as string} onChange={set(k)} {...extra} /></Field>;
  const sel = (k: keyof typeof EMPTY, label: string, opts: string[][]) =>
    <Field id={k} label={label} err={errs[k]}><select id={k} className={cls(k)} value={f[k] as string} onChange={set(k)}><option value="">Select</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setFail("");
    const v = validate(f); setErrs(v); if (Object.keys(v).length) return;
    setBusy(true);
    try { const r = await call("register", f); onDone({ ...r, name: f.full_name, email: f.email }); }
    catch (x: any) { setFail(errText(x)); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      {fail && <div className="banner" role="alert">{fail}</div>}
      <div className="fields">
        {txt("full_name", "Full name")}{txt("email", "Email address", "email")}{txt("phone", "Phone number", "tel")}{txt("whatsapp", "WhatsApp number", "tel")}
        {sel("gender", "Gender", [["male", "Male"], ["female", "Female"], ["other", "Other"]])}{txt("age", "Age", "number", { min: 10, max: 80 })}
        {txt("institution", "Institution / School")}{txt("department", "Department")}{txt("level", "Current level / class")}{txt("state", "State")}
        {sel("learning_track", "Preferred learning track", TRACKS)}
        {sel("skill_level", "Current tech skill level", [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]])}
        <div className="full">{sel("referral_source", "How did you hear about LaunchCode?", SOURCES)}</div>
        <div className="full"><Field id="motivation" label="Why do you want to join LaunchCode? (optional)"><textarea id="motivation" rows={4} maxLength={2000} value={f.motivation} onChange={set("motivation")} /></Field></div>
        <div className="full"><label className="check"><input type="checkbox" checked={f.confirmed} onChange={set("confirmed")} />I confirm that the information provided is accurate.</label>{errs.confirmed && <div className="err">{errs.confirmed}</div>}</div>
      </div>
      <p style={{ margin: "20px 0 0" }}><button className="btn" disabled={busy || disabled}>{busy ? "Creating registration..." : "Create registration"}</button></p>
    </form>);
}

const Row = ({ k, v, copy }: { k: string; v: string; copy?: string }) => {
  const [done, setDone] = useState(false);
  return <div><div><span>{k}</span><br /><b>{v}</b></div>{copy && <button type="button" className="copy" onClick={() => { navigator.clipboard.writeText(copy); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : "Copy"}</button>}</div>;
};

function Created({ reg, onPay }: { reg: Reg; onPay: () => void }) {
  return (
    <div className="panel"><span className="status wait">Awaiting payment</span><h3 style={{ margin: "14px 0 4px", fontSize: 26 }}>Registration Created</h3>
      <div className="kv"><Row k="Registration ID" v={reg.registration_id} /><Row k="Amount due" v={naira(reg.amount_due)} /><Row k="Pricing" v={reg.pricing_type === "early_bird" ? "Early Bird" : "Regular"} /></div>
      <p style={{ color: "var(--mute)", fontSize: 14 }}>Your registration is not complete yet. Pay by bank transfer, then submit your payment details for verification.</p>
      <button className="btn" onClick={onPay}>PAY NOW</button></div>);
}

function Bank({ reg, onClose, onPaid }: { reg: Reg; onClose: () => void; onPaid: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const b = reg.payment;
  return (
    <div className="overlay" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label="Payment details" onClick={(e) => e.stopPropagation()}>
      <h3 style={{ fontSize: 22 }}>Bank transfer details</h3>
      <div className="kv"><Row k="Bank name" v={b.bank_name} /><Row k="Account name" v={b.account_name} /><Row k="Account number" v={b.account_number} copy={b.account_number} />
        <Row k="Amount" v={naira(reg.amount_due)} copy={String(reg.amount_due)} /><Row k="Registration ID" v={reg.registration_id} copy={reg.registration_id} /></div>
      <p style={{ fontSize: 14 }}>Make payment of the exact amount to the account above.</p>
      <p style={{ fontSize: 14, color: "var(--mute)" }}>After making payment, submit your payment details for verification.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn" onClick={onPaid}>I HAVE MADE PAYMENT</button><button className="btn ghost" onClick={onClose}>Close</button></div>
    </div></div>);
}

function PayForm({ reg, onDone }: { reg: Reg; onDone: () => void }) {
  const [f, setF] = useState({ payment_date: "", payment_method: "", sender_account_name: "", payment_reference: "" });
  const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(""); const [fail, setFail] = useState("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setFail("");
    if (Object.values(f).some((v) => !v.trim()) || !file) return setFail("Complete every field and attach your receipt.");
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return setFail(errText({ message: "invalid_file_type" }));
    if (file.size > 5 * 1024 * 1024) return setFail(errText({ message: "file_too_large" }));
    const base = { registration_id: reg.registration_id, access_token: reg.access_token };
    try {
      setBusy("Uploading receipt...");
      const up = await call("payment", { ...base, action: "upload_url", content_type: file.type, size: file.size });
      const { error } = await supabase.storage.from("receipts").uploadToSignedUrl(up.path, up.token, file);
      if (error) throw new Error("receipt_not_uploaded");
      setBusy("Submitting payment details...");
      await call("payment", { ...base, action: "submit", receipt_path: up.path, ...f });
      onDone();
    } catch (x: any) { setFail(errText(x)); } finally { setBusy(""); }
  }
  return (
    <form onSubmit={submit}>
      <h3 style={{ marginBottom: 16, fontSize: 22 }}>Submit payment for verification</h3>
      {fail && <div className="banner" role="alert">{fail}</div>}
      <div className="fields">
        <Field id="r1" label="Registration ID"><input id="r1" value={reg.registration_id} readOnly /></Field>
        <Field id="r2" label="Name"><input id="r2" value={reg.name} readOnly /></Field>
        <Field id="r3" label="Email"><input id="r3" value={reg.email} readOnly /></Field>
        <Field id="r4" label="Amount"><input id="r4" value={naira(reg.amount_due)} readOnly /></Field>
        <Field id="pd" label="Payment date"><input id="pd" type="date" max={today} value={f.payment_date} onChange={set("payment_date")} /></Field>
        <Field id="pm" label="Bank / payment method"><input id="pm" value={f.payment_method} onChange={set("payment_method")} /></Field>
        <Field id="sa" label="Sender's account name"><input id="sa" value={f.sender_account_name} onChange={set("sender_account_name")} /></Field>
        <Field id="pr" label="Transaction / reference number"><input id="pr" value={f.payment_reference} onChange={set("payment_reference")} /></Field>
        <div className="full"><Field id="rc" label="Payment receipt (JPG, PNG or PDF, up to 5 MB)"><input id="rc" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field></div>
      </div>
      <p style={{ margin: "20px 0 0" }}><button className="btn" disabled={!!busy}>{busy || "SUBMIT PAYMENT FOR VERIFICATION"}</button></p>
    </form>);
}

function Done({ reg }: { reg: Reg }) {
  return (
    <div className="panel"><span className="status wait">Pending verification</span><h3 style={{ margin: "14px 0 8px", fontSize: 26 }}>Payment Submitted Successfully</h3>
      <p>Your payment is currently being verified by the SynthaxLab team.</p>
      <div className="kv"><Row k="Registration ID" v={reg.registration_id} /></div>
      <p style={{ color: "var(--mute)", fontSize: 14 }}>Once your payment is verified, your LaunchCode onboarding details and official group link will be sent to your email. You are not enrolled until then.</p>
      <button className="btn ghost" onClick={() => { sessionStorage.removeItem("lcw"); location.reload(); }}>Close</button></div>);
}
