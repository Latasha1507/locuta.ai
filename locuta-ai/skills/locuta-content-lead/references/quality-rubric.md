# Quality Rubric — writing and auditing lessons

Two uses: a checklist while **writing** a new lesson, and an audit pass for **reviewing**
existing or drafted lessons. The governing question never changes: **does a real person do
this rep and actually get better?** If a lesson passes every structural check but fails that
one, it fails.

## Writing a lesson — work in this order

1. **Place it first.** What path, module, level? What does the learner already know from
   earlier levels, and what's the single new skill this one adds? If you can't name the one
   new skill, the lesson isn't scoped yet.
2. **Name the framework.** The concrete method/structure being taught. Keep it consistent with
   the frameworks already used in this path.
3. **Write the teaching** (`lesson_explanation`) — framework + delivery cues, plain and tight.
4. **Write the practice** (`practice_prompt`) — specific, scaffolded, with tone cues and a
   "Focus on:" tail.
5. **Write the example** (`practice_example`) — full model at target duration, `[labeled]`;
   or self-assessment questions for independent levels.
6. **Set duration** to match difficulty.
7. **Derive focus areas** straight from what you taught — not a generic list.
8. **Shape to tone** if a specific coach tone is requested.
9. **Audit against the checklist below** before calling it done.

## The audit checklist

**Does it teach? (the part that matters most)**
- [ ] Is there ONE clear, transferable skill a learner walks away with?
- [ ] Could a nervous beginner understand it on first read — no jargon, nothing to re-read?
- [ ] Is every abstract principle paired with a concrete example or contrast?
- [ ] Are delivery/vocal cues present (not just "what to say" but "how it sounds")?
- [ ] Would an advanced learner still find the framing sharp, not babyish?
- [ ] **Does the prompt make the learner speak naturally toward a real goal — NOT recite a
      set of canned lines?** (Drill-style "practice these three phrases" tasks are a known
      defect: they produce parroting and robotic coach audio. Any listed phrases must be
      *examples of the move*, with the learner producing their own words.)

**Structure & schema**
- [ ] All ten columns present and correctly filled (see lesson-schema.md)?
- [ ] `level_title` specific and concrete, not vague?
- [ ] Practice prompt gives the learner something concrete to say, with tone cues?
- [ ] Example is a full model at target duration, with `[bracketed move labels]`?
- [ ] Independent/mastery level? → self-assessment questions instead of a script.
- [ ] `feedback_focus_areas` each correspond to something the lesson actually taught?
- [ ] Duration matches the difficulty and the amount asked for?

**Progression**
- [ ] Does it slot correctly into the difficulty ramp — harder than the level before, easier
      than the capstone?
- [ ] Does it assume only skills already taught earlier in the path?
- [ ] If it's a module capstone, does it integrate the module's skills and move toward
      independence (guided → independent)?

**No-repeat / distinctiveness**
- [ ] Does this duplicate a skill already taught elsewhere in this path?
- [ ] If a similar move exists in another path, is THIS version genuinely re-applied to this
      path's real-world context — not a reskin? (Swap test: could it be dropped into another
      path unnoticed? If yes, rewrite.)

**Tone (if a coach tone was specified)**
- [ ] Is the teaching intact, with only voice/warmth/phrasing shifted to the tone?
- [ ] Is the tone still on the learner's side — firm-not-cruel, playful-not-mocking?

**Voice & craft**
- [ ] Plainest possible words; most important thing first; nothing cuttable left in?
- [ ] Does it read like a real coach wrote it, or like a filled-in template?

## Auditing a whole module or path

Beyond per-lesson checks:
- [ ] Do the levels form a genuine ramp, or is difficulty scattered?
- [ ] Does each module end in an integrative guided→independent capstone?
- [ ] Do durations scale sensibly across the module (tight early, longer at capstone)?
- [ ] Is any single skill over-represented (three near-identical lessons), or any obvious gap
      in the skill sequence?
- [ ] Do the frameworks stay consistent so the path reads as one curriculum, not a tip pile?
- [ ] Is it built so future lessons can be inserted without contradicting or duplicating these?

## Reporting an audit

Lead with the most important issue: a lesson that doesn't teach outranks a formatting nit.
For each finding — what's weak, where, and the concrete fix or rewrite. Give the verdict
straight: is this lesson good, fixable, or does it need rebuilding? Don't hedge a weak lesson
into sounding fine.

**Close every audit with the operational steps to make it live**, or the work is stranded in
a CSV:
1. Re-import the corrected CSV to the `lessons` table (`/api/admin/import-lessons`).
2. If any `lesson_explanation` changed, clear the `cached_lesson_intros` cache so the coach's
   spoken intro regenerates from the new text.
3. Spot-check one edited lesson end-to-end in the app (intro → task → practice → feedback
   example) to confirm the change actually took and the runtime audio reflects it.
