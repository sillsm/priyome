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

find all quiet {
  arrow_comment = ""

  // WHITE: any two of [KQBNR] that are ray-aligned
  square s in [KQBNR]
    square t in [KQBNR]
      if (t != s) then {
        if (ray(s t)) then {
$edges = enclosingedges(s t)

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
      }

  // BLACK: any two of [kqbnr] that are ray-aligned
  square u in [kqbnr]
    square v in [kqbnr]
      if (v != u) then {
        if (ray(u v)) then {
          arrowFromToColor("Y" u v)
        }
      }

  comment(arrow_comment)
}
