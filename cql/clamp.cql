cql(quiet)

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
square_comment = ""

// ---- %cal arrows (existing) ----
function arrowFromToColor(color fromSq toSq){
  if (arrow_comment == "") then {
    arrow_comment = "[%cal " + color + str(fromSq) + str(toSq) + "]"
  }
  else {
    arrow_comment = arrow_comment[:-1]
    arrow_comment = arrow_comment + "," + color + str(fromSq) + str(toSq) + "]"
  }
}

// ---- %csl squares (new) ----
function squareMark(color sq){
  if (square_comment == "") then {
    square_comment = "[%csl " + color + str(sq) + "]"
  }
  else {
    square_comment = square_comment[:-1]
    square_comment = square_comment + "," + color + str(sq) + "]"
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

// Discard rays where both endpoints are on rank 1 or both endpoints are on rank 8.
function discardRay($a $b) {
  if (rank $a == 1) then {
    if (rank $b == 1) then [a1] else []
  }
  else if (rank $a == 8) then {
    if (rank $b == 8) then [a1] else []
  }
  else
    []
}

find all quiet {
  arrow_comment = ""
  square_comment = ""

  // ---------------- existing alignment arrows ----------------
  square s in [KQBNR]
    square t in [KQBNR]
      if (t != s) then {
        if (ray(s t)) then {
          if (discardRay(s t)) then
            []
          else
            colorEnclosingRay(s t)
        }
      }

  square u in [kqbnr]
    square v in [kqbnr]
      if (v != u) then {
        if (ray(u v)) then {
          if (discardRay(u v)) then
            []
          else
            colorEnclosingRay(u v)
        }
      }

  // ---------------- NEW: CHECKABLE king (blue) ----------------
  // "king attacked in current position"
  if (a -> K) then squareMark("B" K)
  if (A -> k) then squareMark("B" k)

  // ---------------- NEW: MOBILITY RESTRICTED + LOOSE (red) ----
  // Mobility proxy: number of attacked squares <= 2
  // (Uses a-h1-8 as "all squares"; with <- it returns the attacked squares.)
  square $p in [KQBNR] {
    if (#(a-h1-8 <- $p) <= 2) then
      squareMark("R" $p)

    $atk = #(a -> $p)
    $def = #(A -> $p)
    if ($def <= $atk) then
      squareMark("B" $p)
  }

  square $q in [kqbnr] {
    if (#(a-h1-8 <- $q) <= 2) then
      squareMark("R" $q)

    $atk2 = #(A -> $q)
    $def2 = #(a -> $q)
    if ($def2 <= $atk2) then
      squareMark("B" $q)
  }

  // Emit both tags (if present)
  $c = ""
  if (arrow_comment != "") then $c = arrow_comment
  if (square_comment != "") then {
    if ($c == "") then $c = square_comment
    else $c = $c + " " + square_comment
  }

  comment($c)
}
