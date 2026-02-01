cql(quiet)

/*
  IMPORTANT-ALIGNMENTS FILTER

  We start from the naive “any ray-aligned non-pawn pieces” approach and DISCARD aggressively,
  *unless* the position is “messy” (either side is down >=9 points of material from the initial 39).

  Discard rules (applied only when NOT messy):
    (D1) Ignore alignments that are *on* the 1st or 8th rank (i.e., horizontal on rank 1 or rank 8).
    (D2) Always keep “K/Q alignments”:
         - (King OR Queen, other NON-pawn piece, ray exists, and at least one square between endpoints).
         - Example: K next to fianchetto bishop (adjacent) is DISCARDED (no between-square).
    (D3) For everything else keep only “discovery seeds”:
         - (slider, discoverer that blocks slider, at least one square between slider and discoverer).
         - We model this as: slider and discoverer same color, ray(slider, discoverer) exists AND has >=1 between-sq.
         - AND there exists at least one enemy non-pawn piece “beyond” the discoverer on that same line,
           so moving the discoverer would *potentially* reveal a slider attack.

  Output:
    - Yellow arrow for each KEPT alignment across the *enclosing edges* of the ray (like your original).
    - A compact discard report appended to the comment so we can see what we’re throwing away.

  Notes for iteration:
    - D3 currently treats “discoverer” as any friendly non-pawn piece (K/Q/B/N/R) that blocks a slider (B/R/Q).
      We can tighten “discoverer has plausible vacating move” later if you want.
*/

function enclosingedges($s1 $s2) {
  if file $s1 == file $s2 then
    makesquare(file $s1 1) | makesquare(file $s1 8)
  else if rank $s1 == rank $s2 then
    makesquare(1 rank $s1) | makesquare(8 rank $s1)
  else if (file $s1 - rank $s1) == (file $s2 - rank $s2) then {
    $d = file $s1 - rank $s1
    if $d >= 0 then
      makesquare(1 + $d 1) | makesquare(8 8 - $d)
    else
      makesquare(1 1 - $d) | makesquare(8 + $d 8)
  } else if (file $s1 + rank $s1) == (file $s2 + rank $s2) then {
    $s = file $s1 + rank $s1
    if $s <= 9 then
      makesquare(1 $s - 1) | makesquare($s - 1 1)
    else
      makesquare($s - 8 8) | makesquare(8 $s - 8)
  } else
    []
}

arrow_comment = ""

function arrowFromToColor(color fromSq toSq){
  if (arrow_comment == "") then {
    arrow_comment = "[%cal " + color + str(fromSq) + str(toSq) + "]"
  }
  else {
    arrow_comment = arrow_comment[:-1]
    arrow_comment = arrow_comment + "," + color + str(fromSq) + str(toSq) + "]"
  }
}

function colorEnclosingRay($s1 $s2){
  $edges = enclosingedges($s1 $s2)
  $from = []
  $to = []
  square sq in $edges {
    if $from == [] then
      $from = sq
    else
      $to = sq
  }
  arrowFromToColor("Y" $from $to)
}

/*** Material / “messy position” detection ***/

// piece-count helpers
function countSquares($set) {
  $n = 0
  square z in $set { $n = $n + 1 }
  $n
}

function sideMaterialPoints(isWhite) {
  // Starting non-king total = 39 per side:
  // Q=9, R=5+5, B=3+3, N=3+3, P=1x8
  $Q = 0  $R = 0  $B = 0  $N = 0  $P = 0

  if (isWhite) then {
    $Q = countSquares([Q])
    $R = countSquares([R])
    $B = countSquares([B])
    $N = countSquares([N])
    $P = countSquares([P])
  } else {
    $Q = countSquares([q])
    $R = countSquares([r])
    $B = countSquares([b])
    $N = countSquares([n])
    $P = countSquares([p])
  }

  9*$Q + 5*$R + 3*$B + 3*$N + 1*$P
}

function isMessyMaterial() {
  // “Throw discard rules out once material is at least 9 points down from start.”
  // Interpret: if EITHER side is missing >=9 points from their initial 39, then keep everything.
  $w = sideMaterialPoints(1)
  $b = sideMaterialPoints(0)
  ($w <= 30) | ($b <= 30)   // 39 - 9 = 30
}

