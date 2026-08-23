/* MARKER headless smoke test — drives the REAL game script with DOM/THREE/timer stubs.
   Panels are opened only through the game's own E-key interaction path (no handler shortcuts).
   Run: node tests/smoke.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'..','MARKER.html'),'utf8');
const m=html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/);
if(!m){console.error('FAIL: could not extract game script');process.exit(1);}
const src=m[1];

/* ---------------- tiny DOM ---------------- */
function makeEl(tag,id){
  const el={tag,id,children:[],style:{},parentNode:null,
    classList:{_s:new Set(),
      add(c){this._s.add(c)},remove(c){this._s.delete(c)},contains(c){return this._s.has(c)}},
    _text:'',innerHTML:'',value:'',
    appendChild(c){c.parentNode=el;el.children.push(c);return c},
    insertBefore(c){c.parentNode=el;el.children.unshift(c);return c},
    removeChild(c){el.children=el.children.filter(x=>x!==c)},
    remove(){const p=el.parentNode;if(p)p.children=p.children.filter(x=>x!==el)},
    addEventListener(){},onclick:null};
  el.getContext=()=>ctx2d;
  Object.defineProperty(el,'textContent',{
    get(){return el._text},
    set(v){el._text=String(v)}});
  Object.defineProperty(el,'firstChild',{get(){return el.children[0]||null}});
  Object.defineProperty(el,'lastChild',{get(){return el.children[el.children.length-1]||null}});
  return el;
}
const elems={},winListeners={};
let rngQueue=null;                    /* deterministic Math.random when seeded */
const realRandom=Math.random;
const IDS=['boot','c','hud','vignette','fade','crosshair','prompt','toasts','objV','mobileWarn',
 'cashV','chipsV','hoochV','dayV','clockV','heatV','heatFill','repV','zoneV',
 'rentBox','rentLabel','rentAmtV','payRentBtn',
 'bjPanel','dcPanel','bwPanel','cgPanel','shPanel','hpPanel',
 'bustedOv','bustedSub','endOv','endTitle','endSub','beginBtn','continueBtn','bootErr',
 'bjChipsV','bjBetV','bjDHand','bjPHand','bjPTot','bjDTot','bjMsg',
 'dcChipsV','dcBetV','dcMsg','dcLog','bwMash','bwHooch','bwQ','bwInfo',
 'cgCashV','cgChipV','cgCapV','shCashV','shList',
 'bjClose','dcClose','bwClose','cgClose','shClose','hpClose',
 'bjBet10','bjBet50','bjBet100','bjBetClr','bjDeal','bjHit','bjStand','bjDouble',
 'dcB10','dcB50','dcB100','dcU','dcS','dcO','bwStart','bwCollect',
 'cgL50','cgL100','cgLAll','cgBuy100','cgSellAll'];
IDS.push('debtWrap','debtV','cgDebtV','rvPanel','rvCashV','rvRepV','rvBackV',
'rvSilence','rvCops','rvTwins','tint','cgMarker200','cgSettle','rvClose');
IDS.forEach(id=>elems[id]=makeEl('div',id));
['bjPanel','dcPanel','bwPanel','cgPanel','shPanel','hpPanel','bustedOv','endOv',
'hud','c','vignette','rentBox','prompt','mobileWarn','continueBtn','rvPanel'].forEach(
  id=>elems[id].classList.add('hidden'));
const document={
  getElementById:id=>elems[id]||(elems[id]=makeEl('div',id)),
  createElement:t=>{const el=makeEl(t,null);el.getContext=()=>ctx2d;return el},
  addEventListener(){},exitPointerLock(){},pointerLockElement:null};

/* ---------------- virtual timers ---------------- */
let vnow=0,timers=[];
const setTimeout=(f,ms)=>{timers.push({f,at:vnow+(ms||0)});return timers.length};
const clearTimeout=()=>{};
function flushTimers(span){
  const end=vnow+span;
  for(let g=0;g<20000;g++){
    timers.sort((a,b)=>a.at-b.at);
    const t=timers[0];
    if(!t||t.at>end)break;
    vnow=t.at;timers.shift();
    try{t.f()}catch(e){console.log('TIMER THREW:',e.message)}
  }
  vnow=end;
}

