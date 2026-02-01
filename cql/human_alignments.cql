cql(quiet)

// Important-alignments filter.
// Discard rules are disabled if either side is down >= 9 points from start (39 -> 30).
// Discard: horizontal alignments on rank 1 or 8.
// Keep: (K or Q, other non-pawn piece, aligned, at least one between-square).
// Keep: (slider, friendly blocker, enemy target beyond blocker on same line, at least one between-square).

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
  if (arrow_comment == "") then
    arrow_comment = "[%cal " + color + str(fromSq) + str(toSq) + "]"
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
    if $from == [] then $from = sq else $to = sq
  }
  arrowFromToColor("Y" $from $to)
}

function countSquares($set) {
  $n = 0
  square z in $set { $n = $n + 1 }
  $n
}

function sidePoints(isWhite) {
  if (isWhite) then
    9*countSquares([Q]) + 5*countSquares([R]) + 3*countSquares([B]) + 3*countSquares([N]) + 1*countSquares([P])
  else
    9*countSquares([q]) + 5*countSquares([r]) + 3*countSquares([b]) + 3*countSquares([n]) + 1*countSquares([p])
}

function messy() {
  $w = sidePoints(1)
  $b = sidePoints(0)
  ($w <= 30) | ($b <= 30)
}

function horizRank1or8($a $b) {
  (rank $a == rank $b) & ((rank $a == 1) | (rank $a == 8))
}

function hasBetween($a $b) {
  countSquares(ray($a $b)) >= 1
}

function isKQPair($a $b) {
  // K/Q with other non-pawn piece, aligned, >=1 between-square.
  $ok = 0
  if (($a in [K]) & ($b in [QBNR])) then $ok = 1
  if (($b in [K]) & ($a in [QBNR])) then $ok = 1
  if (($a in [Q]) & ($b in [BNR])) then $ok = 1
  if (($b in [Q]) & ($a in [BNR])) then $ok = 1
  if (($a in [k]) & ($b in [qbnr])) then $ok = 1
  if (($b in [k]) & ($a in [qbnr])) then $ok = 1
  if (($a in [q]) & ($b in [bnr])) then $ok = 1
  if (($b in [q]) & ($a in [bnr])) then $ok = 1
  $ok & (ray($a $b)) & hasBetween($a $b)
}

function enemyBeyond($slider $blocker isWhite) {
  // Any enemy non-pawn piece beyond blocker on same infinite line.
  $edges = enclosingedges($slider $blocker)
  $e1 = []
  $e2 = []
  square e in $edges { if $e1 == [] then $e1 = e else $e2 = e }
  $beyond = []
  if ($blocker in ray($slider $e1)) then $beyond = $e1
  else if ($blocker in ray($slider $e2)) then $beyond = $e2
  else $beyond = []
  if ($beyond == []) then 0
  else {
    $after = ray($blocker $beyond)
    if (isWhite) then (countSquares($after & [qbnr]) >= 1)
    else (countSquares($after & [QBNR]) >= 1)
  }
}

function isDiscovery($slider $blocker isWhite) {
  // Slider + friendly blocker + enemy target beyond, aligned, >=1 between-square (slider<->blocker).
  (ray($slider $blocker)) & hasBetween($slider $blocker) & enemyBeyond($slider $blocker isWhite)
}

find all quiet {
  arrow_comment = ""
  $m = messy()

  // Discard counters
  $d_r18 = 0
  $d_nospace = 0
  $d_other = 0

  // Pass A: K/Q focus
  square a in [KQ]
    square b in [QBNR]
      if (a != b) then
        if (str(a) < str(b)) then {
          $keep = 0
          if (ray(a b)) then {
            if ((!$m) & horizRank1or8(a b)) then $d_r18 = $d_r18 + 1
            else if ((!$m) & (!hasBetween(a b))) then $d_nospace = $d_nospace + 1
            else {
              if ($m | isKQPair(a b)) then $keep = 1 else $d_other = $d_other + 1
            }
          }
          if ($keep) then colorEnclosingRay(a b)
        }

  square c in [kq]
    square d in [qbnr]
      if (c != d) then
        if (str(c) < str(d)) then {
          $keep2 = 0
          if (ray(c d)) then {
            if ((!$m) & horizRank1or8(c d)) then $d_r18 = $d_r18 + 1
            else if ((!$m) & (!hasBetween(c d))) then $d_nospace = $d_nospace + 1
            else {
              if ($m | isKQPair(c d)) then $keep2 = 1 else $d_other = $d_other + 1
            }
          }
          if ($keep2) then colorEnclosingRay(c d)
        }

  // Pass B: discovery seeds
  square s in [BRQ]
    square t in [KQBNR]
      if (s != t) then
        if (str(s) < str(t)) then {
          $keep3 = 0
          if (ray(s t)) then {
            if ((!$m) & horizRank1or8(s t)) then $d_r18 = $d_r18 + 1
            else if ((!$m) & (!hasBetween(s t))) then $d_nospace = $d_nospace + 1
            else {
              if ($m | isDiscovery(s t 1)) then $keep3 = 1 else $d_other = $d_other + 1
            }
          }
          if ($keep3) then colorEnclosingRay(s t)
        }

  square u in [brq]
    square v in [kqbnr]
      if (u != v) then
        if (str(u) < str(v)) then {
          $keep4 = 0
          if (ray(u v)) then {
            if ((!$m) & horizRank1or8(u v)) then $d_r18 = $d_r18 + 1
            else if ((!$m) & (!hasBetween(u v))) then $d_nospace = $d_nospace + 1
            else {
              if ($m | isDiscovery(u v 0)) then $keep4 = 1 else $d_other = $d_other + 1
            }
          }
          if ($keep4) then colorEnclosingRay(u v)
        }

  // Comment only discards (compact)
  if (arrow_comment == "") then
    comment("discard{r18=" + str($d_r18) + ",space=" + str($d_nospace) + ",other=" + str($d_other) + ",messy=" + str($m) + "}")
  else
    comment(arrow_comment + " discard{r18=" + str($d_r18) + ",space=" + str($d_nospace) + ",other=" + str($d_other) + ",messy=" + str($m) + "}")
}
f (ray(u v)) then {
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