/*** Discard rule predicates ***/

function isRank1or8Horizontal($s1 $s2) {
  // “Don’t focus on any alignments on the first or eighth rank.”
  // Interpret narrowly: horizontal rays on rank 1 or rank 8.
  (rank $s1 == rank $s2) & ((rank $s1 == 1) | (rank $s1 == 8))
}

function hasSpaceBetween($s1 $s2) {
  // “at least one space” => at least one square strictly between endpoints
  $mid = ray($s1 $s2)
  countSquares($mid) >= 1
}

function isKQFocusPair($a $b) {
  // “Focus on all alignments on either king or queen:
  //  (King or Queen, other non pawn piece, at least one space)”
  //
  // We apply this for both colors.
  //
  // “other non pawn piece” => B/N/R/Q (NOT pawn, NOT king)
  // Also requires ray alignment to exist and hasSpaceBetween().

  $ok = 0

  // White King/Queen endpoints
  if (($a in [K]) & ($b in [QBNR])) then $ok = 1
  if (($b in [K]) & ($a in [QBNR])) then $ok = 1
  if (($a in [Q]) & ($b in [BNR])) then $ok = 1
  if (($b in [Q]) & ($a in [BNR])) then $ok = 1
  // (Q,Q) also allowed by “King or Queen, other non pawn piece”?
  // If you want Q–Q included, change [BNR] above to [QBNR].

  // Black King/Queen endpoints
  if (($a in [k]) & ($b in [qbnr])) then $ok = 1
  if (($b in [k]) & ($a in [qbnr])) then $ok = 1
  if (($a in [q]) & ($b in [bnr])) then $ok = 1
  if (($b in [q]) & ($a in [bnr])) then $ok = 1

  // must be aligned and must have at least one between-square
  $ok & (ray($a $b)) & hasSpaceBetween($a $b)
}

function existsEnemyBeyondOnLine($slider $blocker isWhite) {
  // For discovery seed:
  // slider + blocker are same color, aligned.
  // We need at least one enemy non-pawn piece beyond blocker on same line.
  //
  // Implementation:
  // Use enclosingedges(slider, blocker) to get the two ends of the infinite line.
  // Pick the end that is NOT "toward the slider" direction; then take ray(blocker, thatEnd)
  // and see if it contains any enemy [QBNR] (or [qbnr]).
  $edges = enclosingedges($slider $blocker)

  $e1 = []
  $e2 = []
  square e in $edges {
    if $e1 == [] then $e1 = e else $e2 = e
  }

  // Determine which edge is "beyond" the blocker (i.e., blocker is between slider and that edge).
  $beyond = []
  if ($blocker in ray($slider $e1)) then $beyond = $e1
  else if ($blocker in ray($slider $e2)) then $beyond = $e2
  else $beyond = []  // shouldn't happen if aligned, but keeps us safe.

  if ($beyond == []) then 0
  else {
    $after = ray($blocker $beyond)
    if (isWhite) then
      (countSquares($after & [qbnr]) >= 1)
    else
      (countSquares($after & [QBNR]) >= 1)
  }
}

function isDiscoverySeed($slider $blocker isWhite) {
  // “(slider, discoverer that if it moved would discover attacks for the slider on the alignment, at least one space)”
  //
  // slider: bishop/rook/queen
  // blocker/discoverer: any friendly non-pawn piece that blocks slider (including queen/king/knight/bishop/rook)
  //
  // “at least one space” interpreted as: there is at least one square between slider and blocker (not adjacent).
  // Then also require an enemy non-pawn piece exists beyond blocker on same line.
  (ray($slider $blocker)) &
  hasSpaceBetween($slider $blocker) &
  existsEnemyBeyondOnLine($slider $blocker isWhite)
}

/*** Main ***/

