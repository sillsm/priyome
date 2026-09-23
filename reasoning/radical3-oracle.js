/** Radical 3: single-file distribution of the unchanged 0.34 observation code.
 * All six former private modules are in this file; there are no imports or fetches.
 * The existing host supplies createGame (its unchanged ScratchChess board library).
 * The post-run test adapter at the end preserves the original assertion contracts
 * while the .test movetext carries CLAMP annotations and all explored variations.
 * The solver never receives test expectations or CLAMP annotations.
 */

// ----- bundled module: geometry.js -----
const M_geometry = (() => {
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

return {Radical2Oracle,RADICAL2_ORACLE_VERSION,Radical2Facts,radical2ReplyClass,auditRadical2Reference,completionObservationDefinitions};
})();

// ----- bundled module: factual-core.js -----
const M_factual_core = (() => {
/**
 * scratchchess_oracle.js
 *
 * Chess-only adapter for Predicate Chess.
 *
 * ScratchChess owns FEN, legal moves, checks, mate, SAN, promotion, and board
 * state. This file turns the current board and each legal one-ply result into
 * finite position cards consumed by predicate.js. It never applies a move from
 * a child position, searches a continuation, proves a branch, chooses a policy
 * move, pushes or pops the PDA stack, or changes the DFA.
 *
 * Horizon contract: for current position P, the oracle may inspect P, enumerate
 * legal moves m from P, apply each m once to obtain Pm, and assign predicates
 * derived from P, m, and Pm. For two bounded terminal certificates it may also
 * enumerate one hypothetical legal ply from Pm: (1) the complete set of
 * immediate checkmates for a named side, and (2) legal captures that immediately
 * reach the policy's declared material objective. These terminal probes have no
 * evaluation, strategic ordering, recursion, stored refutation, or proof
 * propagation.
 * All continuation reasoning belongs to the visible DFA.
 */

const SCRATCHCHESS_ORACLE_VERSION = "2.19.0-static-board-facts";
const SCRATCHCHESS_ORACLE_HORIZON = 1;
const SCRATCHCHESS_ORACLE_TERMINAL_PROBE = "mate_in_1+material_objective_capture_in_1";

const PROJECT_SCHEMA = "predicate-policy-dfa-lab/project-v3";

const FILES = "abcdefgh";
const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);
const VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
const PIECE_NAMES = Object.freeze({ p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" });

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const other = (side) => side === "w" ? "b" : "w";
const normalizeSide = (side) => {
  if (side !== "w" && side !== "b") throw new Error(`Expected side "w" or "b"; received ${String(side)}`);
  return side;
};
const idx = (file, rank) => (7 - rank) * 8 + file;
const fr = (index) => [index % 8, 7 - Math.floor(index / 8)];
const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;

function unique(values) {
  return [...new Set(values)];
}

function squareName(index) {
  const [file, rank] = fr(index);
  return `${FILES[file]}${rank + 1}`;
}

function pieceLetter(piece) {
  if (!piece) return "?";
  const letter = ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[piece.type] || "?";
  return piece.color === "w" ? letter : letter.toLowerCase();
}

function pieceLabel(piece, index) {
  return `${pieceLetter(piece)}@${squareName(index)}`;
}

function coloredPieceLabel(piece, index) {
  if (!piece) return `?@${squareName(index)}`;
  const letter = ({ p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" })[piece.type] || "?";
  return `${piece.color}${letter}@${squareName(index)}`;
}

function pieceLongLabel(piece, index) {
  if (!piece) return `piece@${squareName(index)}`;
  return `${PIECE_NAMES[piece.type] || "piece"}@${squareName(index)}`;
}

function boardOf(game) {
  if (!game?.state || !Array.isArray(game.state.board) || game.state.board.length !== 64) {
    throw new Error("ScratchChess game.state.board[64] is required");
  }
  return game.state.board;
}

function fenFields(fen) {
  if (typeof fen !== "string" || !fen.trim()) throw new Error("A non-empty six-field FEN string is required");
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error(`Expected a six-field FEN; received ${fields.length} fields`);
  normalizeSide(fields[1]);
  const fullmove = Number(fields[5]);
  if (!Number.isInteger(fullmove) || fullmove < 1) throw new Error(`Invalid FEN fullmove number ${fields[5]}`);
  return fields;
}

function fenSide(fen) {
  return fenFields(fen)[1];
}


function movePrefix(fen) {
  const fields = fenFields(fen);
  const side = fields[1];
  const fullmove = Number(fields[5]);
  return side === "w" ? `${fullmove}.` : `${fullmove}…`;
}

function safeInCheck(game, side) {
  if (!game || typeof game._isInCheck !== "function") {
    throw new Error("ScratchChess Game._isInCheck(side) is required");
  }
  return Boolean(game._isInCheck(normalizeSide(side)));
}

function clearLine(board, from, to, df, dr) {
  let [file, rank] = fr(from);
  file += df;
  rank += dr;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    if (current === to) return true;
    if (board[current]) return false;
    file += df;
    rank += dr;
  }
  return false;
}

function attacksSquare(board, from, to) {
  const piece = board?.[from];
  if (!piece || from === to) return false;
  const [fromFile, fromRank] = fr(from);
  const [toFile, toRank] = fr(to);
  const df = toFile - fromFile;
  const dr = toRank - fromRank;
  const af = Math.abs(df);
  const ar = Math.abs(dr);
  if (piece.type === "p") return af === 1 && dr === (piece.color === "w" ? 1 : -1);
  if (piece.type === "n") return (af === 1 && ar === 2) || (af === 2 && ar === 1);
  if (piece.type === "k") return Math.max(af, ar) === 1;
  if ((piece.type === "b" || piece.type === "q") && af === ar && af > 0) {
    return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  }
  if ((piece.type === "r" || piece.type === "q") && ((df === 0 && ar > 0) || (dr === 0 && af > 0))) {
    return clearLine(board, from, to, Math.sign(df), Math.sign(dr));
  }
  return false;
}

function attackersOf(game, target, bySide) {
  const board = boardOf(game);
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== bySide) continue;
    if (attacksSquare(board, from, target)) output.push(from);
  }
  return output;
}

function attackMap(game, bySide) {
  const board = boardOf(game);
  const map = new Map();
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === bySide || piece.type === "k") continue;
    const sources = attackersOf(game, target, bySide);
    if (sources.length) map.set(target, new Set(sources));
  }
  return map;
}

function newAttackFacts(before, after, moverSide, movedTo) {
  const beforeMap = attackMap(before, moverSide);
  const afterMap = attackMap(after, moverSide);
  const facts = [];
  for (const [target, sources] of afterMap.entries()) {
    const previous = beforeMap.get(target) || new Set();
    const newSources = [...sources].filter((source) => !previous.has(source));
    if (!newSources.length) continue;
    const piece = boardOf(after)[target];
    facts.push({
      target,
      piece: clone(piece),
      value: VALUES[piece?.type] || 0,
      sources: newSources,
      discovered: newSources.some((source) => source !== movedTo)
    });
  }
  return facts;
}

function movedTargets(game, from, moverSide) {
  const board = boardOf(game);
  const targets = [];
  for (let target = 0; target < 64; target += 1) {
    const piece = board[target];
    if (!piece || piece.color === moverSide || piece.type === "k") continue;
    if (!attacksSquare(board, from, target)) continue;
    targets.push({ target, piece: clone(piece), value: VALUES[piece.type] || 0, sources: [from], discovered: false });
  }
  return targets;
}


function materialBalance(game, perspective) {
  let score = 0;
  for (const piece of boardOf(game)) {
    if (!piece) continue;
    const value = VALUES[piece.type] || 0;
    score += piece.color === perspective ? value : -value;
  }
  return score;
}

function moveNeedsPromotion(game, from, to) {
  const piece = boardOf(game)[from];
  if (!piece || piece.type !== "p") return false;
  const [, rank] = fr(to);
  return (piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 0);
}

function legalMoveRecords(game) {
  if (!game || typeof game._allLegalMoves !== "function") {
    throw new Error("ScratchChess Game._allLegalMoves(side) is required");
  }
  const side = normalizeSide(game.state?.side);
  const raw = game._allLegalMoves(side);
  if (!Array.isArray(raw)) throw new Error("ScratchChess _allLegalMoves(side) did not return an array");
  const records = [];
  for (const [index, item] of raw.entries()) {
    if (!item || !Number.isInteger(item.from) || !Number.isInteger(item.to)) {
      throw new Error(`ScratchChess legal move ${index} must be {from:int,to:int}`);
    }
    const { from, to } = item;
    const promotions = moveNeedsPromotion(game, from, to) ? PROMOTIONS : [""];
    for (const promotion of promotions) {
      records.push({
        from,
        to,
        promotion,
        uci: `${squareName(from)}${squareName(to)}${promotion}`,
        mover: clone(boardOf(game)[from]),
        captured: clone(boardOf(game)[to])
      });
    }
  }
  const seen = new Set();
  return records.filter((record) => !seen.has(record.uci) && seen.add(record.uci));
}

function applyMove(createGame, gameOrFen, move) {
  if (!move || typeof move.uci !== "string") throw new Error("Oracle move object with uci is required");
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  fenFields(sourceFen);
  const game = createGame({ Event: "Predicate Chess oracle", Site: "scratchchess_oracle.js" });
  game.loadFEN(sourceFen);
  if (move.promotion) {
    // The engine's UCI entry point can auto-queen after its legality probe
    // invalidates the saved pawn reference. Use its existing promotion-aware
    // finalizer after the same engine legality check; keep move/FEN/SAN aligned.
    if (!PROMOTIONS.includes(move.promotion) || !moveNeedsPromotion(game, move.from, move.to)
      || !game._legalMovesFrom(move.from).includes(move.to)) {
      throw new Error(`ScratchChess rejected oracle promotion ${move.uci}`);
    }
    game._finalizeMove(move.from, move.to, move.promotion.toUpperCase());
  } else if (!game.makeMoveUCI(move.uci)) {
    throw new Error(`ScratchChess rejected oracle-generated legal move ${move.uci}`);
  }
  if (game.state?.pendingPromotion || game._pendingPromotion) {
    throw new Error(`Promotion letter missing for ${move.uci}`);
  }
  return game;
}

function terminalInfo(game) {
  const moves = legalMoveRecords(game);
  if (moves.length) return null;
  const side = normalizeSide(game.state.side);
  return safeInCheck(game, side)
    ? { kind: "mate", winner: other(side), loser: side }
    : { kind: "stalemate", winner: null, loser: null };
}

function safeSan(after, move) {
  const san = typeof after?.curNode?.san === "string" ? after.curNode.san.trim() : "";
  if (!san) throw new Error(`ScratchChess did not provide SAN for ${move.uci}`);
  return san;
}

/**
 * Exact terminal probe used only to partition replies to an announced mate-in-one
 * threat. The supplied position must have attackerSide to move. This enumerates
 * one legal ply and keeps only immediate checkmates; it does not score or search
 * any continuation beyond the mate terminal.
 */
function legalMateInOneMoves(createGame, gameOrFen, attackerSide) {
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  fenFields(sourceFen);
  const game = createGame({ Event: "Predicate Chess mate-in-one terminal probe", Site: "scratchchess_oracle.js" });
  game.loadFEN(sourceFen);
  if (normalizeSide(game.state?.side) !== normalizeSide(attackerSide)) return [];
  const output = [];
  for (const move of legalMoveRecords(game)) {
    const after = applyMove(createGame, game, move);
    const terminal = terminalInfo(after);
    if (!terminal || terminal.kind !== "mate" || terminal.winner !== normalizeSide(attackerSide)) continue;
    output.push({
      from: move.from,
      to: move.to,
      uci: move.uci,
      san: safeSan(after, move),
      mateSquare: move.to
    });
  }
  return output;
}

/**
 * Exact board feature used for a mate-in-one threat. The just-moved side is
 * placed back on move and the en-passant field is cleared, which models a pass
 * only for the terminal question: which legal moves by attackerSide would mate
 * immediately on this resulting board? No continuation beyond mate is explored.
 */
function legalMateThreatMoves(createGame, gameOrFen, attackerSide) {
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  const fields = fenFields(sourceFen);
  fields[1] = normalizeSide(attackerSide);
  fields[3] = "-";
  return legalMateInOneMoves(createGame, fields.join(" "), attackerSide);
}

function combineAttackTargets(targets) {
  const bySquare = new Map();
  for (const target of targets) {
    const existing = bySquare.get(target.target);
    if (!existing || target.value > existing.value || target.discovered) bySquare.set(target.target, target);
  }
  return [...bySquare.values()].sort((a, b) => b.value - a.value || a.target - b.target);
}


const RAY_DIRECTIONS = Object.freeze([
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
]);

function sliderSupportsDirection(piece, df, dr) {
  if (!piece) return false;
  const diagonal = Math.abs(df) === 1 && Math.abs(dr) === 1;
  const straight = (df === 0) !== (dr === 0);
  if (piece.type === "q") return diagonal || straight;
  if (piece.type === "r") return straight;
  if (piece.type === "b") return diagonal;
  return false;
}

function findAlignments(game, side) {
  const board = boardOf(game);
  const output = [];
  const seen = new Set();
  for (let front = 0; front < 64; front += 1) {
    const frontPiece = board[front];
    if (!frontPiece || frontPiece.color !== side) continue;
    const [frontFile, frontRank] = fr(front);
    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(frontPiece, df, dr)) continue;
      let file = frontFile + df;
      let rank = frontRank + dr;
      let middle = -1;
      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (middle < 0) {
            if (piece.color !== side) break;
            middle = square;
          } else {
            if (piece.color !== side && piece.type !== "k") {
              const key = `${front}:${middle}:${square}`;
              if (!seen.has(key)) {
                seen.add(key);
                output.push({
                  side,
                  front,
                  middle,
                  back: square,
                  direction: [df, dr],
                  frontPiece: clone(frontPiece),
                  middlePiece: clone(board[middle]),
                  backPiece: clone(piece),
                  backValue: VALUES[piece.type] || 0
                });
              }
            }
            break;
          }
        }
        file += df;
        rank += dr;
      }
    }
  }
  return output.sort((a, b) => b.backValue - a.backValue || a.front - b.front || a.middle - b.middle || a.back - b.back);
}

function alignmentFact(binding) {
  return `alignment(front=${coloredPieceLabel(binding.frontPiece, binding.front)},middle=${coloredPieceLabel(binding.middlePiece, binding.middle)},back=${coloredPieceLabel(binding.backPiece, binding.back)})`;
}

function bindingSurvives(board, binding) {
  const frontPiece = board[binding.front];
  const backPiece = board[binding.back];
  const [df, dr] = binding.direction;
  return Boolean(
    frontPiece
    && frontPiece.color === binding.side
    && sliderSupportsDirection(frontPiece, df, dr)
    && !board[binding.middle]
    && backPiece
    && backPiece.color === other(binding.side)
  );
}



function attackersOnBoard(board, target, bySide) {
  const output = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || piece.color !== bySide || from === target) continue;
    if (attacksSquare(board, from, target)) output.push(from);
  }
  return output;
}

function directionBetween(from, to) {
  const [fromFile, fromRank] = fr(from);
  const [toFile, toRank] = fr(to);
  const df = toFile - fromFile;
  const dr = toRank - fromRank;
  if (df === 0 && dr !== 0) return [0, Math.sign(dr)];
  if (dr === 0 && df !== 0) return [Math.sign(df), 0];
  if (Math.abs(df) === Math.abs(dr) && df !== 0) return [Math.sign(df), Math.sign(dr)];
  return null;
}

function isAbsolutelyPinnedOnBoard(board, square, side) {
  const piece = board[square];
  if (!piece || piece.color !== side || piece.type === "k") return false;
  const king = board.findIndex((item) => item?.color === side && item.type === "k");
  if (king < 0) return false;
  const direction = directionBetween(king, square);
  if (!direction) return false;
  const [df, dr] = direction;
  let [file, rank] = fr(king);
  file += df;
  rank += dr;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    if (current === square) break;
    if (board[current]) return false;
    file += df;
    rank += dr;
  }
  if (!inBounds(file, rank)) return false;
  file += df;
  rank += dr;
  while (inBounds(file, rank)) {
    const current = idx(file, rank);
    const blocker = board[current];
    if (!blocker) {
      file += df;
      rank += dr;
      continue;
    }
    return blocker.color !== side && sliderSupportsDirection(blocker, df, dr);
  }
  return false;
}

function effectiveDefendersOnBoard(board, target, side) {
  return attackersOnBoard(board, target, side)
    .filter((square) => !isAbsolutelyPinnedOnBoard(board, square, side));
}

function effectiveAttackersOnBoard(board, target, side) {
  return attackersOnBoard(board, target, side)
    .filter((square) => !isAbsolutelyPinnedOnBoard(board, square, side));
}


/**
 * Find a static overloaded-alignment relation:
 *
 *   our slider -> enemy sole defender -> enemy loose back piece
 *                                \-> enemy target defended only by the middle piece
 *
 * This is only a board relation. It does not assume the defender will recapture,
 * choose a continuation, or prove the line. The policy may use a move that
 * captures the sole-defended target as an early candidate; ordinary universal
 * reply search must still verify every opponent response.
 */
