/* minimal repro: does the real script throw when THREE is present but WebGL renderer creation fails? */
'use strict';
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/../MARKER.html','utf8');
const src=html.match(/<script>\r?\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const noop=()=>{};
class V3{constructor(){this.x=0;this.y=0;this.z=0}set(){return this}copy(){return this}
  distanceTo(){return 0}lookAt(){}}
const sandbox={console,Math,JSON,Date,
  document:{getElementById:()=>null,createElement:()=>({getContext:()=>({})})},
  addEventListener(){},innerWidth:1280,innerHeight:720,navigator:{userAgent:'t'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){return 1}};
sandbox.window=sandbox;
sandbox.THREE={
 Vector3:V3,Color:class{constructor(){}setHex(){return this}copy(){return this}},
 Fog:class{},
 Scene:class{constructor(){this.background={copy:noop};this.fog={color:{copy:noop}};this.children=[]}add(){}remove(){}},
 PerspectiveCamera:class{constructor(){this.position=new V3();this.aspect=1}lookAt(){}updateProjectionMatrix(){}},
 WebGLRenderer:null, /* forces the try/catch failure path */
 Group:class{constructor(){this.position=new V3();this.rotation=new V3();this.children=[];this.userData={}}add(){}},
 Mesh:class{constructor(g,m){this.position=new V3();this.rotation=new V3();this.material=Array.isArray(m)?m[0]:(m||{})}},
 Sprite:class{constructor(m){this.material=m;this.position=new V3()}},
 Points:class{constructor(g,m){this.material=m;this.visible=true;this.position=new V3()}},
 BoxGeometry:class{},PlaneGeometry:class{},CylinderGeometry:class{},ConeGeometry:class{},
 SphereGeometry:class{},TorusGeometry:class{},
 BufferGeometry:class{constructor(){this.attributes={}}setAttribute(n,a){this.attributes[n]=a;return this}},
 Float32BufferAttribute:class{},CanvasTexture:class{constructor(){this.repeat={set:noop}}clone(){return new this.constructor()}},
 SpriteMaterial:class{},MeshBasicMaterial:class{constructor(o){Object.assign(this,o)}},
 MeshLambertMaterial:class{constructor(o){Object.assign(this,o)}},
 PointsMaterial:class{},HemisphereLight:class{constructor(){this.intensity=1}},
 DirectionalLight:class{constructor(){this.intensity=1;this.shadow={mapSize:{},camera:{}}}},
 PointLight:class{constructor(){this.intensity=1}},
 NearestFilter:1,PCFSoftShadowMap:1};
vm.createContext(sandbox);
try{
  vm.runInContext(src,sandbox);
  console.log('no throw — bootErr branch handled gracefully');
}catch(e){
  console.log('THREW:',e.message);
  const ln=(e.stack.match(/evalmachine.*?:(\d+)/)||[])[1];
  if(ln){const L=src.split('\n');
    for(let i=Math.max(0,ln-2);i<Math.min(L.length,+ln+2);i++)console.log((i+1)+'|',L[i]);}
}
