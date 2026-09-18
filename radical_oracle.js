/**
 * Compact human-fact Oracle. No learned clauses, puzzle labels, engine scores,
 * stopping classifier, or searched tactical outcomes. ScratchChess supplies
 * legal moves. The only result positions constructed are legal children of a
 * node strictly before the seven-ply boundary.
 *
 * Board facts are relative to the original solver. Move facts are relative to
 * the move's player. Attacks/defenses are geometric, not exchange evaluations.
 */
export const SCRATCHCHESS_ORACLE_VERSION = "3.10.0-streaming-rook-fork-recovery";
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
  kings_same_rank: "The two kings stand on the same rank (one equality observation).",
  our_king_controls_own_pawn_promotion_square: "Our king geometrically controls the promotion square of at least one of our pawns (one typed control relation).",
  our_king_no_farther_from_own_pawn: "Our king is no more king steps from at least one of our pawns than the opposing king is from that same pawn.",
  our_rook_attacked_by_king: "The opposing king geometrically attacks one of our rooks (one typed king-to-rook attack relation).",
  enemy_queen_destinations_attacked: "The opponent is currently to move, at least one enemy queen exists, and every legal move by an enemy queen lands on a square geometrically attacked by our pieces after that move (one typed universal attack relation; no claim about nonqueen defenses or forced material gain).",
  our_queen_near_enemy_king: "At least one of our queens lies within two king steps (Chebyshev distance at most two) of the enemy king; a geometric proximity relation, not a mate claim.",
  legal_replies_are_queen_moves: "The opponent is currently to move, every legal move moves a queen, and at least one legal move exists (one typed universal relation).",
  legal_reply_squares_undefended: "The opponent is currently to move and every legal move lands on a square without another friendly geometric defender after that move; at least one legal move exists (one universal defense relation, using virtual occupancy only).",
  enemy_capture_exceeds_minor_available: "The opponent, currently to move, has a legal capture whose victim is worth more than three points, the value of a minor piece (one numerical threshold; no continuation is searched).",
  favorable_capture_available: "The side to move can legally capture a piece of equal or greater value; compare the victim with the moving piece before any promotion (one numerical relation).",
  our_king_at_least_three_flights: "Our king has at least three legal adjacent destinations, excluding castling (one count fact).",
  enemy_capture_without_legal_recapture_available: "The opponent has a legal capture, and its capturing piece cannot legally be recaptured (two facts).",
  our_passer_outside_enemy_king_square: "An own passed pawn has a promotion square beyond the opposing king's rule-of-square reach, allowing side-to-move tempo and an unobstructed initial double push (two facts).",
  our_king_attacks_nonrook_pawn: "Our king attacks an enemy pawn, and that pawn is on files b-g (two facts).",
  our_king_more_advanced: "Our king is on a rank closer to our pawn promotion rank than the enemy king.",
  king_near_neighboring_pawn_file: "Our king is on a neighboring file of one of our pawns, and within two king steps of that same pawn (two facts).",
  enemy_passer_outside_king_square: "An enemy passed pawn has a promotion square beyond our king's rule-of-square reach, allowing side-to-move tempo and an unobstructed starting double push (two facts).",
  our_king_closer_to_own_pawn: "Our king is fewer king steps from at least one of our pawns than the opposing king is from that same pawn.",
  enemy_one_nonrook_pawn: "The opponent has exactly one pawn, on files b-g (two facts).",
  enemy_pawn_locked: "All enemy pawns are blocked by our pawns, and the opponent has no legal pawn move (two facts).",
  blocking_pawn_not_capturable: "The opponent, currently to move, has no legal capture of our pawn that blocks its pawn.",
  our_king_guards_blocking_pawn: "Our king defends the pawn blocking the enemy pawn.",
  king_near_pawn_pair_side: "Our king is already beside the enemy pawn, or one unobstructed king step from a side square on that pawn's rank; defender-king control is handled separately.",
  king_pawn_pair_race_margin: "A clear near-side approach exists, and the defender's horizontal distance to its pawn's file exceeds that approach plus capture distance by at least two (two facts).",
  outside_pawn_decoy: "Our passed pawn is at least three files from the enemy pawn (passed pawn plus file separation: two facts).",
  pawn_promotion_corridor_clear: "No own pawn occupies the three-file corridor in front of our blocking pawn, through the promotion rank.",
  mate: "The opponent is to move, is in check, and has no legal move (checkmate).",
  mated: "The solver is to move, is in check, and has no legal move (checkmate).",
  stalemate: "The side to move has no legal move and is not in check (stalemate).",
  in_check: "The side to move is in check.",
  surplus_covers_attacked_material: "The current material lead exceeds the sum of all geometrically attacked own nonking pieces.",
  material_lead_at_least_minor: "The solver has a material lead of at least three points, the value of a minor piece.",
  surplus_covers_largest_legal_capture: "The material lead exceeds the largest value of one own piece that the opponent can legally capture now.",
  our_king_flights_not_aligned: "Our king and its legal adjacent destinations do not all lie on a single rank, file, or diagonal (one alignment relation).",
  our_king_mobile: "Our king has at least one legal adjacent destination, excluding castling.",
  material_deficit_one_pawn: "Our non-king material value is exactly one point below the opposing total, using the standard piece values.",
  material_even: "The solver's current material balance equals zero; this count alone does not establish a draw or win.",
  material_up: "The solver's current material balance is greater than zero.",
  material_improved: "The solver's current material balance exceeds its initial balance.",
  material_target: "The solver has gained at least two material points relative to the initial board.",
  low_material: "The combined non-king material of both sides totals at most twenty-one points.",
  our_nonpawn_attacked: "An opposing piece geometrically attacks one of our knights, bishops, rooks, or queens.",
  enemy_passer: "The opponent has a passed pawn.",
  enemy_queen_pinned: "An enemy queen is absolutely pinned to its king by one of our line pieces.",
  enemy_check_not_favorably_capturable_available: "The opponent has a legal check with no legal capture of an actual checking piece by a piece of equal or lower final value (check plus favorable capture: two facts; king value zero, capture promotions use the promoted piece's value).",
  enemy_capture_available: "The opponent, currently to move, has a legal capture.",
  enemy_promotion_available: "The opponent, currently to move, has a legal promotion.",
  check_available: "The side to move has a legal checking move.",
  pawn_endgame: "Only kings and pawns remain.",
  our_doubled_pawns: "Two of our pawns share a file.",
  enemy_king_near_undefended_pawn: "The enemy king is within two steps of one of our undefended pawns (two facts).",
  our_pawns_both_wings: "We have at least one pawn on each of files a-d and e-h (two presence facts).",
  our_king_more_central: "Our king has a smaller Chebyshev distance to the nearest central square than the enemy king.",
  our_queen_present: "We have a queen on the board.",
  enemy_queen_present: "The opponent has a queen on the board.",
  enemy_pawn_on_seventh: "The opponent has a pawn one rank from promotion.",
};
const moveDefinitions = {
  pawn_promotion_path_clear: "The moved piece is a pawn and every square ahead of it on its file through promotion is empty (pawn identity plus one occupancy relation).",
  pawn_promotion_interception_margin: "The moved pawn reaches each remaining file square more than one tempo before any enemy piece can geometrically reach it; pawn identity plus one travel-distance comparison, ignoring blockers, checks and defenses (two facts).",
  king_retreats: "The moving king goes one rank closer to its own starting back rank.",
  abreast_friendly_pawn: "The moved piece stands on the same rank and adjacent file as a friendly pawn. The moved piece may be a king or any other piece; pawn identity is not part of this relation.",
  king_battery: "A friendly slider, one friendly front piece and the enemy king lie in that order on one otherwise unobstructed movement ray: a discovered-check battery (one aligned battery relation). This is a board relation; the last mover need not be its rear piece.",
  queen_attacks_queen: "The moved queen attacks an enemy queen.",
  promotion_ready: "The pawn just moved has a legal promotion on the otherwise unchanged board (one legal-move availability relation; the opponent has not moved yet).",
  attacks_promotion_blocker: "The moved piece attacks an enemy nonking piece blocking a friendly pawn on its promotion square (attack plus promotion blockade: two facts).",
  pawn_outruns_king: "A pawn move lands outside the opposing king's rule-of-square reach after allowing the opponent to move next; pawn identity plus promotion-square geometry, without asserting passedness or an unblocked path (two facts).",
  move_advances: "The moving piece arrives on a rank closer to the opponent starting back rank (one directional relation).",
  defend_queen: "The moved piece geometrically defends a friendly queen.",
  check: "The move gives check.",
  capture: "The move captures an enemy piece, including en passant.",
  capture_piece: "The move captures a knight, bishop, rook or queen.",
  capture_minor: "The captured piece is a knight or bishop (victim value equals three).",
  recapture: "The move captures the piece that captured on the preceding ply.",
  promotion: "The move promotes a pawn.",
  skewer: "The moved slider attacks a more valuable enemy piece in front of a less valuable enemy piece on the same ray (king valued highest).",
  open_line: "The move uncovers a new attack from another friendly slider onto an enemy piece.",
  capture_defender: "The move captures a piece that defended another enemy non-king piece.",
  pins_higher_piece: "The moved piece creates an absolute pin to the enemy king of a piece worth more than itself (new pin and same-target value comparison: two facts).",
  capture_undefended: "The move captures a piece that had no geometric defender.",
  defend_attacked: "The moved piece defends a friendly knight, bishop, rook, or queen that was attacked before the move.",
  defend_piece: "The moved piece defends a friendly knight, bishop, rook, or queen.",
  move_toward_own_king: "The moving non-king piece reduces its Chebyshev distance to its own king.",
  move_attacked: "The moving piece was attacked before the move.",
  attack_equal_piece: "The moved piece attacks an enemy non-pawn, non-king piece of exactly equal material value (one numerical relation).",
  attack_higher: "A moved non-king piece attacks an enemy non-king piece of greater material value.",
  attacks_rook: "The moved piece attacks an enemy rook.",
  attacks_queen: "The moved piece attacks an enemy queen.",
  advances_passer: "The moving pawn was a passed pawn before the move.",
  king_toward_pawn: "The king move reduces its Chebyshev distance to at least one pawn still on the board.",
  guard_promotion_square: "The moved piece attacks the promotion square of an enemy pawn.",
  blocks_enemy_pawn: "The moved piece occupies the square immediately ahead of an enemy pawn (one blockade relation; does not assert the pawn is advanced or passed).",
  enemy_pawn_on_sixth: "The opponent has a pawn two ranks from promotion.",
  enemy_promotion_square_defended_available: "The opponent has a legal promotion whose landing square is geometrically defended by another opposing piece after promotion (two facts).",
  enemy_promotion_not_favorably_capturable_available: "The opponent has a legal promotion whose promoted piece cannot be legally captured by an equal-or-cheaper piece (two facts).",
  capture_pinned_piece: "The move captures a nonpawn piece shielding its king, or a less valuable piece shielding its queen, from an opposing line piece (capture and pin: two facts).",
  capture_checker: "The move captures a piece that was checking the moving side's king.",
  attack_loose: "The moved piece attacks an enemy non-king piece with no geometric defender.",
  defend_loose: "The moved piece defends a friendly non-king piece that was undefended before the move.",
  piece_unattacked: "The moved piece is not geometrically attacked after the move.",
  piece_defended: "The moved piece has a geometric defender after the move.",
  capture_sacrifices_at_least_rook: "On a capture, the moving piece's pre-move value exceeds the captured value by at least five points; a candidate-ordering comparison, not proof that the sacrifice succeeds.",
  capture_higher_available: "The side to move has a legal capture of strictly more valuable material than its moving piece (pre-promotion value, king zero); the same strict comparison as capture_higher, observed on the current board without constructing children.",
  capture_higher: "The captured piece's value exceeds the moving piece's pre-move value.",
  capture_at_least_equal: "The captured piece's value is at least the moving piece's pre-move value; legal king captures use moving value zero.",
  king_centralizes: "A king move reduces its Chebyshev distance to the nearest of d4, e4, d5 and e5.",
  king_move: "The moving piece was a king.",
  creates_outnumbered_pin: "The moved piece creates an absolute pin to the enemy king, and its side has more geometric attackers than defenders on that same victim (two facts; not an exchange evaluation).",
  check_requires_interposition: "The move checks, and every legal evasion interposes a piece (two facts).",
  pawn_move: "The moving piece was a pawn (the same pawn identity fact used in pawn_outruns_king).",
  king_attacks_piece: "The moved king attacks an enemy knight, bishop, rook or queen.",
  restricts_king: "The move decreases the enemy king's legal adjacent destinations.",
};
// A typed target (queen, higher-value piece) is part of one relation; it is not
// a second independent purpose. Pairs below join two chess relations, e.g.
// defense + prior attack, capture + prior defense, or attacks on two targets.
const doubleFacts = new Set(["pawn_promotion_interception_margin","pawn_promotion_path_clear","capture_pinned_piece","check_requires_interposition","creates_outnumbered_pin","pawn_outruns_king","our_passer_outside_enemy_king_square","enemy_capture_without_legal_recapture_available","our_king_attacks_nonrook_pawn","enemy_passer_outside_king_square","king_near_neighboring_pawn_file","enemy_promotion_square_defended_available","enemy_promotion_not_favorably_capturable_available","enemy_check_not_favorably_capturable_available","surplus_covers_largest_legal_capture","our_pawns_both_wings","enemy_king_near_undefended_pawn","surplus_covers_attacked_material","capture_defender","capture_undefended","defend_attacked","advances_passer","capture_checker","attack_loose","defend_loose","enemy_one_nonrook_pawn","enemy_pawn_locked","king_pawn_pair_race_margin","outside_pawn_decoy","pins_higher_piece","attacks_promotion_blocker"]);
const canonicalRelations = new Set(["king_battery","mate","mated","stalemate","skewer","creates_pin","enemy_passer","open_line","recapture","enemy_queen_pinned"]);
export const PREDICATE_GLOSSARY = Object.freeze(Object.fromEntries([
  ...Object.entries(boardDefinitions).map(([id,description]) => [id,{id,kind:"board",perspective:"original solver",description,semanticFacts:doubleFacts.has(id)?2:1,standardRelation:canonicalRelations.has(id)}]),
  ...Object.entries(moveDefinitions).map(([id,description]) => [id,{id,kind:"move",perspective:"candidate mover",description,semanticFacts:doubleFacts.has(id)?2:1,standardRelation:canonicalRelations.has(id)}])
]));
export const PREDICATE_IDS = Object.freeze(Object.keys(PREDICATE_GLOSSARY));
// Runtime failures are explicit and must never count as a chess observation.
export const OPERATIONAL_PREDICATE_IDS = Object.freeze(["oracle_limit","unexplorable"]);