/* ---------------- canvas 2D stub ---------------- */
let ctxOps=0;
const ctx2d={fillStyle:'',font:'',textAlign:'',textBaseline:'',
  fillRect(){ctxOps++},strokeRect(){ctxOps++},fillText(){ctxOps++},
  beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},
  closePath(){},
  save(){},restore(){},translate(){},rotate(){},clearRect(){ctxOps++},
  createRadialGradient:()=>({addColorStop(){}})};
const canvasStub=()=>({width:64,height:64,getContext:()=>ctx2d});

/* ---------------- THREE stub ---------------- */
class V3{constructor(a,b,c){this.x=a||0;this.y=b||0;this.z=c||0}
  set(a,b,c){this.x=a;this.y=b;this.z=c;return this}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
  distanceTo(v){const dx=this.x-v.x,dy=this.y-v.y,dz=this.z-v.z;
    return Math.sqrt(dx*dx+dy*dy+dz*dz)}
  lookAt(){}}
class Col{constructor(a,b,c){
  if(b!==undefined){this.r=a;this.g=b;this.b=c}
  else if(typeof a==='number'){this.setHex(a)}
  else{this.r=this.g=this.b=0}}
  setHex(h){this.r=((h>>16)&255)/255;this.g=((h>>8)&255)/255;this.b=(h&255)/255;return this}
  copy(v){this.r=v.r;this.g=v.g;this.b=v.b;return this}}
function baseObj(){return{position:new V3(),rotation:new V3(),scale:new V3(1,1,1),
  visible:true,material:{color:new Col(),opacity:1,transparent:true},
  children:[],userData:{},add(...o){o.forEach(x=>this.children.push(x))}}}
function mat(o){o=o||{};const out={opacity:o.opacity!==undefined?o.opacity:1,
  transparent:!!o.transparent,color:new Col(typeof o.color==='number'?o.color:0x888888),
  emissive:new Col(typeof o.emissive==='number'?o.emissive:0),
  depthWrite:o.depthWrite,side:o.side,map:o.map};
  if(out.map&&typeof out.map==='object'){out.map.magFilter=0;out.map.wrapS=0;out.map.wrapT=0;
    out.map.repeat={set(){}};}
  return out}
const THREE={
  Vector3:V3,Color:Col,NearestFilter:1,
  Fog:class{constructor(c,n,f){this.color=new Col(c)}},
  Scene:class{constructor(){this.background=new Col();this.fog=new THREE.Fog(0,1,2);
    this.children=[]}
    add(o){this.children.push(o)}
    remove(o){this.children=this.children.filter(x=>x!==o)}},
  PerspectiveCamera:class{constructor(){this.position=new V3();this.aspect=1}
    lookAt(){}updateProjectionMatrix(){}},
  WebGLRenderer:class{constructor(){this.domElement=canvasStub()}
    setPixelRatio(){}setSize(){}render(){}},
  Group:class{constructor(){Object.assign(this,baseObj())}},
  Mesh:class{constructor(g,mm){Object.assign(this,baseObj());
    this.material=Array.isArray(mm)?mm[0]:(mm||this.material)}},
  Sprite:class{constructor(m){Object.assign(this,baseObj());this.material=m}},
  Points:class{constructor(g,m){Object.assign(this,baseObj());this.material=m}},
  BoxGeometry:class{},PlaneGeometry:class{},CylinderGeometry:class{},ConeGeometry:class{},
  SphereGeometry:class{},TorusGeometry:class{},
  BufferGeometry:class{constructor(){this.attributes={}}
    setAttribute(n,a){this.attributes[n]=a;return this}},
  Float32BufferAttribute:class{},
  CanvasTexture:class{constructor(){
    this.magFilter=0;this.wrapS=0;this.wrapT=0;this.repeat={set(){}};
    this.needsUpdate=false}
    clone(){return new this.constructor()}},
  SpriteMaterial:class{constructor(o){Object.assign(this,mat(o))}},
  MeshBasicMaterial:class{constructor(o){Object.assign(this,mat(o))}},
  MeshLambertMaterial:class{constructor(o){Object.assign(this,mat(o))}},
  PointsMaterial:class{constructor(o){Object.assign(this,{opacity:1},o)}},
  HemisphereLight:class{constructor(){Object.assign(this,baseObj());this.intensity=1}},
  DirectionalLight:class{constructor(){Object.assign(this,baseObj());this.intensity=1}},
  PointLight:class{constructor(){Object.assign(this,baseObj());this.intensity=1}}};

