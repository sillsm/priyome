## Check exposes a favorable exchange

**Theorem (Forcing clearance by check).**  
Let \(P\) be a position with side \(s\) to move and let \(t\) be an opponent target. Suppose there exists a legal move \(m\) such that:

1. \(m\) gives check,  
2. \(m\) clears an obstructed attacking line to \(t\),  
3. for every legal reply \(r\) to that check, the resulting position still leaves \(s\) with favorable exchange surplus on \(t\).

Then \(s\) can force a material win from \(P\).

**Proof.**  
Since \(m\) gives check, the opponent’s continuation is restricted to legal check-evasions. By hypothesis, every such reply leaves \(s\) with favorable surplus on \(t\). By the exchange lemma, favorable surplus on \(t\) yields a winning exchange; by the material-conversion lemma, that winning exchange yields net material gain. Hence every legal reply to \(m\) leads to a material-winning continuation for \(s\). Therefore \(m\) is a forcing move that wins material from \(P\). ∎

That is the compact version of the long proof.

**Example**
Woodpecker 44

## Theorem (Forced recapture into a defended pin).
Let \(P\) be a position with side \(s\) to move. Suppose the opponent has a king \(k\), a target piece \(p\), and a defender \(d\), and side \(s\) has two pieces \(a_1\) and \(a_2\), such that:

1. in the initial position, \(k\) and \(p\) are collinear on a rank, file, or diagonal;
2. the king \(k\) does not defend \(p\);
3. \(a_1 \times p\) is a legal move;
4. after \(a_1 \times p\), the reply \(d \times a_1\) is forced or materially mandatory, in the sense that if the opponent does not recapture with \(d\), side \(s\) wins material anyway;
5. after \(d \times a_1\), side \(s\) has a legal move with \(a_2\) to a square \(q\) such that:
   - \(a_2\) on \(q\), \(d\), and \(k\) are collinear,
   - \(d\) lies between \(a_2\) and \(k\), so \(d\) is pinned to the king,
   - the square \(q\) is defended by side \(s\), so \(a_2\) cannot be favorably eliminated at once;
6. after this move by \(a_2\), the opponent has no tactical resource that refutes the sequence, such as:
   - a forcing check,
   - an effective blocking move that breaks the pin,
   - a capture of \(a_2\) without adequate immediate recapture by side \(s\),
   - or any stronger continuation that saves the exchange.

Then the sequence
\[
a_1 \times p,\quad d \times a_1,\quad a_2 \to q
\]
wins material for side \(s\).

**Proof.**  
Play \(a_1 \times p\). By hypothesis, the opponent must answer with \(d \times a_1\), or else concede material immediately. Then side \(s\) plays \(a_2 \to q\), where \(q\) is chosen so that \(a_2\), \(d\), and the king \(k\) become collinear, with \(d\) between \(a_2\) and \(k\). Thus \(d\) is pinned to the king. Since the square \(q\) is defended, the opponent cannot simply remove \(a_2\) by a favorable capture. By the remaining hypothesis, the opponent also has no forcing check, no effective block of the pin, and no other tactical resource that saves the position. Therefore the recapturing defender \(d\) is immobilized or tactically overburdened, and the exchange sequence resolves in favor of side \(s\). Hence side \(s\) wins material. ∎

[Event "Woodpecker Method easy (51-100): Easy Exercises - Exercise 78"]
[FEN "3r4/p2q1pkp/1pn1bnp1/2p1p3/P1N1P3/1PP1Q1PP/5PK1/4RBN1 b - - 0 1"]
