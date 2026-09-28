# Pressure Stacks — chronological learning journal, Checkpoint 14

Retrospective public development summary in checkpoint order, reconstructed from delivered artifacts and conversation. Within-batch items are grouped causally, not claimed as timestamped execution events. Earlier aggregate scores are not newly recertified here.

Prior 81 entries are unchanged. New entries cite exact decision FENs. Frozen reference replay, actual searched side branches and rejected experiments are labelled independently. A reference replay does not count as solving a puzzle.

## 001. A fast rejection is not a good rejection.

**Stage:** Origins — Radical 3 diagnosis

**Defect:** The first attempted pruning stopped after Qxg7+ Kxg7 without examining f6+.

**Decision:** Require the claimed forcing continuation to be exhausted; speed alone does not establish a valid cut.

**Status:** retained
**Evidence:** history/sources/radical3-check-continuation.json

### Position: original-queen-sacrifice
HISTORICAL_EXAMPLE_LEGAL_REPLAY — 37.Qxg7+ Kxg7 38.f6+ Qxf6

Starting FEN:
```text
2r3k1/6p1/3p3q/p1pPpP2/Pp2P1Q1/3P4/1P4K1/3R4 w - - 7 37
```

Ply 1: **Qxg7+** (`g4g7`)

Before:
```text
2r3k1/6p1/3p3q/p1pPpP2/Pp2P1Q1/3P4/1P4K1/3R4 w - - 7 37
```
After:
```text
2r3k1/6Q1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 b - - 0 37
```

Ply 2: **Kxg7** (`g8g7`)

Before:
```text
2r3k1/6Q1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 b - - 0 37
```
After:
```text
2r5/6k1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 w - - 0 38
```

Ply 3: **f6+** (`f5f6`)

Before:
```text
2r5/6k1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 w - - 0 38
```
After:
```text
2r5/6k1/3p1P1q/p1pPp3/Pp2P3/3P4/1P4K1/3R4 b - - 0 38
```

Ply 4: **Qxf6** (`h6f6`)

Before:
```text
2r5/6k1/3p1P1q/p1pPp3/Pp2P3/3P4/1P4K1/3R4 b - - 0 38
```
After:
```text
2r5/6k1/3p1q2/p1pPp3/Pp2P3/3P4/1P4K1/3R4 w - - 0 39
```

## 002. Losing a plan is not exhausting a board.

**Stage:** Origins — Radical 3 diagnosis

**Defect:** First-match card replacement preserved move alternatives but discarded other plan choices.

**Decision:** Keep the distinction between a matching idea, its candidate moves, and evidence of success. Later pressure search retains several compatible ideas.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-5-algorithm.md

Method-level lesson; no particular board asserted.

## 003. Recognition and entry routing are different defects.

**Stage:** Origins — Radical 3 diagnosis

**Defect:** Existing predicates recognized f6 and Rh1, but the initial card did not nominate their plans.

**Decision:** Audit availability facts, entry connections and move selectors independently before adding new predicates.

**Status:** retained
**Evidence:** history/sources/radical3-initial-plan-audit.json

Method-level lesson; no particular board asserted.

## 004. An entry cue should justify investigation, not presuppose its conclusion.

**Stage:** Origins — Radical 3 diagnosis

**Defect:** The shelter card required an already-existing immediate mating threat and excluded a useful quiet pawn offer.

**Decision:** Use concrete shelter/pin cues to nominate the plan; calculate the defense before demanding that the attack has already succeeded.

**Status:** retained
**Evidence:** history/sources/radical3-shelter-check.json

Method-level lesson; no particular board asserted.

## 005. One move may build, force, repair and cash in.

**Stage:** Pressure-stack design and first prototype

**Defect:** A checking capture was being treated as one exclusive tactical category.

**Decision:** Allow overlapping operations. Nxe7+ both collects a bishop and forces a king response, preserving the older queen target.

**Status:** retained
**Evidence:** history/sources/two-pressure-stacks-verification.json

### Position: 0MDll
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 20. f6 Qxg4 21. Nxe7+ Kh8 22. hxg4

Starting FEN:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```

Ply 1: **f6** (`f5f6`)

Before:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```
After:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```

Ply 2: **Qxg4** (`d7g4`)

Before:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```
After:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```

Ply 3: **Nxe7+** (`d5e7`)

Before:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```
After:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```

Ply 5: **hxg4** (`h3g4`)

Before:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6P1/P2P4/BPP3P1/R5K1 b - - 0 22
```

## 006. The visible stacks are ordered sets, not literal LIFO stores.

**Stage:** Pressure-stack design and first prototype

**Defect:** One move can remove an old pin while a newer attack remains.

**Decision:** Give weaknesses identities and owners; update the affected facts without pretending every repair pops the most recent item.

**Status:** retained
**Evidence:** history/sources/two-pressure-stacks-verification.json

Method-level lesson; no particular board asserted.

## 007. Checks impose legal obligations; other threats impose consequences.

**Stage:** Pressure-stack design and first prototype

**Defect:** A promotion threat and a check were both called forcing without explaining the distinction.

**Decision:** Generate every legal check evasion; treat quiet promotion danger through its executable conversion and repairs.

**Status:** retained
**Evidence:** history/sources/two-pressure-stacks-verification.json

### Position: 06RT8
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 37. Nxc5 a2 38. Nb3

Starting FEN:
```text
6k1/5ppp/8/1pb5/8/pN1K1P2/2P3PP/8 w - - 0 37
```

Ply 1: **Nxc5** (`b3c5`)

Before:
```text
6k1/5ppp/8/1pb5/8/pN1K1P2/2P3PP/8 w - - 0 37
```
After:
```text
6k1/5ppp/8/1pN5/8/p2K1P2/2P3PP/8 b - - 0 37
```

Ply 2: **a2** (`a3a2`)

Before:
```text
6k1/5ppp/8/1pN5/8/p2K1P2/2P3PP/8 b - - 0 37
```
After:
```text
6k1/5ppp/8/1pN5/8/3K1P2/p1P3PP/8 w - - 0 38
```

Ply 3: **Nb3** (`c5b3`)

Before:
```text
6k1/5ppp/8/1pN5/8/3K1P2/p1P3PP/8 w - - 0 38
```
After:
```text
6k1/5ppp/8/1p6/8/1N1K1P2/p1P3PP/8 b - - 1 38
```

## 008. A collection may need a subsequent repair.

**Stage:** Pressure-stack design and first prototype

**Defect:** Stopping after winning a bishop can miss an advancing passed pawn.

**Decision:** Preserve the counter-threat until its promotion square is covered; contained does not mean removed.

**Status:** retained
**Evidence:** history/sources/two-pressure-stacks-verification.json

### Position: 06RT8
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 37. Nxc5 a2 38. Nb3

Starting FEN:
```text
6k1/5ppp/8/1pb5/8/pN1K1P2/2P3PP/8 w - - 0 37
```

Ply 1: **Nxc5** (`b3c5`)

Before:
```text
6k1/5ppp/8/1pb5/8/pN1K1P2/2P3PP/8 w - - 0 37
```
After:
```text
6k1/5ppp/8/1pN5/8/p2K1P2/2P3PP/8 b - - 0 37
```

Ply 2: **a2** (`a3a2`)

Before:
```text
6k1/5ppp/8/1pN5/8/p2K1P2/2P3PP/8 b - - 0 37
```
After:
```text
6k1/5ppp/8/1pN5/8/3K1P2/p1P3PP/8 w - - 0 38
```

Ply 3: **Nb3** (`c5b3`)

Before:
```text
6k1/5ppp/8/1pN5/8/3K1P2/p1P3PP/8 w - - 0 38
```
After:
```text
6k1/5ppp/8/1p6/8/1N1K1P2/p1P3PP/8 b - - 1 38
```

## 009. A material deficit does not defeat a live mating plan.

**Stage:** Pressure-stack design and first prototype

**Defect:** A queen sacrifice appears catastrophic under material-only abandonment.

**Decision:** Actual mate overrides material; investigate the concrete forcing continuation rather than applying a blanket deficit cut.

**Status:** retained
**Evidence:** history/sources/two-pressure-stacks-verification.json

### Position: 0IDc7
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26. Qf8+ Nxf8 27. Rxf8#

Starting FEN:
```text
r2qB2k/pp3Qpp/2ppn3/4p3/2P5/3P3P/PP6/1K3Rb1 w - - 4 26
```

Ply 1: **Qf8+** (`f7f8`)

Before:
```text
r2qB2k/pp3Qpp/2ppn3/4p3/2P5/3P3P/PP6/1K3Rb1 w - - 4 26
```
After:
```text
r2qBQ1k/pp4pp/2ppn3/4p3/2P5/3P3P/PP6/1K3Rb1 b - - 5 26
```

Ply 2: **Nxf8** (`e6f8`)

Before:
```text
r2qBQ1k/pp4pp/2ppn3/4p3/2P5/3P3P/PP6/1K3Rb1 b - - 5 26
```
After:
```text
r2qBn1k/pp4pp/2pp4/4p3/2P5/3P3P/PP6/1K3Rb1 w - - 0 27
```

Ply 3: **Rxf8#** (`f1f8`)

Before:
```text
r2qBn1k/pp4pp/2pp4/4p3/2P5/3P3P/PP6/1K3Rb1 w - - 0 27
```
After:
```text
r2qBR1k/pp4pp/2pp4/4p3/2P5/3P3P/PP6/1K4b1 b - - 0 27
```

## 010. Weakness count is not a proof of overload.

**Stage:** Pressure-stack design and first prototype

**Defect:** Two facts may describe one defect, and a single defense may repair several weaknesses.

**Decision:** Require a concrete conversion that every relevant defense fails to prevent; do not declare a win because a stack is tall.

**Status:** retained
**Evidence:** history/sources/pressure-stack-model.md

Method-level lesson; no particular board asserted.

## 011. Separate structural weaknesses from urgency.

**Stage:** Pressure-stack design and first prototype

**Defect:** A loose piece, alignment, and mate threat were mixed into one scale.

**Decision:** Keep a small parameterized vocabulary; derive the deadline from legal checking or executable consequences.

**Status:** retained
**Evidence:** history/sources/pressure-stack-model.md

Method-level lesson; no particular board asserted.

## 012. Every line needs success, abandonment and unresolved outcomes.

**Stage:** Pressure-stack design and first prototype

**Defect:** Budget exhaustion and a failed plan were conflated.

**Decision:** Cut unproductive continuations, but label incomplete obligations UNRESOLVED; no extra credit is earned by changing cards.

**Status:** retained
**Evidence:** history/sources/pressure-stack-policy.json

Method-level lesson; no particular board asserted.

## 013. Generate defense classes directly; do not enumerate nonresponses.

**Stage:** Pressure-stack design and first prototype

**Defect:** The first prototype generated every opponent reply before filtering.

**Decision:** Nominate captures of attackers, target moves, interpositions, support repairs and urgent counters from named geometry. Leave other moves in one ungenerated class.

**Status:** retained
**Evidence:** history/sources/pressure-class-model.md

Method-level lesson; no particular board asserted.

## 014. Material rollback is independently relevant.

**Stage:** Pressure-stack design and first prototype

**Defect:** A nonchecking recapture can restore balance without introducing a higher-priority attack.

**Decision:** Always consider captures/recaptures that erase the objective or remove the forcing piece.

**Status:** retained
**Evidence:** history/sources/pressure-class-policy.json

Method-level lesson; no particular board asserted.

## 015. Reference replay is not autonomous solving.

**Stage:** Pressure-stack design and first prototype

**Defect:** An annotated supplied line can look like a successful search.

**Decision:** Keep solver records and offline reference replay separate. Export preferred moves from the execution tree, never the expected answer.

**Status:** retained
**Evidence:** history/sources/pressure-pgn-provenance-audit.md

Method-level lesson; no particular board asserted.

## 016. A different win is not an exact benchmark pass.

**Stage:** Pressure Stacks v1 and whole-band benchmark

**Defect:** Small-sample successes overstated coverage under exact main-line and endpoint matching.

**Decision:** Freeze exact autonomous reference sequence, same endpoint/ply, resolved obligations and <=50 entered positions. V1 scored 4/120 before the long-line exclusion.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-report.md

Method-level lesson; no particular board asserted.

## 017. A seven-ply ceiling cannot reproduce a nine- or eleven-ply reference.

**Stage:** Pressure Stacks v1 and whole-band benchmark

**Defect:** Four high-band references were longer than the allowed investigation.

**Decision:** Exclude these four by the user-approved rule; target 116 eligible high-band and 380 other puzzles. Never truncate a reference or count the prefix as a pass.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-repair-report.md

Method-level lesson; no particular board asserted.

## 018. Count policy complexity wherever it is implemented.

**Stage:** Pressure Stacks v1 and whole-band benchmark

**Defect:** A small JSON diff can hide many JavaScript conditions and certificates.

**Decision:** Count expanded admission, ordering, reply, context and stopping changes; a helper name is not evidence of simplicity.

**Status:** retained
**Evidence:** history/sources/pressure-policy-repair-instructions.md

Method-level lesson; no particular board asserted.

## 019. Repair shared defects and test their negative cases.

**Stage:** Pressure Stacks v1 and whole-band benchmark

**Defect:** Puzzle-by-puzzle tuning accumulated exceptions and regressions.

**Decision:** Locate first disagreements, build a coverage/conflict matrix, test interacting changes over the entire band, then remove unnecessary edits.

**Status:** retained
**Evidence:** history/sources/pressure-policy-repair-instructions.md

Method-level lesson; no particular board asserted.

## 020. Measured local necessity is not global minimality.

**Stage:** Pressure Stacks v1 and whole-band benchmark

**Defect:** A useful patch was liable to be called minimal without an edit-space proof.

**Decision:** Use meaningful deletion witnesses and try replacements; report irreducibility only under the tests actually run.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-repair-change-ledger.json

Method-level lesson; no particular board asserted.

## 021. A tightly constrained check can deserve priority over a small cash-out.

**Stage:** Checkpoint 1 — eight-pass repair

**Defect:** Bxd8 stopped the search before the admitted Be7+ mating line.

**Decision:** Prioritize a noncapturable check with one legal answer over an ordinary material cash-out.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-repair-change-ledger.json

### Position: 0qHqi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 34. Be7+ Ke8 35. Nf6#

Starting FEN:
```text
r2r1k2/p5Rp/np3B2/2p2p1N/8/8/PPP5/1K6 w - - 4 34
```

Ply 1: **Be7+** (`f6e7`)

Before:
```text
r2r1k2/p5Rp/np3B2/2p2p1N/8/8/PPP5/1K6 w - - 4 34
```
After:
```text
r2r1k2/p3B1Rp/np6/2p2p1N/8/8/PPP5/1K6 b - - 5 34
```

Ply 2: **Ke8** (`f8e8`)

Before:
```text
r2r1k2/p3B1Rp/np6/2p2p1N/8/8/PPP5/1K6 b - - 5 34
```
After:
```text
r2rk3/p3B1Rp/np6/2p2p1N/8/8/PPP5/1K6 w - - 6 35
```

Ply 3: **Nf6#** (`h5f6`)

Before:
```text
r2rk3/p3B1Rp/np6/2p2p1N/8/8/PPP5/1K6 w - - 6 35
```
After:
```text
r2rk3/p3B1Rp/np3N2/2p2p2/8/8/PPP5/1K6 b - - 7 35
```

## 022. Forced interpositions differ from king-chasing checks.

**Stage:** Checkpoint 1 — eight-pass repair

**Defect:** The search spent its budget on checks allowing king movement.

**Decision:** Promote an admitted check whose legal answers all interpose; still search those answers.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-repair-change-ledger.json

### Position: 0e8qR
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 33. Rd8+ Bf8 34. Rxf8+ Kxf8 35. Rh8#

Starting FEN:
```text
6k1/5pb1/3R4/1p3Np1/4K3/r5P1/5rP1/7R w - - 0 33
```

Ply 1: **Rd8+** (`d6d8`)

Before:
```text
6k1/5pb1/3R4/1p3Np1/4K3/r5P1/5rP1/7R w - - 0 33
```
After:
```text
3R2k1/5pb1/8/1p3Np1/4K3/r5P1/5rP1/7R b - - 1 33
```

Ply 2: **Bf8** (`g7f8`)

Before:
```text
3R2k1/5pb1/8/1p3Np1/4K3/r5P1/5rP1/7R b - - 1 33
```
After:
```text
3R1bk1/5p2/8/1p3Np1/4K3/r5P1/5rP1/7R w - - 2 34
```

Ply 3: **Rxf8+** (`d8f8`)

Before:
```text
3R1bk1/5p2/8/1p3Np1/4K3/r5P1/5rP1/7R w - - 2 34
```
After:
```text
5Rk1/5p2/8/1p3Np1/4K3/r5P1/5rP1/7R b - - 0 34
```

Ply 4: **Kxf8** (`g8f8`)

Before:
```text
5Rk1/5p2/8/1p3Np1/4K3/r5P1/5rP1/7R b - - 0 34
```
After:
```text
5k2/5p2/8/1p3Np1/4K3/r5P1/5rP1/7R w - - 0 35
```

Ply 5: **Rh8#** (`h1h8`)

Before:
```text
5k2/5p2/8/1p3Np1/4K3/r5P1/5rP1/7R w - - 0 35
```
After:
```text
5k1R/5p2/8/1p3Np1/4K3/r5P1/5rP1/8 b - - 1 35
```

## 023. Removing the threat source is more than moving an attacked pawn.

**Stage:** Checkpoint 1 — eight-pass repair

**Defect:** Qxg4 was generated but ranked below g-pawn defenses.

**Decision:** Use the captured threat-source relationship in explicit reply priority; preserve all other relevant defenses.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-repair-change-ledger.json

### Position: 0MDll
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 20. f6 Qxg4 21. Nxe7+ Kh8 22. hxg4

Starting FEN:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```

Ply 1: **f6** (`f5f6`)

Before:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```
After:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```

Ply 2: **Qxg4** (`d7g4`)

Before:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```
After:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```

Ply 3: **Nxe7+** (`d5e7`)

Before:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```
After:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```

Ply 5: **hxg4** (`h3g4`)

Before:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6P1/P2P4/BPP3P1/R5K1 b - - 0 22
```

## 024. Representative-line ties must remain explicit.

**Stage:** Checkpoint 1 — eight-pass repair

**Defect:** Two mating defenses were both resolved, but the exported first branch differed from Lichess.

**Decision:** Document general deterministic defense ties separately from improvements in chess correctness.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-v1-repair-change-ledger.json

### Position: 0Fmph
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 33. Qxg4+ Kh8 34. Qg7#

Starting FEN:
```text
r4rk1/nbp1p3/4P2p/Rp1p1N2/1q3Pp1/6P1/2P1QK1P/5B2 w - - 0 33
```

Ply 1: **Qxg4+** (`e2g4`)

Before:
```text
r4rk1/nbp1p3/4P2p/Rp1p1N2/1q3Pp1/6P1/2P1QK1P/5B2 w - - 0 33
```
After:
```text
r4rk1/nbp1p3/4P2p/Rp1p1N2/1q3PQ1/6P1/2P2K1P/5B2 b - - 0 33
```

Ply 2: **Kh8** (`g8h8`)

Before:
```text
r4rk1/nbp1p3/4P2p/Rp1p1N2/1q3PQ1/6P1/2P2K1P/5B2 b - - 0 33
```
After:
```text
r4r1k/nbp1p3/4P2p/Rp1p1N2/1q3PQ1/6P1/2P2K1P/5B2 w - - 1 34
```

Ply 3: **Qg7#** (`g4g7`)

Before:
```text
r4r1k/nbp1p3/4P2p/Rp1p1N2/1q3PQ1/6P1/2P2K1P/5B2 w - - 1 34
```
After:
```text
r4r1k/nbp1p1Q1/4P2p/Rp1p1N2/1q3P2/6P1/2P2K1P/5B2 b - - 2 34
```

## 025. Do not stop a specified forcing rook hunt at its first profitable capture.

**Stage:** Checkpoint 2 — fifteen target passes

**Defect:** Rxf1+ crossed the material threshold before the mating finish.

**Decision:** Continue only the qualified rook-check pattern, without new depth/probe credit; leave cash-out as a fallback.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-2-changes.json

### Position: 0F6YE
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 43... Rxf1+ 44. Kg2 Rf2+ 45. Kh3 Rh2#

Starting FEN:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

Ply 1: **Rxf1+** (`f8f1`)

Before:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

Ply 2: **Kg2** (`h1g2`)

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```

Ply 3: **Rf2+** (`f1f2`)

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```

Ply 4: **Kh3** (`g2h3`)

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```

Ply 5: **Rh2#** (`f2h2`)

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4n2r/B7 w - - 4 46
```

## 026. A legal same-square return capture can preserve the objective.

**Stage:** Checkpoint 2 — fifteen target passes

**Defect:** Any possible capture was treated as defeating the earned gain.

**Decision:** Record opponent capture, own return capture, exact gain and horizon; do not hide the bounded certificate behind an unexplained safe label.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-2-changes.json

### Position: 0yix5
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 32... f3+ 33. Kxf3 Rxh1

Starting FEN:
```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1PpP1/8/1PB2PK1/1R5R b - - 2 32
```

Ply 1: **f3+** (`f4f3`)

Before:
```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1PpP1/8/1PB2PK1/1R5R b - - 2 32
```
After:
```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1P1P1/5p2/1PB2PK1/1R5R w - - 0 33
```

Ply 2: **Kxf3** (`g2f3`)

Before:
```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1P1P1/5p2/1PB2PK1/1R5R w - - 0 33
```
After:
```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1P1P1/5K2/1PB2P2/1R5R b - - 0 33
```

Ply 3: **Rxh1** (`h6h1`)

Before:
```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1P1P1/5K2/1PB2P2/1R5R b - - 0 33
```
After:
```text
7r/2pn1kb1/1p1p1p2/pP1PpN2/2P1P1P1/5K2/1PB2P2/1R5r w - - 0 34
```

## 027. A checking king lure can create a future knight fork.

**Stage:** Checkpoint 2 — fifteen target passes

**Defect:** The temporary rook loss obscured the coordinated king/queen geometry.

**Decision:** Nominate the lure under the existing double-attack plan, then search the defenses; a witness is not an automatic proof.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-2-changes.json

### Position: 0SwRp
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 25. Rb7+ Kxb7 26. Nxd6+ Ka8 27. Nxf5

Starting FEN:
```text
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```

Ply 1: **Rb7+** (`b6b7`)

Before:
```text
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```
After:
```text
1n3r1r/1Rkp4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 b - - 2 25
```

Ply 2: **Kxb7** (`c7b7`)

Before:
```text
1n3r1r/1Rkp4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 b - - 2 25
```
After:
```text
1n3r1r/1k1p4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 0 26
```

Ply 3: **Nxd6+** (`c4d6`)

Before:
```text
1n3r1r/1k1p4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 0 26
```
After:
```text
1n3r1r/1k1p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 b - - 0 26
```

Ply 4: **Ka8** (`b7a8`)

Before:
```text
1n3r1r/1k1p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 b - - 0 26
```
After:
```text
kn3r1r/3p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 w - - 1 27
```

Ply 5: **Nxf5** (`d6f5`)

Before:
```text
kn3r1r/3p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 w - - 1 27
```
After:
```text
kn3r1r/3p4/2p1p3/p4Np1/P2P4/2P3P1/4RPQP/5K2 b - - 0 27
```

## 028. Mate threat plus queen attack is one multipurpose candidate.

**Stage:** Checkpoint 2 — fifteen target passes

**Defect:** Separate plan descriptions competed instead of reinforcing the same move.

**Decision:** Retain multiple matching reasons for one resulting board and prefer a concrete double deadline.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-2-changes.json

### Position: 0aeNv
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 11. Bc7 Qxc7 12. Nxc7+

Starting FEN:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

Ply 1: **Bc7** (`d6c7`)

Before:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```
After:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

Ply 2: **Qxc7** (`d8c7`)

Before:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```
After:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

Ply 3: **Nxc7+** (`b5c7`)

