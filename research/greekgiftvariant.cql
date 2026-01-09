cql(quiet)

find all quiet {
  wtm
  movenumber < 50

  total_preconditions = 7
  met_preconditions = 0

  // Reason lines (only populated when that condition is satisfied)
  reason_1 = ""
  reason_2 = ""
  reason_3 = ""
  reason_4 = ""
  reason_5 = ""
  reason_6 = ""
  reason_7 = ""

  // ----------------------------
  // (1) Pawn shield exists: f7 g7 h7
  // and king is on g8 or h8
  // ----------------------------
  if (pf7 and pg7 and ph7 and (kg8 or kh8)) then {
    met_preconditions = met_preconditions + 1
    reason_1 = "• Structure: pf7 pg7 ph7 and king on g8/h8\n"
  }
  else {
    reason_1 = ""
  }

  // ----------------------------
  // (2) g5 is safe now: no black piece attacks g5
  // ----------------------------
  black_attackers_g5 = #(a attacks g5)

  if (black_attackers_g5 == 0) then {
    met_preconditions = met_preconditions + 1
    reason_2 = "• Square g5 is safe now: #(a attacks g5) == 0\n"
  }
  else {
    reason_2 = ""
  }

  // ----------------------------
  // (3) h7 has no non-king defenders now
  // (no pawn/knight/bishop/rook/queen attacks h7)
  // ----------------------------
  pawn_defenders_h7 = #(p attacks h7)
  knight_defenders_h7 = #(n attacks h7)
  bishop_defenders_h7 = #(b attacks h7)
  rook_defenders_h7 = #(r attacks h7)
  queen_defenders_h7 = #(q attacks h7)

  if (pawn_defenders_h7 == 0
      and knight_defenders_h7 == 0
      and bishop_defenders_h7 == 0
      and rook_defenders_h7 == 0
      and queen_defenders_h7 == 0) then {
    met_preconditions = met_preconditions + 1
    reason_3 = "• h7 undefended by non-king pieces: p/n/b/r/q attacks all 0\n"
  }
  else {
    reason_3 = ""
  }

  // ----------------------------
  // (4) Candidate sac move exists now
  // ----------------------------
  if (move legal from B to h7) then {
    met_preconditions = met_preconditions + 1
    reason_4 = "• Candidate sac exists now: move legal from B to h7\n"
  }
  else {
    reason_4 = ""
  }

  // ----------------------------
  // (5) Candidate knight jump exists now
  // ----------------------------
  if (move legal from N to g5) then {
    met_preconditions = met_preconditions + 1
    reason_5 = "• Candidate jump exists now: move legal from N to g5\n"
  }
  else {
    reason_5 = ""
  }

  // ----------------------------
  // (6) Queen can get to h5 now (proxy for the line)
  // ----------------------------
  if (move legal from Q to h5) then {
    met_preconditions = met_preconditions + 1
    reason_6 = "• Queen access now: move legal from Q to h5 (proxy for after Ng5)\n"
  }
  else {
    reason_6 = ""
  }

  // ----------------------------
  // (7) h7 is already pressured (at least 2 white attackers)
  // ----------------------------
  white_attackers_h7 = #(A attacks h7)

  if (white_attackers_h7 >= 2) then {
    met_preconditions = met_preconditions + 1
    reason_7 = "• Pressure: #(A attacks h7) >= 2\n"
  }
  else {
    reason_7 = ""
  }

  // MATCH CONSTRAINT
  met_preconditions >= 5

  // ----------------------------
  // Emit only when close
  // ----------------------------
  if (met_preconditions >= 6) then {
    comment (
      "Greek Gift CLOSE: " met_preconditions " of " total_preconditions "\n"
      "Diagnostics:\n"
      "  #(a attacks g5) = " black_attackers_g5 "\n"
      "  #(A attacks h7) = " white_attackers_h7 "\n"
      "  p/n/b/r/q attacks h7 = "
      pawn_defenders_h7 "/" knight_defenders_h7 "/" bishop_defenders_h7 "/"
      rook_defenders_h7 "/" queen_defenders_h7 "\n"
      "\n"
      "Matched conditions:\n"
      reason_1
      reason_2
      reason_3
      reason_4
      reason_5
      reason_6
      reason_7
      "\n"
      "[%csl Yh7,Gg5]"
    )
  }
  else if (met_preconditions >= 5) then {
    comment (
      "Greek Gift WARM: " met_preconditions " of " total_preconditions "\n"
      "Matched conditions:\n"
      reason_1
      reason_2
      reason_3
      reason_4
      reason_5
      reason_6
      reason_7
      "[%csl Rh7]"
    )
  }
  else {
    met_preconditions = met_preconditions
  }
}
