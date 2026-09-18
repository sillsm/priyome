/**
 * Compact human-fact Oracle. No learned clauses, puzzle labels, engine scores,
 * stopping classifier, or searched tactical outcomes. ScratchChess supplies
 * legal moves. The only result positions constructed are legal children of a
 * node strictly before the seven-ply boundary.
 *
 * Board facts are relative to the original solver. Move facts are relative to
 * the move's player. Attacks/defenses are geometric, not exchange evaluations.
 */
export const SCRATCHCHESS_ORACLE_VERSION = "4.1.0-basic26-restored";
export const SCRATCHCHESS_ORACLE_HORIZON = 1;
export const SCRATCHCHESS_ORACLE_TERMINAL_PROBE = "current-board-mate-stalemate";
const VALUES = Object.freeze({p:1,n:3,b:3,r:5,q:9,k:0});
const FILES = "abcdefgh";
const other = side => side === "w" ? "b" : "w";
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const xy = square => [square % 8, 7-Math.floor(square/8)];
const idx = (file,rank) => (7-rank)*8+file;
const inside = (file,rank) => file>=0 && file<8 && rank>=0 && rank<8;
const squareName = square => FILES[square%8]+(8-Math.floor(square/8));
const distance = (a,b) => Math.max(Math.abs(a%8-b%8),Math.abs(Math.floor(a/8)-Math.floor(b/8)));
const rayDirections = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const sliderUses = (piece,df,dr) => piece && (piece.type === "q" || (df&&dr ? piece.type === "b" : piece.type === "r"));

const boardDefinitions = {
  kings_in_direct_opposition: "The kings stand on the same rank or file, two king steps apart, with the intervening square empty. One conventional opposition relation; its alignment, distance and occupancy checks are disclosed in the witness.",
  our_rook_pawn_present: "At least one pawn of the original solver stands on file a or h (one typed presence relation).",
  our_king_controls_own_pawn_promotion_square: "Our king geometrically controls the promotion square of at least one of our pawns (one typed control relation).",
  outside_pawn_decoy: "Our passed pawn is at least three files from the enemy pawn (passed pawn plus file separation: two facts).",
  pawn_promotion_corridor_clear: "No own pawn occupies the three-file corridor in front of our blocking pawn, through the promotion rank.",
  mate: "The opponent is to move, is in check, and has no legal move (checkmate).",
  mated: "The solver is to move, is in check, and has no legal move (checkmate).",
  stalemate: "The side to move has no legal move and is not in check (stalemate).",
  in_check: "The side to move is in check.",
  material_deficit_one_pawn: "Our non-king material value is exactly one point below the opposing total, using the standard piece values.",
  material_up: "The solver's current material balance is greater than zero.",
  material_improved: "The solver's current material balance exceeds its initial balance.",
  material_target: "The solver has gained at least two material points relative to the initial board.",
  low_material: "The combined non-king material of both sides totals at most twenty-one points.",
  our_nonpawn_attacked: "An opposing piece geometrically attacks one of our knights, bishops, rooks, or queens.",
  enemy_passer: "The opponent has a passed pawn.",
  enemy_capture_available: "The opponent, currently to move, has a legal capture.",
  enemy_promotion_available: "The opponent, currently to move, has a legal promotion.",
  check_available: "The side to move has a legal checking move.",
  pawn_endgame: "Only kings and pawns remain.",
  enemy_pawn_on_seventh: "The opponent has a pawn one rank from promotion."
};
const moveDefinitions = {
  attacks_pawn: "The moved piece geometrically attacks an enemy pawn; the attacked pawn squares are explicit witnesses (one typed attack relation).",
  defends_pawn: "The moved piece geometrically defends a friendly pawn; the defended pawn squares are explicit witnesses (one typed defense relation).",
  promotion_ready: "The pawn just moved has a legal promotion on the otherwise unchanged board (one legal-move availability relation; the opponent has not moved yet).",
  attacks_promotion_blocker: "The moved piece attacks an enemy nonking piece blocking a friendly pawn on its promotion square (attack plus promotion blockade: two facts).",
  pawn_outruns_king: "A pawn move lands outside the opposing king's rule-of-square reach after allowing the opponent to move next; pawn identity plus promotion-square geometry, without asserting passedness or an unblocked path (two facts).",
  defend_queen: "The moved piece geometrically defends a friendly queen.",
  check: "The move gives check.",
  capture: "The move captures an enemy piece, including en passant.",
  capture_piece: "The move captures a knight, bishop, rook or queen.",
  recapture: "The move captures the piece that captured on the preceding ply.",
  promotion: "The move promotes a pawn.",
  skewer: "The moved slider attacks a more valuable enemy piece in front of a less valuable enemy piece on the same ray (king valued highest).",
  open_line: "The move uncovers a new attack from another friendly slider onto an enemy piece.",
  capture_defender: "The move captures a piece that defended another enemy non-king piece.",
  pins_higher_piece: "The moved piece creates an absolute pin to the enemy king of a piece worth more than itself (new pin and same-target value comparison: two facts).",
  capture_undefended: "The move captures a piece that had no geometric defender.",
  attacks_last_mover: "The moved piece geometrically attacks the surviving piece moved on the preceding ply, at that preceding move's destination (one attack relation with the target bound by public move history).",
  capture_attacker: "The move captures an enemy piece that geometrically attacked a friendly piece on the before-board (capture plus the same captured piece's prior attack: two facts).",
  defend_piece: "The moved piece defends a friendly knight, bishop, rook, or queen.",
  move_toward_own_king: "The moving non-king piece reduces its Chebyshev distance to its own king.",
  move_attacked: "The moving piece was attacked before the move.",
  attack_higher: "A moved non-king piece attacks an enemy non-king piece of greater material value.",
  attacks_rook: "The moved piece attacks an enemy rook.",
  attacks_queen: "The moved piece attacks an enemy queen.",
  advances_passer: "The moving pawn was a passed pawn before the move.",
  king_toward_pawn: "The king move reduces its Chebyshev distance to at least one pawn still on the board.",
  guard_promotion_square: "The moved piece attacks the promotion square of an enemy pawn.",
  blocks_enemy_pawn: "The moved piece occupies the square immediately ahead of an enemy pawn (one blockade relation; does not assert the pawn is advanced or passed).",
  capture_pinned_piece: "The move captures a nonpawn piece shielding its king, or a less valuable piece shielding its queen, from an opposing line piece (capture and pin: two facts).",
  capture_checker: "The move captures a piece that was checking the moving side's king.",
  defend_loose: "The moved piece defends a friendly non-king piece that was undefended before the move.",
  piece_unattacked: "The moved piece is not geometrically attacked after the move.",
  piece_defended: "The moved piece has a geometric defender after the move.",
  capture_higher: "The captured piece's value exceeds the moving piece's pre-move value.",
  capture_at_least_equal: "The captured piece's value is at least the moving piece's pre-move value; legal king captures use moving value zero.",
  king_centralizes: "A king move reduces its Chebyshev distance to the nearest of d4, e4, d5 and e5.",
  king_move: "The moving piece was a king.",
  pawn_move: "The moving piece was a pawn (the same pawn identity fact used in pawn_outruns_king)."
};
// A typed target (queen, higher-value piece) is part of one relation; it is not
// a second independent purpose. Pairs below join two chess relations, e.g.
// defense + prior attack, capture + prior defense, or attacks on two targets.
const doubleFacts = new Set(["capture_pinned_piece","pawn_outruns_king","capture_defender","capture_undefended","capture_attacker","advances_passer","capture_checker","defend_loose","outside_pawn_decoy","pins_higher_piece","attacks_promotion_blocker"]);
const canonicalRelations = new Set(["kings_in_direct_opposition","mate","mated","stalemate","skewer","creates_pin","enemy_passer","open_line","recapture"]);
export const PREDICATE_GLOSSARY = Object.freeze(Object.fromEntries([
  ...Object.entries(boardDefinitions).map(([id,description]) => [id,{id,kind:"board",perspective:"original solver",description,semanticFacts:doubleFacts.has(id)?2:1,standardRelation:canonicalRelations.has(id)}]),
  ...Object.entries(moveDefinitions).map(([id,description]) => [id,{id,kind:"move",perspective:"candidate mover",description,semanticFacts:doubleFacts.has(id)?2:1,standardRelation:canonicalRelations.has(id)}])
]));
export const PREDICATE_IDS = Object.freeze(Object.keys(PREDICATE_GLOSSARY));
// Runtime failures are explicit and must never count as a chess observation.
export const OPERATIONAL_PREDICATE_IDS = Object.freeze(["oracle_limit","unexplorable","max_ply_reached","repeated_position"]);

