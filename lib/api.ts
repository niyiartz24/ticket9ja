import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

export async function call<T = any>(fn: "register" | "payment", body: object): Promise<T> {
  const res = await fetch(`${URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "request_failed"), { data });
  return data;
}

export const naira = (n: number) => "\u20A6" + n.toLocaleString("en-NG");

export const ERRORS: Record<string, string> = {
  registration_closed: "Registration is closed.",
  duplicate_email: "This email already has a registration. Check your inbox for the payment details.",
  too_many_requests: "Too many attempts. Wait a few minutes and try again.",
  invalid_file_type: "Upload a JPG, PNG or PDF file.",
  file_too_large: "The receipt must be 5 MB or smaller.",
  reference_already_used: "This transaction reference has already been submitted.",
  already_submitted: "A payment has already been submitted for this registration.",
  receipt_not_uploaded: "The receipt did not upload. Try again.",
  unauthorized: "Your session expired. Contact support with your registration ID.",
};
export const errText = (e: any) => ERRORS[e?.message] ?? "Something went wrong. Try again.";
