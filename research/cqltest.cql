cql()

initial {
  piece white_knight_1 = Nb1
  piece white_knight_2 = Ng1
  piece white_bishop_1 = Bc1
  piece white_bishop_2 = Bf1
}

find all quiet {
  movenumber >= 6
  wtm

  // ============================
  // White Knight 1
  // ============================

  white_knight_1_mobility = (move legal from white_knight_1 count)
  white_knight_1_square = white_knight_1
  white_knight_1_defenders = #(A attacks white_knight_1_square)
  white_knight_1_attackers = #(a attacks white_knight_1_square)

  white_knight_1_color_code = "Y"
  white_knight_1_color_name = "YELLOW"
  white_knight_1_reason = "default"

  if (white_knight_1_mobility >= 5 and white_knight_1_attackers <= white_knight_1_defenders) then {
    white_knight_1_color_code = "G"
    white_knight_1_color_name = "GREEN"
    white_knight_1_reason = "mobile and safe"
  }
  else if (white_knight_1_mobility <= 2 or white_knight_1_attackers >= white_knight_1_defenders + 2) then {
    white_knight_1_color_code = "R"
    white_knight_1_color_name = "RED"
    white_knight_1_reason = "low mobility or over-attacked"
  }
  else {
    white_knight_1_color_code = "Y"
    white_knight_1_color_name = "YELLOW"
    white_knight_1_reason = "mixed"
  }

  // ============================
  // White Knight 2
  // ============================

  white_knight_2_mobility = (move legal from white_knight_2 count)
  white_knight_2_square = white_knight_2
  white_knight_2_defenders = #(A attacks white_knight_2_square)
  white_knight_2_attackers = #(a attacks white_knight_2_square)

  white_knight_2_color_code = "Y"
  white_knight_2_color_name = "YELLOW"
  white_knight_2_reason = "default"

  if (white_knight_2_mobility >= 5 and white_knight_2_attackers <= white_knight_2_defenders) then {
    white_knight_2_color_code = "G"
    white_knight_2_color_name = "GREEN"
    white_knight_2_reason = "mobile and safe"
  }
  else if (white_knight_2_mobility <= 2 or white_knight_2_attackers >= white_knight_2_defenders + 2) then {
    white_knight_2_color_code = "R"
    white_knight_2_color_name = "RED"
    white_knight_2_reason = "low mobility or over-attacked"
  }
  else {
    white_knight_2_color_code = "Y"
    white_knight_2_color_name = "YELLOW"
    white_knight_2_reason = "mixed"
  }

  // ============================
  // White Bishop 1
  // ============================

  white_bishop_1_mobility = (move legal from white_bishop_1 count)
  white_bishop_1_square = white_bishop_1
  white_bishop_1_defenders = #(A attacks white_bishop_1_square)
  white_bishop_1_attackers = #(a attacks white_bishop_1_square)

  white_bishop_1_same_color_pawns = 0

  if (dark white_bishop_1_square) then {
    white_bishop_1_same_color_pawns = #(dark P)
  }
  else {
    white_bishop_1_same_color_pawns = #(light P)
  }

  white_bishop_1_color_code = "Y"
  white_bishop_1_color_name = "YELLOW"
  white_bishop_1_reason = "default"

  if (white_bishop_1_mobility >= 7 and white_bishop_1_attackers <= white_bishop_1_defenders and white_bishop_1_same_color_pawns <= 4) then {
    white_bishop_1_color_code = "G"
    white_bishop_1_color_name = "GREEN"
    white_bishop_1_reason = "active bishop on good color"
  }
  else if (white_bishop_1_mobility <= 3 or white_bishop_1_attackers >= white_bishop_1_defenders + 2 or white_bishop_1_same_color_pawns >= 6) then {
    white_bishop_1_color_code = "R"
    white_bishop_1_color_name = "RED"
    white_bishop_1_reason = "bad bishop proxy or over-attacked"
  }
  else {
    white_bishop_1_color_code = "Y"
    white_bishop_1_color_name = "YELLOW"
    white_bishop_1_reason = "mixed"
  }

  // ============================
  // White Bishop 2
  // ============================

  white_bishop_2_mobility = (move legal from white_bishop_2 count)
  white_bishop_2_square = white_bishop_2
  white_bishop_2_defenders = #(A attacks white_bishop_2_square)
  white_bishop_2_attackers = #(a attacks white_bishop_2_square)

  white_bishop_2_same_color_pawns = 0

  if (dark white_bishop_2_square) then {
    white_bishop_2_same_color_pawns = #(dark P)
  }
  else {
    white_bishop_2_same_color_pawns = #(light P)
  }

  white_bishop_2_color_code = "Y"
  white_bishop_2_color_name = "YELLOW"
  white_bishop_2_reason = "default"

  if (white_bishop_2_mobility >= 7 and white_bishop_2_attackers <= white_bishop_2_defenders and white_bishop_2_same_color_pawns <= 4) then {
    white_bishop_2_color_code = "G"
    white_bishop_2_color_name = "GREEN"
    white_bishop_2_reason = "active bishop on good color"
  }
  else if (white_bishop_2_mobility <= 3 or white_bishop_2_attackers >= white_bishop_2_defenders + 2 or white_bishop_2_same_color_pawns >= 6) then {
    white_bishop_2_color_code = "R"
    white_bishop_2_color_name = "RED"
    white_bishop_2_reason = "bad bishop proxy or over-attacked"
  }
  else {
    white_bishop_2_color_code = "Y"
    white_bishop_2_color_name = "YELLOW"
    white_bishop_2_reason = "mixed"
  }

  // ============================
  // Emit ONE combined coloring tag
  // ============================

  comment (
    "[%csl "
    white_knight_1_color_code white_knight_1_square ","
    white_knight_2_color_code white_knight_2_square ","
    white_bishop_1_color_code white_bishop_1_square ","
    white_bishop_2_color_code white_bishop_2_square
    "]"
  )

  // ============================
  // Emit ONE combined rationale block
  // ============================

  comment (
    "White Knight 1 @" white_knight_1_square " "
    white_knight_1_color_name ": mobility=" white_knight_1_mobility
    ", attackers=" white_knight_1_attackers
    ", defenders=" white_knight_1_defenders
    " (" white_knight_1_reason ")\n"

    "White Knight 2 @" white_knight_2_square " "
    white_knight_2_color_name ": mobility=" white_knight_2_mobility
    ", attackers=" white_knight_2_attackers
    ", defenders=" white_knight_2_defenders
    " (" white_knight_2_reason ")\n"

    "White Bishop 1 @" white_bishop_1_square " "
    white_bishop_1_color_name ": mobility=" white_bishop_1_mobility
    ", attackers=" white_bishop_1_attackers
    ", defenders=" white_bishop_1_defenders
    ", sameColorPawns=" white_bishop_1_same_color_pawns
    " (" white_bishop_1_reason ")\n"

    "White Bishop 2 @" white_bishop_2_square " "
    white_bishop_2_color_name ": mobility=" white_bishop_2_mobility
    ", attackers=" white_bishop_2_attackers
    ", defenders=" white_bishop_2_defenders
    ", sameColorPawns=" white_bishop_2_same_color_pawns
    " (" white_bishop_2_reason ")"
  )
}