/** Current-board legal queen destinations; virtual occupancy only, no successor Game/FEN or committed move. */



function boardAt(board,square) { return typeof board === "function" ? board(square) : board[square]; }
export function attacksSquare(board,from,to) {
  const piece=boardAt(board,from);
  if(!piece || from===to || to<0 || to>=64) return false;
  const [ff,fr]=xy(from),[tf,tr]=xy(to),df=tf-ff,dr=tr-fr,af=Math.abs(df),ar=Math.abs(dr);
  if(piece.type==="p") return af===1 && dr===(piece.color==="w"?1:-1);
  if(piece.type==="n") return af*ar===2;
  if(piece.type==="k") return Math.max(af,ar)===1;
  if(!((af===ar && af>0 && ["b","q"].includes(piece.type)) || ((df===0||dr===0) && ["r","q"].includes(piece.type)))) return false;
  const sf=Math.sign(df),sr=Math.sign(dr);
  for(let f=ff+sf,r=fr+sr;f!==tf||r!==tr;f+=sf,r+=sr) if(boardAt(board,idx(f,r))) return false;
  return true;
}
function squares(board,side,type=null) {
  const out=[];
  for(let square=0;square<64;square++) { const p=boardAt(board,square); if(p?.color===side && (!type||p.type===type))out.push(square); }
  return out;
}
function attackers(board,target,side) { return squares(board,side).filter(from=>attacksSquare(board,from,target)); }
function kingSquare(board,side) { return squares(board,side,"k")[0] ?? -1; }
function material(board,side) { return squares(board,side).reduce((sum,square)=>sum+VALUES[boardAt(board,square).type],0); }
function balance(board,side) { return material(board,side)-material(board,other(side)); }
function passed(board,pawn) {
  const piece=boardAt(board,pawn);
  if(piece?.type!=="p") return false;
  const [f,r]=xy(pawn),forward=piece.color==="w"?1:-1;
  return !squares(board,other(piece.color),"p").some(enemy=>{const[ef,er]=xy(enemy);return Math.abs(ef-f)<=1 && (er-r)*forward>0;});
}
function pins(board,side) {
  const king=kingSquare(board,side),out=[];
  if(king<0)return out;
  const[kf,kr]=xy(king);
  for(const[df,dr]of rayDirections){
    let blocker=-1;
    for(let f=kf+df,r=kr+dr;inside(f,r);f+=df,r+=dr){
      const square=idx(f,r),piece=boardAt(board,square);
      if(!piece)continue;
      if(blocker<0){if(piece.color===side && piece.type!=="k"){blocker=square;continue;}break;}
      if(piece.color!==side && sliderUses(piece,df,dr))out.push({piece:blocker,king,attacker:square});
      break;
    }
  }
  return out;
}
// Relative queen-pin geometry: one friendly nonqueen blocker on the ray
// from the queen to an opposing matching slider. No successor move is applied.
function queenPins(board,side) {
  const out=[];
  for(const queen of squares(board,side,"q")){
    const[qf,qr]=xy(queen);
    for(const[df,dr]of rayDirections){
      let blocker=-1;
      for(let f=qf+df,r=qr+dr;inside(f,r);f+=df,r+=dr){
        const square=idx(f,r),piece=boardAt(board,square);
        if(!piece)continue;
        if(blocker<0){if(piece.color===side && VALUES[piece.type]<VALUES.q){blocker=square;continue;}break;}
        if(piece.color!==side && sliderUses(piece,df,dr))out.push({piece:blocker,queen,attacker:square});
        break;
      }
    }
  }
  return out;
}