Before:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```
After:
```text
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```

## 029. A queen can shield a lower-value piece beside its king.

**Stage:** Checkpoint 3 — eighteen target passes

**Defect:** Shared-line recognition required the rear target to be more valuable.

**Decision:** Recognize the king-adjacent defensive relationship, with a narrow exposure ordering guard.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-3-changes.json

### Position: 0E1iK
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 23... Ba6 24. Qxa6 Rxa6

Starting FEN:
```text
5rk1/pbp2ppp/7r/4P3/2Q5/P1B2PPq/1P1R3P/5RK1 b - - 2 23
```

Ply 1: **Ba6** (`b7a6`)

Before:
```text
5rk1/pbp2ppp/7r/4P3/2Q5/P1B2PPq/1P1R3P/5RK1 b - - 2 23
```
After:
```text
5rk1/p1p2ppp/b6r/4P3/2Q5/P1B2PPq/1P1R3P/5RK1 w - - 3 24
```

Ply 2: **Qxa6** (`c4a6`)

Before:
```text
5rk1/p1p2ppp/b6r/4P3/2Q5/P1B2PPq/1P1R3P/5RK1 w - - 3 24
```
After:
```text
5rk1/p1p2ppp/Q6r/4P3/8/P1B2PPq/1P1R3P/5RK1 b - - 0 24
```

Ply 3: **Rxa6** (`h6a6`)

Before:
```text
5rk1/p1p2ppp/Q6r/4P3/8/P1B2PPq/1P1R3P/5RK1 b - - 0 24
```
After:
```text
5rk1/p1p2ppp/r7/4P3/8/P1B2PPq/1P1R3P/5RK1 w - - 0 25
```

## 030. Exchange verification may be needed after a king evasion, not only a capture.

**Stage:** Checkpoint 3 — eighteen target passes

**Defect:** A useful certificate was blocked solely by the previous move type.

**Decision:** Admit the existing same-square certificate in the narrowed king-reply collection context.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-3-changes.json

### Position: 0d5of
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 31. Rxf7+ Kxh6 32. Bg7+ Kh7 33. Bxf8+

Starting FEN:
```text
2r2r2/1b3pk1/p3pRpN/3pB2p/2p1P3/PnP4P/1P4P1/1B4K1 w - - 2 31
```

Ply 1: **Rxf7+** (`f6f7`)

Before:
```text
2r2r2/1b3pk1/p3pRpN/3pB2p/2p1P3/PnP4P/1P4P1/1B4K1 w - - 2 31
```
After:
```text
2r2r2/1b3Rk1/p3p1pN/3pB2p/2p1P3/PnP4P/1P4P1/1B4K1 b - - 0 31
```

Ply 2: **Kxh6** (`g7h6`)

Before:
```text
2r2r2/1b3Rk1/p3p1pN/3pB2p/2p1P3/PnP4P/1P4P1/1B4K1 b - - 0 31
```
After:
```text
2r2r2/1b3R2/p3p1pk/3pB2p/2p1P3/PnP4P/1P4P1/1B4K1 w - - 0 32
```

Ply 3: **Bg7+** (`e5g7`)

Before:
```text
2r2r2/1b3R2/p3p1pk/3pB2p/2p1P3/PnP4P/1P4P1/1B4K1 w - - 0 32
```
After:
```text
2r2r2/1b3RB1/p3p1pk/3p3p/2p1P3/PnP4P/1P4P1/1B4K1 b - - 1 32
```

Ply 4: **Kh7** (`h6h7`)

Before:
```text
2r2r2/1b3RB1/p3p1pk/3p3p/2p1P3/PnP4P/1P4P1/1B4K1 b - - 1 32
```
After:
```text
2r2r2/1b3RBk/p3p1p1/3p3p/2p1P3/PnP4P/1P4P1/1B4K1 w - - 2 33
```

Ply 5: **Bxf8+** (`g7f8`)

Before:
```text
2r2r2/1b3RBk/p3p1p1/3p3p/2p1P3/PnP4P/1P4P1/1B4K1 w - - 2 33
```
After:
```text
2r2B2/1b3R1k/p3p1p1/3p3p/2p1P3/PnP4P/1P4P1/1B4K1 b - - 0 33
```

## 031. Check a board-local terminal before a blanket depth rejection.

**Stage:** Checkpoint 3 — eighteen target passes

**Defect:** A sufficient gained position at ply seven was rejected without testing the boundary.

**Decision:** Apply the same bounded quiet-surface safety test at every depth; do not accept because the reference happens to end there.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-3-changes.json

### Position: 09UnX
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 35. Qxe8+ Nxe8 36. d7 Bxa4 37. d8=Q

Starting FEN:
```text
4r1k1/6n1/3P4/p2P3q/P7/4Q3/2b3PP/4R1K1 w - - 2 35
```

Ply 1: **Qxe8+** (`e3e8`)

Before:
```text
4r1k1/6n1/3P4/p2P3q/P7/4Q3/2b3PP/4R1K1 w - - 2 35
```
After:
```text
4Q1k1/6n1/3P4/p2P3q/P7/8/2b3PP/4R1K1 b - - 0 35
```

Ply 2: **Nxe8** (`g7e8`)

Before:
```text
4Q1k1/6n1/3P4/p2P3q/P7/8/2b3PP/4R1K1 b - - 0 35
```
After:
```text
4n1k1/8/3P4/p2P3q/P7/8/2b3PP/4R1K1 w - - 0 36
```

Ply 3: **d7** (`d6d7`)

Before:
```text
4n1k1/8/3P4/p2P3q/P7/8/2b3PP/4R1K1 w - - 0 36
```
After:
```text
4n1k1/3P4/8/p2P3q/P7/8/2b3PP/4R1K1 b - - 0 36
```

Ply 4: **Bxa4** (`c2a4`)

Before:
```text
4n1k1/3P4/8/p2P3q/P7/8/2b3PP/4R1K1 b - - 0 36
```
After:
```text
4n1k1/3P4/8/p2P3q/b7/8/6PP/4R1K1 w - - 0 37
```

Ply 5: **d8=Q** (`d7d8q`)

Before:
```text
4n1k1/3P4/8/p2P3q/b7/8/6PP/4R1K1 w - - 0 37
```
After:
```text
3Qn1k1/8/8/p2P3q/b7/8/6PP/4R1K1 b - - 0 37
```

## 032. PGN class examples are not the exhaustive computation log.

**Stage:** Checkpoint 3 — eighteen target passes

**Defect:** Raw PGNs drowned the tactical explanation in hundreds of abandoned nominees.

**Decision:** Show one example per repeated unsuccessful class; preserve all actual explored operations in source evidence.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-3-changes.json

Method-level lesson; no particular board asserted.

## 033. Replace weighted bonuses with an executable ordering card.

**Stage:** Checkpoint 4 — explicit ORDER; nineteen target passes

**Defect:** Priority totals made the behavior difficult to teach and audit.

**Decision:** Use first-matching ORDER rows plus named lexicographic ties. Keep real material accounting separate from ranking.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-4-ordering-card.json

Method-level lesson; no particular board asserted.

## 034. Urgency has two categories; being in check is a weakness.

**Stage:** Checkpoint 4 — explicit ORDER; nineteen target passes

**Defect:** Numeric weakness ranks blurred structural cues with immediate obligations.

**Decision:** FATAL means established next-turn loss of the objective unless repaired/countered; NONFATAL means no such consequence established. Own check is always a legal obligation.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-4-ordering-card.json

Method-level lesson; no particular board asserted.

## 035. Answer the checking recapture before consolidating.

**Stage:** Checkpoint 4 — explicit ORDER; nineteen target passes

**Defect:** fxg3 was accepted before Qxg3+ required a king response.

**Decision:** A checking recapture remains mandatory unless the existing legal return-capture certificate covers it.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-4-delta.json

### Position: 09k24
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 29. fxg3 Qxg3+ 30. Kh1

Starting FEN:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1rb/3Q1P2/R1R3K1 w - - 0 29
```

Ply 1: **fxg3** (`f2g3`)

Before:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1rb/3Q1P2/R1R3K1 w - - 0 29
```
After:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1Pb/3Q4/R1R3K1 b - - 0 29
```

Ply 2: **Qxg3+** (`g6g3`)

Before:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1Pb/3Q4/R1R3K1 b - - 0 29
```
After:
```text
5rk1/1p4p1/8/pP1p4/P3pN2/4P1qb/3Q4/R1R3K1 w - - 0 30
```

Ply 3: **Kh1** (`g1h1`)

Before:
```text
5rk1/1p4p1/8/pP1p4/P3pN2/4P1qb/3Q4/R1R3K1 w - - 0 30
```
After:
```text
5rk1/1p4p1/8/pP1p4/P3pN2/4P1qb/3Q4/R1R4K b - - 1 30
```

## 036. Limited mobility is a plan, not just a king property.

**Stage:** Checkpoint 5 — mobility and square clearance; twenty target passes

**Defect:** A trapped queen lacked a human-readable explanation even in a passing line.

**Decision:** Use target-specific escape queries; add Restrict and trap. Static mobility is a cue, not proof against all defensive resources.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-5-changes.json

### Position: 0aeNv
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 11. Bc7 Qxc7 12. Nxc7+

Starting FEN:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

Ply 1: **Bc7** (`d6c7`)

Before:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```
After:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

Ply 2: **Qxc7** (`d8c7`)

Before:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```
After:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

Ply 3: **Nxc7+** (`b5c7`)

Before:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```
After:
```text
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```

## 037. Clearance includes a square, not only a slider ray.

**Stage:** Checkpoint 5 — mobility and square clearance; twenty target passes

**Defect:** Bc7 vacated d6 for a knight mate, which the line-only vocabulary missed.

**Decision:** Recognize a vacated entry square tied to a concrete mating move or material collection.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-5-changes.json

### Position: 0aeNv
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 11. Bc7 Qxc7 12. Nxc7+

Starting FEN:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

Ply 1: **Bc7** (`d6c7`)

Before:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```
After:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

Ply 2: **Qxc7** (`d8c7`)

Before:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```
After:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

Ply 3: **Nxc7+** (`b5c7`)

Before:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```
After:
```text
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```

## 038. A discovered capturing continuation can make an intermediate gain premature.

**Stage:** Checkpoint 5 — mobility and square clearance; twenty target passes

**Defect:** The line stopped before the bishop cleared the rook/king ray with capture.

**Decision:** Defer the material boundary while the specified capturing clearance remains to investigate.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-5-changes.json

### Position: 0lFT8
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 25. Bxe6+ Rf7 26. Bxf7+ Kg7 27. Bxd5+

Starting FEN:
```text
r4rk1/ppR4p/2b1p1p1/3p4/4pBB1/q5P1/4RP1P/6K1 w - - 4 25
```

Ply 1: **Bxe6+** (`g4e6`)

Before:
```text
r4rk1/ppR4p/2b1p1p1/3p4/4pBB1/q5P1/4RP1P/6K1 w - - 4 25
```
After:
```text
r4rk1/ppR4p/2b1B1p1/3p4/4pB2/q5P1/4RP1P/6K1 b - - 0 25
```

Ply 2: **Rf7** (`f8f7`)

Before:
```text
r4rk1/ppR4p/2b1B1p1/3p4/4pB2/q5P1/4RP1P/6K1 b - - 0 25
```
After:
```text
r5k1/ppR2r1p/2b1B1p1/3p4/4pB2/q5P1/4RP1P/6K1 w - - 1 26
```

Ply 3: **Bxf7+** (`e6f7`)

Before:
```text
r5k1/ppR2r1p/2b1B1p1/3p4/4pB2/q5P1/4RP1P/6K1 w - - 1 26
```
After:
```text
r5k1/ppR2B1p/2b3p1/3p4/4pB2/q5P1/4RP1P/6K1 b - - 0 26
```

Ply 4: **Kg7** (`g8g7`)

Before:
```text
r5k1/ppR2B1p/2b3p1/3p4/4pB2/q5P1/4RP1P/6K1 b - - 0 26
```
After:
```text
r7/ppR2Bkp/2b3p1/3p4/4pB2/q5P1/4RP1P/6K1 w - - 1 27
```

Ply 5: **Bxd5+** (`f7d5`)

Before:
```text
r7/ppR2Bkp/2b3p1/3p4/4pB2/q5P1/4RP1P/6K1 w - - 1 27
```
After:
```text
r7/ppR3kp/2b3p1/3B4/4pB2/q5P1/4RP1P/6K1 b - - 0 27
```

## 039. A facts-only Oracle is an architectural boundary, not a label.

**Stage:** Checkpoint 5 — mobility and square clearance; twenty target passes

**Defect:** Card matching and multi-ply certificates had accumulated inside JavaScript helpers.

**Decision:** Document the split and meter auxiliary work. Postpone refactoring by explicit user choice; do not describe the present implementation as a simple FEN-to-facts DFA.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-5-algorithm.md

Method-level lesson; no particular board asserted.

## 040. A missing HTML output path is a packaging error, not lost chess progress.

**Stage:** Checkpoint 6 — recovered source and twenty-four target passes

**Defect:** A previous gate failed despite source-bound trial results.

**Decision:** Verify actual source/configuration/results independently and repair packaging without changing policy.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-6-verification.json

Method-level lesson; no particular board asserted.

## 041. Collect with the checking piece instead of starting unrelated checks.

**Stage:** Checkpoint 6 — recovered source and twenty-four target passes

**Defect:** King evasions after a queen fork led to more queen harassment.

**Decision:** Prioritize admitted positive-net captures by the checker that reach the existing objective.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-6-verification.json

### Position: 0PSQq
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 37... Qc4+ 38. Rc3 dxc3

Starting FEN:
```text
6qk/6r1/p4Q2/1p4p1/3p4/3RbP1P/1PK4R/8 b - - 1 37
```

Ply 1: **Qc4+** (`g8c4`)

Before:
```text
6qk/6r1/p4Q2/1p4p1/3p4/3RbP1P/1PK4R/8 b - - 1 37
```
After:
```text
7k/6r1/p4Q2/1p4p1/2qp4/3RbP1P/1PK4R/8 w - - 2 38
```

Ply 2: **Rc3** (`d3c3`)

Before:
```text
7k/6r1/p4Q2/1p4p1/2qp4/3RbP1P/1PK4R/8 w - - 2 38
```
After:
```text
7k/6r1/p4Q2/1p4p1/2qp4/2R1bP1P/1PK4R/8 b - - 3 38
```

Ply 3: **dxc3** (`d4c3`)

Before:
```text
7k/6r1/p4Q2/1p4p1/2qp4/2R1bP1P/1PK4R/8 b - - 3 38
```
After:
```text
7k/6r1/p4Q2/1p4p1/2q5/2p1bP1P/1PK4R/8 w - - 0 39
```

## 042. A supported block by the other forked target can be the meaningful defense.

**Stage:** Checkpoint 6 — recovered source and twenty-four target passes

**Defect:** King moves dominated the representative line while Rc3 answered check and moved the rook.

**Decision:** Prefer the supported target block within the existing evasion priorities; retain other evasions.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-6-verification.json

### Position: 0PSQq
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 37... Qc4+ 38. Rc3 dxc3

Starting FEN:
```text
6qk/6r1/p4Q2/1p4p1/3p4/3RbP1P/1PK4R/8 b - - 1 37
```

Ply 1: **Qc4+** (`g8c4`)

Before:
```text
6qk/6r1/p4Q2/1p4p1/3p4/3RbP1P/1PK4R/8 b - - 1 37
```
After:
```text
7k/6r1/p4Q2/1p4p1/2qp4/3RbP1P/1PK4R/8 w - - 2 38
```

Ply 2: **Rc3** (`d3c3`)

Before:
```text
7k/6r1/p4Q2/1p4p1/2qp4/3RbP1P/1PK4R/8 w - - 2 38
```
After:
```text
7k/6r1/p4Q2/1p4p1/2qp4/2R1bP1P/1PK4R/8 b - - 3 38
```

Ply 3: **dxc3** (`d4c3`)

Before:
```text
7k/6r1/p4Q2/1p4p1/2qp4/2R1bP1P/1PK4R/8 b - - 3 38
```
After:
```text
7k/6r1/p4Q2/1p4p1/2q5/2p1bP1P/1PK4R/8 w - - 0 39
```

## 043. A promotion danger must be executable.

**Stage:** Checkpoint 6 — recovered source and twenty-four target passes

**Defect:** A blocked advanced pawn was confused with an immediate promotion; a checked side is merely delayed.

**Decision:** Distinguish genuine blockage from temporary check using legal directed pawn queries.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-6-verification.json

Method-level lesson; no particular board asserted.

## 044. Presentation caches must be bound to the actual run.

**Stage:** Checkpoint 6 — recovered source and twenty-four target passes

**Defect:** Old annotations could survive a new search and display stale moves.

**Decision:** Compare every displayed tree and exported PGN to the current execution before packaging.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-6-verification.json

Method-level lesson; no particular board asserted.

## 045. Queen offers require an independent recovery piece.

**Stage:** Checkpoint 7 — coordinated countertrade; twenty-seven target passes

**Defect:** The offered queen could incorrectly be counted as its own compensation.

**Decision:** Recognize a countertrade only through another piece; then search the forcing recovery.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-7-changes.json

### Position: 0TNfM
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 14. gxf3 Bxe3 15. Nxf6+ gxf6 16. fxe3

Starting FEN:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```

Ply 1: **gxf3** (`g2f3`)

Before:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```
After:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```

Ply 2: **Bxe3** (`c5e3`)

Before:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```
After:
```text
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```

Ply 3: **Nxf6+** (`d5f6`)

Before:
```text
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```
After:
```text
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```

Ply 4: **gxf6** (`g7f6`)

Before:
```text
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```
After:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```

Ply 5: **fxe3** (`f2e3`)

Before:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```
After:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BPP1P/PPP5/R4RK1 b kq - 0 16
```

## 046. A checking recovery can preserve an older cash-out.

**Stage:** Checkpoint 7 — coordinated countertrade; twenty-seven target passes

**Defect:** Ordinary recapture ordering interrupted Nxf6+ and the subsequent bishop collection.

**Decision:** Prefer the objective-changing checking recovery while keeping the exchange relationship in context.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-7-changes.json

### Position: 0TNfM
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 14. gxf3 Bxe3 15. Nxf6+ gxf6 16. fxe3

Starting FEN:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```

Ply 1: **gxf3** (`g2f3`)

Before:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```
After:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```

Ply 2: **Bxe3** (`c5e3`)

Before:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```
After:
```text
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```

Ply 3: **Nxf6+** (`d5f6`)

Before:
```text
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```
After:
```text
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```

Ply 4: **gxf6** (`g7f6`)

Before:
```text
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```
After:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```

Ply 5: **fxe3** (`f2e3`)

Before:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```
After:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BPP1P/PPP5/R4RK1 b kq - 0 16
```

## 047. A smaller remaining gain does not make the main defense irrelevant.

**Stage:** Checkpoint 7 — coordinated countertrade; twenty-seven target passes

**Defect:** Qxg5 could be screened after the queen attack because another collection remained.

**Decision:** Retain captures that remove the source of a queen-loss threat; their counterplay deserves actual investigation.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-7-changes.json

### Position: 0mVOQ
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 24. Bg5 g6 25. Qxe6 Qxg5 26. Qxd6

Starting FEN:
```text
r5k1/5ppp/3brn1q/1p1ppQ1P/7B/pPP2P2/P5P1/1KR2N1R w - - 4 24
```

Ply 1: **Bg5** (`h4g5`)

Before:
```text
r5k1/5ppp/3brn1q/1p1ppQ1P/7B/pPP2P2/P5P1/1KR2N1R w - - 4 24
```
After:
```text
r5k1/5ppp/3brn1q/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R b - - 5 24
```

Ply 2: **g6** (`g7g6`)

Before:
```text
r5k1/5ppp/3brn1q/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R b - - 5 24
```
After:
```text
r5k1/5p1p/3brnpq/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R w - - 0 25
```

Ply 3: **Qxe6** (`f5e6`)

Before:
```text
r5k1/5p1p/3brnpq/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R w - - 0 25
```
After:
```text
r5k1/5p1p/3bQnpq/1p1pp1BP/8/pPP2P2/P5P1/1KR2N1R b - - 0 25
```

Ply 4: **Qxg5** (`h6g5`)

Before:
```text
r5k1/5p1p/3bQnpq/1p1pp1BP/8/pPP2P2/P5P1/1KR2N1R b - - 0 25
```
After:
```text
r5k1/5p1p/3bQnp1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R w - - 0 26
```

Ply 5: **Qxd6** (`e6d6`)

Before:
```text
r5k1/5p1p/3bQnp1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R w - - 0 26
```
After:
```text
r5k1/5p1p/3Q1np1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R b - - 0 26
```

## 048. One collector can protect a second asset.

**Stage:** Checkpoint 7 — coordinated countertrade; twenty-seven target passes

**Defect:** A check-capturing rook and the other attacked rook were evaluated independently.

**Decision:** Allow a bounded return-capture certificate only when the same collector can supply the legal protection.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-7-changes.json

### Position: 0im5g
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 34. Bxc5 Qxf1+ 35. Rxf1

Starting FEN:
```text
8/1k2rR1p/p2br3/Qpnp2P1/P2B3P/1P1q4/2P5/2K2R2 w - - 0 34
```

Ply 1: **Bxc5** (`d4c5`)

Before:
```text
8/1k2rR1p/p2br3/Qpnp2P1/P2B3P/1P1q4/2P5/2K2R2 w - - 0 34
```
After:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P1q4/2P5/2K2R2 b - - 0 34
```

Ply 2: **Qxf1+** (`d3f1`)

Before:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P1q4/2P5/2K2R2 b - - 0 34
```
After:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P6/2P5/2K2q2 w - - 0 35
```

Ply 3: **Rxf1** (`f7f1`)

Before:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P6/2P5/2K2q2 w - - 0 35
```
After:
```text
8/1k2r2p/p2br3/QpBp2P1/P6P/1P6/2P5/2K2R2 b - - 0 35
```

## 049. Do not replace chess discrimination with an arbitrary time slice.

**Stage:** Prune-versus-yield experiment — rejected scheduling change

**Defect:** Eight-position yielding reached waiting moves but starved good plans and accepted weaker cash-outs first.

**Decision:** Reject the scheduler: it fell from 27 to 17 high-band passes, with no new passes. Preserve DFS.

**Status:** rejected alternative
**Evidence:** history/sources/pressure-prune-yield-results.json

### Position: 0SwRp
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 25. Rb7+ Kxb7 26. Nxd6+ Ka8 27. Nxf5

Starting FEN:
```text
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```

Ply 1: **Rb7+** (`b6b7`)

Before:
```text
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```
After:
```text
1n3r1r/1Rkp4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 b - - 2 25
```

Ply 2: **Kxb7** (`c7b7`)

Before:
```text
1n3r1r/1Rkp4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 b - - 2 25
```
After:
```text
1n3r1r/1k1p4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 0 26
```

Ply 3: **Nxd6+** (`c4d6`)

Before:
```text
1n3r1r/1k1p4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 0 26
```
After:
```text
1n3r1r/1k1p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 b - - 0 26
```

Ply 4: **Ka8** (`b7a8`)

Before:
```text
1n3r1r/1k1p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 b - - 0 26
```
After:
```text
kn3r1r/3p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 w - - 1 27
```

Ply 5: **Nxf5** (`d6f5`)

Before:
```text
kn3r1r/3p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 w - - 1 27
```
After:
```text
kn3r1r/3p4/2p1p3/p4Np1/P2P4/2P3P1/4RPQP/5K2 b - - 0 27
```

### Position: 0VL6e
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 23. Ne5+ Kd8 24. Nxc6+ Kc7 25. Nxb8

Starting FEN:
```text
1q2k2r/4pNb1/2pp2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R w k - 0 23
```

Ply 1: **Ne5+** (`f7e5`)

Before:
```text
1q2k2r/4pNb1/2pp2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R w k - 0 23
```
After:
```text
1q2k2r/4p1b1/2pp2Q1/3nN3/p2P4/P3B2P/1rp3P1/2K2R1R b k - 1 23
```

Ply 2: **Kd8** (`e8d8`)

Before:
```text
1q2k2r/4p1b1/2pp2Q1/3nN3/p2P4/P3B2P/1rp3P1/2K2R1R b k - 1 23
```
After:
```text
1q1k3r/4p1b1/2pp2Q1/3nN3/p2P4/P3B2P/1rp3P1/2K2R1R w - - 2 24
```

Ply 3: **Nxc6+** (`e5c6`)

Before:
```text
1q1k3r/4p1b1/2pp2Q1/3nN3/p2P4/P3B2P/1rp3P1/2K2R1R w - - 2 24
```
After:
```text
1q1k3r/4p1b1/2Np2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R b - - 0 24
```

Ply 4: **Kc7** (`d8c7`)

Before:
```text
1q1k3r/4p1b1/2Np2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R b - - 0 24
```
After:
```text
1q5r/2k1p1b1/2Np2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R w - - 1 25
```

Ply 5: **Nxb8** (`c6b8`)

Before:
```text
1q5r/2k1p1b1/2Np2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R w - - 1 25
```
After:
```text
1N5r/2k1p1b1/3p2Q1/3n4/p2P4/P3B2P/1rp3P1/2K2R1R b - - 0 25
```

## 050. Prune a proved bounded dead end, not a line merely taking time.

**Stage:** Prune-versus-yield experiment — rejected scheduling change

**Defect:** Ng5 had a genuine mate threat but some deeper continuations could not reach any allowed terminal in the remaining ply.

**Decision:** A last-turn impossibility test saved entries without adding passes; report that limited outcome honestly.

**Status:** diagnostic, not promoted
**Evidence:** history/sources/pressure-prune-yield-results.json

### Position: 05HWi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15. Nxe7+ Qxe7 16. Qg6+ Kh8 17. Qxg4

Starting FEN:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

Ply 1: **Nxe7+** (`d5e7`)

Before:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```
After:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