function findLooseAlignmentSoleDefenderTargets(board, attackerSide) {
  const enemy = other(attackerSide);
  const output = [];
  const seen = new Set();

  for (let slider = 0; slider < 64; slider += 1) {
    const sliderPiece = board[slider];
    if (!sliderPiece || sliderPiece.color !== attackerSide) continue;
    const [sliderFile, sliderRank] = fr(slider);

    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(sliderPiece, df, dr)) continue;
      let file = sliderFile + df;
      let rank = sliderRank + dr;
      let defender = -1;
      let back = -1;

      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (defender < 0) {
            if (piece.color !== enemy || piece.type === "k") break;
            defender = square;
          } else {
            if (piece.color === enemy && piece.type !== "k") back = square;
            break;
          }
        }
        file += df;
        rank += dr;
      }

      if (defender < 0 || back < 0) continue;
      const backPiece = board[back];
      if (effectiveDefendersOnBoard(board, back, enemy).length !== 0) continue;

      for (let target = 0; target < 64; target += 1) {
        if (target === defender || target === back) continue;
        const targetPiece = board[target];
        if (!targetPiece || targetPiece.color !== enemy || targetPiece.type === "k") continue;
        // An adjacent king counts only if it can legally recapture the chosen
        // capturing piece. The caller checks the already enumerated replies.
        const defenders = effectiveDefendersOnBoard(board, target, enemy)
          .filter((square) => board[square]?.type !== "k");
        if (defenders.length !== 1 || defenders[0] !== defender) continue;

        const key = `${slider}:${defender}:${back}:${target}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push({
          kind: "loose_alignment_sole_defender",
          side: attackerSide,
          slider,
          defender,
          back,
          target,
          direction: [df, dr],
          sliderPiece: clone(sliderPiece),
          defenderPiece: clone(board[defender]),
          backPiece: clone(backPiece),
          targetPiece: clone(targetPiece),
          backValue: VALUES[backPiece.type] || 0,
          targetValue: VALUES[targetPiece.type] || 0
        });
      }
    }
  }

  return output.sort((a, b) =>
    b.backValue - a.backValue
    || b.targetValue - a.targetValue
    || a.slider - b.slider
    || a.defender - b.defender
    || a.target - b.target
  );
}

function looseAlignmentSoleDefenderFact(relation) {
  return `loose_alignment_sole_defender(slider=${coloredPieceLabel(relation.sliderPiece, relation.slider)},defender=${coloredPieceLabel(relation.defenderPiece, relation.defender)},back=${coloredPieceLabel(relation.backPiece, relation.back)},target=${coloredPieceLabel(relation.targetPiece, relation.target)})`;
}

function capturedSoleDefendedTargetOfLooseAlignment(beforeBoard, afterBoard, moverSide, move, legalReplies) {
  const captured = beforeBoard[move.to];
  if (!captured || captured.color === moverSide || captured.type === "k") return [];
  const relations = findLooseAlignmentSoleDefenderTargets(beforeBoard, moverSide);
  return relations.filter((relation) => {
    if (relation.target !== move.to) return false;
    if (!samePieceAt(afterBoard, relation.slider, relation.sliderPiece)) return false;
    if (!samePieceAt(afterBoard, relation.defender, relation.defenderPiece)) return false;
    if (!samePieceAt(afterBoard, relation.back, relation.backPiece)) return false;
    // Reuse legal replies: a king that would step into check is not a defender.
    const afterDefenders = legalReplies.filter((reply) => reply.to === relation.target).map((reply) => reply.from);
    return afterDefenders.length === 1 && afterDefenders[0] === relation.defender;
  });
}

/**
 * Find a check that newly defends a vulnerable entry square on our own back rank.
 *
 * Static geometry only:
 *   - our king and a capturer stand on our back rank;
 *   - the capturer currently blocks an enemy rook/queen from entering on that rank;
 *   - the capturer can take a loose enemy non-pawn along the back rank, vacating the blocker;
 *   - the candidate move gives check and newly defends the enemy entry square.
 *
 * This does not play the future capture or choose a continuation. It only records
 * that the checking move repairs the currently visible back-rank entry square.
 */
function findChecksAddingDefenderToBackRankEntrySquare(beforeBoard, afterBoard, attackerSide, move) {
  const movedBefore = beforeBoard[move.from];
  const movedAfter = afterBoard[move.to];
  if (!movedBefore || !movedAfter || movedAfter.color !== attackerSide) return [];

  const enemy = other(attackerSide);
  const homeRank = attackerSide === "w" ? 0 : 7;
  const kingSquare = beforeBoard.findIndex((piece) => piece?.color === attackerSide && piece.type === "k");
  if (kingSquare < 0 || fr(kingSquare)[1] !== homeRank) return [];

  const output = [];
  const seen = new Set();

  for (let capturer = 0; capturer < 64; capturer += 1) {
    const capturerPiece = beforeBoard[capturer];
    const capturerAfter = afterBoard[capturer];
    if (!capturerPiece || capturerPiece.color !== attackerSide || !["r", "q"].includes(capturerPiece.type)) continue;
    if (!capturerAfter || capturerAfter.color !== capturerPiece.color || capturerAfter.type !== capturerPiece.type) continue;
    if (fr(capturer)[1] !== homeRank) continue;

    for (let target = 0; target < 64; target += 1) {
      const targetPiece = beforeBoard[target];
      if (!targetPiece || targetPiece.color !== enemy || ["p", "k"].includes(targetPiece.type)) continue;
      if (fr(target)[1] !== homeRank) continue;
      if (!attacksSquare(beforeBoard, capturer, target)) continue;
      if (effectiveDefendersOnBoard(beforeBoard, target, enemy).length) continue;

      const route = raySquaresBetween(capturer, target);
      for (const entry of route) {
        if (fr(entry)[1] !== homeRank || beforeBoard[entry]) continue;
        if (!attacksSquare(afterBoard, move.to, entry)) continue;
        if (attacksSquare(beforeBoard, move.from, entry)) continue;

        const kingRay = raySquaresBetween(entry, kingSquare);
        if (!kingRay.includes(capturer)) continue;
        const occupiedBetween = kingRay.filter((square) => beforeBoard[square]);
        if (occupiedBetween.length !== 1 || occupiedBetween[0] !== capturer) continue;

        for (let invader = 0; invader < 64; invader += 1) {
          if (invader === target) continue;
          const invaderPiece = beforeBoard[invader];
          if (!invaderPiece || invaderPiece.color !== enemy || !["r", "q"].includes(invaderPiece.type)) continue;
          if (!attacksSquare(beforeBoard, invader, entry)) continue;

          const projected = cloneBoardPosition(beforeBoard);
          projected[capturer] = null;
          projected[target] = clone(capturerPiece);
          projected[invader] = null;
          projected[entry] = clone(invaderPiece);
          if (!attacksSquare(projected, entry, kingSquare)) continue;

          const key = [move.uci, entry, capturer, target, invader, kingSquare].join(":");
          if (seen.has(key)) continue;
          seen.add(key);
          output.push({
            kind: "back_rank_entry_repair",
            sourceMove: move.uci,
            entrySquare: entry,
            kingSquare,
            capturerSquare: capturer,
            capturerPiece: clone(capturerPiece),
            targetSquare: target,
            targetPiece: clone(targetPiece),
            invaderSquare: invader,
            invaderPiece: clone(invaderPiece),
            defenderSquare: move.to,
            defenderPiece: clone(movedAfter)
          });
        }
      }
    }
  }

  return output;
}

/**
 * Exact, bounded material certificate on one current board. This does not pick
 * a continuation: it enumerates every legal capture by rootSide whose resulting
 * material balance reaches the policy's objective and leaves rootSide not behind,
 * and emits the moves as witnesses. It never searches beyond that one capture ply.
 */
function materialObjectiveCaptureMoves(createGame, gameOrFen, rootSide, rootMaterial, objectiveGain) {
  const sourceFen = typeof gameOrFen === "string" ? gameOrFen : gameOrFen?.exportFEN?.();
  const game = createGame({ Event: "Predicate Chess material-objective probe", Site: "scratchchess_oracle.js" });
  game.loadFEN(sourceFen);
  if (normalizeSide(game.state?.side) !== normalizeSide(rootSide)) return [];
  const board = boardOf(game);
  const output = [];

  for (const move of legalMoveRecords(game)) {
    const captured = board[move.to];
    if (!captured || captured.color === rootSide || captured.type === "k") continue;
    const after = applyMove(createGame, game, move);
    const afterMaterial = materialBalance(after, rootSide);
    const materialSwing = afterMaterial - Number(rootMaterial);
    if (materialSwing < Number(objectiveGain) || afterMaterial < 0) continue;
    output.push({
      uci: move.uci,
      san: safeSan(after, move),
      from: move.from,
      to: move.to,
      captured: clone(captured),
      materialSwing,
      materialBalance: afterMaterial
    });
  }

  return output.sort((a, b) =>
    b.materialSwing - a.materialSwing
    || (VALUES[b.captured?.type] || 0) - (VALUES[a.captured?.type] || 0)
    || String(a.uci).localeCompare(String(b.uci))
  );
}

function findAddedTacticalAttacks(beforeBoard, afterBoard, moverSide) {
  const looseNonPawns = [];
  const pinnedPieces = [];

  for (let target = 0; target < 64; target += 1) {
    const targetPiece = afterBoard[target];
    if (!targetPiece || targetPiece.color === moverSide || targetPiece.type === "k") continue;

    const beforeAttackers = new Set(effectiveAttackersOnBoard(beforeBoard, target, moverSide));
    const afterAttackers = effectiveAttackersOnBoard(afterBoard, target, moverSide);
    const addedAttackers = afterAttackers.filter((square) => !beforeAttackers.has(square));
    if (afterAttackers.length <= beforeAttackers.size || !addedAttackers.length) continue;

    const defenders = effectiveDefendersOnBoard(afterBoard, target, targetPiece.color);
    const record = {
      target,
      targetPiece: clone(targetPiece),
      addedAttackers,
      afterAttackers,
      defenders
    };

    if (targetPiece.type !== "p" && defenders.length === 0) looseNonPawns.push(record);
    if (isAbsolutelyPinnedOnBoard(afterBoard, target, targetPiece.color)) pinnedPieces.push(record);
  }

  const order = (a, b) =>
    (VALUES[b.targetPiece?.type] || 0) - (VALUES[a.targetPiece?.type] || 0)
    || a.target - b.target;
  looseNonPawns.sort(order);
  pinnedPieces.sort(order);
  return { looseNonPawns, pinnedPieces };
}



/**
 * Current-board pressure relation: attackers outnumber effective defenders on
 * an enemy non-pawn. Callers choose the visible threshold: the primary save-
 * the-piece card requires at least two attackers and exactly one defender;
 * counter-pressure replies use the literal attackers > defenders test. This is
 * a board fact only; it does not choose a capture or assert that the line is won.
 */
function findAttackerSurplusOnNonPawnPieces(board, attackerSide, options = {}) {
  const defenderSide = other(attackerSide);
  const minAttackers = Number.isInteger(Number(options.minAttackers)) ? Number(options.minAttackers) : 1;
  const exactDefenders = Number.isInteger(Number(options.exactDefenders)) ? Number(options.exactDefenders) : null;
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const targetPiece = board[target];
    if (!targetPiece || targetPiece.color !== defenderSide || ["p", "k"].includes(targetPiece.type)) continue;
    const attackers = effectiveAttackersOnBoard(board, target, attackerSide);
    const defenders = effectiveDefendersOnBoard(board, target, defenderSide);
    if (attackers.length < minAttackers || attackers.length <= defenders.length) continue;
    if (exactDefenders !== null && defenders.length !== exactDefenders) continue;
    output.push({
      kind: "attacker_surplus_on_non_pawn_piece",
      attackerSide,
      defenderSide,
      targetSquare: target,
      targetPiece: clone(targetPiece),
      targetValue: VALUES[targetPiece.type] || 0,
      attackers: attackers.map((square) => ({ square, piece: clone(board[square]), value: VALUES[board[square]?.type] || 0 })),
      defenders: defenders.map((square) => ({ square, piece: clone(board[square]), value: VALUES[board[square]?.type] || 0 }))
    });
  }
  return output.sort((a, b) =>
    b.targetValue - a.targetValue
    || (b.attackers.length - b.defenders.length) - (a.attackers.length - a.defenders.length)
    || a.targetSquare - b.targetSquare
  );
}

function attackerSurplusFact(relation) {
  return `attacker_surplus_on_non_pawn_piece(target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)},attackers=${relation.attackers.map((item) => coloredPieceLabel(item.piece, item.square)).join("+")},defenders=${relation.defenders.map((item) => coloredPieceLabel(item.piece, item.square)).join("+") || "none"},count=${relation.attackers.length}:${relation.defenders.length})`;
}

/** A reply newly creates attackers > defenders against one of the other side's non-pawns. */
function findNewAttackerSurplusOnNonPawnPieces(beforeBoard, afterBoard, attackerSide, options = {}) {
  return findAttackerSurplusOnNonPawnPieces(afterBoard, attackerSide, options).filter((relation) => {
    const beforePiece = beforeBoard[relation.targetSquare];
    if (!beforePiece || beforePiece.color !== relation.targetPiece.color || beforePiece.type !== relation.targetPiece.type) return true;
    const beforeAttackers = effectiveAttackersOnBoard(beforeBoard, relation.targetSquare, attackerSide);
    const beforeDefenders = effectiveDefendersOnBoard(beforeBoard, relation.targetSquare, relation.defenderSide);
    return beforeAttackers.length <= beforeDefenders.length
      || relation.attackers.length > beforeAttackers.length
      || relation.defenders.length < beforeDefenders.length;
  });
}

function findSoleDefendedAttackedPieces(board, attackerSide) {
  const enemy = other(attackerSide);
  const output = [];
  for (let target = 0; target < 64; target += 1) {
    const targetPiece = board[target];
    if (!targetPiece || targetPiece.color !== enemy || ["p", "k"].includes(targetPiece.type)) continue;
    const attackers = effectiveAttackersOnBoard(board, target, attackerSide);
    const defenders = effectiveDefendersOnBoard(board, target, enemy);
    if (!attackers.length || defenders.length !== 1) continue;
    const defenderSquare = defenders[0];
    const defenderPiece = board[defenderSquare];
    if (!defenderPiece || defenderPiece.color !== enemy || defenderPiece.type === "k") continue;
    output.push({
      targetSquare: target,
      targetPiece: clone(targetPiece),
      targetValue: VALUES[targetPiece.type] || 0,
      defenderSquare,
      defenderPiece: clone(defenderPiece),
      defenderValue: VALUES[defenderPiece.type] || 0,
      targetAttackers: attackers.map((square) => ({ square, piece: clone(board[square]) }))
    });
  }
  return output.sort((a, b) =>
    b.targetValue - a.targetValue
    || b.defenderValue - a.defenderValue
    || a.targetSquare - b.targetSquare
  );
}

function addedAttackerIsSafe(board, attackerSquare, defenderSquare, side) {
  const attacker = board[attackerSquare];
  const defender = board[defenderSquare];
  if (!attacker || attacker.color !== side || !defender || defender.color === side) return false;
  const enemyAttackers = effectiveAttackersOnBoard(board, attackerSquare, other(side));
  if (!enemyAttackers.length) return true;
  if (enemyAttackers.some((square) => square !== defenderSquare)) return false;
  const recapturers = effectiveDefendersOnBoard(board, attackerSquare, side);
  return recapturers.length > 0 && (VALUES[defender.type] || 0) > (VALUES[attacker.type] || 0);
}

function findSafeAttacksOnSoleDefenders(beforeBoard, afterBoard, moverSide, movedTo, requireSafe = true) {
  const output = [];
  for (const relation of findSoleDefendedAttackedPieces(beforeBoard, moverSide)) {
    if (!samePieceAt(afterBoard, relation.targetSquare, relation.targetPiece)) continue;
    if (!samePieceAt(afterBoard, relation.defenderSquare, relation.defenderPiece)) continue;
    const afterTargetAttackers = effectiveAttackersOnBoard(afterBoard, relation.targetSquare, moverSide);
    const afterTargetDefenders = effectiveDefendersOnBoard(afterBoard, relation.targetSquare, other(moverSide));
    if (!afterTargetAttackers.length || afterTargetDefenders.length !== 1
      || afterTargetDefenders[0] !== relation.defenderSquare) continue;

    const beforeDefenderAttackers = new Set(effectiveAttackersOnBoard(beforeBoard, relation.defenderSquare, moverSide));
    const afterDefenderAttackers = effectiveAttackersOnBoard(afterBoard, relation.defenderSquare, moverSide);
    const addedAttackers = afterDefenderAttackers.filter((square) => !beforeDefenderAttackers.has(square));
    if (!addedAttackers.includes(movedTo)) continue;
    if (requireSafe && !addedAttackerIsSafe(afterBoard, movedTo, relation.defenderSquare, moverSide)) continue;

    output.push({
      kind: "defender_chase",
      targetSquare: relation.targetSquare,
      targetPiece: clone(relation.targetPiece),
      targetValue: relation.targetValue,
      defenderSquare: relation.defenderSquare,
      defenderPiece: clone(relation.defenderPiece),
      defenderValue: relation.defenderValue,
      chaserSquare: movedTo,
      chaserPiece: clone(afterBoard[movedTo]),
      targetAttackers: afterTargetAttackers.map((square) => ({ square, piece: clone(afterBoard[square]) }))
    });
  }
  return output;
}

function updateDefenderChaseOnBoard(board, chase, move = null) {
  if (!chase || chase.kind !== "defender_chase") return null;
  if (!samePieceAt(board, chase.targetSquare, chase.targetPiece)) return null;
  let defenderSquare = chase.defenderSquare;
  if (move && move.from === chase.defenderSquare) defenderSquare = move.to;
  if (!samePieceAt(board, defenderSquare, chase.defenderPiece)) return null;
  const targetAttackers = effectiveAttackersOnBoard(board, chase.targetSquare, chase.targetPiece.color === "w" ? "b" : "w");
  const targetDefenders = effectiveDefendersOnBoard(board, chase.targetSquare, chase.targetPiece.color);
  if (!targetAttackers.length || !targetDefenders.includes(defenderSquare)) return null;
  return {
    ...clone(chase),
    defenderSquare,
    defenderPiece: clone(board[defenderSquare]),
    targetAttackers: targetAttackers.map((square) => ({ square, piece: clone(board[square]) }))
  };
}

function defenderChaseFact(chase) {
  return `sole_defender_of_attacked_piece(target=${coloredPieceLabel(chase.targetPiece, chase.targetSquare)},defender=${coloredPieceLabel(chase.defenderPiece, chase.defenderSquare)})`;
}

function samePieceAt(board, square, descriptor) {
  const piece = board[square];
  return Boolean(piece && descriptor && piece.color === descriptor.color && piece.type === descriptor.type);
}

function rayHasMiddleAndBack(board, front, middle, back, direction) {
  const [df, dr] = direction || [];
  if (!Number.isInteger(df) || !Number.isInteger(dr) || (!df && !dr)) return false;
  let [file, rank] = fr(front);
  file += df;
  rank += dr;
  let first = -1;
  while (inBounds(file, rank)) {
    const square = idx(file, rank);
    if (board[square]) {
      if (first < 0) first = square;
      else return first === middle && square === back;
    }
    file += df;
    rank += dr;
  }
  return false;
}

function alignmentDefenderChainFact(chain) {
  const others = (chain.otherDefenders || [])
    .map((item) => coloredPieceLabel(item.piece, item.square))
    .join("+") || "none";
  return `alignment_middle_defends_piece(front=${coloredPieceLabel(chain.frontPiece, chain.front)},middle=${coloredPieceLabel(chain.middlePiece, chain.middle)},back=${coloredPieceLabel(chain.backPiece, chain.back)},target=${coloredPieceLabel(chain.targetPiece, chain.target)},other_defenders=${others})`;
}

function findAlignmentDefenderChains(game, side, minimumGain) {
  const board = boardOf(game);
  const enemy = other(side);
  const output = [];
  const seen = new Set();

  for (let front = 0; front < 64; front += 1) {
    const frontPiece = board[front];
    if (!frontPiece || frontPiece.color !== side) continue;
    const [frontFile, frontRank] = fr(front);

    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(frontPiece, df, dr)) continue;
      let file = frontFile + df;
      let rank = frontRank + dr;
      let middle = -1;
      let back = -1;

      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (middle < 0) {
            if (piece.color !== enemy || piece.type === "k") break;
            middle = square;
          } else {
            if (piece.color === enemy && piece.type !== "k") back = square;
            break;
          }
        }
        file += df;
        rank += dr;
      }

      if (middle < 0 || back < 0) continue;
      const middlePiece = board[middle];
      const backPiece = board[back];
      const backValue = VALUES[backPiece?.type] || 0;
      if (backValue < minimumGain) continue;

      for (let target = 0; target < 64; target += 1) {
        if (target === middle || target === back) continue;
        const targetPiece = board[target];
        if (!targetPiece || targetPiece.color !== enemy || ["p", "k"].includes(targetPiece.type)) continue;
        if (!attacksSquare(board, middle, target)) continue;

        const defenders = effectiveDefendersOnBoard(board, target, enemy);
        if (!defenders.includes(middle)) continue;
        const otherDefenderSquares = defenders.filter((square) => square !== middle);
        if (!otherDefenderSquares.length) continue;
        const attackers = effectiveAttackersOnBoard(board, target, side);
        if (!attackers.length) continue;

        const key = `${front}:${middle}:${back}:${target}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push({
          kind: "alignment_defender_chain",
          side,
          front,
          middle,
          back,
          target,
          direction: [df, dr],
          frontPiece: clone(frontPiece),
          middlePiece: clone(middlePiece),
          backPiece: clone(backPiece),
          targetPiece: clone(targetPiece),
          backValue,
          targetValue: VALUES[targetPiece.type] || 0,
          otherDefenders: otherDefenderSquares.map((square) => ({ square, piece: clone(board[square]) })),
          attackers: attackers.map((square) => ({ square, piece: clone(board[square]) }))
        });
      }
    }
  }

  return output.sort((a, b) =>
    b.backValue - a.backValue
    || b.targetValue - a.targetValue
    || a.front - b.front
    || a.middle - b.middle
    || a.target - b.target
  );
}

function alignmentDefenderChainSurvives(board, chain) {
  return Boolean(
    samePieceAt(board, chain.front, chain.frontPiece)
    && samePieceAt(board, chain.middle, chain.middlePiece)
    && samePieceAt(board, chain.back, chain.backPiece)
    && samePieceAt(board, chain.target, chain.targetPiece)
    && rayHasMiddleAndBack(board, chain.front, chain.middle, chain.back, chain.direction)
    && attacksSquare(board, chain.middle, chain.target)
    && effectiveAttackersOnBoard(board, chain.target, chain.side).length
  );
}

function refreshAlignmentDefenderChain(board, chain) {
  const refreshed = clone(chain);
  const enemy = other(chain.side);
  refreshed.otherDefenders = effectiveDefendersOnBoard(board, chain.target, enemy)
    .filter((square) => square !== chain.middle)
    .map((square) => ({ square, piece: clone(board[square]) }));
  refreshed.attackers = effectiveAttackersOnBoard(board, chain.target, chain.side)
    .map((square) => ({ square, piece: clone(board[square]) }));
  return refreshed;
}

function openedAlignmentBinding(board, chain) {
  if (!samePieceAt(board, chain.front, chain.frontPiece)) return null;
  if (!samePieceAt(board, chain.back, chain.backPiece)) return null;
  if (board[chain.middle]) return null;
  if (!attacksSquare(board, chain.front, chain.back)) return null;
  return {
    side: chain.side,
    front: chain.front,
    middle: chain.middle,
    back: chain.back,
    direction: clone(chain.direction),
    frontPiece: clone(chain.frontPiece),
    middlePiece: clone(chain.middlePiece),
    backPiece: clone(chain.backPiece),
    backValue: chain.backValue,
    phase: "middle_cleared",
    source: "alignment_capture_chain"
  };
}


function cloneBoardPosition(board) {
  return board.map((piece) => piece ? { ...piece } : null);
}

function adjacentSquares(square) {
  const [file, rank] = fr(square);
  const output = [];
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (!df && !dr) continue;
      const nextFile = file + df;
      const nextRank = rank + dr;
      if (inBounds(nextFile, nextRank)) output.push(idx(nextFile, nextRank));
    }
  }
  return output;
}

function raySquaresBetween(from, to) {
  const direction = directionBetween(from, to);
  if (!direction) return [];
  const [df, dr] = direction;
  let [file, rank] = fr(from);
  file += df;
  rank += dr;
  const output = [];
  while (inBounds(file, rank)) {
    const square = idx(file, rank);
    if (square === to) return output;
    output.push(square);
    file += df;
    rank += dr;
  }
  return [];
}

function kingHasStaticEscapeAfterContactCapture(board, kingSquare, defenderSide, attackerSide) {
  for (const destination of adjacentSquares(kingSquare)) {
    const occupant = board[destination];
    if (occupant?.color === defenderSide) continue;
    const next = cloneBoardPosition(board);
    next[kingSquare] = null;
    next[destination] = { color: defenderSide, type: "k", id: "static-king" };
    if (!attackersOnBoard(next, destination, attackerSide).length) return true;
  }
  return false;
}

/**
 * Recognize a visible contact-mate capture threat without asking ScratchChess
 * to play a second ply. The relation is entirely on the current board:
 * an attacking piece can capture an enemy piece next to the king, the capturing
 * piece would give contact check, the mating square is protected, no effective
 * non-king defender can capture there, and the king has no static escape square.
 */
function findVisibleMateInOneThreats(board, attackerSide) {
  const defenderSide = other(attackerSide);
  const kingSquare = board.findIndex((piece) => piece?.color === defenderSide && piece.type === "k");
  if (kingSquare < 0) return [];
  const output = [];
  const seen = new Set();

  for (const mateSquare of adjacentSquares(kingSquare)) {
    const targetPiece = board[mateSquare];
    if (!targetPiece || targetPiece.color !== defenderSide || targetPiece.type === "k") continue;

    for (let attackerSquare = 0; attackerSquare < 64; attackerSquare += 1) {
      const attackerPiece = board[attackerSquare];
      if (!attackerPiece || attackerPiece.color !== attackerSide || attackerPiece.type === "k") continue;
      if (!attacksSquare(board, attackerSquare, mateSquare)) continue;

      const afterMateCapture = cloneBoardPosition(board);
      afterMateCapture[attackerSquare] = null;
      afterMateCapture[mateSquare] = { ...attackerPiece };
      if (!attacksSquare(afterMateCapture, mateSquare, kingSquare)) continue;

      const ownKing = afterMateCapture.findIndex((piece) => piece?.color === attackerSide && piece.type === "k");
      if (ownKing >= 0 && attackersOnBoard(afterMateCapture, ownKing, defenderSide).length) continue;

      const supportSquares = effectiveAttackersOnBoard(afterMateCapture, mateSquare, attackerSide)
        .filter((square) => square !== mateSquare && square !== attackerSquare);
      if (!supportSquares.length) continue;

      const nonKingCapturers = effectiveAttackersOnBoard(afterMateCapture, mateSquare, defenderSide)
        .filter((square) => afterMateCapture[square]?.type !== "k");
      if (nonKingCapturers.length) continue;
      if (kingHasStaticEscapeAfterContactCapture(afterMateCapture, kingSquare, defenderSide, attackerSide)) continue;

      const supportSquare = supportSquares.find((square) => {
        const piece = afterMateCapture[square];
        const direction = directionBetween(square, mateSquare);
        return direction && sliderSupportsDirection(piece, ...direction);
      }) ?? supportSquares[0];
      const supportPiece = afterMateCapture[supportSquare];
      const lineSquares = supportPiece && directionBetween(supportSquare, mateSquare)
        && sliderSupportsDirection(supportPiece, ...directionBetween(supportSquare, mateSquare))
        ? raySquaresBetween(supportSquare, mateSquare)
        : [];
      const key = `${attackerSquare}:${mateSquare}:${kingSquare}:${supportSquare}`;
      if (seen.has(key)) continue;
      seen.add(key);
      output.push({
        kind: "mate_threat",
        attackerSide,
        defenderSide,
        attackerSquare,
        attackerPiece: clone(attackerPiece),
        mateSquare,
        targetPiece: clone(targetPiece),
        kingSquare,
        kingPiece: clone(board[kingSquare]),
        supportSquare,
        supportPiece: clone(supportPiece),
        lineSquares,
        mateMoveUci: `${squareName(attackerSquare)}${squareName(mateSquare)}`
      });
    }
  }
  return output;
}

