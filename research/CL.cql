cql(quiet)
// CL of CLAMP checker

  
function findLoosePieces() {
  found=0
  cstrin = "[%csl B"
  square s in [QRBN] 
  if ( #(A attacks s) <= #(a attacks s) ) then 
  { found = found + 1
    if (found > 1) then {
    cstrin = cstrin + ",B"
    }
    cstrin = cstrin + str(s)
   }
   cstrin = cstrin + "]"
  comment(cstrin)
}

flipcolor {
  find all quiet {
     findLoosePieces()

    if (wtm) then { ek = k } else { ek = K }

    knight_check_dests = flip up 2 right 1 ek

    found = 0
    cal = "[%cal G"

    square from_sq in move from . legal
      square to_sq in move to . from from_sq legal

        if (
          // sliders (your existing logic)
          ( (from_sq in B) and ray diagonal (to_sq ek) and (#between (to_sq ek) == 0) ) or
          ( (from_sq in R) and ray orthogonal (to_sq ek) and (#between (to_sq ek) == 0) ) or
          ( (from_sq in Q) and ray (to_sq ek) and (#between (to_sq ek) == 0) ) or

          // NEW: knight checks (geometric)
          ( (from_sq in N) and (to_sq in knight_check_dests) )
        ) then {

          found = found + 1
          if (found > 1) then { cal = cal + ",G" }
          cal = cal + str(from_sq) + str(to_sq)
        }

    cal = cal + "]"
    comment(cal)
  }
}