Ply 2: **Qxe7** (`d8e7`)

Before:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```
After:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

Ply 3: **Qg6+** (`h6g6`)

Before:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```
After:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```
After:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

Ply 5: **Qxg4** (`g6g4`)

Before:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

## 051. Checks first is too broad.

**Stage:** Checkpoint 8 — constrained forcing priority; twenty-eight target passes

**Defect:** Blanket checking priority displaced collection of forked targets and established plans.

**Decision:** Prefer an admitted noncapturing checking fork with at most two legal answers, after certified cash-outs.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-8-changes.json

### Position: 05lSg
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 27... Ng3+ 28. hxg3 hxg5+ 29. Qh7 Rxh7+

Starting FEN:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3N2/1PP1n2P/5RBK b - - 0 27
```

Ply 1: **Ng3+** (`e2g3`)

Before:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3N2/1PP1n2P/5RBK b - - 0 27
```
After:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3Nn1/1PP4P/5RBK w - - 1 28
```

Ply 2: **hxg3** (`h2g3`)

Before:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3Nn1/1PP4P/5RBK w - - 1 28
```
After:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3NP1/1PP5/5RBK b - - 0 28
```

Ply 3: **hxg5+** (`h6g5`)

Before:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3NP1/1PP5/5RBK b - - 0 28
```
After:
```text
5b1r/1p1k2p1/2p5/6p1/4QqP1/1P3NP1/1PP5/5RBK w - - 0 29
```

Ply 4: **Qh7** (`e4h7`)

Before:
```text
5b1r/1p1k2p1/2p5/6p1/4QqP1/1P3NP1/1PP5/5RBK w - - 0 29
```
After:
```text
5b1r/1p1k2pQ/2p5/6p1/5qP1/1P3NP1/1PP5/5RBK b - - 1 29
```

Ply 5: **Rxh7+** (`h8h7`)

Before:
```text
5b1r/1p1k2pQ/2p5/6p1/5qP1/1P3NP1/1PP5/5RBK b - - 1 29
```
After:
```text
5b2/1p1k2pr/2p5/6p1/5qP1/1P3NP1/1PP5/5RBK w - - 0 30
```

## 052. The actual checker can differ from the moved piece.

**Stage:** Checkpoint 8 — constrained forcing priority; twenty-eight target passes

**Defect:** hxg5+ was a discovered rook check, but context remembered only the pawn.

**Decision:** Bind the actual checking source for later collection rules; keep the context correction even when it mainly reduces search work.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-8-changes.json

### Position: 05lSg
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 27... Ng3+ 28. hxg3 hxg5+ 29. Qh7 Rxh7+

Starting FEN:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3N2/1PP1n2P/5RBK b - - 0 27
```

Ply 1: **Ng3+** (`e2g3`)

Before:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3N2/1PP1n2P/5RBK b - - 0 27
```
After:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3Nn1/1PP4P/5RBK w - - 1 28
```

Ply 2: **hxg3** (`h2g3`)

Before:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3Nn1/1PP4P/5RBK w - - 1 28
```
After:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3NP1/1PP5/5RBK b - - 0 28
```

Ply 3: **hxg5+** (`h6g5`)

Before:
```text
5b1r/1p1k2p1/2p4p/6N1/4QqP1/1P3NP1/1PP5/5RBK b - - 0 28
```
After:
```text
5b1r/1p1k2p1/2p5/6p1/4QqP1/1P3NP1/1PP5/5RBK w - - 0 29
```

Ply 4: **Qh7** (`e4h7`)

Before:
```text
5b1r/1p1k2p1/2p5/6p1/4QqP1/1P3NP1/1PP5/5RBK w - - 0 29
```
After:
```text
5b1r/1p1k2pQ/2p5/6p1/5qP1/1P3NP1/1PP5/5RBK b - - 1 29
```

Ply 5: **Rxh7+** (`h8h7`)

Before:
```text
5b1r/1p1k2pQ/2p5/6p1/5qP1/1P3NP1/1PP5/5RBK b - - 1 29
```
After:
```text
5b2/1p1k2pr/2p5/6p1/5qP1/1P3NP1/1PP5/5RBK w - - 0 30
```

## 053. A checkpoint must be sufficient to resume in a new instance.

**Stage:** Checkpoint 8 — constrained forcing priority; twenty-eight target passes

**Defect:** An HTML viewer alone did not guarantee access to runtime, tests and baseline.

**Decision:** Embed a checksummed executable ZIP and continuation contract; extract it in a clean directory and rerun before release.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-8-verification.json

Method-level lesson; no particular board asserted.

## 054. Successive pawn checks can pursue one surviving compensation.

**Stage:** Checkpoint 9 — continuing sole-guard deflection; twenty-nine target passes

**Defect:** The second check a5+ was charged as another speculative idea although the king still guarded the target.

**Decision:** Re-observe the king as sole guard on each board; productive pawn checks continue that same plan without replenishing the probe.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-9-changes.json

### Position: 0LvDm
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 56. b4+ Kb6 57. a5+ Kc6 58. Bxa6

Starting FEN:
```text
8/p7/b7/k2p1p1p/P2PpPpP/1PK3P1/4B3/8 w - - 9 56
```

Ply 1: **b4+** (`b3b4`)

Before:
```text
8/p7/b7/k2p1p1p/P2PpPpP/1PK3P1/4B3/8 w - - 9 56
```
After:
```text
8/p7/b7/k2p1p1p/PP1PpPpP/2K3P1/4B3/8 b - - 0 56
```

Ply 2: **Kb6** (`a5b6`)

Before:
```text
8/p7/b7/k2p1p1p/PP1PpPpP/2K3P1/4B3/8 b - - 0 56
```
After:
```text
8/p7/bk6/3p1p1p/PP1PpPpP/2K3P1/4B3/8 w - - 1 57
```

Ply 3: **a5+** (`a4a5`)

Before:
```text
8/p7/bk6/3p1p1p/PP1PpPpP/2K3P1/4B3/8 w - - 1 57
```
After:
```text
8/p7/bk6/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 b - - 0 57
```

Ply 4: **Kc6** (`b6c6`)

Before:
```text
8/p7/bk6/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 b - - 0 57
```
After:
```text
8/p7/b1k5/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 w - - 1 58
```

Ply 5: **Bxa6** (`e2a6`)

Before:
```text
8/p7/b1k5/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 w - - 1 58
```
After:
```text
8/p7/B1k5/P2p1p1p/1P1PpPpP/2K3P1/8/8 b - - 0 58
```

## 055. Endgame representative ties need a concrete countertarget.

**Stage:** Checkpoint 9 — continuing sole-guard deflection; twenty-nine target passes

**Defect:** Equivalent evasions yielded a different short collection line.

**Decision:** Use a narrow sparse-ending pawn-check tie toward an opposing undefended pawn; keep it distinct from a claim of universal best defense.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-9-changes.json

### Position: 0LvDm
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 56. b4+ Kb6 57. a5+ Kc6 58. Bxa6

Starting FEN:
```text
8/p7/b7/k2p1p1p/P2PpPpP/1PK3P1/4B3/8 w - - 9 56
```

Ply 1: **b4+** (`b3b4`)

Before:
```text
8/p7/b7/k2p1p1p/P2PpPpP/1PK3P1/4B3/8 w - - 9 56
```
After:
```text
8/p7/b7/k2p1p1p/PP1PpPpP/2K3P1/4B3/8 b - - 0 56
```

Ply 2: **Kb6** (`a5b6`)

Before:
```text
8/p7/b7/k2p1p1p/PP1PpPpP/2K3P1/4B3/8 b - - 0 56
```
After:
```text
8/p7/bk6/3p1p1p/PP1PpPpP/2K3P1/4B3/8 w - - 1 57
```

Ply 3: **a5+** (`a4a5`)

Before:
```text
8/p7/bk6/3p1p1p/PP1PpPpP/2K3P1/4B3/8 w - - 1 57
```
After:
```text
8/p7/bk6/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 b - - 0 57
```

Ply 4: **Kc6** (`b6c6`)

Before:
```text
8/p7/bk6/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 b - - 0 57
```
After:
```text
8/p7/b1k5/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 w - - 1 58
```

Ply 5: **Bxa6** (`e2a6`)

Before:
```text
8/p7/b1k5/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 w - - 1 58
```
After:
```text
8/p7/B1k5/P2p1p1p/1P1PpPpP/2K3P1/8/8 b - - 0 58
```

## 056. The collector need not be the checker.

**Stage:** Checkpoint 10 — five-case batch; thirty-four target passes

**Defect:** Ne7+ cleared a rook capture, but a same-piece rule missed Rxf8.

**Decision:** Bind the vacated capture ray and prefer the different piece that can collect the uncovered target.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-10-changes.json

### Position: 073kr
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 31. Ne7+ Kh7 32. Rxf8 Ra1+ 33. Kg2

Starting FEN:
```text
5rk1/6p1/2pR3p/1p2pNn1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 11 31
```

Ply 1: **Ne7+** (`f5e7`)

Before:
```text
5rk1/6p1/2pR3p/1p2pNn1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 11 31
```
After:
```text
5rk1/4N1p1/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 b - - 12 31
```

Ply 2: **Kh7** (`g8h7`)

Before:
```text
5rk1/4N1p1/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 b - - 12 31
```
After:
```text
5r2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 13 32
```

Ply 3: **Rxf8** (`f1f8`)

Before:
```text
5r2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 13 32
```
After:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/6K1 b - - 0 32
```

Ply 4: **Ra1+** (`a2a1`)

Before:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/6K1 b - - 0 32
```
After:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/7P/r5K1 w - - 1 33
```

Ply 5: **Kg2** (`g1g2`)

Before:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/7P/r5K1 w - - 1 33
```
After:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/6KP/r7 b - - 2 33
```

## 057. A cheaper piece can create a quiet queen-rook fork.

**Stage:** Checkpoint 10 — five-case batch; thirty-four target passes

**Defect:** Ne4 lost priority to less coordinated candidates.

**Decision:** Use the explicit fork relationship and cheaper-attacker guard; do not extend the same priority to arbitrary queen/rook moves.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-10-changes.json

### Position: 0jZQq
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 29. Ne4 Rf5 30. Qxf5 Bxf5 31. Nxc3

Starting FEN:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p5/2q3N1/P5PP/6RK w - - 2 29
```

Ply 1: **Ne4** (`g3e4`)

Before:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p5/2q3N1/P5PP/6RK w - - 2 29
```
After:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p1N3/2q5/P5PP/6RK b - - 3 29
```

Ply 2: **Rf5** (`f6f5`)

Before:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p1N3/2q5/P5PP/6RK b - - 3 29
```
After:
```text
r6k/pR1b3p/3p4/3Pnr1Q/2p1N3/2q5/P5PP/6RK w - - 4 30
```

Ply 3: **Qxf5** (`h5f5`)

Before:
```text
r6k/pR1b3p/3p4/3Pnr1Q/2p1N3/2q5/P5PP/6RK w - - 4 30
```
After:
```text
r6k/pR1b3p/3p4/3PnQ2/2p1N3/2q5/P5PP/6RK b - - 0 30
```

Ply 4: **Bxf5** (`d7f5`)

Before:
```text
r6k/pR1b3p/3p4/3PnQ2/2p1N3/2q5/P5PP/6RK b - - 0 30
```
After:
```text
r6k/pR5p/3p4/3Pnb2/2p1N3/2q5/P5PP/6RK w - - 0 31
```

Ply 5: **Nxc3** (`e4c3`)

Before:
```text
r6k/pR5p/3p4/3Pnb2/2p1N3/2q5/P5PP/6RK w - - 0 31
```
After:
```text
r6k/pR5p/3p4/3Pnb2/2p5/2N5/P5PP/6RK b - - 0 31
```

## 058. Improved defense may repair exposure without deleting ATTACKED.

**Stage:** Checkpoint 10 — five-case batch; thirty-four target passes

**Defect:** Kc2/Kh7 retained attacked-piece facts despite preserving the earned conversion.

**Decision:** Evaluate reduced material liability and actual return-capture protection, not only disappearing predicate identifiers.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-10-changes.json

### Position: 0fn3r
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 25. Rxd7 Qxf4+ 26. Kc2

Starting FEN:
```text
r3r1k1/2pn1R2/p3p1p1/1p2P1b1/3P1P1q/BPP5/3K4/R5Q1 w - - 0 25
```

Ply 1: **Rxd7** (`f7d7`)

Before:
```text
r3r1k1/2pn1R2/p3p1p1/1p2P1b1/3P1P1q/BPP5/3K4/R5Q1 w - - 0 25
```
After:
```text
r3r1k1/2pR4/p3p1p1/1p2P1b1/3P1P1q/BPP5/3K4/R5Q1 b - - 0 25
```

Ply 2: **Qxf4+** (`h4f4`)

Before:
```text
r3r1k1/2pR4/p3p1p1/1p2P1b1/3P1P1q/BPP5/3K4/R5Q1 b - - 0 25
```
After:
```text
r3r1k1/2pR4/p3p1p1/1p2P1b1/3P1q2/BPP5/3K4/R5Q1 w - - 0 26
```

Ply 3: **Kc2** (`d2c2`)

Before:
```text
r3r1k1/2pR4/p3p1p1/1p2P1b1/3P1q2/BPP5/3K4/R5Q1 w - - 0 26
```
After:
```text
r3r1k1/2pR4/p3p1p1/1p2P1b1/3P1q2/BPP5/2K5/R5Q1 b - - 1 26
```

### Position: 0wRZm
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 19... Kxg6 20. Qg4+ Kh7

Starting FEN:
```text
r1Q2r2/ppp1q1pk/3p2Np/8/1b1np3/1B6/PP3PPP/R1B2RK1 b - - 0 19
```

Ply 1: **Kxg6** (`h7g6`)

Before:
```text
r1Q2r2/ppp1q1pk/3p2Np/8/1b1np3/1B6/PP3PPP/R1B2RK1 b - - 0 19
```
After:
```text
r1Q2r2/ppp1q1p1/3p2kp/8/1b1np3/1B6/PP3PPP/R1B2RK1 w - - 0 20
```

Ply 2: **Qg4+** (`c8g4`)

Before:
```text
r1Q2r2/ppp1q1p1/3p2kp/8/1b1np3/1B6/PP3PPP/R1B2RK1 w - - 0 20
```
After:
```text
r4r2/ppp1q1p1/3p2kp/8/1b1np1Q1/1B6/PP3PPP/R1B2RK1 b - - 1 20
```

Ply 3: **Kh7** (`g6h7`)

Before:
```text
r4r2/ppp1q1p1/3p2kp/8/1b1np1Q1/1B6/PP3PPP/R1B2RK1 b - - 1 20
```
After:
```text
r4r2/ppp1q1pk/3p3p/8/1b1np1Q1/1B6/PP3PPP/R1B2RK1 w - - 2 21
```

## 059. Once the goal is secured, optional extra material is not automatically critical.

**Stage:** Checkpoint 10 — five-case batch; thirty-four target passes

**Defect:** The runner chased pawn targets instead of consolidating the intended gain.

**Decision:** Keep mandatory rollback/countercheck obligations but do not let an optional pawn reset the collection plan.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-10-changes.json

### Position: 073kr
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 31. Ne7+ Kh7 32. Rxf8 Ra1+ 33. Kg2

Starting FEN:
```text
5rk1/6p1/2pR3p/1p2pNn1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 11 31
```

Ply 1: **Ne7+** (`f5e7`)

Before:
```text
5rk1/6p1/2pR3p/1p2pNn1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 11 31
```
After:
```text
5rk1/4N1p1/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 b - - 12 31
```

Ply 2: **Kh7** (`g8h7`)

Before:
```text
5rk1/4N1p1/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 b - - 12 31
```
After:
```text
5r2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 13 32
```

Ply 3: **Rxf8** (`f1f8`)

Before:
```text
5r2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 13 32
```
After:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/6K1 b - - 0 32
```

Ply 4: **Ra1+** (`a2a1`)

Before:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/6K1 b - - 0 32
```
After:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/7P/r5K1 w - - 1 33
```

Ply 5: **Kg2** (`g1g2`)

Before:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/7P/r5K1 w - - 1 33
```
After:
```text
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/6KP/r7 b - - 2 33
```

## 060. A safety checker can invalidate an apparent gain.

**Stage:** Checkpoint 10 — five-case batch; thirty-four target passes

**Defect:** A candidate certificate ending Kf2 allowed Qf1#.

**Decision:** Reject immediate countermate even at the terminal horizon, meter the safety query and save the negative fixture. Never preserve a score by hiding the refutation.

**Status:** correctness safeguard
**Evidence:** history/sources/pressure-stacks-checkpoint-10-changes.json

Method-level lesson; no particular board asserted.

## 061. The king can be forced to screen its own defender.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** Rg4+ appeared to start king chasing, but all evasions interrupted the f8 rook defending f3.

**Decision:** Recognize the sole slider-guard ray and verify the king interposition for every evasion; then search the collection.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

### Position: 0Mbgh
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 34. Rg4+ Kf7 35. Kxf3

Starting FEN:
```text
5r2/1pp3p1/p3p1k1/8/3pR3/5r2/PPP1KP2/7R w - - 1 34
```

Ply 1: **Rg4+** (`e4g4`)

Before:
```text
5r2/1pp3p1/p3p1k1/8/3pR3/5r2/PPP1KP2/7R w - - 1 34
```
After:
```text
5r2/1pp3p1/p3p1k1/8/3p2R1/5r2/PPP1KP2/7R b - - 2 34
```

Ply 2: **Kf7** (`g6f7`)

Before:
```text
5r2/1pp3p1/p3p1k1/8/3p2R1/5r2/PPP1KP2/7R b - - 2 34
```
After:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5r2/PPP1KP2/7R w - - 3 35
```

Ply 3: **Kxf3** (`e2f3`)

Before:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5r2/PPP1KP2/7R w - - 3 35
```
After:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5K2/PPP2P2/7R b - - 0 35
```

## 062. Remember the actual previous mover, not a later occupant of its square.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** Hypothetical follow-ups could misidentify the preceding opponent piece.

**Decision:** Store the original mover type in line context and restore it correctly on backtracking.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

### Position: 0Mbgh
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 34. Rg4+ Kf7 35. Kxf3

Starting FEN:
```text
5r2/1pp3p1/p3p1k1/8/3pR3/5r2/PPP1KP2/7R w - - 1 34
```

Ply 1: **Rg4+** (`e4g4`)

Before:
```text
5r2/1pp3p1/p3p1k1/8/3pR3/5r2/PPP1KP2/7R w - - 1 34
```
After:
```text
5r2/1pp3p1/p3p1k1/8/3p2R1/5r2/PPP1KP2/7R b - - 2 34
```

Ply 2: **Kf7** (`g6f7`)

