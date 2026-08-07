# Lesson Schema — the exact structure every lesson must fill

Derived from the shipped Casual Conversation set (50 levels). Every lesson is one CSV row
with these ten columns, in this order. Match this exactly — structure is not the place for
creativity; the teaching is.

> **Column names and order verified against the real app** (the `lessons` table and the CSV
> import route): `category, module_number, module_title, level_number, level_title,
> lesson_explanation, practice_prompt, practice_example, expected_duration_sec,
> feedback_focus_areas`. The CSV header row must use these exact names — the importer maps by
> header, so a renamed or reordered header silently drops data.

> **Authoring → live:** you edit the **CSV**, then **import it to the Supabase `lessons`
> table** (`/api/admin/import-lessons`) for the change to take effect. Editing the CSV alone
> changes nothing in the product. If a lesson's `lesson_explanation` changed, also clear the
> `cached_lesson_intros` cache so the coach's spoken intro regenerates from the new text.

## The columns

| Column | What it is | Craft notes |
|---|---|---|
| `category` | The path name | One of the six, exactly as named. |
| `module_number` | Which module (1–N) | Modules group related skills and ramp in difficulty. |
| `module_title` | Human name of the module | Describes the skill cluster ("Basics of Conversation", "Group Conversation Skills"). |
| `level_number` | Position within the module | Difficulty rises with level number. Don't break the ramp. |
| `level_title` | Human name of this lesson | Specific and concrete ("Asking How Are You Naturally", not "Questions"). |
| `lesson_explanation` | The teaching | The "learn" half. Framework + delivery cues. See below. |
| `practice_prompt` | What the learner does | The "practice" half. Specific, scaffolded, actionable. See below. |
| `practice_example` | The model answer | Shows mastery. Uses `[bracketed labels]`. See below. |
| `expected_duration_sec` | Target speaking time | A difficulty lever. 20–40s early, 60s capstones, 120s final mastery. |
| `feedback_focus_areas` | Pipe-delimited scoring dims | What the AI feedback scores. MUST match what the lesson taught. |

## `lesson_explanation` — the teaching (2–5 sentences, dense but plain)

Must contain both halves:
- **The framework / method** — the concrete "what to do" (structure, steps, the move being
  taught).
- **The delivery cues** — how it should *sound*: tone, pacing, intonation, warmth, energy,
  what to avoid.

Good pattern (real): names the skill, says why it matters in one line, gives the vocal
technique, names the common failure to avoid. Keep it tight — a nervous beginner reads this.
Don't teach two skills in one lesson; one lesson, one core skill.

## `practice_prompt` — what the learner actually does

- **Be specific and give them something to say.** The strong prompts list numbered options
  (1, 2, 3), each with a parenthetical tone cue: `1) 'Hey, how's it going?' (warm, friendly)`.
- **End with a "Focus on:" list** naming the qualities to hit — this primes self-monitoring
  and previews the feedback dimensions.
- For structured longer prompts, give a **time-boxed skeleton**: `GREETING (5s), TOPIC (10s),
  RESPONSE (10s), TRANSITION (5s)`.
- Never leave the learner staring at a blank "talk about something." Even independent levels
  specify what mastery looks like.

## `practice_example` — the model that teaches by example

- Show a **full sample at the target duration**, not a fragment.
- **Annotate with inline `[bracketed labels]`** marking each move: `[trend identification] …
  [appeal explanation] … [seeking perspective]`. The labels are the teaching — they show *why*
  the example works, turning a sample into a lesson.
- Where useful, **contrast good vs. bad** on the same line so the delta is unmistakable:
  `Good: … (warm, genuine). Bad: … (flat, disinterested).`
- **Independent / mastery levels use self-assessment questions instead of a script** ("Does
  this sound natural? Would someone want to keep talking to you?") — because the point is the
  learner generating their own content, so handing them words would defeat it.

## `feedback_focus_areas` — the teaching-to-scoring bridge

- Pipe-delimited: `Vocal warmth|Appropriate energy level|Genuine friendliness|Natural pacing`.
- **Every focus area must be something the lesson actually taught.** If it's scored, it was
  taught; if it was taught and matters, it's scored. Mismatches here are a real defect — the
  learner gets graded on something the lesson never covered, or the lesson's key point never
  gets reinforced by feedback.
- Integrative/mastery levels list more areas (they combine skills) and often end with a
  "…mastery" capstone area.

## Duration as a difficulty dial (observed values)

- 20–25s: single tight skill, early module.
- 30–40s: skill with a bit of scaffolded structure.
- 60s: module capstone, multiple skills integrated.
- 120s: final path-level mastery, fully independent.

Use duration deliberately to signal and enforce difficulty — it is not a throwaway number.
