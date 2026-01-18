cql()

//flipcolor
{

  // ---- Weak square: d4 (dark square) ----
  line --> {
    wtm { movenumber < 40 }

    // Equal-ish material (within 1 point either way)
    { power A <= power a + 1 }
    { power a <= power A + 1 }

    // "Weak" = opponent pawns do NOT attack the square
  not ( pc7 )
  not ( pc6 )
  not ( pc5 )

  // e-pawn is either off-board or advanced to e4/e3/e2/e1
  not ( pe7 )
  not ( pe6 )
  not ( pe5 )

  // White has at least one pawn controlling the square.
  (Pc3 or Pe3)
  }
  -->
  move
  -->
  {
    // after the 1-move operation:
    not b dark
    N          // mover has at least one knight
    not n      // opponent has no knights

    // d4 is dark -> opponent has no dark-squared bishop
    //not b dark

  }

}