Before:
```text
5r2/1pp3p1/p3p1k1/8/3p2R1/5r2/PPP1KP2/7R b - - 2 34
```
After:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5r2/PPP1KP2/7R w - - 3 35
```

Ply 3: **Kxf3** (`e2f3`)

Before:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5r2/PPP1KP2/7R w - - 3 35
```
After:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5K2/PPP2P2/7R b - - 0 35
```

## 063. A checking fork still needs compensation if the checker is freely capturable.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** Special fork priority promoted unsupported checking offers.

**Decision:** Require nonnegative exchange balance, checking return capture or a more valuable fork target for that priority; do not silently change admission.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

### Position: 0s2Hj
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 28. Qh3+ Kg8 29. Qg3+ Kf7 30. Qxb8

Starting FEN:
```text
1r6/4q2k/4Qp2/pbb5/1p6/4P3/PP3PP1/3RK1N1 w - - 2 28
```

Ply 1: **Qh3+** (`e6h3`)

Before:
```text
1r6/4q2k/4Qp2/pbb5/1p6/4P3/PP3PP1/3RK1N1 w - - 2 28
```
After:
```text
1r6/4q2k/5p2/pbb5/1p6/4P2Q/PP3PP1/3RK1N1 b - - 3 28
```

Ply 2: **Kg8** (`h7g8`)

Before:
```text
1r6/4q2k/5p2/pbb5/1p6/4P2Q/PP3PP1/3RK1N1 b - - 3 28
```
After:
```text
1r4k1/4q3/5p2/pbb5/1p6/4P2Q/PP3PP1/3RK1N1 w - - 4 29
```

Ply 3: **Qg3+** (`h3g3`)

Before:
```text
1r4k1/4q3/5p2/pbb5/1p6/4P2Q/PP3PP1/3RK1N1 w - - 4 29
```
After:
```text
1r4k1/4q3/5p2/pbb5/1p6/4P1Q1/PP3PP1/3RK1N1 b - - 5 29
```

Ply 4: **Kf7** (`g8f7`)

Before:
```text
1r4k1/4q3/5p2/pbb5/1p6/4P1Q1/PP3PP1/3RK1N1 b - - 5 29
```
After:
```text
1r6/4qk2/5p2/pbb5/1p6/4P1Q1/PP3PP1/3RK1N1 w - - 6 30
```

Ply 5: **Qxb8** (`g3b8`)

Before:
```text
1r6/4qk2/5p2/pbb5/1p6/4P1Q1/PP3PP1/3RK1N1 w - - 6 30
```
After:
```text
1Q6/4qk2/5p2/pbb5/1p6/4P3/PP3PP1/3RK1N1 b - - 0 30
```

### Position: 0UiCw
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 24. Qxf7+ Kh8 25. Bxg6 Ra7 26. Qxa7

Starting FEN:
```text
r1bq2r1/5p1k/n1p2Qpp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 24
```

Ply 1: **Qxf7+** (`f6f7`)

Before:
```text
r1bq2r1/5p1k/n1p2Qpp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 24
```
After:
```text
r1bq2r1/5Q1k/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R b K - 0 24
```

Ply 2: **Kh8** (`h7h8`)

Before:
```text
r1bq2r1/5Q1k/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R b K - 0 24
```
After:
```text
r1bq2rk/5Q2/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 25
```

Ply 3: **Bxg6** (`d3g6`)

Before:
```text
r1bq2rk/5Q2/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 25
```
After:
```text
r1bq2rk/5Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 25
```

Ply 4: **Ra7** (`a8a7`)

Before:
```text
r1bq2rk/5Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 25
```
After:
```text
2bq2rk/r4Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R w K - 1 26
```

Ply 5: **Qxa7** (`f7a7`)

Before:
```text
2bq2rk/r4Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R w K - 1 26
```
After:
```text
2bq2rk/Q7/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 26
```

## 064. A defense can attack the queen and cover the mating square once the queen leaves.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** The queen itself blocked the defensive ray in the current-position test.

**Decision:** Evaluate the named vacated-square dependency; order the cheaper genuine repair without outranking collecting counterchecks.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

### Position: 0UiCw
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 24. Qxf7+ Kh8 25. Bxg6 Ra7 26. Qxa7

Starting FEN:
```text
r1bq2r1/5p1k/n1p2Qpp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 24
```

Ply 1: **Qxf7+** (`f6f7`)

Before:
```text
r1bq2r1/5p1k/n1p2Qpp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 24
```
After:
```text
r1bq2r1/5Q1k/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R b K - 0 24
```

Ply 2: **Kh8** (`h7h8`)

Before:
```text
r1bq2r1/5Q1k/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R b K - 0 24
```
After:
```text
r1bq2rk/5Q2/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 25
```

Ply 3: **Bxg6** (`d3g6`)

Before:
```text
r1bq2rk/5Q2/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 25
```
After:
```text
r1bq2rk/5Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 25
```

Ply 4: **Ra7** (`a8a7`)

Before:
```text
r1bq2rk/5Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 25
```
After:
```text
2bq2rk/r4Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R w K - 1 26
```

Ply 5: **Qxa7** (`f7a7`)

Before:
```text
2bq2rk/r4Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R w K - 1 26
```
After:
```text
2bq2rk/Q7/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 26
```

## 065. An interposed old target can be replaced by another sufficient collection.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** The search kept demanding a bishop after its defensive interposition exposed another funded gain.

**Decision:** Permit substitution only in that concrete interposition context, with every existing safety and objective test retained.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

### Position: 0KcNr
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15... Qxe1+ 16. Qxe1 Rxe1+ 17. Rxe1 bxa6

Starting FEN:
```text
r3r1k1/bpp2ppp/B1n1qn2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R1QR1K1 b - - 0 15
```

Ply 1: **Qxe1+** (`e6e1`)

Before:
```text
r3r1k1/bpp2ppp/B1n1qn2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R1QR1K1 b - - 0 15
```
After:
```text
r3r1k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R1Qq1K1 w - - 0 16
```

Ply 2: **Qxe1** (`d1e1`)

Before:
```text
r3r1k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R1Qq1K1 w - - 0 16
```
After:
```text
r3r1k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R2Q1K1 b - - 0 16
```

Ply 3: **Rxe1+** (`e8e1`)

Before:
```text
r3r1k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R2Q1K1 b - - 0 16
```
After:
```text
r5k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R2r1K1 w - - 0 17
```

Ply 4: **Rxe1** (`b1e1`)

Before:
```text
r5k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/1R2r1K1 w - - 0 17
```
After:
```text
r5k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/4R1K1 b - - 0 17
```

Ply 5: **bxa6** (`b7a6`)

Before:
```text
r5k1/bpp2ppp/B1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/4R1K1 b - - 0 17
```
After:
```text
r5k1/b1p2ppp/p1n2n2/3p4/3P2b1/PPP2N2/1B1N1PPP/4R1K1 w - - 0 18
```

## 066. Escaping present check can still concede next-move mate.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** Many relevant evasion nominees were expanded despite a legal immediate mating witness.

**Decision:** Cover the class by its actual mate move with repetition/draw/horizon guards. If all concede, execute one ordered representative and cover redundant siblings.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

### Position: 0OspT
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 29. Qg6 Qxc2+ 30. Qxc2

Starting FEN:
```text
r6k/1p3r1b/2p1p2Q/4P1p1/p2P4/2P5/PqB1KP2/7R w - - 0 29
```

Ply 1: **Qg6** (`h6g6`)

Before:
```text
r6k/1p3r1b/2p1p2Q/4P1p1/p2P4/2P5/PqB1KP2/7R w - - 0 29
```
After:
```text
r6k/1p3r1b/2p1p1Q1/4P1p1/p2P4/2P5/PqB1KP2/7R b - - 1 29
```

Ply 2: **Qxc2+** (`b2c2`)

Before:
```text
r6k/1p3r1b/2p1p1Q1/4P1p1/p2P4/2P5/PqB1KP2/7R b - - 1 29
```
After:
```text
r6k/1p3r1b/2p1p1Q1/4P1p1/p2P4/2P5/P1q1KP2/7R w - - 0 30
```

Ply 3: **Qxc2** (`g6c2`)

Before:
```text
r6k/1p3r1b/2p1p1Q1/4P1p1/p2P4/2P5/P1q1KP2/7R w - - 0 30
```
After:
```text
r6k/1p3r1b/2p1p3/4P1p1/p2P4/2P5/P1Q1KP2/7R b - - 0 30
```

## 067. A coherent repair can require admission, ordering, relevance and stopping together.

**Stage:** Checkpoint 11 — five-case batch; thirty-nine target passes

**Defect:** Isolated changes failed to resolve the same multi-function plan through all phases.

**Decision:** Test interacting small families and whole-band negative cases; discard prototypes that earn no necessary improvement.

**Status:** retained
**Evidence:** history/sources/pressure-stacks-checkpoint-11-changes.json

Method-level lesson; no particular board asserted.

## 068. Archive byte integrity does not prove that the intended work was saved.

**Stage:** Interrupted Batch 12 and integrity checkpoint 12

**Defect:** The prior working ZIP has valid CRCs but only seven members: recovery files and the old source ZIP. Its recovered-trial index is empty.

**Decision:** Do not call absent experiments recovered. Preserve the incomplete archive as evidence; restore the exact known parent and label the recovery honestly.

**Status:** verified recovery finding
**Evidence:** verification/archive-integrity.json

Method-level lesson; no particular board asserted.

## 069. An optional missing validator is not a reason to lose a runnable checkpoint.

**Stage:** Interrupted Batch 12 and integrity checkpoint 12

**Defect:** The old recovery stopped because python-chess was unavailable before establishing what source existed.

**Decision:** Run supported source/hash/reproduction checks and bundled legal replay; explicitly identify the checker implementation and limits rather than implying an independent second engine was used.

**Status:** verification procedure
**Evidence:** integrity-verification.json

Method-level lesson; no particular board asserted.

## 070. The cumulative learning history is part of the checkpoint contract.

**Stage:** Interrupted Batch 12 and integrity checkpoint 12

**Defect:** Progressive public rationale was scattered across messages and individual change ledgers.

**Decision:** Keep this chronological, evidence-linked tally append-only. Every future checkpoint records defect, proposed distinction, adopted/rejected decision, witnesses, negative tests and measured outcomes.

**Status:** documentation requirement
**Evidence:** CONTINUE.md

Method-level lesson; no particular board asserted.

## 071. Do not advance coverage when only recovery and packaging changed.

**Stage:** Interrupted Batch 12 and integrity checkpoint 12

**Defect:** A new checkpoint number could be mistaken for a new policy score.

**Decision:** Label checkpoint 12 as integrity recovery: policy remains Checkpoint 11. Freshly reproduce 39/116 and 199/380 before publication.

**Status:** integrity checkpoint; no policy repair
**Evidence:** integrity-verification.json

Method-level lesson; no particular board asserted.

## 072. Verify the benchmark denominator from the snapshot, not from earlier prose.

**Stage:** Interrupted Batch 12 and integrity checkpoint 12

**Defect:** The historical 380-case regression set includes six reference lines longer than seven plies. Prior descriptions called all 496 replayed cases eligible, but only 490 meet the exact-line horizon.

**Decision:** Keep the historical 380-case regression comparison and disclose its six guaranteed failures; additionally report 199/374 on eligible-only regressions. High-band selection stays 116. No cases are silently removed, no score is inflated, and the immutable source is unchanged.

**Status:** verified metadata correction; no policy change
**Evidence:** verification/dataset.json

### Position: 0PApm
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 61. Rxg5+ hxg5 62. a5 g4 63. a6 g3 64. a7 g2 65. a8=Q

Starting FEN:
```text
8/8/5K1p/1R4rk/P7/8/8/8 w - - 0 61
```

Ply 1: **Rxg5+** (`b5g5`)

Before:
```text
8/8/5K1p/1R4rk/P7/8/8/8 w - - 0 61
```
After:
```text
8/8/5K1p/6Rk/P7/8/8/8 b - - 0 61
```

Ply 2: **hxg5** (`h6g5`)

Before:
```text
8/8/5K1p/6Rk/P7/8/8/8 b - - 0 61
```
After:
```text
8/8/5K2/6pk/P7/8/8/8 w - - 0 62
```

Ply 3: **a5** (`a4a5`)

Before:
```text
8/8/5K2/6pk/P7/8/8/8 w - - 0 62
```
After:
```text
8/8/5K2/P5pk/8/8/8/8 b - - 0 62
```

Ply 4: **g4** (`g5g4`)

Before:
```text
8/8/5K2/P5pk/8/8/8/8 b - - 0 62
```
After:
```text
8/8/5K2/P6k/6p1/8/8/8 w - - 0 63
```

Ply 5: **a6** (`a5a6`)

Before:
```text
8/8/5K2/P6k/6p1/8/8/8 w - - 0 63
```
After:
```text
8/8/P4K2/7k/6p1/8/8/8 b - - 0 63
```

Ply 6: **g3** (`g4g3`)

Before:
```text
8/8/P4K2/7k/6p1/8/8/8 b - - 0 63
```
After:
```text
8/8/P4K2/7k/8/6p1/8/8 w - - 0 64
```

Ply 7: **a7** (`a6a7`)

Before:
```text
8/8/P4K2/7k/8/6p1/8/8 w - - 0 64
```
After:
```text
8/P7/5K2/7k/8/6p1/8/8 b - - 0 64
```

Ply 8: **g2** (`g3g2`)

Before:
```text
8/P7/5K2/7k/8/6p1/8/8 b - - 0 64
```
After:
```text
8/P7/5K2/7k/8/8/6p1/8 w - - 0 65
```

Ply 9: **a8=Q** (`a7a8q`)

Before:
```text
8/P7/5K2/7k/8/8/6p1/8 w - - 0 65
```
After:
```text
Q7/8/5K2/7k/8/8/6p1/8 b - - 0 65
```

### Position: 0ritd
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 42... e4 43. fxe4 fxe4 44. a5 e3 45. a6 e2 46. a7 e1=Q

Starting FEN:
```text
8/6p1/1K2k2p/4pp2/P7/5P2/6PP/8 b - - 1 42
```

Ply 1: **e4** (`e5e4`)

Before:
```text
8/6p1/1K2k2p/4pp2/P7/5P2/6PP/8 b - - 1 42
```
After:
```text
8/6p1/1K2k2p/5p2/P3p3/5P2/6PP/8 w - - 0 43
```

Ply 2: **fxe4** (`f3e4`)

Before:
```text
8/6p1/1K2k2p/5p2/P3p3/5P2/6PP/8 w - - 0 43
```
After:
```text
8/6p1/1K2k2p/5p2/P3P3/8/6PP/8 b - - 0 43
```

Ply 3: **fxe4** (`f5e4`)

Before:
```text
8/6p1/1K2k2p/5p2/P3P3/8/6PP/8 b - - 0 43
```
After:
```text
8/6p1/1K2k2p/8/P3p3/8/6PP/8 w - - 0 44
```

Ply 4: **a5** (`a4a5`)

Before:
```text
8/6p1/1K2k2p/8/P3p3/8/6PP/8 w - - 0 44
```
After:
```text
8/6p1/1K2k2p/P7/4p3/8/6PP/8 b - - 0 44
```

Ply 5: **e3** (`e4e3`)

Before:
```text
8/6p1/1K2k2p/P7/4p3/8/6PP/8 b - - 0 44
```
After:
```text
8/6p1/1K2k2p/P7/8/4p3/6PP/8 w - - 0 45
```

Ply 6: **a6** (`a5a6`)

Before:
```text
8/6p1/1K2k2p/P7/8/4p3/6PP/8 w - - 0 45
```
After:
```text
8/6p1/PK2k2p/8/8/4p3/6PP/8 b - - 0 45
```

Ply 7: **e2** (`e3e2`)

Before:
```text
8/6p1/PK2k2p/8/8/4p3/6PP/8 b - - 0 45
```
After:
```text
8/6p1/PK2k2p/8/8/8/4p1PP/8 w - - 0 46
```

Ply 8: **a7** (`a6a7`)

Before:
```text
8/6p1/PK2k2p/8/8/8/4p1PP/8 w - - 0 46
```
After:
```text
8/P5p1/1K2k2p/8/8/8/4p1PP/8 b - - 0 46
```

Ply 9: **e1=Q** (`e2e1q`)

Before:
```text
8/P5p1/1K2k2p/8/8/8/4p1PP/8 b - - 0 46
```
After:
```text
8/P5p1/1K2k2p/8/8/8/6PP/4q3 w - - 0 47
```

### Position: 0zoOL
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 34... exf3 35. Qf1 f2+ 36. Qg2 Qxg2+ 37. Kxg2 Bxe3 38. Kf3 Bd4

Starting FEN:
```text
8/p6k/6np/2pq4/3bp3/1P2BR2/P3Q2P/3R3K b - - 0 34
```

Ply 1: **exf3** (`e4f3`)

Before:
```text
8/p6k/6np/2pq4/3bp3/1P2BR2/P3Q2P/3R3K b - - 0 34
```
After:
```text
8/p6k/6np/2pq4/3b4/1P2Bp2/P3Q2P/3R3K w - - 0 35
```

Ply 2: **Qf1** (`e2f1`)

Before:
```text
8/p6k/6np/2pq4/3b4/1P2Bp2/P3Q2P/3R3K w - - 0 35
```
After:
```text
8/p6k/6np/2pq4/3b4/1P2Bp2/P6P/3R1Q1K b - - 1 35
```

Ply 3: **f2+** (`f3f2`)

Before:
```text
8/p6k/6np/2pq4/3b4/1P2Bp2/P6P/3R1Q1K b - - 1 35
```
After:
```text
8/p6k/6np/2pq4/3b4/1P2B3/P4p1P/3R1Q1K w - - 0 36
```

Ply 4: **Qg2** (`f1g2`)

Before:
```text
8/p6k/6np/2pq4/3b4/1P2B3/P4p1P/3R1Q1K w - - 0 36
```
After:
```text
8/p6k/6np/2pq4/3b4/1P2B3/P4pQP/3R3K b - - 1 36
```

Ply 5: **Qxg2+** (`d5g2`)

Before:
```text
8/p6k/6np/2pq4/3b4/1P2B3/P4pQP/3R3K b - - 1 36
```
After:
```text
8/p6k/6np/2p5/3b4/1P2B3/P4pqP/3R3K w - - 0 37
```

Ply 6: **Kxg2** (`h1g2`)

Before:
```text
8/p6k/6np/2p5/3b4/1P2B3/P4pqP/3R3K w - - 0 37
```
After:
```text
8/p6k/6np/2p5/3b4/1P2B3/P4pKP/3R4 b - - 0 37
```

Ply 7: **Bxe3** (`d4e3`)

Before:
```text
8/p6k/6np/2p5/3b4/1P2B3/P4pKP/3R4 b - - 0 37
```
After:
```text
8/p6k/6np/2p5/8/1P2b3/P4pKP/3R4 w - - 0 38
```

Ply 8: **Kf3** (`g2f3`)

Before:
```text
8/p6k/6np/2p5/8/1P2b3/P4pKP/3R4 w - - 0 38
```
After:
```text
8/p6k/6np/2p5/8/1P2bK2/P4p1P/3R4 b - - 1 38
```

Ply 9: **Bd4** (`e3d4`)

Before:
```text
8/p6k/6np/2p5/8/1P2bK2/P4p1P/3R4 b - - 1 38
```
After:
```text
8/p6k/6np/2p5/3b4/1P3K2/P4p1P/3R4 w - - 2 39
```

### Position: 0Tesw
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 55... a4 56. g6 Ke6 57. g7 Kf7 58. g8=R Kxg8 59. Ke2 a3

Starting FEN:
```text
8/8/8/p2k2P1/8/5K2/5P2/8 b - - 0 55
```

Ply 1: **a4** (`a5a4`)

Before:
```text
8/8/8/p2k2P1/8/5K2/5P2/8 b - - 0 55
```
After:
```text
8/8/8/3k2P1/p7/5K2/5P2/8 w - - 0 56
```

Ply 2: **g6** (`g5g6`)

Before:
```text
8/8/8/3k2P1/p7/5K2/5P2/8 w - - 0 56
```
After:
```text
8/8/6P1/3k4/p7/5K2/5P2/8 b - - 0 56
```

Ply 3: **Ke6** (`d5e6`)

Before:
```text
8/8/6P1/3k4/p7/5K2/5P2/8 b - - 0 56
```
After:
```text
8/8/4k1P1/8/p7/5K2/5P2/8 w - - 1 57
```

Ply 4: **g7** (`g6g7`)

Before:
```text
8/8/4k1P1/8/p7/5K2/5P2/8 w - - 1 57
```
After:
```text
8/6P1/4k3/8/p7/5K2/5P2/8 b - - 0 57
```

Ply 5: **Kf7** (`e6f7`)

Before:
```text
8/6P1/4k3/8/p7/5K2/5P2/8 b - - 0 57
```
After:
```text
8/5kP1/8/8/p7/5K2/5P2/8 w - - 1 58
```

Ply 6: **g8=R** (`g7g8r`)

Before:
```text
8/5kP1/8/8/p7/5K2/5P2/8 w - - 1 58
```
After:
```text
6R1/5k2/8/8/p7/5K2/5P2/8 b - - 0 58
```

Ply 7: **Kxg8** (`f7g8`)

Before:
```text
6R1/5k2/8/8/p7/5K2/5P2/8 b - - 0 58
```
After:
```text
6k1/8/8/8/p7/5K2/5P2/8 w - - 0 59
```

Ply 8: **Ke2** (`f3e2`)

Before:
```text
6k1/8/8/8/p7/5K2/5P2/8 w - - 0 59
```
After:
```text
6k1/8/8/8/p7/8/4KP2/8 b - - 1 59
```

Ply 9: **a3** (`a4a3`)

Before:
```text
6k1/8/8/8/p7/8/4KP2/8 b - - 1 59
```
After:
```text
6k1/8/8/8/8/p7/4KP2/8 w - - 0 60
```

### Position: 0ydKJ
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 74. gxh4 Kxf4 75. h5 Kg4 76. h6 f4 77. h7 f3 78. h8=Q f2 79. Qh1

Starting FEN:
```text
8/8/5K2/5p2/4kP1p/6P1/8/8 w - - 0 74
```

Ply 1: **gxh4** (`g3h4`)

Before:
```text
8/8/5K2/5p2/4kP1p/6P1/8/8 w - - 0 74
```
After:
```text
8/8/5K2/5p2/4kP1P/8/8/8 b - - 0 74
```

Ply 2: **Kxf4** (`e4f4`)

Before:
```text
8/8/5K2/5p2/4kP1P/8/8/8 b - - 0 74
```
After:
```text
8/8/5K2/5p2/5k1P/8/8/8 w - - 0 75
```

Ply 3: **h5** (`h4h5`)

Before:
```text
8/8/5K2/5p2/5k1P/8/8/8 w - - 0 75
```
After:
```text
8/8/5K2/5p1P/5k2/8/8/8 b - - 0 75
```

Ply 4: **Kg4** (`f4g4`)

Before:
```text
8/8/5K2/5p1P/5k2/8/8/8 b - - 0 75
```
After:
```text
8/8/5K2/5p1P/6k1/8/8/8 w - - 1 76
```

Ply 5: **h6** (`h5h6`)

Before:
```text
8/8/5K2/5p1P/6k1/8/8/8 w - - 1 76
```
After:
```text
8/8/5K1P/5p2/6k1/8/8/8 b - - 0 76
```

Ply 6: **f4** (`f5f4`)

Before:
```text
8/8/5K1P/5p2/6k1/8/8/8 b - - 0 76
```
After:
```text
8/8/5K1P/8/5pk1/8/8/8 w - - 0 77
```

Ply 7: **h7** (`h6h7`)

Before:
```text
8/8/5K1P/8/5pk1/8/8/8 w - - 0 77
```
After:
```text
8/7P/5K2/8/5pk1/8/8/8 b - - 0 77
```

Ply 8: **f3** (`f4f3`)

Before:
```text
8/7P/5K2/8/5pk1/8/8/8 b - - 0 77
```
After:
```text
8/7P/5K2/8/6k1/5p2/8/8 w - - 0 78
```

Ply 9: **h8=Q** (`h7h8q`)

Before:
```text
8/7P/5K2/8/6k1/5p2/8/8 w - - 0 78
```
After:
```text
7Q/8/5K2/8/6k1/5p2/8/8 b - - 0 78
```

Ply 10: **f2** (`f3f2`)

Before:
```text
7Q/8/5K2/8/6k1/5p2/8/8 b - - 0 78
```
After:
```text
7Q/8/5K2/8/6k1/8/5p2/8 w - - 0 79
```

Ply 11: **Qh1** (`h8h1`)

Before:
```text
7Q/8/5K2/8/6k1/8/5p2/8 w - - 0 79
```
After:
```text
8/8/5K2/8/6k1/8/5p2/7Q b - - 1 79
```

### Position: 0IbT2
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 48... Ke3 49. f4 gxf4 50. gxf4 Kxf4 51. h4 Kg4 52. h5 Kxh5

Starting FEN:
```text
8/8/7p/6p1/3k4/2p2PPP/2K5/8 b - - 1 48
```

Ply 1: **Ke3** (`d4e3`)

Before:
```text
8/8/7p/6p1/3k4/2p2PPP/2K5/8 b - - 1 48
```
After:
```text
8/8/7p/6p1/8/2p1kPPP/2K5/8 w - - 2 49
```

Ply 2: **f4** (`f3f4`)

Before:
```text
8/8/7p/6p1/8/2p1kPPP/2K5/8 w - - 2 49
```
After:
```text
8/8/7p/6p1/5P2/2p1k1PP/2K5/8 b - - 0 49
```

Ply 3: **gxf4** (`g5f4`)

Before:
```text
8/8/7p/6p1/5P2/2p1k1PP/2K5/8 b - - 0 49
```
After:
```text
8/8/7p/8/5p2/2p1k1PP/2K5/8 w - - 0 50
```

Ply 4: **gxf4** (`g3f4`)

Before:
```text
8/8/7p/8/5p2/2p1k1PP/2K5/8 w - - 0 50
```
After:
```text
8/8/7p/8/5P2/2p1k2P/2K5/8 b - - 0 50
```

Ply 5: **Kxf4** (`e3f4`)

Before:
```text
8/8/7p/8/5P2/2p1k2P/2K5/8 b - - 0 50
```
After:
```text
8/8/7p/8/5k2/2p4P/2K5/8 w - - 0 51
```

Ply 6: **h4** (`h3h4`)

Before:
```text
8/8/7p/8/5k2/2p4P/2K5/8 w - - 0 51
```
After:
```text
8/8/7p/8/5k1P/2p5/2K5/8 b - - 0 51
```

Ply 7: **Kg4** (`f4g4`)

Before:
```text
8/8/7p/8/5k1P/2p5/2K5/8 b - - 0 51
```
After:
```text
8/8/7p/8/6kP/2p5/2K5/8 w - - 1 52
```

Ply 8: **h5** (`h4h5`)

Before:
```text
8/8/7p/8/6kP/2p5/2K5/8 w - - 1 52
```
After:
```text
8/8/7p/7P/6k1/2p5/2K5/8 b - - 0 52
```

Ply 9: **Kxh5** (`g4h5`)

Before:
```text
8/8/7p/7P/6k1/2p5/2K5/8 b - - 0 52
```
After:
```text
8/8/7p/7k/8/2p5/2K5/8 w - - 0 53
```

## 073. Reaching the reference move is not the same as resolving the tactic.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** Prioritizing a king skewer, a checking capture that opens a king pin, or a safe queen attack brought the reference move into consideration but left required alternative defenses unresolved.

**Decision:** Do not count the new first move as a repair. Keep unsuccessful hypotheses in the experimental record, and look at their first still-open alternative rather than repeatedly raising root priority.

**Status:** rejected as release changes: no demonstrated nonregressing pass
**Evidence:** trials/order13-short2/result.json; trials/order13-full/result.json

### Position: 05HWi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15. Nxe7+ Qxe7 16. Qg6+ Kh8 17. Qxg4

Starting FEN:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

Ply 1: **Nxe7+** (`d5e7`) — decision board

Before:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```
After:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

Ply 2: **Qxe7** (`d8e7`) — decision board