function captureSquare(board,move) {
  const mover=boardAt(board,move.from);
  return mover?.type==="p" && move.from%8!==move.to%8 && !boardAt(board,move.to)
    ? move.to+(mover.color==="w"?8:-8):move.to;
}
const legalCache=new WeakMap();
export function legalMoveRecords(game) {
  const fen=game.exportFEN(),cached=legalCache.get(game);
  if(cached?.fen===fen)return cached.moves;
  if(typeof game._allLegalMoves!=="function")throw new Error("ScratchChess legal move API is required");
  const raw=game._allLegalMoves(game.state.side),board=game.state.board,moves=[];
  for(const {from,to} of raw){
    const mover=board[from],lastRank=mover.color==="w"?0:7;
    for(const promotion of mover.type==="p"&&Math.floor(to/8)===lastRank?["q","r","b","n"]:[""]){
      const capturedSquare=captureSquare(board,{from,to});
      moves.push({from,to,promotion,uci:squareName(from)+squareName(to)+promotion,mover:clone(mover),captured:clone(board[capturedSquare]),capturedSquare});
    }
  }
  const unique=[...new Map(moves.map(move=>[move.uci,move])).values()];
  legalCache.set(game,{fen,moves:unique});
  return unique;
}
/** Static legality of a king capture. No successor board, FEN, or Game is made. */

/** Fixed geometric capture observation. The board may be an occupancy query
 * after a candidate check. Capturing the actual checker must leave our king
 * unattacked; this handles pins, discoveries and multiple simultaneous checks.
 * No Game, successor FEN, applied move, or recursive continuation is created.
 * Equal material value does not claim that the resulting game is won. */

/** Legal/current-board descriptors use occupancy queries, never a child Game,
 * a child FEN, makeMoveUCI, or a continuation. This also runs at depth seven. */
export function observeLegalMoveDescriptors(game) {
  const legal=legalMoveRecords(game),board=game.state.board,side=game.state.side,king=kingSquare(board,other(side));
  const observations=legal.map(move=>{
    const mover=board[move.from],castling=mover.type==="k"&&Math.abs(move.to-move.from)===2;
    const direction=Math.sign(move.to-move.from),rookFrom=castling?Math.floor(move.from/8)*8+(direction>0?7:0):-1,rookTo=castling?move.from+direction:-1;
    const enPassant=move.capturedSquare!==move.to;
    const at=square=>{
      if(square===move.to)return {...mover,type:move.promotion||mover.type};
      if(square===rookTo)return board[rookFrom];
      if(square===move.from||square===rookFrom||(enPassant&&square===move.capturedSquare))return null;
      return board[square];
    };
    const checkingPieces=king<0?[]:attackers(at,king,side).map(squareName);
    return {uci:move.uci,moverType:mover.type,capture:!!move.captured,captureLoss:VALUES[move.captured?.type]||0,promotion:move.promotion||null,promotionLoss:move.promotion?VALUES[move.promotion]-1:0,materialLoss:(VALUES[move.captured?.type]||0)+(move.promotion?VALUES[move.promotion]-1:0),check:checkingPieces.length>0,checkingPieces,enPassant,castling};
  });
  return {complete:true,legalCount:legal.length,observations,result_boards_applied:0,continuation_plies:0};
}
function add(card,id,witness) {
  if(!PREDICATE_GLOSSARY[id])throw new Error(`Undeclared Oracle predicate: ${id}`);
  if(!card.predicates.includes(id))card.predicates.push(id);
  card.witnesses[id]=clone(witness);
  const fact=`${id}(${JSON.stringify(witness)})`;
  if(!card.facts.includes(fact))card.facts.push(fact);
}
function witnessesAt(board,indices) { return indices.map(square=>({square:squareName(square),piece:boardAt(board,square)?.type,color:boardAt(board,square)?.color})); }
function materialFacts(card,board,rootSide,rootMaterial) {
  const current=balance(board,rootSide),swing=current-rootMaterial;
  card.meta.materialAfter=current;card.meta.materialSwing=swing;
  
  if(current===-1)add(card,"material_deficit_one_pawn",{balance:current});
  if(current>0)add(card,"material_up",{balance:current});
  
  if(swing>0)add(card,"material_improved",{initial:rootMaterial,current,gain:swing});
  if(swing>=2)add(card,"material_target",{initial:rootMaterial,current,gain:swing,threshold:2});
  if(material(board,"w")+material(board,"b")<=21)add(card,"low_material",{total:material(board,"w")+material(board,"b"),threshold:21});
}