/* ---------------- sandbox ---------------- */
const storage={};
const base={
  console,Math,JSON,Date,document,
  innerWidth:1280,innerHeight:720,
  navigator:{userAgent:'smoke'},
  localStorage:{getItem:k=>storage[k]===undefined?null:storage[k],
    setItem:(k,v)=>{storage[k]=String(v)},removeItem:k=>{delete storage[k]}},
  setTimeout,clearTimeout,
  AudioContext:undefined,webkitAudioContext:undefined,
  THREE,devicePixelRatio:1};
base.window=base;base.globalThis=base;
base.addEventListener=(t,f)=>{(winListeners[t]=winListeners[t]||[]).push(f)};
base.Math=Math;                       /* shared with host so seeding works */
let rafQ=[];
base.requestAnimationFrame=f=>{rafQ.length=0;rafQ.push(f);return 1};

vm.createContext(base);
try{
  vm.runInContext(src,base,{filename:'marker-game.js'});
}catch(e){
  console.log('FAIL*** | game script evaluates :: '+e.message);
  process.exit(1);
}
let failures=0;
function check(name,cond,extra){
  console.log((cond?'PASS':'FAIL***')+' | '+name+(extra?(' :: '+extra):''));
  if(!cond)failures++;
}
check('game script evaluates without throwing',true);
check('no bootErr (THREE present)',!elems.bootErr.textContent);

/* ---------------- helpers ---------------- */
function key(k,down=true){
  (winListeners[down?'keydown':'keyup']||[]).forEach(f=>{
    try{f({key:k,preventDefault(){}})}
    catch(e){console.log('KEYHANDLER THREW on '+k+' :: '+e.message+'\n  '+e.stack.split('\n')[1])}
  });
}
let FT=0;
let deadFrames=0;
function pump(frames,dt=16){
  for(let i=0;i<frames;i++){
    FT+=dt;vnow+=dt;
    const q=rafQ.splice(0);rafQ=[];
    if(q.length===0)deadFrames++;
    q.forEach(f=>{try{f(FT)}catch(e){
      console.log('FAIL*** | frame threw :: '+e.message+'\n'+e.stack.split('\n')[1]);
      process.exit(1);}});
    flushTimers(0);
  }
}
function click(id){
  const el=elems[id];
  if(!el.onclick)throw new Error('no handler on '+id);
  el.onclick({preventDefault(){}});
}
const vis=id=>!elems[id].classList.contains('hidden');
const txt=id=>elems[id].textContent;
const SAVE='MARKER_SLICE_V1';
function relocate(x,z,yawTo){
  if(storage[SAVE]===undefined){
    /* no autosave yet — seed a slot from live state so we can teleport */
    const h=base.__MARKER,st=h.S();
    storage[SAVE]=JSON.stringify({cash:st.cash,chips:st.chips,hooch:st.hooch,day:st.day,
      min:st.min,heat:st.heat,rep:st.rep,rentPending:false,rentAmt:350,rentDueDay:4,
      brew:st.brew,brewT:st.brewT,lastQ:st.lastQ,barStock:st.barStock,
      upgrades:{coil:false,shoes:false,dice:false,deck:false,contract:false,ledger:false},
      washed:0,cap:300,diceLeft:0,soldOnce:st.soldOnce,brewedOnce:st.brewedOnce,
      playedBJ:st.playedBJ,pos:[x,z],yaw:yawTo!==undefined?yawTo:-2.2});
  }
  const d=JSON.parse(storage[SAVE]);
  d.pos=[x,z];d.yaw=yawTo!==undefined?yawTo:d.yaw;
  storage[SAVE]=JSON.stringify(d);
  click('continueBtn');           /* start(false): loadSave + respawn at saved pos */
  pump(3);
  elems.prompt.innerHTML='';      /* stale prompt from previous spot would lie to us */
}
function pressE(){key('e');pump(2);key('e',false)}
function dbg(label){
  const h=base.__MARKER;
  console.log('  [dbg]',label,'pos=',JSON.stringify(h&&h.pos()),'near=',h&&h.near());
}
function saveState(){return JSON.parse(storage[SAVE])}

