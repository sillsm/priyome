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

// Predicates return sets:
// []       -> false
// nonempty -> true

function horizRank1or8($a $b) {
  if (rank $a == rank $b) then {
    if (rank $a == 1) then [a1]
    else if (rank $a == 8) then [a1]
    else []
  } else []
}

function functrue($a $b) {
  [a1]
}

function funcfalse($a $b) {
  []
}
  
function hasBetween($a $b) {
  $mid = ray($a $b)
  $n = 0
  square m in $mid { $n = $n + 1 }
  if ($n >= 1) then
    $mid
  else
    []
}

// Still stubbed for now
function messy() { [] }
function isKQPair($a $b) { [] }
function isDiscoverySeed($a $b) { [] }

function discardRay($a $b) {
  if (horizRank1or8($a $b) != []) then {
    [a1]
  }
  if (hasBetween($a $b) == [])  then {
    [a1]
  } else
  []
}

find all quiet {
  arrow_comment = ""

  square s in [KQBNR]
    square t in [KQBNR]
      if (t != s) then {
        if (ray(s t)) then {
          if (functrue(s t)) then
            colorEnclosingRay(s t)
        }
      }

  square u in [kqbnr]
    square v in [kqbnr]
      if (v != u) then {
        if (ray(u v)) then {
          if (funcfalse(u v)) then
            colorEnclosingRay(u v)
        }
      }

  if (arrow_comment == "") then
    comment("hi")
  else
    comment(arrow_comment)
}
