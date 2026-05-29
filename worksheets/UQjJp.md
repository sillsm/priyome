# Proof: https://lichess.org/training/UQjJp

## setup
side: white

## claim
Forced liquidation which looks losing because queen forks king and rook, actually winning.

## objective
eval_at_least: +2

## worksheet boxes

### box 1: liquidation to the end
opponents_threat: 3 attackers on c3, we have 2 defenders.

observations:
- loose: knight@e4
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: Qxe4, Ne5, Nd4

candidate_forced_sequences: QxN, BxN, PxB, QxN+

conclusion: 
next: 

### box 2: Forced liquidation
opponents_threat: Qxc3+

observations:
- check: 
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: Ke2 > wins.
candidate_forced_sequences: 

conclusion: Win because two predicates change. King steps out of check and adds a defender to the rook so it doesn't hang with single move Ke2.
next: 