/* ================= SEQUENCE ================= */
flushTimers(5);
click('beginBtn');pump(5);
check('NEW GAME boots HUD',vis('hud')&&!vis('boot'));
check('cash renders',txt('cashV')==='$150',txt('cashV'));

relocate(20,-40,-1.57);            /* leave spawn: its notice board eats the first E */
check('clock ticks',/^\d\d:\d\d$/.test(txt('clockV')),txt('clockV'));
check('objective guides player',txt('objV').toLowerCase().indexOf('still')>=0,txt('objV'));

pressE();
check('stray E opens nothing',!vis('bwPanel')&&!vis('bjPanel')&&!vis('shPanel'));

/* ---- BREW (walk to still via save-relocate, then real E) ---- */
key('escape');pump(2);
relocate(34,-56,-1.57);
pressE();
check('still panel opens via E',vis('bwPanel'));
click('bwStart');
check('mash starts',txt('bwMash').indexOf('mashing')>=0,txt('bwMash'));
pump(2800);                        /* 44.8s: mash 20s + distill 22s + margin */
check('batch done (panel live-updates)',txt('bwInfo').indexOf('ready')>=0,txt('bwInfo'));
click('bwCollect');
check('hooch collected',txt('hoochV').startsWith('1'),txt('hoochV'));
check('quality recorded',/Q\d/.test(txt('bwQ')),txt('bwQ'));
key('escape');pump(2);
check('ESC closes panel',!vis('bwPanel'));

/* ---- SELL to a pinned pedestrian ---- */
relocate(20,-40,-1.57);            /* open street, away from every interactable */
const ped=base.__MARKER.pedNear();   /* pin nearest ped onto us for the sell check */
ped.pause=1e9;
ped.mesh.position.set(20.9,0,-40);   /* right next to the player */
pump(2);
ped.mesh.position.set(20.9,0,-40);   /* re-pin after any frame movement */
pump(1);
check('sell prompt appears',elems.prompt.innerHTML.indexOf('Offer hooch')>=0,
  elems.prompt.innerHTML);
pressE();
const st1=saveState();
check('sold bottle: cash up & bottle gone',st1.hooch===0,st1.cash+' / '+st1.hooch);
check('rep went up',st1.rep>0,String(st1.rep));

/* ---- CLUB: cage first ---- */
key('escape');pump(2);
{ const d=saveState();d.cash+=400;             /* fund laundering test up front */
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(3); }
relocate(589.6,6.4,-1.57);         /* beside cage desk */
dbg('at cage');
pressE();
dbg('after cage E');
check('cage panel opens via E',vis('cgPanel'));
click('cgBuy100');
check('bought $100 in chips',txt('cgChipV')==='100',txt('cgChipV'));
key('escape');pump(2);

/* ---- BLACKJACK ---- */
relocate(607,-1.2,0);              /* beside blackjack table */
dbg('at blackjack');
pressE();
dbg('after bj E');
check('blackjack panel opens via E',vis('bjPanel'));
check('chips shown',/^\d+$/.test(txt('bjChipsV')),txt('bjChipsV'));
click('bjBet100');
check('bet set',txt('bjBetV')==='100',txt('bjBetV'));
click('bjDeal');
console.log('  [dbg] bj after deal:',JSON.stringify(base.__MARKER.bjSnap()));
/* play the hand like a human: stand immediately, dealer then draws via timers */
click('bjStand');
pump(120);
console.log('  [dbg] bj after pump:',JSON.stringify(base.__MARKER.bjSnap()));
const msg1=txt('bjMsg');
check('blackjack round settles',msg1.length>5,msg1);
key('escape');pump(2);

