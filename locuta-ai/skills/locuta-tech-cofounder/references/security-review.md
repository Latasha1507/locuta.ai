# Security Review — React + Supabase (serving minors)

Run this checklist whenever a change touches **data access, auth, storage, secrets, user
input, or the AI pipeline**. It's ordered by how often these go wrong on a client-side
Supabase app and how badly. Don't skim — actually check each relevant item against the code.

The governing reality: **in a client-side Supabase app, the anon key ships to the browser.**
Anyone can open dev tools, read it, and hit your database directly with it. So your real
security perimeter is *server-side* — RLS policies, edge functions, and what the anon key is
allowed to do — not anything in your React code. Frontend checks are UX. RLS is security.

---

## 1. Row Level Security (the #1 risk)

- [ ] **RLS is ENABLED on every table** that holds user or business data. A table without RLS,
      reachable by the anon key, is world-readable and often world-writable. Check
      `supabase/migrations/` and the dashboard — don't assume the default is safe.
- [ ] **Policies are scoped, not permissive.** A policy of `USING (true)` on a SELECT is the
      same as no protection. Policies should tie rows to the requesting user, e.g.
      `auth.uid() = user_id`, or to their school/org for multi-tenant data.
- [ ] **Every operation is covered** — SELECT, INSERT, UPDATE, and DELETE each need their own
      policy. A missing UPDATE policy with RLS on can silently block writes; a too-loose one
      lets students edit others' records.
- [ ] **Isolation holds — across both product lines.** B2B: a student/teacher from School A must
      never read School B's data. B2C: an individual learner must never read another individual's
      data. And the two lines must not bleed into each other — a direct consumer must not see school
      data, and a school's data must not surface to consumers. Verify scoping is enforced *in the
      policy* (via `auth.uid()`, org/tenant id, and account-type), not just in the query the frontend
      happens to send.
- [ ] **INSERT policies validate ownership.** A `WITH CHECK` that lets a user insert rows
      attributed to *other* users is an impersonation hole.
- [ ] **Test policies directly**, not just through the UI (see testing-playbook.md → RLS). A UI
      that never requests other users' data can hide a policy that would happily return it.

## 2. Keys & secrets

- [ ] **`service_role` key is NEVER in client code or client env.** It bypasses RLS entirely.
      Grep the frontend and bundle for it. It belongs only in edge functions / server code.
- [ ] **No secrets in the client bundle.** Anything in `import.meta.env.VITE_*`,
      `NEXT_PUBLIC_*`, or otherwise bundled into JS is public. The anon key is fine there (it's
      meant to be public); AI-provider keys, service keys, webhook secrets, and admin tokens are
      NOT.
- [ ] **`.env` with real values is git-ignored** and was never committed. Check history, not
      just the working tree. If a real secret was ever committed, it's compromised — rotate it.
- [ ] **Third-party / AI keys sit behind a server proxy** (edge function), never called directly
      from the browser.

## 3. Authentication & authorization

- [ ] **Authorization is enforced server-side / in RLS**, never only in React. "Hide the admin
      button" is not access control — the endpoint must reject unauthorized callers.
- [ ] **Session handling is sound.** Tokens stored and refreshed via the Supabase client's
      standard mechanism; no hand-rolled token storage in insecure places.
- [ ] **Role/permission checks are consistent** across every path that reads or mutates a given
      resource — no endpoint that forgot the check.
- [ ] **Password reset / email flows** don't leak whether an account exists and can't be abused
      to take over accounts.

## 4. Input handling & injection

- [ ] **User input is validated and typed** at the boundary (a schema validator like Zod is
      ideal). Never trust the shape of anything from the client.
- [ ] **No raw SQL built from user input.** Use the Supabase query builder / parameterized RPC.
      If there's a `.rpc()` or raw SQL edge function, confirm inputs are parameterized.
- [ ] **XSS**: no `dangerouslySetInnerHTML` with unsanitized content; user-generated text is
      escaped by default (React does this — don't defeat it).
- [ ] **File uploads validated** — type, size, and content — before they touch storage.

## 5. Storage

- [ ] **Storage bucket policies mirror table RLS.** Buckets holding student data / audio must
      not be public, and access policies must scope to the owning user/school.
- [ ] **Signed URLs, not public URLs**, for anything private; with sensible expiry.
- [ ] **No PII in file paths or object names** that end up in guessable/public URLs.

## 6. Minors' data (Locuta-specific, non-negotiable)

Users are schoolchildren. This is a legal and ethical surface, not just a technical one.

- [ ] **Data minimization.** Collect only what the product genuinely needs. Every extra PII
      field on a minor is added risk and liability.
- [ ] **Know where student PII and voice/audio data live**, who can read it, and how long it's
      retained. Have a retention/deletion answer.
- [ ] **No third-party tracking/advertising SDKs profiling minors.** India's DPDP Act restricts
      tracking and targeted advertising directed at children.
- [ ] **Consent model exists** for children's data (DPDP Act contemplates verifiable parental
      consent). This gets **sharper on the B2C line**: a 14-year-old can self-sign-up and pay
      directly, so age-gating and parental-consent logic must be real and enforced, not a checkbox.
      On the **B2B line** the school often mediates consent — but confirm that's actually contracted,
      not just assumed. Flag gaps for legal review; you're not the lawyer, but you must raise it.
- [ ] **Logs and error reports don't leak student PII** to third-party services (e.g. Sentry).
      Scrub before sending.

> On DPDP / legal specifics: surface the obligation and recommend Latasha confirm current rules
> with counsel. Don't state legal conclusions as fact — rules under the DPDP Act have been
> evolving. The engineering job is to make consent, minimization, and deletion *technically
> possible and enforced*.

## 7. General hygiene

- [ ] **Dependencies aren't known-vulnerable.** `npm audit` for high/critical; note anything
      that needs updating.
- [ ] **Error messages don't leak internals** (stack traces, DB structure, secrets) to the client.
- [ ] **CORS on edge functions** is scoped to known origins, not `*`, for anything sensitive.
- [ ] **Rate limiting / abuse protection** on anything that costs money per call (auth emails,
      AI calls) or can be brute-forced.

## 8. Payments & billing (B2C line)

Direct-to-consumer means handling money — a new attack surface the B2B line doesn't have.

- [ ] **Payments go through a trusted provider** (Razorpay, Stripe, etc.), never hand-rolled.
      **Card data must never touch your servers** — use the provider's hosted checkout / SDK so you
      stay out of PCI scope.
- [ ] **Verify payment webhooks by signature.** A webhook that grants access on receipt, without
      validating the provider's signature, can be forged to hand out free subscriptions. Check the
      signature and the event's authenticity server-side (edge function), never client-side.
- [ ] **Entitlement is derived server-side from confirmed payment**, not from a client saying "I
      paid." The client can lie; the database record of a verified payment can't.
- [ ] **Idempotency** on payment handling so a retried/duplicated webhook doesn't double-charge or
      double-grant.

---

### How to report security findings

For each finding: **what** the exposure is, **how bad** (who can access/do what), and **the
fix**. Lead with the worst. If something is exploitable *right now*, say so plainly at the top
and recommend it's fixed before anything else ships — don't bury a live data-exposure bug under
style nits.