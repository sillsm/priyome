/** Radical 2: one factual adapter and shared observation extension.
 * The policy JSON alone selects chess plans, moves, replies and stops.
 */
const PUBLISHED_FACTS=(()=>{
/** Unified Radical 2 observation module.
 * Packaging only: original factual adapter plus approved completion observations.
 * The JSON policy owns selection, transitions and stopping. No source-deck selector.
 * The separately exported reference auditor runs only after search.
 */
const CORE = (() => {
/** Radical 2 isolated deployment module.
 * Mechanically bundles the previously tested facts and pre-trainer Oracle.
 * No shared globals, search-engine changes, learned model or answer table.
 * The two IIFEs preserve the original modules' separate lexical scopes.
 * Source SHA-256 values and the bundling recipe are in the verification bundle.
 */
const FACT_MODULE = (() => {
/**
 * Annotation successor: chess facts only. No puzzle identifiers, source moves,
 * evaluation scores, card names, or search decisions enter this module.
 * Legal moves and actual move application use the site's unchanged ScratchChess.
 * Geometry uses a1=0 (ScratchChess uses a8=0). All conversions are explicit.
 */
const FACTS_VERSION = '1.2.1';
const VALUES = Object.freeze({p:1,n:3,b:3,r:5,q:9,k:0});
const other = c => c === 'w' ? 'b' : 'w';
const sq = s => s.charCodeAt(0)-97+8*(Number(s[1])-1);
const name = s => 'abcdefgh'[s&7]+(1+(s>>3));
const distance = (a,b) => Math.max(Math.abs((a&7)-(b&7)),Math.abs((a>>3)-(b>>3)));
const center = s => Math.min(...[27,28,35,36].map(t=>distance(s,t)));
const KING = [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
const KNIGHT = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const col = p => p === p.toUpperCase() ? 'w' : 'b';
const type = p => p.toLowerCase();
const valid = (x,y)=>x>=0&&x<8&&y>=0&&y<8;
const aligned = (a,b)=>a!==b&&((a&7)===(b&7)||(a>>3)===(b>>3)||Math.abs((a&7)-(b&7))===Math.abs((a>>3)-(b>>3)));
function between(a,b){
 if(!aligned(a,b))return [];
 const dx=Math.sign((b&7)-(a&7)),dy=Math.sign((b>>3)-(a>>3));const out=[];
 for(let x=(a&7)+dx,y=(a>>3)+dy;x!==(b&7)||y!==(b>>3);x+=dx,y+=dy)out.push(x+8*y);
 return out;
}
const placementKey=fen=>fen.split(/\s+/).slice(0,4).join(' ');
function placement(cells){let out=[];for(let r=7;r>=0;r--){let s='',z=0;for(let f=0;f<8;f++){let p=cells[r*8+f];if(!p)z++;else{if(z)s+=z;z=0;s+=p;}}if(z)s+=z;out.push(s);}return out.join('/');}
const same=(b,n,s)=>b.cells[s]&&b.cells[s]===n.cells[s];
function snapState(s){return {...s,board:s.board.map(p=>p?{...p}:null),castling:{...s.castling}};}

class ChessFacts {
 constructor(createGame,{cacheSize=18000}={}){
  if(typeof createGame!=='function')throw new TypeError('ChessFacts requires ScratchChess createGame');
  this.createGame=createGame;this.game=createGame();this.cacheSize=cacheSize;this.cache=new Map();
  this.counters={boardRequests:0,boardCacheHits:0,legalGenerations:0,legalMovesEnumerated:0,onePlyApplications:0,terminalProbeApplications:0,kingGeometryProbes:0,checkGeometryProbes:0};
 }
 board(fen){
  this.counters.boardRequests++;
  const key=placementKey(fen);let b=this.cache.get(key);
  if(b){this.counters.boardCacheHits++;return b;}
  b=new FactBoard(this,key+' 0 1');this.cache.set(key,b);
  if(this.cache.size>this.cacheSize)this.cache.delete(this.cache.keys().next().value);
  return b;
 }
 legal(b){
  if(b._legal)return b._legal;
  this.counters.legalGenerations++;
  const g=this.game;g._applyFENToState(b.fen);let out=[];
  for(let i=0;i<64;i++){
   const original=g.state.board[i];if(!original||original.color!==b.turn)continue;const p={...original};
   const from=i^56;
   for(const j of g._legalMovesFrom(i)){
    const target=g.state.board[j];if(target?.type==='k')continue;
    const to=j^56;
    if(p.type==='p'&&((to>>3)===0||(to>>3)===7))for(const pr of ['q','r','b','n'])out.push(name(from)+name(to)+pr);
    else out.push(name(from)+name(to));
   }
  }
  out.sort();this.counters.legalMovesEnumerated+=out.length;b._legal=Object.freeze(out);return b._legal;
 }
 apply(b,u,probe=false){
  if(b._next.has(u))return this.board(b._next.get(u)+' 0 1');
  this.counters[probe?'terminalProbeApplications':'onePlyApplications']++;
  const g=this.game;g._applyFENToState(b.fen);
  g._applyMoveRaw(sq(u.slice(0,2))^56,sq(u.slice(2,4))^56,u[4]||null);
  const n=this.board(g.exportFEN());b._next.set(u,n.key);return n;
 }
 mateInOne(b){
  if(b._m1!==null)return b._m1;
  const found=[];
  // Flat terminal certificate, not an engine search or continuation evaluator.
  for(const u of b.checkingMoves()){
   const n=this.apply(b,u,true);if(n.check()&&!n.legal().length)found.push(u);
  }
  b._m1=Object.freeze(found);return b._m1;
 }
 clear(){this.cache.clear();}
 summary(){return {...this.counters,cachedBoards:this.cache.size,cacheLimit:this.cacheSize};}
}
class FactBoard {
 constructor(service,fen){
  this.service=service;this.fen=fen;this.key=placementKey(fen);
  const [pos,t,cs,ep]=fen.split(' ');this.turn=t;this.rights=cs;this.ep=ep==='-'?null:sq(ep);this.cells=Array(64).fill('');
  let i=56;for(const ch of pos){if(ch==='/')i-=16;else if(/[1-8]/.test(ch))i+=+ch;else this.cells[i++]=ch;}
  this._legal=null;this._checking=null;this._m1=null;this._next=new Map();this._pins={};this._kingMoves={};this._attacks=new Map();this._attackers={w:Array.from({length:64},()=>[]),b:Array.from({length:64},()=>[])};
  this._pieces={w:[],b:[]};this._kings={};this._balance={w:0,b:0};
  for(let s=0;s<64;s++){const p=this.cells[s];if(!p)continue;const c=col(p);this._pieces[c].push(s);this._balance[c]+=VALUES[type(p)];if(type(p)==='k')this._kings[c]=s;}
  for(const c of ['w','b'])for(const s of this._pieces[c])for(const t of this.attacksFrom(s))this._attackers[c][t].push(s);
 }
 pieces(c=null,types='pnbrqk'){return (c?this._pieces[c]:[...this._pieces.w,...this._pieces.b]).filter(s=>types.includes(type(this.cells[s])));}
 king(c){return this._kings[c];}
 balance(c){return this._balance[c]-this._balance[other(c)];}
 total(){return this._balance.w+this._balance.b;}
 check(c=this.turn){return this.attackers(other(c),this.king(c)).length>0;}
 attackers(c,t){return this._attackers[c][t]||[];}
 attacked(c,t){return this.attackers(c,t).length>0;}
 attacksFrom(s){
  if(this._attacks.has(s))return this._attacks.get(s);
  const p=this.cells[s];if(!p)return [];const t=type(p),c=col(p),x=s&7,y=s>>3,out=[];
  if(t==='p'){for(const dx of [-1,1]){const yy=y+(c==='w'?1:-1);if(valid(x+dx,yy))out.push(x+dx+8*yy);}}
  else{
   const dirs=t==='n'?KNIGHT:t==='b'?KING.slice(0,4):t==='r'?KING.slice(4):KING;
   for(const [dx,dy] of dirs)for(let xx=x+dx,yy=y+dy;valid(xx,yy);xx+=dx,yy+=dy){let z=xx+8*yy;out.push(z);if(t==='n'||t==='k'||this.cells[z])break;}
  }
  this._attacks.set(s,out);return out;
 }
 /** Geometric checking test on the one-move placement. No second move is
  * generated or selected. Castling, en passant and underpromotion are explicit. */
 givesCheck(u){
  this.service.counters.checkGeometryProbes++;
  const cells=this.cells.slice(),a=sq(u.slice(0,2)),z=sq(u.slice(2,4)),p=cells[a],c=this.turn,k=this.king(other(c));
  cells[a]='';
  if(type(p)==='p'&&this.ep===z&&!cells[z]&&(a&7)!==(z&7))cells[z+(c==='w'?-8:8)]='';
  if(type(p)==='k'&&Math.abs((a&7)-(z&7))===2){const row=a&56,ra=row+((z&7)>(a&7)?7:0),rz=z+((z&7)>(a&7)?-1:1);cells[rz]=cells[ra];cells[ra]='';}
  cells[z]=u[4]?(c==='w'?u[4].toUpperCase():u[4]):p;
  for(let s=0;s<64;s++){
   const q=cells[s];if(!q||col(q)!==c)continue;const t=type(q),dx=(k&7)-(s&7),dy=(k>>3)-(s>>3),ax=Math.abs(dx),ay=Math.abs(dy);
   if(t==='p'){if(ax===1&&dy===(c==='w'?1:-1))return true;continue;}
   if(t==='n'){if(ax*ay===2)return true;continue;}
   if(t==='k'){if(Math.max(ax,ay)===1)return true;continue;}
   if(!((t!=='b'&&(dx===0||dy===0))||(t!=='r'&&ax===ay)))continue;
   let clear=true;for(const v of between(s,k))if(cells[v]){clear=false;break;}if(clear)return true;
  }
  return false;
 }
 checkingMoves(){if(this._checking===null)this._checking=Object.freeze(this.legal().filter(u=>this.givesCheck(u)));return this._checking;}
 legal(){return this.service.legal(this);}
 apply(u,probe=false){return this.service.apply(this,u,probe);}
 withTurn(c){return c===this.turn?this:this.service.board(`${placement(this.cells)} ${c} ${this.rights} - 0 1`);}
 captureSquare(u){const a=sq(u.slice(0,2)),z=sq(u.slice(2,4));if(this.cells[z])return z;if(type(this.cells[a])==='p'&&z===this.ep&&(a&7)!==(z&7))return z+(this.turn==='w'?-8:8);return null;}
 isCapture(u){return this.captureSquare(u)!==null;}
 passed(s){if(type(this.cells[s]||'')!=='p')return false;const c=col(this.cells[s]);return !this.pieces(other(c),'p').some(t=>Math.abs((s&7)-(t&7))<=1&&(c==='w'?(t>>3)>(s>>3):(t>>3)<(s>>3)));}
 pins(c){
  if(this._pins[c])return this._pins[c];const out=[];
  for(const s of this.pieces(other(c),'brq')){
   const p=type(this.cells[s]),dirs=p==='b'?KING.slice(0,4):p==='r'?KING.slice(4):KING;
   for(const [dx,dy] of dirs){let occ=[];for(let x=(s&7)+dx,y=(s>>3)+dy;valid(x,y);x+=dx,y+=dy){const t=x+8*y,q=this.cells[t];if(!q)continue;if(col(q)!==c)break;occ.push(t);if(occ.length===2){const [middle,back]=occ;const bp=type(this.cells[back]);if(type(this.cells[middle])!=='k'&&(bp==='k'||VALUES[bp]>VALUES[type(this.cells[middle])]))out.push({slider:s,middle,back,kind:bp==='k'?'absolute':'relative'});break;}}}
  }
  this._pins[c]=out;return out;
 }
 pinned(c,s){return this.pins(c).some(p=>p.middle===s&&p.kind==='absolute');}
 kingMoves(c){
  if(this._kingMoves[c])return this._kingMoves[c];const a=this.king(c),out=[];
  for(const z of this.attacksFrom(a)){
   const p=this.cells[z];if(p&&(col(p)===c||type(p)==='k'))continue;
   const cells=this.cells.slice();cells[z]=cells[a];cells[a]='';this.service.counters.kingGeometryProbes++;
   if(!attackedOnCells(cells,other(c),z))out.push(name(a)+name(z));
  }
  this._kingMoves[c]=out;return out;
 }
 mate(){return this.check()&&!this.legal().length;}
 san(u){
  const a=sq(u.slice(0,2)),z=sq(u.slice(2,4)),p=type(this.cells[a]),capture=this.isCapture(u);let s='';
  if(p==='k'&&Math.abs((a&7)-(z&7))===2)s=z>a?'O-O':'O-O-O';
  else{
   s=p==='p'?'':p.toUpperCase();
   if(p==='p'&&capture)s+='abcdefgh'[a&7];
   else if(p!=='p'){
    const peers=this.legal().filter(v=>v!==u&&v.slice(2,4)===u.slice(2,4)&&type(this.cells[sq(v.slice(0,2))])===p).map(v=>sq(v.slice(0,2)));
    if(peers.length){if(peers.every(t=>(t&7)!==(a&7)))s+='abcdefgh'[a&7];else if(peers.every(t=>(t>>3)!==(a>>3)))s+=1+(a>>3);else s+=name(a);}
   }
   s+=(capture?'x':'')+name(z);if(u.length===5)s+='='+u[4].toUpperCase();
  }
  const n=this.apply(u);return s+(n.check()?(n.legal().length?'+':'#'):'');
 }
}
function attackedOnCells(cells,c,t){
 const x=t&7,y=t>>3;
 for(const [dx,dy] of KNIGHT){let xx=x+dx,yy=y+dy;if(valid(xx,yy)&&cells[xx+8*yy]===(c==='w'?'N':'n'))return true;}
 const py=y+(c==='w'?-1:1);for(const dx of [-1,1])if(valid(x+dx,py)&&cells[x+dx+8*py]===(c==='w'?'P':'p'))return true;
 for(const [dx,dy] of KING)for(let xx=x+dx,yy=y+dy,step=1;valid(xx,yy);xx+=dx,yy+=dy,step++){const p=cells[xx+8*yy];if(!p)continue;if(col(p)===c){let ty=type(p);if(ty==='q'||ty==='k'&&step===1||ty==='b'&&dx&&dy||ty==='r'&&(!dx||!dy))return true;}break;}
 return false;
}
function rayRelations(b,c){
 const out=[];
 for(const s of b.pieces(c,'brq')){
  const t=type(b.cells[s]),dirs=t==='b'?KING.slice(0,4):t==='r'?KING.slice(4):KING;
  for(const [dx,dy] of dirs){let occ=[];for(let x=(s&7)+dx,y=(s>>3)+dy;valid(x,y);x+=dx,y+=dy){let z=x+8*y;if(b.cells[z]){occ.push(z);if(occ.length===2){out.push({slider:s,middle:occ[0],back:occ[1]});break;}}}}
 }
 return out;
}
function boardFacts(b,solver,initialBalance){
 const f={},add=(id,w)=>{f[id]=w||{};};const e=other(solver),bal=b.balance(solver);
 if(b.check())add('in_check',{king:name(b.king(b.turn)),checkers:b.attackers(other(b.turn),b.king(b.turn)).map(name)});
 add(bal>0?'material_up':bal<0?'material_down':'material_equal',{balance:bal});if(bal>initialBalance)add('material_improved',{initial:initialBalance,balance:bal,gain:bal-initialBalance});
 if(b.total()<=20)add('low_material',{total:b.total()});if(!b.pieces(null,'nbrq').length)add('pawn_endgame');
 for(const [c,prefix] of [[solver,'our'],[e,'enemy']]){
  const nonKing=b.pieces(c,'pnbrq'),at=nonKing.filter(s=>b.attacked(other(c),s)),un=nonKing.filter(s=>!b.attacked(c,s)),pins=b.pins(c);
  if(at.length)add(prefix+'_piece_attacked',{targets:at.map(name),attackers:at.map(s=>b.attackers(other(c),s).map(name))});
  if(un.length)add(prefix+'_piece_undefended',{targets:un.map(name)});
  const pinAbs=pins.filter(p=>p.kind==='absolute'),pinRel=pins.filter(p=>p.kind==='relative');
  if(pinAbs.length)add(prefix+'_piece_pinned',{relations:pinAbs});if(pinRel.length)add(prefix+'_piece_relative_pinned',{relations:pinRel});
  const passers=b.pieces(c,'p').filter(s=>b.passed(s));if(passers.length)add(prefix+'_passer',{pawns:passers.map(name)});
  const near=b.pieces(c,'p').filter(s=>(s>>3)===(c==='w'?6:1));if(near.length)add(prefix+'_pawn_near_promotion',{pawns:near.map(name)});
  const km=b.kingMoves(c);if(km.length<=2)add(prefix+'_king_restricted',{destinations:km});
  const men=b.pieces(c,'nbrqk'),pairs=[];for(let i=0;i<men.length;i++)for(let j=i+1;j<men.length;j++)if(aligned(men[i],men[j])&&between(men[i],men[j]).every(s=>!b.cells[s]))pairs.push([name(men[i]),name(men[j])]);
  if(pairs.length)add(prefix+'_alignment',{pairs});
 }
 const sole=b.pieces(e,'pnbrq').filter(s=>b.attackers(e,s).length===1);if(sole.length)add('enemy_piece_sole_defended',{targets:sole.map(name),defenders:sole.map(s=>name(b.attackers(e,s)[0]))});
 const blocked=rayRelations(b,solver).filter(r=>col(b.cells[r.middle])===solver&&col(b.cells[r.back])===e);if(blocked.length)add('our_piece_blocks_line',{relations:blocked});
 return f;
}
function moveFacts(b,u,previous=null,previousCapture=false,{expensive=true}={}){
 const a=sq(u.slice(0,2)),z=sq(u.slice(2,4)),p=type(b.cells[a]),c=b.turn,e=other(c),n=b.apply(u),mp=type(n.cells[z]),cap=b.captureSquare(u),f={};
 const add=(id,w)=>{f[id]=w||{};};add('legal_move',{uci:u});
 if(n.check()){add('check',{king:name(n.king(e)),checkers:n.attackers(c,n.king(e)).map(name)});if(!n.legal().length)add('mate',{king:name(n.king(e))});}
 if(cap!==null){
  const victim=type(b.cells[cap]),value=VALUES[victim],defs=b.attackers(e,cap);add('capture',{target:name(cap),piece:b.cells[cap],value});
  if(victim!=='p')add('capture_piece',{target:name(cap),piece:b.cells[cap]});
  if(p!=='k'){if(value>VALUES[p])add('capture_higher',{attacker:name(a),target:name(cap),attackerValue:VALUES[p],targetValue:value});if(value===VALUES[p])add('capture_equal',{value});}
  if(!defs.length)add('capture_undefended',{target:name(cap)});
  const defended=b.attacksFrom(cap).filter(t=>b.cells[t]&&col(b.cells[t])===e&&type(b.cells[t])!=='k');if(defended.length)add('capture_defender',{defender:name(cap),protected:defended.map(name)});
  if(b.attackers(e,b.king(c)).includes(cap))add('capture_checker',{checker:name(cap)});
  if(previous&&previousCapture&&cap===sq(previous.slice(2,4)))add('recapture',{previous,target:name(cap)});
  if(victim==='p'&&b.passed(cap))add('capture_passer',{target:name(cap)});
  const attacked=b.attacksFrom(cap).filter(t=>b.cells[t]&&col(b.cells[t])===c);if(attacked.length)add('capture_attacker',{attacker:name(cap),targets:attacked.map(name)});
 }
 if(p==='k'){
  add('king_move',{from:name(a),to:name(z)});if(b.check())add('king_escape',{from:name(a),to:name(z)});
  if(center(z)<center(a))add('king_centralizes',{before:center(a),after:center(z)});
  const nearer=n.pieces(null,'p').filter(t=>distance(z,t)<distance(a,t));if(nearer.length)add('king_toward_pawn',{pawns:nearer.map(name)});
  const nearPromotion=n.pieces(null,'p').filter(t=>n.passed(t)&&distance(z,(t&7)+(col(n.cells[t])==='w'?56:0))<distance(a,(t&7)+(col(n.cells[t])==='w'?56:0)));if(nearPromotion.length)add('king_toward_promotion',{pawns:nearPromotion.map(name)});
  const k=n.king(e);if(((k&7)===(z&7)||(k>>3)===(z>>3))&&distance(k,z)===2&&between(k,z).every(t=>!n.cells[t]))add('opposition',{kings:[name(z),name(k)]});
  if(Math.abs((a&7)-(z&7))===2)add('castle');
 }else if(b.check()&&!b.attackers(e,b.king(c)).includes(cap)){
  const checkers=b.attackers(e,b.king(c));if(checkers.some(t=>'brq'.includes(type(b.cells[t]))&&between(t,b.king(c)).includes(z)))add('block_check',{square:name(z),checkers:checkers.map(name)});
 }
 if(n.legal().length===1)add('forced_reply',{legalReplies:n.legal()});
 const oldAttackers=b.attackers(e,a),newAttackers=n.attackers(e,z),newDefenders=n.attackers(c,z);
 if(oldAttackers.length)add('move_attacked',{from:name(a),attackers:oldAttackers.map(name)});
 if(!newAttackers.length)add('piece_unattacked',{square:name(z)});if(newDefenders.length)add('piece_defended',{square:name(z),defenders:newDefenders.map(name)});
 // Legal capturability is deliberately different from geometric attack.
 if(p!=='k'&&newAttackers.length){const caps=n.legal().filter(v=>n.captureSquare(v)===z);if(caps.length)add('piece_capturable',{captures:caps});}
 const targets=n.attacksFrom(z).filter(t=>n.cells[t]&&col(n.cells[t])===e),nk=targets.filter(t=>type(n.cells[t])!=='k'),valuable=targets.filter(t=>type(n.cells[t])!=='p');
 if(nk.length)add('attack_piece',{attacker:name(z),targets:nk.map(name)});
 const loose=nk.filter(t=>!n.attacked(e,t));if(loose.length)add('attack_loose',{attacker:name(z),targets:loose.map(name)});
 const higher=nk.filter(t=>mp!=='k'&&VALUES[type(n.cells[t])]>VALUES[mp]);if(higher.length)add('attack_higher',{attacker:name(z),targets:higher.map(name)});
 const queens=nk.filter(t=>type(n.cells[t])==='q');if(queens.length)add('attacks_queen',{attacker:name(z),targets:queens.map(name)});
 if(p==='k'){const kingsTargets=nk.filter(t=>type(n.cells[t])!=='p');if(kingsTargets.length)add('king_attacks_piece',{targets:kingsTargets.map(name)});}
 const defenders=targets.filter(t=>n.attacksFrom(t).some(s=>n.cells[s]&&col(n.cells[s])===e&&type(n.cells[s])!=='k'));
 if(defenders.length)add('attack_defender',{targets:defenders.map(name)});
 const pinned=nk.filter(t=>n.pinned(e,t));if(pinned.length)add('attack_pinned',{targets:pinned.map(name)});
 if(valuable.length>=2)add('fork',{attacker:name(z),targets:valuable.map(name)});
 const threatening=targets.filter(t=>same(b,n,t)&&!b.attacksFrom(a).includes(t)&&b.attacksFrom(t).some(s=>b.cells[s]&&col(b.cells[s])===c));if(threatening.length)add('attack_attacker',{targets:threatening.map(name)});
 const friendly=n.attacksFrom(z).filter(t=>n.cells[t]&&col(n.cells[t])===c&&type(n.cells[t])!=='k'&&same(b,n,t));
 const fa=friendly.filter(t=>b.attacked(e,t)),fl=friendly.filter(t=>!b.attacked(c,t)),fp=friendly.filter(t=>n.passed(t));
 if(fa.length)add('defend_attacked',{targets:fa.map(name)});if(fl.length)add('defend_loose',{targets:fl.map(name)});if(fp.length)add('support_passer',{pawns:fp.map(name)});
 const opened=[];
 for(const s of n.pieces(c,'brq'))if(s!==z&&same(b,n,s))for(const t of n.attacksFrom(s))if(n.cells[t]&&col(n.cells[t])===e&&same(b,n,t)&&!b.attacksFrom(s).includes(t))opened.push({slider:name(s),target:name(t),blockers:between(s,t).filter(q=>b.cells[q]).map(name)});
 if(opened.length)add('open_line',{relations:opened});
 if('brq'.includes(mp)){
  const pins=n.pins(e).filter(r=>r.kind==='absolute'&&r.slider===z&&!b.pinned(e,r.middle));if(pins.length)add('pin_king',{pinned:pins.map(r=>name(r.middle)),relations:pins});
  const skew=rayRelations(n,c).filter(r=>r.slider===z&&col(n.cells[r.middle])===e&&col(n.cells[r.back])===e&&
   (type(n.cells[r.middle])==='k'?1000:VALUES[type(n.cells[r.middle])])>(type(n.cells[r.back])==='k'?1000:VALUES[type(n.cells[r.back])]));if(skew.length)add('skewer',{rays:skew.map(r=>({front:name(r.middle),behind:name(r.back)}))});
 }
 const newPins=n.pins(c),freed=b.pins(c).filter(r=>r.middle!==a&&same(b,n,r.middle)&&!newPins.some(nr=>nr.middle===r.middle));if(freed.length)add('unpin_piece',{relations:freed});
 const rp=n.pins(e).filter(r=>r.kind==='relative'),created=rp.filter(r=>r.slider===z&&!b.pins(e).some(o=>JSON.stringify(o)===JSON.stringify(r)));if(created.length)add('pin_piece',{relations:created});
 const attackedRel=rp.filter(r=>n.attacksFrom(z).includes(r.middle));if(attackedRel.length)add('attack_relative_pinned',{relations:attackedRel});
 const interference=[],blocked=[];
 for(const s of b.pieces(e,'brq'))if(same(b,n,s))for(const t of b.attacksFrom(s))if(b.cells[t]&&type(b.cells[t])!=='k'&&same(b,n,t)&&between(s,t).includes(z)&&!n.attacksFrom(s).includes(t))
  (col(b.cells[t])===e?interference:blocked).push({attacker:name(s),target:name(t)});
 if(interference.length)add('interfere_line',{square:name(z),relations:interference});if(blocked.length)add('block_attack',{square:name(z),relations:blocked});
 const kb=b.kingMoves(e).length,kn=n.kingMoves(e).length;if(kn<kb)add('restricts_king',{before:kb,after:kn});
 const ownBefore=b.kingMoves(c).length,ownAfter=n.kingMoves(c).length;if(ownAfter>ownBefore)add('increase_king_mobility',{before:ownBefore,after:ownAfter});
 if(p==='p'){
  if(cap===null)add('pawn_push',{from:name(a),to:name(z)});
  if(b.passed(a))add('advances_passer',{from:name(a),to:name(z)});else if(u.length===4&&n.passed(z))add('creates_passer',{square:name(z)});
  if(u.length===5){add('promote',{promotion:u[4],square:name(z)});if(u[4]!=='q')add('underpromote',{promotion:u[4]});}
 }
 const blockPassers=n.pieces(e,'p').filter(t=>n.passed(t)&&t+(e==='w'?8:-8)===z);if(blockPassers.length)add('block_passer',{pawns:blockPassers.map(name),square:name(z)});
 const control=n.pieces(e,'p').filter(t=>n.attacksFrom(z).includes((t&7)+(e==='w'?56:0)));if(control.length)add('control_promotion_square',{pawns:control.map(name)});
 const connected=board=>{let rr=board.pieces(c,'r');return rr.some((s,i)=>rr.slice(i+1).some(t=>board.attacksFrom(s).includes(t)));};if(connected(n)&&!connected(b))add('connect_rooks');
 if('rq'.includes(mp)&&!n.pieces(null,'p').some(t=>(t&7)===(z&7)))add('occupy_open_file',{file:'abcdefgh'[z&7]});
 if(mp==='r'&&(z>>3)===(c==='w'?6:1))add('rook_seventh',{square:name(z)});
 if('nbrq'.includes(p)){
  if(center(z)<center(a))add('centralize_piece',{before:center(a),after:center(z)});
  const count=(bd,s)=>bd.attacksFrom(s).filter(t=>!bd.cells[t]||col(bd.cells[t])!==c).length;
  let bef=count(b,a),aft=count(n,z);if(aft>bef)add('piece_more_mobile',{before:bef,after:aft});
 }
 if(expensive){
  if(!b.check()){const old=b.service.mateInOne(b.withTurn(e));if(old.length&&!b.service.mateInOne(n).length)add('prevents_mate_in_one',{previousThreats:old});}
  if(!n.check()){
   const pass=n.withTurn(c),mates=n.service.mateInOne(pass);if(mates.length)add('mate_threat',{moves:mates,hypotheticalPass:true});
   // Promotion opportunities use legal generation, not an advance approximation.
   if(pass.pieces(c,'p').some(t=>(t>>3)===(c==='w'?6:1))){const promos=pass.legal().filter(v=>v.length===5);if(promos.length)add('promotion_threat',{moves:promos,hypotheticalPass:true});}
  }
 }
 return f;
}

return {FACTS_VERSION, VALUES, other, sq, name, distance, between, ChessFacts, FactBoard, boardFacts, moveFacts};
})();

const ORACLE_MODULE = (() => {
const {ChessFacts,moveFacts,boardFacts,VALUES,other,sq,name} = FACT_MODULE;
/** Runtime bridge for the annotation successor. Uses the existing predicate.js API.
 * The Oracle reports facts and causal witnesses. It does not read test answers,
 * use Stockfish, score candidate moves, or trim the opponent's legal move set.
 */
const SUCCESSOR_ORACLE_VERSION='1.2.1';
const clone=x=>JSON.parse(JSON.stringify(x));
const type=p=>(p||'').toLowerCase();const color=p=>p===p.toUpperCase()?'w':'b';
const fullFen=(b,half,full)=>b.fen.split(' ').slice(0,4).join(' ')+` ${half} ${full}`;

/** Link a candidate reply to actual preceding demands, not to an unrelated pawn.
 * All replies are kept in this first executable pass. Classifying purpose is
 * not a proof that a defender succeeds or that an unmodeled move is irrelevant.
 */
function replyClass(before,last,b,u,f){
 if(!before||!last)return {card:'HOLD_POSITION',predicates:['legal_move'],links:[],reason:'No preceding move is available; retain the legal defense.'};
 const defender=b.turn,solver=other(defender),n=b.apply(u),a=sq(u.slice(0,2)),z=sq(u.slice(2,4)),lastFrom=sq(last.slice(0,2)),lastTo=sq(last.slice(2,4)),captured=b.captureSquare(u),links=[];
 const add=(id,target,reason)=>{if(f[id])links.push({predicate:id,target,reason});};
 if(b.check())for(const id of ['capture_checker','block_check','king_escape'])if(f[id]){add(id,name(b.king(defender)),'Answers the check created by the preceding move.');break;}
 if(before.isCapture(last)&&captured===lastTo)add('recapture',name(lastTo),'Recaptures the piece that made the preceding capture.');
 if(f.prevents_mate_in_one)add('prevents_mate_in_one',name(b.king(defender)),'Removes the preceding immediate mating threat.');
 const demands=[];
 for(const t of b.pieces(defender,'pnbrq')){
  const attackers=b.attackers(solver,t);if(!attackers.length)continue;
  const newAttackers=attackers.filter(s=>{
   const old=s===lastTo?lastFrom:s;
   return before.cells[t]!==b.cells[t]||before.cells[old]!==b.cells[s]||!before.attacksFrom(old).includes(t);
  });
  const loose=!b.attacked(defender,t),cheaper=attackers.some(s=>type(b.cells[s])==='k'||VALUES[type(b.cells[s])]<VALUES[type(b.cells[t])]);
  if(!newAttackers.length&&!loose&&!cheaper)continue;
  demands.push({target:name(t),attackers:attackers.map(name),newAttackers:newAttackers.map(name),value:VALUES[type(b.cells[t])]});
  if(captured!==null&&attackers.includes(captured))add('capture_attacker',name(t),`Captures ${name(captured)}, an attacker of ${name(t)}.`);
  if(a===t&&attackers.some(s=>n.cells[s]!==b.cells[s]||!n.attacksFrom(s).includes(z)))add('move_attacked',name(t),`Moves threatened ${name(t)} to ${name(z)} and escapes at least one identified attacker.`);
  if(n.cells[t]===b.cells[t]&&n.attacksFrom(z).includes(t)&&!beforeOrCurrentAttack(b,a,t))add('defend_attacked',name(t),`Adds a defender to threatened ${name(t)}.`);
  if(f.block_attack?.relations.some(r=>r.target===name(t)&&attackers.map(name).includes(r.attacker)))add('block_attack',name(t),'Interposes on the identified attack.');
  if(f.pin_king?.pinned.some(s=>attackers.map(name).includes(s)))add('pin_king',name(t),'Pins an identified attacker to its king.');
 }
 // A promotion defense must refer to an actually advanced opposing pawn.
 for(const t of b.pieces(solver,'p').filter(t=>(t>>3)===(solver==='w'?6:1))){
  if(captured===t)add(f.capture_passer?'capture_passer':'capture',name(t),'Captures the advanced opposing pawn.');
  if(f.block_passer?.pawns.includes(name(t)))add('block_passer',name(t),'Blocks the advanced opposing pawn.');
  if(f.control_promotion_square?.pawns.includes(name(t)))add('control_promotion_square',name(t),'Controls this advanced pawn’s promotion square.');
 }
 if(links.length){
  const unique=[...new Set(links.map(l=>l.predicate))];
  for(const id of ['check','mate_threat','attacks_queen'])if(f[id]&&!unique.includes(id)&&unique.length<3)unique.push(id);
  return {card:'REPAIR',predicates:unique.slice(0,3),links,demands,reason:links[0].reason};
 }
 let counter=['mate','check','mate_threat','promote','promotion_threat'].filter(id=>f[id]);
 const greatestDemand=Math.max(0,...demands.map(d=>d.value));
 if(!counter.length&&f.capture&&(f.capture.value>=greatestDemand||greatestDemand===0))counter.push(f.capture_higher?'capture_higher':f.capture_undefended?'capture_undefended':'capture');
 if(!counter.length){
  for(const id of ['attacks_queen','attack_higher','fork','attack_loose','attack_attacker']){
   const targets=f[id]?.targets||[];
   if(targets.some(t=>VALUES[type(n.cells[sq(t)])]>=greatestDemand)&&f[id]){counter.push(id);break;}
  }
 }
 if(counter.length)return {card:'COUNTER_THREAT',predicates:counter.slice(0,3),links:[],demands,reason:'Forcing or nominally comparable counterplay; effectiveness must be resolved by the search.'};
 const hold=['opposition','block_passer','control_promotion_square','defend_attacked','king_toward_promotion','advances_passer','move_attacked','increase_king_mobility','king_toward_pawn','capture','pawn_push','legal_move'].find(id=>f[id]);
 return {card:'HOLD_POSITION',predicates:[hold],links:[],demands,reason:'Retain unmodeled resistance. A missing causal explanation is not grounds to prune equality.'};
}
function beforeOrCurrentAttack(b,a,t){return b.attacksFrom(a).includes(t);}
const services=new WeakMap();
class SuccessorOracle{
 constructor({createGame,...options}){
  if(!services.has(createGame))services.set(createGame,new ChessFacts(createGame));this.facts=services.get(createGame);
  this.options=options;this.cards=new Map();this.rootId='root';this.policy=null;this.counts={prepared:0,generatedChildren:0,replyClasses:{REPAIR:0,COUNTER_THREAT:0,HOLD_POSITION:0},prunedReplies:0};
 }
 reset({fen,title='Predicate successor',policyDepth=7,previousMove=null,previousCapture=false,history=[]}={}){
  if(!fen||fen.split(/\s+/).length!==6)throw new Error('A complete six-field FEN is required');
  this.cards.clear();this.rootSide=fen.split(' ')[1];this.policyDepth=policyDepth;this.rootMaterial=this.facts.board(fen).balance(this.rootSide);this.puzzle={fen,title};
  this.counts={prepared:0,generatedChildren:0,replyClasses:{REPAIR:0,COUNTER_THREAT:0,HOLD_POSITION:0},prunedReplies:0};this.startCounters=this.facts.summary();
  this.cards.set('root',{id:'root',fen,display:title,label:title,side:'my',depth:0,predicates:[],facts:[],children:[],prepared:false,expanded:false,move:null,parent:null,
   meta:{lastMove:previousMove,lastCapture:previousCapture,priorFen:null,history:history.slice(),legalReplyCount:null,materialSwing:0},rawMoveFacts:{}});
  return this.getPosition('root');
 }
 createProject(policy,name='Annotation successor'){
  this.policy=policy;return {schema:'predicate-policy-dfa-lab/project-v3',name,initial:['root'],policy:clone(policy),positions:this.getPositions()};
 }
 getPosition(id){return this.cards.get(id)||null;}
 getPositions(){return [...this.cards.values()];}
 preparePosition(id){return this.expandPosition(id);}
 expandPosition(id){
  const c=this.cards.get(id);if(!c)throw new Error(`Unknown position ${id}`);if(c.prepared)return c;
  const b=this.facts.board(c.fen),own=this.rootSide,enemy=other(own),legal=b.legal(),raw=boardFacts(b,own,this.rootMaterial),f={...c.rawMoveFacts,...raw};
  const add=(id,w={})=>{f[id]=w;};
  const past=c.meta.history;const thisKey=b.key;
  if(past.includes(thisKey)){add('unexplorable',{reason:'Two-fold repetition on this line'});c.meta.safetyFailure='Two-fold repetition';}
  if(!legal.length){if(b.check())add('mate',{king:name(b.king(b.turn)),winner:other(b.turn)});else add('_terminal_stalemate');}
  if(Number(c.fen.split(' ')[4])>=100){add('unexplorable',{reason:'Fifty-move draw can be claimed'});c.meta.safetyFailure='Fifty-move draw';}
  const men=b.pieces(null,'pnbrq');if(!men.length||(men.length===1&&'nb'.includes(type(b.cells[men[0]])))){add('unexplorable',{reason:'Insufficient mating material'});c.meta.safetyFailure='Insufficient mating material';}
  const advanced=b.pieces(enemy,'p').filter(t=>b.passed(t)&&(enemy==='w'?(t>>3)>=5:(t>>3)<=2));if(advanced.length)add('enemy_advanced_passer',{pawns:advanced.map(name)});
  // Guard facts use only inventory and present geometric attacks.
  const attacked=b.pieces(own,'pnbrq').filter(s=>b.attacked(enemy,s));const exposed=attacked.reduce((v,s)=>v+VALUES[type(b.cells[s])],0);
  if(b.balance(own)>exposed)add('surplus_covers_attacked_material',{lead:b.balance(own),attackedValue:exposed,attacked:attacked.map(name)});
  const enemyBoard=b.withTurn(enemy);let enemyChecks=[],enemyPromotions=[],enemyMates=[];
  if(!b.check(own)){
   for(const u of enemyBoard.legal()){if(u.length===5)enemyPromotions.push(u);if(enemyBoard.givesCheck(u))enemyChecks.push(u);}
   if(enemyChecks.length)enemyMates=this.facts.mateInOne(enemyBoard);
  }else{enemyChecks=['current check'];}
  if(enemyChecks.length)add('enemy_check_available',{moves:enemyChecks});if(enemyPromotions.length)add('enemy_promotion_available',{moves:enemyPromotions});if(enemyMates.length)add('enemy_mate_threat',{moves:enemyMates});
  if(b.turn===enemy){
   const captures=legal.filter(u=>b.isCapture(u)),promos=legal.filter(u=>u.length===5),checks=b.checkingMoves();
   if(captures.length)add('capture_available',{moves:captures});if(promos.length)add('promotion_available',{moves:promos});if(checks.length)add('check_available',{moves:checks});
   if(!b.check()&&legal.length&&!captures.length&&!promos.length&&!checks.length)add('quiet',{legal:legal.length});
   const maxCapture=Math.max(0,...captures.map(u=>VALUES[type(b.cells[b.captureSquare(u)])]));if(b.balance(own)>maxCapture)add('surplus_covers_largest_legal_capture',{lead:b.balance(own),maxCapture});
  }
  const children=[];
  if(c.depth<this.policyDepth&&!c.meta.safetyFailure){
   const prior=c.meta.priorFen?this.facts.board(c.meta.priorFen):null;
   for(const u of legal){
    const n=b.apply(u),mf=moveFacts(b,u,c.meta.lastMove,c.meta.lastCapture),id=c.id+'/'+u,from=sq(u.slice(0,2)),to=sq(u.slice(2,4)),cap=b.captureSquare(u);
    // Continue the preceding tactical plan: collect a named attack target.
    // Targets come from the actual preceding move's causal inventory, never a
    // reference continuation. Follow a target that the reply moved elsewhere.
    if(b.turn===own && mf.capture && c.meta.replyClass?.demands?.length){
      const previous=c.meta.lastMove, movedFrom=previous?.slice(0,2),movedTo=previous?.slice(2,4);
      const matches=c.meta.replyClass.demands.filter(d=>mf.capture.target===(d.target===movedFrom?movedTo:d.target));
      if(matches.length)mf.capture_prior_target={target:mf.capture.target,demands:matches};
    }
    const reply=b.turn!==own?replyClass(prior,c.meta.lastMove,b,u,mf):null;
    if(reply)this.counts.replyClasses[reply.card]++;
    const fields=c.fen.split(' '),half=b.isCapture(u)||type(b.cells[from])==='p'?0:Number(fields[4])+1,full=Number(fields[5])+(b.turn==='b'?1:0);
    const child={id,fen:fullFen(n,half,full),display:b.san(u),label:b.san(u),side:n.turn===own?'my':'their',depth:c.depth+1,parent:c.id,
      predicates:Object.keys(mf),facts:Object.entries(mf).map(([id,w])=>`${id}: ${JSON.stringify(w)}`),rawMoveFacts:mf,children:[],prepared:false,expanded:false,
      move:{uci:u,san:b.san(u),from:name(from),to:name(to),side:b.turn,piece:type(b.cells[from]),mover:{type:type(b.cells[from]),color:b.turn},capture:cap!==null,captured:cap===null?null:{type:type(b.cells[cap]),color:other(b.turn)},promotion:u[4]||null},
      meta:{lastMove:u,lastCapture:b.isCapture(u),priorFen:c.fen,history:[...past,thisKey],legalReplyCount:null,materialSwing:n.balance(own)-this.rootMaterial,replyClass:reply}};
    children.push(child);this.cards.set(id,child);
   }
  }
  // At the depth boundary report actual move counts. An omitted frontier must
  // NEVER masquerade as zero legal replies in a universal predicate input.
  c.children=children.map(ch=>ch.id);c.meta.legalReplyCount=legal.length;
  c.predicates=Object.keys(f);c.facts=Object.entries(f).map(([id,w])=>`${id}: ${JSON.stringify(w)}`);c.observed=f;c.prepared=true;c.expanded=true;
  c.meta.materialSwing=b.balance(own)-this.rootMaterial;c.meta.materialBalance=b.balance(own);c.meta.attackedMaterial=exposed;
  if(children.some(ch=>ch.rawMoveFacts.check))c.predicates.push('check_available');if(children.some(ch=>ch.rawMoveFacts.capture))c.predicates.push('capture_available');
  this.counts.prepared++;this.counts.generatedChildren+=children.length;
  return c;
 }
 hydrateRunner(runner){
  const id=runner.runtime?.current?.id;if(!id)return {changed:false,added:[]};const c=this.cards.get(id);if(c?.prepared&&runner.positions.get(id)?.prepared)return {changed:false,added:[]};
  this.expandPosition(id);const ids=[id,...c.children];
  for(const k of ids){const raw=this.cards.get(k);runner.positions.set(k,raw);}
  // Runner's position map is authoritative during execution; avoid repeatedly
  // cloning every historical board into the initial serialized project.
  return {changed:true,added:c.children};
 }
 summary(){const after=this.facts.summary(),delta={};for(const [k,v] of Object.entries(after))if(typeof v==='number')delta[k]=v-(this.startCounters[k]||0);return {version:SUCCESSOR_ORACLE_VERSION,cards:this.cards.size,...this.counts,factWork:delta,cache:after};}
}

return {SuccessorOracle,replyClass,SUCCESSOR_ORACLE_VERSION};
})();

const Radical2Oracle = ORACLE_MODULE.SuccessorOracle;
const RADICAL2_ORACLE_VERSION = ORACLE_MODULE.SUCCESSOR_ORACLE_VERSION;
const Radical2Facts = FACT_MODULE;
const radical2ReplyClass = ORACLE_MODULE.replyClass;

/** Post-run source/reply-fixture assertions. The caller supplies a COMPLETED
 * snapshot. Expected moves and fixture labels never cross into the Oracle.
 * Matches pass 3's accepted-root traversal and annotation qualification.
 */
function auditRadical2Reference(snapshot, solutionUci, fixtures) {
  if (!Array.isArray(fixtures)) throw new Error('Radical 2 reply fixtures must be an array');
  const expected = String(solutionUci || '').trim().split(/\s+/).filter(Boolean);
  if (!expected.length || expected.some(u => !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u))) {
    throw new Error('Radical 2 requires a valid complete LichessSolutionUCI');
  }
  const children = new Map(), nodes = new Map(snapshot.nodes.map(n => [n.occurrence, n]));
  for (const n of snapshot.nodes) if (n.parent) {
    if (!children.has(n.parent)) children.set(n.parent, []);
    children.get(n.parent).push(n);
  }
  const proof = new Set(), paths = new Set();
  function visit(occurrence) {
    const n = nodes.get(occurrence);
    if (!n || n.status !== 'accepted' || proof.has(occurrence)) return;
    proof.add(occurrence); paths.add(n.id);
    const accepted = (children.get(occurrence) || []).filter(c => c.status === 'accepted');
    if (n.depth % 2 === 0) { if (accepted.length) visit(accepted[0].occurrence); }
    else accepted.forEach(c => visit(c.occurrence));
  }
  if (snapshot.result === 'accept') snapshot.roots.forEach(visit);
  let sourcePliesCovered = 0, path = 'root';
  for (const u of expected) { path += '/' + u; if (!paths.has(path)) break; sourcePliesCovered++; }
  const trace = snapshot.trace || [];
  const selectedOccurrences = new Set(trace.filter(e => e.type === 'line-selected').map(e => e.item.occurrence));
  const selectedPaths = new Set(snapshot.nodes.filter(n => selectedOccurrences.has(n.occurrence)).map(n => n.id));
  const decisions = new Map(trace.filter(e => e.type === 'search-complete' && e.side === 'their' && proof.has(e.occurrence)).map(e => [e.position, e]));
  const issues = [];
  for (const fixture of fixtures) {
    if (!Array.isArray(fixture) || fixture.length !== 3 || !Number.isInteger(fixture[0]) ||
        fixture[0] < 1 || fixture[0] > expected.length || fixture[0] % 2 !== 1 ||
        !Array.isArray(fixture[1]) || !Array.isArray(fixture[2])) throw new Error('Invalid Radical 2 reply fixture');
    const [afterPly, relevant, notRelevant] = fixture;
    const parent = 'root/' + expected.slice(0, afterPly).join('/'), decision = decisions.get(parent);
    if (decision) {
      const admitted = new Set(decision.selected.map(c => c.id.split('/').at(-1)));
      const missing = relevant.filter(u => !admitted.has(u));
      if (missing.length) issues.push({afterPly, kind:'annotated_relevant_omitted', moves:missing});
    }
    const explored = notRelevant.filter(u => selectedPaths.has(parent + '/' + u));
    if (explored.length) issues.push({afterPly, kind:'annotated_not_relevant_explored', moves:explored});
  }
  return {sourcePliesCovered, sourcePlies:expected.length,
    sourcePathPass:snapshot.result === 'accept' && sourcePliesCovered === expected.length,
    replyFixturesPass:issues.length === 0, issues};
}

return {Radical2Oracle,RADICAL2_ORACLE_VERSION,Radical2Facts,radical2ReplyClass,auditRadical2Reference};
})();
const OBSERVATIONS = (() => {
const {Radical2Oracle, Radical2Facts}=CORE;
/** Observation-only extension for the five-position study.
 * The original Radical2Oracle is imported unchanged. No test data, case IDs,
 * FEN constants, source moves, search/score routines or reply labels are read.
 * Additional computations are geometric before/after observations only.
 */
const COMPLETION_OBSERVATIONS=(()=>{
/** Observation layer only. No puzzle IDs, FEN fixtures, source moves, engine scores,
 * decision trees, policy cards, or search recursion. The policy owns acceptance.
 */

const {other,sq,name,VALUES}=Radical2Facts;
const type=p=>(p||'').toLowerCase();
const distance=(a,b)=>Math.max(Math.abs((a&7)-(b&7)),Math.abs((a>>3)-(b>>3)));
const step=c=>c==='w'?8:-8;
const rank=(s,c)=>c==='w'?(s>>3):7-(s>>3);
const clearAhead=(b,p,c)=>{for(let z=p+step(c);z>=0&&z<64;z+=step(c))if(b.cells[z])return false;return true;};
const DEFINITIONS={
 "all_attacked_pawns_defended":"Every currently geometrically attacked solver pawn has at least one friendly geometric defender.",
 "multiple_own_pawns":"The solver has at least two pawns.",
 "material_lead_rook":"Solver material inventory balance is at least five.",
 "enemy_queen_absent":"The opponent has no queen.",
 "material_lead_queen":"Solver material inventory balance is at least nine.",
 "attacks_king_shelter":"The moved unit directly attacks an enemy pawn adjacent to the enemy king.",
 "king_rook_supported_file":"A solver king on its third rank and rook on its first rank share a file with an empty intervening square controlled by the king.",
 "rook_pawn_screen":"A friendly a- or h-pawn is on its second rank, screening a back-rank corner.",
 "king_on_home_two_ranks":"Solver king is on its first or second rank.",
 queens_absent:'Neither side has a queen.',
 connected_rooks:'Two solver rooks geometrically defend each other.',
 king_has_flight:'The solver king has a legal adjacent destination.',
 opposite_bishop_ending:'Exactly one bishop on each side, on opposite colors; no knight, rook or queen.',
 king_guards_next_two:'A solver king controls the next two empty advance squares of a non-rook passed pawn.',
 enemy_passers_blockaded:'At least one enemy passer exists and every enemy passer is physically blocked on its next square by a solver non-pawn unit.',
 passer_exposed:'At least one solver passer is geometrically attacked and undefended.',
 edge_king_barrier:'The enemy king is on an edge file, same rank as the solver king, with one file between them.',
 single_clear_majority_candidate:'Exactly one non-rook candidate on a solver-majority wing, unopposed on its file but not yet passed, with an entirely empty forward file. Subsequent candidate observations use this same unique witness.',
 candidate_exposed:'A solver candidate is attacked and undefended.',
 candidate_advance_ready:'A clear-file candidate has an immediate advance square which is unattacked or defended by the solver.',
 candidate_beyond_king:'A clear-file candidate lies on the opposite side of the solver king from an edge-confined enemy king.',
 enemy_king_blocks_passer:'An enemy king physically occupies the next square of an enemy passed pawn.',
 king_distance_exceeds_pushes:'For a clear-file candidate the enemy king distance to promotion exceeds the pawn push count. Distance observation only, not a race theorem.',
 queen_only_heavy:'Enemy has at least one queen but no rook or knight.',
 rook_shelter_corridor:'Solver king and rook on own back rank; the rook guards an empty horizontal route to a corner with a friendly pawn immediately in front.',
 compensated_piece_attacks:'Each attacked solver non-pawn is defended or each attacker is sole defender of an attacked enemy countertarget of at least equal value.',
 material_lead_minor:'Solver material inventory balance is at least three.',
 king_guards_rook_now:'The solver king geometrically defends a friendly rook on this board.',
 promotion_trade_margin:'Balance remains positive after any legal capture of the newly promoted piece, counting a geometrical unpinned nonking recapture at the same square.',
 counterchecks_land_on_controlled_squares:'Every legal opponent checking move ends on a square already geometrically controlled by the solver. This does not assert that taking the checker is legal or sufficient, nor that every check is a refuted move.',
 king_supports_next_two:'Moved king controls the next two empty advance squares of a friendly non-rook passed pawn.'
};
function boardObservation(b,solver,move=null){
 const enemy=other(solver),k=b.king(solver),ek=b.king(enemy),ps=b.pieces(solver,'p'),eps=b.pieces(enemy,'p'),out={};
 const add=(id,w={})=>out[id]=w;
 if(ps.length>=2)add('multiple_own_pawns',{pawns:ps.map(name)});
 if(!b.pieces(null,'q').length)add('queens_absent');
 const rr=b.pieces(solver,'r'),pairs=rr.flatMap((r,i)=>rr.slice(i+1).filter(s=>b.attacksFrom(r).includes(s)).map(s=>[name(r),name(s)]));
 if(pairs.length)add('connected_rooks',{pairs});
 if(b.kingMoves(solver).length)add('king_has_flight',{moves:b.kingMoves(solver)});
 if(rr.some(r=>rank(r,solver)===0&&(r&7)===(k&7)&&rank(k,solver)===2&&!b.cells[(r+k)/2]))add('king_rook_supported_file',{king:name(k),rooks:rr.filter(r=>rank(r,solver)===0&&(r&7)===(k&7)).map(name)});
 if(rr.some(r=>distance(k,r)===1))add('king_guards_rook_now',{king:name(k),rooks:rr.filter(r=>distance(k,r)===1).map(name)});
 const bishops=b.pieces(solver,'b'),eb=b.pieces(enemy,'b');
 if(!b.pieces(null,'nrq').length&&bishops.length===1&&eb.length===1&&((bishops[0]+(bishops[0]>>3))&1)!==((eb[0]+(eb[0]>>3))&1))add('opposite_bishop_ending');
 const runners=ps.filter(p=>b.passed(p));
 const guards=runners.filter(p=>(p&7)!==0&&(p&7)!==7&&p+2*step(solver)>=0&&p+2*step(solver)<64&&[p+step(solver),p+2*step(solver)].every(z=>!b.cells[z]&&distance(k,z)===1));
 if(guards.length)add('king_guards_next_two',{king:name(k),pawns:guards.map(name)});
 if(runners.some(p=>b.attacked(enemy,p)&&!b.attacked(solver,p)))add('passer_exposed');
 const epass=eps.filter(p=>b.passed(p));
 if(epass.some(p=>p+step(enemy)===ek))add('enemy_king_blocks_passer',{king:name(ek)});
 if(epass.length&&epass.every(p=>b.pieces(solver,'nbrqk').includes(p+step(enemy))))add('enemy_passers_blockaded',{pawns:epass.map(p=>({pawn:name(p),blocker:name(p+step(enemy))}))});
 if(((ek&7)===0||(ek&7)===7)&&(k>>3)===(ek>>3)&&Math.abs((k&7)-(ek&7))===2)add('edge_king_barrier',{ourKing:name(k),enemyKing:name(ek)});
 const candidates=ps.filter(p=>(p&7)!==0&&(p&7)!==7&&!b.passed(p)&&!eps.some(e=>(e&7)===(p&7)&&(solver==='w'?e>p:e<p)));
 if(candidates.some(p=>b.attacked(enemy,p)&&!b.attacked(solver,p)))add('candidate_exposed');
 const candidateMajority=candidates.filter(p=>{const wing=(p&7)>=4;return ps.filter(x=>((x&7)>=4)===wing).length>eps.filter(x=>((x&7)>=4)===wing).length});
 const clear=candidateMajority.length===1&&clearAhead(b,candidateMajority[0],solver)?candidateMajority:[];
 if(clear.length)add('single_clear_majority_candidate',{pawns:clear.map(name)});
 const ready=clear.filter(p=>!b.attacked(enemy,p+step(solver))||b.attacked(solver,p+step(solver)));
 if(ready.length)add('candidate_advance_ready',{pawns:ready.map(name)});
 if(out.edge_king_barrier){const a=clear.filter(p=>((p&7)-(k&7))*((ek&7)-(k&7))<0);if(a.length)add('candidate_beyond_king',{pawns:a.map(name)});}
 const late=clear.filter(p=>distance(ek,(p&7)+(solver==='w'?56:0))>7-rank(p,solver));
 if(late.length)add('king_distance_exceeds_pushes',{pawns:late.map(name),king:name(ek)});
 if(b.pieces(enemy,'q').length&&!b.pieces(enemy,'nr').length)add('queen_only_heavy');
 if(rank(k,solver)<=1)add('king_on_home_two_ranks');
 if(ps.some(p=>rank(p,solver)===1&&((p&7)===0||(p&7)===7)))add('rook_pawn_screen');
 if(rank(k,solver)===0){const corridors=[];for(const corner of solver==='w'?[0,7]:[56,63]){
   if(!ps.includes(corner+step(solver)))continue;const dx=Math.sign(corner-k);if(!dx)continue;let path=[];for(let z=k+dx;;z+=dx){path.push(z);if(z===corner)break;}
   for(const r of rr.filter(r=>rank(r,solver)===0))if(path.every(z=>!b.cells[z])&&((r&7)-(k&7))*((corner&7)-(k&7))<0&&Radical2Facts.between(r,corner).every(z=>!b.cells[z]||z===k))corridors.push({king:name(k),rook:name(r),corner:name(corner),pawn:name(corner+step(solver)),path:path.map(name)});
  }if(corridors.length)add('rook_shelter_corridor',{corridors});}
 const targets=b.pieces(solver,'nbrq').filter(t=>b.attacked(enemy,t)),comp=[];
 for(const t of targets){if(b.attacked(solver,t)){comp.push({target:name(t),defenders:b.attackers(solver,t).map(name)});continue;}
  const bound=b.attackers(enemy,t).map(a=>({a,counter:b.pieces(enemy,'pnbrq').filter(x=>x!==a&&VALUES[type(b.cells[x])]>=VALUES[type(b.cells[t])]&&b.attacked(solver,x)&&b.attackers(enemy,x).length===1&&b.attackers(enemy,x)[0]===a)}));
  if(bound.some(v=>!v.counter.length))break;comp.push({target:name(t),overload:bound.map(v=>({attacker:name(v.a),targets:v.counter.map(name)}))});
 }
 if(comp.length===targets.length)add('compensated_piece_attacks',{targets:comp});
 if(!b.pieces(enemy,'q').length)add('enemy_queen_absent');
 const attackedPawns=ps.filter(t=>b.attacked(enemy,t));if(attackedPawns.every(t=>b.attacked(solver,t)))add('all_attacked_pawns_defended',{pawns:attackedPawns.map(name)});
 const bal=b.balance(solver);if(bal>=5)add('material_lead_rook',{balance:bal});if(bal>=9)add('material_lead_queen',{balance:bal});if(bal>=3)add('material_lead_minor',{balance:bal});
 const turn=b.withTurn(enemy);
 if(move?.promotion && move.side===solver){const target=sq(move.to),defenders=b.attackers(solver,target).filter(t=>type(b.cells[t])!=='k'&&!b.pinned(solver,t));const caps=turn.legal().filter(u=>turn.captureSquare(u)===target);
  const losses=caps.map(u=>({move:u,loss:VALUES[type(b.cells[target])]-(defenders.length?VALUES[type(b.cells[sq(u.slice(0,2))])]:0)}));
  if(bal>Math.max(0,...losses.map(t=>t.loss)))add('promotion_trade_margin',{target:move.to,balance:bal,defenders:defenders.map(name),captures:losses});}
 if(!turn.checkingMoves().some(u=>!b.attacked(solver,sq(u.slice(2,4)))))add('counterchecks_land_on_controlled_squares');
 return out;
}
function moveObservation(b,u,n=b.apply(u)){
 const c=b.turn,z=sq(u.slice(2,4)),out={};
 if(!n.checkingMoves().some(v=>!n.attacked(c,sq(v.slice(2,4)))))out.counterchecks_land_on_controlled_squares={checkingMoves:n.checkingMoves()};
 if(type(b.cells[sq(u.slice(0,2))])!=='k')return out;
 const pawns=n.pieces(c,'p').filter(p=>(p&7)!==0&&(p&7)!==7&&n.passed(p)&&p+2*step(c)>=0&&p+2*step(c)<64&&[p+step(c),p+2*step(c)].every(s=>!n.cells[s]&&distance(z,s)===1));
 if(pawns.length)out.king_supports_next_two={king:name(z),pawns:pawns.map(name)};return out;
}
function replyObservation(b,u,n=b.apply(u)){
 const c=b.turn,e=other(c),z=sq(u.slice(2,4)),king=n.king(e);
 const targets=n.pieces(e,'p').filter(t=>distance(t,king)===1&&n.attacksFrom(z).includes(t));
 return targets.length?{attacks_king_shelter:{attacker:name(z),king:name(king),pawns:targets.map(name)}}:{};
}

return {boardObservation,moveObservation,replyObservation,DEFINITIONS};
})();
const {boardObservation,moveObservation,replyObservation,DEFINITIONS}=COMPLETION_OBSERVATIONS;
const {other,sq,name}=Radical2Facts;
const type=p=>(p||'').toLowerCase();
const step=c=>c==='w'?8:-8;
function opposed(b,s,c){return b.pieces(other(c),'p').some(t=>(t&7)===(s&7)&&(c==='w'?t>s:t<s));}
function opposition(b){const a=b.king('w'),z=b.king('b');return ((a&7)===(z&7)&&Math.abs((a>>3)-(z>>3))===2)||((a>>3)===(z>>3)&&Math.abs((a&7)-(z&7))===2);}
function oppositionClear(b){const a=b.king('w'),z=b.king('b');return opposition(b)&&!b.cells[(a+z)/2];}
const NEW_DEFINITIONS={...DEFINITIONS,
 king_to_edge_file:'The king moves from a non-edge file to the a-file or h-file. Geometry only; not a safety judgment.',
 attacks_passer:'The moved piece geometrically attacks an opposing passed pawn in the resulting position.',
 blocks_opposing_pawn:'The moved pawn ends directly in front of an opposing pawn on the same file.',
 keeps_opposition_geometry:'Both kings remain unmoved in rank/file opposition with one empty intervening square.',
 controls_passer_path:'The moved piece controls an empty forward-file square of an opposing passed pawn.',
 wing_pawn_majority:'The solver has more pawns than the opponent on at least one fixed half: a-d or e-h.',
 pawn_unopposed_on_file:'At least one solver pawn has no opposing pawn strictly ahead on the same file.',
 supports_pawn_advance:'The moved piece defends an empty square immediately ahead of a friendly pawn.',
 supported_unopposed_advance:'A solver pawn unopposed on its file has an empty immediate forward square geometrically defended by a friendly unit. Two related observations with the same pawn witness.',
 moved_pawn_unopposed_on_file:'The moved pawn has no opposing pawn ahead on its file in the resulting position; captures are included and adjacent sentries may remain.',
 king_can_capture_mover:'The opponent has a legal king capture of the moved piece.',
 king_defends_rook:'The moved king geometrically defends a friendly rook in the resulting position.'
};
function boardExtras(b,solver){
 const out={},own=b.pieces(solver,'p'),enemy=b.pieces(other(solver),'p');
 const halves=[0,1].map(h=>({half:h===0?'a-d':'e-h',ours:own.filter(s=>((s&7)<4?0:1)===h).map(name),theirs:enemy.filter(s=>((s&7)<4?0:1)===h).map(name)})).filter(h=>h.ours.length>h.theirs.length);
 if(halves.length)out.wing_pawn_majority={solver,halves};
 const unopposed=own.filter(s=>!opposed(b,s,solver));
 if(unopposed.length)out.pawn_unopposed_on_file={pawns:unopposed.map(name)};
 const supported=unopposed.map(s=>({s,z:s+step(solver)})).filter(({z})=>z>=0&&z<64&&!b.cells[z]&&b.attacked(solver,z));
 if(supported.length)out.supported_unopposed_advance={pawns:supported.map(({s,z})=>({pawn:name(s),advance:name(z),defenders:b.attackers(solver,z).map(name)}))};
 return out;
}
function moveExtras(b,u,n=b.apply(u)){
 const out={},c=b.turn,a=sq(u.slice(0,2)),z=sq(u.slice(2,4)),t=type(b.cells[a]),attacks=n.attacksFrom(z),enemy=other(c);
 const passers=n.pieces(enemy,'p').filter(s=>n.passed(s));
 const targets=passers.filter(s=>attacks.includes(s));
 if(targets.length)out.attacks_passer={piece:name(z),pawns:targets.map(name)};
 if(t==='p' && type(n.cells[z])==='p' && !opposed(n,z,c))out.moved_pawn_unopposed_on_file={pawns:[name(z)],mover:c};
 const kingCaptures=n.legal().filter(v=>sq(v.slice(0,2))===n.king(enemy)&&n.captureSquare(v)===z);
 if(kingCaptures.length)out.king_can_capture_mover={moves:kingCaptures};
 const target=z+step(c);
 if(t==='p'&&target>=0&&target<64&&type(n.cells[target])==='p'&&n.pieces(enemy,'p').includes(target))out.blocks_opposing_pawn={pawn:name(z),blocked:name(target)};
 if(b.king('w')===n.king('w')&&b.king('b')===n.king('b')&&oppositionClear(b)&&oppositionClear(n))out.keeps_opposition_geometry={kings:['w','b'].map(c=>name(n.king(c)))};
 const controlled=[];
 for(const p of passers)for(let x=p+step(enemy);x>=0&&x<64;x+=step(enemy))if(!n.cells[x]&&attacks.includes(x))controlled.push({pawn:name(p),square:name(x)});
 if(controlled.length)out.controls_passer_path={piece:name(z),squares:controlled};
 const support=n.pieces(c,'p').map(p=>({p,x:p+step(c)})).filter(({x})=>x>=0&&x<64&&!n.cells[x]&&attacks.includes(x));
 if(support.length)out.supports_pawn_advance={piece:name(z),pawns:support.map(({p,x})=>({pawn:name(p),advance:name(x)}))};
 if(t==='k'){
  if((z&7)===0||(z&7)===7)if((a&7)!==0&&(a&7)!==7)out.king_to_edge_file={from:name(a),to:name(z)};
  const rooks=n.pieces(c,'r').filter(p=>attacks.includes(p));
  if(rooks.length)out.king_defends_rook={king:name(z),rooks:rooks.map(name)};
 }
 return out;
}
class FiveStudyOracle extends Radical2Oracle{
 expandPosition(id){
  const c=super.expandPosition(id);
  if(c.studyAnnotated)return c;
  const b=this.facts.board(c.fen),extra={...boardExtras(b,this.rootSide),...boardObservation(b,this.rootSide,c.move)};
  Object.assign(c.observed,extra);c.predicates=[...new Set([...c.predicates,...Object.keys(extra)])];
  c.facts.push(...Object.entries(extra).map(([k,v])=>`${k}: ${JSON.stringify(v)}`));
  for(const childId of c.children){
   const child=this.getPosition(childId),f={...moveExtras(b,child.move.uci,this.facts.board(child.fen)),...moveObservation(b,child.move.uci,this.facts.board(child.fen)),...replyObservation(b,child.move.uci,this.facts.board(child.fen))};
   Object.assign(child.rawMoveFacts,f);child.predicates=[...new Set([...child.predicates,...Object.keys(f)])];
   child.facts.push(...Object.entries(f).map(([k,v])=>`${k}: ${JSON.stringify(v)}`));
  }
  c.studyAnnotated=true;return c;
 }
}

return {FiveStudyOracle,NEW_DEFINITIONS,boardExtras,moveExtras};
})();
const Radical2Oracle=OBSERVATIONS.FiveStudyOracle;
const RADICAL2_ORACLE_VERSION=CORE.RADICAL2_ORACLE_VERSION;
const Radical2Facts=CORE.Radical2Facts;
const radical2ReplyClass=CORE.radical2ReplyClass;
const auditRadical2Reference=CORE.auditRadical2Reference;
const completionObservationDefinitions=OBSERVATIONS.NEW_DEFINITIONS;

return {Radical2Oracle,Radical2Facts,RADICAL2_ORACLE_VERSION,radical2ReplyClass,auditRadical2Reference,completionObservationDefinitions};
})();
const INTEGRATED_FACTS=(()=>{
const {Radical2Oracle,Radical2Facts}=PUBLISHED_FACTS;
/** Ten-position study: factual extension only.
 * Reuses the delivered unified Radical 2 Oracle unchanged. No expected moves,
 * puzzle identifiers, source-ply counters, engine values or card selection.
 */
const {sq,name,other,VALUES}=Radical2Facts;
const type=p=>(p||'').toLowerCase();
const step=c=>c==='w'?8:-8;
const advanceRank=(s,c)=>c==='w'?(s>>3):7-(s>>3);
const distance=(a,b)=>Math.max(Math.abs((a&7)-(b&7)),Math.abs((a>>3)-(b>>3)));
const promotionCovered=(b,c,p,z)=>b.attackers(c,z).some(s=>!b.pinned(c,s))||b.pieces(c,'rq').some(s=>!b.pinned(c,s)&&(s&7)===(p&7)&&b.attacksFrom(s).includes(p));
const replyValue=(b,s)=>VALUES[type(b.cells[s])]||0;
const REPLY_DEFINITIONS={
 check_with_nonhanging_checker:{kind:'move',definition:'The move gives check and at least one actual checking unit either has an unpinned geometric defender or cannot be captured by any immediate legal check evasion. This distinguishes a supported check from an unrelated hanging-piece check; it is not a certificate about the whole checking combination.'},
 moves_priority_target_out_of_attack:{kind:'move',definition:'The defender moves a highest-value currently threatened target, at least as valuable as the immediately captured unit, to a square no longer attacked by any surviving identified attacker, with no unpinned cheaper attacker and no uncompensated geometric attacker. Moving along a pin while remaining attacked does not qualify. Target, old attackers and destination are recorded. This is a local escape relation, not a proof against tactics.'},
 moves_priority_target_into_defence:{kind:'move',definition:'An attacked priority target moves to newly acquired unpinned protection, with no remaining unpinned attacker cheaper than the target. This can answer the threat by making its capture an equal-or-worse exchange even when the original attack or pin remains; a queen newly protected against a pawn does not qualify.'},
 captures_priority_attacker:{kind:'move',definition:'Captures an identified attacker of one of the same highest-value threatened targets; unrelated attackers do not qualify.'},
 blocks_priority_attack:{kind:'move',definition:'Leaves a priority target in place and interposes so all of its identified, surviving attackers lose their direct attack.'},
 defends_priority_target:{kind:'move',definition:'Adds a new unpinned defender to a priority target attacked only by equal-or-higher-value units; merely defending a queen against a pawn or minor-piece attack does not qualify.'},
 pins_priority_attacker:{kind:'move',definition:'Newly pins an identified priority-target attacker to its king. The pin is a factual possible answer, not a guarantee that every capture along the pin is illegal.'},
 countercapture_covers_current_stake:{kind:'move',definition:'Actually captures at least the nominal current stake: the greater of the immediately captured unit and the most costly current material threat (defended victim less its least valuable unpinned attacker; undefended victim at full value). At least one pawn is required. If the capturing unit is undefended and can immediately be captured legally, subtract its value from the captured value. This is one-move exposure arithmetic, not recursive exchange search. Promotion/breakthrough urgency is handled explicitly by policy guards, not this material observation.'},
 counterattack_cancels_primary_exchange:{kind:'move',definition:'The moved unit or newly uncovered slider threatens a nominal gain equal to the current stake, and the attacked unit is a priority attacker or a geometric defender of that attacker. This directly challenges the same exchange, rather than admitting an unrelated equal-value threat.'},
 counterattack_exceeds_current_stake:{kind:'move',definition:'The moved unit, or a newly uncovered slider, attacks an opposing unit with a nominal gain strictly greater than that same stake. An already-existing unrelated attack is not enough, Geometric defense is counted; further tactics remain for the policy.'},
 challenges_advanced_runner:{kind:'move',definition:'Captures or newly directly attacks the opponent seventh-rank pawn, occupies its promotion square, or adds an unpinned controller of that square. Witnesses identify the pawn and its promotion square.'},
 challenges_moved_passer:{kind:'move',definition:'Captures, newly attacks, or obstructs the forward square of the passed pawn moved on the immediately preceding turn; this is not a generic response to any pawn on the board.'},
 supports_fast_counter_passer:{kind:'move',definition:'The moved unit newly supports an own sixth/seventh-rank passer, or the king approaches that passer promotion square while continuing to support it. Admitted only on the opposing pawn-breakthrough/promotion plan.'},
 advances_fast_counter_passer:{kind:'move',definition:'The moving passed pawn advances onto its sixth or seventh rank, creating or advancing an immediate promotion race. A distant pawn push or an undefended runner offered to an immediate legal capture is insufficient.'}
};
/** Material demands have the same present-board meaning as the core causal
 * inventory: new attacks, attacks on undefended targets, or cheaper attackers.
 * Retaining an existing cheaper attack matters after Kxg6 saves our queen.
 */
function replySubjects(before,last,b){
 if(!before||!last)return {targets:[],priority:[],stake:1,taken:0,previous:null};
 const defender=b.turn,solver=other(defender),a=sq(last.slice(0,2)),z=sq(last.slice(2,4));
 const captured=before.captureSquare(last),taken=captured===null?0:replyValue(before,captured),targets=[];
 for(const t of b.pieces(defender,'pnbrq')){
  const attackers=b.attackers(solver,t).filter(s=>!b.pinned(solver,s));if(!attackers.length)continue;
  const newer=attackers.filter(s=>{const old=s===z?a:s;return before.cells[t]!==b.cells[t]||before.cells[old]!==b.cells[s]||!before.attacksFrom(old).includes(t);});
  const value=replyValue(b,t),defended=b.attackers(defender,t).some(s=>!b.pinned(defender,s));
  const least=Math.min(...attackers.map(s=>replyValue(b,s)));
  if(!newer.length&&defended&&least>=value)continue;
  targets.push({target:t,value,attackers,newAttackers:newer,defended,nominalGain:defended?Math.max(0,value-least):value});
 }
 const maxTarget=Math.max(taken,0,...targets.map(t=>t.value));
 return {targets,priority:targets.filter(t=>t.value===maxTarget),stake:Math.max(1,taken,...targets.map(t=>t.nominalGain)),taken,previous:z};
}
function replyObservations(before,last,b,u,n,subjects=replySubjects(before,last,b)){
 const c=b.turn,e=other(c),from=sq(u.slice(0,2)),to=sq(u.slice(2,4)),cap=b.captureSquare(u),out={};
 const add=(key,w)=>{(out[key]??={witnesses:[]}).witnesses.push(w);};
 const newAttacks=n.attacksFrom(to),{priority,stake,taken}=subjects;
 if(n.check()){const checks=n.attackers(c,n.king(e)),supported=checks.filter(s=>n.attackers(c,s).some(a=>!n.pinned(c,a))||!n.legal().some(v=>n.captureSquare(v)===s));if(supported.length)add('check_with_nonhanging_checker',{king:name(n.king(e)),checkers:checks.map(name),supported:supported.map(name)});}
 for(const d of priority){const t=d.target,w={target:name(t),value:d.value,attackers:d.attackers.map(name),mover:name(from),destination:name(to),lastCapturedValue:taken};
  if(cap!==null&&d.attackers.includes(cap))add('captures_priority_attacker',{...w,capturedAttacker:name(cap)});
  if(from===t){
   const attackers=n.attackers(e,to).filter(s=>!n.pinned(e,s));
   const defended=n.attackers(c,to).some(s=>!n.pinned(c,s));
   if(!d.attackers.some(s=>n.cells[s]===b.cells[s]&&n.attacksFrom(s).includes(to))&&(!attackers.length||defended&&attackers.every(s=>replyValue(n,s)>=replyValue(n,to))))add('moves_priority_target_out_of_attack',{...w,remainingAttackers:attackers.map(name),defended});
   if(defended&&!b.attackers(c,t).some(s=>!b.pinned(c,s))&&attackers.length&&attackers.every(s=>replyValue(n,s)>=replyValue(n,to)))add('moves_priority_target_into_defence',{...w,remainingAttackers:attackers.map(name),defenders:n.attackers(c,to).filter(s=>!n.pinned(c,s)).map(name)});
  }else if(n.cells[t]===b.cells[t]){
   const remaining=d.attackers.filter(s=>n.cells[s]===b.cells[s]&&n.attacksFrom(s).includes(t));
   if(cap===null&&remaining.length===0&&d.attackers.some(s=>n.cells[s]===b.cells[s]))add('blocks_priority_attack',w);
   if(!n.pinned(c,to)&&newAttacks.includes(t)&&!b.attacksFrom(from).includes(t)&&remaining.length&&remaining.every(s=>replyValue(n,s)>=d.value))add('defends_priority_target',w);
   for(const a of remaining)if(n.pinned(e,a)&&!b.pinned(e,a))add('pins_priority_attacker',{...w,pinnedAttacker:name(a)});
  }
 }
 if(cap!==null){
  const unguarded=!n.attackers(c,to).some(s=>!n.pinned(c,s)), immediateCaptures=unguarded?n.legal().filter(v=>n.captureSquare(v)===to):[];
  const exposed=immediateCaptures.length?replyValue(n,to):0, netCapture=replyValue(b,cap)-exposed;
  if(netCapture>=stake)add('countercapture_covers_current_stake',{captured:name(cap),capturedValue:replyValue(b,cap),unguardedCapturerExposure:exposed,netCapture,immediateCaptures,stake,lastCapturedValue:taken});
 }
 for(const a of n.pieces(c,'pnbrqk')){
  if(n.pinned(c,a))continue;
  for(const t of n.attacksFrom(a)){
   if(!n.pieces(e,'pnbrq').includes(t))continue;
   if(a!==to&&b.cells[a]===n.cells[a]&&b.cells[t]===n.cells[t]&&b.attacksFrom(a).includes(t))continue;
   const defended=n.attackers(e,t).some(s=>!n.pinned(e,s)),gain=defended?Math.max(0,replyValue(n,t)-replyValue(n,a)):replyValue(n,t);
   if(gain===stake&&priority.some(d=>d.attackers.some(at=>t===at||b.attackers(e,at).includes(t))))add('counterattack_cancels_primary_exchange',{attacker:name(a),target:name(t),targetValue:replyValue(n,t),attackerValue:replyValue(n,a),defended,nominalGain:gain,stake,primary:priority.map(d=>({target:name(d.target),attackers:d.attackers.map(name)}))});
   if(gain>stake)add('counterattack_exceeds_current_stake',{attacker:name(a),target:name(t),targetValue:replyValue(n,t),attackerValue:replyValue(n,a),defended,nominalGain:gain,stake,lastCapturedValue:taken});
  }
 }
 for(const p of b.pieces(e,'p').filter(p=>advanceRank(p,e)===6)){
  const promotion=p+step(e),w={pawn:name(p),promotion:name(promotion),mover:name(from),destination:name(to)};
  if(cap===p)add('challenges_advanced_runner',{...w,action:'capture'});
  else if(!n.pinned(c,to)&&newAttacks.includes(p)&&!b.attacksFrom(from).includes(p)&&(promotionCovered(n,c,p,promotion)))add('challenges_advanced_runner',{...w,action:'attack pawn'});
  else if(to===promotion)add('challenges_advanced_runner',{...w,action:'occupy promotion square'});
  else if(!n.pinned(c,to)&&newAttacks.includes(promotion)&&!b.attacksFrom(from).includes(promotion))add('challenges_advanced_runner',{...w,action:'add promotion-square control'});
 }
 const moved=subjects.previous;
 if(moved!==null&&moved!==undefined&&type(b.cells[moved])==='p'&&b.passed(moved)){
  const next=moved+step(e),w={pawn:name(moved),next:name(next),mover:name(from),destination:name(to)};
  if(cap===moved||!n.pinned(c,to)&&newAttacks.includes(moved)&&(advanceRank(moved,e)<6||promotionCovered(n,c,moved,next))||to===next||!n.pinned(c,to)&&newAttacks.includes(next)&&!b.attacksFrom(from).includes(next))add('challenges_moved_passer',w);
 }
 for(const p of n.pieces(c,'p').filter(p=>n.passed(p)&&advanceRank(p,c)>=5)){
  const promotion=(p&7)+(c==='w'?56:0),distance=(a,z)=>Math.max(Math.abs((a&7)-(z&7)),Math.abs((a>>3)-(z>>3)));
  if(p===to&&type(b.cells[from])==='p'&&(!n.legal().some(v=>n.captureSquare(v)===p)||n.attackers(c,p).some(s=>!n.pinned(c,s))))add('advances_fast_counter_passer',{pawn:name(to),from:name(from),promotion:name(promotion)});
  if(p!==to&&!n.pinned(c,to)&&newAttacks.includes(p)&&(!b.attacksFrom(from).includes(p)||type(b.cells[from])==='k'&&distance(to,promotion)<distance(from,promotion)))add('supports_fast_counter_passer',{pawn:name(p),promotion:name(promotion),mover:name(from),destination:name(to)});
 }
 return out;
}

const NEW_DEFINITIONS={
 ...REPLY_DEFINITIONS,
  "advanced_pawn_capture_available": {
    "kind": "board",
    "definition": "The opponent has a legal pawn capture onto its sixth or seventh rank."
  },
  "advanced_pawn_defends_moved_piece": {
    "kind": "move",
    "definition": "A friendly pawn on its sixth or seventh relative rank geometrically defends the moved unit on the resulting board. This does not assert that a subsequent recapture is legal or wins material."
  },
  "attacks_pawn_blockader": {
    "kind": "move",
    "definition": "The moved pawn attacks the enemy pawn directly blocking another friendly pawn."
  },
  "attacks_promotion_guard": {
    "kind": "move",
    "definition": "The moved piece attacks a unit which guards the promotion square of a friendly seventh-rank pawn."
  },
  "attacks_rook": {
    "kind": "move",
    "definition": "The moved unit directly attacks an opposing rook."
  },
  "back_rank_rook_entry": {
    "kind": "move",
    "definition": "The moved rook has a clear line to an empty enemy back-rank square from which a clear rank leads to the enemy king."
  },
  "backrank_check_forces_diagonal_escape": {
    "kind": "board",
    "definition": "A back-rank queen or rook gives adjacent file check to a king on its second rank; the only legal evasion is a diagonal king step onto its third rank. One queen, one rook; the witness is shared by the chase observations."
  },
  "breakthrough_file_clear": {
    "kind": "board",
    "definition": "Beyond that unique outer sentry, the promotion file contains no pieces."
  },
  "breakthrough_king_one_tempo_outside": {
    "kind": "board",
    "definition": "The enemy king distance to the same promotion square is at least the blocked pawn remaining pushes plus one. Not an uncatchable-pawn assertion."
  },
  "breakthrough_king_outside_timing_bound": {
    "kind": "board",
    "definition": "The enemy king promotion-square distance exceeds the outer pawn remaining pushes by more than one. This is geometry, not a race verdict."
  },
  "breakthrough_no_other_sentry": {
    "kind": "board",
    "definition": "No additional enemy pawn occupies either adjacent promotion corridor beyond the named sentries."
  },
  "breakthrough_reserve_behind_lever": {
    "kind": "board",
    "definition": "A friendly pawn stands directly behind the lever in the same unique rook-file breakthrough pair; it can become a second runner after the lever captures the sentry."
  },
  "captures_advanced_passer": {
    "kind": "move",
    "definition": "Captures an enemy passed pawn which was on its sixth or seventh rank before the move."
  },
  "captures_promotion_blockader": {
    "kind": "move",
    "definition": "The captured enemy unit occupied the advance square of a friendly seventh-rank pawn."
  },
  "captures_promotion_guard": {
    "kind": "move",
    "definition": "The captured enemy unit guarded the promotion square of our seventh-rank pawn."
  },
  "captures_queen_attacker": {
    "kind": "move",
    "definition": "Capture a unit that attacked our queen before this move."
  },
  "checking_square_enemy_unguarded": {
    "kind": "board",
    "definition": "The checking queen square has no enemy defender other than a rook that can capture the checker."
  },
  "clear_seventh_rank_pawn": {
    "kind": "board",
    "definition": "One unique clear, passed seventh-rank pawn."
  },
  "counter_passer_guard_cost_below_lead": {
    "kind": "board",
    "definition": "For the single advanced counter-passer, its empty next square is guarded by an unpinned non-king unit whose value, less the pawn, is below our material lead."
  },
  "creates_advanced_passer": {
    "kind": "move",
    "definition": "The move creates a sixth- or seventh-rank passed pawn."
  },
  "defend_multiple_attacked": {
    "kind": "move",
    "definition": "The moved unit defends at least two friendly units which were attacked before the move."
  },
  "defends_attacked_minor": {
    "kind": "move",
    "definition": "The moved unit defends a friendly knight or bishop attacked before the move."
  },
  "defends_attacked_nonpawn": {
    "kind": "move",
    "definition": "Defends an attacked friendly knight, bishop, rook or queen."
  },
  "defends_attacked_passer": {
    "kind": "move",
    "definition": "Defends an attacked friendly passed pawn."
  },
  "defends_attacked_pawn": {
    "kind": "move",
    "definition": "The moved unit defends a friendly pawn attacked before this move."
  },
  "defends_attacked_queen": {
    "kind": "move",
    "definition": "Defends a friendly queen which was attacked before this move."
  },
  "defends_attacked_rook": {
    "kind": "move",
    "definition": "The moved piece geometrically defends a friendly rook that was attacked on the pre-move board."
  },
  "defends_undefended_minor": {
    "kind": "move",
    "definition": "Moved unit defends a different friendly minor piece which previously had no geometric defender."
  },
  "enemy_advanced_passers_restrained": {
    "kind": "board",
    "definition": "Every advanced enemy passer is immediately blockaded or its next square is controlled by two unpinned solver units."
  },
  "enemy_back_rank_king_no_flight": {
    "kind": "board",
    "definition": "The enemy king is on its home rank and has no legal king flight."
  },
  "enemy_king_away_from_home": {
    "kind": "board",
    "definition": "Enemy king is at least two ranks from its home rank."
  },
  "enemy_king_far_from_pin_promotion": {
    "kind": "board",
    "definition": "The enemy king is at least three steps from that promotion square."
  },
  "enemy_nonpawn_absent": {
    "kind": "board",
    "definition": "The opponent has only king and pawns; no knights, bishops, rooks or queens."
  },
  "enemy_rook_attacks_ours_off_promotion_file": {
    "kind": "board",
    "definition": "The same file rook attacks our sole rook off the promotion file and rank."
  },
  "fast_counter_pawn_steps_covered": {
    "kind": "board",
    "definition": "Every faster enemy passer is blocked by our king, has its next square capturable by our king, or is blocked/controlled by one unpinned bishop. The witnessed coverage is not a fortress proof."
  },
  "forced_edge_escape_meets_protected_pawn_check": {
    "kind": "board",
    "definition": "A rook check has one legal king evasion, to an edge square attacked by an unobstructed, unpinned starting pawn double-step. The pawn landing square is defended by a second unpinned pawn. Shared king, advance and recapture witnesses."
  },
  "forces_king_evasions": {
    "kind": "move",
    "definition": "This check leaves only legal king moves as replies."
  },
  "guards_advanced_promotion_square": {
    "kind": "move",
    "definition": "Controls the promotion square of an enemy seventh-rank pawn."
  },
  "interposition_squares_unguarded": {
    "kind": "board",
    "definition": "All legal interposition destinations lack an enemy defender other than the moving rook."
  },
  "king_approaches_enemy_piece": {
    "kind": "move",
    "definition": "A king move reduces its Chebyshev distance to at least one opposing knight, bishop, rook or queen that remains after the move. This measures approach, not evaluation."
  },
  "king_attacks_pinned_rook": {
    "kind": "board",
    "definition": "Exactly one enemy rook is both attacked by our king and absolutely pinned by our rook; linked pin-file observations use that same pin."
  },
  "king_blocks_counter_passer": {
    "kind": "board",
    "definition": "Every enemy passer is physically blocked by our king."
  },
  "king_enters_home_pawn_cover": {
    "kind": "move",
    "definition": "The moved king finishes on its first two ranks adjacent to at least two friendly pawns."
  },
  "king_evasions_attack_no_material": {
    "kind": "move",
    "definition": "After this check, every legal king evasion ends nonadjacent to every friendly non-pawn piece."
  },
  "king_has_no_flight": {
    "kind": "board",
    "definition": "The checked enemy king has no legal adjacent escape."
  },
  "king_has_off_rank_flight": {
    "kind": "board",
    "definition": "Our king has a legal adjacent square outside its home rank."
  },
  "king_in_pawn_cover": {
    "kind": "board",
    "definition": "Our king is adjacent to at least two friendly pawns."
  },
  "king_step_into_pawn_cover": {
    "kind": "board",
    "definition": "At least one legal king move would place it adjacent to two friendly pawns."
  },
  "material_deficit_at_most_pawn": {
    "kind": "board",
    "definition": "Our material balance is at least minus one."
  },
  "material_lead_survives_queen_promotion": {
    "kind": "board",
    "definition": "The current material lead exceeds eight points, the maximum inventory gain from the unique opposing pawn promoting. This is inventory, not a tactical verdict."
  },
  "no_nonqueen_attack_on_material": {
    "kind": "board",
    "definition": "No opposing pawn, knight, bishop, rook or king attacks any of our non-king units. Opposing queen attacks are allowed and explicitly excluded from this count."
  },
  "nonpawn_material_equal": {
    "kind": "board",
    "definition": "Equal non-pawn material values for the two sides."
  },
  "only_king_evasions": {
    "kind": "board",
    "definition": "The side to move is in check and all its legal replies move its king."
  },
  "only_queen_reaches_pawn_tempo_square": {
    "kind": "board",
    "definition": "At least one opposing queen and no opposing non-king piece of another type attacks the same pawn-tempo destination. The king cannot take a pawn defended by the named unpinned pawn."
  },
  "only_remote_rook_captures_checker": {
    "kind": "board",
    "definition": "All legal evasions capture the queen checker with a rook originally remote from the king, on a square at least two steps from the king."
  },
  "only_remote_rook_interpositions": {
    "kind": "board",
    "definition": "Every legal evasion is a rook interposition whose origin is not adjacent to the king and whose destination is at least two squares from that king."
  },
  "own_king_off_home_rank": {
    "kind": "board",
    "definition": "Our king is no longer on its home rank."
  },
  "pawn_checks_capturable_by_king": {
    "kind": "board",
    "definition": "All available opponent checks are nonpromoting pawn pushes landing beside our king without an enemy defender; no enemy non-pawn pieces remain."
  },
  "pawn_double_push": {
    "kind": "move",
    "definition": "The pawn advances two ranks from its starting square."
  },
  "pawn_protected_passer": {
    "kind": "board",
    "definition": "A passed pawn is defended by another pawn."
  },
  "pawn_tempo_king_ring_closed": {
    "kind": "board",
    "definition": "Every neighbor of that forced king destination is occupied by an opposing non-king unit, already controlled by us, or the pawn-tempo destination protected by the recapturing pawn. No continuation is searched."
  },
  "pin_file_promotion_clear": {
    "kind": "board",
    "definition": "The promotion square on the pinning rook file is empty."
  },
  "pinning_rook_on_seventh": {
    "kind": "board",
    "definition": "That same pinning rook is on our seventh rank."
  },
  "pinning_rook_pawn_defended": {
    "kind": "board",
    "definition": "The uniquely identified pinning rook is defended by a friendly pawn."
  },
  "pins_rook_to_king": {
    "kind": "move",
    "definition": "The moved slider absolutely pins an enemy rook to its king; the rook and king share that slider ray."
  },
  "promotion_check_has_rook_interposition": {
    "kind": "board",
    "definition": "The unique opposing seventh-rank pawn promotes onto our king back rank along a clear checking rank; our unique unpinned rook can interpose on a named empty square between promotion and king."
  },
  "promotion_gain_exceeds_rook_loss": {
    "kind": "board",
    "definition": "Our current balance plus eight promotion points minus our rook value remains positive."
  },
  "promotion_guard_defended_by_file_rook": {
    "kind": "board",
    "definition": "For the unique clear seventh-rank pawn, its sole current promotion guard is defended by the single enemy rook, whose ray to promotion is blocked only by that pawn."
  },
  "promotion_opens_guard_of_interposition": {
    "kind": "board",
    "definition": "That same seventh-rank pawn is the sole obstruction between our unique queen and the named rook-interposition square. Promotion vacates this guarding diagonal."
  },
  "promotion_square_beyond_king_step": {
    "kind": "board",
    "definition": "Enemy king is at least three king-steps from the unique immediate promotion square."
  },
  "protected_pawn_tempo_covers_forward_flights": {
    "kind": "board",
    "definition": "The two empty squares ahead of the same forced king escape are both attacked by one unobstructed pawn double-step; the destination is defended by another friendly pawn. No continuation is searched."
  },
  "queen_attacks_back_rank_rook": {
    "kind": "board",
    "definition": "Our queen attacks the single enemy rook on its own back rank."
  },
  "queen_back_rank_check": {
    "kind": "board",
    "definition": "The sole checker is our queen on the enemy king home rank."
  },
  "retains_rook_attack_on_moved_queen": {
    "kind": "move",
    "definition": "An enemy rook that attacked the queen before this move still attacks it after the move. Witnesses identify that same rook and queen."
  },
  "rook_ahead_of_passer_attacks_loose_pawn": {
    "kind": "board",
    "definition": "Our rook occupies the next square of a pawn-protected passer, defends it and attacks an undefended enemy pawn."
  },
  "rook_back_rank_check": {
    "kind": "board",
    "definition": "The sole checking unit is our unpinned rook, aligned on the enemy king home rank."
  },
  "rook_ending": {
    "kind": "board",
    "definition": "Only kings, pawns and exactly one rook per side remain."
  },
  "rook_ending_with_enemy_minor": {
    "kind": "board",
    "definition": "Our side has one rook, their side one rook and one minor; no queens or other pieces besides pawns and kings."
  },
  "rook_entry_behind_back_rank_guard": {
    "kind": "board",
    "definition": "Our rook can enter the enemy back rank on its own file; the sole enemy rook is the only intervening unit toward the enemy king."
  },
  "rook_file_breakthrough_chain": {
    "kind": "board",
    "definition": "One unique rook-file pawn is blocked by an enemy pawn, and a three-pawn staircase attacks the inner of the two blockers. Other breakthrough observations use this same structure."
  },
  "rook_file_breakthrough_pair": {
    "kind": "board",
    "definition": "One unique pawn lever directly attacks the enemy pawn blocking a friendly rook-file pawn. Linked breakthrough observations use that same pair."
  },
  "rook_file_chase_has_no_piece_block": {
    "kind": "board",
    "definition": "For that forced escape, a rook can enter its file from the back rank; the intervening square is empty and no opposing non-king piece geometrically reaches it. All backwards escape squares are occupied by enemy pawns or controlled."
  },
  "rook_guards_queen_checker": {
    "kind": "board",
    "definition": "An unpinned friendly rook geometrically defends the checking queen."
  },
  "rook_on_seventh": {
    "kind": "board",
    "definition": "A solver rook occupies its seventh relative rank."
  },
  "supports_advanced_passer": {
    "kind": "move",
    "definition": "The moved unit defends a friendly passed pawn on its sixth or seventh rank."
  },
  "surplus_covers_recapture_exposure": {
    "kind": "board",
    "definition": "The lead exceeds the sum of immediate capture losses after counting unpinned geometric recapturers, including a slider x-ray through the capturing attacker. Not an exchange-tree search."
  }
};
function moveObservations(b,u,n=b.apply(u)){
 const c=b.turn,e=other(c),from=sq(u.slice(0,2)),to=sq(u.slice(2,4)),cap=b.captureSquare(u),out={};


 if(type(b.cells[from])==='q'){
  const still=b.pieces(e,'r').filter(r=>b.attacksFrom(r).includes(from)&&n.cells[r]===b.cells[r]&&n.attacksFrom(r).includes(to));
  if(still.length)out.retains_rook_attack_on_moved_queen={queen:name(to),rooks:still.map(name)};
 }
 const pawnGuards=n.attackers(c,to).filter(z=>type(n.cells[z])==='p'&&advanceRank(z,c)>=5);
 if(pawnGuards.length)out.advanced_pawn_defends_moved_piece={piece:name(to),pawns:pawnGuards.map(name)};


 if(type(b.cells[from])==='k'){
  const targets=b.pieces(e,'nbrq');
  const approached=targets.filter(t=>t!==cap&&distance(to,t)<distance(from,t));
  if(approached.length)out.king_approaches_enemy_piece={from:name(from),to:name(to),targets:approached.map(t=>({piece:name(t),before:distance(from,t),after:distance(to,t)}))};
 }
 const attackedPawns=b.pieces(c,'p').filter(t=>t!==from&&n.cells[t]===b.cells[t]&&b.attacked(e,t)&&n.attacksFrom(to).includes(t));if(attackedPawns.length)out.defends_attacked_pawn={defender:name(to),pawns:attackedPawns.map(name)};
 const rookTargets=n.pieces(e,'r').filter(t=>n.attacksFrom(to).includes(t));if(rookTargets.length)out.attacks_rook={attacker:name(to),targets:rookTargets.map(name)};
 const rookPins=rookTargets.filter(t=>n.pinned(e,t)&&Radical2Facts.between(to,n.king(e)).includes(t)&&Radical2Facts.between(to,n.king(e)).filter(z=>n.cells[z]).length===1);if(rookPins.length)out.pins_rook_to_king={slider:name(to),rooks:rookPins.map(name),king:name(n.king(e))};

 const advancedSupport=n.pieces(c,'p').filter(t=>n.passed(t)&&advanceRank(t,c)>=5&&n.attacksFrom(to).includes(t));if(advancedSupport.length)out.supports_advanced_passer={supporter:name(to),pawns:advancedSupport.map(name)};
 if(n.attacked(c,n.king(e))){const evasions=n.legal();if(evasions.length&&evasions.every(v=>type(n.cells[sq(v.slice(0,2))])==='k')){out.forces_king_evasions={replies:evasions};if(evasions.every(v=>n.pieces(c,'nbrq').every(t=>distance(sq(v.slice(2,4)),t)>1)))out.king_evasions_attack_no_material={replies:evasions};}}
 if(type(b.cells[from])==='p'&&Math.abs((to>>3)-(from>>3))===2)out.pawn_double_push={from:name(from),to:name(to)};
 if(cap!==null&&type(b.cells[cap])==='p'&&b.passed(cap)&&advanceRank(cap,e)>=5)out.captures_advanced_passer={pawn:name(cap)};
 if(cap!==null){const blocked=b.pieces(c,'p').filter(p=>advanceRank(p,c)===6&&p+step(c)===cap);if(blocked.length)out.captures_promotion_blockader={pawns:blocked.map(name),blocker:name(cap)};}
 if(type(b.cells[from])==='k'&&advanceRank(to,c)<=1&&n.pieces(c,'p').filter(p=>distance(p,to)===1).length>=2)out.king_enters_home_pawn_cover={king:name(to),pawns:n.pieces(c,'p').filter(p=>distance(p,to)===1).map(name)};
 const guarded=b.pieces(c,'pnbrq').filter(r=>r!==from&&b.attacked(e,r)&&n.attacksFrom(to).includes(r));if(guarded.length>=2)out.defend_multiple_attacked={defender:name(to),targets:guarded.map(name)};
 const guards=[];for(const p of n.pieces(c,'p').filter(p=>advanceRank(p,c)===6)){const promotion=p+step(c);for(const g of n.attackers(e,promotion))if(n.attacksFrom(to).includes(g))guards.push({pawn:name(p),promotion:name(promotion),guard:name(g),attacker:name(to)});}if(guards.length)out.attacks_promotion_guard={guards};
 const looseMinors=b.pieces(c,'nb').filter(r=>r!==from&&!b.attacked(c,r)&&n.attacksFrom(to).includes(r));if(looseMinors.length)out.defends_undefended_minor={targets:looseMinors.map(name),defender:name(to)};
 const minors=b.pieces(c,'nb').filter(r=>r!==from&&b.attacked(e,r)&&n.attacksFrom(to).includes(r));if(minors.length)out.defends_attacked_minor={defender:name(to),targets:minors.map(name)};
 const rooks=b.pieces(c,'r').filter(r=>r!==from&&b.attacked(e,r)&&n.attacksFrom(to).includes(r));if(rooks.length)out.defends_attacked_rook={defender:name(to),rooks:rooks.map(name)};
   const protectedQueens=b.pieces(c,'q').filter(t=>t!==from&&b.attacked(e,t)&&n.attacksFrom(to).includes(t));
 if(protectedQueens.length)out.defends_attacked_queen={targets:protectedQueens.map(name)};
 const guardedPieces=b.pieces(c,'nbrq').filter(t=>t!==from&&b.attacked(e,t)&&n.attacksFrom(to).includes(t));
 if(guardedPieces.length)out.defends_attacked_nonpawn={targets:guardedPieces.map(name)};
 const guardedPassers=b.pieces(c,'p').filter(t=>t!==from&&b.passed(t)&&b.attacked(e,t)&&n.attacksFrom(to).includes(t));
 if(guardedPassers.length)out.defends_attacked_passer={targets:guardedPassers.map(name)};
 const promoGuard=n.pieces(e,'p').filter(t=>advanceRank(t,e)===6&&n.attacksFrom(to).includes(t+step(e)));
 if(promoGuard.length)out.guards_advanced_promotion_square={pawns:promoGuard.map(name),guard:name(to)};
 if(type(b.cells[from])==='r'){
  const king=n.king(e),entries=[];const backRank=e==='w'?0:7;
  if((king>>3)===backRank)for(let f=0;f<8;f++){
   const entry=8*backRank+f;if(n.cells[entry]||!n.attacksFrom(to).includes(entry))continue;
   const lo=Math.min(entry,king),hi=Math.max(entry,king);if(Array.from({length:hi-lo-1},(_,j)=>lo+j+1).every(t=>!n.cells[t]))entries.push(name(entry));
  }
  if(entries.length)out.back_rank_rook_entry={rook:name(to),king:name(king),entries};
 }

 if(cap!==null){const targets=b.pieces(c,'nbrq').filter(t=>b.attacksFrom(cap).includes(t));if(targets.length)out.captures_piece_attacker={attacker:name(cap),targets:targets.map(name)};const guarded=n.pieces(c,'p').filter(p=>advanceRank(p,c)===6&&b.attacksFrom(cap).includes(p+step(c)));if(guarded.length)out.captures_promotion_guard={captured:name(cap),pawns:guarded.map(name)};const queens=b.pieces(c,'q').filter(q=>b.attacksFrom(cap).includes(q));if(queens.length)out.captures_queen_attacker={attacker:name(cap),queens:queens.map(name)};}
 if(type(b.cells[from])==='p' && !u[4]){
  const witnesses=[];
  for(const own of n.pieces(c,'p')){
   if(own===to)continue;const blocker=own+step(c);
   if(blocker<0||blocker>63||n.cells[blocker]!== (e==='w'?'P':'p'))continue;
   if(n.attacksFrom(to).includes(blocker))witnesses.push({movedPawn:name(to),blockedPawn:name(own),blocker:name(blocker)});
  }
  if(witnesses.length)out.attacks_pawn_blockader={witnesses};
 }
 const created=n.pieces(c,'p').filter(p=>n.passed(p)&&advanceRank(p,c)>=5&&advanceRank(p,c)<=6&&!b.passed(p===to&&type(b.cells[from])==='p'?from:p));
 if(created.length)out.creates_advanced_passer={pawns:created.map(name)};
 return out;
}
function boardObservations(b,solver){
 const enemy=other(solver),out={};
 if(advanceRank(b.king(enemy),enemy)>=2)out.enemy_king_away_from_home={king:name(b.king(enemy))};
 if(!b.pieces(enemy,'nbrq').length)out.enemy_nonpawn_absent={};
 const runners=b.pieces(enemy,'p').filter(p=>b.passed(p)&&advanceRank(p,enemy)>=5);
 const restraint=runners.map(p=>{const next=p+step(enemy),blocker=next>=0&&next<64&&b.pieces(solver,'nbrqk').includes(next),guards=next>=0&&next<64?b.attackers(solver,next).filter(s=>!b.pinned(solver,s)):[];return {pawn:name(p),next:name(next),blocker:blocker?name(next):null,guards:guards.map(name),restrained:!!blocker||(!b.cells[next]&&guards.length>=2)};});
 if(restraint.length&&restraint.every(r=>r.restrained))out.enemy_advanced_passers_restrained={pawns:restraint};
 const val=c=>b.pieces(c,'nbrq').reduce((s,p)=>s+VALUES[type(b.cells[p])],0);
 if(val(solver)===val(enemy))out.nonpawn_material_equal={solver:val(solver),enemy:val(enemy)};
 if(b.balance(solver)>=-1)out.material_deficit_at_most_pawn={balance:b.balance(solver)};
 const sevenths=b.pieces(solver,'p').filter(p=>advanceRank(p,solver)===6),clear=sevenths.length===1&&b.passed(sevenths[0])&&!b.cells[sevenths[0]+step(solver)]?sevenths[0]:null;
 if(clear!==null){const promotion=clear+step(solver),d=distance(b.king(enemy),promotion);out.clear_seventh_rank_pawn={pawn:name(clear),promotion:name(promotion)};if(d>=3)out.promotion_square_beyond_king_step={pawn:name(clear),promotion:name(promotion),king:name(b.king(enemy)),distance:d};}
 return out;
}
// Present-board relationships used by the stopping checklists below. No tree search.
function completionRelations(b,solver){
 const enemy=other(solver),out={},ps=b.pieces(solver,'p'),eps=b.pieces(enemy,'p'),k=b.king(solver),ek=b.king(enemy);
 // A promotion can replenish the lost queen, but also vacate the diagonal
 // which guards a forcing rook interposition. Geometry only, no child search.
 const ep7=eps.filter(p=>advanceRank(p,enemy)===6);
 if(ep7.length===1 && b.pieces(solver,'r').length===1 && b.pieces(solver,'q').length===1 && !b.pieces(enemy,'q').length){
  const p=ep7[0],pr=p+step(enemy),r=b.pieces(solver,'r')[0],q=b.pieces(solver,'q')[0];
  if(!b.cells[pr]&&(pr>>3)===(k>>3)&&!Radical2Facts.between(pr,k).some(z=>b.cells[z])){
   for(const block of Radical2Facts.between(pr,k)){
    if(!b.attacksFrom(r).includes(block)||b.pinned(solver,r))continue;
    const diagonal=Math.abs((q&7)-(block&7))===Math.abs((q>>3)-(block>>3));
    const blockers=Radical2Facts.between(q,block).filter(z=>b.cells[z]);
    if(!diagonal||blockers.length!==1||blockers[0]!==p)continue;
    const w={pawn:name(p),promotion:name(pr),rook:name(r),queen:name(q),block:name(block),king:name(k)};
    out.promotion_check_has_rook_interposition=w;
    out.promotion_opens_guard_of_interposition=w;
    if(b.balance(solver)>8)out.material_lead_survives_queen_promotion={...w,balance:b.balance(solver),promotionGain:8};
    break;
   }
  }
 }

 if(b.pieces(solver,'r').length===1&&b.pieces(enemy,'r').length===1&&!b.pieces(null,'nbq').length)out.rook_ending={};
  if(!b.pieces(enemy,'nbrq').length){const checks=b.withTurn(enemy).checkingMoves();if(checks.every(u=>!u[4]&&type(b.cells[sq(u.slice(0,2))])==='p'&&!b.withTurn(enemy).isCapture(u)&&distance(k,sq(u.slice(2,4)))===1&&!b.attacked(enemy,sq(u.slice(2,4)))))out.pawn_checks_capturable_by_king={moves:checks,king:name(k)};}
 
 const nonQueenAttackers=b.pieces(solver,'pnbrq').flatMap(t=>b.attackers(enemy,t).filter(a=>type(b.cells[a])!=='q').map(a=>({target:name(t),attacker:name(a)})));
 if(!nonQueenAttackers.length)out.no_nonqueen_attack_on_material={targets:b.pieces(solver,'pnbrq').map(name)};
 const captures=b.withTurn(enemy).legal().filter(u=>b.withTurn(enemy).isCapture(u));
 const exposure=new Map();
 for(const u of captures){
  const a=sq(u.slice(0,2)),t=b.withTurn(enemy).captureSquare(u),v=VALUES[type(b.cells[t])],av=VALUES[type(b.cells[a])];
  const direct=b.attackers(solver,t).filter(d=>!b.pinned(solver,d)&&(type(b.cells[d])!=='k'||b.attackers(enemy,t).every(x=>x===a)));
  const xrays=b.pieces(solver,'brq').filter(d=>{
   if(b.pinned(solver,d))return false;const df=Math.abs((d&7)-(t&7)),dr=Math.abs((d>>3)-(t>>3)),p=type(b.cells[d]);
   if(!((df===0||dr===0)&&'rq'.includes(p)||df===dr&&'bq'.includes(p)))return false;
   const between=Radical2Facts.between(d,t).filter(s=>b.cells[s]);return between.length===1&&between[0]===a;
  });
  const loss=(direct.length||xrays.length)?Math.max(0,v-av):v;
  const old=exposure.get(t);if(!old||old.loss<loss)exposure.set(t,{target:name(t),capture:u,loss,direct:direct.map(name),xray:xrays.map(name)});
 }
 const loss=[...exposure.values()].reduce((s,x)=>s+x.loss,0);
 if(b.balance(solver)>loss)out.surplus_covers_recapture_exposure={balance:b.balance(solver),loss,targets:[...exposure.values()]};
 if(captures.some(u=>type(b.cells[sq(u.slice(0,2))])==='p'&&advanceRank(sq(u.slice(2,4)),enemy)>=5))out.advanced_pawn_capture_available={moves:captures.filter(u=>type(b.cells[sq(u.slice(0,2))])==='p'&&advanceRank(sq(u.slice(2,4)),enemy)>=5)};
 const advanceCaptures=captures.filter(u=>type(b.cells[sq(u.slice(0,2))])==='p'&&advanceRank(sq(u.slice(2,4)),enemy)>=5);
 const advancedCaptureGuards=advanceCaptures.map(u=>{const to=sq(u.slice(2,4)),next=to+step(enemy),guards=b.attackers(solver,next).filter(g=>g!==b.withTurn(enemy).captureSquare(u)&&!b.pinned(solver,g));return {move:u,next:name(next),guards:guards.map(name),blocked:b.pieces(solver,'nbrqk').includes(next)};});
 if(advancedCaptureGuards.length&&advancedCaptureGuards.every(g=>g.blocked||g.guards.length))out.advanced_pawn_captures_next_squares_guarded={captures:advancedCaptureGuards};
 const advanced=eps.filter(p=>b.passed(p)&&advanceRank(p,enemy)>=5);
 if(advanced.length===1){const pawn=advanced[0],next=pawn+step(enemy),guards=b.attackers(solver,next).filter(s=>type(b.cells[s])!=='k'&&!b.pinned(solver,s));
  if(guards.length&&!b.cells[next]){
   const cost=Math.min(...guards.map(s=>VALUES[type(b.cells[s])]));
   if(b.balance(solver)>cost-1)out.counter_passer_guard_cost_below_lead={pawn:name(pawn),next:name(next),guards:guards.map(name),cost,balance:b.balance(solver)};
  }
 }


 if(b.turn===enemy&&b.attackers(solver,ek).length===1){
  const checker=b.attackers(solver,ek)[0];
  if(type(b.cells[checker])==='q'&&(checker>>3)===(ek>>3)&&advanceRank(ek,enemy)===0&&!b.pinned(solver,checker)){
   out.queen_back_rank_check={checker:name(checker),king:name(ek)};
   if(!b.kingMoves(enemy).length)out.king_has_no_flight={king:name(ek)};
   const defenders=b.attackers(solver,checker).filter(d=>type(b.cells[d])==='r'&&!b.pinned(solver,d));
   if(defenders.length)out.rook_guards_queen_checker={checker:name(checker),rooks:defenders.map(name)};
   const replies=b.legal(),captures=replies.map(u=>({uci:u,from:sq(u.slice(0,2)),to:sq(u.slice(2,4))}));
   if(captures.length&&captures.every(x=>type(b.cells[x.from])==='r'&&x.to===checker&&distance(x.from,ek)>1&&distance(x.to,ek)>=2)){
    out.only_remote_rook_captures_checker={replies};
    if(b.attackers(enemy,checker).every(d=>captures.some(x=>x.from===d)))out.checking_square_enemy_unguarded={checker:name(checker)};
   }
  }
 }


 if(b.turn===enemy&&b.attackers(solver,ek).length===1){
  const checker=b.attackers(solver,ek)[0];
  if('rq'.includes(type(b.cells[checker]))&&(checker>>3)===(ek>>3)&&advanceRank(ek,enemy)===0&&!b.pinned(solver,checker)){
   out.line_check_on_enemy_back_rank={checker:name(checker),king:name(ek)};
   const off=Array.from({length:64},(_,i)=>i).filter(t=>distance(t,ek)===1&&(t>>3)!==(ek>>3));
   if(off.every(t=>b.pieces(enemy,'pnbrq').includes(t)))out.king_off_rank_squares_occupied={squares:off.map(name)};
   const between=Radical2Facts.between(checker,ek),replies=b.legal(),blocks=replies.map(u=>({uci:u,from:sq(u.slice(0,2)),to:sq(u.slice(2,4))}));
   if(blocks.length&&blocks.every(x=>'nbrq'.includes(type(b.cells[x.from]))&&between.includes(x.to)&&distance(x.from,ek)>1&&distance(x.to,ek)>=2)){
    out.only_remote_line_interpositions={replies};
    if(blocks.every(x=>b.attackers(enemy,x.to).every(d=>d===x.from)))out.interposition_squares_unguarded={squares:blocks.map(x=>name(x.to))};
   }
  }
 }
 // Back-rank interposition template, using this board's legal replies only.
 if(b.turn===enemy&&b.attackers(solver,ek).length&&b.legal().length&&b.legal().every(u=>type(b.cells[sq(u.slice(0,2))])==='k'))out.only_king_evasions={king:name(ek),replies:b.legal()};
 if(b.turn===enemy&&b.attackers(solver,ek).length===1){
  const checker=b.attackers(solver,ek)[0];
  if(type(b.cells[checker])==='r'&&(checker>>3)===(ek>>3)&&advanceRank(ek,enemy)===0&&!b.pinned(solver,checker)){
   out.rook_back_rank_check={checker:name(checker),king:name(ek)};
   if(!b.kingMoves(enemy).length)out.king_has_no_flight={king:name(ek)};
   const between=Radical2Facts.between(checker,ek),replies=b.legal();
   const blocks=replies.map(u=>({uci:u,from:sq(u.slice(0,2)),to:sq(u.slice(2,4))}));
   if(blocks.length&&blocks.every(x=>type(b.cells[x.from])==='r'&&between.includes(x.to)&&distance(x.from,ek)>1&&distance(x.to,ek)>=2)){
    out.only_remote_rook_interpositions={replies:blocks.map(x=>x.uci)};
    if(blocks.every(x=>b.attackers(enemy,x.to).every(d=>d===x.from)))out.interposition_squares_unguarded={squares:blocks.map(x=>name(x.to))};
   }
  }
 }
 if(b.kingMoves(solver).some(u=>ps.filter(p=>distance(sq(u.slice(2,4)),p)===1).length>=2))out.king_step_into_pawn_cover={moves:b.kingMoves(solver).filter(u=>ps.filter(p=>distance(sq(u.slice(2,4)),p)===1).length>=2)};
 if(b.kingMoves(solver).some(u=>advanceRank(sq(u.slice(2,4)),solver)>0))out.king_has_off_rank_flight={king:name(k),destinations:b.kingMoves(solver)};
 const ourQueens=b.pieces(solver,'q'),ourRooks=b.pieces(solver,'r'),theirRooks=b.pieces(enemy,'r');
 if(advanceRank(k,solver)>0)out.own_king_off_home_rank={king:name(k)};
 if(advanceRank(ek,enemy)===0&&b.kingMoves(enemy).length===0)out.enemy_back_rank_king_no_flight={king:name(ek)};
 if(theirRooks.length===1){const r=theirRooks[0],queens=ourQueens.filter(q=>b.attacksFrom(q).includes(r));
  if(advanceRank(r,enemy)===0&&queens.length)out.queen_attacks_back_rank_rook={queens:queens.map(name),rook:name(r)};
 }
 const entries=[];
 for(const r of ourRooks){const dest=(r&7)+(enemy==='w'?0:56);if((r===dest||!b.cells[dest]&&b.attacksFrom(r).includes(dest))&&(dest>>3)===(ek>>3)){
  const occupants=Radical2Facts.between(dest,ek).filter(t=>b.cells[t]);
  if(occupants.length===1&&theirRooks.includes(occupants[0]))entries.push({rook:name(r),entry:name(dest),blocker:name(occupants[0]),king:name(ek)});
 }}
 if(entries.length)out.rook_entry_behind_back_rank_guard={entries};
 if(ourRooks.length===1&&theirRooks.length===1&&!ourQueens.length&&!b.pieces(solver,'nb').length&&!b.pieces(enemy,'q').length&&b.pieces(enemy,'nb').length===1)out.rook_ending_with_enemy_minor={};
 const seventh=ps.filter(p=>advanceRank(p,solver)===6&&b.passed(p)&&!b.cells[p+step(solver)]);
 if(seventh.length===1&&theirRooks.length===1&&ourRooks.length===1){
  const pawn=seventh[0],prom=pawn+step(solver),r=theirRooks[0],own=ourRooks[0];
  const line=(r&7)===(prom&7)&&Radical2Facts.between(r,prom).filter(t=>b.cells[t]).length===1&&Radical2Facts.between(r,prom).includes(pawn);
  if(line){
   const guards=b.attackers(enemy,prom).filter(g=>g!==r);
   if(guards.length===1&&b.attacksFrom(r).includes(guards[0]))out.promotion_guard_defended_by_file_rook={pawn:name(pawn),promotion:name(prom),guard:name(guards[0]),rook:name(r)};

  }
  if(b.attacksFrom(r).includes(own)&&(own&7)!==(prom&7)&&(own>>3)!==(prom>>3))out.enemy_rook_attacks_ours_off_promotion_file={pawn:name(pawn),promotion:name(prom),attacker:name(r),target:name(own)};
  if(b.balance(solver)+8-5>0)out.promotion_gain_exceeds_rook_loss={balance:b.balance(solver),promotionGain:8,rookLoss:5};
 }
 const shelter=ps.filter(p=>distance(k,p)===1);
 if(shelter.length>=2)out.king_in_pawn_cover={king:name(k),pawns:shelter.map(name)};
 const seventhRooks=b.pieces(solver,'r').filter(r=>advanceRank(r,solver)===6);
 if(seventhRooks.length)out.rook_on_seventh={rooks:seventhRooks.map(name)};
 const pins=[];
 for(const target of b.pieces(enemy,'r'))if(b.pinned(enemy,target)&&distance(k,target)===1){
  for(const r of b.pieces(solver,'r'))if(b.attacksFrom(r).includes(target)&&Radical2Facts.between(r,ek).includes(target)&&Radical2Facts.between(r,ek).filter(t=>b.cells[t]).length===1)pins.push({target,r});
 }
 if(pins.length===1){const {target,r}=pins[0],promotion=(r&7)+(solver==='w'?56:0),pawns=b.attackers(solver,r).filter(t=>type(b.cells[t])==='p'),w={target:name(target),pinningRook:name(r),promotion:name(promotion)};
  out.king_attacks_pinned_rook={...w,king:name(k)};
  if(pawns.length)out.pinning_rook_pawn_defended={...w,pawns:pawns.map(name)};
  if(advanceRank(r,solver)===6)out.pinning_rook_on_seventh=w;
  if(!b.cells[promotion])out.pin_file_promotion_clear=w;
  if(distance(ek,promotion)>=3)out.enemy_king_far_from_pin_promotion={...w,king:name(ek),distance:distance(ek,promotion)};
 }
 // A defended runner, a rook ahead of it attacking a loose pawn, and a king blockade of the counter-passer.
 const protectedPassers=ps.filter(p=>b.passed(p)&&b.attackers(solver,p).some(d=>type(b.cells[d])==='p'));
 if(protectedPassers.length)out.pawn_protected_passer={pawns:protectedPassers.map(name)};
 const rookTies=[];
 for(const p of protectedPassers){const r=p+step(solver);if(b.cells[r]!== (solver==='w'?'R':'r'))continue;const targets=eps.filter(t=>b.attacksFrom(r).includes(t)&&!b.attacked(enemy,t));if(targets.length)rookTies.push({pawn:name(p),rook:name(r),targets:targets.map(name)});}
 if(rookTies.length)out.rook_ahead_of_passer_attacks_loose_pawn={witnesses:rookTies};
 const enemyPassers=eps.filter(p=>b.passed(p));
 if(enemyPassers.length&&enemyPassers.every(p=>p+step(enemy)===k))out.king_blocks_counter_passer={king:name(k),pawns:enemyPassers.map(name)};
 // A witnessed queen-rook edge-king chase. These are geometric observations,
 // not a search, mate score, or rule selecting a card.
 if(b.turn===enemy && b.pieces(solver,'q').length===1 && b.pieces(solver,'r').length===1){
  const checks=b.attackers(solver,ek),ev=b.legal();
  if(checks.length===1 && 'rq'.includes(type(b.cells[checks[0]])) && advanceRank(ek,enemy)===1 && advanceRank(checks[0],enemy)===0 && (checks[0]&7)===(ek&7) && ev.length===1 && type(b.cells[sq(ev[0].slice(0,2))])==='k'){
   const escape=sq(ev[0].slice(2,4)),delta=escape-ek;
   if(Math.abs((escape&7)-(ek&7))===1 && advanceRank(escape,enemy)===2){
    const q=b.pieces(solver,'q')[0],r=b.pieces(solver,'r')[0],entry=(escape&7)+(enemy==='w'?0:56),block=entry+step(enemy),w={king:name(ek),checker:name(checks[0]),escape:name(escape),queen:name(q),rook:name(r),entry:name(entry),block:name(block)};
    out.backrank_check_forces_diagonal_escape=w;
    const lower=[escape-step(enemy),escape-step(enemy)-1,escape-step(enemy)+1].filter(t=>t>=0&&t<64&&Math.abs((t&7)-(escape&7))<=1);
    const allRetreats=lower.every(t=>t===ek||b.pieces(enemy,'p').includes(t)||b.attacked(solver,t));
    if(allRetreats && !b.pinned(solver,r) && !b.cells[entry] && b.attacksFrom(r).includes(entry) && !b.cells[block]){
     const blockers=b.pieces(enemy,'nbrq').filter(t=>b.attacksFrom(t).includes(block));
     if(!blockers.length)out.rook_file_chase_has_no_piece_block={...w,retreats:lower.map(name)};
    }
    const forward=[escape+step(enemy)-1,escape+step(enemy),escape+step(enemy)+1].filter(t=>t>=0&&t<64&&Math.abs((t&7)-(escape&7))<=1&&!b.cells[t]);
    const pawns=ps.filter(p=>advanceRank(p,solver)===1&&!b.cells[p+step(solver)]&&!b.cells[p+2*step(solver)]);
    for(const pawn of pawns){const target=pawn+2*step(solver),attacks=[target+step(solver)-1,target+step(solver)+1].filter(t=>t>=0&&t<64&&Math.abs((t&7)-(target&7))===1);
     if(forward.length===2&&forward.every(t=>attacks.includes(t))&&b.attackers(solver,target).some(d=>type(b.cells[d])==='p'))out.protected_pawn_tempo_covers_forward_flights={...w,pawn:name(pawn),advance:name(target),flights:forward.map(name)};
    }
   }
  }
 }

 // Rook-file check followed by a pawn tempo: identify the unique forced
 // king destination, its current geometric ring, and the pawn/queen relations.
 // No future board is made and no continuation is searched here.
 if(b.turn===enemy && b.attacked(solver,ek)){
  const ev=b.legal(),checker=b.attackers(solver,ek);
  if(ev.length===1&&type(b.cells[sq(ev[0].slice(0,2))])==='k'&&checker.length===1&&type(b.cells[checker[0]])==='r'){
   const esc=sq(ev[0].slice(2,4));
   if((esc&7)===0||(esc&7)===7){
    for(const pawn of ps.filter(p=>advanceRank(p,solver)===1&&!b.cells[p+step(solver)]&&!b.cells[p+2*step(solver)]&&!b.pinned(solver,p))){
     const to=pawn+2*step(solver);if(Math.abs((esc&7)-(to&7))!==1||esc-to!==step(solver)+(esc&7)-(to&7))continue;
     const cover=ps.filter(p=>p!==pawn&&!b.pinned(solver,p)&&b.attacksFrom(p).includes(to));if(!cover.length)continue;
     const ring=[];for(let df=-1;df<=1;df++)for(let dr=-1;dr<=1;dr++){
      if(!df&&!dr)continue;const f=(esc&7)+df,r=(esc>>3)+dr;if(f<0||f>7||r<0||r>7)continue;
      const t=f+8*r,occupied=t!==ek&&b.pieces(enemy,'pnbrq').includes(t),controlled=t===to||b.attacked(solver,t);ring.push({square:name(t),occupied,controlled});
     }
     const takers=b.attackers(enemy,to).filter(p=>type(b.cells[p])!=='k');
     const w={king:name(ek),checker:name(checker[0]),escape:name(esc),pawn:name(pawn),advance:name(to),recapturers:cover.map(name),queenCapturers:takers.map(name)};
     out.forced_edge_escape_meets_protected_pawn_check=w;
     if(ring.every(x=>x.occupied||x.controlled))out.pawn_tempo_king_ring_closed={...w,ring};
     if(takers.length&&takers.every(t=>type(b.cells[t])==='q'))out.only_queen_reaches_pawn_tempo_square=w;
    }
   }
  }
 }

 // Identify a single pawn structure first. Record its independent geometric conditions separately.
 const structures=[];
 for(const blocked of ps){const file=blocked&7;if(file!==0&&file!==7)continue;const sentry=blocked+step(solver);if(b.cells[sentry]!== (enemy==='w'?'P':'p'))continue;
  for(const lever of ps.filter(t=>t!==blocked)){
   const pair=b.attacksFrom(lever).includes(sentry),chain=!pair&&Math.abs((lever&7)-(sentry&7))===1&&(sentry>>3)-(lever>>3)===(solver==='w'?2:-2);
   if(!pair&&!chain)continue;const secondSentry=chain?lever+step(solver):null;
   if(chain&&b.cells[secondSentry]!== (enemy==='w'?'P':'p'))continue;
   const inner=chain?ps.find(t=>t!==lever&&t!==blocked&&b.attacksFrom(t).includes(secondSentry)):null;if(chain&&inner===undefined)continue;
   structures.push({blocked,sentry,lever,chain,inner,secondSentry});
  }
 }
 if(structures.length===1){const st=structures[0],{blocked,sentry,lever,chain,inner,secondSentry}=st,file=blocked&7,promotion=file+(solver==='w'?56:0),advances=7-advanceRank(blocked,solver);
  const witness={blocked:name(blocked),sentry:name(sentry),lever:name(lever),inner:inner===null?null:name(inner),secondSentry:secondSentry===null?null:name(secondSentry),promotion:name(promotion)};
  out[chain?'rook_file_breakthrough_chain':'rook_file_breakthrough_pair']=witness;
  const ahead=[];for(let t=sentry+step(solver);t>=0&&t<64;t+=step(solver))ahead.push(t);
  if(ahead.every(t=>!b.cells[t]))out.breakthrough_file_clear={...witness,squares:ahead.map(name)};
  if(!eps.some(t=>t!==sentry&&t!==secondSentry&&Math.abs((t&7)-file)<=1&&advanceRank(t,solver)>advanceRank(blocked,solver)))out.breakthrough_no_other_sentry=witness;
  if(distance(ek,promotion)>advances+1)out.breakthrough_king_outside_timing_bound={...witness,pushes:advances,distance:distance(ek,promotion)};
  const reserve=lever-step(solver);
  if(!chain&&b.cells[reserve]===(solver==='w'?'P':'p'))out.breakthrough_reserve_behind_lever={...witness,reserve:name(reserve)};
  if(distance(ek,promotion)>=advances+1)out.breakthrough_king_one_tempo_outside={...witness,pushes:advances,distance:distance(ek,promotion)};
  const fast=eps.filter(t=>t!==sentry&&t!==secondSentry&&b.passed(t)&&7-advanceRank(t,enemy)<=advances),needBishop=fast.filter(t=>{const next=t+step(enemy);return !((k&7)===(t&7)&&advanceRank(k,enemy)>advanceRank(t,enemy)||distance(k,next)===1&&!b.attacked(enemy,next));});
  const bishops=b.pieces(solver,'b').filter(bi=>!b.pinned(solver,bi)&&needBishop.every(t=>{const next=t+step(enemy);return next===bi||!b.cells[next]&&b.attacksFrom(bi).includes(next);}));
  if(!needBishop.length||bishops.length)out.fast_counter_pawn_steps_covered={...witness,pawns:fast.map(name),king:name(k),bishops:bishops.map(name)};
 }
 return out;
}

class Radical2ObservationOracle extends Radical2Oracle{
 expandPosition(id){
  const c=super.expandPosition(id);if(c.tenStudyObserved)return c;
  const b=this.facts.board(c.fen),extras={...boardObservations(b,this.rootSide),...completionRelations(b,this.rootSide)};
  const last=c.meta.lastMove;
  if(b.turn!==this.rootSide&&last){const target=sq(last.slice(2,4)),witnesses=[];
   for(const pawn of b.pieces(b.turn,'p')){if(!b.attacksFrom(pawn).includes(target)||advanceRank(target,b.turn)<5)continue;
    const u=name(pawn)+name(target);if(!b.legal().includes(u))continue;const n=b.apply(u);if(n.passed(target))witnesses.push({pawn:name(pawn),target:name(target),capture:u});
   }if(witnesses.length)extras.advanced_pawn_recapture_available={witnesses};
  }
  Object.assign(c.observed,extras);c.predicates=[...new Set([...c.predicates,...Object.keys(extras)])];
  c.facts.push(...Object.entries(extras).map(([k,v])=>`${k}: ${JSON.stringify(v)}`));
  const prior=c.meta.priorFen?this.facts.board(c.meta.priorFen):null;
  const subjects=b.turn!==this.rootSide?replySubjects(prior,c.meta.lastMove,b):null;
  if(subjects)c.meta.replySubjects=subjects;
  for(const id of c.children){const child=this.getPosition(id),n=this.facts.board(child.fen),facts={...moveObservations(b,child.move.uci,n),...(subjects?replyObservations(prior,c.meta.lastMove,b,child.move.uci,n,subjects):{})};Object.assign(child.rawMoveFacts,facts);child.predicates=[...new Set([...child.predicates,...Object.keys(facts)])];child.facts.push(...Object.entries(facts).map(([k,v])=>`${k}: ${JSON.stringify(v)}`));}
  c.tenStudyObserved=true;return c;
 }
}

return {Radical2ObservationOracle,NEW_DEFINITIONS,moveObservations,boardObservations,completionRelations,replyObservations,replySubjects};
})();
export const Radical2Oracle=INTEGRATED_FACTS.Radical2ObservationOracle;
export const Radical2Facts=PUBLISHED_FACTS.Radical2Facts;
export const RADICAL2_ORACLE_VERSION=PUBLISHED_FACTS.RADICAL2_ORACLE_VERSION+'-integrated';
export const auditRadical2Reference=PUBLISHED_FACTS.auditRadical2Reference;
export const radical2ReplyClass=PUBLISHED_FACTS.radical2ReplyClass;
export const completionObservationDefinitions={...PUBLISHED_FACTS.completionObservationDefinitions,...INTEGRATED_FACTS.NEW_DEFINITIONS,"challenges_advanced_runner":{"kind": "move", "definition": "Captures the opposing seventh-rank pawn, occupies its promotion square, or adds an unpinned controller of that square. A newly added attack on the pawn qualifies only if promotion is already controlled or a rook/queen behind the pawn can meet its advance along the same file. Witnesses identify the pawn, promotion square and relevant attacker."},"challenges_moved_passer":{"kind": "move", "definition": "Captures, obstructs, or newly attacks the passed pawn moved on the preceding turn. On the seventh rank a mere new attack qualifies only when promotion is also controlled or a rook/queen behind the pawn can meet its advance along the file. The reply must concern that same pawn."},"captures_piece_attacker":{"kind": "move", "definition": "The captured enemy unit attacked a friendly knight, bishop, rook or queen before the move. The captured attacker and all non-pawn targets are witnessed."},"advanced_pawn_recapture_available":{"kind": "board", "definition": "An enemy pawn has a legal immediate recapture of the last-moved solver piece which leaves that pawn passed on its sixth or seventh rank. The pawn, victim and capture are witnessed. No continuation is searched."}};
