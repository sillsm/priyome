# Proof: Mate in 2 https://lichess.org/training/N2RQp

## setup
side: white
fen: 8/1p3pR1/p4P1k/P1p1r3/1q6/3P1b2/2P2KQ1/8 w - - 3 42

## claim


## objective
eval_at_least: 

## worksheet boxes

### box 1: new path
opponents_threat: bxQ

observations:
- check: check(Qh3, Qh2, Qh1, Rh7)
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: Not Qh1 because loses.
candidate_forced_sequences: 1. Qh3+, Bishop or rook block, Rh7+

conclusion: 
next: 

### box 2: Rh7+
opponents_threat: 

observations:
- check: 
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: 
candidate_forced_sequences: 

conclusion: Rh7+ looked forcing. KxR, Qg7#. 
This line wins.
next: 
