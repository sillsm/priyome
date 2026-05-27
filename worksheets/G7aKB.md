# Proof: https://lichess.org/training/G7aKB

## setup
side: white
fen: rn2kb1r/1b3ppp/3ppq2/1p5Q/PNB1n3/4B3/1PP2PPP/R3K2R w KQkq - 0 13

## claim


## objective
eval_at_least: 

## worksheet boxes

### box 1: new path
opponents_threat: pxB, Qf1+>

observations:
- check: Qf7+, Bxb5+, Qxb5+
- align: align(k,p,q)
- attacks: 

enemy_reply_classes:

candidate_moves: qf7+, bxe6, O-O,
candidate_forced_sequences: 

conclusion: 
next: 

### box 2: qxf7+
opponents_threat: 

observations:
- check: 
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: 
candidate_forced_sequences: 1. Qxf7+, (bc3, knight c3 or knight e7)

conclusion: 
next: Mating sequence?

### box 3: bc6
opponents_threat: 

observations:
- check: 
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: 
candidate_forced_sequences: 

conclusion: any knight replies lose the bishop

(after much thinking! but only if q takes. or exceed thinking quota).
next: 

### box 4: qxb5, Bc6, nxc6
opponents_threat: 

observations:
- check: 
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: 
candidate_forced_sequences: 

conclusion: I stopped calculating here and didn't see as far as Rb7.

When presented with Rb7, I made correct choice Qxe4.
next: 
