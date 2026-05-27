# Proof: Lichess #DLnfn

## setup
side: white
fen: 3r2k1/ppp2ppp/3P4/8/2r5/8/5PPP/3RR1K1 w - - 1 24

## claim


## objective
eval_at_least: +2 or mate

## worksheet boxes

### box 1: 
opponents_threat: Pxp?

observations:
- check: check(Re8)
- align: (rook, pawn, rook)
- attacks: 

enemy_reply_classes:
- capture_back

line: RxR. Loses
conclusion: 
next: 

### box 2: next after previous box
opponents_threat: We could pxc7.

observations:
- check: 
- align: 
- attacks: 

enemy_reply_classes:
- capture_back
- decline_capture

line: Captures back.

rxr? r# win
rxp? rxr# win
r blockades pawn
R+, rxr, pxr=Q#
conclusion: Wins.
next: After analysis, I see we missed rxp, rxr wasn't r# because that would leave our king in check.
