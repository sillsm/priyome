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
export const Radical2Oracle=OBSERVATIONS.FiveStudyOracle;
export const RADICAL2_ORACLE_VERSION=CORE.RADICAL2_ORACLE_VERSION;
export const Radical2Facts=CORE.Radical2Facts;
export const radical2ReplyClass=CORE.radical2ReplyClass;
export const auditRadical2Reference=CORE.auditRadical2Reference;
export const completionObservationDefinitions=OBSERVATIONS.NEW_DEFINITIONS;
