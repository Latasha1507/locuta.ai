# Testing Playbook — React + Supabase

The rule from SKILL.md: **don't claim code works because it reads correctly.** Verify. This
file is how. Adapt to whatever tooling the project actually uses — check `package.json`
scripts and devDependencies first.

## First: what tooling exists?

- Look in `package.json` for `test` scripts and for Vitest / Jest / Playwright / Cypress /
  React Testing Library.
- If there's **no test setup at all**, that's a finding worth raising. A reasonable default
  for this stack: **Vitest + React Testing Library** for unit/component tests, **Playwright**
  for a few critical end-to-end flows. Don't silently add a heavy test framework without
  saying so — propose it.

## Unit / component tests (React + hooks)

- Test behavior, not implementation. Assert on what the user sees and can do, not on internal
  state.
- Cover the states that actually break in production: **loading, error, and empty**, plus the
  happy path. If a component hits Supabase, all three of those are real code paths.
- Test custom hooks in isolation (`@testing-library/react`'s `renderHook`).
- For pure logic (scoring, validation, formatting), plain unit tests — fast and high-value.

## Supabase in tests

Two viable approaches; pick per situation:

1. **Mock the Supabase client** for component/unit tests. Stub `.from().select()` etc. to
   return known success, error, and empty responses so you can prove each state renders
   correctly. Fast, deterministic, no network.
2. **Integration test against a local Supabase** (`supabase start`) for data-layer logic and,
   crucially, RLS. This exercises the real database and real policies.

## Testing RLS policies (do not skip this)

RLS bugs are **invisible in the UI** — the app never asks for other users' data, so a broken
policy looks fine until someone exploits it. Test policies directly:

- Spin up local Supabase (`supabase start`).
- Using the **anon key** (never service_role), authenticate as User A and attempt to read/write
  User B's rows — and a *different school's* rows. These attempts MUST fail.
- Confirm each of SELECT / INSERT / UPDATE / DELETE behaves correctly for: the owner, a
  different user, a different tenant, and an unauthenticated caller.
- Treat "User A could read School B's students" as a P0 — stop and fix before anything else.

## End-to-end (critical flows only)

Reserve E2E (Playwright) for the handful of flows that must never break: sign-in, a student
completing a lesson, a teacher/admin viewing their class. Don't try to E2E everything — it's
slow and brittle; use it as a safety net on the money paths.

## When automated tests aren't practical

Sometimes (UI polish, a quick fix, no test infra yet) full automation isn't worth it in the
moment. Then do **explicit manual verification** and report it honestly:

- State the exact steps you ran and what you observed.
- State what you could NOT verify and why.
- Never present unverified code as verified. "I couldn't run this — here's what to check" is
  fine. Silent false confidence is not.

## The bar for "done"

Before declaring a change complete, you can answer:
1. What did I test, and how?
2. Which states / edge cases are covered?
3. What's still unverified, and what's the risk there?

If you can't answer these, it isn't done.