function observeDirectOpposition(card,board) {
  const white=kingSquare(board,"w"),black=kingSquare(board,"b");
  if(white<0||black<0)return;
  const aligned=white%8===black%8||Math.floor(white/8)===Math.floor(black/8);
  if(aligned&&distance(white,black)===2&&!board[(white+black)/2])
    add(card,"kings_in_direct_opposition",{whiteKing:squareName(white),blackKing:squareName(black),axis:white%8===black%8?"file":"rank",kingDistance:2,interveningSquare:squareName((white+black)/2),interveningEmpty:true,geometryOnly:true});
}

function boardFacts(card,game,rootSide,rootMaterial) {
  const descriptors=observeLegalMoveDescriptors(game),board=game.state.board,side=game.state.side,king=kingSquare(board,side),checks=king<0?[]:attackers(board,king,other(side));
  materialFacts(card,board,rootSide,rootMaterial);
  if(checks.length)add(card,"in_check",{king:squareName(king),checkers:witnessesAt(board,checks)});
  if(!descriptors.legalCount){
    if(checks.length)add(card,side===rootSide?"mated":"mate",{side,king:squareName(king),legalMoves:0});
    else add(card,"stalemate",{side,legalMoves:0});
  }
  card.meta.legalReplyCount=descriptors.legalCount;
  card.meta.legalMoveDescriptors=descriptors;
  card.meta.observationsComplete=true;
  for(const[kind,key]of[["check","check_available"],["capture","capture_available"],["promotion","promotion_available"]]){
    const moves=descriptors.observations.filter(move=>move[kind]).map(move=>move.uci);
    if(moves.length){if(kind==="check")add(card,key,{side,moves});if(side!==rootSide&&kind!=="check")add(card,`enemy_${key}`,{side,moves});}
  }
  if(board.every(p=>!p||["p","k"].includes(p.type)))add(card,"pawn_endgame",{pieces:board.filter(Boolean).map(p=>p.type)});
  const attackedOwnPieces=squares(board,rootSide).filter(s=>["n","b","r","q"].includes(board[s].type)&&attackers(board,s,other(rootSide)).length);
  if(attackedOwnPieces.length)add(card,"our_nonpawn_attacked",{pieces:witnessesAt(board,attackedOwnPieces)});
  const ownPawnSquares=squares(board,rootSide,"p"),ownKingSquare=kingSquare(board,rootSide),enemyPawnSquares=squares(board,other(rootSide),"p");
  observeDirectOpposition(card,board);
  const rookPawns=ownPawnSquares.filter(p=>p%8===0||p%8===7);
  if(rookPawns.length)add(card,"our_rook_pawn_present",{pawns:rookPawns.map(squareName),files:["a","h"]});
  const kingControlledPromotions=ownPawnSquares.filter(p=>attacksSquare(board,ownKingSquare,idx(p%8,rootSide==="w"?7:0)));
  if(kingControlledPromotions.length)add(card,"our_king_controls_own_pawn_promotion_square",{king:squareName(ownKingSquare),pawns:kingControlledPromotions.map(p=>({pawn:squareName(p),promotion:squareName(idx(p%8,rootSide==="w"?7:0))}))});
  const decoys=ownPawnSquares.filter(p=>passed(board,p)&&enemyPawnSquares.length&&enemyPawnSquares.every(e=>Math.abs(p%8-e%8)>=3));
  if(decoys.length)add(card,"outside_pawn_decoy",{pawns:decoys.map(squareName),enemyPawns:enemyPawnSquares.map(squareName),minimumFileDistance:3});
  const pawnPairs=enemyPawnSquares.map(p=>({enemy:p,blocker:p+(rootSide==="w"?8:-8)})).filter(pair=>board[pair.blocker]?.color===rootSide&&board[pair.blocker]?.type==="p");
  const corridors=pawnPairs.map(pair=>{const[f,r]=xy(pair.blocker),advance=rootSide==="w"?1:-1,blockers=ownPawnSquares.filter(p=>{const[pf,pr]=xy(p);return Math.abs(pf-f)<=1&&(pr-r)*advance>0;});return {blockingPawn:squareName(pair.blocker),files:[f-1,f,f+1].filter(x=>x>=0&&x<8).map(x=>FILES[x]),blockers:blockers.map(squareName)};}).filter(x=>!x.blockers.length);
  if(corridors.length)add(card,"pawn_promotion_corridor_clear",{corridors});
  const passers=enemyPawnSquares.filter(pawn=>passed(board,pawn));
  if(passers.length)add(card,"enemy_passer",witnessesAt(board,passers));
  const seventh=enemyPawnSquares.filter(p=>Math.floor(p/8)===(other(rootSide)==="w"?1:6));
  if(seventh.length)add(card,"enemy_pawn_on_seventh",witnessesAt(board,seventh));
}
function newPinKey(pin){return `${pin.piece}:${pin.king}:${pin.attacker}`;}