/** Current-board legal queen destinations; virtual occupancy only, no successor Game/FEN or committed move. */
export function observeEnemyQueenDestinations(game,rootSide) {
  const board=game.state.board,side=game.state.side;
  if(side===rootSide)return {active:false,queens:[],destinations:[],allAttacked:false,resultBoardsApplied:0};
  const queens=squares(board,side,"q");
  if(!queens.length)return {active:false,queens:[],destinations:[],allAttacked:false,resultBoardsApplied:0};
  const destinations=legalMoveRecords(game).filter(move=>move.mover.type==="q").map(move=>{
    const at=square=>square===move.to?move.mover:(square===move.from||square===move.capturedSquare)?null:boardAt(board,square);
    return {uci:move.uci,square:squareName(move.to),attackers:attackers(at,move.to,rootSide).map(squareName)};
  });
  return {active:true,queens:queens.map(squareName),destinations,allAttacked:destinations.every(move=>move.attackers.length>0),resultBoardsApplied:0,virtualOccupancyOnly:true};
}
function observeQueenDestinations(card,game,rootSide) {
  const observation=observeEnemyQueenDestinations(game,rootSide);
  if(observation.active&&observation.allAttacked)add(card,"enemy_queen_destinations_attacked",observation);
}

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
function kingFlights(board,side) {
  const king=kingSquare(board,side),out=[];
  if(king<0)return out;
  const[kf,kr]=xy(king);
  for(const[df,dr]of rayDirections){
    const f=kf+df,r=kr+dr;
    if(!inside(f,r))continue;
    const to=idx(f,r),target=boardAt(board,to);
    if(target?.color===side || target?.type==="k")continue;
    const at=square=>square===to?boardAt(board,king):square===king?null:boardAt(board,square);
    if(!attackers(at,to,other(side)).length)out.push(to);
  }
  return out;
}
function aligned(board,side) {
  const pieces=squares(board,side),pairs=[];
  for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
    const a=pieces[i],b=pieces[j],[af,ar]=xy(a),[bf,br]=xy(b),df=bf-af,dr=br-ar;
    if(!(df===0||dr===0||Math.abs(df)===Math.abs(dr)))continue;
    const sf=Math.sign(df),sr=Math.sign(dr);let clear=true;
    for(let f=af+sf,r=ar+sr;f!==bf||r!==br;f+=sf,r+=sr)if(boardAt(board,idx(f,r))){clear=false;break;}
    if(clear)pairs.push([a,b]);
  }
  return pairs;
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
export function observeKingCaptureGeometry(board,side,king,target) {
  const piece=boardAt(board,target);
  if(king<0||distance(king,target)!==1||!piece||piece.color===side||piece.type==="k")return {legal:false,reason:"not-an-adjacent-enemy-nonking",attackers:[]};
  const at=square=>square===target?{type:"k",color:side}:square===king?null:boardAt(board,square);
  const threats=attackers(at,target,other(side));
  return {legal:threats.length===0,reason:threats.length?"capture-square-attacked":"legal-king-capture",attackers:threats.map(squareName)};
}
/** Fixed geometric capture observation. The board may be an occupancy query
 * after a candidate check. Capturing the actual checker must leave our king
 * unattacked; this handles pins, discoveries and multiple simultaneous checks.
 * No Game, successor FEN, applied move, or recursive continuation is created.
 * Equal material value does not claim that the resulting game is won. */