function mateThreatFact(threat) {
  return `threaten_mate_in_1(move=${threat.mateMoveUci},attacker=${coloredPieceLabel(threat.attackerPiece, threat.attackerSquare)},target=${coloredPieceLabel(threat.targetPiece, threat.mateSquare)},king=${coloredPieceLabel(threat.kingPiece, threat.kingSquare)},support=${coloredPieceLabel(threat.supportPiece, threat.supportSquare)})`;
}

function sameMateThreat(left, right) {
  return Boolean(left && right
    && left.attackerSquare === right.attackerSquare
    && left.mateSquare === right.mateSquare
    && left.kingSquare === right.kingSquare);
}

function newEffectiveAttackers(beforeBoard, afterBoard, target, side, { excludeKing = false } = {}) {
  const before = new Set(effectiveAttackersOnBoard(beforeBoard, target, side));
  return effectiveAttackersOnBoard(afterBoard, target, side).filter((square) => {
    if (before.has(square)) return false;
    if (excludeKing && afterBoard[square]?.type === "k") return false;
    return true;
  });
}



function targetObjectiveKey(target) {
  return `${target.attackerSquare}:${target.targetSquare}:${target.source}`;
}

function factToken(value) {
  return String(value || "").replace(/\s+/g, "_");
}

function stateSideForFen(fen, rootSide) {
  return fenSide(fen) === rootSide ? "my" : "their";
}

function cloneCard(card) {
  return clone(card);
}