function moveFacts(card,parent,before,after,move) {
  const side=move.mover.color,enemy=other(side),from=move.from,to=move.to,captured=move.captured,captureAt=move.capturedSquare;
  const mover=after[to],king=kingSquare(after,enemy),beforeKing=kingSquare(before,side),checking=king<0?[]:attackers(after,king,side);
  const originalChecks=beforeKing<0?[]:attackers(before,beforeKing,enemy);
  
  
  if(checking.length)add(card,"check",{king:squareName(king),checkers:witnessesAt(after,checking)});
  const previousMoverSquare=parent.move?.toIndex;
  if(Number.isInteger(previousMoverSquare)&&after[previousMoverSquare]?.color===enemy&&attacksSquare(after,to,previousMoverSquare))add(card,"attacks_last_mover",{attacker:{from:squareName(from),to:squareName(to),piece:mover.type},previousMove:{uci:parent.move.uci,from:parent.move.from,to:parent.move.to,promotion:parent.move.promotion||null},target:{square:squareName(previousMoverSquare),piece:after[previousMoverSquare].type,color:enemy},geometryOnly:true});
  if(captured){
    add(card,"capture",{piece:captured.type,square:squareName(captureAt)});
    if(["n","b","r","q"].includes(captured.type))add(card,"capture_piece",{piece:captured.type,square:squareName(captureAt),value:VALUES[captured.type]});
    
    const difference=VALUES[captured.type]-VALUES[move.mover.type];
    
    if(difference>=0){
      if(difference>0)add(card,"capture_higher",{captured:VALUES[captured.type],mover:VALUES[move.mover.type]});
      add(card,"capture_at_least_equal",{captured:VALUES[captured.type],mover:VALUES[move.mover.type]});
    }
    if(parent.move?.captured&&parent.move.toIndex===captureAt)add(card,"recapture",{previous:parent.move.uci,capturedAt:squareName(captureAt)});
    if(!attackers(before,captureAt,enemy).length)add(card,"capture_undefended",{capturedAt:squareName(captureAt),defenders:0});
    const capturedPin=pins(before,enemy).find(pin=>pin.piece===captureAt);
    if(capturedPin&&["n","b","r","q"].includes(captured.type))add(card,"capture_pinned_piece",{capturedAt:squareName(captureAt),king:squareName(capturedPin.king),pinningPiece:squareName(capturedPin.attacker)});
    else if(["n","b","r"].includes(captured.type)){
      const relativePin=queenPins(before,enemy).find(pin=>pin.piece===captureAt);
      if(relativePin)add(card,"capture_pinned_piece",{capturedAt:squareName(captureAt),queen:squareName(relativePin.queen),pinningPiece:squareName(relativePin.attacker),kind:"relative-queen-pin"});
    }
    const defended=squares(before,enemy).filter(target=>target!==captureAt&&before[target].type!=="k"&&attacksSquare(before,captureAt,target));
    if(defended.length)add(card,"capture_defender",{capturedAt:squareName(captureAt),defended:defended.map(squareName)});
    if(originalChecks.includes(captureAt))add(card,"capture_checker",{checker:squareName(captureAt),king:squareName(beforeKing)});
    const previouslyAttackedTargets=squares(before,side).filter(target=>attacksSquare(before,captureAt,target));
    if(previouslyAttackedTargets.length)add(card,"capture_attacker",{capturer:{from:squareName(from),to:squareName(to),piece:move.mover.type},capturedAttacker:{square:squareName(captureAt),piece:captured.type},targets:witnessesAt(before,previouslyAttackedTargets),board:"before",geometryOnly:true});
  }
  
  if(move.promotion)add(card,"promotion",{from:squareName(from),to:squareName(to),piece:move.promotion});
  if(move.mover.type==="p"){
    add(card,"pawn_move",{from:squareName(from),to:squareName(to)});
    const [file,rank]=xy(to),advance=side==="w"?1:-1,ownKing=kingSquare(after,side);
    if(rank===(side==="w"?6:1)){
      const legalPromotions=[];
      for(const df of [-1,0,1]){
        const f=file+df;if(!inside(f,rank+advance))continue;
        const target=idx(f,rank+advance),victim=after[target];
        if(df===0?victim:(!victim||victim.color===side||victim.type==="k"))continue;
        const at=square=>square===target?{type:"q",color:side}:square===to?null:after[square];
        if(ownKing>=0&&!attackers(at,ownKing,enemy).length)legalPromotions.push(squareName(to)+squareName(target)+"q");
      }
      if(legalPromotions.length)add(card,"promotion_ready",{pawn:squareName(to),side,legalPromotions,sideToMoveIgnored:true,virtualOccupancyOnly:true,resultBoardsApplied:0});
    }
    if(passed(before,from))add(card,"advances_passer",{from:squareName(from),to:squareName(to)});
    const [pawnFile,pawnRank]=xy(to),promotionSquare=idx(pawnFile,side==="w"?7:0),pawnPushes=side==="w"?7-pawnRank:pawnRank,kingTempo=1,kingDistance=distance(king,promotionSquare);
    if(pawnPushes>0&&kingDistance>pawnPushes+kingTempo)add(card,"pawn_outruns_king",{from:squareName(from),to:squareName(to),enemyKing:squareName(king),promotionSquare:squareName(promotionSquare),pawnPushes,kingDistance,kingTempo,geometryOnly:true});
  }
  if(move.mover.type==="k"){
    
    add(card,"king_move",{from:squareName(from),to:squareName(to)});
    const centralDistance=sq=>Math.max(0,3-sq%8,sq%8-4,3-Math.floor(sq/8),Math.floor(sq/8)-4);
    if(centralDistance(to)<centralDistance(from))add(card,"king_centralizes",{from:squareName(from),to:squareName(to),before:centralDistance(from),after:centralDistance(to)});
    const nearer=squares(after,"w","p").concat(squares(after,"b","p")).filter(p=>distance(to,p)<distance(from,p));
    if(nearer.length)add(card,"king_toward_pawn",nearer.map(p=>({pawn:squareName(p),before:distance(from,p),after:distance(to,p)})));
  }
  const ourKing=kingSquare(after,side);
  if(mover.type!=="k"&&ourKing>=0&&distance(to,ourKing)<distance(from,ourKing))add(card,"move_toward_own_king",{from:squareName(from),to:squareName(to),king:squareName(ourKing),before:distance(from,ourKing),after:distance(to,ourKing)});
  const beforeAttacked=attackers(before,from,enemy);
  if(beforeAttacked.length)add(card,"move_attacked",{from:squareName(from),attackers:beforeAttacked.map(squareName)});
  const afterAttackers=attackers(after,to,enemy),afterDefenders=attackers(after,to,side);
  if(!afterAttackers.length)add(card,"piece_unattacked",{square:squareName(to),attackers:0});
  if(afterDefenders.length)add(card,"piece_defended",{square:squareName(to),defenders:afterDefenders.map(squareName)});
  const attacked=squares(after,enemy).filter(target=>attacksSquare(after,to,target));
  observeDirectOpposition(card,after);
  const pawnTargets=attacked.filter(target=>after[target].type==="p");
  if(pawnTargets.length)add(card,"attacks_pawn",{attacker:squareName(to),attackerType:mover.type,pawns:pawnTargets.map(squareName)});
  const defendedPawns=squares(after,side,"p").filter(pawn=>pawn!==to&&attacksSquare(after,to,pawn));
  if(defendedPawns.length)add(card,"defends_pawn",{defender:squareName(to),defenderType:mover.type,pawns:defendedPawns.map(squareName)});
  const promotionBlockers=squares(after,side,"p").filter(pawn=>xy(pawn)[1]===(side==="w"?6:1)).map(pawn=>({pawn,blocker:pawn+(side==="w"?-8:8)})).filter(x=>after[x.blocker]?.color===enemy&&after[x.blocker].type!=="k"&&attacked.includes(x.blocker));
  if(promotionBlockers.length)add(card,"attacks_promotion_blocker",{attacker:squareName(to),targets:promotionBlockers.map(x=>({pawn:squareName(x.pawn),blocker:squareName(x.blocker),blockerType:after[x.blocker].type}))});
  const rookTargets=attacked.filter(target=>after[target].type==="r");
  if(rookTargets.length)add(card,"attacks_rook",{attacker:squareName(to),targets:witnessesAt(after,rookTargets)});
  
  
  const queens=attacked.filter(target=>after[target].type==="q");
  if(queens.length)add(card,"attacks_queen",{attacker:squareName(to),queens:queens.map(squareName)});
  
  
  
  const higher=attacked.filter(target=>after[target].type!=="k"&&VALUES[after[target].type]>VALUES[mover.type]);
  if(mover.type!=="k"&&higher.length)add(card,"attack_higher",{attacker:squareName(to),attackerValue:VALUES[mover.type],targets:witnessesAt(after,higher)});
  
  
  const enemyPins=pins(after,enemy);
  
  const ourTargets=squares(after,side).filter(target=>target!==to&&after[target].type!=="k"&&before[target]?.color===side&&attacksSquare(after,to,target));
  const defendedLoose=ourTargets.filter(target=>!attackers(before,target,side).length);
  const defendedPieces=squares(after,side).filter(target=>target!==to&&["n","b","r","q"].includes(after[target].type)&&attacksSquare(after,to,target));
  if(defendedPieces.length)add(card,"defend_piece",{defender:squareName(to),targets:defendedPieces.map(squareName)});
  const defendedQueens=defendedPieces.filter(s=>after[s].type==="q");
  if(defendedQueens.length)add(card,"defend_queen",{defender:squareName(to),targets:defendedQueens.map(squareName)});
  
  if(defendedLoose.length)add(card,"defend_loose",{defender:squareName(to),targets:defendedLoose.map(squareName)});
  
  
  const beforePins=new Set(pins(before,enemy).map(newPinKey)),newPins=enemyPins.filter(pin=>!beforePins.has(newPinKey(pin)));
  
  
  const higherPinnedTargets=newPins.filter(pin=>pin.attacker===to&&VALUES[after[pin.piece].type]>VALUES[mover.type]);
  if(higherPinnedTargets.length)add(card,"pins_higher_piece",{attacker:squareName(to),attackerValue:VALUES[mover.type],pins:higherPinnedTargets.map(pin=>({piece:squareName(pin.piece),pieceValue:VALUES[after[pin.piece].type],king:squareName(pin.king),attacker:squareName(pin.attacker)}))});
  const occupiedPawnFrontSquares=squares(after,enemy,"p").filter(pawn=>pawn+(enemy==="w"?-8:8)===to);
  if(occupiedPawnFrontSquares.length)add(card,"blocks_enemy_pawn",{occupant:squareName(to),pawns:occupiedPawnFrontSquares.map(squareName)});
  const guardedPromotionSquares=squares(after,enemy,"p").map(pawn=>({pawn,square:idx(pawn%8,enemy==="w"?7:0)})).filter(x=>attacksSquare(after,to,x.square));
  if(guardedPromotionSquares.length)add(card,"guard_promotion_square",{guard:squareName(to),targets:guardedPromotionSquares.map(x=>({pawn:squareName(x.pawn),promotionSquare:squareName(x.square)}))});
  
  
  
  const discovered=[];
  for(const source of squares(after,side).filter(s=>s!==to&&before[s]?.color===side&&["b","r","q"].includes(before[s].type)&&["b","r","q"].includes(after[s].type)))
    for(const target of squares(after,enemy))if(attacksSquare(after,source,target)&&!attacksSquare(before,source,target))discovered.push({attacker:squareName(source),target:squareName(target)});
  if(discovered.length)add(card,"open_line",discovered);
  if(["b","r","q"].includes(mover.type)){
    const[tf,tr]=xy(to),skewers=[];
    for(const[df,dr]of rayDirections){
      if(!sliderUses(mover,df,dr))continue;
      const targets=[];
      for(let f=tf+df,r=tr+dr;inside(f,r);f+=df,r+=dr){const square=idx(f,r),piece=after[square];if(!piece)continue;if(piece.color===side)break;targets.push(square);if(targets.length===2)break;}
      if(targets.length===2){const[a,b]=targets,av=after[a].type==="k"?Infinity:VALUES[after[a].type],bv=after[b].type==="k"?Infinity:VALUES[after[b].type];if(av>bv)skewers.push({front:squareName(a),back:squareName(b)});}
    }
    if(skewers.length)add(card,"skewer",{attacker:squareName(to),rays:skewers});
  }

}

