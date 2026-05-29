# Proof: https://lichess.org/training/RBM6A

## setup
side: white

## claim


## objective
eval_at_least: 

## worksheet boxes

### box 1: new path
opponents_threat: rxr#

observations:
- check: check(rxg6), check(qf8)
- align: align(bpk)
- attacks: 

enemy_reply_classes:

candidate_moves: rxr, rxn
candidate_forced_sequences: 

conclusion: 
next: 

### box 2: rxr
opponents_threat: solved

observations:
- check: 
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: rxn
candidate_forced_sequences: 

conclusion: 
next: 

### box 3: rxn
opponents_threat: 

observations:
- align: align(K,R,g5)
- loose: 
- attacks: 

enemy_reply_classes:

candidate_moves: rxn,pxr, q+
candidate_forced_sequences: 

conclusion: wins
next: 