class ScratchChessOracle {
  constructor(config = {}) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new TypeError("ScratchChessOracle requires one configuration object");
    }
    const allowed = new Set([
      "createGame", "reply_limit", "reply_class_limit", "objective_gain",
      "max_positions", "attack_min_value"
    ]);
    const unknown = Object.keys(config).filter((key) => !allowed.has(key));
    if (unknown.length) throw new Error(`Unknown oracle option(s): ${unknown.join(", ")}`);
    if (typeof config.createGame !== "function") throw new TypeError("ScratchChessOracle requires createGame(options)");
    const integerMinimums = {
      reply_limit: 1,
      reply_class_limit: 1,
      objective_gain: 1,
      max_positions: 1,
      attack_min_value: 0
    };
    for (const [key, minimum] of Object.entries(integerMinimums)) {
      const value = config[key];
      if (!Number.isInteger(value) || value < minimum) {
        throw new Error(`oracle ${key} must be an integer >= ${minimum}`);
      }
    }
    this.createGame = config.createGame;
    this.options = {
      reply_limit: config.reply_limit,
      reply_class_limit: config.reply_class_limit,
      objective_gain: config.objective_gain,
      max_positions: config.max_positions,
      attack_min_value: config.attack_min_value
    };
    this.cards = new Map();
    this.analysis = new Map();
    this.rootSide = null;
    this.rootMaterial = null;
    this.rootId = "root";
    this.puzzle = null;
    this.policyDepth = null;
    this.horizon = SCRATCHCHESS_ORACLE_HORIZON;
  }

  reset({ fen, title, theme = "", solution = "", where = "", policyDepth } = {}) {
    fenFields(fen);
    if (typeof title !== "string" || !title.trim()) throw new Error("Oracle reset requires a non-empty title");
    if (!Number.isInteger(policyDepth) || policyDepth < 0) throw new Error("Oracle reset requires policyDepth as an integer >= 0");
    this.cards.clear();
    this.analysis.clear();
    this.rootSide = fenSide(fen);
    this.policyDepth = policyDepth;
    const rootGame = this.createGame({ Event: title, Site: "Predicate Chess" });
    rootGame.loadFEN(fen);
    this.rootMaterial = materialBalance(rootGame, this.rootSide);
    this.puzzle = { title, fen, theme, solution, where };
    const rootPredicates = ["starting_position"];
    if (safeInCheck(rootGame, this.rootSide)) rootPredicates.push("in_check");
    const terminal = terminalInfo(rootGame);
    if (terminal?.kind === "mate") rootPredicates.push(terminal.winner === this.rootSide ? "mate" : "mated");
    if (terminal?.kind === "stalemate") rootPredicates.push("stalemate");
    const root = {
      id: this.rootId,
      display: title,
      label: title,
      side: "my",
      predicates: unique(rootPredicates),
      facts: [theme ? `theme(${factToken(theme)})` : "root_position", "oracle_horizon(1)"],
      help: "ScratchChess root position. Oracle horizon: current board plus one legal ply.",
      fen,
      depth: 0,
      children: [],
      expanded: false,
      prepared: false,
      move: null,
      meta: {
        root: true,
        theme,
        solution,
        where,
        lastMove: null,
        attackTargets: [],
        alignments: [],
        alignmentDefenderChains: [],
        activeAlignmentBindings: [],
        activeAlignmentChains: [],
        alignmentCapture: null,
        activeRelations: [],
        mateThreat: null,
        materialSwing: 0
      }
    };
    this.cards.set(root.id, root);
    return cloneCard(root);
  }

  createProject(policy, name) {
    if (!this.puzzle) throw new Error("createProject requires oracle.reset(...) first");
    if (!policy) throw new Error("createProject requires a predicate.js policy");
    if (typeof name !== "string" || !name.trim()) throw new Error("createProject requires a non-empty project name");
    return {
      schema: PROJECT_SCHEMA,
      name,
      initial: [this.rootId],
      policy: clone(policy),
      positions: [...this.cards.values()].map(cloneCard),
      tests: []
    };
  }

  getPosition(id) {
    const card = this.cards.get(id);
    return card ? cloneCard(card) : null;
  }

  getPositions() {
    return [...this.cards.values()].map(cloneCard);
  }

  _game(fen, title) {
    fenFields(fen);
    if (typeof title !== "string" || !title.trim()) throw new Error("Oracle game creation requires a non-empty title");
    const game = this.createGame({ Event: title, Site: "scratchchess_oracle.js" });
    game.loadFEN(fen);
    return game;
  }


  _staticCheckingTargets(afterGame, move, check, materialSwing) {
    if (!check) return [];
    const board = boardOf(afterGame);
    const attacker = board[move.to];
    if (!attacker || attacker.color !== this.rootSide || !["n", "b", "r", "q"].includes(attacker.type)) return [];

    // A king-adjacent attacker is not promoted to a target objective. That is a
    // static board predicate, not a legal-response probe; the move remains an
    // ordinary check for the policy to consider later.
    const enemyKing = board.findIndex((piece) => piece?.color === other(this.rootSide) && piece.type === "k");
    if (enemyKing >= 0 && attacksSquare(board, enemyKing, move.to)) return [];

    const minimumGain = Number(this.options.objective_gain);
    const output = [];

    // Direct attacked targets on the resulting one-ply board.
    for (let targetSquare = 0; targetSquare < 64; targetSquare += 1) {
      const targetPiece = board[targetSquare];
      if (!targetPiece || targetPiece.color === this.rootSide || targetPiece.type === "k") continue;
      if (!attacksSquare(board, move.to, targetSquare)) continue;
      const targetValue = VALUES[targetPiece.type] || 0;
      const projectedMaterialSwing = materialSwing + targetValue;
      if (targetValue < this.options.attack_min_value || projectedMaterialSwing < minimumGain) continue;
      output.push({
        source: "checking_attack",
        minimumGain,
        targetSquare,
        targetPiece: clone(targetPiece),
        targetValue,
        attackerSquare: move.to,
        attackerPiece: clone(attacker),
        projectedMaterialSwing,
        sourceMove: move.uci
      });
    }

    // Skewers visible on the resulting one-ply board: attacker, enemy king,
    // then an enemy material target on the same ray.
    const [attackerFile, attackerRank] = fr(move.to);
    for (const [df, dr] of RAY_DIRECTIONS) {
      if (!sliderSupportsDirection(attacker, df, dr)) continue;
      let file = attackerFile + df;
      let rank = attackerRank + dr;
      let blockerSquare = -1;
      let blockerPiece = null;
      while (inBounds(file, rank)) {
        const square = idx(file, rank);
        const piece = board[square];
        if (piece) {
          if (blockerSquare < 0) {
            if (piece.color !== this.rootSide && piece.type === "k") {
              blockerSquare = square;
              blockerPiece = clone(piece);
            } else {
              break;
            }
          } else {
            if (piece.color !== this.rootSide && piece.type !== "k") {
              const targetValue = VALUES[piece.type] || 0;
              const projectedMaterialSwing = materialSwing + targetValue;
              if (targetValue >= this.options.attack_min_value && projectedMaterialSwing >= minimumGain) {
                output.push({
                  source: "skewer",
                  minimumGain,
                  targetSquare: square,
                  targetPiece: clone(piece),
                  targetValue,
                  attackerSquare: move.to,
                  attackerPiece: clone(attacker),
                  blockerSquare,
                  blockerPiece,
                  projectedMaterialSwing,
                  sourceMove: move.uci
                });
              }
            }
            break;
          }
        }
        file += df;
        rank += dr;
      }
    }

    const seen = new Set();
    return output.filter((target) => {
      const key = targetObjectiveKey(target);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _targetStillLiveOnBoard(board, target, currentMaterialSwing, movedTargetSquare = null) {
    const targetSquare = Number.isInteger(movedTargetSquare) ? movedTargetSquare : target.targetSquare;
    const targetPiece = board[targetSquare];
    const attackerPiece = board[target.attackerSquare];
    if (!targetPiece || targetPiece.color === this.rootSide || targetPiece.type === "k") {
      return { live: false, targetSquare, reason: "target_gone", defenders: [] };
    }
    if (!attackerPiece || attackerPiece.color !== this.rootSide
      || attackerPiece.type !== target.attackerPiece?.type) {
      return { live: false, targetSquare, reason: "attacker_gone", defenders: [] };
    }
    if (!attacksSquare(board, target.attackerSquare, targetSquare)) {
      return { live: false, targetSquare, reason: "line_or_attack_broken", defenders: [] };
    }
    // A defender pinned only by the checking attacker becomes free when that
    // attacker leaves its checking line to capture the fork target.
    const afterTargetCapture = cloneBoardPosition(board);
    afterTargetCapture[target.attackerSquare] = null;
    afterTargetCapture[targetSquare] = clone(attackerPiece);
    const defenders = effectiveDefendersOnBoard(afterTargetCapture, targetSquare, targetPiece.color);
    if (defenders.length) {
      return { live: false, targetSquare, reason: "defended", defenders };
    }
    const projectedMaterialSwing = Number(currentMaterialSwing) + (VALUES[targetPiece.type] || 0);
    if (projectedMaterialSwing < target.minimumGain) {
      return { live: false, targetSquare, reason: "below_objective", defenders: [] };
    }
    return { live: true, targetSquare, reason: "pending_capture_remains", defenders: [], projectedMaterialSwing };
  }

  _relationsAfterOurMove(parentCard, beforeGame, afterGame, move, capturedBefore, materialSwing, check) {
    const created = this._staticCheckingTargets(afterGame, move, check, materialSwing)
      .map((target) => ({
        ...clone(target),
        kind: target.source === "skewer" ? "skewer" : "attacked_piece"
      }));

    const inherited = Array.isArray(parentCard.meta?.activeRelations)
      ? parentCard.meta.activeRelations
      : [];
    const surviving = [];
    for (const relation of inherited) {
      if (!relation || !["attacked_piece", "skewer"].includes(relation.kind)) continue;
      const status = this._targetStillLiveOnBoard(boardOf(afterGame), relation, materialSwing);
      if (status.live) surviving.push(clone(relation));
    }

    const output = [...created, ...surviving];
    const seen = new Set();
    return output.filter((relation) => {
      const key = `${relation.kind}:${targetObjectiveKey(relation)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _tagHumanReply(child, tactic) {
    const predicates = [];
    const facts = [];
    const add = (predicate, fact) => {
      predicates.push(predicate);
      if (fact) facts.push(fact);
    };

    // Up-material reply generation needs no invented predicate: mate,
    // recapture, and check are already ordinary one-ply move predicates.
    if (!tactic || tactic.kind === "material_lead") return [];

    const game = this._game(child.fen, `${child.display} human reply facts`);
    const board = boardOf(game);
    const movedTargetSquare = child.move?.fromIndex === tactic.targetSquare
      ? child.move.toIndex
      : null;
    const status = this._targetStillLiveOnBoard(
      board,
      tactic,
      child.meta?.materialSwing,
      movedTargetSquare
    );
    if (tactic.kind === "attacked_piece" && status.live) {
      add("loose_target_still_attacked", `loose_target_still_attacked(target=${coloredPieceLabel(board[status.targetSquare], status.targetSquare)},attacker=${squareName(tactic.attackerSquare)})`);
    }

    const capturedAttacker = Number.isInteger(tactic.attackerSquare)
      && child.move?.toIndex === tactic.attackerSquare
      && child.move?.captured?.color === this.rootSide;
    if (capturedAttacker || status.reason === "attacker_gone") {
      add("capture_attacker", `capture_attacker(${child.move?.san || child.display})`);
    }

    if (Number.isInteger(movedTargetSquare)) {
      const predicate = tactic.kind === "skewer" ? "move_skewered_piece" : "move_attacked_piece";
      add(predicate, `${predicate}(${child.move?.san || child.display})`);
    }

    if (status.reason === "defended") {
      const predicate = tactic.kind === "skewer" ? "defend_skewered_piece" : "defend_attacked_piece";
      add(predicate, `${predicate}(${squareName(status.targetSquare)},count=${status.defenders.length})`);
    }

    if (status.reason === "line_or_attack_broken") {
      const predicate = tactic.kind === "skewer" ? "block_skewer" : "block_attack";
      add(predicate, `${predicate}(${child.move?.san || child.display})`);
    }

    if (predicates.length) child.predicates = unique([...child.predicates, ...predicates]);
    child.facts = unique([
      ...child.facts,
      `tactical_reply_status(kind=${tactic.kind},target=${squareName(tactic.targetSquare)},status=${status.reason})`,
      ...facts
    ]);
    return unique(predicates);
  }

  _checkHasOnlyInterpositionReplies(afterGame, checkingSquare, attackerSide) {
    const board = boardOf(afterGame);
    const checker = board[checkingSquare];
    const defenderSide = other(attackerSide);
    const kingSquare = board.findIndex((piece) => piece?.color === defenderSide && piece.type === "k");
    if (!checker || checker.color !== attackerSide || !["b", "r", "q"].includes(checker.type) || kingSquare < 0) return false;
    const direction = directionBetween(checkingSquare, kingSquare);
    if (!direction || !sliderSupportsDirection(checker, ...direction)) return false;
    const between = new Set(raySquaresBetween(checkingSquare, kingSquare));
    if (!between.size) return false;
    const replies = legalMoveRecords(afterGame);
    if (!replies.length) return false;
    return replies.every((reply) => {
      const mover = board[reply.from];
      return mover?.color === defenderSide
        && mover.type !== "k"
        && reply.to !== checkingSquare
        && between.has(reply.to);
    });
  }

  _analyzeMove(parentCard, game, move) {
    const moverSide = normalizeSide(game.state.side);
    const boardBefore = boardOf(game);
    const mover = clone(boardBefore[move.from]);
    const capturedBefore = clone(boardBefore[move.to]);
    const beforeMaterial = materialBalance(game, this.rootSide);
    const after = applyMove(this.createGame, game, move); // the oracle's only applied ply
    const san = safeSan(after, move);
    const afterFen = after.exportFEN();
    const mate = /#$/.test(san);
    const check = mate || safeInCheck(after, other(moverSide));
    const legalReplies = legalMoveRecords(after);
    const legalReplyCount = legalReplies.length;
    const capture = Boolean(capturedBefore) || /x/.test(san);
    const recapture = Boolean(capture && parentCard.meta?.lastMove && move.to === parentCard.meta.lastMove.to);
    const directTargets = movedTargets(after, move.to, moverSide);
    const newTargets = newAttackFacts(game, after, moverSide, move.to);
    const attackTargets = combineAttackTargets([...directTargets, ...newTargets])
      .filter((target) => target.value >= this.options.attack_min_value);
    const afterMaterial = materialBalance(after, this.rootSide);
    const materialSwing = afterMaterial - this.rootMaterial;
    const predicates = ["legal_move"];
    const facts = [`legal_move(${san})`];
    // Static blockader relation, using already enumerated legal recaptures.
    // The advanced pawn's move and promotion are still explored by the card.
    if (capturedBefore) {
      const recapturers = legalReplies.filter(reply => reply.to === move.to);
      for (let square = 0; square < 64; square += 1) {
        const pawn = boardBefore[square];
        if (pawn?.color !== moverSide || pawn.type !== "p") continue;
        const [file, rank] = fr(square), step = moverSide === "w" ? 1 : -1;
        if (rank !== (moverSide === "w" ? 5 : 2)) continue;
        const blocker = idx(file, rank + step), piece = boardBefore[blocker];
        if (!piece || piece.color === moverSide || piece.type === "k"
          || !recapturers.length || recapturers.some(reply => reply.from !== blocker)) continue;
        predicates.push("capture_draws_blockader_from_advanced_pawn");
        facts.push(`capture_draws_blockader_from_advanced_pawn(${san},pawn=${coloredPieceLabel(pawn, square)},blockader=${coloredPieceLabel(piece, blocker)},scope=static_geometry_and_legal_recapture)`);
      }
    }

    // Exchange away a cheaper attacker of one of our more valuable pieces.
    // This is current-board geometry and piece value, not a continuation plan.
    if (capturedBefore && VALUES[mover.type] <= VALUES[capturedBefore.type]) {
      const threatened = boardBefore.flatMap((piece, square) =>
        piece?.color === moverSide && piece.type !== "k"
        && VALUES[piece.type] > VALUES[capturedBefore.type]
        && attacksSquare(boardBefore, move.to, square) ? [square] : []);
      if (threatened.length) {
        predicates.push("exchange_attacker_of_more_valuable_piece");
        threatened.forEach((square) => facts.push(`exchange_attacker_of_more_valuable_piece(${san},attacker=${coloredPieceLabel(capturedBefore, move.to)},threatened=${coloredPieceLabel(boardBefore[square], square)})`));
      }
    }
    // A capture can draw its sole recapturer onto one arm of a knight fork.
    // The card must play the recapture and the fork; this is board geometry only.
    if (capturedBefore && !["p", "k"].includes(capturedBefore.type)) {
      const takers = legalReplies.filter(reply => reply.to === move.to);
      if (takers.length === 1) {
        const taker = takers[0];
        const geometry = boardOf(after).slice();
        geometry[taker.from] = null;
        geometry[move.to] = boardBefore[taker.from];
        for (let knight = 0; knight < 64; knight += 1) {
          if (geometry[knight]?.color !== moverSide || geometry[knight].type !== "n") continue;
          for (let square = 0; square < 64; square += 1) {
            if (geometry[square]?.color === moverSide || !attacksSquare(geometry, knight, square)) continue;
            const fork = geometry.slice(); fork[square] = fork[knight]; fork[knight] = null;
            if (!attacksSquare(fork, square, move.to)) continue;
            const targets = fork.flatMap((piece, target) => piece?.color === other(moverSide)
              && !["p", "k"].includes(piece.type) && VALUES[piece.type] > VALUES.n
              && attacksSquare(fork, square, target) ? [target] : []);
            if (targets.length < 2 || !targets.includes(move.to)) continue;
            if (VALUES[capturedBefore.type] + Math.min(...targets.map(target => VALUES[fork[target].type])) <= VALUES[mover.type]) continue;
            predicates.push("capture_lures_knight_fork_of_valuable_pieces");
            facts.push(`capture_lures_knight_fork_of_valuable_pieces(${san},recapturer=${coloredPieceLabel(boardBefore[taker.from], taker.from)},knight=${coloredPieceLabel(geometry[knight], knight)},fork_square=${squareName(square)},targets=${targets.map(squareName).join("+")},scope=static_geometry)`);
          }
        }
      }
    }
    if (mover.type === "n") {
      const targets = directTargets.filter(target => target.value > VALUES.n && target.piece.type !== "k");
      if (targets.length >= 2) {
        predicates.push("knight_forks_two_valuable_pieces");
        facts.push(`knight_forks_two_valuable_pieces(${san},targets=${targets.map(target => coloredPieceLabel(target.piece, target.target)).join("+")})`);
      }
    }
    // Static safety facts: retreat from a cheaper attacker; develop with tempo;
    // or interpose against an attack on a pawn. No additional position is played.
    const cheaperAttackers = effectiveDefendersOnBoard(boardBefore, move.from, other(moverSide))
      .filter(square => VALUES[boardBefore[square].type] < VALUES[mover.type]);
    if (cheaperAttackers.length) {
      predicates.push("move_piece_attacked_by_cheaper_piece");
      facts.push(`move_piece_attacked_by_cheaper_piece(${san},piece=${coloredPieceLabel(mover, move.from)},attackers=${cheaperAttackers.map(squareName).join("+")})`);
    }
    if (["b", "n"].includes(mover.type) && fr(move.from)[1] === (moverSide === "w" ? 0 : 7)) {
      for (const target of newTargets) {
        if (target.piece.type === "k" || effectiveDefendersOnBoard(boardOf(after), target.target, other(moverSide)).length) continue;
        predicates.push("develop_minor_with_attack_on_undefended_target");
        facts.push(`develop_minor_with_attack_on_undefended_target(${san},target=${coloredPieceLabel(target.piece, target.target)})`);
      }
    }
    for (let square = 0; square < 64; square++) {
      const pawn = boardBefore[square];
      if (pawn?.color !== moverSide || pawn.type !== "p" || square === move.from || !samePieceAt(boardOf(after), square, pawn)) continue;
      const attackers = effectiveDefendersOnBoard(boardBefore, square, other(moverSide));
      for (const attacker of attackers) {
        if (attacker === move.to || !samePieceAt(boardOf(after), attacker, boardBefore[attacker])) continue;
        if (!attacksSquare(boardOf(after), attacker, square) && raySquaresBetween(attacker, square).includes(move.to)) {
          predicates.push("blocks_attack_on_own_pawn");
          facts.push(`blocks_attack_on_own_pawn(${san},pawn=${coloredPieceLabel(pawn, square)},attacker=${coloredPieceLabel(boardBefore[attacker], attacker)})`);
        }
      }
    }
    if (!boardOf(after).some(piece => piece?.type === "q")) {
      predicates.push("queens_absent");
      facts.push("queens_absent");
    }
    const movedDefenders = effectiveDefendersOnBoard(boardOf(after), move.to, moverSide);
    if (movedDefenders.length) {
      predicates.push("moved_piece_defended");
      facts.push(`moved_piece_defended(piece=${coloredPieceLabel(boardOf(after)[move.to], move.to)},defenders=${movedDefenders.map(squareName).join("+")})`);
    }

    if (directTargets.some(target => target.piece.type === "q")) {
      predicates.push("attack_queen");
      facts.push(`attack_queen(${san})`);
    }
    const queenTargets = directTargets.filter((target) => target.piece.type === "q"
      && target.value > VALUES[mover.type]
      && !attacksSquare(boardBefore, move.from, target.target));
    if (queenTargets.length) {
      predicates.push("attack_queen_with_cheaper_piece");
      const pinBoard = boardOf(after);
      const king = pinBoard.findIndex(piece => piece?.color === other(moverSide) && piece.type === "k");
      for (const target of queenTargets) {
        const ray = directionBetween(move.to, target.target);
        const behind = king >= 0 ? directionBetween(target.target, king) : null;
        if (!ray || !behind || !sliderSupportsDirection(mover, ...ray)
          || ray.some((step, axis) => step !== behind[axis])
          || !clearLine(pinBoard, target.target, king, ...ray)) continue;
        predicates.push("pin_queen_to_king");
        facts.push(`pin_queen_to_king(${san},attacker=${coloredPieceLabel(mover, move.to)},queen=${coloredPieceLabel(target.piece, target.target)},king=${squareName(king)})`);
      }

      queenTargets.forEach((target) => facts.push(`attack_queen_with_cheaper_piece(attacker=${coloredPieceLabel(boardOf(after)[move.to], move.to)},target=${coloredPieceLabel(target.piece, target.target)})`));
    }


    // Direct geometric pressure by the moved piece, for either side.
    // This states the material value of the attacked target, not a search result.
    const moreValuableTargets = directTargets.filter((target) => mover.type !== "k" && target.piece.type !== "k"
      && target.value > VALUES[mover.type]);
    if (moreValuableTargets.length) {
      predicates.push("attack_more_valuable_piece");
      moreValuableTargets.forEach((target) => facts.push(`attack_more_valuable_piece(attacker=${coloredPieceLabel(boardOf(after)[move.to], move.to)},target=${coloredPieceLabel(target.piece, target.target)})`));
    }


    if (mate) {
      predicates.push(moverSide === this.rootSide ? "mate" : "mated");
      facts.push(`mate(${san})`);
    } else if (check) {
      if (legalReplyCount === 1) predicates.push("check_with_one_reply");
      if (legalReplyCount === 2) predicates.push("check_with_two_replies");
      if (moverSide === this.rootSide && this._checkHasOnlyInterpositionReplies(after, move.to, moverSide)) {
        predicates.push("check_with_only_interpositions");
        facts.push(`check_with_only_interpositions(${san},count=${legalReplyCount})`);
      }
      predicates.push("check");
      facts.push(`check(${san})`);
      facts.push(`check_reply_count(${legalReplyCount})`);
    }
    if (mover?.type === "k") {
      predicates.push("king_move");
      facts.push(`king_move(${san})`);
    }
    if (capture) {
      predicates.push("capture");
      const capturedLabel = capturedBefore ? coloredPieceLabel(capturedBefore, move.to) : `piece@${squareName(move.to)}`;
      facts.push(`capture(${san},${capturedLabel})`);
      facts.push(`capture_value(${VALUES[capturedBefore?.type] || 0})`);
      const pinnedDefenders = attackersOnBoard(boardBefore, move.to, other(moverSide))
        .filter(square => isAbsolutelyPinnedOnBoard(boardBefore, square, other(moverSide)));
      if (capturedBefore && pinnedDefenders.length) {
        predicates.push("capture_piece_with_pinned_defender");
        facts.push(`capture_piece_with_pinned_defender(${san},target=${coloredPieceLabel(capturedBefore, move.to)},defenders=${pinnedDefenders.map(squareName).join("+")})`);
      }
      if (move.mover?.type !== "k" && (VALUES[move.mover?.type] || 0) < (VALUES[capturedBefore?.type] || 0)) {
        predicates.push("capture_with_cheaper_piece");
        facts.push(`capture_with_cheaper_piece(${san},mover=${move.mover.type},target=${capturedBefore.type})`);
      }
      if (capturedBefore) {
        const defenders = effectiveDefendersOnBoard(boardBefore, move.to, capturedBefore.color);
        if (defenders.length === 1 && boardBefore[defenders[0]].type === "k") {
          predicates.push("capture_piece_defended_only_by_king");
          facts.push(`capture_piece_defended_only_by_king(${san},target=${capturedLabel},defender=${coloredPieceLabel(boardBefore[defenders[0]], defenders[0])})`);
        }
      }
      if (capturedBefore && capturedBefore.type !== "k") {
        const defenders = effectiveDefendersOnBoard(boardBefore, move.to, capturedBefore.color);
        if (defenders.length === 0 && capturedBefore.type !== "p") {
          predicates.push("capture_undefended_non_pawn_piece");
          facts.push(`capture_undefended_non_pawn_piece(${san},${capturedLabel})`);
        }
        const recapturers = legalReplies.filter((reply) => reply.to === move.to).map((reply) => reply.from);
        // A sole recapturer also solely guards another attacked piece.
        // This tests one reply's board geometry, not a continuation search.
        if (recapturers.length === 1) {
          const defender = recapturers[0];
          const geometry = boardOf(after).slice();
          geometry[defender] = null;
          geometry[move.to] = boardBefore[defender];
          for (let target = 0; target < 64; target += 1) {
            const piece = boardBefore[target];
            if (!piece || piece.color === moverSide || ["p", "k"].includes(piece.type) || target === move.to || target === defender) continue;
            const guards = effectiveDefendersOnBoard(boardBefore, target, piece.color);
            if (guards.length !== 1 || guards[0] !== defender) continue;
            if (!effectiveAttackersOnBoard(geometry, target, moverSide).length) continue;
            if (effectiveDefendersOnBoard(geometry, target, piece.color).length) continue;
            if (VALUES[capturedBefore.type] + VALUES[piece.type] <= VALUES[mover.type]) continue;
            predicates.push("capture_with_overloaded_sole_defender");
            facts.push(`capture_with_overloaded_sole_defender(${san},defender=${coloredPieceLabel(boardBefore[defender], defender)},second_target=${coloredPieceLabel(piece, target)},scope=recapture_geometry)`);
          }
        }
        if (recapturers.length === 1
          && VALUES[boardBefore[recapturers[0]].type] > VALUES[capturedBefore.type]
          && VALUES[boardBefore[recapturers[0]].type] === VALUES[mover.type]) {
          predicates.push("capture_with_equal_piece_against_sole_defender");
          facts.push(`capture_with_equal_piece_against_sole_defender(${san},target=${capturedLabel},defender=${coloredPieceLabel(boardBefore[recapturers[0]], recapturers[0])})`);
        }
        if (recapturers.length === 1
          && VALUES[boardBefore[recapturers[0]].type] > VALUES[capturedBefore.type]
          && VALUES[boardBefore[recapturers[0]].type] > VALUES[mover.type]) {
          predicates.push("capture_with_cheaper_piece_against_more_valuable_sole_defender");
          facts.push(`capture_with_cheaper_piece_against_more_valuable_sole_defender(${san},target=${capturedLabel},defender=${coloredPieceLabel(boardBefore[recapturers[0]], recapturers[0])})`);
        }
      }
    }
    if (recapture) {
      predicates.push("recapture");
      facts.push(`recapture(${san},${squareName(move.to)})`);
    }
    if (parentCard.side === "my" && parentCard.predicates.includes("in_check")) {
      predicates.push("check_response");
      facts.push(`check_response(${san})`);
    }
    if (materialSwing > 0) {
      predicates.push("material_improved");
      facts.push(`material_improved(+${materialSwing})`);
    }
    const objectiveGainReached = materialSwing >= Number(this.options.objective_gain);
    if (objectiveGainReached) {
      predicates.push("objective_gain_reached");
      facts.push(`objective_gain_reached(+${materialSwing})`);
    } else if (materialSwing <= -Number(this.options.objective_gain)) {
      predicates.push("down_material");
      facts.push(`down_material(${materialSwing})`);
    }
    if (afterMaterial < 0) {
      predicates.push("material_deficit");
      facts.push(`material_deficit(${afterMaterial})`);
    } else {
      predicates.push("material_not_behind");
      facts.push(`material_not_behind(${afterMaterial})`);
      if (afterMaterial > 0) {
        predicates.push("material_advantage");
        facts.push(`material_advantage(+${afterMaterial})`);
      } else {
        predicates.push("material_equal");
        facts.push("material_equal(0)");
      }
    }
    if (objectiveGainReached && afterMaterial >= 0) {
      predicates.push("up_material");
      facts.push(`up_material(objective=+${materialSwing},balance=${afterMaterial >= 0 ? "+" : ""}${afterMaterial})`);
    }
    if (attackTargets.length) {
      attackTargets.slice(0, 6).forEach((target) => {
        facts.push(`${target.discovered ? "discovered_" : ""}attack(${pieceLongLabel(target.piece, target.target)})`);
      });
    }

    const boardAfter = boardOf(after);
    // Static attraction geometry: a legal queen recapture lands on a square
    // that shares a safe knight-fork square with her king. No continuation is applied.
    if (capture) {
      const enemy = other(moverSide);
      const enemyKing = boardAfter.findIndex(piece => piece?.color === enemy && piece.type === "k");
      const ourKing = boardAfter.findIndex(piece => piece?.color === moverSide && piece.type === "k");
      const queenRecaptures = legalReplies.filter(reply => reply.to === move.to && boardAfter[reply.from]?.type === "q");
      for (const reply of queenRecaptures) {
        const recaptureBoard = boardAfter.slice();
        recaptureBoard[move.to] = boardAfter[reply.from];
        recaptureBoard[reply.from] = null;
        for (let knight = 0; knight < 64; knight += 1) {
          const piece = recaptureBoard[knight];
          if (piece?.color !== moverSide || piece.type !== "n") continue;
          for (let square = 0; square < 64; square += 1) {
            if (recaptureBoard[square] || !attacksSquare(recaptureBoard, knight, square)) continue;
            const geometry = recaptureBoard.slice();
            geometry[knight] = null;
            geometry[square] = piece;
            if (!attacksSquare(geometry, square, enemyKing) || !attacksSquare(geometry, square, move.to)) continue;
            if (attackersOnBoard(geometry, ourKing, enemy).length || effectiveAttackersOnBoard(geometry, square, enemy).length) continue;
            predicates.push("capture_lures_queen_to_knight_fork");
            facts.push(`capture_lures_queen_to_knight_fork(${san},queen=${coloredPieceLabel(boardAfter[reply.from], reply.from)},recaptureSquare=${squareName(move.to)},knight=${coloredPieceLabel(piece, knight)},forkSquare=${squareName(square)},king=${squareName(enemyKing)},scope=static_geometry)`);
          }
        }
      }
    }

    // Board geometry only: an available king recapture lands on one arm of
    // a knight fork with its queen. The card must still play and check the fork.
    if (check && capture && legalReplies.some(reply => reply.to === move.to && reply.mover?.type === "k")) {
      const queens = boardAfter.flatMap((piece, square) => piece?.color === other(moverSide) && piece.type === "q" ? [square] : []);
      for (let knight = 0; knight < 64 && queens.length; knight += 1) {
        const piece = boardAfter[knight];
        if (piece?.color !== moverSide || piece.type !== "n") continue;
        for (let square = 0; square < 64; square += 1) {
          if (boardAfter[square]?.color === moverSide || !attacksSquare(boardAfter, knight, square)) continue;
          const geometry = boardAfter.slice();
          geometry[knight] = null;
          geometry[square] = piece;
          if (!attacksSquare(geometry, square, move.to)) continue;
          const queen = queens.find(target => attacksSquare(geometry, square, target));
          if (queen == null) continue;
          predicates.push("king_recapture_square_on_knight_royal_fork");
          facts.push(`king_recapture_square_on_knight_royal_fork(${san},knight=${coloredPieceLabel(piece, knight)},fork=${squareName(square)},king_capture=${squareName(move.to)},queen=${squareName(queen)},scope=static_geometry)`);
        }
      }
    }

    const ownKingForSupport = boardAfter.findIndex(piece => piece?.color === moverSide && piece.type === "k");
    if (ownKingForSupport >= 0 && mover.type !== "k") {
      const ring = Array.from({ length: 64 }, (_, square) => square).filter(square => {
        const [file, rank] = fr(square), [kingFile, kingRank] = fr(ownKingForSupport);
        return Math.max(Math.abs(file - kingFile), Math.abs(rank - kingRank)) === 1
          && attacksSquare(boardAfter, move.to, square);
      });
      if (ring.length >= 2) {
        predicates.push("supports_multiple_king_adjacent_squares");
        facts.push(`supports_multiple_king_adjacent_squares(${san},king=${squareName(ownKingForSupport)},squares=${ring.map(squareName).join("+")},scope=static_attack)`);
      }
    }
    const opposingMateThreat = parentCard.meta?.mateThreat;
    if (opposingMateThreat?.attackerSide === other(moverSide)) {
      for (const threat of opposingMateThreat.exactMateMoves || []) {
        const target = threat.mateSquare;
        if (Number.isInteger(target) && attacksSquare(boardAfter, move.to, target)
          && !attacksSquare(boardBefore, move.from, target)) {
          predicates.push("adds_defender_to_threatened_mating_square");
          facts.push(`adds_defender_to_threatened_mating_square(${san},square=${squareName(target)},scope=static_attack)`);
        }
      }
    }

    // Pawn geometry only: inspect the resulting board without playing a reply.
    const isPassedPawn = (board, square, piece) => {
      if (piece?.type !== "p") return false;
      const [file, rank] = fr(square);
      const forward = piece.color === "w" ? 1 : -1;
      return !board.some((enemy, target) => {
        if (enemy?.color !== other(piece.color) || enemy.type !== "p") return false;
        const [targetFile, targetRank] = fr(target);
        return Math.abs(targetFile - file) <= 1 && (targetRank - rank) * forward > 0;
      });
    };
    if (move.promotion) {
      predicates.push("promotion");
      facts.push(`promotion(${san},piece=${move.promotion})`);
      if (move.promotion === "q") predicates.push("queen_promotion");
    }
    if (mover.type === "p" && !capture) {
      predicates.push("pawn_advance");
      facts.push(`pawn_advance(${san})`);
      if (isPassedPawn(boardAfter, move.to, boardAfter[move.to])) {
        predicates.push("advances_passed_pawn");
        facts.push(`advances_passed_pawn(${san})`);
        const [file, rank] = fr(move.to);
        const promotionSquare = (moverSide === "w" ? 0 : 56) + file;
        const bishopDefenders = attackersOnBoard(boardAfter, promotionSquare, moverSide).filter(square => boardAfter[square]?.type === "b");
        if (bishopDefenders.length) {
          predicates.push("promotion_square_defended_by_bishop");
          facts.push(`promotion_square_defended_by_bishop(${san},square=${squareName(promotionSquare)},bishops=${bishopDefenders.map(squareName).join("+")})`);
        }
        if (Math.abs(rank - (moverSide === "w" ? 7 : 0)) === 1) {
          predicates.push("passed_pawn_one_step_from_promotion");
          facts.push(`passed_pawn_one_step_from_promotion(${san})`);
        }
      }
    }
    for (let square = 0; square < 64; square += 1) {
      const pawn = boardAfter[square];
      if (pawn?.color === other(moverSide) && isPassedPawn(boardAfter, square, pawn)
        && attacksSquare(boardAfter, move.to, square)) {
        predicates.push("move_attacks_enemy_passed_pawn");
        facts.push(`move_attacks_enemy_passed_pawn(${san},pawn=${coloredPieceLabel(pawn, square)})`);
        if (mover.type === "r" && fr(move.to)[0] === fr(square)[0]) {
          predicates.push("rook_on_enemy_passed_pawn_file");
          facts.push(`rook_on_enemy_passed_pawn_file(${san},pawn=${coloredPieceLabel(pawn, square)})`);
        }
      }
    }
    // Static geometry: capture a defender of a reachable knight square that
    // attacks the opposing king and queen. The card still examines the reply.
    if (capturedBefore && capturedBefore.type !== "k") {
      const king = boardBefore.findIndex(piece => piece?.color === other(moverSide) && piece.type === "k");
      const queens = boardBefore.flatMap((piece, square) => piece?.color === other(moverSide) && piece.type === "q" ? [square] : []);
      for (let knight = 0; knight < 64 && king >= 0 && queens.length; knight += 1) {
        const piece = boardBefore[knight];
        if (piece?.color !== moverSide || piece.type !== "n") continue;
        for (let square = 0; square < 64; square += 1) {
          if (boardBefore[square]?.color === moverSide || !attacksSquare(boardBefore, knight, square)
            || !attacksSquare(boardBefore, move.to, square)) continue;
          const geometry = boardBefore.slice(); geometry[knight] = null; geometry[square] = piece;
          if (!attacksSquare(geometry, square, king)) continue;
          const queen = queens.find(target => attacksSquare(geometry, square, target));
          if (queen == null) continue;
          predicates.push("capture_defender_of_knight_royal_fork_square");
          facts.push(`capture_defender_of_knight_royal_fork_square(${san},defender=${coloredPieceLabel(capturedBefore, move.to)},knight=${coloredPieceLabel(piece, knight)},fork=${squareName(square)},queen=${squareName(queen)},scope=static_geometry)`);
        }
      }
    }

    // Board geometry only: a legal king capture of a checking offer lands on one arm of
    // a knight fork with its queen. The card must still play and check the fork.
    if (check && !capture && legalReplies.some(reply => reply.to === move.to && reply.mover?.type === "k")) {
      const queens = boardAfter.flatMap((piece, square) => piece?.color === other(moverSide) && piece.type === "q" ? [square] : []);
      for (let knight = 0; knight < 64 && queens.length; knight += 1) {
        const piece = boardAfter[knight];
        if (piece?.color !== moverSide || piece.type !== "n") continue;
        for (let square = 0; square < 64; square += 1) {
          if (boardAfter[square]?.color === moverSide || !attacksSquare(boardAfter, knight, square)) continue;
          const geometry = boardAfter.slice();
          geometry[knight] = null;
          geometry[square] = piece;
          if (!attacksSquare(geometry, square, move.to)) continue;
          const queen = queens.find(target => attacksSquare(geometry, square, target));
          if (queen == null) continue;
          predicates.push("king_can_capture_checking_offer_on_knight_royal_fork");
          facts.push(`king_can_capture_checking_offer_on_knight_royal_fork(${san},knight=${coloredPieceLabel(piece, knight)},fork=${squareName(square)},king_capture=${squareName(move.to)},queen=${squareName(queen)},scope=static_geometry)`);
        }
      }
    }

    // Static clearance geometry on the board after this one legal ply.
    // Vacating a square can let a knight fork the enemy king and queen.
    // This does not apply a knight move or assert that any reply permits it.
    if (capture && !boardAfter[move.from]) {
      const king = boardAfter.findIndex(piece => piece?.color === other(moverSide) && piece.type === "k");
      const queens = boardAfter.map((piece, square) => piece?.color === other(moverSide) && piece.type === "q" ? square : -1).filter(square => square >= 0);
      for (let knight = 0; knight < 64 && king >= 0 && queens.length; knight += 1) {
        const piece = boardAfter[knight];
        if (piece?.color !== moverSide || piece.type !== "n" || !attacksSquare(boardAfter, knight, move.from)) continue;
        const geometry = boardAfter.slice();
        geometry[knight] = null;
        geometry[move.from] = piece;
        if (!attacksSquare(geometry, move.from, king)) continue;
        const queen = queens.find(square => attacksSquare(geometry, move.from, square));
        if (queen == null) continue;
        predicates.push("vacates_knight_royal_fork_square");
        facts.push(`vacates_knight_royal_fork_square(${san},knight=${coloredPieceLabel(piece, knight)},square=${squareName(move.from)},king=${squareName(king)},queen=${squareName(queen)},scope=static_geometry)`);
      }
    }

    // A loose piece need not already be attacked for defending it to matter.
    // Compare the same unmoved non-pawn on these two boards, for either side.
    for (let target = 0; target < 64; target += 1) {
      const piece = boardBefore[target];
      if (!piece || piece.color !== moverSide || ["p", "k"].includes(piece.type)
        || target === move.from || !samePieceAt(boardAfter, target, piece)) continue;
      if (effectiveDefendersOnBoard(boardBefore, target, moverSide).length) continue;
      const defenders = effectiveDefendersOnBoard(boardAfter, target, moverSide);
      if (!defenders.length) continue;
      predicates.push("adds_defender_to_loose_non_pawn_piece");
      facts.push(`adds_defender_to_loose_non_pawn_piece(${san},target=${coloredPieceLabel(piece, target)},before=0,after=${defenders.length},defenders=${defenders.map(squareName).join("+")})`);
    }

    // Direct or discovered new pressure on a pawn in the opposing king's ring.
    // This is a geometric attack fact, not a claim that the attack is mate.
    const enemyKing = boardAfter.findIndex((piece) => piece?.color === other(moverSide) && piece.type === "k");
    if (enemyKing >= 0) {
      const [kingFile, kingRank] = fr(enemyKing);
      for (let target = 0; target < 64; target += 1) {
        const piece = boardAfter[target];
        if (piece?.color !== other(moverSide) || piece.type !== "p"
          || !attacksSquare(boardAfter, move.to, target) || attacksSquare(boardBefore, move.from, target)) continue;
        const [pawnFile, pawnRank] = fr(target);
        const distance = piece.color === "b" ? kingRank - pawnRank : pawnRank - kingRank;
        if (Math.abs(kingFile - pawnFile) <= 1 && distance >= 1 && distance <= 2) {
          predicates.push("attacks_king_shelter_pawn");
          facts.push(`attacks_king_shelter_pawn(${san},target=${coloredPieceLabel(piece, target)},king=${squareName(enemyKing)},scope=static_attack)`);
        }
      }
      for (const target of newTargets) {
        if (target.piece.type !== "p") continue;
        const [pawnFile, pawnRank] = fr(target.target);
        if (Math.max(Math.abs(kingFile - pawnFile), Math.abs(kingRank - pawnRank)) !== 1) continue;
        predicates.push("attacks_king_adjacent_pawn");
        facts.push(`attacks_king_adjacent_pawn(${san},target=${coloredPieceLabel(target.piece, target.target)},king=${squareName(enemyKing)},attackers=${target.sources.map(squareName).join("+")})`);
      }
    }

    // A bishop controlling an empty square beside our king can support a mating
    // queen. Report a new attack on that bishop as geometry, not a mate proof.
    const ownKingForHole = boardAfter.findIndex(piece => piece?.color === moverSide && piece.type === "k");
    if (ownKingForHole >= 0) {
      const kingHoles = adjacentSquares(ownKingForHole).filter(square => !boardAfter[square]);
      for (const target of newTargets) {
        if (target.piece.type !== "b") continue;
        const controlledHoles = kingHoles.filter(square => attacksSquare(boardAfter, target.target, square));
        if (!controlledHoles.length) continue;
        predicates.push("attack_bishop_controlling_king_hole");
        facts.push(`attack_bishop_controlling_king_hole(${san},bishop=${coloredPieceLabel(target.piece, target.target)},king=${squareName(ownKingForHole)},empty_controlled_squares=${controlledHoles.map(squareName).join("+")})`);
      }
    }

    // Immediate exchange screen, using the reply list already enumerated above.
    // A legal capture puts the moved piece en prise when its capturer is cheaper,
    // is the king, or the moved piece has no effective defender. Equal or dearer
    // non-king capturers of a protected piece do not pass this screen. This does
    // not certify a whole exchange sequence or make a continuation proof.
    const movedPiece = boardAfter[move.to];
    if (movedPiece && movedPiece.type !== "k") {
      const defenders = effectiveDefendersOnBoard(boardAfter, move.to, moverSide);
      const losingCaptures = legalReplies.filter((reply) => {
        if (reply.to !== move.to) return false;
        const capturer = boardAfter[reply.from];
        return capturer && (capturer.type === "k" || !defenders.length
          || (VALUES[capturer.type] || 0) < (VALUES[movedPiece.type] || 0));
      });
      if (losingCaptures.length) {
        predicates.push("moved_piece_en_prise");
        facts.push(`moved_piece_en_prise(${san},piece=${coloredPieceLabel(movedPiece, move.to)},capturers=${losingCaptures.map(reply => squareName(reply.from)).join("+")},defenders=${defenders.map(squareName).join("+") || "none"})`);
      } else {
        predicates.push("moved_piece_safe");
        facts.push(`moved_piece_safe(${san},scope=immediate_exchange_screen,piece=${coloredPieceLabel(movedPiece, move.to)})`);
      }
    } else if (movedPiece?.type === "k") {
      predicates.push("moved_piece_safe");
      facts.push(`moved_piece_safe(${san},scope=legal_king_move,piece=${coloredPieceLabel(movedPiece, move.to)})`);
    }

    // Symmetric, one-ply defender-count fact for an attacked non-pawn.
    for (const relation of findAttackerSurplusOnNonPawnPieces(boardBefore, other(moverSide), { minAttackers: 1 })) {
      if (move.from === relation.targetSquare) predicates.push("move_hanging_piece");
      if (capture && relation.attackers.some(attacker => attacker.square === move.to)) predicates.push("capture_hanging_piece_attacker");
      if (!samePieceAt(boardOf(after), relation.targetSquare, relation.targetPiece)) continue;
      const defenders = effectiveDefendersOnBoard(boardOf(after), relation.targetSquare, moverSide);
      if (defenders.length > relation.defenders.length) {
        predicates.push("add_defender_to_attacked_piece");
        facts.push(`add_defender_to_attacked_piece(${san},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)},before=${relation.defenders.length},after=${defenders.length},defenders=${defenders.map(squareName).join("+")})`);
      }
    }

    const otherLoosePieces = boardOf(after).flatMap((piece, square) =>
      piece?.color === moverSide && !["p", "k"].includes(piece.type) && square !== move.to
      && effectiveDefendersOnBoard(boardOf(after), square, moverSide).length === 0 ? [square] : []);
    if (otherLoosePieces.length) {
      predicates.push("leaves_other_non_pawn_undefended");
      facts.push(`leaves_other_non_pawn_undefended(${otherLoosePieces.map(squareName).join(",")})`);
    }

    let createdMateThreat = null;
    if (!mate) {
      const exactMateMoves = legalMateThreatMoves(this.createGame, afterFen, moverSide);
      if (exactMateMoves.length) {
        const exactMoveSet = new Set(exactMateMoves.map((candidate) => candidate.uci));
        const visibleThreats = findVisibleMateInOneThreats(boardOf(after), moverSide)
          .filter((threat) => exactMoveSet.has(threat.mateMoveUci))
          .map((threat) => ({ ...clone(threat), sourceMove: move.uci, phase: "threat" }));
        createdMateThreat = {
          kind: "mate_threat",
          attackerSide: moverSide,
          defenderSide: other(moverSide),
          sourceMove: move.uci,
          phase: "threat",
          threats: visibleThreats,
          exactMateMoves: exactMateMoves.map(clone),
          mateMoves: unique(exactMateMoves.map((candidate) => candidate.uci)),
          mateSquares: unique(exactMateMoves.map((candidate) => squareName(candidate.mateSquare)))
        };
        predicates.push("threaten_mate_in_1");
        // Classify the existing exact mate threats; no additional move is searched.
        const opposingKingSquare = boardAfter.findIndex((piece) => piece?.color === other(moverSide) && piece.type === "k");
        const contactMateMoves = exactMateMoves.filter((candidate) => adjacentSquares(opposingKingSquare).includes(candidate.mateSquare));
        if (contactMateMoves.length) {
          predicates.push("threaten_contact_mate_in_1");
          contactMateMoves.forEach((candidate) => facts.push(
            `threaten_contact_mate_in_1(${san},mate=${factToken(candidate.san)},landing=${squareName(candidate.mateSquare)},king=${squareName(opposingKingSquare)})`
          ));
        }
        exactMateMoves.forEach((candidate) => facts.push(
          `mate_in_1_threat_move(${factToken(candidate.san)},uci=${candidate.uci},square=${squareName(candidate.mateSquare)})`
        ));
        visibleThreats.forEach((threat) => facts.push(mateThreatFact(threat)));
        facts.push(`mate_threat_set(moves=${createdMateThreat.mateMoves.join("+")},squares=${createdMateThreat.mateSquares.join("+")})`);
      }
    }


    const newCounterPressure = findNewAttackerSurplusOnNonPawnPieces(
      boardBefore,
      boardOf(after),
      moverSide,
      moverSide === this.rootSide ? { minAttackers: 2, exactDefenders: 1 } : { minAttackers: 1 }
    );
    if (newCounterPressure.length) {
      predicates.push("create_attacker_surplus_on_non_pawn_piece");
      if (moverSide === this.rootSide) predicates.push("attacker_surplus_on_non_pawn_piece");
      for (const relation of newCounterPressure.slice(0, 6)) {
        facts.push(attackerSurplusFact(relation));
        facts.push(
          `create_attacker_surplus_on_non_pawn_piece(${san},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)},attackers=${relation.attackers.map((item) => squareName(item.square)).join("+")},defenders=${relation.defenders.map((item) => squareName(item.square)).join("+") || "none"})`
        );
      }
    }

    // Reuse the existing static safe-attacker test for either color. A protected
    // cheaper attacker may be taken only by the more valuable target itself.
    const safeCounterPressure = findNewAttackerSurplusOnNonPawnPieces(
      boardBefore, boardOf(after), moverSide, { minAttackers: 1 }
    ).filter((relation) => relation.attackers.every((attacker) =>
      addedAttackerIsSafe(boardOf(after), attacker.square, relation.targetSquare, moverSide)));
    if (safeCounterPressure.length) {
      predicates.push("create_safe_attacker_surplus_on_non_pawn_piece");
      for (const relation of safeCounterPressure.slice(0, 6)) {
        facts.push(
          `create_safe_attacker_surplus_on_non_pawn_piece(${san},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)},attackers=${relation.attackers.map((item) => squareName(item.square)).join("+")},defenders=${relation.defenders.map((item) => squareName(item.square)).join("+") || "none"})`
        );
      }
    }

    let backRankEntryRepairs = [];
    if (moverSide === this.rootSide && check) {
      backRankEntryRepairs = findChecksAddingDefenderToBackRankEntrySquare(
        boardBefore,
        boardOf(after),
        moverSide,
        move
      );
      if (backRankEntryRepairs.length) {
        predicates.push("check_adds_defender_to_back_rank_entry_square");
        for (const relation of backRankEntryRepairs) {
          facts.push(
            `check_adds_defender_to_back_rank_entry_square(${san},entry=${squareName(relation.entrySquare)},defender=${coloredPieceLabel(relation.defenderPiece, relation.defenderSquare)},capturer=${coloredPieceLabel(relation.capturerPiece, relation.capturerSquare)},loose_target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)},enemy_entry_piece=${coloredPieceLabel(relation.invaderPiece, relation.invaderSquare)},king=${coloredPieceLabel(boardBefore[relation.kingSquare], relation.kingSquare)})`
          );
        }
      }
    }

    // A checking fork overloads a sole defender when the only captures of the
    // checker come from that defender, while another friendly piece attacks the
    // fork target. Read the board and the existing legal-reply list only.
    if (check) {
      const capturesOfChecker = legalReplies.filter(reply => reply.to === move.to);
      for (const target of newTargets) {
        if (target.piece.type === "k" || VALUES[target.piece.type] <= VALUES[mover.type]) continue;
        const defenders = effectiveDefendersOnBoard(boardOf(after), target.target, other(moverSide));
        if (defenders.length !== 1 || !capturesOfChecker.length || !capturesOfChecker.every(reply => reply.from === defenders[0])) continue;
        const otherAttackers = effectiveDefendersOnBoard(boardOf(after), target.target, moverSide).filter(square => square !== move.to);
        if (!otherAttackers.length) continue;
        predicates.push("checking_fork_overloads_defender");
        facts.push(`checking_fork_overloads_defender(${san},target=${coloredPieceLabel(target.piece, target.target)},defender=${coloredPieceLabel(boardOf(after)[defenders[0]], defenders[0])})`);
      }
    }
    let looseAlignmentCaptures = [];
    // A checking sacrifice can displace the sole defender of a more valuable target.
    // Read the same before/after boards; no extra move is applied.
    if (check) {
      const checkingDeflections = findSafeAttacksOnSoleDefenders(boardBefore, boardOf(after), moverSide, move.to, false)
        .filter((relation) => relation.targetValue > VALUES[mover.type]);
      if (checkingDeflections.length) {
        predicates.push("checking_attack_on_sole_defender");
        for (const relation of checkingDeflections) {
          facts.push(`checking_attack_on_sole_defender(${san},defender=${coloredPieceLabel(relation.defenderPiece, relation.defenderSquare)},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)})`);
        }
      }
    }
    let createdDefenderChases = [];
    if (moverSide === this.rootSide) {
      looseAlignmentCaptures = capturedSoleDefendedTargetOfLooseAlignment(
        boardBefore,
        boardOf(after),
        moverSide,
        move,
        legalReplies
      );
      if (looseAlignmentCaptures.length) {
        predicates.push("attack_sole_defended_piece_of_loose_alignment");
        for (const relation of looseAlignmentCaptures) {
          facts.push(looseAlignmentSoleDefenderFact(relation));
          facts.push(
            `attack_sole_defended_piece_of_loose_alignment(${san},target=${coloredPieceLabel(relation.targetPiece, relation.target)},sole_defender=${coloredPieceLabel(relation.defenderPiece, relation.defender)},loose_back=${coloredPieceLabel(relation.backPiece, relation.back)},slider=${coloredPieceLabel(relation.sliderPiece, relation.slider)})`
          );
        }
      }

      createdDefenderChases = findSafeAttacksOnSoleDefenders(boardBefore, boardOf(after), moverSide, move.to)
        .map((chase) => ({ ...clone(chase), sourceMove: move.uci }));
      if (createdDefenderChases.length) {
        predicates.push("safely_add_attacker_to_defender_of_loose_piece");
        predicates.push("defender_of_loose_piece_is_attacked");
        for (const chase of createdDefenderChases) {
          facts.push(defenderChaseFact(chase));
          facts.push(
            `safely_add_attacker_to_defender_of_loose_piece(${san},defender=${coloredPieceLabel(chase.defenderPiece, chase.defenderSquare)},target=${coloredPieceLabel(chase.targetPiece, chase.targetSquare)})`
          );
        }
      }

      const tacticalAttacks = findAddedTacticalAttacks(boardBefore, boardOf(after), moverSide);
      if (tacticalAttacks.looseNonPawns.length) {
        predicates.push("add_attacker_to_loose_non_pawn_piece");
        tacticalAttacks.looseNonPawns.slice(0, 6).forEach((target) => {
          facts.push(
            `add_attacker_to_loose_non_pawn_piece(target=${coloredPieceLabel(target.targetPiece, target.target)},added=${target.addedAttackers.map(squareName).join("+")})`
          );
        });
      }
      if (tacticalAttacks.pinnedPieces.length) {
        predicates.push("add_attacker_to_pinned_piece");
        tacticalAttacks.pinnedPieces.slice(0, 6).forEach((target) => {
          facts.push(
            `add_attacker_to_pinned_piece(target=${coloredPieceLabel(target.targetPiece, target.target)},added=${target.addedAttackers.map(squareName).join("+")})`
          );
        });
      }
    }

    const availableAlignments = moverSide === this.rootSide
      ? (parentCard.meta?.alignments?.length ? parentCard.meta.alignments : findAlignments(game, moverSide))
      : [];
    const inheritedBindings = Array.isArray(parentCard.meta?.activeAlignmentBindings)
      ? parentCard.meta.activeAlignmentBindings.map(clone)
      : [];
    const candidateBindings = [...inheritedBindings];

    for (const binding of availableAlignments) {
      if (binding.backValue < this.options.objective_gain) continue;
      if (move.from !== binding.middle || !check || boardOf(after)[binding.middle]) continue;
      const frontPiece = boardOf(after)[binding.front];
      const backPiece = boardOf(after)[binding.back];
      if (!frontPiece || frontPiece.color !== binding.side || !backPiece || backPiece.color === binding.side) continue;
      predicates.push("move_middle_with_check");
      facts.push(alignmentFact(binding));
      facts.push(`move_middle_with_check(${san},${squareName(binding.middle)})`);
      candidateBindings.push({ ...clone(binding), phase: "middle_cleared", middleMove: san });
    }

    let alignmentCapture = null;
    for (const binding of candidateBindings) {
      if (moverSide !== binding.side || move.from !== binding.front || move.to !== binding.back || !capture) continue;
      predicates.push("capture_back_of_alignment");
      facts.push(alignmentFact(binding));
      facts.push(`alignment_square_cleared(${squareName(binding.middle)})`);
      facts.push(`capture_back_of_alignment(${san},${coloredPieceLabel(binding.backPiece, binding.back)})`);
      alignmentCapture = {
        target: binding.back,
        targetName: squareName(binding.back),
        capturedValue: VALUES[binding.backPiece?.type] || 0,
        binding: clone(binding)
      };
      break;
    }

    const availableAlignmentChains = moverSide === this.rootSide
      ? (parentCard.meta?.alignmentDefenderChains?.length
          ? parentCard.meta.alignmentDefenderChains.map(clone)
          : findAlignmentDefenderChains(game, moverSide, Number(this.options.objective_gain)))
      : [];
    const inheritedAlignmentChains = Array.isArray(parentCard.meta?.activeAlignmentChains)
      ? parentCard.meta.activeAlignmentChains.map(clone)
      : [];
    const activeAlignmentChains = [];
    const openedBindings = [];

    if (moverSide === this.rootSide && looseAlignmentCaptures.length) {
      for (const relation of looseAlignmentCaptures) {
        activeAlignmentChains.push({
          side: relation.side,
          front: relation.slider,
          middle: relation.defender,
          back: relation.back,
          target: relation.target,
          direction: clone(relation.direction),
          frontPiece: clone(relation.sliderPiece),
          middlePiece: clone(relation.defenderPiece),
          backPiece: clone(relation.backPiece),
          targetPiece: clone(relation.targetPiece),
          backValue: relation.backValue,
          targetValue: relation.targetValue,
          otherDefenders: [],
          attackers: [{ square: move.to, piece: clone(boardAfter[move.to]) }],
          phase: "target_captured",
          sourceMove: move.uci,
          capturingPiece: clone(boardAfter[move.to])
        });
      }
    }

    if (moverSide === this.rootSide && capture) {
      for (const chain of availableAlignmentChains) {
        const defender = (chain.otherDefenders || []).find((item) => item.square === move.to);
        if (!defender || !alignmentDefenderChainSurvives(boardAfter, chain)) continue;
        predicates.push("capture_defender_of_alignment_target");
        facts.push(alignmentDefenderChainFact(chain));
        facts.push(`capture_defender_of_alignment_target(${san},defender=${coloredPieceLabel(defender.piece, defender.square)},target=${coloredPieceLabel(chain.targetPiece, chain.target)})`);
        activeAlignmentChains.push({
          ...refreshAlignmentDefenderChain(boardAfter, chain),
          phase: "defender_captured",
          removedDefenderSquare: defender.square,
          removedDefenderPiece: clone(defender.piece),
          sourceMove: move.uci
        });
      }
    }

    for (const chain of inheritedAlignmentChains) {
      if (chain.phase === "defender_captured") {
        if (moverSide === this.rootSide && capture && move.to === chain.target
          && alignmentDefenderChainSurvives(boardBefore, chain)) {
          predicates.push("capture_alignment_target");
          facts.push(alignmentDefenderChainFact(chain));
          facts.push(`capture_alignment_target(${san},target=${coloredPieceLabel(chain.targetPiece, chain.target)})`);
          activeAlignmentChains.push({
            ...clone(chain),
            phase: "target_captured",
            targetCaptureMove: move.uci,
            capturingPiece: clone(boardAfter[move.to])
          });
        } else if (alignmentDefenderChainSurvives(boardAfter, chain)) {
          activeAlignmentChains.push(refreshAlignmentDefenderChain(boardAfter, chain));
        }
      } else if (chain.phase === "target_captured") {
        if (moverSide !== this.rootSide && move.from === chain.middle) {
          const binding = openedAlignmentBinding(boardAfter, chain);
          if (binding) {
            openedBindings.push(binding);
            facts.push(alignmentDefenderChainFact(chain));
            facts.push(`alignment_square_cleared(${squareName(chain.middle)})`);
            facts.push(`back_piece_exposed(${coloredPieceLabel(chain.backPiece, chain.back)})`);
          }
        }
      }
    }

    const survivingBindings = [
      ...candidateBindings.filter((binding) => {
        if (alignmentCapture && binding.back === alignmentCapture.target) return false;
        return bindingSurvives(boardAfter, binding);
      }),
      ...openedBindings
    ];

    const exposedBindings = survivingBindings.filter((binding) => binding.phase === "middle_cleared");
    if (exposedBindings.length) {
      predicates.push("alignment_back_piece_exposed");
      exposedBindings.slice(0, 6).forEach((binding) => {
        facts.push(`alignment_back_piece_exposed(front=${coloredPieceLabel(binding.frontPiece, binding.front)},back=${coloredPieceLabel(binding.backPiece, binding.back)})`);
      });
    }

    let activeRelations = Array.isArray(parentCard.meta?.activeRelations)
      ? parentCard.meta.activeRelations.map(clone)
      : [];
    if (moverSide === this.rootSide) {
      const tacticalRelations = this._relationsAfterOurMove(
        parentCard,
        game,
        after,
        move,
        capturedBefore,
        materialSwing,
        check
      );
      activeRelations = [
        ...createdDefenderChases,
        ...tacticalRelations,
        ...newCounterPressure.filter((relation) => relation.attackerSide === this.rootSide).map(clone)
      ];

      const attackedRelations = activeRelations.filter((relation) => relation.kind === "attacked_piece");
      const skewerRelations = activeRelations.filter((relation) => relation.kind === "skewer");
      if (attackedRelations.length) {
        predicates.push("attacked_piece");
        const createdNow = attackedRelations.filter((relation) => relation.sourceMove === move.uci);
        if (createdNow.length) {
          predicates.push("check_and_attack_piece");
          for (const relation of createdNow) {
            facts.push(
              `check_and_attack_piece(${san},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)})`
            );
          }
        }
      }
      if (skewerRelations.length) {
        predicates.push("skewer");
        for (const relation of skewerRelations.filter((item) => item.sourceMove === move.uci)) {
          facts.push(
            `skewer(attacker=${coloredPieceLabel(relation.attackerPiece, relation.attackerSquare)},middle=${coloredPieceLabel(relation.blockerPiece, relation.blockerSquare)},target=${coloredPieceLabel(relation.targetPiece, relation.targetSquare)})`
          );
        }
      }
    } else {
      const updated = [];
      for (const relation of activeRelations) {
        if (relation?.kind === "defender_chase") {
          const next = updateDefenderChaseOnBoard(boardAfter, relation, move);
          if (next) {
            updated.push(next);
            facts.push(defenderChaseFact(next));
          }
        } else if (relation) {
          updated.push(clone(relation));
        }
      }
      activeRelations = updated;
    }

    facts.push(`material_balance(${afterMaterial >= 0 ? "+" : ""}${afterMaterial})`);
    if (materialSwing !== 0) facts.push(`material_swing(${materialSwing > 0 ? "+" : ""}${materialSwing})`);

    const id = `${parentCard.id}/${move.uci}`;
    const display = `${movePrefix(parentCard.fen)} ${san}`;
    return {
      id,
      display,
      label: display,
      side: stateSideForFen(afterFen, this.rootSide),
      predicates: unique(predicates),
      facts: unique(facts),
      help: predicates.length
        ? `One-ply oracle predicates: ${unique(predicates).join(" · ")}`
        : "This legal ply has no configured-policy predicate.",
      fen: afterFen,
      depth: Number(parentCard.depth) + 1,
      children: [],
      expanded: false,
      prepared: false,
      move: {
        uci: move.uci,
        san,
        from: squareName(move.from),
        to: squareName(move.to),
        fromIndex: move.from,
        toIndex: move.to,
        promotion: move.promotion,
        mover: mover ? { color: mover.color, type: mover.type, label: pieceLabel(mover, move.from) } : null,
        captured: capturedBefore ? { color: capturedBefore.color, type: capturedBefore.type, label: pieceLabel(capturedBefore, move.to) } : null
      },
      meta: {
        root: false,
        parentId: parentCard.id,
        lastMove: { from: move.from, to: move.to, uci: move.uci, san, moverSide },
        attackTargets: attackTargets.map((target) => ({
          square: target.target,
          squareName: squareName(target.target),
          piece: clone(target.piece),
          value: target.value,
          discovered: Boolean(target.discovered)
        })),
        alignments: [],
        alignmentDefenderChains: [],
        activeAlignmentBindings: survivingBindings.map(clone),
        activeAlignmentChains: activeAlignmentChains.map(clone),
        alignmentCapture,
        activeRelations: activeRelations.map(clone),
        mateThreat: clone(createdMateThreat),
        materialBefore: beforeMaterial,
        materialAfter: afterMaterial,
        materialSwing,
        objectiveGainReached,
        captureValue: VALUES[capturedBefore?.type] || 0,
        legalReplyCount,
        oracleHorizon: 1,
        oracleTerminalProbe: SCRATCHCHESS_ORACLE_TERMINAL_PROBE
      }
    };
  }


  _tagMateThreatReply(card, child, threatSet) {
    const threats = Array.isArray(threatSet?.threats) && threatSet.threats.length
      ? threatSet.threats.map(clone)
      : [clone(threatSet)].filter(Boolean);
    const beforeBoard = boardOf(this._game(card.fen, `${card.display} mate-threat position`));
    const replyGame = this._game(child.fen, `${child.display} mate-threat reply`);
    const board = boardOf(replyGame);
    const mateMoves = legalMateInOneMoves(this.createGame, replyGame, this.rootSide);
    const mateMoveFacts = mateMoves.map((move) =>
      `mate_in_1_move(${factToken(move.san)},uci=${move.uci},square=${squareName(move.mateSquare)})`
    );
    const sourceMoves = unique(threats.map((threat) => threat.sourceMove || threat.mateMoveUci).filter(Boolean));

    child.meta.mateThreat = null;

    if (mateMoves.length) {
      child.predicates = unique([...child.predicates, "mate_in_1_available"]);
      child.facts = unique([
        ...child.facts,
        `mate_in_1_available(count=${mateMoves.length},moves=${mateMoves.map((move) => factToken(move.san)).join("+")})`,
        ...mateMoveFacts,
        `mate_threat_not_answered(sources=${sourceMoves.join("+") || "unknown"})`
      ]);
      const closureFact = `closed_mate_threat_reply(${child.move?.san || child.display},reason=mate_in_1_available,witness=${mateMoves.map((move) => factToken(move.san)).join("+")})`;
      child.facts = unique([...child.facts, closureFact]);
      card.facts = unique([...card.facts, closureFact]);
      return ["mate_in_1_available"];
    }

    const predicates = ["no_mate_in_1_available"];
    const facts = [
      "no_mate_in_1_available",
      `mate_threat_answered(sources=${sourceMoves.join("+") || "unknown"})`
    ];
    const add = (predicate, fact) => {
      predicates.push(predicate);
      if (fact) facts.push(fact);
    };

    const checkPredicates = ["check_with_one_reply", "check_with_two_replies", "check"]
      .filter((predicate) => child.predicates.includes(predicate));
    if (checkPredicates.length) add("countercheck", `countercheck(${child.move?.san || child.display})`);

    const capturedSquare = Number(child.move?.toIndex);
    const captured = child.move?.captured || null;
    const movedTo = Number(child.move?.toIndex);

    for (const threat of threats) {
      const capturedThreatPiece = capturedSquare === threat.attackerSquare
        && captured?.color === this.rootSide
        && captured?.type === threat.attackerPiece?.type;
      if (capturedThreatPiece) {
        add(
          "capture_mate_threat_piece",
          `capture_mate_threat_piece(${child.move?.san || child.display},${coloredPieceLabel(threat.attackerPiece, threat.attackerSquare)},mate=${threat.mateMoveUci})`
        );
      }

      const capturedSupporter = Number.isInteger(threat.supportSquare)
        && capturedSquare === threat.supportSquare
        && captured?.color === this.rootSide
        && captured?.type === threat.supportPiece?.type;
      if (capturedSupporter) {
        add(
          "capture_mate_threat_supporter",
          `capture_mate_threat_supporter(${child.move?.san || child.display},${coloredPieceLabel(threat.supportPiece, threat.supportSquare)},mate=${threat.mateMoveUci})`
        );
      }

      const batteryLine = Array.isArray(threat.lineSquares) ? threat.lineSquares : [];
      const interposed = batteryLine.includes(movedTo)
        && board[movedTo]?.color === other(this.rootSide)
        && Number.isInteger(threat.supportSquare)
        && !attacksSquare(board, threat.supportSquare, threat.mateSquare);
      if (interposed) {
        add(
          "interpose_mate_threat_battery",
          `interpose_mate_threat_battery(${child.move?.san || child.display},square=${squareName(movedTo)},mate=${threat.mateMoveUci})`
        );
      }

      const newMateSquareDefenders = newEffectiveAttackers(
        beforeBoard,
        board,
        threat.mateSquare,
        other(this.rootSide),
        { excludeKing: true }
      );
      if (newMateSquareDefenders.length) {
        add(
          "add_defender_to_mating_square",
          `add_defender_to_mating_square(${child.move?.san || child.display},square=${squareName(threat.mateSquare)},defenders=${newMateSquareDefenders.map(squareName).join("+")},mate=${threat.mateMoveUci})`
        );
      }

      const movedMatingTarget = child.move?.fromIndex === threat.mateSquare
        && child.move?.mover?.color === other(this.rootSide)
        && child.move?.mover?.type === threat.targetPiece?.type;
      if (movedMatingTarget) {
        add(
          "move_mating_target",
          `move_mating_target(${child.move?.san || child.display},from=${squareName(threat.mateSquare)},mate=${threat.mateMoveUci})`
        );
      }

      const movedThreatenedKing = child.move?.mover?.color === other(this.rootSide)
        && child.move?.mover?.type === "k"
        && child.move?.fromIndex === threat.kingSquare;
      if (movedThreatenedKing) {
        add(
          "king_escape_from_mate_threat",
          `king_escape_from_mate_threat(${child.move?.san || child.display},from=${squareName(threat.kingSquare)},to=${squareName(movedTo)},mate=${threat.mateMoveUci})`
        );
      }
    }

    child.predicates = unique([...child.predicates, ...predicates]);
    child.facts = unique([...child.facts, ...facts]);
    return unique(predicates);
  }

  _tagLooseAlignmentReply(card, child) {
    if (!card.predicates.includes("attack_sole_defended_piece_of_loose_alignment")) return [];

    const witnesses = materialObjectiveCaptureMoves(
      this.createGame,
      child.fen,
      this.rootSide,
      this.rootMaterial,
      Number(this.options.objective_gain)
    );

    if (witnesses.length) {
      child.predicates = unique([...child.predicates, "material_objective_capture_in_1_available"]);
      const witnessFacts = witnesses.map((witness) =>
        `material_objective_capture_in_1_move(${factToken(witness.san)},uci=${witness.uci},target=${coloredPieceLabel(witness.captured, witness.to)},swing=+${witness.materialSwing})`
      );
      child.facts = unique([
        ...child.facts,
        `material_objective_capture_in_1_available(count=${witnesses.length})`,
        ...witnessFacts
      ]);
      if (!child.predicates.includes("recapture")) {
        const closureFact = `closed_loose_alignment_reply(${child.move?.san || child.display},reason=material_objective_capture_in_1_available,witness=${witnesses.map((witness) => factToken(witness.san)).join("+")})`;
        child.facts = unique([...child.facts, closureFact]);
        card.facts = unique([...card.facts, closureFact]);
      }
      return ["material_objective_capture_in_1_available"];
    }

    child.predicates = unique([...child.predicates, "no_material_objective_capture_in_1_available"]);
    child.facts = unique([
      ...child.facts,
      "no_material_objective_capture_in_1_available"
    ]);
    return ["no_material_objective_capture_in_1_available"];
  }


  _tagAttackerSurplusReply(card, child, relation, beforeBoard) {
    if (!relation || relation.kind !== "attacker_surplus_on_non_pawn_piece") return [];
    const predicates = [];
    const facts = [];
    const add = (predicate, fact) => {
      predicates.push(predicate);
      if (fact) facts.push(fact);
    };
    const board = boardOf(this._game(child.fen, `${child.display} attacker-surplus reply`));
    const targetPiece = board[relation.targetSquare];
    const sameTarget = Boolean(targetPiece
      && targetPiece.color === relation.defenderSide
      && targetPiece.type === relation.targetPiece?.type);

    if (sameTarget) {
      const defenders = effectiveDefendersOnBoard(board, relation.targetSquare, relation.defenderSide);
      if (defenders.length > relation.defenders.length) {
        add(
          "add_defender_to_attacked_piece",
          `add_defender_to_attacked_piece(${child.move?.san || child.display},target=${coloredPieceLabel(targetPiece, relation.targetSquare)},before=${relation.defenders.length},after=${defenders.length},defenders=${defenders.map(squareName).join("+")})`
        );
      }
    }

    const counterPressure = findNewAttackerSurplusOnNonPawnPieces(
      beforeBoard,
      board,
      relation.defenderSide,
      { minAttackers: 1 }
    ).filter((item) => item.defenderSide === relation.attackerSide);
    if (counterPressure.length) {
      add(
        "create_attacker_surplus_on_non_pawn_piece",
        `counterattack_attacker_surplus(${child.move?.san || child.display},targets=${counterPressure.map((item) => coloredPieceLabel(item.targetPiece, item.targetSquare)).join("+")})`
      );
    }

    if (predicates.length) {
      child.predicates = unique([...child.predicates, ...predicates]);
      child.facts = unique([...child.facts, attackerSurplusFact(relation), ...facts]);
    }
    return unique(predicates);
  }

  _tagDefenderChaseReply(child, chase) {
    if (!chase || chase.kind !== "defender_chase") return [];
    const capturedChaser = Number.isInteger(chase.chaserSquare)
      && child.move?.toIndex === chase.chaserSquare
      && child.move?.captured?.color === this.rootSide;
    const capturedTargetAttacker = (chase.targetAttackers || []).some((attacker) =>
      Number.isInteger(attacker?.square)
      && child.move?.toIndex === attacker.square
      && child.move?.captured?.color === this.rootSide
    );

    const board = boardOf(this._game(child.fen, `${child.display} defender chase reply`));
    const updated = updateDefenderChaseOnBoard(board, chase, {
      from: child.move?.fromIndex,
      to: child.move?.toIndex
    });

    // Capturing either attacker destroys the relation and is still a classified
    // reply. Otherwise the relation must survive on the resulting board.
    if (!updated && !capturedChaser && !capturedTargetAttacker) return [];

    const defenderSquare = updated?.defenderSquare;
    const defenderSafe = Number.isInteger(defenderSquare)
      && effectiveAttackersOnBoard(board, defenderSquare, this.rootSide).length === 0;
    const movedDefender = child.move?.fromIndex === chase.defenderSquare
      && child.move?.mover?.color === chase.defenderPiece?.color
      && child.move?.mover?.type === chase.defenderPiece?.type;
    const predicates = [];
    const facts = [];

    if (capturedChaser || capturedTargetAttacker) {
      predicates.push("capture_attacker");
      facts.push(`capture_attacker(${child.move?.san || child.display})`);
    } else if (movedDefender && defenderSafe) {
      const predicate = child.predicates.includes("capture")
        ? "capture_and_keep_defending_loose_piece"
        : "move_defender_while_still_defending_loose_piece";
      predicates.push(predicate);
      facts.push(`${predicate}(${child.move?.san || child.display},target=${squareName(chase.targetSquare)})`);
    }

    if (child.predicates.includes("check_with_one_reply")) predicates.push("check_with_one_reply");
    if (child.predicates.includes("check_with_two_replies")) predicates.push("check_with_two_replies");

    if (predicates.length) {
      child.predicates = unique([...child.predicates, ...predicates]);
      child.facts = unique([...child.facts, defenderChaseFact(updated || chase), ...facts]);
    }
    return unique(predicates);
  }

  _classifyHumanReplies(card, analyses) {
    if (card.side !== "their") return false;

    const replyPredicates = new Set();
    const activeRelations = Array.isArray(card.meta?.activeRelations)
      ? card.meta.activeRelations
      : [];
    const hasMateThreat = card.predicates.includes("threaten_mate_in_1");
    const hasLooseAlignmentAttack = card.predicates.includes("attack_sole_defended_piece_of_loose_alignment");
    const attackerSurpluses = activeRelations.filter((relation) => relation?.kind === "attacker_surplus_on_non_pawn_piece");
    const hasAttackerSurplus = attackerSurpluses.length > 0;

    if (card.predicates.includes("up_material")) {
      ["mated", "recapture", "check"].forEach((predicate) => replyPredicates.add(predicate));
    }

    if (hasMateThreat) {
      const threatSet = card.meta?.mateThreat;
      if (!threatSet) throw new Error(`Position ${card.id} has threaten_mate_in_1 without mateThreat board data`);
      analyses.forEach((child) => this._tagMateThreatReply(card, child, threatSet));
      replyPredicates.add("no_mate_in_1_available");
    }

    if (hasLooseAlignmentAttack) {
      analyses.forEach((child) => this._tagLooseAlignmentReply(card, child));
      // Recaptures are deliberately shown. Every other reply is either closed
      // by an exact material-objective capture witness or retained because no
      // such one-ply certificate exists.
      replyPredicates.add("recapture");
      replyPredicates.add("no_material_objective_capture_in_1_available");
    }


    if (hasAttackerSurplus) {
      const beforeBoard = boardOf(this._game(card.fen, `${card.display} attacker-surplus position`));
      for (const relation of attackerSurpluses) {
        analyses.forEach((child) => this._tagAttackerSurplusReply(card, child, relation, beforeBoard));
      }
      [
        "mated",
        "add_defender_to_attacked_piece",
        "check_with_one_reply",
        "check_with_two_replies",
        "check",
        "threaten_mate_in_1",
        "create_attacker_surplus_on_non_pawn_piece"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    const defenderChases = activeRelations.filter((relation) => relation?.kind === "defender_chase");
    if (defenderChases.length) {
      for (const chase of defenderChases) analyses.forEach((child) => this._tagDefenderChaseReply(child, chase));
      [
        "mated",
        "capture_attacker",
        "check_with_one_reply",
        "check_with_two_replies",
        "move_defender_while_still_defending_loose_piece",
        "capture_and_keep_defending_loose_piece"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    const skewers = activeRelations.filter((relation) => relation?.kind === "skewer");
    if (skewers.length) {
      for (const relation of skewers) analyses.forEach((child) => this._tagHumanReply(child, relation));
      [
        "mated", "capture_attacker", "move_skewered_piece", "defend_skewered_piece",
        "block_skewer", "check", "capture"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    const attackedPieces = activeRelations.filter((relation) => relation?.kind === "attacked_piece");
    if (attackedPieces.length) {
      for (const relation of attackedPieces) analyses.forEach((child) => this._tagHumanReply(child, relation));
      [
        "mated", "capture_attacker", "move_attacked_piece", "defend_attacked_piece",
        "block_attack", "check", "capture"
      ].forEach((predicate) => replyPredicates.add(predicate));
    }

    if (!replyPredicates.size) return false;

    const orderedPredicates = [...replyPredicates];
    const relevant = analyses.filter((child) => orderedPredicates.some((predicate) => child.predicates.includes(predicate)));
    const limit = Number(this.options.reply_class_limit);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("oracle reply_class_limit must be an integer >= 1");
    }

    const mateDefenses = hasMateThreat
      ? analyses.filter((child) => child.predicates.includes("no_mate_in_1_available"))
      : [];
    const mateAllowingReplies = hasMateThreat
      ? analyses.filter((child) => child.predicates.includes("mate_in_1_available"))
      : [];
    const facts = [...card.facts];
    if (hasMateThreat) {
      facts.push(`mate_threat_reply_partition(legal=${analyses.length},defenses=${mateDefenses.length},mate_available=${mateAllowingReplies.length},complete=${mateDefenses.length + mateAllowingReplies.length === analyses.length})`);
    }
    if (hasAttackerSurplus) {
      const retained = analyses.filter((child) => [
        "mated",
        "add_defender_to_attacked_piece",
        "check",
        "threaten_mate_in_1",
        "create_attacker_surplus_on_non_pawn_piece"
      ].some((predicate) => child.predicates.includes(predicate)));
      facts.push(`attacker_surplus_reply_partition(legal=${analyses.length},retained=${retained.length},quiet=${analyses.length - retained.length})`);
    }
    if (hasLooseAlignmentAttack) {
      const retained = analyses.filter((child) =>
        child.predicates.includes("recapture")
        || child.predicates.includes("no_material_objective_capture_in_1_available")
      );
      const certifiedClosed = analyses.filter((child) =>
        !child.predicates.includes("recapture")
        && child.predicates.includes("material_objective_capture_in_1_available")
      );
      facts.push(`loose_alignment_reply_partition(legal=${analyses.length},retained=${retained.length},objective_capture_closed=${certifiedClosed.length},complete=${retained.length + certifiedClosed.length === analyses.length})`);
    }
    const nonMatePredicates = orderedPredicates.filter((predicate) => !["no_mate_in_1_available"].includes(predicate));
    if (nonMatePredicates.length) {
      facts.push(`relevant_replies(count=${relevant.length},limit=${limit},predicates=${nonMatePredicates.join("+")})`);
    }
    card.facts = unique(facts);

    if (!hasMateThreat && !hasLooseAlignmentAttack && !hasAttackerSurplus && relevant.length > limit) {
      card.predicates = unique([...card.predicates, "more_than_two_relevant_replies"]);
      card.help = `${relevant.length} immediate replies match the visible human reply cards; the policy limit is ${limit}.`;
    } else if (hasMateThreat) {
      card.help = `${mateDefenses.length} genuine defenses remove every legal mate in one; ${mateAllowingReplies.length} other legal replies close with explicit mating witnesses.`;
    } else if (hasAttackerSurplus) {
      const retained = analyses.filter((child) => [
        "mated",
        "add_defender_to_attacked_piece",
        "check",
        "threaten_mate_in_1",
        "create_attacker_surplus_on_non_pawn_piece"
      ].some((predicate) => child.predicates.includes(predicate)));
      card.help = `${retained.length} replies try to save the overmatched piece or create a forcing counter-threat; ${analyses.length - retained.length} other replies are quiet under this card.`;
    } else if (hasLooseAlignmentAttack) {
      const retained = analyses.filter((child) =>
        child.predicates.includes("recapture")
        || child.predicates.includes("no_material_objective_capture_in_1_available")
      );
      const certifiedClosed = analyses.length - retained.length;
      card.help = `${retained.length} critical replies remain live; ${certifiedClosed} other legal replies close with explicit one-ply material-objective capture witnesses.`;
    }
    return true;
  }

  _preparePosition(id) {
    const card = this.cards.get(id);
    if (!card) throw new Error(`Oracle position ${id} does not exist`);
    if (card.prepared && this.analysis.has(id)) return this.analysis.get(id);

    const game = this._game(card.fen, card.display);
    const sideToMove = normalizeSide(game.state.side);
    const legal = legalMoveRecords(game);
    const inCheck = safeInCheck(game, sideToMove);
    if (inCheck) card.predicates = unique([...card.predicates, "in_check"]);
    if (boardOf(game).every(piece => !piece || ["p", "k"].includes(piece.type))) {
      card.predicates = unique([...card.predicates, "pawn_endgame"]);
      card.facts.push("pawn_endgame(only_kings_and_pawns)");
    }

    card.facts = unique([...card.facts, `legal_moves(${legal.length})`, ...(inCheck ? ["in_check"] : []), "oracle_horizon(1)"]);
    card.meta.legalReplyCount = legal.length;

    // Pawn shelter is a current-board fact for both kings, independent of policy.
    const shelterBoard = boardOf(game);
    for (const kingSide of ["w", "b"]) {
      const kingSquare = shelterBoard.findIndex(piece => piece?.color === kingSide && piece.type === "k");
      if (kingSquare < 0) continue;
      const [kingFile, kingRank] = fr(kingSquare);
      const shelterPawns = shelterBoard.flatMap((piece, square) => {
        if (piece?.color !== kingSide || piece.type !== "p") return [];
        const [file, rank] = fr(square);
        return Math.max(Math.abs(file - kingFile), Math.abs(rank - kingRank)) === 1 ? [square] : [];
      });
      card.facts = unique([...card.facts, `king_pawn_shelter(king=${coloredPieceLabel(shelterBoard[kingSquare], kingSquare)},adjacent_pawns=${shelterPawns.map(squareName).join("+") || "none"})`]);
      if (!shelterPawns.length) card.predicates = unique([...card.predicates,
        kingSide === this.rootSide ? "our_king_has_no_adjacent_pawns" : "opponent_king_has_no_adjacent_pawns"]);
    }

    const pressure = findAttackerSurplusOnNonPawnPieces(boardOf(game), other(sideToMove), { minAttackers: 1 });
    if (pressure.length) card.predicates = unique([...card.predicates, "side_to_move_has_attacked_loose_piece"]);
    if (pressure.some(r => r.attackers.some(a => a.value < r.targetValue))) card.predicates = unique([...card.predicates, "hanging_piece_attacked_by_lower_value_piece"]);

    const terminal = terminalInfo(game);
    if (terminal?.kind === "mate") {
      card.predicates = unique([...card.predicates, terminal.winner === this.rootSide ? "mate" : "mated"]);
    } else if (terminal?.kind === "stalemate") {
      card.predicates = unique([...card.predicates, "stalemate"]);
    }

    const alignments = sideToMove === this.rootSide ? findAlignments(game, sideToMove) : [];
    card.meta.alignments = alignments.map(clone);
    if (alignments.length) {
      card.predicates = unique([...card.predicates, "alignment"]);
      card.facts = unique([...card.facts, ...alignments.slice(0, 8).map(alignmentFact)]);
    }

    const alignmentDefenderChains = sideToMove === this.rootSide
      ? findAlignmentDefenderChains(game, sideToMove, Number(this.options.objective_gain))
      : [];
    card.meta.alignmentDefenderChains = alignmentDefenderChains.map(clone);
    if (alignmentDefenderChains.length) {
      card.predicates = unique([...card.predicates, "alignment_middle_defends_piece"]);
      card.facts = unique([
        ...card.facts,
        ...alignmentDefenderChains.slice(0, 8).map(alignmentDefenderChainFact)
      ]);
    }

    const activeAlignmentChains = Array.isArray(card.meta?.activeAlignmentChains)
      ? card.meta.activeAlignmentChains.filter((chain) => chain.phase === "defender_captured")
      : [];
    if (sideToMove === this.rootSide && activeAlignmentChains.length) {
      card.predicates = unique([...card.predicates, "alignment_capture_chain"]);
      card.facts = unique([
        ...card.facts,
        ...activeAlignmentChains.slice(0, 8).map(alignmentDefenderChainFact)
      ]);
    }


    // Exactly one applied move per legal response. Lexical UCI ordering is only
    // deterministic presentation; predicate order in the DFA supplies interest.
    const analyses = legal
      .map((move) => this._analyzeMove(card, game, move))
      .filter(Boolean)
      .sort((a, b) => String(a.move?.uci || "").localeCompare(String(b.move?.uci || "")));

    const availableMovePredicates = [
      ["check", "check_available"],
      ["mate", "mate_available"],
      ["mated", "mate_available"],
      ["recapture", "recapture_available"],
      ["skewer", "skewer_available"],
      ["capture_back_of_alignment", "capture_back_of_alignment_available"]
    ];
    for (const [movePredicate, positionPredicate] of availableMovePredicates) {
      const matches = analyses.filter((child) => child.predicates.includes(movePredicate));
      if (!matches.length) continue;
      card.predicates = unique([...card.predicates, positionPredicate]);
      card.facts = unique([
        ...card.facts,
        `${positionPredicate}(${matches.slice(0, 6).map((child) => child.move?.san || child.display).join(",")})`
      ]);
    }
    if (inCheck) {
      const counterchecks = analyses.filter((child) => child.predicates.includes("check"));
      if (counterchecks.length) {
        card.predicates = unique([...card.predicates, "countercheck_available"]);
        card.facts = unique([
          ...card.facts,
          `countercheck_available(${counterchecks.slice(0, 6).map((child) => child.move?.san || child.display).join(",")})`
        ]);
      }
    }
    const winningRecaptures = analyses.filter((child) =>
      child.predicates.includes("recapture") && child.predicates.includes("up_material")
    );
    if (winningRecaptures.length) {
      card.predicates = unique([...card.predicates, "winning_recapture_available"]);
      card.facts = unique([
        ...card.facts,
        `winning_recapture_available(${winningRecaptures.slice(0, 6).map((child) => child.move?.san || child.display).join(",")})`
      ]);
    }

    const threatenedSquares = new Set((card.meta?.attackTargets || []).map((target) => Number(target.square)));
    for (const child of analyses) {
      const fromIndex = Number(child.move?.fromIndex);
      if (threatenedSquares.has(fromIndex)) {
        child.predicates = unique([...child.predicates, "save_piece"]);
        child.facts = unique([...child.facts, `save_piece(${child.move.from})`]);
      }
    }

    const replyLimit = Number(this.options.reply_limit);
    if (!Number.isInteger(replyLimit) || replyLimit < 1) throw new Error("oracle reply_limit must be an integer >= 1");

    const twoOrFewer = card.side === "their" && legal.length <= replyLimit;
    if (twoOrFewer) {
      card.predicates = unique([...card.predicates, "two_or_fewer_legal_moves"]);
      card.facts = unique([...card.facts, `two_or_fewer_legal_moves(count=${legal.length},limit=${replyLimit})`]);
    }

    let classified = false;
    const hasActiveRelations = Array.isArray(card.meta?.activeRelations) && card.meta.activeRelations.length > 0;
    if (card.side === "their" && (
      card.predicates.includes("up_material")
      || card.predicates.includes("threaten_mate_in_1")
      || card.predicates.includes("attack_sole_defended_piece_of_loose_alignment")
      || card.predicates.includes("attacker_surplus_on_non_pawn_piece")
      || hasActiveRelations
    )) {
      classified = this._classifyHumanReplies(card, analyses);
    }

    if (card.side === "their"
      && !card.predicates.includes("up_material")
      && !twoOrFewer
      && !classified
      && !card.predicates.includes("mated")
      && !card.predicates.includes("stalemate")) {
      card.predicates = unique([...card.predicates, "more_than_two_legal_replies"]);
      card.facts = unique([...card.facts, `more_than_two_legal_replies(count=${legal.length},limit=${replyLimit})`]);
      card.help = `The opponent has ${legal.length} legal moves and no human reply card in this basic policy narrows them.`;
    }

    card.prepared = true;
    this.analysis.set(id, analyses);
    return analyses;
  }

  preparePosition(id) {
    this._preparePosition(id);
    return this.getPosition(id);
  }

  expandPosition(id) {
    const card = this.cards.get(id);
    if (!card) throw new Error(`Oracle position ${id} does not exist`);
    if (card.expanded) return this.getPosition(id);
    if (Number(card.depth) >= this.policyDepth) {
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    const analyses = this._preparePosition(id);
    if (card.predicates.includes("unexplorable")) {
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    const expandedChildren = analyses;

    const maxPositions = this.options.max_positions;
    const unseen = expandedChildren.filter((child) => !this.cards.has(child.id));
    if (this.cards.size + unseen.length > maxPositions) {
      card.predicates = unique([...card.predicates, "oracle_limit", "unexplorable"]);
      card.facts = unique([...card.facts, `oracle_limit(${maxPositions})`]);
      card.help = `Expanding this legal ply set would exceed the oracle card limit ${maxPositions}.`;
      card.expanded = true;
      card.children = [];
      return this.getPosition(id);
    }

    for (const child of expandedChildren) {
      if (!this.cards.has(child.id)) this.cards.set(child.id, child);
    }
    card.children = expandedChildren.map((child) => child.id);
    card.expanded = true;
    return this.getPosition(id);
  }

  _syncCardToRunner(runner, id) {
    const card = this.cards.get(id);
    if (!card) return;
    runner.positions.set(id, cloneCard(card));
    if (!Array.isArray(runner.project.positions)) runner.project.positions = [];
    const index = runner.project.positions.findIndex((position) => position.id === id);
    if (index >= 0) runner.project.positions[index] = cloneCard(card);
    else runner.project.positions.push(cloneCard(card));
  }

  /**
   * Make the current ScratchChess facts available before predicate.js executes
   * its next state. This mutates only the runner's oracle position map.
   */
  hydrateRunner(runner) {
    const snapshot = runner?.snapshot?.();
    const id = snapshot?.current?.id;
    if (!id) return { changed: false, added: [] };
    const beforeIds = new Set(this.cards.keys());
    if (snapshot.stateKind === "inspect") this.preparePosition(id);
    if (snapshot.stateKind === "search") this.expandPosition(id);
    this._syncCardToRunner(runner, id);
    const added = [...this.cards.keys()].filter((cardId) => !beforeIds.has(cardId));
    added.forEach((cardId) => this._syncCardToRunner(runner, cardId));
    // Existing child cards may have received reply-group predicates while the
    // parent was prepared, so synchronize every listed child as well.
    const parent = this.cards.get(id);
    (parent?.children || []).forEach((childId) => this._syncCardToRunner(runner, childId));
    return { changed: true, added };
  }

  summary() {
    return {
      version: SCRATCHCHESS_ORACLE_VERSION,
      horizon: SCRATCHCHESS_ORACLE_HORIZON,
      terminalProbe: SCRATCHCHESS_ORACLE_TERMINAL_PROBE,
      puzzle: clone(this.puzzle),
      rootSide: this.rootSide,
      rootMaterial: this.rootMaterial,
      cards: this.cards.size,
      prepared: [...this.cards.values()].filter((card) => card.prepared).length,
      expanded: [...this.cards.values()].filter((card) => card.expanded).length,
      options: clone(this.options)
    };
  }
}

function createScratchChessOracle(options) {
  return new ScratchChessOracle(options);
}


return {SCRATCHCHESS_ORACLE_VERSION,SCRATCHCHESS_ORACLE_HORIZON,SCRATCHCHESS_ORACLE_TERMINAL_PROBE,attacksSquare,legalMoveRecords,ScratchChessOracle,createScratchChessOracle};
})();

// ----- bundled module: observations.js -----
const M_observations = (() => {
/** Literal board/one-move relations. No card, test, score, desired move, or solver state input. */
const {Radical2Facts: F} = M_geometry;
const {sq,name,other,distance,VALUES:V}=F;
const type=p=>(p||'').toLowerCase(),col=p=>p===p.toUpperCase()?'w':'b';
const rank=(s,c)=>c==='w'?s>>3:7-(s>>3);
const definitions={
 promotion_trade_margin:'The positive balance exceeds loss on the promoted square after any legal capture, crediting an available unpinned nonking geometric defender for the recapture.',
 moved_piece_unattacked:'The moved piece is not geometrically attacked on its destination.',
 move_attacked_piece:'The moving piece is geometrically attacked before its move.',
 king_has_no_legal_step:'The side-to-move king has no legal move to an adjacent square.',
 king_adjacent_checker:'The checking unit ends on a square adjacent to the opposing king.',
 opponent_king_on_back_rank:'The opposing king is on its home rank.',
 low_material:'At most twenty non-king material points remain on the board.',
 rook_endgame:'Both sides have a rook and no queen, knight or bishop remains.',
 lead_exceeds_legal_capture:'Our positive material balance exceeds the greatest value of any single piece the opponent can legally capture now.',
 enemy_advanced_passer:'The opponent has a passed pawn on its sixth or seventh rank.',
 capture_undefended:'The captured unit has no unpinned geometric defender on the preceding board.',
 fork:'The moved unit attacks at least two opposing non-pawn units, counting the king.',
 mover_on_enemy_back_rank:'The moved unit finishes on the opposing back rank.',
 king_toward_pawn:'The king move decreases its distance to at least one pawn remaining on the board.',
 opposition:'The kings share a file or rank with exactly one empty square between them after this king move.',
 supports_pawn_advance:'The moved unit controls an empty square immediately ahead of a friendly pawn.',
 defends_multiple_attacked:'The moved unit defends at least two friendly units which were attacked before the move.',
 defends_attacked_rook:'The moved unit newly defends a friendly rook which was attacked before this move.'
};
function boardFacts(b,solver){
 const o={},enemy=other(solver),units=b.pieces(null,'pnbrq'),total=units.reduce((v,s)=>v+V[type(b.cells[s])],0);
 const balance=b.balance(solver);o[balance<0?'material_deficit':balance===0?'material_equal':'material_advantage']={balance};
 if(!b.pieces(null,'q').length)o.queens_absent={};
 if(b.check()){o.check={king:name(b.king(b.turn)),scope:'current-board'};o.in_check=o.check;}
 if(!b.pieces(null,'nbrq').length)o.pawn_endgame={};
 if(total<=20)o.low_material={total};
 if(b.pieces(solver,'r').length&&b.pieces(enemy,'r').length&&!b.pieces(null,'nbq').length)o.rook_endgame={};
 if(rank(b.king(enemy),enemy)===0)o.opponent_king_on_back_rank={king:name(b.king(enemy))};
 const passers=b.pieces(enemy,'p').filter(s=>b.passed(s)&&rank(s,enemy)>=5);
 if(passers.length)o.enemy_advanced_passer={pawns:passers.map(name)};
 return o;
}
function moveFacts(b,u,n){
 const o={},c=b.turn,e=other(c),a=sq(u.slice(0,2)),z=sq(u.slice(2,4)),t=type(b.cells[a]),attacks=n.attacksFrom(z),cap=b.captureSquare(u);
 if(cap!==null&&!b.attackers(e,cap).some(s=>!b.pinned(e,s)))o.capture_undefended={victim:name(cap)};
 if(!n.legal().some(v=>type(n.cells[sq(v.slice(0,2))])==='k'))o.king_has_no_legal_step={king:name(n.king(n.turn))};
 if(n.check()&&distance(z,n.king(e))===1){
  o.king_adjacent_checker={checker:name(z),king:name(n.king(e))};
  if('brq'.includes(t)&&n.attackers(c,z).some(s=>!n.pinned(c,s))){
   const k=n.king(e),df=(k&7)-(z&7),dr=(k>>3)-(z>>3),step=dr*8+df;
   if((t!=='b'&&(df===0||dr===0))||(t!=='r'&&df&&dr)){
    let q=k+step;
    while(q>=0&&q<64&&Math.abs((q&7)-((q-step)&7))<=1){
     if(n.cells[q]){if(col(n.cells[q])===e&&V[type(n.cells[q])]>=3)o.skewer={checker:name(z),king:name(k),target:name(q),contact:true};break;}q+=step;
    }
   }
  }
 }
 if(!n.attacked(e,z))o.moved_piece_unattacked={mover:name(z)};
 if(b.attacked(e,a))o.move_attacked_piece={piece:name(a),attackers:b.attackers(e,a).map(name)};
 if(u.length===5){
  const defenders=n.attackers(c,z).filter(a=>type(n.cells[a])!=='k'&&!n.pinned(c,a));
  const captures=n.legal().filter(v=>n.captureSquare(v)===z).map(v=>({uci:v,loss:V[type(n.cells[z])]-(defenders.length?V[type(n.cells[sq(v.slice(0,2))])]:0)}));
  const worst=Math.max(0,...captures.map(x=>x.loss)),balance=n.balance(c);
  if(balance>worst)o.promotion_trade_margin={promotion:name(z),balance,worst,defenders:defenders.map(name),captures};
 }
 const targets=attacks.filter(s=>n.cells[s]&&col(n.cells[s])===e&&type(n.cells[s])!=='p');
 if(targets.length>=2)o.fork={mover:name(z),targets:targets.map(name)};
 if(rank(z,c)===7)o.mover_on_enemy_back_rank={square:name(z)};
 if(t==='k'){
  const toward=n.pieces(null,'p').filter(s=>distance(z,s)<distance(a,s));if(toward.length)o.king_toward_pawn={king:name(z),pawns:toward.map(name)};
  const k=n.king(e),dx=Math.abs((z&7)-(k&7)),dy=Math.abs((z>>3)-(k>>3));
  if((dx===0&&dy===2)||(dy===0&&dx===2)){const mid=(z+k)/2;if(!n.cells[mid])o.opposition={kings:[name(z),name(k)]};}
 }
 const promotionPawns=n.pieces(c,'p').filter(p=>rank(p,c)===6);
 for(const p of promotionPawns){const q=p+(c==='w'?8:-8),bishops=n.pieces(c,'b').filter(s=>n.attacksFrom(s).includes(q));if(bishops.length)o.promotion_square_defended_by_bishop={pawn:name(p),promotion:name(q),bishops:bishops.map(name)};}
 const supported=n.pieces(c,'p').map(p=>[p,p+(c==='w'?8:-8)]).filter(([p,x])=>x>=0&&x<64&&!n.cells[x]&&attacks.includes(x));
 if(supported.length)o.supports_pawn_advance={mover:name(z),pawns:supported.map(([p,x])=>({pawn:name(p),advance:name(x)}))};
 const newlyDefended=n.pieces(c,'pnbrq').filter(s=>s!==z&&b.cells[s]===n.cells[s]&&b.attacked(e,s)&&attacks.includes(s));
 if(newlyDefended.length>=2)o.defends_multiple_attacked={mover:name(z),targets:newlyDefended.map(name)};
 const rooks=n.pieces(c,'r').filter(s=>s!==z&&b.cells[s]===n.cells[s]&&b.attacked(e,s)&&attacks.includes(s)&&!b.attacksFrom(a).includes(s));
 if(rooks.length)o.defends_attacked_rook={mover:name(z),rooks:rooks.map(name)};
 const passersSupported=n.pieces(c,'p').filter(p=>p!==z&&n.passed(p)&&attacks.includes(p));
 if(passersSupported.length)o.supports_passed_pawn={mover:name(z),pawns:passersSupported.map(name)};
 // Current inventory and one geometric overloaded-defender relation, not an exchange search.
 if(cap!==null){
  const defs=b.attackers(e,cap).filter(s=>!b.pinned(e,s));
  if(defs.length===1){const defender=defs[0];
   const abandoned=n.pieces(e,'pnbrq').filter(t=>t!==defender&&n.attacksFrom(defender).includes(t)&&n.attackers(e,t).filter(s=>!n.pinned(e,s)).every(s=>s===defender)&&n.attackers(c,t).some(s=>!n.pinned(c,s)));
   const captures=n.legal().filter(v=>n.captureSquare(v)===z);
   const margin=abandoned.map(t=>({target:name(t),value:V[type(n.cells[t])],margin:n.balance(c)-V[type(n.cells[z])]+V[type(n.cells[t])]})).filter(t=>t.margin>0);
   if(margin.length&&captures.length&&captures.every(v=>sq(v.slice(0,2))===defender))o.overload_trade_margin_positive={defender:name(defender),mover:name(z),balance:n.balance(c),paid:V[type(n.cells[z])],abandoned:margin};
  }
 }
 return o;
}

definitions.supports_passed_pawn='The moved unit directly protects a friendly passed pawn.';
definitions.king_capture_lands_in_knight_fork='A legal king capture of the checking unit would place that king and its queen on the two arms of a reachable knight fork.';

definitions.overload_trade_margin_positive='Our balance minus the offered piece plus the target abandoned by its sole overloaded capturer remains positive. Every legal capture of our moved piece uses that defender.';

return {definitions,boardFacts,moveFacts};
})();

// ----- bundled module: endgame-observations.js -----
const M_endgame_observations = (() => {
/** Bound, current-board endgame relationships. A family shares explicit piece witnesses. */
const {Radical2Facts: F} = M_geometry;
const {name,distance,other}=F,ty=p=>(p||'').toLowerCase();
const advance=c=>c==='w'?8:-8,rr=(s,c)=>c==='w'?s>>3:7-(s>>3);
const definitions={
 rook_pins_rook_to_king:'A rook has an opposing rook followed by its king on the same clear ray; exactly one such pin is present.',
 pawn_guards_pinning_rook:'A pawn of ours directly guards the unique pinning rook.',
 pinning_rook_on_seventh:'The unique pinning rook is on our seventh rank.',
 pin_recapture_promotion_clear:'A pawn guarding that rook would have an empty immediate promotion square after recapturing it.',
 pin_promotion_beyond_enemy_king:'The enemy king is more than two king steps from that recapturing pawn’s promotion square.',
 clear_seventh_rank_runner:'Exactly one of our passed pawns is on its seventh rank with an empty promotion square.',
 promotion_beyond_enemy_king:'The king cannot reach that uniquely identified runner or its promotion square before its next push.',
 advanced_counter_steps_doubly_controlled:'Every opposing sixth/seventh-rank passed pawn’s next square is occupied by our piece or controlled by at least two unpinned pieces.'
};
function endgameFacts(b,solver){
 const o={},enemy=other(solver),pins=[];
 for(const rook of b.pieces(solver,'r'))for(const ds of [[1,0],[-1,0],[0,1],[0,-1]]){
  let f=(rook&7)+ds[0],r=(rook>>3)+ds[1],target=null;
  while(f>=0&&f<8&&r>=0&&r<8){const q=r*8+f,p=b.cells[q];if(p){
   const own=p===(solver==='w'?p.toUpperCase():p.toLowerCase());if(own)break;
   if(target===null){if(ty(p)!=='r')break;target=q;}else{if(ty(p)==='k')pins.push({rook,target,king:q});break;}
  } f+=ds[0];r+=ds[1];}
 }
 if(pins.length===1){const x=pins[0],w={rook:name(x.rook),target:name(x.target),king:name(x.king)};o.rook_pins_rook_to_king=w;
  const guards=b.pieces(solver,'p').filter(p=>b.attacksFrom(p).includes(x.rook));
  if(guards.length)o.pawn_guards_pinning_rook={...w,pawns:guards.map(name)};
  if(rr(x.rook,solver)===6)o.pinning_rook_on_seventh=w;
  const next=x.rook+advance(solver);
  if(guards.length&&rr(x.rook,solver)===6&&next>=0&&next<64&&!b.cells[next]){
   o.pin_recapture_promotion_clear={...w,promotion:name(next)};
   if(distance(x.king,next)>2)o.pin_promotion_beyond_enemy_king={...w,promotion:name(next),distance:distance(x.king,next)};
  }
 }
 const ready=b.pieces(solver,'p').filter(p=>b.passed(p)&&rr(p,solver)===6&&!b.cells[p+advance(solver)]);
 if(ready.length===1){const p=ready[0],q=p+advance(solver),k=b.king(enemy),w={pawn:name(p),promotion:name(q),king:name(k)};o.clear_seventh_rank_runner=w;
  if(distance(k,p)>1&&distance(k,q)>2)o.promotion_beyond_enemy_king=w;
 }
 const enemyPawns=b.pieces(enemy,'p').filter(p=>b.passed(p)&&rr(p,enemy)>=5);
 if(enemyPawns.length&&enemyPawns.every(p=>{const n=p+advance(enemy);return n>=0&&n<64&&(b.cells[n]&&b.pieces(solver,'pnbrqk').includes(n)||b.attackers(solver,n).filter(s=>!b.pinned(solver,s)).length>=2);})){o.advanced_counter_steps_doubly_controlled={pawns:enemyPawns.map(name)};}
 const ours=b.pieces(solver,'p'),theirs=b.pieces(enemy,'p'),k=b.king(solver),bs=b.pieces(solver,'b'),be=b.pieces(enemy,'b');
 if(bs.length===1&&be.length===1&&!b.pieces(null,'rnq').length&&(((bs[0]&7)+(bs[0]>>3))%2!==((be[0]&7)+(be[0]>>3))%2))o.opposite_bishop_ending={bishops:[name(bs[0]),name(be[0])]};
 if(ours.some(p=>b.passed(p)&&rr(k,solver)>rr(p,solver)&&Math.abs((p&7)-(k&7))<=1))o.king_ahead_of_passer={king:name(k),pawns:ours.filter(p=>b.passed(p)&&rr(k,solver)>rr(p,solver)&&Math.abs((p&7)-(k&7))<=1).map(name)};
 const escorted=ours.filter(p=>b.passed(p)&&rr(p,solver)<=5).filter(p=>[p+advance(solver),p+2*advance(solver)].every(t=>t>=0&&t<64&&b.attacksFrom(k).includes(t)));
 if(escorted.length)o.king_guards_passer_next_two={king:name(k),pawns:escorted.map(name)};
 const enemyPassers=theirs.filter(p=>b.passed(p));
 if(enemyPassers.length&&enemyPassers.every(p=>{const q=p+advance(enemy);return q>=0&&q<64&&b.pieces(solver,'pnbrqk').includes(q);}))o.enemy_passers_blocked={pawns:enemyPassers.map(name)};
 if(ours.length>=2)o.multiple_own_pawns={pawns:ours.map(name)};
 return o;
}

Object.assign(definitions,{opposite_bishop_ending:'Each side has exactly one bishop, of opposite square colors, and no other nonpawn piece.',king_guards_passer_next_two:'Our king controls both of the next two advance squares of an identified passed pawn.',enemy_passers_blocked:'Every opposing passed pawn has one of our units immediately in front of it.',multiple_own_pawns:'At least two of our pawns remain.'});

definitions.king_ahead_of_passer='Our king is farther advanced than an identified passed pawn, on its file or an adjacent file.';

return {definitions,endgameFacts};
})();

// ----- bundled module: reply-observations.js -----
const M_reply_observations = (() => {
/** One-ply, target-linked reply relations. The current card, source line, and puzzle ID are not inputs. */
const {Radical2Facts: F} = M_geometry;
const {sq,name,other,VALUES:V}=F,ty=p=>(p||'').toLowerCase();
const definitions={
 answers_primary_material_threat:'The reply removes the current highest-valued profitable attack by escaping, capturing, interposing, pinning, or giving the victim adequate protection. The same victim and attackers are witnessed.',
 countercapture_covers_stake:'The immediate capture, less an undefended capturer’s legal exposure, covers the greater of the threatened loss and the preceding captured value.',
 counterattack_covers_stake:'A new attack threatens a larger nominal gain, or an equal gain against the same attacker or its defender. An exposed counterattacker qualifies only when it attacks a participant in the pending exchange, making the offer a deflection rather than an unrelated sacrifice. An equal-or-larger reciprocal exchange offer is not a net material counter-threat. Both targets, the attacking unit and values are witnessed.'
};
function owners(b,c){return b.pieces(c,'pnbrq');}
function attackers(b,c,s){return b.attackers(c,s).filter(a=>!b.pinned(c,a));}
function threat(b,c,s){const aa=attackers(b,other(c),s);if(!aa.length)return {value:0,aa:[]};const defended=attackers(b,c,s).length>0;const cheap=Math.min(...aa.map(a=>V[ty(b.cells[a])]))||0;return {value:Math.max(0,V[ty(b.cells[s])]-(defended?cheap:0)),aa};}
function replyFacts(b,u,n,previousMove){
 const o={},c=b.turn,e=other(c),from=sq(u.slice(0,2)),to=sq(u.slice(2,4)),targets=owners(b,c).map(s=>({s,...threat(b,c,s)}));
 const maximum=Math.max(0,...targets.map(x=>x.value)),prior=V[previousMove?.captured?.type]||0,stake=Math.max(1,maximum,prior),priority=targets.filter(x=>x.value===maximum&&maximum>0),cap=b.captureSquare(u);
 if(maximum>=prior&&priority.length){
  const repaired=priority.every(x=>{const at=x.s===from?to:x.s;if(!n.cells[at]||ty(n.cells[at])!==ty(b.cells[x.s]))return false;return threat(n,c,at).value<x.value;});
  if(repaired)o.answers_primary_material_threat={victims:priority.map(x=>({square:name(x.s),value:x.value,attackers:x.aa.map(name)})),to:name(to)};
 }
 if(cap!==null){const value=V[ty(b.cells[cap])],unsafe=!attackers(n,c,to).length&&n.legal().some(m=>n.captureSquare(m)===to),net=value-(unsafe?V[ty(n.cells[to])]:0);
  if(net>=stake)o.countercapture_covers_stake={captured:name(cap),capturedValue:value,net,stake};
 }
 const attackerSet=new Set(priority.flatMap(x=>x.aa)),connected=new Set(attackerSet);
 for(const a of attackerSet)for(const d of attackers(b,e,a))connected.add(d);
 const offers=[];
 for(const t of owners(n,e)){
  const oldSquare=t===to?null:t,after=threat(n,e,t),before=oldSquare!==null&&b.cells[t]===n.cells[t]?threat(b,e,t):{value:0,aa:[]};
  const fresh=after.aa.filter(a=>(a===to||!before.aa.includes(a)) && (threat(n,c,a).value===0 || connected.has(t)) && !(V[ty(n.cells[a])]>=V[ty(n.cells[t])] && n.attacksFrom(t).includes(a)));
  if(!fresh.length||after.value<=0)continue;
  if(after.value>stake||after.value>=stake&&connected.has(t))offers.push({target:name(t),gain:after.value,attackers:fresh.map(name),linkedToPrimaryExchange:connected.has(t)});
 }
 if(offers.length)o.counterattack_covers_stake={stake,offers};
 return o;
}
function promotionReplyFacts(b,u,n){
 const c=b.turn,e=other(c),from=sq(u.slice(0,2)),to=sq(u.slice(2,4)),o={};
 const runners=b.pieces(e,'p').filter(s=>(e==='w'?s>>3:7-(s>>3))===6&&b.passed(s));
 const covered=runners.filter(p=>{const q=p+(e==='w'?8:-8);if(n.cells[p]!==b.cells[p])return true;if(to===q)return true;
  const before=b.attackers(c,q).filter(a=>!b.pinned(c,a)),after=n.attackers(c,q).filter(a=>!n.pinned(c,a));
  return after.some(a=>a===to?!before.includes(from):!before.includes(a));});
 if(covered.length)o.stops_promotion_step={runner:covered.map(name),mover:name(to)};return o;
}
definitions.stops_promotion_step='Capture an opposing seventh-rank runner, occupy its promotion square, or add control of that square.';

return {definitions,replyFacts,promotionReplyFacts};
})();

// ----- bundled module: oracle.js -----
const M_oracle = (() => {
const {replyFacts,promotionReplyFacts} = M_reply_observations;
const {endgameFacts} = M_endgame_observations;
/** Radical 3 factual extension. No move selection, suite dispatch, or answer input. */
const {ScratchChessOracle} = M_factual_core;
const {Radical2Facts} = M_geometry;
const {boardFacts,moveFacts} = M_observations;
class Radical3Oracle extends ScratchChessOracle {
 constructor(config){super(config);this.facts=new Radical2Facts.ChessFacts(config.createGame);this.probeCounts={currentMatePositions:0,currentMateCandidates:0,replyThreatPositions:0,replyThreatCandidates:0};}
 reset(opts){const root=super.reset(opts);if(opts.previousMove){
  const u=opts.previousMove;const index=s=>(8-Number(s[1]))*8+'abcdefgh'.indexOf(s[0]);
  this.cards.get('root').meta.lastMove={from:index(u.slice(0,2)),to:index(u.slice(2,4)),uci:u,moverSide:this.rootSide==='w'?'b':'w'};
 }return this.getPosition(root.id);}
 expandPosition(id){
  const answer=super.expandPosition(id),c=this.cards.get(id);
  if(!c.literalInspected){
   const b=this.facts.board(c.fen),extra={...boardFacts(b,this.rootSide),...endgameFacts(b,this.rootSide)};
   if(b.turn!==this.rootSide){
    const mate=[];this.probeCounts.currentMatePositions++;
    if(c.prepared&&c.children.length===c.meta.legalReplyCount){for(const id of c.children){const ch=this.cards.get(id);if(ch.predicates.includes('mated'))mate.push(ch.move.uci);}}
    else for(const u of b.legal()){this.probeCounts.currentMateCandidates++;const q=b.apply(u);if(q.check()&&!q.legal().length)mate.push(u);}
    if(mate.length)extra.opponent_mate_in_one={moves:mate};
   }
   c.predicates=[...new Set([...c.predicates,...Object.keys(extra)])];c.observed={...c.observed,...extra};c.literalInspected=true;
  }
  return this.getPosition(id);
 }
 summary(){return {...super.summary(),literalProbes:{...this.probeCounts}};}
 // Publish primitive observations only. Named expressions must be evaluated by
 // predicate-input.js, not bypassed by a same-named historical Oracle tag.
 // Internal chess-fact bookkeeping remains intact for the frozen base Oracle.
 _syncCardToRunner(runner,id){
  super._syncCardToRunner(runner,id);
  const p=runner.positions.get(id);if(!p)return;
  const aliases=runner.policy?.predicate_inputs||{};
  const clean={...p,predicates:p.predicates.filter(k=>!Object.hasOwn(aliases,k))};
  runner.positions.set(id,clean);
  const at=runner.project.positions?.findIndex(p=>p.id===id)??-1;
  if(at>=0)runner.project.positions[at]=clean;
 }
 createProject(policy,name){
  const p=super.createProject(policy,name),aliases=policy.predicate_inputs||{};
  p.positions=p.positions.map(x=>({...x,predicates:x.predicates.filter(k=>!Object.hasOwn(aliases,k))}));
  return p;
 }

 _preparePosition(id){
  const c=this.cards.get(id),done=c?.radical3Observed;
  const children=super._preparePosition(id);if(done)return children;
  const b=this.facts.board(c.fen),bf={...boardFacts(b,this.rootSide),...endgameFacts(b,this.rootSide)};
  c.predicates=[...new Set([...c.predicates,...Object.keys(bf)])];c.observed={...c.observed,...bf};
  c.facts.push(...Object.entries(bf).map(([k,v])=>`${k}: ${JSON.stringify(v)}`));
  for(const ch of children){const nb=this.facts.board(ch.fen),mf={...boardFacts(nb,this.rootSide),...endgameFacts(nb,this.rootSide),...moveFacts(b,ch.move.uci,nb),...replyFacts(b,ch.move.uci,nb,c.move),...promotionReplyFacts(b,ch.move.uci,nb)};
   if(ch.predicates.some(k=>['king_can_capture_checking_offer_on_knight_royal_fork','king_recapture_square_on_knight_royal_fork'].includes(k)))mf.king_capture_lands_in_knight_fork={geometry:ch.facts.filter(f=>f.startsWith('king_can_capture_checking_offer_on_knight_royal_fork')||f.startsWith('king_recapture_square_on_knight_royal_fork'))};
   if(ch.predicates.includes('threaten_mate_in_1'))mf.mating_threat={side:b.turn,source:'existing mate-threat observation'};
   ch.predicates=[...new Set([...ch.predicates,...Object.keys(mf)])];ch.observed={...ch.observed,...mf};ch.facts.push(...Object.entries(mf).map(([k,v])=>`${k}: ${JSON.stringify(v)}`));}
  c.radical3Observed=true;return children;
 }
}

return {Radical3Oracle};
})();

// ----- Post-run grading only: native PGN formatter, unchanged semantics -----
const NATIVE_COMPARISON = (() => {
 const app = {};
 const clone = x => JSON.parse(JSON.stringify(x));
 const positionCard = () => null;
  function humanizeId(value) {
    return String(value || "").toLowerCase().split(/[_\s-]+/).filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  function predicateLabelForPolicy(value, policy) {
    const name = typeof value === "string" ? value : value?.predicate;
    const definition = policy?.predicate_labels?.[name];
    return (typeof definition === "string" ? definition : definition?.label) || humanizeId(name);
  }

  function pgnTag(value) { return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " "); }
  function pgnComment(value) { return String(value ?? "").replace(/[{}]/g, "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim(); }
  function fenTurn(fen) {
    const parts = String(fen || "").trim().split(/\s+/);
    return { side: parts[1] === "b" ? "b" : "w", fullmove: Math.max(1, Number(parts[5] || 1)) };
  }

  function exploredOccurrences(snapshot) {
    return new Set((snapshot?.trace || [])
      .filter((event) => event.type === "line-selected" && event.item?.occurrence)
      .map((event) => event.item.occurrence));
  }

  function exploredNodes(snapshot) {
    const explored = exploredOccurrences(snapshot);
    return (snapshot?.nodes || []).filter((node) => explored.has(node.occurrence));
  }

  function policyStateDef(policy, id) {
    return policy?.states?.find((state) => state.id === id) || null;
  }

  function isOurMoveChoiceState(state, event = {}) {
    return state?.kind === "card" && event.side === "my";
  }

  function ourMoveBatchAudit(snapshot, policy = app.policy) {
    const limit = Number(policy?.our_move_candidate_limit || 5);
    const stateById = new Map((policy?.states || []).map((state) => [state?.id, state]));
    const batches = [];
    let sequence = 0;
    for (const event of snapshot?.trace || []) {
      if (event.type !== "search-complete") continue;
      const state = stateById.get(event.state);
      if (!isOurMoveChoiceState(state, event)) continue;
      sequence += 1;
      const selected = Array.isArray(event.selected) ? event.selected : [];
      batches.push({
        sequence,
        state: event.state,
        position: event.position,
        occurrence: event.occurrence || null,
        selectedCount: Number(event.selectedCount || selected.length || 0),
        selected: clone(selected),
        limit
      });
    }
    const maxSelected = batches.length ? Math.max(...batches.map((batch) => batch.selectedCount)) : 0;
    const violations = batches.filter((batch) => batch.selectedCount > limit);
    return { limit, maxSelected, batchCount: batches.length, batches, violations, pass: violations.length === 0 };
  }

  function moveGenerationByOccurrence(snapshot, policy = app.policy) {
    const generated = new Map();
    for (const event of snapshot?.trace || []) {
      if (event.type !== "predicate-checked" || !event.predicate || !event.state) continue;
      const card = policyStateDef(policy, event.state);
      const source = {
        predicate: event.predicate,
        cardId: event.card || event.state,
        cardLabel: card?.label || card?.id || event.state,
        cardSide: event.side || null
      };
      for (const item of event.selected || []) {
        if (!item?.occurrence) continue;
        generated.set(item.occurrence, source);
      }
    }
    const stateById = new Map((policy?.states || []).map((state) => [state?.id, state]));
    let batchSequence = 0;
    for (const event of snapshot?.trace || []) {
      if (event.type !== "search-complete") continue;
      const state = stateById.get(event.state);
      if (!isOurMoveChoiceState(state, event)) continue;
      batchSequence += 1;
      const items = Array.isArray(event.selected) ? event.selected : [];
      items.forEach((item, index) => {
        if (!item?.occurrence) return;
        const prior = generated.get(item.occurrence) || {
          predicate: item.matchedBy || "matched",
          cardId: event.card || event.state,
            cardLabel: state?.label || state?.id || event.state,
          cardSide: event.side || null
        };
        generated.set(item.occurrence, {
          ...prior,
          ourMoveBatch: batchSequence,
          ourMoveCandidateIndex: index + 1,
          ourMoveBatchSize: items.length,
          ourMoveCandidateLimit: Number(policy?.our_move_candidate_limit || 5)
        });
      });
    }
    return generated;
  }

  function moveSourceText(source, separator = " · ", includeBatch = false, policy = app.policy) {
    if (!source) return "";
    const base = `${predicateLabelForPolicy(source.predicate, policy)}${separator}[${source.cardLabel || source.cardId}]`;
    if (!includeBatch || !source.ourMoveBatch) return base;
    return `${base}${separator}choice ${source.ourMoveCandidateIndex} of ${source.ourMoveBatchSize}`;
  }

  function pgnDiagnosticsByOccurrence(snapshot) {
    const output = new Map();
    const add = (occurrence, text) => {
      if (!occurrence || !text) return;
      if (!output.has(occurrence)) output.set(occurrence, []);
      const items = output.get(occurrence);
      if (!items.includes(text)) items.push(text);
    };
    for (const event of snapshot?.trace || []) {
      if (event.type === "inspect-routed" && event.result === "fail" && event.item?.occurrence) {
        add(event.item.occurrence, `FAIL: ${event.label || "the chess objective is not established"}`);
      } else if (event.type === "branch-complete" && event.result === "fail" && event.item?.occurrence) {
        add(event.item.occurrence, `FAIL: ${event.reason || event.label || "the line does not work"}`);
      } else if (event.type === "depth-closed" && event.item?.occurrence) {
        add(event.item.occurrence, `FAIL: depth budget ${event.depth} reached`);
      }
    }
    return output;
  }

  function formatExploredPgn(snapshot = currentSnapshot(), options = {}) {
    const puzzle = options.puzzle || currentPuzzle() || {};
    const policy = options.policy || app.policy;
    const oracle = options.oracle || app.oracle;
    const policyName = options.policyName || policy?.name || policyLabel();
    const includeDiagnostics = options.includeDiagnostics !== false;
    const diagnostics = includeDiagnostics ? pgnDiagnosticsByOccurrence(snapshot) : new Map();
    const getPosition = (id) => oracle?.getPosition?.(id) || positionCard(id) || null;
    const nodes = exploredNodes(snapshot);
    const generated = moveGenerationByOccurrence(snapshot, policy);
    const nodeMap = new Map(nodes.map((node) => [node.occurrence, node]));
    const byParent = new Map();
    nodes.forEach((node) => {
      const key = node.parent || "ROOT";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(node);
    });
    byParent.forEach((items) => items.sort((a, b) => a.order - b.order));

    // A choice frame is existential: the child that reached
    // DISCARD_CHOICE_FRAME is the move the policy actually committed to. Make
    // that solved choice the PGN mainline even when a higher-priority candidate
    // was explored and refuted first. Required opponent replies remain sibling
    // variations under that principal variation.
    const committedChoiceByParent = new Map();
    for (const event of snapshot?.trace || []) {
      if (event.type !== "choice-proved") continue;
      const occurrence = event.item?.occurrence;
      const node = occurrence ? nodeMap.get(occurrence) : null;
      if (node?.parent) committedChoiceByParent.set(node.parent, node.occurrence);
    }

    const acceptedBelow = new Map();
    const hasAccepted = (node) => {
      if (!node) return false;
      if (acceptedBelow.has(node.occurrence)) return acceptedBelow.get(node.occurrence);
      const value = node.status === "accepted" || (byParent.get(node.occurrence) || []).some(hasAccepted);
      acceptedBelow.set(node.occurrence, value);
      return value;
    };
    const continuationHeight = new Map();
    const heightBelow = (node) => {
      if (!node) return 0;
      if (continuationHeight.has(node.occurrence)) return continuationHeight.get(node.occurrence);
      const children = byParent.get(node.occurrence) || [];
      const value = children.length ? 1 + Math.max(...children.map(heightBelow)) : 0;
      continuationHeight.set(node.occurrence, value);
      return value;
    };
    const orderedChildren = (parentOccurrence) => {
      const children = [...(byParent.get(parentOccurrence) || [])];
      const committed = committedChoiceByParent.get(parentOccurrence);
      const isReplyBatch = children.some((child) => generated.get(child.occurrence)?.cardSide === "their");
      return children.sort((a, b) =>
        Number(b.occurrence === committed) - Number(a.occurrence === committed)
        || (isReplyBatch ? heightBelow(b) - heightBelow(a) : 0)
        || Number(hasAccepted(b)) - Number(hasAccepted(a))
        || a.order - b.order
      );
    };

    const moveText = (node) => {
      const card = getPosition(node.id) || {};
      const parentNode = node.parent ? nodeMap.get(node.parent) : null;
      const parentCard = parentNode ? getPosition(parentNode.id) : null;
      const turn = fenTurn(parentCard?.fen || puzzle.fen);
      const prefix = turn.side === "w" ? `${turn.fullmove}.` : `${turn.fullmove}...`;
      const san = card.move?.san || card.display || card.label || node.id;
      const source = generated.get(node.occurrence);
      const comments = [];
      // Comparison comments use stable predicate names; display comments use this run's policy labels.
      if (source) comments.push(moveSourceText(source, "; ", includeDiagnostics, includeDiagnostics ? policy : null));
      if (includeDiagnostics) comments.push(...(diagnostics.get(node.occurrence) || []));
      const comment = pgnComment(comments.filter(Boolean).join("; "));
      return `${prefix} ${san}${comment ? ` {${comment}}` : ""}`;
    };

    const indent = (depth) => "\t".repeat(Math.max(0, depth));

    const renderPosition = (parentOccurrence, depth = 0, seen = new Set()) => {
      if (seen.has(parentOccurrence)) return [];
      const parentSeen = new Set(seen);
      parentSeen.add(parentOccurrence);
      const children = orderedChildren(parentOccurrence);
      if (!children.length) return [];
      const [main, ...variations] = children;
      const lines = [`${indent(depth)}${moveText(main)}`];

      for (const variation of variations) {
        lines.push(`${indent(depth)}(`);
        lines.push(...renderVariation(variation, depth + 1, parentSeen));
        lines.push(`${indent(depth)})`);
      }

      lines.push(...renderPosition(main.occurrence, depth + 1, parentSeen));
      return lines;
    };

    const renderVariation = (node, depth, seen) => {
      if (!node || seen.has(node.occurrence)) return [];
      // renderPosition marks its parent occurrence as visited. Do not pre-mark the
      // variation node here or its explored continuation disappears from PGN.
      return [
        `${indent(depth)}${moveText(node)}`,
        ...renderPosition(node.occurrence, depth + 1, new Set(seen))
      ];
    };

    const roots = (snapshot?.roots || []).map((occurrence) => nodeMap.get(occurrence)).filter(Boolean);
    const moveLines = [];
    roots.forEach((root, index) => {
      const lines = renderPosition(root.occurrence, index ? 1 : 0, new Set());
      if (!lines.length) return;
      if (index === 0) moveLines.push(...lines);
      else moveLines.push("(", ...lines, ")");
    });
    const movetext = moveLines.join("\n");
    const resultLabel = snapshot?.result ? snapshot.result.toUpperCase() : "RUNNING";
    const batchAudit = ourMoveBatchAudit(snapshot, policy);
    const headers = [
      `[Event "${pgnTag(puzzle.title || "Predicate Chess Tactic")}"]`,
      `[Site "Predicate Chess Tactics"]`,
      `[Result "*"]`,
      `[SetUp "1"]`,
      `[FEN "${pgnTag(puzzle.fen || "")}"]`,
      `[Policy "${pgnTag(policyName)}"]`,
      `[PredicateResult "${pgnTag(resultLabel)}"]`,
      `[PredicatePositionsReached "${exploredNodes(snapshot).length}"]`,
      `[PredicateOurMoveCandidateLimit "${pgnTag(batchAudit.limit)}"]`,
      `[PredicateOurMoveBatchCount "${pgnTag(batchAudit.batchCount)}"]`,
      `[PredicateMaxOurMoveBatch "${pgnTag(batchAudit.maxSelected)}"]`,
      `[PredicateOurMoveClampStatus "${batchAudit.pass ? "PASS" : "FAIL"}"]`,
      `[PredicateFinalReason "${pgnTag(snapshot?.reason || "")}"]`
    ];
    return `${headers.join("\n")}\n\n${movetext || "{No explored move yet.}"}\n*`;
  }

return {format:formatExploredPgn};
})();

// The context below contains actual run observations, never test answers. The
// host invokes auditRadical3Reference only AFTER runHeadless has completed.
let latestReportContext = null;
export class Radical3Oracle extends M_oracle.Radical3Oracle {
 createProject(policy,name) {
  const project=super.createProject(policy,name);
  latestReportContext={oracle:this,policy,puzzle:{fen:this.puzzle.fen,title:this.puzzle.title}};
  return project;
 }
}
export const RADICAL3_ORACLE_VERSION='0.34.0-traced-target-linked-counters+single-file-clamp1';
export const Radical3Facts=M_geometry.Radical2Facts;
export const Radical2Facts=Radical3Facts; // optional reporting compatibility

/** Strict original assertions, isolated from explanatory PGN.
 * Arrays retain the exact existing Lichess source/reply grading.
 * inline-clamp/v1 is the opt-in wrapper for the old EXACT PGN tests only.
 * Expected lines/labels are supplied to this POST-RUN function, not the Oracle.
 * Fourth argument supports archived-record verification without mutable context.
 */
export function auditRadical3Reference(snapshot,sourceUci,fixtureContract=[],context=null) {
 if(Array.isArray(fixtureContract))return M_geometry.auditRadical2Reference(snapshot,sourceUci,fixtureContract);
 const c=fixtureContract;
 if(!c||c.schema!=='radical3-inline-clamp/v1'||c.mode!=='EXACT_PGN'||typeof c.expectedMovetext!=='string')
  throw new Error('Unknown Radical 3 inline test contract');
 const ctx=context||latestReportContext;
 if(!ctx?.policy||!ctx?.oracle||ctx.puzzle?.fen!==c.fen)
  throw new Error('Post-run comparison lacks the actual matching run context');
 const output=NATIVE_COMPARISON.format(snapshot,{...ctx,policyName:'radical3',includeDiagnostics:false});
 const movetext=output.split(/\r?\n\s*\r?\n/).slice(1).join('\n\n').trim();
 const normalize=x=>String(x).replace(/\r\n?/g,'\n').replace(/\u2026/g,'...').replace(/\s+/gu,'');
 const equal=normalize(movetext)===normalize(c.expectedMovetext);
 return {sourcePathPass:equal,replyFixturesPass:true,sourcePliesCovered:equal?1:0,sourcePlies:1,
  comparison:'Original exact predicate/card PGN, ignoring whitespace only',issues:equal?[]:[{kind:'original_exact_pgn_mismatch'}],actualComparisonPgn:output};
}