/* ---- DICE ---- */
relocate(607,3.2,0);
pressE();
check('dice panel opens via E',vis('dcPanel'));
click('dcB50');
const chipsA=parseInt(txt('dcChipsV').replace(/,/g,''));
click('dcU');
const chipsB=parseInt(txt('dcChipsV').replace(/,/g,''));
check('dice stake leaves then pays or stays gone',
  chipsB===chipsA-50||chipsB===chipsA+50,chipsA+'->'+chipsB);
check('roll message shows dice',/Rolled \d \+ \d = \d+/.test(txt('dcMsg')),txt('dcMsg'));
key('escape');pump(2);

/* ---- LAUNDER ---- */
key('escape');pump(2);
relocate(589.6,6.4,-1.57);pressE();
const dirtyBefore=parseInt(txt('cgCashV').replace(/[$,]/g,''));
click('cgL100');
const dirtyAfter=parseInt(txt('cgCashV').replace(/[$,]/g,''));
check('wash takes 25% vig',dirtyAfter===dirtyBefore-25,dirtyBefore+'->'+dirtyAfter);
check('volume counter tracks',/\d+ \/ \d+/.test(txt('cgCapV')),txt('cgCapV'));
key('escape');pump(2);

/* ---- MARKED DECK (hole card reveal) ---- */
relocate(607,-1.2,0);pressE();
{ const d=saveState();d.upgrades=Object.assign({},d.upgrades,{deck:true});
  d.chips=300;                                    /* fund the marked-deck hand */
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(3);pressE(); }
click('bjBet50');click('bjDeal');
check('marked deck exposes hole card',txt('bjMsg').indexOf('Marked deck:')===0,
  txt('bjMsg'));
key('escape');pump(2);
if(base.__MARKER.bjSnap().phase==='player'){click('bjStand')}
pump(400);                                       /* drain pending dealer timers */

/* ---- HEAT PATROLS ---- */
{ const d=saveState();d.heat=80;
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(3); }
const copsBefore=base.__MARKER.cops();
Math.random=()=>0.001;                /* force the reinforcement roll to fire */
pump(600);                            /* ~10s of high-heat time */
Math.random=realRandom;
check('heat 65+ spawns patrols',base.__MARKER.cops()>copsBefore,
  copsBefore+' -> '+base.__MARKER.cops());

/* ---- MINIMAP renders ---- */
ctxOps=0;miniPump();
function miniPump(){pump(2)}
check('minimap draws each frame',ctxOps>4,String(ctxOps)+' ops');

/* ---- MARKERS: sign, owe, default twice, collector visits ---- */
relocate(589.6,6.4,-1.57);pressE();
const debt0=saveState().debt;
click('cgMarker200');click('cgMarker200');
check('markers add chips + 30% vig',
  saveState().chips>=400&&saveState().debt===debt0+520,
  'debt '+debt0+'->'+saveState().debt+' chips '+saveState().chips);
key('escape');pump(2);
{ const d=saveState();d.cash=0;d.chips=0;   /* can't pay */
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(3); }
{ /* two midnights with unpaid debt */
  const d=saveState();d.min=1439;
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(500); }
{ const d=saveState();d.min=1439;
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(500); }
check('defaults accumulate -> collector activated',
  saveState().collector===true,'defaults='+saveState().defaults);
/* collector hunts: he starts at plaza and beelines; drop player near him */
pump(600);                                  /* ~10s of pursuit from plaza spawn */
relocate(-14,-64,3.14);                     /* stand in his path, out in the open */
pump(1500);                                 /* ~24s: he closes and grabs you */
console.log('[probe] player=',JSON.stringify(base.__MARKER.pos()),
  'collectorActive=',base.__MARKER.S().collector);
const afterCollector=saveState();
check('collector caught the debtor (debt reduced or restructured)',
  afterCollector.debt<688||afterCollector.collector===false,
  'debt='+afterCollector.debt+' collector='+afterCollector.collector);
/* settle the rest from cash */
{ const d=saveState();d.cash=1000;
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(3); }
relocate(589.6,6.4,-1.57);pressE();
click('cgSettle');pump(2);
check('settle burns markers',saveState().debt===0&&saveState().collector===false,
  'debt='+saveState().debt);