Before:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```
After:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

Ply 3: **Qg6+** (`h6g6`)

Before:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```
After:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```
After:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

Ply 5: **Qxg4** (`g6g4`)

Before:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

### Position: 0pe0C
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 36. Qd8+ Kh7 37. Qxh4+ Kg6 38. Qxh8

Starting FEN:
```text
6kr/3Q1pp1/8/3pq3/6Pp/5P2/PP3K2/3R4 w - - 4 36
```

Ply 1: **Qd8+** (`d7d8`) — decision board

Before:
```text
6kr/3Q1pp1/8/3pq3/6Pp/5P2/PP3K2/3R4 w - - 4 36
```
After:
```text
3Q2kr/5pp1/8/3pq3/6Pp/5P2/PP3K2/3R4 b - - 5 36
```

Ply 2: **Kh7** (`g8h7`) — decision board

Before:
```text
3Q2kr/5pp1/8/3pq3/6Pp/5P2/PP3K2/3R4 b - - 5 36
```
After:
```text
3Q3r/5ppk/8/3pq3/6Pp/5P2/PP3K2/3R4 w - - 6 37
```

Ply 3: **Qxh4+** (`d8h4`)

Before:
```text
3Q3r/5ppk/8/3pq3/6Pp/5P2/PP3K2/3R4 w - - 6 37
```
After:
```text
7r/5ppk/8/3pq3/6PQ/5P2/PP3K2/3R4 b - - 0 37
```

Ply 4: **Kg6** (`h7g6`)

Before:
```text
7r/5ppk/8/3pq3/6PQ/5P2/PP3K2/3R4 b - - 0 37
```
After:
```text
7r/5pp1/6k1/3pq3/6PQ/5P2/PP3K2/3R4 w - - 1 38
```

Ply 5: **Qxh8** (`h4h8`)

Before:
```text
7r/5pp1/6k1/3pq3/6PQ/5P2/PP3K2/3R4 w - - 1 38
```
After:
```text
7Q/5pp1/6k1/3pq3/6P1/5P2/PP3K2/3R4 b - - 0 38
```

### Position: 0z2MA
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 24. Rc1 Qb2+ 25. Rc2 Qxc2+ 26. Bxc2

Starting FEN:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/4R3 w - - 3 24
```

Ply 1: **Rc1** (`e1c1`) — decision board

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/4R3 w - - 3 24
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/2R5 b - - 4 24
```

Ply 2: **Qb2+** (`c3b2`) — decision board

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/2R5 b - - 4 24
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/Pq2K1PP/2R5 w - - 5 25
```

Ply 3: **Rc2** (`c1c2`)

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/Pq2K1PP/2R5 w - - 5 25
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/PqR1K1PP/8 b - - 6 25
```

Ply 4: **Qxc2+** (`b2c2`)

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/PqR1K1PP/8 b - - 6 25
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/P1q1K1PP/8 w - - 0 26
```

Ply 5: **Bxc2** (`d3c2`)

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/P1q1K1PP/8 w - - 0 26
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P3P2/P1B1K1PP/8 b - - 0 26
```

### Position: 01hy9
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 39. Kd4 Rcxc5 40. Nxc5

Starting FEN:
```text
2r5/p4kp1/8/1pP1r3/4N2P/1P2KP2/P7/6R1 w - - 1 39
```

Ply 1: **Kd4** (`e3d4`) — decision board

Before:
```text
2r5/p4kp1/8/1pP1r3/4N2P/1P2KP2/P7/6R1 w - - 1 39
```
After:
```text
2r5/p4kp1/8/1pP1r3/3KN2P/1P3P2/P7/6R1 b - - 2 39
```

Ply 2: **Rcxc5** (`c8c5`) — decision board

Before:
```text
2r5/p4kp1/8/1pP1r3/3KN2P/1P3P2/P7/6R1 b - - 2 39
```
After:
```text
8/p4kp1/8/1pr1r3/3KN2P/1P3P2/P7/6R1 w - - 0 40
```

Ply 3: **Nxc5** (`e4c5`)

Before:
```text
8/p4kp1/8/1pr1r3/3KN2P/1P3P2/P7/6R1 w - - 0 40
```
After:
```text
8/p4kp1/8/1pN1r3/3K3P/1P3P2/P7/6R1 b - - 0 40
```

## 074. A pinned recapture can invite a quiet buildup, followed by its named conversion.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** After ...Rxf2 Rxf2 in 07tc1, the recapturing rook is pinned. Further queen checks monopolize the search while ...Rf8 safely adds an attacker to that rook. The chosen conversion also needs priority after the quiet move.

**Decision:** Recognize a safe additional attack on the absolutely pinned recapturer; after a quiet buildup, prioritize an already-certified capture of the pinned piece or a target it protects. Admit no new moves and add no terminal rule.

**Status:** retained ORDER repair; exact-line test and deletion witnesses required
**Evidence:** changes.json and trials/

### Position: 07tc1
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxf2 27. Rxf2 Rf8 28. Qf3 Rxf3

Starting FEN:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

Ply 1: **Rxf2** (`f8f2`)

Before:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```

Ply 2: **Rxf2** (`f1f2`)

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```

Ply 3: **Rf8** (`a8f8`) — decision board

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```
After:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```

Ply 4: **Qf3** (`b7f3`) — decision board

Before:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```
After:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```

Ply 5: **Rxf3** (`f8f3`) — decision board

Before:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```
After:
```text
7k/p5p1/3p3p/8/8/4qr2/PPP2RPP/6K1 w - - 0 29
```

## 075. A pin-block priority must not jump ahead of a direct material-taking defense.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** The first pin-block row changed 0zWqZ from Qxa4 to ...a6, while a shelter-pawn version would also affect a different kind of threat.

**Decision:** Keep the pin-block rule restricted to a nonpawn material target. Place it after safe direct capturing repairs, before ordinary target-saving responses. Preserve all required replies.

**Status:** broader version rejected; narrowed ORDER rule retained
**Evidence:** trials/candidate13g-lower/result.json; trials/multipurpose13h/result.json

### Position: 07tc1
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxf2 27. Rxf2 Rf8 28. Qf3 Rxf3

Starting FEN:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

Ply 1: **Rxf2** (`f8f2`)

Before:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```

Ply 2: **Rxf2** (`f1f2`)

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```

Ply 3: **Rf8** (`a8f8`)

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```
After:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```

Ply 4: **Qf3** (`b7f3`) — decision board

Before:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```
After:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```

Ply 5: **Rxf3** (`f8f3`)

Before:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```
After:
```text
7k/p5p1/3p3p/8/8/4qr2/PPP2RPP/6K1 w - - 0 29
```

### Position: 0zWqZ
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 23. Rxc3 Qxa4 24. Rxc8+ Kd7 25. Rxh8

Starting FEN:
```text
2r1k2r/pp3pp1/2q1p3/3pPp2/Qn1P4/2b1RN1P/5PP1/2B2RK1 w k - 6 23
```

Ply 1: **Rxc3** (`e3c3`)

Before:
```text
2r1k2r/pp3pp1/2q1p3/3pPp2/Qn1P4/2b1RN1P/5PP1/2B2RK1 w k - 6 23
```
After:
```text
2r1k2r/pp3pp1/2q1p3/3pPp2/Qn1P4/2R2N1P/5PP1/2B2RK1 b k - 0 23
```

Ply 2: **Qxa4** (`c6a4`) — decision board

Before:
```text
2r1k2r/pp3pp1/2q1p3/3pPp2/Qn1P4/2R2N1P/5PP1/2B2RK1 b k - 0 23
```
After:
```text
2r1k2r/pp3pp1/4p3/3pPp2/qn1P4/2R2N1P/5PP1/2B2RK1 w k - 0 24
```

Ply 3: **Rxc8+** (`c3c8`)

Before:
```text
2r1k2r/pp3pp1/4p3/3pPp2/qn1P4/2R2N1P/5PP1/2B2RK1 w k - 0 24
```
After:
```text
2R1k2r/pp3pp1/4p3/3pPp2/qn1P4/5N1P/5PP1/2B2RK1 b k - 0 24
```

Ply 4: **Kd7** (`e8d7`)

Before:
```text
2R1k2r/pp3pp1/4p3/3pPp2/qn1P4/5N1P/5PP1/2B2RK1 b k - 0 24
```
After:
```text
2R4r/pp1k1pp1/4p3/3pPp2/qn1P4/5N1P/5PP1/2B2RK1 w - - 1 25
```

Ply 5: **Rxh8** (`c8h8`)

Before:
```text
2R4r/pp1k1pp1/4p3/3pPp2/qn1P4/5N1P/5PP1/2B2RK1 w - - 1 25
```
After:
```text
7R/pp1k1pp1/4p3/3pPp2/qn1P4/5N1P/5PP1/2B2RK1 b - - 0 25
```

### Position: 0MDll
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 20. f6 Qxg4 21. Nxe7+ Kh8 22. hxg4

Starting FEN:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```

Ply 1: **f6** (`f5f6`)

Before:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```
After:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```

Ply 2: **Qxg4** (`d7g4`) — decision board

Before:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```
After:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```

Ply 3: **Nxe7+** (`d5e7`)

Before:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```
After:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```

Ply 5: **hxg4** (`h3g4`)

Before:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6P1/P2P4/BPP3P1/R5K1 b - - 0 22
```

## 076. A profitable capture with queen tempo can be a better plan than an unrelated smaller cash-out.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** 0A7bx stops immediately after ...dxe6. ...Rxe3 instead collects a bishop while attacking the queen and starts the reference conversion.

**Decision:** Give a profitable cheaper-piece capture with queen tempo an explicit priority over an unrelated ordinary cash-out. This is a candidate-order rule, not proof of the follow-up or a change to the material objective.

**Status:** retained; the old move was an accepted smaller win, not demonstrated losing chess
**Evidence:** changes.json and trials/

### Position: 0A7bx
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxe3 27. Bd5 Qd4 28. Qxe3 Qxe3+

Starting FEN:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```