find all quiet {
  arrow_comment = ""

  $messy = isMessyMaterial()

  // discard counters (for reporting)
  $d_rank18 = 0
  $d_noSpace = 0
  $d_notKQorDisc = 0

  /***************
    PASS 1: K/Q focus pairs (always considered “important” when not messy)
    We’ll also keep them in messy mode (messy just disables discards, not removes keeps).
  ****************/

  // White K/Q with other non-pawn piece
  square a in [KQ]
    square b in [QBNR]
      if (a != b) then {
        // Avoid obvious duplicate arrows by lexical ordering.
        if (str(a) < str(b)) then {
          $keep = 0

          if (ray(a b)) then {
            if ((!$messy) & isRank1or8Horizontal(a b)) then {
              $d_rank18 = $d_rank18 + 1
            }
            else if ((!$messy) & (!hasSpaceBetween(a b))) then {
              // example: K adjacent to bishop => ray(a b)==[] => no space
              $d_noSpace = $d_noSpace + 1
            }
            else {
              // In non-messy mode, require K/Q focus rule;
              // In messy mode, keep any aligned a-b (matches your “throw discard rules out”).
              if ($messy | isKQFocusPair(a b)) then $keep = 1
              else $d_notKQorDisc = $d_notKQorDisc + 1
            }
          }

          if ($keep) then colorEnclosingRay(a b)
        }
      }

  // Black k/q with other non-pawn piece
  square c in [kq]
    square d in [qbnr]
      if (c != d) then {
        if (str(c) < str(d)) then {
          $keep2 = 0

          if (ray(c d)) then {
            if ((!$messy) & isRank1or8Horizontal(c d)) then {
              $d_rank18 = $d_rank18 + 1
            }
            else if ((!$messy) & (!hasSpaceBetween(c d))) then {
              $d_noSpace = $d_noSpace + 1
            }
            else {
              if ($messy | isKQFocusPair(c d)) then $keep2 = 1
              else $d_notKQorDisc = $d_notKQorDisc + 1
            }
          }

          if ($keep2) then colorEnclosingRay(c d)
        }
      }

  /***************
    PASS 2: Discovery seeds (slider + discoverer/blocker)
    Only used for “the rest” when not messy; in messy mode we keep everything anyway.
  ****************/

  // WHITE discovery seeds
  square s in [BRQ]
    square t in [KQBNR]
      if (s != t) then {
        if (str(s) < str(t)) then {
          $keep3 = 0

          if (ray(s t)) then {
            if ((!$messy) & isRank1or8Horizontal(s t)) then {
              $d_rank18 = $d_rank18 + 1
            }
            else if ((!$messy) & (!hasSpaceBetween(s t))) then {
              // “at least one space” between slider and discoverer
              $d_noSpace = $d_noSpace + 1
            }
            else {
              if ($messy | isDiscoverySeed(s t 1)) then $keep3 = 1
              else $d_notKQorDisc = $d_notKQorDisc + 1
            }
          }

          if ($keep3) then colorEnclosingRay(s t)
        }
      }

  // BLACK discovery seeds
  square u in [brq]
    square v in [kqbnr]
      if (u != v) then {
        if (str(u) < str(v)) then {
          $keep4 = 0

          if (ray(u v)) then {
            if ((!$messy) & isRank1or8Horizontal(u v)) then {
              $d_rank18 = $d_rank18 + 1
            }
            else if ((!$messy) & (!hasSpaceBetween(u v))) then {
              $d_noSpace = $d_noSpace + 1
            }
            else {
              if ($messy | isDiscoverySeed(u v 0)) then $keep4 = 1
              else $d_notKQorDisc = $d_notKQorDisc + 1
            }
          }

          if ($keep4) then colorEnclosingRay(u v)
        }
      }

  // Append a discard summary for iteration/debugging
  // (When messy=1, these counters mostly remain low because we don’t discard.)
  if (arrow_comment == "") then {
    comment(
      "discarded{rank1/8=" + str($d_rank18) +
      ", noSpace=" + str($d_noSpace) +
      ", notKQorDisc=" + str($d_notKQorDisc) +
      ", messy=" + str($messy) + "}"
    )
  } else {
    comment(
      arrow_comment + " " +
      "discarded{rank1/8=" + str($d_rank18) +
      ", noSpace=" + str($d_noSpace) +
      ", notKQorDisc=" + str($d_notKQorDisc) +
      ", messy=" + str($messy) + "}"
    )
  }
}