export function observeCheckerCaptureGeometry(board,side,checker,{enPassantChecker=-1,enPassantTarget=-1,requireCheck=true}={}) {
  const target=boardAt(board,checker),king=kingSquare(board,side),attempts=[];
  if(king<0||!target||target.color===side||target.type==="k"||(requireCheck&&!attacksSquare(board,checker,king)))return {checker:squareName(checker),favorable:false,captures:[],attempts,reason:"not-an-enemy-checking-piece"};
  for(const from of squares(board,side)){
    const mover=boardAt(board,from),ordinary=attacksSquare(board,from,checker);
    const enPassant=mover.type==="p"&&target.type==="p"&&checker===enPassantChecker&&enPassantTarget>=0
      &&!boardAt(board,enPassantTarget)&&Math.floor(from/8)===Math.floor(checker/8)
      &&Math.abs(from%8-checker%8)===1&&attacksSquare(board,from,enPassantTarget);
    if(!ordinary&&!enPassant)continue;
    const to=enPassant?enPassantTarget:checker,lastRank=side==="w"?0:7;
    const promotions=mover.type==="p"&&Math.floor(to/8)===lastRank?["q","r","b","n"]:[""];
    for(const promotion of promotions){
      const finalType=promotion||mover.type;
      const at=square=>square===to?{...mover,type:finalType}:(square===from||square===checker)?null:boardAt(board,square);
      const kingAfter=mover.type==="k"?to:king,threats=attackers(at,kingAfter,other(side));
      const legal=threats.length===0,capturerValue=VALUES[finalType],checkerValue=VALUES[target.type];
      attempts.push({uci:squareName(from)+squareName(to)+promotion,from:squareName(from),to:squareName(to),checker:squareName(checker),moverType:mover.type,finalType,promotion:promotion||null,enPassant,legal,capturerValue,checkerValue,favorable:legal&&checkerValue>=capturerValue,kingAttackers:threats.map(squareName),reason:!legal?"own-king-remains-attacked":checkerValue<capturerValue?"capturer-more-valuable":"legal-equal-or-cheaper-capture"});
    }
  }
  const captures=attempts.filter(capture=>capture.legal);
  return {checker:squareName(checker),favorable:captures.some(capture=>capture.favorable),captures,attempts,reason:captures.some(capture=>capture.favorable)?"favorable-legal-checker-capture":"no-favorable-legal-checker-capture"};
}
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
    const kingCaptures=checkingPieces.map(checker=>({checker,...observeKingCaptureGeometry(at,other(side),king,(8-Number(checker[1]))*8+FILES.indexOf(checker[0]))}));
    const kingCapture=kingCaptures.find(capture=>capture.legal)||kingCaptures[0]||{legal:false,reason:"not-a-check",attackers:[]};
    const doublePawnPush=mover.type==="p"&&Math.abs(move.to-move.from)===16;
    const checkerCaptures=checkingPieces.map(checker=>observeCheckerCaptureGeometry(at,other(side),(8-Number(checker[1]))*8+FILES.indexOf(checker[0]),{enPassantChecker:doublePawnPush?move.to:-1,enPassantTarget:doublePawnPush?(move.from+move.to)/2:-1}));
    const favorableCheckerCapture=checkerCaptures.some(capture=>capture.favorable);
    return {uci:move.uci,moverType:mover.type,capture:!!move.captured,captureLoss:VALUES[move.captured?.type]||0,promotion:move.promotion||null,promotionLoss:move.promotion?VALUES[move.promotion]-1:0,materialLoss:(VALUES[move.captured?.type]||0)+(move.promotion?VALUES[move.promotion]-1:0),check:checkingPieces.length>0,checkingPieces,kingCapture,kingCaptures,favorableCheckerCapture,checkerCaptures,enPassant,castling};
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
  if(current===0)add(card,"material_even",{balance:current});
  if(current===-1)add(card,"material_deficit_one_pawn",{balance:current});
  if(current>0)add(card,"material_up",{balance:current});
  if(current>=3)add(card,"material_lead_at_least_minor",{balance:current,threshold:3});
  if(swing>0)add(card,"material_improved",{initial:rootMaterial,current,gain:swing});
  if(swing>=2)add(card,"material_target",{initial:rootMaterial,current,gain:swing,threshold:2});
  if(material(board,"w")+material(board,"b")<=21)add(card,"low_material",{total:material(board,"w")+material(board,"b"),threshold:21});
}
function observeQueenKingProximity(card,board,rootSide) {
  const enemyKing=kingSquare(board,other(rootSide));
  if(enemyKing<0)return;
  const near=squares(board,rootSide,"q").filter(queen=>distance(queen,enemyKing)<=2);
  if(near.length)add(card,"our_queen_near_enemy_king",{enemyKing:squareName(enemyKing),queens:near.map(queen=>({square:squareName(queen),kingDistance:distance(queen,enemyKing)})),maximumKingDistance:2,geometryOnly:true});
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
  if(side!==rootSide){
    const retainedChecks=descriptors.observations.filter(move=>move.check&&!move.kingCapture.legal);
    const unfavorableChecks=descriptors.observations.filter(move=>move.check&&!move.favorableCheckerCapture);
    if(unfavorableChecks.length)add(card,"enemy_check_not_favorably_capturable_available",{moves:unfavorableChecks.map(move=>({uci:move.uci,checkingPieces:move.checkingPieces,checkerCaptures:move.checkerCaptures}))});
  }
  if(side!==rootSide){
    const legalCaptureMoves=descriptors.observations.filter(move=>move.capture);
    const largestCaptureLoss=Math.max(0,...legalCaptureMoves.map(move=>move.captureLoss));
    const majorCaptures=legalCaptureMoves.filter(move=>move.captureLoss>3);
    if(majorCaptures.length)add(card,"enemy_capture_exceeds_minor_available",{side,threshold:3,moves:majorCaptures.map(move=>({uci:move.uci,capturedValue:move.captureLoss}))});
    if(balance(board,rootSide)>largestCaptureLoss)add(card,"surplus_covers_largest_legal_capture",{balance:balance(board,rootSide),largestCaptureLoss,moves:legalCaptureMoves.map(move=>({uci:move.uci,capturedValue:move.captureLoss}))});
  }
  const strictlyProfitableCaptures=legalMoveRecords(game).filter(move=>move.captured&&VALUES[move.captured.type]>VALUES[move.mover.type]);
  if(strictlyProfitableCaptures.length)add(card,"capture_higher_available",{side,moves:strictlyProfitableCaptures.map(move=>({uci:move.uci,capturedValue:VALUES[move.captured.type],moverValue:VALUES[move.mover.type]}))});
  const favorableCaptures=legalMoveRecords(game).filter(move=>move.captured&&VALUES[move.captured.type]>=VALUES[move.mover.type]);
  if(favorableCaptures.length)add(card,"favorable_capture_available",{side,moves:favorableCaptures.map(move=>({uci:move.uci,capturedValue:VALUES[move.captured.type],moverValue:VALUES[move.mover.type]}))});
  const sixthPawns=squares(board,other(rootSide),"p").filter(square=>xy(square)[1]===(other(rootSide)==="w"?5:2));
  if(sixthPawns.length)add(card,"enemy_pawn_on_sixth",witnessesAt(board,sixthPawns));
  if(side!==rootSide){
    const promotions=legalMoveRecords(game).filter(move=>move.promotion).map(move=>{
      const at=square=>square===move.to?{...move.mover,type:move.promotion}:square===move.from?null:boardAt(board,square);
      return {uci:move.uci,defenders:attackers(at,move.to,side).filter(square=>square!==move.to).map(squareName),captures:observeCheckerCaptureGeometry(at,rootSide,move.to,{requireCheck:false})};
    });
    const defended=promotions.filter(move=>move.defenders.length);
    if(defended.length)add(card,"enemy_promotion_square_defended_available",{moves:defended.map(move=>({uci:move.uci,defenders:move.defenders}))});
    const unanswered=promotions.filter(move=>!move.captures.favorable);
    if(unanswered.length)add(card,"enemy_promotion_not_favorably_capturable_available",{moves:unanswered});
  }
  if(side!==rootSide){
    const captureResponses=legalMoveRecords(game).filter(move=>move.captured).map(move=>{
      const at=square=>square===move.to?{...move.mover,type:move.promotion||move.mover.type}:(square===move.from||square===move.capturedSquare)?null:boardAt(board,square);
      const recaptures=observeCheckerCaptureGeometry(at,rootSide,move.to,{requireCheck:false});
      return {uci:move.uci,capturer:squareName(move.to),capturedAt:squareName(move.capturedSquare),recaptures};
    });
    const unansweredCaptures=captureResponses.filter(move=>!move.recaptures.captures.length);
    if(unansweredCaptures.length)add(card,"enemy_capture_without_legal_recapture_available",{moves:unansweredCaptures});
  }
  observeQueenDestinations(card,game,rootSide);
  const solverFlights=kingFlights(board,rootSide);
  if(solverFlights.length>=3)add(card,"our_king_at_least_three_flights",{king:squareName(kingSquare(board,rootSide)),destinations:solverFlights.map(squareName),minimumCount:3});
  if(solverFlights.length)add(card,"our_king_mobile",{king:squareName(kingSquare(board,rootSide)),destinations:solverFlights.map(squareName)});
  const kingFlightCoordinates=[kingSquare(board,rootSide),...solverFlights].map(xy);
  const kingAndFlightsAligned=[([f,r])=>f,([f,r])=>r,([f,r])=>f-r,([f,r])=>f+r]
    .some(axis=>new Set(kingFlightCoordinates.map(axis)).size<=1);
  if(!kingAndFlightsAligned)add(card,"our_king_flights_not_aligned",{
    king:squareName(kingSquare(board,rootSide)),destinations:solverFlights.map(squareName),
    relation:"King and legal adjacent destinations do not share one queen line"});
  if(board.every(p=>!p||["p","k"].includes(p.type)))add(card,"pawn_endgame",{pieces:board.filter(Boolean).map(p=>p.type)});
  observeQueenKingProximity(card,board,rootSide);
  const pinnedEnemyQueens=pins(board,other(rootSide)).filter(pin=>board[pin.piece].type==="q");
  if(pinnedEnemyQueens.length)add(card,"enemy_queen_pinned",{pins:pinnedEnemyQueens.map(pin=>({queen:squareName(pin.piece),king:squareName(pin.king),pinner:squareName(pin.attacker)}))});
  const attackedOwn=squares(board,rootSide).filter(s=>board[s].type!=="k"&&attackers(board,s,other(rootSide)).length);
  const attackedOwnPieces=attackedOwn.filter(s=>["n","b","r","q"].includes(board[s].type));
  if(attackedOwnPieces.length)add(card,"our_nonpawn_attacked",{pieces:witnessesAt(board,attackedOwnPieces)});
  const exposedValue=attackedOwn.reduce((v,s)=>v+VALUES[board[s].type],0), currentBalance=balance(board,rootSide);
  if(currentBalance>exposedValue)add(card,"surplus_covers_attacked_material",{balance:currentBalance,exposedValue,pieces:witnessesAt(board,attackedOwn)});
  const ownPawnSquares=squares(board,rootSide,"p"), ownKingSquare=kingSquare(board,rootSide), enemyKingSquare=kingSquare(board,other(rootSide));
  const enemyPawnSquares=squares(board,other(rootSide),"p"),enemyMoves=side!==rootSide?legalMoveRecords(game):[];
  const kingAttackedRooks=squares(board,rootSide,"r").filter(square=>attacksSquare(board,enemyKingSquare,square));
  if(kingAttackedRooks.length)add(card,"our_rook_attacked_by_king",{king:squareName(enemyKingSquare),rooks:kingAttackedRooks.map(squareName),geometryOnly:true});
  if(enemyMoves.length&&enemyMoves.every(move=>move.mover.type==="q"))add(card,"legal_replies_are_queen_moves",{side,legalMoves:enemyMoves.map(move=>move.uci),count:enemyMoves.length});
  const replyDefenses=enemyMoves.map(move=>{const at=sq=>sq===move.to?{...move.mover,type:move.promotion||move.mover.type}:(sq===move.from||sq===move.capturedSquare)?null:boardAt(board,sq);return {uci:move.uci,square:squareName(move.to),defenders:attackers(at,move.to,side).map(squareName)};});
  if(replyDefenses.length&&replyDefenses.every(row=>!row.defenders.length))add(card,"legal_reply_squares_undefended",{side,replies:replyDefenses,resultBoardsApplied:0,virtualOccupancyOnly:true});
  const attackedEnemyPawns=enemyPawnSquares.filter(p=>p%8>0&&p%8<7&&attacksSquare(board,ownKingSquare,p));
  if(attackedEnemyPawns.length)add(card,"our_king_attacks_nonrook_pawn",{king:squareName(ownKingSquare),pawns:attackedEnemyPawns.map(squareName)});
  const ownRaceEscapes=[];
  for(const pawn of ownPawnSquares.filter(p=>passed(board,p))){
    const [file,rank]=xy(pawn),promotion=idx(file,rootSide==="w"?7:0),step=rootSide==="w"?-8:8;
    const starting=rank===(rootSide==="w"?1:6),doublePush=starting&&!board[pawn+step]&&!board[pawn+2*step];
    const pawnPushes=(rootSide==="w"?7-rank:rank)-(doublePush?1:0),kingTempo=side!==rootSide?1:0,kingDistance=distance(enemyKingSquare,promotion);
    if(kingDistance>pawnPushes+kingTempo)ownRaceEscapes.push({pawn:squareName(pawn),promotionSquare:squareName(promotion),pawnPushes,kingDistance,kingTempo,doublePush});
  }
  if(ownRaceEscapes.length)add(card,"our_passer_outside_enemy_king_square",{king:squareName(enemyKingSquare),races:ownRaceEscapes,geometryOnly:true});

  if(Math.floor(ownKingSquare/8)===Math.floor(enemyKingSquare/8))add(card,"kings_same_rank",{ourKing:squareName(ownKingSquare),enemyKing:squareName(enemyKingSquare)});
  const kingControlledPromotions=ownPawnSquares.filter(p=>attacksSquare(board,ownKingSquare,idx(p%8,rootSide==="w"?7:0)));
  if(kingControlledPromotions.length)add(card,"our_king_controls_own_pawn_promotion_square",{king:squareName(ownKingSquare),pawns:kingControlledPromotions.map(p=>({pawn:squareName(p),promotion:squareName(idx(p%8,rootSide==="w"?7:0))}))});
  const noFartherPawns=ownPawnSquares.filter(p=>distance(ownKingSquare,p)<=distance(enemyKingSquare,p));
  if(noFartherPawns.length)add(card,"our_king_no_farther_from_own_pawn",{ourKing:squareName(ownKingSquare),enemyKing:squareName(enemyKingSquare),pawns:noFartherPawns.map(p=>({pawn:squareName(p),ourDistance:distance(ownKingSquare,p),enemyDistance:distance(enemyKingSquare,p)}))});
  const closerPawns=ownPawnSquares.filter(p=>distance(ownKingSquare,p)<distance(enemyKingSquare,p));
  if(closerPawns.length)add(card,"our_king_closer_to_own_pawn",{ourKing:squareName(ownKingSquare),enemyKing:squareName(enemyKingSquare),pawns:closerPawns.map(p=>({pawn:squareName(p),ourDistance:distance(ownKingSquare,p),enemyDistance:distance(enemyKingSquare,p)}))});
  const pawnRaceEscapes=[];
  for(const pawn of enemyPawnSquares.filter(p=>passed(board,p))){
    const pawnSide=other(rootSide),[file,rank]=xy(pawn),promotion=idx(file,pawnSide==="w"?7:0),step=pawnSide==="w"?-8:8;
    const starting=rank===(pawnSide==="w"?1:6),doublePush=starting&&!board[pawn+step]&&!board[pawn+2*step];
    const pawnPushes=(pawnSide==="w"?7-rank:rank)-(doublePush?1:0),kingTempo=side===rootSide?1:0,kingDistance=distance(ownKingSquare,promotion);
    if(kingDistance>pawnPushes+kingTempo)pawnRaceEscapes.push({pawn:squareName(pawn),promotionSquare:squareName(promotion),pawnPushes,kingDistance,kingTempo,doublePush});
  }
  if(pawnRaceEscapes.length)add(card,"enemy_passer_outside_king_square",{king:squareName(ownKingSquare),races:pawnRaceEscapes,geometryOnly:true});
  const nearbyFilePawns=ownPawnSquares.filter(p=>Math.abs(p%8-ownKingSquare%8)===1&&distance(p,ownKingSquare)<=2);
  if(nearbyFilePawns.length)add(card,"king_near_neighboring_pawn_file",{king:squareName(ownKingSquare),pawns:nearbyFilePawns.map(squareName),fileDistance:1,maximumKingDistance:2});
  if(ownKingSquare>=0&&enemyKingSquare>=0&&(xy(ownKingSquare)[1]-xy(enemyKingSquare)[1])*(rootSide==="w"?1:-1)>0)add(card,"our_king_more_advanced",{ourKing:squareName(ownKingSquare),enemyKing:squareName(enemyKingSquare),promotionRank:rootSide==="w"?8:1});
  if(enemyPawnSquares.length===1&&enemyPawnSquares[0]%8>0&&enemyPawnSquares[0]%8<7)add(card,"enemy_one_nonrook_pawn",{pawn:squareName(enemyPawnSquares[0]),count:1});
  const pawnPairs=enemyPawnSquares.map(p=>({enemy:p,blocker:p+(rootSide==="w"?8:-8)})).filter(pair=>board[pair.blocker]?.color===rootSide&&board[pair.blocker]?.type==="p");
  if(side!==rootSide&&pawnPairs.length===enemyPawnSquares.length&&pawnPairs.length&&!enemyMoves.some(m=>m.mover.type==="p"))add(card,"enemy_pawn_locked",{pairs:pawnPairs.map(pair=>({enemy:squareName(pair.enemy),blocker:squareName(pair.blocker)})),legalPawnMoves:0});
  if(side!==rootSide&&pawnPairs.length&&!enemyMoves.some(m=>m.captured&&pawnPairs.some(pair=>m.capturedSquare===pair.blocker)))add(card,"blocking_pawn_not_capturable",{blockers:pawnPairs.map(pair=>squareName(pair.blocker)),legalCaptures:0});
  const guardedBlockers=pawnPairs.filter(pair=>distance(ownKingSquare,pair.blocker)===1);
  if(guardedBlockers.length)add(card,"our_king_guards_blocking_pawn",{king:squareName(ownKingSquare),blockers:guardedBlockers.map(pair=>squareName(pair.blocker))});
  const approaches=[];
  for(const p of enemyPawnSquares){
    const[f,r]=xy(p);
    for(const delta of[-1,1]){
      if(!inside(f+delta,r))continue;
      const flank=idx(f+delta,r),occupant=board[flank];
      if(distance(ownKingSquare,flank)>1||(occupant&&flank!==ownKingSquare))continue;
      if(enemyPawnSquares.some(q=>attacksSquare(board,q,flank)))continue;
      approaches.push({pawn:squareName(p),sideSquare:squareName(flank),route:ownKingSquare===flank?[squareName(ownKingSquare),squareName(p)]:[squareName(ownKingSquare),squareName(flank),squareName(p)],kingMoves:ownKingSquare===flank?1:2,defenderFileDistance:Math.abs(p%8-enemyKingSquare%8)});
    }
  }
  if(approaches.length)add(card,"king_near_pawn_pair_side",{king:squareName(ownKingSquare),approaches,defenderKingControlIncluded:false});
  const winningMargins=approaches.filter(a=>a.defenderFileDistance>=a.kingMoves+2);
  if(winningMargins.length)add(card,"king_pawn_pair_race_margin",{enemyKing:squareName(enemyKingSquare),approaches:winningMargins,minimumMargin:2});
  const decoys=ownPawnSquares.filter(p=>passed(board,p)&&enemyPawnSquares.length&&enemyPawnSquares.every(e=>Math.abs(p%8-e%8)>=3));
  if(decoys.length)add(card,"outside_pawn_decoy",{pawns:decoys.map(squareName),enemyPawns:enemyPawnSquares.map(squareName),minimumFileDistance:3});
  const corridors=pawnPairs.map(pair=>{const[f,r]=xy(pair.blocker),advance=rootSide==="w"?1:-1,blockers=ownPawnSquares.filter(p=>{const[pf,pr]=xy(p);return Math.abs(pf-f)<=1&&(pr-r)*advance>0;});return {blockingPawn:squareName(pair.blocker),files:[f-1,f,f+1].filter(x=>x>=0&&x<8).map(x=>FILES[x]),blockers:blockers.map(squareName)};}).filter(x=>!x.blockers.length);
  if(corridors.length)add(card,"pawn_promotion_corridor_clear",{corridors});
  const centralDistance=sq=>Math.max(0,3-sq%8,sq%8-4,3-Math.floor(sq/8),Math.floor(sq/8)-4);
  if(ownPawnSquares.some(p=>p%8<4)&&ownPawnSquares.some(p=>p%8>=4))add(card,"our_pawns_both_wings",{queenside:ownPawnSquares.filter(p=>p%8<4).map(squareName),kingside:ownPawnSquares.filter(p=>p%8>=4).map(squareName)});
  if(ownKingSquare>=0&&enemyKingSquare>=0&&centralDistance(ownKingSquare)<centralDistance(enemyKingSquare))add(card,"our_king_more_central",{ourKing:squareName(ownKingSquare),enemyKing:squareName(enemyKingSquare),ourDistance:centralDistance(ownKingSquare),enemyDistance:centralDistance(enemyKingSquare)});
  if(new Set(ownPawnSquares.map(p=>p%8)).size<ownPawnSquares.length)add(card,"our_doubled_pawns",{pawns:ownPawnSquares.map(squareName)});
  const vulnerablePawns=ownPawnSquares.filter(p=>distance(p,enemyKingSquare)<=2&&!attackers(board,p,rootSide).length);
  if(vulnerablePawns.length)add(card,"enemy_king_near_undefended_pawn",{king:squareName(enemyKingSquare),pawns:vulnerablePawns.map(squareName),maximumDistance:2});
  card.meta.boardRelations={};
  for(const color of [rootSide,other(rootSide)]){
    const prefix=color===rootSide?"our":"enemy",pieces=squares(board,color),nonKings=pieces.filter(s=>board[s].type!=="k");
    const attacked=nonKings.map(square=>({square,by:attackers(board,square,other(color))})).filter(r=>r.by.length);
    const loose=nonKings.filter(square=>!attackers(board,square,color).length);
    const sole=nonKings.map(square=>({square,defenders:attackers(board,square,color)})).filter(r=>r.defenders.length===1);
    const pinned=pins(board,color),passers=squares(board,color,"p").filter(pawn=>passed(board,pawn));
    card.meta.boardRelations[prefix]={attacked:clone(attacked),loose:clone(loose),soleDefended:clone(sole),pinned:clone(pinned),passers:clone(passers)};
    if(color!==rootSide&&passers.length)add(card,"enemy_passer",witnessesAt(board,passers));
    const alignment=aligned(board,color);
    const queens=squares(board,color,"q");if(queens.length)add(card,`${prefix}_queen_present`,witnessesAt(board,queens));
    const seventh=squares(board,color,"p").filter(p=>Math.floor(p/8)===(color==="w"?1:6));
    if(color!==rootSide&&seventh.length)add(card,"enemy_pawn_on_seventh",witnessesAt(board,seventh));
  }
}
function newPinKey(pin){return `${pin.piece}:${pin.king}:${pin.attacker}`;}
function geometricTravelLowerBound(piece,from,to) {
  const [ff,fr]=xy(from),[tf,tr]=xy(to),df=Math.abs(tf-ff),dr=Math.abs(tr-fr);
  if(from===to)return 0;
  if(piece.type==="k")return Math.max(df,dr);
  if(piece.type==="n"){
    let n=Math.max(Math.ceil(Math.max(df,dr)/2),Math.ceil((df+dr)/3));
    if(n%2!==(df+dr)%2)n++;
    return n;
  }
  if(piece.type==="r")return df===0||dr===0?1:2;
  if(piece.type==="b")return (df+dr)%2?Infinity:df===dr?1:2;
  if(piece.type==="q")return df===0||dr===0||df===dr?1:2;
  const direction=piece.color==="w"?1:-1,forward=(tr-fr)*direction;
  const start=fr===(piece.color==="w"?1:6),canDouble=start&&forward>=2&&df<forward;
  const direct=forward>0&&df<=forward?forward-(canDouble?1:0):Infinity;
  const promotionRank=piece.color==="w"?7:0;
  const promotionMoves=Math.abs(promotionRank-fr)-(start?1:0);
  // Allow promotion on any file reachable by diagonal captures; ignore the
  // need for capture targets. This deliberately makes the enemy faster.
  let promoted=Infinity;
  for(let file=0;file<8;file++)if(Math.abs(file-ff)<=Math.abs(promotionRank-fr))
    promoted=Math.min(promoted,promotionMoves+geometricTravelLowerBound({type:"q",color:piece.color},idx(file,promotionRank),to));
  return Math.min(direct,promoted);
}

