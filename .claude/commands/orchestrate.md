---
description: Plan a change with Opus, then fan the plan out to parallel Sonnet implementers.
argument-hint: <what to build>
---

Build: $ARGUMENTS

Run this in three phases. Do not skip to phase 2.

**1. Plan.** Delegate to the `planner` subagent (Opus). Give it the request verbatim
plus any constraints from our conversation it cannot see — it does not inherit this
context.

**2. Approve.** Show me the plan's goal, contracts, and slice list, then wait. Do not
start implementing until I say go. If the planner flagged a blocker or a missing
`docs/design.md`, lead with that.

**3. Execute.** Launch one `implementer` subagent (Sonnet) per slice marked
`parallel: yes`, all in a single message so they run concurrently. Hold back any slice
with dependencies until the slices it depends on report success. Each task prompt must
restate, in full: the slice's files, its requirements, the shared contracts, and its
verification command.

Then verify the whole thing yourself — run the frontend and backend checks for
everything that changed, not just the per-slice commands — and report what passed,
what failed with its output, and anything an implementer flagged. Do not report
success on a check you did not run.