Ply 1: **Rxe3** (`c3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```
After:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```

Ply 2: **Bd5** (`e6d5`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```

Ply 3: **Qd4** (`e4d4`)

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```

Ply 4: **Qxe3** (`h3e3`)

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```

Ply 5: **Qxe3+** (`d4e3`)

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P6/4q3/P5PP/R4RK1 w - - 0 29
```

## 077. Preserve an existing coordinated exchange without globally promoting it.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** The broad capture-with-tempo row displaced Qxf5 in 0Vy8z. Moving the entire old exchange row upward then damaged 0TNfM and left another required-defense search unfinished in 0im5g.

**Decision:** Suppress only the NEW queen-tempo promotion when an admitted queen-exchange-and-loose-collection plan already exists. Leave the old exchange rank and every unrelated row untouched. This is computed from already-profiled alternatives, with no new lookahead.

**Status:** broad row movement rejected; local priority dependency retained
**Evidence:** trials/candidate13g/result.json; trials/candidate13h/result.json

### Position: 0Vy8z
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 22... Qxf5 23. Qxf5 Bxf5 24. Ng6 Bxg6

Starting FEN:
```text
2r2Nk1/3qb1p1/p2p1n1p/1p3B2/4bP2/P6Q/1PP3PP/R1B2R1K b - - 0 22
```

Ply 1: **Qxf5** (`d7f5`) — decision board

Before:
```text
2r2Nk1/3qb1p1/p2p1n1p/1p3B2/4bP2/P6Q/1PP3PP/R1B2R1K b - - 0 22
```
After:
```text
2r2Nk1/4b1p1/p2p1n1p/1p3q2/4bP2/P6Q/1PP3PP/R1B2R1K w - - 0 23
```

Ply 2: **Qxf5** (`h3f5`)

Before:
```text
2r2Nk1/4b1p1/p2p1n1p/1p3q2/4bP2/P6Q/1PP3PP/R1B2R1K w - - 0 23
```
After:
```text
2r2Nk1/4b1p1/p2p1n1p/1p3Q2/4bP2/P7/1PP3PP/R1B2R1K b - - 0 23
```

Ply 3: **Bxf5** (`e4f5`)

Before:
```text
2r2Nk1/4b1p1/p2p1n1p/1p3Q2/4bP2/P7/1PP3PP/R1B2R1K b - - 0 23
```
After:
```text
2r2Nk1/4b1p1/p2p1n1p/1p3b2/5P2/P7/1PP3PP/R1B2R1K w - - 0 24
```

Ply 4: **Ng6** (`f8g6`)

Before:
```text
2r2Nk1/4b1p1/p2p1n1p/1p3b2/5P2/P7/1PP3PP/R1B2R1K w - - 0 24
```
After:
```text
2r3k1/4b1p1/p2p1nNp/1p3b2/5P2/P7/1PP3PP/R1B2R1K b - - 1 24
```

Ply 5: **Bxg6** (`f5g6`)

Before:
```text
2r3k1/4b1p1/p2p1nNp/1p3b2/5P2/P7/1PP3PP/R1B2R1K b - - 1 24
```
After:
```text
2r3k1/4b1p1/p2p1nbp/1p6/5P2/P7/1PP3PP/R1B2R1K w - - 0 25
```

### Position: 0TNfM
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 14. gxf3 Bxe3 15. Nxf6+ gxf6 16. fxe3

Starting FEN:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```

Ply 1: **gxf3** (`g2f3`) — decision board

Before:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```
After:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```

Ply 2: **Bxe3** (`c5e3`)

Before:
```text
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```
After:
```text
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```

Ply 3: **Nxf6+** (`d5f6`)

Before:
```text
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```
After:
```text
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```

Ply 4: **gxf6** (`g7f6`)

Before:
```text
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```
After:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```

Ply 5: **fxe3** (`f2e3`)

Before:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```
After:
```text
r3k2r/1p3p1p/p3pp2/8/8/3BPP1P/PPP5/R4RK1 b kq - 0 16
```

### Position: 0im5g
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 34. Bxc5 Qxf1+ 35. Rxf1

Starting FEN:
```text
8/1k2rR1p/p2br3/Qpnp2P1/P2B3P/1P1q4/2P5/2K2R2 w - - 0 34
```

Ply 1: **Bxc5** (`d4c5`) — decision board

Before:
```text
8/1k2rR1p/p2br3/Qpnp2P1/P2B3P/1P1q4/2P5/2K2R2 w - - 0 34
```
After:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P1q4/2P5/2K2R2 b - - 0 34
```

Ply 2: **Qxf1+** (`d3f1`)

Before:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P1q4/2P5/2K2R2 b - - 0 34
```
After:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P6/2P5/2K2q2 w - - 0 35
```

Ply 3: **Rxf1** (`f7f1`)

Before:
```text
8/1k2rR1p/p2br3/QpBp2P1/P6P/1P6/2P5/2K2q2 w - - 0 35
```
After:
```text
8/1k2r2p/p2br3/QpBp2P1/P6P/1P6/2P5/2K2R2 b - - 0 35
```

## 078. An attacked queen can escape by placing an offered attacker inside a king battery.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** After ...Rxe3 Bd5, ...Qd4 was parked behind incidental material and checking moves. It both saves the attacked queen and lines up Qd4–Re3–Kg1: taking the offered rook permits a checking queen recapture.

**Decision:** Prioritize this quiet queen repair only when the battery blocker and the enemy queen genuinely attack one another. A merely incidental blocked king ray is insufficient; the broad version consumed the budget in 07tc1.

**Status:** retained target-bound ORDER rule; no added certificate
**Evidence:** trials/abmini-queen_battery_repair/result.json; trials/multipurpose13g/result.json

### Position: 0A7bx
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxe3 27. Bd5 Qd4 28. Qxe3 Qxe3+

Starting FEN:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```

Ply 1: **Rxe3** (`c3e3`)

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```
After:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```

Ply 2: **Bd5** (`e6d5`)

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```

Ply 3: **Qd4** (`e4d4`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```

Ply 4: **Qxe3** (`h3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```

Ply 5: **Qxe3+** (`d4e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P6/4q3/P5PP/R4RK1 w - - 0 29
```

### Position: 07tc1
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxf2 27. Rxf2 Rf8 28. Qf3 Rxf3

Starting FEN:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

Ply 1: **Rxf2** (`f8f2`)

Before:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```

Ply 2: **Rxf2** (`f1f2`)

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```

Ply 3: **Rf8** (`a8f8`) — decision board

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```
After:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```

Ply 4: **Qf3** (`b7f3`)

Before:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```
After:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```

Ply 5: **Rxf3** (`f8f3`)

Before:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```
After:
```text
7k/p5p1/3p3p/8/8/4qr2/PPP2RPP/6K1 w - - 0 29
```

## 079. A counter-threat can do two jobs; representative ordering must not become reply exclusion.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** After ...Rxe3, Bd5 attacks the opposing queen while also attacking its king-adjacent f7 pawn. The original ranking preferred Bf5 or a checking pawn grab. Later Qxe3 removes the rook that is attacking the queen, although the return capture still favors the attacker.

**Decision:** Order the nominated minor-piece queen-and-shelter counter before ordinary repairs. Also prioritize the threatened queen capturing a rook material-threat source. Keep counterchecks and every other required defense. The rook-sized rollback restriction avoids overriding the minor-piece shelter line in 0mVOQ.

**Status:** retained representative-defense preferences; not universal best-play theorems
**Evidence:** trials/abmini-counter_queen_shelter/result.json; trials/abmini-queen_takes_material_source/result.json

### Position: 0A7bx
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxe3 27. Bd5 Qd4 28. Qxe3 Qxe3+

Starting FEN:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```

Ply 1: **Rxe3** (`c3e3`)

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```
After:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```

Ply 2: **Bd5** (`e6d5`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```

Ply 3: **Qd4** (`e4d4`)

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```

Ply 4: **Qxe3** (`h3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```

Ply 5: **Qxe3+** (`d4e3`)

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P6/4q3/P5PP/R4RK1 w - - 0 29
```

### Position: 0mVOQ
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 24. Bg5 g6 25. Qxe6 Qxg5 26. Qxd6

Starting FEN:
```text
r5k1/5ppp/3brn1q/1p1ppQ1P/7B/pPP2P2/P5P1/1KR2N1R w - - 4 24
```

Ply 1: **Bg5** (`h4g5`)

Before:
```text
r5k1/5ppp/3brn1q/1p1ppQ1P/7B/pPP2P2/P5P1/1KR2N1R w - - 4 24
```
After:
```text
r5k1/5ppp/3brn1q/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R b - - 5 24
```

Ply 2: **g6** (`g7g6`) — decision board

Before:
```text
r5k1/5ppp/3brn1q/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R b - - 5 24
```
After:
```text
r5k1/5p1p/3brnpq/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R w - - 0 25
```

Ply 3: **Qxe6** (`f5e6`)

Before:
```text
r5k1/5p1p/3brnpq/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R w - - 0 25
```
After:
```text
r5k1/5p1p/3bQnpq/1p1pp1BP/8/pPP2P2/P5P1/1KR2N1R b - - 0 25
```

Ply 4: **Qxg5** (`h6g5`)

Before:
```text
r5k1/5p1p/3bQnpq/1p1pp1BP/8/pPP2P2/P5P1/1KR2N1R b - - 0 25
```
After:
```text
r5k1/5p1p/3bQnp1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R w - - 0 26
```

Ply 5: **Qxd6** (`e6d6`)

Before:
```text
r5k1/5p1p/3bQnp1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R w - - 0 26
```
After:
```text
r5k1/5p1p/3Q1np1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R b - - 0 26
```

## 080. Use exact decision-board FENs, not puzzle names alone, to make the learning history reproducible.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** An earlier entry might name a puzzle but omit which of its several positions exhibits the defect. It is then difficult to follow the progression or distinguish initial facts from effects of a later move.

**Decision:** Backfill independent legal-replay citations for every named historical puzzle without changing its old entry. New entries state starting FEN, decisive before FEN, move and after FEN. Label reference replay separately from autonomous execution. Include rejected experiments and their evidence pointers.

**Status:** mandatory ongoing checkpoint requirement
**Evidence:** verification/journal-replay.json; journal-fen-citations.json

### Position: original-queen-sacrifice
HISTORICAL_EXAMPLE_LEGAL_REPLAY — 37.Qxg7+ Kxg7 38.f6+ Qxf6

Starting FEN:
```text
2r3k1/6p1/3p3q/p1pPpP2/Pp2P1Q1/3P4/1P4K1/3R4 w - - 7 37
```

Ply 1: **Qxg7+** (`g4g7`) — decision board

Before:
```text
2r3k1/6p1/3p3q/p1pPpP2/Pp2P1Q1/3P4/1P4K1/3R4 w - - 7 37
```
After:
```text
2r3k1/6Q1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 b - - 0 37
```

Ply 2: **Kxg7** (`g8g7`)

Before:
```text
2r3k1/6Q1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 b - - 0 37
```
After:
```text
2r5/6k1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 w - - 0 38
```

Ply 3: **f6+** (`f5f6`) — decision board

Before:
```text
2r5/6k1/3p3q/p1pPpP2/Pp2P3/3P4/1P4K1/3R4 w - - 0 38
```
After:
```text
2r5/6k1/3p1P1q/p1pPp3/Pp2P3/3P4/1P4K1/3R4 b - - 0 38
```

Ply 4: **Qxf6** (`h6f6`)

Before:
```text
2r5/6k1/3p1P1q/p1pPp3/Pp2P3/3P4/1P4K1/3R4 b - - 0 38
```
After:
```text
2r5/6k1/3p1q2/p1pPp3/Pp2P3/3P4/1P4K1/3R4 w - - 0 39
```

### Position: 07tc1
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxf2 27. Rxf2 Rf8 28. Qf3 Rxf3

Starting FEN:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

Ply 1: **Rxf2** (`f8f2`)

Before:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```

Ply 2: **Rxf2** (`f1f2`)

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```

Ply 3: **Rf8** (`a8f8`) — decision board

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```
After:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```

Ply 4: **Qf3** (`b7f3`) — decision board

Before:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```
After:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```

Ply 5: **Rxf3** (`f8f3`) — decision board

Before:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```
After:
```text
7k/p5p1/3p3p/8/8/4qr2/PPP2RPP/6K1 w - - 0 29
```

### Position: 0A7bx
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxe3 27. Bd5 Qd4 28. Qxe3 Qxe3+

Starting FEN:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```

Ply 1: **Rxe3** (`c3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```
After:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```

Ply 2: **Bd5** (`e6d5`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```

Ply 3: **Qd4** (`e4d4`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```

Ply 4: **Qxe3** (`h3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```

Ply 5: **Qxe3+** (`d4e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P6/4q3/P5PP/R4RK1 w - - 0 29
```

## 081. Batch coverage comes from coordinating ordering guards and then deleting what is unnecessary.

**Stage:** Checkpoint 13 — pinned conversions, queen counterplay, and reproducible FEN journal

**Defect:** The baseline had 39/116 strict high-band passes and 199/380 historical lower-band passes. Several broad priorities reached useful first moves but broke existing sequences or left alternative defenses unresolved.

**Decision:** Retain only seven ORDER switches: pinned-recapter pressure, certified pinned cash-out, a material pin block after direct captures, queen-tempo collection with prepared-exchange precedence, a target-bound queen-battery repair, a queen-and-shelter counter, and queen capture of a rook threat source. The final autonomous runs reach 41/116 and preserve all 238 parent passes. Seven whole-band single-switch deletions each return 40/116, with no compensating gain. This is tested irreducibility, not a global minimum. No terminal, admission, reply-generator or resource rules change.

**Status:** verified source-bound batch: 07tc1 in 44 positions; 0A7bx in 38; 75 target failures remain
**Evidence:** trials/clean13/result.json; trials/clean13-lower/result.json; ablations13.json; verification.json

### Position: 07tc1
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxf2 27. Rxf2 Rf8 28. Qf3 Rxf3

Starting FEN:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

Ply 1: **Rxf2** (`f8f2`)

Before:
```text
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```

Ply 2: **Rxf2** (`f1f2`)

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2rPP/5RK1 w - - 0 27
```
After:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```

Ply 3: **Rf8** (`a8f8`) — decision board

Before:
```text
r6k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 b - - 0 27
```
After:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```

Ply 4: **Qf3** (`b7f3`) — decision board

Before:
```text
5r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/6K1 w - - 1 28
```
After:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```

Ply 5: **Rxf3** (`f8f3`) — decision board

Before:
```text
5r1k/p5p1/3p3p/8/8/4qQ2/PPP2RPP/6K1 b - - 2 28
```
After:
```text
7k/p5p1/3p3p/8/8/4qr2/PPP2RPP/6K1 w - - 0 29
```

### Position: 0A7bx
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 26... Rxe3 27. Bd5 Qd4 28. Qxe3 Qxe3+

Starting FEN:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```

Ply 1: **Rxe3** (`c3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/2r1B2Q/P5PP/R4RK1 b - - 0 26
```
After:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```

Ply 2: **Bd5** (`e6d5`) — decision board

Before:
```text
5rk1/3p1pp1/p3B2p/1p2p3/1P2q3/4r2Q/P5PP/R4RK1 w - - 0 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```

Ply 3: **Qd4** (`e4d4`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P2q3/4r2Q/P5PP/R4RK1 b - - 1 27
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```

Ply 4: **Qxe3** (`h3e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4r2Q/P5PP/R4RK1 w - - 2 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```

Ply 5: **Qxe3+** (`d4e3`) — decision board

Before:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P1q4/4Q3/P5PP/R4RK1 b - - 0 28
```
After:
```text
5rk1/3p1pp1/p6p/1p1Bp3/1P6/4q3/P5PP/R4RK1 w - - 0 29
```

## 082. Reproduce the current source before attempting another group of repairs.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** The historical conversation contains interrupted and superseded releases. Treating an unbound progress count as the parent would make preservation claims ambiguous.

**Decision:** The exact Checkpoint 13 source reproduced 41/116 high-band passes, with every recorded outcome, preferred line, count and Oracle counter unchanged. The frozen parent remains separately saved.

**Status:** baseline reproduced; no behavioral change
**Evidence:** baselines/cp13/; trials/cp14-baseline/result.json

Method-level lesson; no particular board asserted.

## 083. A checking collection can uncover a shelter pin that explains the next move.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** 05HWi begins its search with Ng5, spending the budget before the admitted Nxe7+ plan. The second move Qg6+ only makes sense because the bishop ray pins the f7 pawn.

**Decision:** Prioritize a nonlosing checking capture that uncovers another slider’s absolute pin on a pawn adjacent to its king. Nxe7+ clears Bb3–f7–Kg8. Keep existing multipurpose mate-and-queen and pin-and-collection rows ahead of this new row; moving it above the quiet f6 plan in 0MDll caused a regression.

**Status:** retained ordering distinction, not new admission or proof
**Evidence:** trials/cp14-refined/result.json; trials/clean14/result.json; verification/repair14-unit.json

### Position: 05HWi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15. Nxe7+ Qxe7 16. Qg6+ Kh8 17. Qxg4

Starting FEN:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

Ply 1: **Nxe7+** (`d5e7`) — decision board

Before:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```
After:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

Ply 2: **Qxe7** (`d8e7`) — decision board

Before:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```
After:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

Ply 3: **Qg6+** (`h6g6`) — decision board

Before:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```
After:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```
After:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

Ply 5: **Qxg4** (`g6g4`)

Before:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

### Position: 0MDll
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 20. f6 Qxg4 21. Nxe7+ Kh8 22. hxg4

Starting FEN:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```

Ply 1: **f6** (`f5f6`) — decision board

Before:
```text
r4rk1/3qbppp/p2p4/1ppN1P2/6Q1/P2P3P/BPP3P1/R5K1 w - - 1 20
```
After:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```

Ply 2: **Qxg4** (`d7g4`)

Before:
```text
r4rk1/3qbppp/p2p1P2/1ppN4/6Q1/P2P3P/BPP3P1/R5K1 b - - 0 20
```
After:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```

Ply 3: **Nxe7+** (`d5e7`)

Before:
```text
r4rk1/4bppp/p2p1P2/1ppN4/6q1/P2P3P/BPP3P1/R5K1 w - - 0 21
```
After:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 b - - 0 21
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```

Ply 5: **hxg4** (`h3g4`)

Before:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6q1/P2P3P/BPP3P1/R5K1 w - - 1 22
```
After:
```text
r4r1k/4Nppp/p2p1P2/1pp5/6P1/P2P4/BPP3P1/R5K1 b - - 0 22
```

## 084. Finishing one defense can simultaneously renew a mating threat.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** After the alternative Nxe7+ Nxe7 Ng5 Bf5, speculative knight and queen moves consume calculation while exf5 collects the just-placed mating defender and preserves Qxh7#.

**Decision:** Give that already-admitted capture priority only when it takes the opponent’s actual last-moved piece, has at least the existing net-material objective, and leaves an executable mate threat. Removing the mating queen, changing the last-move binding, or replacing the bishop by a pawn removes the special priority.

**Status:** retained; no probe reset, new candidate, or terminal certificate
**Evidence:** runs/05HWi.json; verification/repair14-unit.json

### Position: 05HWi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15. Nxe7+ Qxe7 16. Qg6+ Kh8 17. Qxg4

Starting FEN:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

Ply 1: **Nxe7+** (`d5e7`) — decision board

Before:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```
After:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

Ply 2: **Qxe7** (`d8e7`) — decision board

Before:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```
After:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

Ply 3: **Qg6+** (`h6g6`)

Before:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```
After:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```
After:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

Ply 5: **Qxg4** (`g6g4`)

Before:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

### Position: 05HWi-side-defense
ACTUAL_AUTONOMOUS_SIDE_BRANCH — 17.exf5 — existing mate threat preserved

Starting FEN:
```text
r2q1rk1/2p1np1n/p2p3Q/1p2pbN1/1P2P3/PB1P4/2P2PPP/R4RK1 w - - 2 17
```

Ply 1: **exf5** (`e4f5`) — decision board

Before:
```text
r2q1rk1/2p1np1n/p2p3Q/1p2pbN1/1P2P3/PB1P4/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r2q1rk1/2p1np1n/p2p3Q/1p2pPN1/1P6/PB1P4/2P2PPP/R4RK1 b - - 0 17
```

## 085. Two legal recaptures can differ in the weaknesses they leave behind.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** Qxe7 and Nxe7 both answer the check in 05HWi. The knight recapture reduces the already-attacked e5 pawn from two guards to only its d6 pawn, while the queen recapture preserves the guards.

**Decision:** Use an explicit reply tie against a direct recapture that turns an already-attacked friendly nonking target from multiply defended into singly defended. This selects the reference representative; both replies remain required. This is a board-based representative preference, not a theorem that it always chooses best play.

**Status:** retained representative-defense tie
**Evidence:** trials/ablate14-preserve_attacked_guard/result.json; verification/repair14-unit.json

### Position: 05HWi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15. Nxe7+ Qxe7 16. Qg6+ Kh8 17. Qxg4

Starting FEN:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

Ply 1: **Nxe7+** (`d5e7`)

Before:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```
After:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

Ply 2: **Qxe7** (`d8e7`) — decision board

Before:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```
After:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

Ply 3: **Qg6+** (`h6g6`)

Before:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```
After:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```
After:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

Ply 5: **Qxg4** (`g6g4`)

Before:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

## 086. An unchanged capture square does not mean an unchanged defensive response.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** After Rxb7 in 02E99, the original classifier discards both ...Rfe8 and ...Rae8 because Rxe7 still reaches the two-point goal. It therefore cannot display the reference’s queen-defending reply. Yet the free-queen capture has become an exchange: the queen now has a rook guard.

**Decision:** Retain a directly nominated rook move that gives the first guard to the sole threatened queen. This repairs a concrete weakness even though it may only reduce, not eliminate, the material loss. No extra move is generated. This is an explicit enlargement of the repair class for representative resistance, not evidence that the original accepted line was losing or unsound.

**Status:** retained relevance distinction; original puzzle already internally accepted
**Evidence:** runs/02E99.json; trials/ablate14-defend_critical_queen/result.json; verification/repair14-unit.json

### Position: 02E99
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 30. Rxb7 Rfe8 31. Rxe7

Starting FEN:
```text
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```

Ply 1: **Rxb7** (`b3b7`)

Before:
```text
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```
After:
```text
r4rk1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 30
```

Ply 2: **Rfe8** (`f8e8`) — decision board

Before:
```text
r4rk1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 30
```
After:
```text
r3r1k1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 w - - 1 31
```

Ply 3: **Rxe7** (`b7e7`) — decision board

Before:
```text
r3r1k1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 w - - 1 31
```
After:
```text
r3r1k1/4Rp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 31
```

## 087. Do not promote a quiet first guard above a countercheck, a queen recapture, or a fork defense.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** The first guard priority displaced Qxg3+ in 09k24, changed Rf5 to Rf3 in the queen–rook fork 0jZQq, and delayed the directly refuting queen recapture in a side line of 0g6oF.

**Decision:** Limit the first-guard exception to an isolated queen target, not a fork. Give it priority only without an available nominated countercheck and when the attacking piece is cheaper than the queen. Preserve queen-on-queen recaptures. Among two first rook guards, prefer the one that also escapes an attack: Rfe8 rather than Rae8. All these are explicit comparisons; none is a numeric weighted score.

**Status:** broad versions rejected; narrower membership and representative order retained
**Evidence:** trials/cp14-queenrepair/result.json; trials/cp14-guard-final-lower/result.json; verification/repair14-unit.json

### Position: 02E99
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 30. Rxb7 Rfe8 31. Rxe7

Starting FEN:
```text
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```

Ply 1: **Rxb7** (`b3b7`)

Before:
```text
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```
After:
```text
r4rk1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 30
```

Ply 2: **Rfe8** (`f8e8`) — decision board

Before:
```text
r4rk1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 30
```
After:
```text
r3r1k1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 w - - 1 31
```

Ply 3: **Rxe7** (`b7e7`)

Before:
```text
r3r1k1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 w - - 1 31
```
After:
```text
r3r1k1/4Rp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 31
```

### Position: 09k24
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 29. fxg3 Qxg3+ 30. Kh1

Starting FEN:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1rb/3Q1P2/R1R3K1 w - - 0 29
```

Ply 1: **fxg3** (`f2g3`)

Before:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1rb/3Q1P2/R1R3K1 w - - 0 29
```
After:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1Pb/3Q4/R1R3K1 b - - 0 29
```

Ply 2: **Qxg3+** (`g6g3`) — decision board

Before:
```text
5rk1/1p4p1/6q1/pP1p4/P3pN2/4P1Pb/3Q4/R1R3K1 b - - 0 29
```
After:
```text
5rk1/1p4p1/8/pP1p4/P3pN2/4P1qb/3Q4/R1R3K1 w - - 0 30
```

Ply 3: **Kh1** (`g1h1`)

Before:
```text
5rk1/1p4p1/8/pP1p4/P3pN2/4P1qb/3Q4/R1R3K1 w - - 0 30
```
After:
```text
5rk1/1p4p1/8/pP1p4/P3pN2/4P1qb/3Q4/R1R4K b - - 1 30
```

### Position: 0jZQq
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 29. Ne4 Rf5 30. Qxf5 Bxf5 31. Nxc3

Starting FEN:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p5/2q3N1/P5PP/6RK w - - 2 29
```

Ply 1: **Ne4** (`g3e4`)

Before:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p5/2q3N1/P5PP/6RK w - - 2 29
```
After:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p1N3/2q5/P5PP/6RK b - - 3 29
```

Ply 2: **Rf5** (`f6f5`) — decision board

Before:
```text
r6k/pR1b3p/3p1r2/3Pn2Q/2p1N3/2q5/P5PP/6RK b - - 3 29
```
After:
```text
r6k/pR1b3p/3p4/3Pnr1Q/2p1N3/2q5/P5PP/6RK w - - 4 30
```

Ply 3: **Qxf5** (`h5f5`)

Before:
```text
r6k/pR1b3p/3p4/3Pnr1Q/2p1N3/2q5/P5PP/6RK w - - 4 30
```
After:
```text
r6k/pR1b3p/3p4/3PnQ2/2p1N3/2q5/P5PP/6RK b - - 0 30
```

Ply 4: **Bxf5** (`d7f5`)

Before:
```text
r6k/pR1b3p/3p4/3PnQ2/2p1N3/2q5/P5PP/6RK b - - 0 30
```
After:
```text
r6k/pR5p/3p4/3Pnb2/2p1N3/2q5/P5PP/6RK w - - 0 31
```

Ply 5: **Nxc3** (`e4c3`)

Before:
```text
r6k/pR5p/3p4/3Pnb2/2p1N3/2q5/P5PP/6RK w - - 0 31
```
After:
```text
r6k/pR5p/3p4/3Pnb2/2p5/2N5/P5PP/6RK b - - 0 31
```

### Position: 0g6oF
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 17. Ng6+ hxg6 18. Qh3#

Starting FEN:
```text
r1bqr2k/pppnN1pp/3p1p2/8/2B5/4Q3/PP3PPP/R4RK1 w - - 2 17
```

Ply 1: **Ng6+** (`e7g6`) — decision board

Before:
```text
r1bqr2k/pppnN1pp/3p1p2/8/2B5/4Q3/PP3PPP/R4RK1 w - - 2 17
```
After:
```text
r1bqr2k/pppn2pp/3p1pN1/8/2B5/4Q3/PP3PPP/R4RK1 b - - 3 17
```

Ply 2: **hxg6** (`h7g6`)

Before:
```text
r1bqr2k/pppn2pp/3p1pN1/8/2B5/4Q3/PP3PPP/R4RK1 b - - 3 17
```
After:
```text
r1bqr2k/pppn2p1/3p1pp1/8/2B5/4Q3/PP3PPP/R4RK1 w - - 0 18
```

Ply 3: **Qh3#** (`e3h3`)

Before:
```text
r1bqr2k/pppn2p1/3p1pp1/8/2B5/4Q3/PP3PPP/R4RK1 w - - 0 18
```
After:
```text
r1bqr2k/pppn2p1/3p1pp1/8/2B5/7Q/PP3PPP/R4RK1 b - - 1 18
```

### Position: 0g6oF-side-guard
REJECTED_EXPERIMENT_COUNTEREXAMPLE_LEGAL_REPLAY — 19...Qxd7 — capture the attacking queen, do not first play Re8

Starting FEN:
```text
r1bq3k/pppQr1p1/3p1p1p/8/8/3B4/PP3PPP/R4RK1 b - - 0 19
```

Ply 1: **Qxd7** (`d8d7`) — decision board

Before:
```text
r1bq3k/pppQr1p1/3p1p1p/8/8/3B4/PP3PPP/R4RK1 b - - 0 19
```
After:
```text
r1b4k/pppqr1p1/3p1p1p/8/8/3B4/PP3PPP/R4RK1 w - - 0 20
```

## 088. Fixing threat identity or candidate access alone does not prove an entire tactic.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** Two exploratory defects were real: in 0GTUW a previously available Qxg7 capture becomes mate after f6, and in 0z2MA a forcing Rc8+ can be parked solely because KING is not active. Their exploration still encounters genuine open defenses or a conversion beyond the allowed horizon.

**Decision:** Record these distinctions for a later coordinated repair, but remove the unearned prototype from this release. A promising first move or recognized reference endpoint is not a strict pass. Do not convert an unresolved defense into a covered class to conceal the seven-ply limit.

**Status:** unpromoted prototypes: no additional strict coverage
**Evidence:** trials/cp14-continuations/result.json; trials/cp14-lean/result.json; trials/cp14-fork/result.json; experiments/unclean14/

### Position: 0GTUW
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 25. Qg5 Bf8 26. Nf6+ Kh8 27. Nxd7

Starting FEN:
```text
r3r1k1/pp1q1ppp/3b4/2pp1P1N/3N4/1P6/P1PQ2PP/5R1K w - - 0 25
```

Ply 1: **Qg5** (`d2g5`) — decision board

Before:
```text
r3r1k1/pp1q1ppp/3b4/2pp1P1N/3N4/1P6/P1PQ2PP/5R1K w - - 0 25
```
After:
```text
r3r1k1/pp1q1ppp/3b4/2pp1PQN/3N4/1P6/P1P3PP/5R1K b - - 1 25
```

Ply 2: **Bf8** (`d6f8`) — decision board

Before:
```text
r3r1k1/pp1q1ppp/3b4/2pp1PQN/3N4/1P6/P1P3PP/5R1K b - - 1 25
```
After:
```text
r3rbk1/pp1q1ppp/8/2pp1PQN/3N4/1P6/P1P3PP/5R1K w - - 2 26
```

Ply 3: **Nf6+** (`h5f6`) — decision board

Before:
```text
r3rbk1/pp1q1ppp/8/2pp1PQN/3N4/1P6/P1P3PP/5R1K w - - 2 26
```
After:
```text
r3rbk1/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K b - - 3 26
```

Ply 4: **Kh8** (`g8h8`)

Before:
```text
r3rbk1/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K b - - 3 26
```
After:
```text
r3rb1k/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K w - - 4 27
```

Ply 5: **Nxd7** (`f6d7`)

Before:
```text
r3rb1k/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K w - - 4 27
```
After:
```text
r3rb1k/pp1N1ppp/8/2pp1PQ1/3N4/1P6/P1P3PP/5R1K b - - 0 27
```

### Position: 0z2MA
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 24. Rc1 Qb2+ 25. Rc2 Qxc2+ 26. Bxc2

Starting FEN:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/4R3 w - - 3 24
```

Ply 1: **Rc1** (`e1c1`) — decision board

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/4R3 w - - 3 24
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/2R5 b - - 4 24
```

Ply 2: **Qb2+** (`c3b2`) — decision board

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1PqB1P2/P3K1PP/2R5 b - - 4 24
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/Pq2K1PP/2R5 w - - 5 25
```

Ply 3: **Rc2** (`c1c2`) — decision board

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/Pq2K1PP/2R5 w - - 5 25
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/PqR1K1PP/8 b - - 6 25
```

Ply 4: **Qxc2+** (`b2c2`) — decision board

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/PqR1K1PP/8 b - - 6 25
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/P1q1K1PP/8 w - - 0 26
```

Ply 5: **Bxc2** (`d3c2`)

Before:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P1B1P2/P1q1K1PP/8 w - - 0 26
```
After:
```text
6k1/pp3rpp/3pN3/3P4/5B1b/1P3P2/P1B1K1PP/8 b - - 0 26
```

## 089. A cheap certificate that saves work but earns no required coverage should be removable.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** A prototype covered redundant king evasions when the same knight could take the forked queen and reach the existing goal. It reduced some investigation but did not turn the targeted unresolved case into a pass.

**Decision:** Remove the extra fork-collection certificate, broad trap priorities, queen/rook escape bonuses, runner/check preferences, and forced-plan handoff prototype. The final diff adds no hypothetical proof mechanism, new card, terminal, or search scheduling. Keep the trials as rejected evidence rather than silent dead code.

**Status:** rejected release additions; final source cleaned and rerun
**Evidence:** clean14.py; trials/cp14-fork/result.json; policy.diff

### Position: 0GTUW
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 25. Qg5 Bf8 26. Nf6+ Kh8 27. Nxd7

Starting FEN:
```text
r3r1k1/pp1q1ppp/3b4/2pp1P1N/3N4/1P6/P1PQ2PP/5R1K w - - 0 25
```

Ply 1: **Qg5** (`d2g5`)

Before:
```text
r3r1k1/pp1q1ppp/3b4/2pp1P1N/3N4/1P6/P1PQ2PP/5R1K w - - 0 25
```
After:
```text
r3r1k1/pp1q1ppp/3b4/2pp1PQN/3N4/1P6/P1P3PP/5R1K b - - 1 25
```

Ply 2: **Bf8** (`d6f8`)

Before:
```text
r3r1k1/pp1q1ppp/3b4/2pp1PQN/3N4/1P6/P1P3PP/5R1K b - - 1 25
```
After:
```text
r3rbk1/pp1q1ppp/8/2pp1PQN/3N4/1P6/P1P3PP/5R1K w - - 2 26
```

Ply 3: **Nf6+** (`h5f6`) — decision board

Before:
```text
r3rbk1/pp1q1ppp/8/2pp1PQN/3N4/1P6/P1P3PP/5R1K w - - 2 26
```
After:
```text
r3rbk1/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K b - - 3 26
```

Ply 4: **Kh8** (`g8h8`) — decision board

Before:
```text
r3rbk1/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K b - - 3 26
```
After:
```text
r3rb1k/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K w - - 4 27
```

Ply 5: **Nxd7** (`f6d7`)

Before:
```text
r3rb1k/pp1q1ppp/5N2/2pp1PQ1/3N4/1P6/P1P3PP/5R1K w - - 4 27
```
After:
```text
r3rb1k/pp1N1ppp/8/2pp1PQ1/3N4/1P6/P1P3PP/5R1K b - - 0 27
```

## 090. Distinguish a genuinely resolved failure from a corrected representative line.

**Stage:** Checkpoint 14 — forcing shelter clearance and meaningful queen defenses

**Defect:** The final batch has two more strict matches, but their meanings differ: 05HWi previously exhausted fifty positions, while 02E99 already proved another line in forty-five.

**Decision:** The clean runtime reaches 43/116 high-band passes and 199/380 historical lower-band passes, preserving all 240 prior passes. 05HWi resolves in 45 positions. 02E99 now follows Rxb7 Rfe8 Rxe7 in 49. Four whole-band single-family deletions each lose one new match without a compensating gain. This is necessity under the tested removals, not global minimality. Keep all exact decision FENs and distinguish reference citations from actual side branches.

**Status:** source-bound batch; pending final artifact integrity checks
**Evidence:** trials/clean14/result.json; trials/clean14-lower/result.json; ablations14.json; verification.json

### Position: 05HWi
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 15. Nxe7+ Qxe7 16. Qg6+ Kh8 17. Qxg4

Starting FEN:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

Ply 1: **Nxe7+** (`d5e7`) — decision board

Before:
```text
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```
After:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

Ply 2: **Qxe7** (`d8e7`) — decision board

Before:
```text
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```
After:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

Ply 3: **Qg6+** (`h6g6`) — decision board

Before:
```text
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```
After:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

Ply 4: **Kh8** (`g8h8`) — decision board

Before:
```text
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```
After:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

Ply 5: **Qxg4** (`g6g4`) — decision board

Before:
```text
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```
After:
```text
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

### Position: 02E99
REFERENCE_REPLAY_NOT_AUTONOMOUS_SEARCH — 30. Rxb7 Rfe8 31. Rxe7

Starting FEN:
```text
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```

Ply 1: **Rxb7** (`b3b7`) — decision board

Before:
```text
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```
After:
```text
r4rk1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 30
```

Ply 2: **Rfe8** (`f8e8`) — decision board

Before:
```text
r4rk1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 30
```
After:
```text
r3r1k1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 w - - 1 31
```

Ply 3: **Rxe7** (`b7e7`) — decision board

Before:
```text
r3r1k1/1R2qp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 w - - 1 31
```
After:
```text
r3r1k1/4Rp1p/4p2Q/p1Pp2pP/3P2P1/2P5/4BPK1/8 b - - 0 31
```


# FEN Oracle / explicit State / executable data-policy consolidation

Historical entries 1–90 are retained above. The following entries record the refactor, not extra puzzle passes.

## 91. Restore only the last verified policy before changing representation.

**Observed:** Batch 15 contained provisional experimental results; importing them would turn an integrity refactor into an unverified repair.

**Decision:** Use Checkpoint 14 (43/116 high band; 199/380 historical regression) unchanged as the behavior target. The unverified batch is not in the executable source.

**Evidence:** `tests/fixtures.json; test-results/coverage.json`

**0aeNv — initial FEN from the frozen test snapshot**

```fen
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

## 92. A FEN is not the history or objective of an investigation.

**Observed:** A current board cannot say which checker just moved, which target was promised, which material was present at the root, or which alternatives remain untried.

**Decision:** Keep board predicates in oracle.js, and initial material, plan IDs, targets, prior move bindings, repetition path and allowances in State. These are explicit values carried by the data policy.

**Evidence:** `state.js; policy.json controller and data programs`

**05HWi — initial FEN from the frozen test snapshot**

```fen
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

**07tc1 — initial FEN from the frozen test snapshot**

```fen
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

## 93. Lossless factorization must expose complexity instead of renaming it.

**Observed:** The old eight-card display hid substantial JavaScript logic. Calling those functions Oracle predicates would preserve that defect.

**Decision:** Move every inherited policy method into explicit guarded data programs in policy.json. Inventory 33 FEN fact families, 13 card nomination clauses, 59 ORDER rows, 34 controller edges and the internal guards. This is not a claim of a tiny pure DFA or complete human memorability.

**Evidence:** `inventory.json; policy.json; development/`

**0aeNv — initial FEN from the frozen test snapshot**

```fen
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

## 94. Card descriptions must reference executable guards.

**Observed:** Keeping prose card formulas alongside separate implementation conditions creates two policy definitions that can drift.

**Decision:** The authoritative cardClauses are referenced by the program guards. Editing a KING JSON clause changes the candidate cards in the unit test; it is not just a display edit.

**Evidence:** `tests/test.mjs; policy.json cardClauses`

**0aeNv — initial FEN from the frozen test snapshot**

```fen
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

## 95. Moving geometry to ScratchChess must preserve promotions, castling and canonical en-passant.

**Observed:** A board-engine port can preserve common captures while subtly changing the FEN or a promoted piece during undo.

**Decision:** Use ScratchChess for move mechanics and test the adapter against the independent test engine for castling, en-passant, underpromotion and undo. The vendored engine changes only its piece-asset URL.

**Evidence:** `tests/test.mjs; board.js; vendor/scratchchess.original.js`

## 96. A restorable State cannot contain un-rehydratable lazy observation getters.

**Observed:** Serializing partially populated Oracle observations produces plain objects instead of getter-backed observations. Reusing them after restore breaks later queries.

**Decision:** Preserve all search decisions and caches of ordinary data, but rebuild the two pure Oracle/projection caches. Count that recomputation; never replenish positions or probes when restoring. Multiple snapshot points reproduce the same tree.

**Evidence:** `state.js; tests/test.mjs`

**05HWi — initial FEN from the frozen test snapshot**

```fen
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

**07tc1 — initial FEN from the frozen test snapshot**

```fen
r4r1k/pQ4p1/3p3p/8/8/4q3/PPP2RPP/5RK1 b - - 4 26
```

## 97. Looking at a board must not change the calculation being explained.

**Observed:** Calling objective-dependent display queries on the live solver can populate its caches and alter its recorded work.

**Decision:** The viewer uses a separate explanation state for its weakness overlay. The live execution runs in a worker on arbitrary FENs, with a chronological log, active cards and a PGN built only from the actual tree.

**Evidence:** `worker.js; view.js; test-results/browser.json`

**0aeNv — initial FEN from the frozen test snapshot**

```fen
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**02E99 — initial FEN from the frozen test snapshot**

```fen
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```

## 98. Auxiliary Oracle work must be metered when it happens, not when an empty response is created.

**Observed:** The FEN-only observer uses lazy fact groups. Reading the initial empty metrics object undercounts later static mobility work.

**Decision:** The platform accounts for metric deltas after each fact group is read. Entered search positions remain the inherited counter; additional board/certificate/mobility work is visible separately.

**Evidence:** `platform.js; test-results/coverage.json`

**02E99 — initial FEN from the frozen test snapshot**

```fen
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```

## 99. Consolidation is a regression result, not a new chess success.

**Observed:** A new runtime and cleaner source boundaries could be mistaken for additional tactical coverage.

**Decision:** Require the same line, endpoint, status and entered count on all 496 historical cases, and complete tree equality on the high band. Keep the prior journal and FEN citations unchanged; append this migration record rather than rewriting the history.

**Evidence:** `test-results/coverage.json; test-results/full-tree-equivalence.json`

**05HWi — initial FEN from the frozen test snapshot**

```fen
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

**02E99 — initial FEN from the frozen test snapshot**

```fen
r4rk1/1p2qp1p/4p2Q/p1Pp2pP/3P2P1/1RP5/4BPK1/8 w - - 2 30
```


# Consequence-card method refactor

## 100. An exploratory forcing plan is a real plan, not merely a mate label.

**Observed:** The old king card covered checks, shelter and mate without naming the discovery purpose.

**Decision:** Rename the executable KING identity to FORCE; preserve its 13-clause shared nomination contract, ordering and budgets. Give it a discover-after-answer mode and a mating mode.

**Status:** retained. **Evidence:** `tests/test.mjs`.

## 101. Use one shared calculation protocol.

**Observed:** The factored runner exposed nineteen small success/failure stages rather than the four common tactical questions.

**Decision:** Use eleven executable method states and 24 explicit edges. Merge purely mechanical stages, keep all chess verification in declared policy procedures.

**Status:** retained. **Evidence:** `test-results/structural-equivalence.json`.

## 102. Make the card itself authoritative.

**Observed:** A readable card and a separately stored guard could drift apart.

**Decision:** Move all thirteen executable selectors into their cards. The generic VM resolves those selectors; disabling a card removes its candidate matches. Notice/Try/Expect/Continue are next to the actual conditions.

**Status:** retained. **Evidence:** `test-results/method.json`.

## 103. A forced answer can reveal a new concrete plan.

**Observed:** After Qh3+ Kg8 the checking fork Qg3+ was admitted under the old forcing plan; the newly discovered double attack was not retained as an explicit live purpose.

**Decision:** When a selected move after an evasion creates a witnessed fork, replace the active FORCE slot with DOUBLE. Copy the child slot array: do not mutate the saved parent; do not restore probe or reread credits.

**Status:** retained. **Evidence:** `test-results/method-example.json`.

Before the newly recognized checking fork

```text
1r4k1/4q3/5p2/pbb5/1p6/4P2Q/PP3PP1/3RK1N1 w - - 4 29
```

After Qg3+: the queen attacks king and rook

```text
1r4k1/4q3/5p2/pbb5/1p6/4P1Q1/PP3PP1/3RK1N1 b - - 5 29
```

## 104. Do not confuse plan labels with candidate priority.

**Observed:** A plan-first experiment grouped the already-selected moves by their first matching card. It lost 24 existing high-band passes.

**Decision:** Reject the grouping experiment: 19/116 rather than 43/116, no new passes. Keep ORDER’s merged candidate priorities and finish each chosen candidate depth-first.

**Status:** rejected. **Evidence:** `test-results/plan-first-experiment.json`.

## 105. The stopping atlas is not a board-ID lookup.

**Observed:** Little diagrams can be mistaken for proof without testing defenders or knowing the objective.

**Decision:** Give eleven outcome/control entries explicit scopes, requirements and defeaters; gate successful stopping through enabled outcome entries. The fifteen diagrams are UI/test examples, never solver inputs.

**Status:** retained. **Evidence:** `test-results/method.json`.

## 106. Two urgent-looking weaknesses can share one repair.

**Observed:** Adding a bishop on d1 to the Ne2+ fork example permits Bxe2, answering the king and queen attacks together.

**Decision:** Do not count pressure-stack height as a winning threshold. Tie defense classes to the actual consequence and its dependencies.

**Status:** retained. **Evidence:** `atlas-examples.json`.

A checking fork leaves the second target

```text
r4q2/1pp4k/pb1p1Bpp/4P3/5Q1N/7P/PP2nP1P/R4RK1 w - - 1 22
```

Near miss: one move repairs both threats

```text
r4q2/1pp4k/pb1p1Bpp/4P3/5Q1N/7P/PP2nP1P/R2B1RK1 w - - 1 22
```

## 107. Simpler control is not yet complete chess-rule compression.

**Observed:** The new plan protocol might misleadingly be presented as replacing the 173 accumulated conditional sites.

**Decision:** Keep the full verifier library and 59 ORDER rows visible. The new architecture simplifies execution and responsibility; it has not proved a smaller complete tactical rule set.

**Status:** scope clarification. **Evidence:** `inventory.json`.

## 108. Preserve behavior before compressing verification.

**Observed:** The user requested the last verified coverage, not a smaller but weaker solver.

**Decision:** The FEN-only serial regression reproduces all 496 historical statuses, preferred lines, exact endpoints and entered-position counts, including all 43+199 previous strict passes.

**Status:** verified refactor. **Evidence:** `test-results/coverage.json`.


## 109. Test actual alternative-tree changes, not only aggregate coverage.

**Observed:** The explicit FORCE→DOUBLE handoff changes side-branch candidate compatibility in two already-unresolved high-band puzzles, despite preserving every preferred line, stopping endpoint, outcome and position count.

**Decision:** Retain the factual handoff. Record the difference rather than claiming byte-identical searches: 114 high-band core trees are unchanged, while 0aPCp and 0tonw remain UNRESOLVED at 50 positions. Disabling only discovery restores their complete parent core trees.

**Evidence:** `test-results/discovery-tree-effects.json; test-results/tree-audit.json`.

0aPCp: before Rxf1+ changes a FORCE slot to DOUBLE

```text
8/1b6/p3k3/P1p1P3/1pPp1Bp1/1P1P1r2/7P/4KR2 b - - 2 38
```

After Rxf1+: same fork plan, now with a new bound investigation context

```text
8/1b6/p3k3/P1p1P3/1pPp1Bp1/1P1P4/7P/4Kr2 w - - 0 39
```


# Strict deletion experiment (appendix)

The first 109 structured entries remain unchanged. The following records a failed equivalence experiment, not a promoted repair.

## 110. Delete the embedded decision program, not merely move it behind card names.

**Problem:** The prior refactor retained 173 conditional sites in a compiled JSON program; it did not simplify the underlying chess reasoning.

**Experiment/decision:** Build a separate implementation with eight actual card tables and two history-independent material/exchange patterns. There is no legacy VM, compiled program, repair-flag list or runtime fallback. Ordinary control flow and geometry remain and are enumerated openly.

**Status:** implemented as experimental replacement; NOT equivalent

0aeNv: initial decision board (frozen fixture FEN only; actual solver receives no reference)

```
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

0aeNv: actual experimental endpoint after Bc7 Qxc7 Nxc7+ (actual autonomous execution)

```
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```

## 111. A shared capture consequence preserves some combinations, but broad terminal conditions lose mating continuations.

**Problem:** 0F6YE reaches a material threshold after Rxf1+ and the generic leaf accepts, missing the supplied continuation to mate. Merely adding a broad king-net flag did not improve overall high-band matching and was discarded.

**Experiment/decision:** Keep the failure in the benchmark. Do not import the old rook-hunt/history exceptions under different names. Recognition, candidate order and stopping were all simplified; losses cannot be attributed solely to deleting old if statements.

**Status:** coverage regression documented; not repaired

0F6YE: initial decision board (frozen fixture FEN only; actual solver receives no reference)

```
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

0F6YE: actual experimental endpoint after Rxf1+ (actual autonomous execution)

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

## 112. A simpler controller is not yet a successful human-policy compression.

**Problem:** The clean branch obtains 4/116 high-band and 134/380 historical regression strict passes. It loses 108 old passes and gains four lower-band cases. Ordering and reply-template changes accompany the new proof layer.

**Experiment/decision:** Retain the verified 43/116 +199/380 parent unchanged. Ship the branch with a failing preservation test and an explicit experimental banner, not as a replacement release. No impossibility claim follows from this experiment.

**Status:** preservation gate FAILED

0s2Hj: initial decision board (frozen fixture FEN only; actual solver receives no reference)

```
1r6/4q2k/4Qp2/pbb5/1p6/4P3/PP3PP1/3RK1N1 w - - 2 28
```

0s2Hj: actual experimental endpoint after Qf5+ Kg7 Rd7 Bxd7 Qxf6+ Qxf6 (actual autonomous execution)

```
1r6/3b2k1/5q2/p1b5/1p6/4P3/PP3PP1/4K1N1 w - - 0 31
```

05HWi: initial decision board (frozen fixture FEN only; actual solver receives no reference)

```
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

05HWi: actual experimental endpoint after Nxe7+ Nxe7 Ng5 Nxg5 Qxg5+ Ng6 Qxg4 (actual autonomous execution)

```
r2q1rk1/2p2p2/p2p2n1/1p2p3/1P2P1Q1/PB1P4/2P2PPP/R4RK1 b - - 0 18
```

## 113. Measure all reasoning work and replay the actual generated PGN.

**Problem:** A small number of entered search boards can conceal many bounded capture/check observations and closure witnesses. Display labels do not establish runtime provenance.

**Experiment/decision:** Meter Oracle, nominee and auxiliary successor work separately; validate saved witness moves and generated variations independently. Serialize the real DFS tree, include one example per redundant class, and preserve state restoration. Browser testing here uses an in-memory standalone page because container navigation is blocked.

**Status:** verification covers implementation and bounded claims, not complete chess soundness

0aeNv: initial decision board (frozen fixture FEN only; actual solver receives no reference)

```
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

0aeNv: actual experimental endpoint after Bc7 Qxc7 Nxc7+ (actual autonomous execution)

```
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```


# Native consequence-card recovery

All prior entries are preserved. These appended observations concern the actual native reconstruction, not a revival of the compiled policy.

## 114. Restore learned distinctions without restoring the program

**Problem.** The wholesale shared-obligation replacement lost 108 old passes because ordering, admission, stopping and AND traversal changed together.

**Decision.** Rebuild genuine data cards around a small native runner; retain independent baseline comparisons. The compiled parent is only an offline comparator, never a runtime fallback.

0F6YE initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

0F6YE after Rxf1+ (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

0F6YE after Kg2 (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```

0F6YE after Rf2+ (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```

0F6YE after Kh3 (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```

0F6YE after Rh2# (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4n2r/B7 w - - 4 46
```

0aeNv initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

0aeNv after Bc7 (actual native preferred-line board; generated, not reference replay):

```
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

0aeNv after Qxc7 (actual native preferred-line board; generated, not reference replay):

```
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

0aeNv after Nxc7+ (actual native preferred-line board; generated, not reference replay):

```
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```


## 115. An unresolved defense controls the current candidate, not the whole problem

**Problem.** Exploring every later defense after the first required defense remained unresolved wasted the global allowance.

**Decision.** Make OR/AND aggregation explicit: unresolved required defense stops proving this candidate; an outer own-choice may still try another candidate. This generic controller distinction restored several existing passes.

073kr initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
5rk1/6p1/2pR3p/1p2pNn1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 11 31
```

073kr after Ne7+ (actual native preferred-line board; generated, not reference replay):

```
5rk1/4N1p1/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 b - - 12 31
```

073kr after Kh7 (actual native preferred-line board; generated, not reference replay):

```
5r2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/5RK1 w - - 13 32
```

073kr after Rxf8 (actual native preferred-line board; generated, not reference replay):

```
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/r6P/6K1 b - - 0 32
```

073kr after Ra1+ (actual native preferred-line board; generated, not reference replay):

```
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/7P/r5K1 w - - 1 33
```

073kr after Kg2 (actual native preferred-line board; generated, not reference replay):

```
5R2/4N1pk/2pR3p/1p2p1n1/2q1P3/2P1Q1P1/6KP/r7 b - - 2 33
```

09UnX initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
4r1k1/6n1/3P4/p2P3q/P7/4Q3/2b3PP/4R1K1 w - - 2 35
```

09UnX after Qxe8+ (actual native preferred-line board; generated, not reference replay):

```
4Q1k1/6n1/3P4/p2P3q/P7/8/2b3PP/4R1K1 b - - 0 35
```

09UnX after Nxe8 (actual native preferred-line board; generated, not reference replay):

```
4n1k1/8/3P4/p2P3q/P7/8/2b3PP/4R1K1 w - - 0 36
```

09UnX after d7 (actual native preferred-line board; generated, not reference replay):

```
4n1k1/3P4/8/p2P3q/P7/8/2b3PP/4R1K1 b - - 0 36
```

09UnX after Bxa4 (actual native preferred-line board; generated, not reference replay):

```
4n1k1/3P4/8/p2P3q/b7/8/6PP/4R1K1 w - - 0 37
```

09UnX after d8=Q (actual native preferred-line board; generated, not reference replay):

```
3Qn1k1/8/8/p2P3q/b7/8/6PP/4R1K1 b - - 0 37
```


## 116. Recapture priority is not synonymous with recapture relevance

**Problem.** A losing quiet recapture had displaced a genuinely resisting defense; a gain-erasing evasion was also incorrectly ranked as a new rollback class.

**Decision.** Retain every required capture, but keep primary evasion/countercheck classification and scope recapture priority to compulsory or nonlosing recaptures.

0UiCw initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
r1bq2r1/5p1k/n1p2Qpp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 24
```

0UiCw after Qxf7+ (actual native preferred-line board; generated, not reference replay):

```
r1bq2r1/5Q1k/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R b K - 0 24
```

0UiCw after Kh8 (actual native preferred-line board; generated, not reference replay):

```
r1bq2rk/5Q2/n1p3pp/1p2P2N/p7/P1PB3P/4NPP1/b3K2R w K - 1 25
```

0UiCw after Bxg6 (actual native preferred-line board; generated, not reference replay):

```
r1bq2rk/5Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 25
```

0UiCw after Ra7 (actual native preferred-line board; generated, not reference replay):

```
2bq2rk/r4Q2/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R w K - 1 26
```

0UiCw after Qxa7 (actual native preferred-line board; generated, not reference replay):

```
2bq2rk/Q7/n1p3Bp/1p2P2N/p7/P1P4P/4NPP1/b3K2R b K - 0 26
```

0LvDm initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
8/p7/b7/k2p1p1p/P2PpPpP/1PK3P1/4B3/8 w - - 9 56
```

0LvDm after b4+ (actual native preferred-line board; generated, not reference replay):

```
8/p7/b7/k2p1p1p/PP1PpPpP/2K3P1/4B3/8 b - - 0 56
```

0LvDm after Kb6 (actual native preferred-line board; generated, not reference replay):

```
8/p7/bk6/3p1p1p/PP1PpPpP/2K3P1/4B3/8 w - - 1 57
```

0LvDm after a5+ (actual native preferred-line board; generated, not reference replay):

```
8/p7/bk6/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 b - - 0 57
```

0LvDm after Kc6 (actual native preferred-line board; generated, not reference replay):

```
8/p7/b1k5/P2p1p1p/1P1PpPpP/2K3P1/4B3/8 w - - 1 58
```

0LvDm after Bxa6 (actual native preferred-line board; generated, not reference replay):

```
8/p7/B1k5/P2p1p1p/1P1PpPpP/2K3P1/8/8 b - - 0 58
```

0TNfM initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQn1P/PPP2PP1/R4RK1 w kq - 1 14
```

0TNfM after gxf3 (actual native preferred-line board; generated, not reference replay):

```
r3k2r/1p3ppp/p3pq2/2bN4/8/3BQP1P/PPP2P2/R4RK1 b kq - 0 14
```

0TNfM after Bxe3 (actual native preferred-line board; generated, not reference replay):

```
r3k2r/1p3ppp/p3pq2/3N4/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 15
```

0TNfM after Nxf6+ (actual native preferred-line board; generated, not reference replay):

```
r3k2r/1p3ppp/p3pN2/8/8/3BbP1P/PPP2P2/R4RK1 b kq - 0 15
```

0TNfM after gxf6 (actual native preferred-line board; generated, not reference replay):

```
r3k2r/1p3p1p/p3pp2/8/8/3BbP1P/PPP2P2/R4RK1 w kq - 0 16
```

0TNfM after fxe3 (actual native preferred-line board; generated, not reference replay):

```
r3k2r/1p3p1p/p3pp2/8/8/3BPP1P/PPP5/R4RK1 b kq - 0 16
```


## 117. Endgame preferences need an actual endgame scope

**Problem.** The mere presence of endgame_scope metadata was mistaken for that scope being true, changing a mating representative.

**Decision.** Read the Boolean binding, not the existence of its record. 04kFZ again selects Kxh7 before the redundant Kh8 mating branch.

04kFZ initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
r2qr1k1/ppp2p1p/5pPB/8/6Q1/2P5/P1p3PP/bN3K1R w - - 0 20
```

04kFZ after gxh7+ (actual native preferred-line board; generated, not reference replay):

```
r2qr1k1/ppp2p1P/5p1B/8/6Q1/2P5/P1p3PP/bN3K1R b - - 0 20
```

04kFZ after Kxh7 (actual native preferred-line board; generated, not reference replay):

```
r2qr3/ppp2p1k/5p1B/8/6Q1/2P5/P1p3PP/bN3K1R w - - 0 21
```

04kFZ after Qg7# (actual native preferred-line board; generated, not reference replay):

```
r2qr3/ppp2pQk/5p1B/8/8/2P5/P1p3PP/bN3K1R b - - 1 21
```


## 118. No legal replies is success when the return capture mates

**Problem.** Uniform has_move checks initially rejected Qxd4# inside an otherwise valid material-return witness.

**Decision.** Give an actual mating return its own first stopping row; a no-move stalemate remains failure. Independently replay the full witness.

0eAjD initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
N4rk1/pp4p1/2np3p/7q/2P1Bp2/3Q1NPb/PP5P/R5KR b - - 5 20
```

0eAjD after Qc5+ (actual native preferred-line board; generated, not reference replay):

```
N4rk1/pp4p1/2np3p/2q5/2P1Bp2/3Q1NPb/PP5P/R5KR w - - 6 21
```

0eAjD after Nd4 (actual native preferred-line board; generated, not reference replay):

```
N4rk1/pp4p1/2np3p/2q5/2PNBp2/3Q2Pb/PP5P/R5KR b - - 7 21
```

0eAjD after Nxd4 (actual native preferred-line board; generated, not reference replay):

```
N4rk1/pp4p1/3p3p/2q5/2PnBp2/3Q2Pb/PP5P/R5KR w - - 0 22
```


## 119. A limited card grammar is different from serialized JavaScript

**Problem.** The previous factorization had preserved procedures, closures and arbitrary control instructions in JSON.

**Decision.** The new schema permits fact groups, scalar comparisons, ordered rows, fixed target generators and at most two-edge evidence cards. It rejects procedural payloads. Historical eligibility is still visible as explicit context rows.

0SwRp initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```

0SwRp after Rb7+ (actual native preferred-line board; generated, not reference replay):

```
1n3r1r/1Rkp4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 b - - 2 25
```

0SwRp after Kxb7 (actual native preferred-line board; generated, not reference replay):

```
1n3r1r/1k1p4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 0 26
```

0SwRp after Nxd6+ (actual native preferred-line board; generated, not reference replay):

```
1n3r1r/1k1p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 b - - 0 26
```

0SwRp after Ka8 (actual native preferred-line board; generated, not reference replay):

```
kn3r1r/3p4/2pNp3/p4qp1/P2P4/2P3P1/4RPQP/5K2 w - - 1 27
```

0SwRp after Nxf5 (actual native preferred-line board; generated, not reference replay):

```
kn3r1r/3p4/2p1p3/p4Np1/P2P4/2P3P1/4RPQP/5K2 b - - 0 27
```

0mVOQ initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
r5k1/5ppp/3brn1q/1p1ppQ1P/7B/pPP2P2/P5P1/1KR2N1R w - - 4 24
```

0mVOQ after Bg5 (actual native preferred-line board; generated, not reference replay):

```
r5k1/5ppp/3brn1q/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R b - - 5 24
```

0mVOQ after g6 (actual native preferred-line board; generated, not reference replay):

```
r5k1/5p1p/3brnpq/1p1ppQBP/8/pPP2P2/P5P1/1KR2N1R w - - 0 25
```

0mVOQ after Qxe6 (actual native preferred-line board; generated, not reference replay):

```
r5k1/5p1p/3bQnpq/1p1pp1BP/8/pPP2P2/P5P1/1KR2N1R b - - 0 25
```

0mVOQ after Qxg5 (actual native preferred-line board; generated, not reference replay):

```
r5k1/5p1p/3bQnp1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R w - - 0 26
```

0mVOQ after Qxd6 (actual native preferred-line board; generated, not reference replay):

```
r5k1/5p1p/3Q1np1/1p1pp1qP/8/pPP2P2/P5P1/1KR2N1R b - - 0 26
```


## 120. Keep knowledge counts honest

**Problem.** Eight plans and 33 FEN families do not describe the entire tactical policy.

**Decision.** Disclose 38 own and 19 reply ORDER rows, derived Boolean aliases, context conditions, native branches and bounded query costs. Remove inactive rows and stale schema sections rather than claiming decorative cards execute.

0aeNv initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

0aeNv after Bc7 (actual native preferred-line board; generated, not reference replay):

```
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

0aeNv after Qxc7 (actual native preferred-line board; generated, not reference replay):

```
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

0aeNv after Nxc7+ (actual native preferred-line board; generated, not reference replay):

```
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```


## 121. Preserve the coverage set, not a fictional claim of identical search

**Problem.** The native runner can explore different alternatives and take different amounts of work while retaining every required reference result.

**Decision.** The full regression must preserve all 242 old strict passes. Record changed failed cases, independent certificate checks and actual-tree PGNs. Do not call this full behavioral equivalence or a globally minimum policy.

0F6YE initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

0F6YE after Rxf1+ (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

0F6YE after Kg2 (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```

0F6YE after Rf2+ (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```

0F6YE after Kh3 (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```

0F6YE after Rh2# (actual native preferred-line board; generated, not reference replay):

```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4n2r/B7 w - - 4 46
```

05HWi initial decision board (frozen fixture; only this FEN is passed to the autonomous runner):

```
r2q1rk1/2p1bp1n/p1np3Q/1p1Np3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 3 15
```

05HWi after Nxe7+ (actual native preferred-line board; generated, not reference replay):

```
r2q1rk1/2p1Np1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 0 15
```

05HWi after Qxe7 (actual native preferred-line board; generated, not reference replay):

```
r4rk1/2p1qp1n/p1np3Q/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 0 16
```

05HWi after Qg6+ (actual native preferred-line board; generated, not reference replay):

```
r4rk1/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 b - - 1 16
```

05HWi after Kh8 (actual native preferred-line board; generated, not reference replay):

```
r4r1k/2p1qp1n/p1np2Q1/1p2p3/1P2P1b1/PB1P1N2/2P2PPP/R4RK1 w - - 2 17
```

05HWi after Qxg4 (actual native preferred-line board; generated, not reference replay):

```
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```



## 122. Audit bookkeeping without disguising it as chess knowledge

Two directed-reply counters were incremented before initialization and serialized as null. This did not choose moves, but it hid work. The first browser/Node comparison also preserved JavaScript undefined keys on one side but not in JSON on the other.

Initialize reply-board and nominee counters to zero; make the full benchmark reject all nonfinite counters. Compare browser executions through the same JSON serialization as disk records. Rerun the FEN-only coverage and source checks.

Example FEN (after Rxf1+):
```
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

Evidence: test-results/coverage.json; test-results/browser.json; test-results/reproduction.json


## 123. Separate the search horizon from next-turn terminal safety tests

The auxiliary maximum-ply counter reaches eight in 123 historical cases, although entered search nodes and accepted bounded response witnesses stop at seven. A release assertion treating these as the same quantity correctly forced an accounting review.

Retain and disclose the current one-step terminal-safety query: on a seventh-ply board, test immediate captures/checks before declaring the material conversion safe. Do not mislabel these observations as entered DFS nodes, accepted beyond-horizon certificates, or zero work. Independently assert every entered node and response certificate endpoint fits seven.

Example FEN:
```
r4r1k/2p1qp1n/p1np4/1p2p3/1P2P1Q1/PB1P1N2/2P2PPP/R4RK1 b - - 0 17
```

Evidence: test-results/coverage.json; test-results/verification.json; README.md#exact-horizon-accounting


# Native-card replay explorer — presentation-only checkpoint

## 124. Explain depth-first search through actual moves, conclusions and restored questions

**Observed:** The flat node list hid moves and return paths; the active cards were buried in a separate reference. A reader could not easily see why two candidates were abandoned before the third worked.

**Change:** Use a read-only timeline over existing operation records. Make every entered edge clickable, show its exact FEN and parent, and give RESTORE a visible runner-step card. Preserve separate views for the chronological log, move tree and PGN. Do not invent moves, re-run the Oracle for replay, or mutate the investigation.

**Status:** presentation change; solver and policy bytes unchanged

**Evidence:** `tests/replay.test.mjs; tests/browser_replay.py; test-results/runs/0yix5.json`

Before the first rook idea; also the exact board restored after it fails

```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1PpP1/8/1PB2PK1/1R5R b - - 2 32
```

actual initial board and actual RESTORE event 57

After the first entered candidate Rh2+

```text
7r/2pn1kb1/1p1p1p2/pP1PpN2/2P1PpP1/8/1PB2PKr/1R5R w - - 3 33
```

actual entered child n2

## 125. Do not show future conclusions as current facts, or missing evidence as false

**Observed:** Final run records contain later outcomes, and different operation types refer to either the decision board or the resulting board. Treating every item as a post-move position would mismatch the cards, board and stacks.

**Change:** For TRY_PLAN and COUNTER show the recorded before-FEN; AFTER_MOVE shows the entered successor; RESTORE shows its parent FEN. Draw predicates only from the recorded candidate profile that belongs to that decision. Mark absent values unknown. In chronological mode show only already-reached operations and statuses; label complete-tree browsing separately. Returned success on an OR parent is not a direct terminal certificate on that parent board.

**Status:** implemented in pure replay.js projection and tested without changing run records

**Evidence:** `test-results/replay-unit.json; tests/replay.test.mjs`

Saved board at the start of the successful third candidate, f3+

```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1PpP1/8/1PB2PK1/1R5R b - - 2 32
```

actual root candidate 3

Entered board after f3+; not the starting position used to evaluate its candidate predicates

```text
7r/2pn1kb1/1p1p1p1r/pP1PpN2/2P1P1P1/5p2/1PB2PK1/1R5R w - - 0 33
```

actual child n22

## 126. Playback speed is not search scheduling

**Observed:** An animated card desk can look like the solver is distributing search time or testing predicates on demand. That would revive the rejected yielding experiment or add unmetered reasoning.

**Change:** Run the unchanged native worker. Play, pause and scrub only its event recording; use separately labelled calculation controls to run or step the actual solver. Expose both card-follow and manual inspection modes. Runtime and PGN-exporter hashes must match the immutable parent; rerun all 496 historical cases.

**Status:** all 242 existing strict passes preserved: 43/116 high; 199/380 historical regression; no policy repair claimed

**Evidence:** `test-results/coverage.json; test-results/replay-parent-hashes.json; test-results/replay-unit.json`



# Explicit policy refactor and post-audit

## 127. Putting a tactical formula in an observation helper does not turn it into a FEN fact.

**Observed:** The audit found tactical formulas in runner.js and helpers despite a generic-runner description.

**Changed:** Keep the unchanged public Oracle and move the expanded formulas to an explicitly named policy module. Publish their exact source beside the cards. Do not claim smaller cognitive complexity just because the file boundary changed.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

**0aeNv: initial benchmark board** (supplied benchmark fixture, not runtime reference input)

```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**After actual Bc7: the saved MATE_THREAT appears on Black’s fatal stack** (actual autonomous entered move)

```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

## 128. A displayed control must be executable or explicitly informational.

**Observed:** verification.leaf and closureEligibility were accepted by schema but never reached by the solver.

**Changed:** Delete these disconnected fields, reject attempts to reload them, and expose mateCoverage as the gate the runner actually uses. Prose and source documentation are labelled non-executable.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

**0aeNv: initial benchmark board** (supplied benchmark fixture, not runtime reference input)

```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**After actual Bc7: the saved MATE_THREAT appears on Black’s fatal stack** (actual autonomous entered move)

```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

## 129. A plain policy module is preferable to hiding a program in JSON bytecode.

**Observed:** Cards need compound board/context relationships that are not small primitive facts.

**Changed:** Retain ordinary, reviewable JavaScript in policy.js as explicit chess policy and real card tables in policy.json. Use no compiler, instruction stream, general-purpose VM or old-solver fallback. A verbatim source index is documentation, not a new program.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

## 130. The DFS runner should not know pins, material goals, mating contexts or defense classes.

**Observed:** The previous runner computed those decisions directly.

**Changed:** Generic runner operations now invoke the policy interface and only push/pop frames, dispatch phases, meter entries and propagate outcomes. The post-audit checks every runner conditional for tactical vocabulary and inspects its imports.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

## 131. Bind one current-board obligation and use the same record for defenses and urgency.

**Observed:** The stored intent was not consulted and fatal stacks missed established mate/material threats.

**Changed:** Remove decorative intent. Bind frame.ctx.obligation on READ; reply generation consumes it without rebinding, and the stack projection references its ID. Explicitly disclose that the policy rebinds at each new board and still profiles moves before choosing ideas; this is not an immutable long-term plan contract.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

**0aeNv: initial benchmark board** (supplied benchmark fixture, not runtime reference input)

```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**After actual Bc7: the saved MATE_THREAT appears on Black’s fatal stack** (actual autonomous entered move)

```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

## 132. The highlighted card is an executable explanatory choice, not simply the first matching name.

**Observed:** Bc7 had been labelled CASH despite making no capture; all opponent replies were labelled REPAIR.

**Changed:** Use primaryPlan rows to highlight the active mating plan for Bc7 and label counterchecks/rollbacks separately. Other matching plan explanations remain visible. Plan labels do not select an answer from reference PGNs.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

**0aeNv: initial benchmark board** (supplied benchmark fixture, not runtime reference input)

```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**After actual Bc7: the saved MATE_THREAT appears on Black’s fatal stack** (actual autonomous entered move)

```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

## 133. A Boolean tactical result must retain its supporting query, including negative attempts.

**Observed:** The lure-to-fork witness disappeared, while root preflight work preceded the visible idea selection.

**Changed:** Record candidate profiles, table matches, raw safety tests, discovery steps, input/output FENs and directed query results. Repeated same-input evaluations link to the first receipt to keep replay usable. They still execute and are counted; receipt deduplication is not search pruning.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

**0SwRp: initial benchmark board** (supplied benchmark fixture, not runtime reference input)

```text
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```

## 134. Unknown negated predicates must not silently authorize a rule.

**Observed:** A misspelled name under NONE previously succeeded.

**Changed:** Reject undeclared identifiers in both schema and evaluator; fail absent scalar tests closed. Registered absent Boolean values have a displayed false default. This is explicit closed-world semantics, not a full context-dependent type system.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

## 135. Compare threatened outcomes, not just move coordinates.

**Observed:** In an investigated Qg5 Kf8 f6 branch, Qxg7+ becomes Qxg7# but its UCI identity is unchanged.

**Changed:** A same-move mate or improved material consequence is now fresh pressure. The complete 496-case experiment preserved the prior strict pass set before inclusion. This is not a claim that 0GTUW is solved.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`

**0GTUW: initial benchmark board** (supplied benchmark fixture, not runtime reference input)

```text
r3r1k1/pp1q1ppp/3b4/2pp1P1N/3N4/1P6/P1PQ2PP/5R1K w - - 0 25
```

**Investigated branch after Qg5 Kf8, before f6** (offline defect fixture, not reference solution)

```text
r3rk2/pp1q1ppp/3b4/2pp1PQN/3N4/1P6/P1P3PP/5R1K w - - 2 26
```

**After f6; hypothetical unaddressed Qxg7 now mates** (legal fixture continuation; Black still has its defense turn)

```text
r3rk2/pp1q1ppp/3b1P2/2pp2QN/3N4/1P6/P1P3PP/5R1K b - - 0 26
```

## 136. Preserved coverage does not certify complete chess soundness or full cognitive simplification.

**Observed:** The inherited templates and static exposure boundary remain bounded, and an attractive moving card can hide computation cost.

**Changed:** Publish the expanded policy source, machine branch audit, all returned witnesses, input-only benchmark reproduction, UI checks, and auxiliary counters. Do not claim new puzzle passes from a refactor or a universal proof of defense-class completeness.

**Evidence:** `tests/post-audit.mjs; test-results/post-audit.json; test-results/coverage.json`



## 137. An evidence record must point back to its originating question

The browser audit found that a royal-fork discovery receipt held the hypothetical board but omitted its parent node. Add the parent receipt, DFS node, and before-FEN; export receipts with the chronological log. This changes trace provenance only.

0SwRp before Rb7+:
```text
1n3r1r/2kp4/1Rpbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 w - - 1 25
```
After Rb7+:
```text
1n3r1r/1Rkp4/2pbp3/p4qp1/P1NP4/2P3P1/4RPQP/5K2 b - - 2 25
```
The hypothetical fork evidence is not the played main line. Verification: `tests/browser_audit.py`, `tests/post-audit.mjs`.


# Card-first restoration: new experiments and verified limits

The earlier text is preserved byte-for-byte above. New entries below describe public tests and their evidence, not private assistant reasoning. The current source is a working restoration, not a promotion of the older solver.

## 138. Recover the program, not the claim about it.

**Problem:** The previous recovery archive did not contain the claimed runnable card-first replacement. Its own audit said source binding had failed.

**Change or conclusion:** Use the preserved source and journal as evidence; rebuild the card-first branch separately. Do not inherit the unverified four-pass score.

**Status:** integrity correction

**Evidence:** `README.md; history/parent-hashes.json`

## 139. Assess the position before calculating candidate moves.

**Problem:** The older implementation profiled all own candidates before displaying a plan.

**Change or conclusion:** Choose up to three plans from the current position. Only the selected plan may request candidate moves. The test forbids move requests or hypothetical candidate boards before that first choice.

**Status:** retained

**Evidence:** `runner.js; operations.js: select-plan; tests/verify.mjs`

### 0F6YE — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

**Rxf1+**

Before:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

**Kg2**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```

**Rf2+**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```

**Kh3**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```

**Rh2#**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4n2r/B7 w - - 4 46
```

Entered positions: 8. Recorded rule steps: 463. Exact completed reference match: true.

## 140. A forced reply is a result of calculation, not a free initial fact.

**Problem:** A move was previously preferred as having a single answer before the displayed variation had begun.

**Change or conclusion:** After examining the checking move, ask separately for its legal evasions. Only then record whether the reply is forced.

**Status:** retained

**Evidence:** `policy.json: check-candidate; tests/verify.mjs`

### 0F6YE — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

**Rxf1+**

Before:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

**Kg2**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```

**Rf2+**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```

**Kh3**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```

**Rh2#**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4n2r/B7 w - - 4 46
```

Entered positions: 8. Recorded rule steps: 463. Exact completed reference match: true.

## 141. Continue the mating attack after winning incidental material.

**Problem:** The shared material test could stop after taking the bishop in a live rook attack.

**Change or conclusion:** Remember the mating purpose through the opponent’s replies. Examine the next checks rather than treating the intermediate material gain as the end of the combination.

**Status:** retained

**Evidence:** `policy.json: attack-king and mate-in-one; test-results/examples/0F6YE.json.gz`

### 0F6YE — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```

**Rxf1+**

Before:
```text
5r1k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4B1K b - - 0 43
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```

**Kg2**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n3/B4r1K w - - 0 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```

**Rf2+**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4n1K1/B4r2 b - - 1 44
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```

**Kh3**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2b1/4nrK1/B7 w - - 2 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```

**Rh2#**

Before:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4nr2/B7 b - - 3 45
```
After:
```text
7k/1p4p1/7p/2P5/1P1p2Q1/3P2bK/4n2r/B7 w - - 4 46
```

Entered positions: 8. Recorded rule steps: 463. Exact completed reference match: true.

## 142. Do not reject a sacrifice before checking the forcing continuation.

**Problem:** The earliest historical failure rejected Qxg7+ Kxg7 before f6+.

**Change or conclusion:** Keep the check, capture and compensation questions explicit. A negative material balance alone does not refute a sacrifice. The original pawn-check fixture remains a legality and continuation regression test.

**Status:** retained

**Evidence:** `tests/verify.mjs; original learning-journal entry 001`

**Scope:** A legal continuation is not proof that the original sacrifice succeeds; the test prevents the unjustified early cut.

## 143. Interference can be forced by a check.

**Problem:** A king can be driven onto the line by which one rook defends another. That relationship was hidden in a compound result.

**Change or conclusion:** After the check, inspect each legal king reply on its own board. Determine whether it interrupts the sole defender’s line. The resulting target still has to be collected and the reply analysis completed.

**Status:** retained

**Evidence:** `policy.json: deflection-replies; operations.js; test-results/examples/0Mbgh.json.gz`

### 0Mbgh — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
5r2/1pp3p1/p3p1k1/8/3pR3/5r2/PPP1KP2/7R w - - 1 34
```

**Rg4+**

Before:
```text
5r2/1pp3p1/p3p1k1/8/3pR3/5r2/PPP1KP2/7R w - - 1 34
```
After:
```text
5r2/1pp3p1/p3p1k1/8/3p2R1/5r2/PPP1KP2/7R b - - 2 34
```

**Kf7**

Before:
```text
5r2/1pp3p1/p3p1k1/8/3p2R1/5r2/PPP1KP2/7R b - - 2 34
```
After:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5r2/PPP1KP2/7R w - - 3 35
```

**Kxf3**

Before:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5r2/PPP1KP2/7R w - - 3 35
```
After:
```text
5r2/1pp2kp1/p3p3/8/3p2R1/5K2/PPP2P2/7R b - - 0 35
```

Entered positions: 8. Recorded rule steps: 682. Exact completed reference match: true.

## 144. After clearance, remember the piece whose line was opened.

**Problem:** The blocker moved with a threat, but the following capture by a different piece was not consistently recognised.

**Change or conclusion:** Preserve the cleared line, the attacking rook and the queen target. After the opponent meets the mating threat, follow up the rook attack.

**Status:** retained

**Evidence:** `policy.json: finish-clearance; test-results/examples/0d50W.json.gz`

### 0d50W — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
r1b4Q/pp3B2/1k1p3p/6q1/1P6/8/P3nPPP/R3R2K b - - 2 20
```

**Bh3**

Before:
```text
r1b4Q/pp3B2/1k1p3p/6q1/1P6/8/P3nPPP/R3R2K b - - 2 20
```
After:
```text
r6Q/pp3B2/1k1p3p/6q1/1P6/7b/P3nPPP/R3R2K w - - 3 21
```

**gxh3**

Before:
```text
r6Q/pp3B2/1k1p3p/6q1/1P6/7b/P3nPPP/R3R2K w - - 3 21
```
After:
```text
r6Q/pp3B2/1k1p3p/6q1/1P6/7P/P3nP1P/R3R2K b - - 0 21
```

**Rxh8**

Before:
```text
r6Q/pp3B2/1k1p3p/6q1/1P6/7P/P3nP1P/R3R2K b - - 0 21
```
After:
```text
7r/pp3B2/1k1p3p/6q1/1P6/7P/P3nP1P/R3R2K w - - 0 22
```

Entered positions: 8. Recorded rule steps: 1307. Exact completed reference match: true.

## 145. Restricted mobility suggests a plan; it does not prove a trap.

**Problem:** A queen could have very limited routes before it was actually attacked.

**Change or conclusion:** Add a FEN-only observation of a named queen’s legal retreat routes. Keep the static safe-destination convention explicit. The plan must still examine captures of the attacker, added defenders and counterplay.

**Status:** retained

**Evidence:** `oracle.js; predicate-catalog.js; tests/verify.mjs`

**Scope:** The Oracle remains FEN-only but is not byte-for-byte identical to the older Oracle. Its catalogue now has 34 families. This is local legality, not a hidden continuation search.

### 0aeNv — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**Bc7**

Before:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```
After:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

**Qxc7**

Before:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```
After:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

**Nxc7+**

Before:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```
After:
```text
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```

Entered positions: 6. Recorded rule steps: 503. Exact completed reference match: true.

## 146. A supported interposition may meet both parts of a fork.

**Problem:** The king-move branch could be displayed first although a supported rook interposition also answered the check and moved the other target.

**Change or conclusion:** Retain all evasions. Use the explicit late comparison for the supported block by the other forked target; capturing the checker and counterchecks remain real alternatives.

**Status:** retained

**Evidence:** `policy.json: candidateComparisons; test-results/examples/0PSQq.json.gz`

**Scope:** A deterministic preference among defences is not a universal theorem about best play. The strict benchmark still requires the recorded representative line.

### 0PSQq — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
6qk/6r1/p4Q2/1p4p1/3p4/3RbP1P/1PK4R/8 b - - 1 37
```

**Qc4+**

Before:
```text
6qk/6r1/p4Q2/1p4p1/3p4/3RbP1P/1PK4R/8 b - - 1 37
```
After:
```text
7k/6r1/p4Q2/1p4p1/2qp4/3RbP1P/1PK4R/8 w - - 2 38
```

**Rc3**

Before:
```text
7k/6r1/p4Q2/1p4p1/2qp4/3RbP1P/1PK4R/8 w - - 2 38
```
After:
```text
7k/6r1/p4Q2/1p4p1/2qp4/2R1bP1P/1PK4R/8 b - - 3 38
```

**dxc3**

Before:
```text
7k/6r1/p4Q2/1p4p1/2qp4/2R1bP1P/1PK4R/8 b - - 3 38
```
After:
```text
7k/6r1/p4Q2/1p4p1/2q5/2p1bP1P/1PK4R/8 w - - 0 39
```

Entered positions: 8. Recorded rule steps: 1084. Exact completed reference match: true.

## 147. Reuse a reply already checked, with its evidence attached.

**Problem:** Repeated exchange questions used calculation without teaching an additional chess distinction.

**Change or conclusion:** Reuse the result only for the same recorded board and question. Retain the source event and legal move sequence; the card reports which defensive branches share that answer.

**Status:** retained

**Evidence:** `operations.js: sort-candidates; tests/verify.mjs; test-results/independent-verification.json`

### 0aeNv — ACTUAL AUTONOMOUS CALCULATION

Starting position:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```

**Bc7**

Before:
```text
2rqkb1r/pp1bnpp1/3Bpn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 6 11
```
After:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```

**Qxc7**

Before:
```text
2rqkb1r/ppBbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 7 11
```
After:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```

**Nxc7+**

Before:
```text
2r1kb1r/ppqbnpp1/4pn1p/1N1p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 w k - 0 12
```
After:
```text
2r1kb1r/ppNbnpp1/4pn1p/3p4/2pP4/4PN1P/PPP1BPP1/R2Q1RK1 b k - 0 12
```

Entered positions: 6. Recorded rule steps: 503. Exact completed reference match: true.

## 148. Do not describe an unverified material threat as unavoidable.

**Problem:** A structural attack or static material estimate could be mistaken for proof of loss.

**Change or conclusion:** Keep the two urgency categories, but mark untested material claims as still to be checked. A legal check is compulsory; an immediate mating threat needs its actual recorded mating move.

**Status:** retained

**Evidence:** `language.js; operations.js; policy.json: observations`

**Scope:** The threat list is a study aid. No fixed number of weaknesses automatically proves a win.

## 149. Ordinary chess language must name the actual operation.

**Problem:** Labels such as cash-out, rollback and pressure debt obscured familiar chess questions.

**Change or conclusion:** Use captures, recaptures, forcing moves, intermediate moves, compensation, clearance, interference and counterplay. Each sentence is emitted with the rule that actually performed the operation; it is not an imagined account added after the solution.

**Status:** retained

**Evidence:** `language.js; policy.json: terminology; tests/verify.mjs`

**Scope:** Terminology reference: Lichess puzzle themes. That source supports the names, not the correctness of this policy’s heuristic ordering or material stopping tests.

## 150. Reject a broader continuation rule when it earns no useful result.

**Problem:** A trial kept another forcing plan active merely because an earlier move had checked.

**Change or conclusion:** The targeted trial did not earn another strict high-band success; remove the extra entry instead of adding another unexplained exception.

**Status:** rejected experiment

**Evidence:** `development/experiments/; test-results/continued-forcing-trial.json`

## 151. The PGN must stop where the selected line stops.

**Problem:** Independent replay found nineteen unresolved cases whose PGN silently continued down an explored child after the reported selected endpoint.

**Change or conclusion:** Follow the exact recorded selected line. Keep further investigated continuations as separately labelled legal variations, not as a silent main-line extension. Independently replay every move and variation.

**Status:** retained

**Evidence:** `pgn.js; tests/independent.mjs`

**Scope:** The affected records were failed or unresolved cases. No strict success was gained by changing the exporter.

## 152. Invalid input must not run the previous position.

**Problem:** A failed FEN load could leave a prior calculation available to the controls.

**Change or conclusion:** Clear the worker before validation and disable calculation controls until the new board loads. Restoring a calculation snapshot does not attach an unrelated reference answer.

**Status:** retained

**Evidence:** `worker.js; view.js; tests/browser.py`

**Scope:** The browser checks run the actual bundled worker. Direct local navigation is blocked by this environment; that deployment path is not claimed as tested.

## 153. A readable calculation still needs an honest coverage comparison.

**Problem:** The old 242 strict successes are not all expressed in the new card-first method.

**Change or conclusion:** The fresh run gives 13/116 high-band and 173/380 historical regression successes: 171 old successes survive, 71 are lost, and 15 new regression cases succeed. Keep the preservation gate failed and retain the old source separately.

**Status:** measured limitation

**Evidence:** `test-results/final-coverage.json; test-results/independent-verification.json`

**Scope:** Do not call this equivalent coverage or a promoted replacement. The workbench is a runnable restoration checkpoint. Case-specific answers are absent from the calculation process.


## 154. The declared opening card must actually choose the first question.

**Problem:** A source check found that the frame constructor still named the assessment card directly instead of reading the declared starting card.

**Change:** Save the declared starting card in the calculation state and use it when creating a frame. Add a mutation test that changes the starting card and verifies the actual initial state. The normal assessment-first route is unchanged.

**Evidence:** `state.js; tests/verify.mjs`