function moveFacts(card,parent,before,after,move) {
  const side=move.mover.color,enemy=other(side),from=move.from,to=move.to,captured=move.captured,captureAt=move.capturedSquare;
  const mover=after[to],king=kingSquare(after,enemy),beforeKing=kingSquare(before,side),checking=king<0?[]:attackers(after,king,side);
  const originalChecks=beforeKing<0?[]:attackers(before,beforeKing,enemy);
  const abreastPawns=squares(after,side,"p").filter(p=>Math.floor(p/8)===Math.floor(to/8)&&Math.abs(p%8-to%8)===1);
  if(abreastPawns.length)add(card,"abreast_friendly_pawn",{movedPiece:squareName(to),pieceType:mover.type,neighbors:abreastPawns.map(squareName),relation:"same-rank adjacent-file pawn"});
  if(checking.length)add(card,"check",{king:squareName(king),checkers:witnessesAt(after,checking)});
  if(captured){
    add(card,"capture",{piece:captured.type,square:squareName(captureAt)});
    if(["n","b","r","q"].includes(captured.type))add(card,"capture_piece",{piece:captured.type,square:squareName(captureAt),value:VALUES[captured.type]});
    if(VALUES[captured.type]===3)add(card,"capture_minor",{piece:captured.type,square:squareName(captureAt),value:3});
    const difference=VALUES[captured.type]-VALUES[move.mover.type];
    if(difference<=-5)add(card,"capture_sacrifices_at_least_rook",{captured:VALUES[captured.type],mover:VALUES[move.mover.type],difference,threshold:5});
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
  }
  if(side==="w"?xy(to)[1]>xy(from)[1]:xy(to)[1]<xy(from)[1])add(card,"move_advances",{from:squareName(from),to:squareName(to),side});
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
    const ahead=Array.from({length:pawnPushes},(_,n)=>idx(pawnFile,pawnRank+(n+1)*(side==="w"?1:-1)));
    if(ahead.length&&ahead.every(s=>!after[s]))add(card,"pawn_promotion_path_clear",{pawn:squareName(to),path:ahead.map(squareName),occupiedSquares:0});
    const race=ahead.map((target,n)=>({square:squareName(target),pawnMoves:n+1,enemyCaptureDeadline:n+2,
      enemy:squares(after,enemy).map(square=>({piece:after[square].type,from:squareName(square),
        geometricMoves:geometricTravelLowerBound(after[square],square,target)}))}));
    if(race.length&&race.every(r=>r.enemy.every(p=>p.geometricMoves>r.enemyCaptureDeadline)))
      add(card,"pawn_promotion_interception_margin",{pawn:squareName(to),route:race,
        method:"Geometric travel lower bounds only; no successor boards, search, occupancy, checks or defenses."});
    if(pawnPushes>0&&kingDistance>pawnPushes+kingTempo)add(card,"pawn_outruns_king",{from:squareName(from),to:squareName(to),enemyKing:squareName(king),promotionSquare:squareName(promotionSquare),pawnPushes,kingDistance,kingTempo,geometryOnly:true});
  }
  if(move.mover.type==="k"){
    if(side==="w"?xy(to)[1]<xy(from)[1]:xy(to)[1]>xy(from)[1])add(card,"king_retreats",{from:squareName(from),to:squareName(to),homeRank:side==="w"?1:8});
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
  const kingBattery=[];
  for(const rear of squares(after,side)){
  for(const [df,dr] of rayDirections){
    if(!sliderUses(after[rear],df,dr))continue;
    const [ff,rr]=xy(rear);let front=null;
    for(let f=ff+df,r=rr+dr;inside(f,r);f+=df,r+=dr){
      const sq=idx(f,r),pc=after[sq];if(!pc)continue;
      if(front===null&&pc.color===side){front=sq;continue;}
      if(front!==null&&pc.color===enemy&&pc.type==="k")kingBattery.push({rear:squareName(rear),front:squareName(front),king:squareName(sq)});
      break;
    }
  }
  }
  if(kingBattery.length)add(card,"king_battery",{rays:kingBattery,geometryOnly:true});
  const promotionBlockers=squares(after,side,"p").filter(pawn=>xy(pawn)[1]===(side==="w"?6:1)).map(pawn=>({pawn,blocker:pawn+(side==="w"?-8:8)})).filter(x=>after[x.blocker]?.color===enemy&&after[x.blocker].type!=="k"&&attacked.includes(x.blocker));
  if(promotionBlockers.length)add(card,"attacks_promotion_blocker",{attacker:squareName(to),targets:promotionBlockers.map(x=>({pawn:squareName(x.pawn),blocker:squareName(x.blocker),blockerType:after[x.blocker].type}))});
  const rookTargets=attacked.filter(target=>after[target].type==="r");
  if(rookTargets.length)add(card,"attacks_rook",{attacker:squareName(to),targets:witnessesAt(after,rookTargets)});
  const kingPieceTargets=mover.type==="k"?attacked.filter(target=>["n","b","r","q"].includes(after[target].type)):[];
  if(kingPieceTargets.length)add(card,"king_attacks_piece",{king:squareName(to),targets:witnessesAt(after,kingPieceTargets)});
  const queens=attacked.filter(target=>after[target].type==="q");
  if(queens.length)add(card,"attacks_queen",{attacker:squareName(to),queens:queens.map(squareName)});
  if(mover.type==="q"&&queens.length)add(card,"queen_attacks_queen",{attacker:squareName(to),queens:queens.map(squareName)});
  const equalTargets=attacked.filter(target=>!["p","k"].includes(after[target].type)&&VALUES[after[target].type]===VALUES[mover.type]);
  if(equalTargets.length)add(card,"attack_equal_piece",{attacker:squareName(to),attackerValue:VALUES[mover.type],targets:witnessesAt(after,equalTargets)});
  const higher=attacked.filter(target=>after[target].type!=="k"&&VALUES[after[target].type]>VALUES[mover.type]);
  if(mover.type!=="k"&&higher.length)add(card,"attack_higher",{attacker:squareName(to),attackerValue:VALUES[mover.type],targets:witnessesAt(after,higher)});
  const loose=attacked.filter(target=>after[target].type!=="k"&&!attackers(after,target,enemy).length);
  if(loose.length)add(card,"attack_loose",{attacker:squareName(to),targets:loose.map(squareName)});
  const enemyPins=pins(after,enemy);
  const defenders=attacked.map(target=>({target,defends:squares(after,enemy).filter(t=>t!==target&&after[t].type!=="k"&&attacksSquare(after,target,t))})).filter(r=>r.defends.length);
  const ourTargets=squares(after,side).filter(target=>target!==to&&after[target].type!=="k"&&before[target]?.color===side&&attacksSquare(after,to,target));
  const defendedAttacked=ourTargets.filter(target=>["n","b","r","q"].includes(after[target].type)&&attackers(before,target,enemy).length),defendedLoose=ourTargets.filter(target=>!attackers(before,target,side).length);
  const defendedPieces=squares(after,side).filter(target=>target!==to&&["n","b","r","q"].includes(after[target].type)&&attacksSquare(after,to,target));
  if(defendedPieces.length)add(card,"defend_piece",{defender:squareName(to),targets:defendedPieces.map(squareName)});
  const defendedQueens=defendedPieces.filter(s=>after[s].type==="q");
  if(defendedQueens.length)add(card,"defend_queen",{defender:squareName(to),targets:defendedQueens.map(squareName)});
  if(defendedAttacked.length)add(card,"defend_attacked",{defender:squareName(to),targets:defendedAttacked.map(squareName)});
  if(defendedLoose.length)add(card,"defend_loose",{defender:squareName(to),targets:defendedLoose.map(squareName)});
  const beforePins=new Set(pins(before,enemy).map(newPinKey)),newPins=enemyPins.filter(pin=>!beforePins.has(newPinKey(pin)));
  const outnumberedNewPins=newPins.filter(pin=>pin.attacker===to&&!pins(before,enemy).some(old=>old.piece===pin.piece&&old.king===pin.king&&old.attacker===from)).map(pin=>({...pin,ourAttackers:attackers(after,pin.piece,side),theirDefenders:attackers(after,pin.piece,enemy)})).filter(pin=>pin.ourAttackers.length>pin.theirDefenders.length);
  if(outnumberedNewPins.length)add(card,"creates_outnumbered_pin",{attacker:squareName(to),targets:outnumberedNewPins.map(pin=>({piece:squareName(pin.piece),king:squareName(pin.king),attackers:pin.ourAttackers.map(squareName),defenders:pin.theirDefenders.map(squareName)})),geometryOnly:true});
  const higherPinnedTargets=newPins.filter(pin=>pin.attacker===to&&VALUES[after[pin.piece].type]>VALUES[mover.type]);
  if(higherPinnedTargets.length)add(card,"pins_higher_piece",{attacker:squareName(to),attackerValue:VALUES[mover.type],pins:higherPinnedTargets.map(pin=>({piece:squareName(pin.piece),pieceValue:VALUES[after[pin.piece].type],king:squareName(pin.king),attacker:squareName(pin.attacker)}))});
  const occupiedPawnFrontSquares=squares(after,enemy,"p").filter(pawn=>pawn+(enemy==="w"?-8:8)===to);
  if(occupiedPawnFrontSquares.length)add(card,"blocks_enemy_pawn",{occupant:squareName(to),pawns:occupiedPawnFrontSquares.map(squareName)});
  const guardedPromotionSquares=squares(after,enemy,"p").map(pawn=>({pawn,square:idx(pawn%8,enemy==="w"?7:0)})).filter(x=>attacksSquare(after,to,x.square));
  if(guardedPromotionSquares.length)add(card,"guard_promotion_square",{guard:squareName(to),targets:guardedPromotionSquares.map(x=>({pawn:squareName(x.pawn),promotionSquare:squareName(x.square)}))});
  const blocked=squares(after,enemy,"p").filter(pawn=>passed(after,pawn)&&pawn+(enemy==="w"?-8:8)===to);
  const beforeFlights=kingFlights(before,enemy),afterFlights=kingFlights(after,enemy);
  if(afterFlights.length<beforeFlights.length)add(card,"restricts_king",{king:squareName(king),before:beforeFlights.map(squareName),after:afterFlights.map(squareName)});
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
  if(move.mover.type!=="k"){
    const interposed=originalChecks.filter(checker=>{
      if(!["b","r","q"].includes(before[checker].type))return false;
      const[cf,cr]=xy(checker),[kf,kr]=xy(beforeKing),sf=Math.sign(kf-cf),sr=Math.sign(kr-cr);
      for(let f=cf+sf,r=cr+sr;f!==kf||r!==kr;f+=sf,r+=sr)if(idx(f,r)===to)return true;
      return false;
    });
  }

}