export class ScratchChessOracle {
  constructor(config={}) {
    if(typeof config.createGame!=="function")throw new TypeError("createGame(options) is required");
    this.createGame=config.createGame;
    this.options={objective_gain:2,max_positions:config.max_positions??10000,attack_min_value:config.attack_min_value??0};
    this.cards=new Map();this.analysis=new Map();this.rootId="root";this.rootSide=null;this.rootMaterial=null;this.policyDepth=7;this.puzzle=null;
    this.horizon=1;this.stats={appliedMoves:0,maxAppliedDepth:0,descriptorPositions:0};
  }
  _game(fen,title="Human chess facts") {const game=this.createGame({Event:title,Site:"Predicate Chess"});game.loadFEN(fen);return game;}
  reset({fen,title="Chess position",policyDepth=7}={}) {
    if(typeof fen!=="string"||fen.trim().split(/\s+/).length!==6)throw new Error("A six-field FEN is required");
    if(!Number.isInteger(policyDepth)||policyDepth<0)throw new Error("policyDepth must be a nonnegative integer");
    this.cards.clear();this.analysis.clear();this.rootSide=fen.split(/\s+/)[1];this.policyDepth=Math.min(7,policyDepth);
    this.stats={appliedMoves:0,maxAppliedDepth:0,descriptorPositions:0};
    const game=this._game(fen,title);this.rootMaterial=balance(game.state.board,this.rootSide);
    // Deliberately never retain theme, solution, puzzle ID, or source URL.
    this.puzzle={title,fen};
    const root=this._card("root",title,game.exportFEN(),0,null);root.meta.root=true;
    this.cards.set(root.id,root);return this.getPosition(root.id);
  }
  _card(id,display,fen,depth,move) {
    return {id,display,label:display,side:fen.split(/\s+/)[1]===this.rootSide?"my":"their",predicates:[],facts:[],witnesses:{},help:"Single chess facts; witness squares are shown for each observation.",fen,depth,children:[],expanded:false,prepared:false,move,meta:{root:false,parentId:null,materialSwing:0}};
  }
  createProject(policy,name="Compressed radical policy") {
    if(!this.puzzle)throw new Error("reset must precede createProject");
    return {schema:"predicate-policy-dfa-lab/project-v3",name,initial:[this.rootId],policy:clone(policy),positions:this.getPositions(),tests:[]};
  }
  getPosition(id){return clone(this.cards.get(id)??null);}
  getPositions(){return [...this.cards.values()].map(clone);}
  preparePosition(id) {
    const card=this.cards.get(id);if(!card)throw new Error(`Unknown position ${id}`);
    if(!card.prepared){
      const game=this._game(card.fen,card.display);boardFacts(card,game,this.rootSide,this.rootMaterial);
      const operational=[];
      if(card.depth>=this.policyDepth||card.depth>=7)operational.push("max_ply_reached");
      // Conservative cycle closure, not a claim of a threefold draw. Compare
      // placement, side, castling and en-passant rights with ancestors only.
      const key=card.fen.split(/\s+/).slice(0,4).join(" ");
      let ancestor=this.cards.get(card.meta.parentId);
      while(ancestor){
        if(ancestor.fen.split(/\s+/).slice(0,4).join(" ")===key){operational.push("repeated_position");break;}
        ancestor=this.cards.get(ancestor.meta.parentId);
      }
      card.predicates.push(...operational);card.meta.operationalStatuses=operational;
      card.prepared=true;this.stats.descriptorPositions++;
    }
    return this.getPosition(id);
  }
  _applyChild(parent,move,before) {
    if(parent.depth>=this.policyDepth||parent.depth>=7)throw new Error("Cannot construct a result beyond the hard ply boundary");
    const game=this._game(parent.fen,parent.display);
    if(move.promotion){
      // ScratchChess's UCI entry point currently loses its promotion request
      // during its legality snapshot. Use its existing finalizer, exactly as
      // the baseline did, after verifying the public move is legal.
      if(!game._legalMovesFrom(move.from).includes(move.to))throw new Error(`Illegal promotion ${move.uci}`);
      game._finalizeMove(move.from,move.to,move.promotion.toUpperCase());
    }else if(!game.makeMoveUCI(move.uci))throw new Error(`Rejected legal move ${move.uci}`);
    const depth=parent.depth+1,fen=game.exportFEN(),san=game.curNode?.san||move.uci;
    this.stats.appliedMoves++;this.stats.maxAppliedDepth=Math.max(this.stats.maxAppliedDepth,depth);
    const prefix=parent.fen.split(/\s+/),display=`${prefix[5]}${prefix[1]==="w"?".":"…"} ${san}`;
    const moveInfo={uci:move.uci,san,from:squareName(move.from),to:squareName(move.to),fromIndex:move.from,toIndex:move.to,promotion:move.promotion,mover:{color:move.mover.color,type:move.mover.type},captured:move.captured?{color:move.captured.color,type:move.captured.type}:null,capturedSquare:squareName(move.capturedSquare),capturedSquareIndex:move.capturedSquare,enPassant:move.capturedSquare!==move.to};
    const card=this._card(`${parent.id}/${move.uci}`,display,fen,depth,moveInfo);card.meta.parentId=parent.id;card.meta.lastMove={from:move.from,to:move.to,uci:move.uci,san,moverSide:move.mover.color};
    moveFacts(card,parent,before,game.state.board,move);materialFacts(card,game.state.board,this.rootSide,this.rootMaterial);
    
    
    if(card.predicates.includes("check")){
      const replies=legalMoveRecords(game);
      // These legal checking replies are already generated; expose capture availability for selection.
      if(move.mover.color===this.rootSide){
        const captureReplies=replies.filter(reply=>reply.captured).map(reply=>reply.uci);
        if(captureReplies.length)add(card,"enemy_capture_available",{side:game.state.side,moves:captureReplies});
      }
      if(!replies.length)add(card,move.mover.color===this.rootSide?"mate":"mated",{side:game.state.side,king:squareName(kingSquare(game.state.board,game.state.side)),legalMoves:0});
      
    }
    return card;
  }
  expandPosition(id) {
    this.preparePosition(id);
    const card=this.cards.get(id);if(card.expanded)return this.getPosition(id);
    if(card.depth>=this.policyDepth||card.depth>=7){card.expanded=true;return this.getPosition(id);}
    const game=this._game(card.fen,card.display),legal=legalMoveRecords(game),before=game.state.board;
    if(this.cards.size+legal.length>this.options.max_positions){
      card.meta.oracleLimit=true;card.meta.limitReason="Maximum offered position cards exceeded";
      card.meta.operationalStatuses=[...(card.meta.operationalStatuses||[]),"oracle_limit","unexplorable"];
      card.predicates.push(...["oracle_limit","unexplorable"].filter(status=>!card.predicates.includes(status)));
      card.help=`Offering every legal move would exceed the ${this.options.max_positions} position-card resource limit. This is an incomplete frontier, not a solved or quiet position.`;
      card.expanded=true;return this.getPosition(id);
    }
    const children=legal.map(move=>this._applyChild(card,move,before)).sort((a,b)=>a.move.uci.localeCompare(b.move.uci));
    for(const child of children)this.cards.set(child.id,child);
    card.children=children.map(child=>child.id);card.expanded=true;this.analysis.set(id,children);
    return this.getPosition(id);
  }
  _syncCardToRunner(runner,id){const card=this.getPosition(id);if(!card)return;runner.positions.set(id,card);runner.project.positions??=[];const index=runner.project.positions.findIndex(p=>p.id===id);if(index<0)runner.project.positions.push(card);else runner.project.positions[index]=card;}
  hydrateRunner(runner){
    const snapshot=runner?.snapshot?.(),id=snapshot?.current?.id;if(!id)return{changed:false,added:[]};
    const previous=new Set(this.cards.keys());
    // Routing may ask whether an immediate move with one named fact exists.
    // Complete that legal frontier before evaluating declarative input facts.
    // Preparing proof delimiters does not require another move frontier.
    if(snapshot.stateKind==="inspect"){
      if(snapshot.state==="LINE_PROVED"||snapshot.state==="LINE_FAILED")this.preparePosition(id);
      else this.expandPosition(id);
    }
    if(snapshot.stateKind==="search")this.expandPosition(id);
    this._syncCardToRunner(runner,id);const added=[...this.cards.keys()].filter(key=>!previous.has(key));
    for(const child of this.cards.get(id)?.children||[])this._syncCardToRunner(runner,child);
    return{changed:true,added};
  }
  summary(){return{version:SCRATCHCHESS_ORACLE_VERSION,horizon:1,terminalProbe:SCRATCHCHESS_ORACLE_TERMINAL_PROBE,puzzle:clone(this.puzzle),rootSide:this.rootSide,rootMaterial:this.rootMaterial,cards:this.cards.size,prepared:[...this.cards.values()].filter(c=>c.prepared).length,expanded:[...this.cards.values()].filter(c=>c.expanded).length,options:clone(this.options),predicateCount:PREDICATE_IDS.length,stats:clone(this.stats)};}
}
export function createScratchChessOracle(options){return new ScratchChessOracle(options);}
export default createScratchChessOracle;