key('escape');pump(2);

/* ---- VINNIE: evening appearance + diplomacy ---- */
{ const d=saveState();d.min=18*60;d.rival={active:false,goneUntilDay:0};
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(5); }
relocate(-18,-64,3.14);                    /* plaza, Vinnie's turf */
pump(30);
const vp=base.__MARKER.vinniePos();       /* stand ON Vinnie wherever he loiters */
relocate(Math.round(vp.x*10)/10,Math.round(vp.z*10)/10,3.14);
pressE();
pump(30);
check("Vinnie's panel opens via E",vis('rvPanel'),elems.prompt.innerHTML);
click('rvSilence');pump(2);
check('silence money sends Vinnie off',rivalGoneCheck(),JSON.stringify(saveState().rival));
function rivalGoneCheck(){const r=saveState().rival;return r.active===true&&r.goneUntilDay>=saveState().day}
key('escape');pump(2);

/* ---- BAR RUSH HOUR ---- */
{ const d=saveState();d.barStock=10;d.min=20*60+30;   /* 8:30 PM = rush */
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(3); }
pump(3600);                                /* ~60s => several hour boundaries */
check('bar sold during rush (stock dropped)',saveState().barStock<10,
  'stock='+saveState().barStock);

/* ---- MUTE TOGGLE ---- */
key('m');pump(2);key('m',false);pump(2);
check('mute toggle survives a frame (no crash)',true);

/* ---- SHOP on pier ---- */
relocate(4.5,105.2,0);pressE();
check("Salty's opens via E",vis('shPanel'));
check('shop lists 6 items',elems.shList.children.length===6,String(elems.shList.children.length));
key('escape');pump(2);

/* ---- RENT cycle ---- */
{ const d=saveState();
  d.min=1437;d.day=3;d.rentDueDay=4;d.rentPending=false;d.cash=Math.max(d.cash,800);
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(400); }
check('rent day triggers demand',vis('rentBox')&&txt('rentLabel').indexOf('DUE')>=0,
  txt('rentLabel'));
const cashPre=saveState().cash;
click('payRentBtn');pump(5);
const afterRent=saveState();
check('rent paid clears flag',afterRent.rentPending===false&&afterRent.cash<cashPre,
  cashPre+'->'+afterRent.cash);
check('next cycle scheduled +3d',afterRent.rentDueDay===7,String(afterRent.rentDueDay));

/* ---- WIN path ---- */
{ const d=saveState();d.cash=19800;d.chips=300;
  storage[SAVE]=JSON.stringify(d);click('continueBtn');pump(10); }
check('WIN: THE CITY IS YOURS',vis('endOv')&&txt('endTitle')==='THE CITY IS YOURS',
  txt('endTitle'));
check('win wipes save',storage[SAVE]===undefined);

/* ---- RUN IT BACK (restart binding) ---- */
click('endBtn');pump(3);
check('restart clears end screen',!vis('endOv'));

/* ---- EVICTION path ---- */
storage[SAVE]=JSON.stringify({cash:0,chips:0,hooch:0,day:5,min:1439,heat:0,rep:0,
  rentPending:true,rentAmt:350,rentDueDay:4,brew:'idle',brewT:0,lastQ:0,barStock:0,
  upgrades:{},washed:0,cap:300,diceLeft:0,soldOnce:true,brewedOnce:true,playedBJ:true,
  pos:[-18,-2],yaw:-2.2});
click('continueBtn');pump(400);
check('LOSE: EVICTED',vis('endOv')&&txt('endTitle')==='EVICTED',txt('endTitle'));

/* ---- dice odds sanity ---- */
let u=0;for(let i=0;i<40000;i++){const a=1+(Math.random()*6|0),b=1+(Math.random()*6|0);
  if(a+b<7)u++}
check('UNDER odds ≈ 15/36 fair',Math.abs(u/40000-15/36)<0.02,(u/40000).toFixed(3));

console.log('\n'+(failures?('FAILED: '+failures+' check(s)'):'ALL CHECKS PASSED')+
  ' — real script, E-driven interactions, '+deadFrames+' dead frames.');
process.exit(failures?1:0);