export class ScratchChessOracle {
  constructor(config={}) {
    if(typeof config.createGame!=="function")throw new TypeError("createGame(options) is required");
    this.createGame=config.createGame;
    this.options={reply_limit:config.reply_limit??4,reply_class_limit:config.reply_class_limit??4,objective_gain:2,max_positions:config.max_positions??10000,attack_min_value:config.attack_min_value??0};
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
    if(!card.prepared){const game=this._game(card.fen,card.display);boardFacts(card,game,this.rootSide,this.rootMaterial);card.prepared=true;this.stats.descriptorPositions++;}
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
    observeQueenKingProximity(card,game.state.board,this.rootSide);
    observeQueenDestinations(card,game,this.rootSide);
    const pinnedEnemyQueens=pins(game.state.board,other(this.rootSide)).filter(pin=>game.state.board[pin.piece].type==="q");
    if(pinnedEnemyQueens.length)add(card,"enemy_queen_pinned",{pins:pinnedEnemyQueens.map(pin=>({queen:squareName(pin.piece),king:squareName(pin.king),pinner:squareName(pin.attacker)}))});
    if(card.predicates.includes("check")){
      const replies=legalMoveRecords(game);
      // These legal checking replies are already generated; expose capture availability for selection.
      if(move.mover.color===this.rootSide){
        const captureReplies=replies.filter(reply=>reply.captured).map(reply=>reply.uci);
        if(captureReplies.length)add(card,"enemy_capture_available",{side:game.state.side,moves:captureReplies});
      }
      if(!replies.length)add(card,move.mover.color===this.rootSide?"mate":"mated",{side:game.state.side,king:squareName(kingSquare(game.state.board,game.state.side)),legalMoves:0});
      if(replies.length&&replies.every(reply=>reply.mover.type!=="k"&&!reply.captured))add(card,"check_requires_interposition",{side:game.state.side,legalReplies:replies.map(reply=>reply.uci),count:replies.length});
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
      card.meta.operationalStatuses=[...OPERATIONAL_PREDICATE_IDS];
      card.predicates.push(...OPERATIONAL_PREDICATE_IDS.filter(status=>!card.predicates.includes(status)));
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
    if(snapshot.stateKind==="inspect")this.preparePosition(id);
    if(snapshot.stateKind==="search")this.expandPosition(id);
    this._syncCardToRunner(runner,id);const added=[...this.cards.keys()].filter(key=>!previous.has(key));
    for(const child of this.cards.get(id)?.children||[])this._syncCardToRunner(runner,child);
    return{changed:true,added};
  }
  summary(){return{version:SCRATCHCHESS_ORACLE_VERSION,horizon:1,terminalProbe:SCRATCHCHESS_ORACLE_TERMINAL_PROBE,puzzle:clone(this.puzzle),rootSide:this.rootSide,rootMaterial:this.rootMaterial,cards:this.cards.size,prepared:[...this.cards.values()].filter(c=>c.prepared).length,expanded:[...this.cards.values()].filter(c=>c.expanded).length,options:clone(this.options),predicateCount:PREDICATE_IDS.length,stats:clone(this.stats)};}
}
export function createScratchChessOracle(options){return new ScratchChessOracle(options);}
export default createScratchChessOracle;
