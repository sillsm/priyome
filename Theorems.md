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

### Cues
Enemy king and piece are aligned. You have two pieces, one that can join alignment, other that can capture piece. The first mandatory defender seems to have higher material value than your two pieces.

### Statement
Let \(P\) be a position with side \(s\) to move. Suppose the opponent has a king \(k\), a target piece \(p\), and a defender \(d\), and side \(s\) has pieces \(a_1\) and \(a_2\), such that:

1. in the initial position, \(k\) and \(p\) are collinear;
2. the king \(k\) does not defend \(p\);
3. \(a_1 \times p\) is legal;
4. after \(a_1 \times p\), the recapture \(d \times a_1\) is materially mandatory (i.e., if the opponent does not play \(d \times a_1\), side \(s\) wins material immediately);
5. after \(d \times a_1\), there exists a move \(a_2 \to q\) such that:
   - \(a_2\), \(d\), and \(k\) are collinear with \(d\) between \(a_2\) and \(k\) (so \(d\) is pinned),
   - the square \(q\) is defended by side \(s\).

Assume furthermore that after \(a_2 \to q\), all of the following hold:

6. (**No checking resource**)  
   The opponent has no move that gives check and avoids immediate material loss.

7. (**No safe capture of the pinning piece**)  
   Every capture of \(a_2\) by the opponent is met by a recapture that is at least as favorable for side \(s\).

8. (**No effective block or unpin**)  
   There is no legal move that:
   - interposes a piece between \(a_2\) and \(k\) while maintaining material balance, or  
   - moves the king or the pinned piece in a way that both resolves the pin and preserves material.

9. (**Pinned piece cannot be maintained**)  
   The pinned piece \(d\) cannot be adequately defended or traded without material loss.

Then the sequence
\[
a_1 \times p,\quad d \times a_1,\quad a_2 \to q
\]
wins material for side \(s\).

**Proof.**  
Play \(a_1 \times p\). By hypothesis, the opponent must answer with \(d \times a_1\), or else concede material immediately. Then side \(s\) plays \(a_2 \to q\), where \(q\) is chosen so that \(a_2\), \(d\), and the king \(k\) become collinear, with \(d\) between \(a_2\) and \(k\). Thus \(d\) is pinned to the king. Since the square \(q\) is defended, the opponent cannot simply remove \(a_2\) by a favorable capture. By the remaining hypothesis, the opponent also has no forcing check, no effective block of the pin, and no other tactical resource that saves the position. Therefore the recapturing defender \(d\) is immobilized or tactically overburdened, and the exchange sequence resolves in favor of side \(s\). Hence side \(s\) wins material. ∎

[Event "Woodpecker Method easy (51-100): Easy Exercises - Exercise 78"]
[FEN "3r4/p2q1pkp/1pn1bnp1/2p1p3/P1N1P3/1PP1Q1PP/5PK1/4RBN1 b - - 0 1"]
