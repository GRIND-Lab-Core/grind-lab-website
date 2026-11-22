/* GRIND Lab research animation. Three.js r160.1; all geometry is procedural. */
(() => {
'use strict';
const TAU = Math.PI * 2, DURATION = 10, ORANGE = 0xff8200, SMOKEY = 0x4b4b4b;
const topicData = [
 {title:'Observe',statement:'Connect signals across<br> people and place.',description:'Remote sensing, street-view imagery, mobility, environmental monitoring, and population-scale digital traces.',keywords:['Multimodal fusion','Georeferenced layers'],alt:'Observe: two satellites scan a 3D landscape while a moving Street View camera vehicle captures geotagged 360-degree images. Mobility traces, environmental sensors, and aligned raster/vector layers feed GeoAI.'},
 {title:'Model',statement:'Detect. Forecast.<br> Explain.',description:'GeoAI learns from spatial graphs and geospatial features to detect, forecast, and explain disaster impacts across space and time.',keywords:['GeoAI','Spatial graph learning'],alt:'Model: the landscape contracts as a three-layer spatial neural network expands above it. A geographic graticule surrounds the model core; a neighborhood graph passes messages and forecast cells progress through time.'},
 {title:'Understand',statement:'Reveal coupled<br> nature–human risks.',description:'Heat, smoke, and flooding intersect with where people live and move, revealing exposure and vulnerability.',keywords:['Explainable GeoAI','Local attribution'],alt:'Understand: the river expands, heat waves rise, smoke moves across the hills, and exposure columns appear around buildings and people. Feature-attribution links and a local-explanation panel reveal illustrative risk drivers.'},
 {title:'Act',statement:'Turn insight<br> into resilience.',description:'Compare GeoAI-informed options, weigh equity and uncertainty, and keep people responsible for decisions about mitigation and recovery.',keywords:['Responsible decision support','Human review'],alt:'Act: flood barriers rise, a route connects people to a health center, new trees grow, and the river recedes. A responsible decision-support terminal passes a recommendation through a human reviewer before the service-access route is highlighted.'}
];
const canvas=document.querySelector('#scene'), visual=canvas.parentElement;
const motion=canvas.closest('.motion');
const buttons=[...motion.querySelectorAll('.topic')];
let inView=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches,time=0,last=0,phase=-1,dragAngle=0,dragStart=null,dirty=true;
let renderer,scene,camera,width=0,height=0;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const phaseDuration = DURATION / topicData.length;
const blendStart = .9;
function weightsAt(t) {
  const position = t / phaseDuration;
  const active = Math.floor(position);
  const elapsed = position - active;
  const progress = Math.min(elapsed / blendStart, 1);
  // Hold the completed track while its scene hands over to the next one.
  const blend = smooth((elapsed - blendStart) / (1 - blendStart));
  const w = topicData.map(() => 0);
  w[active] = 1 - blend;
  w[(active + 1) % w.length] = blend;
  return {active, progress, w};
}
function updateCopy(i){
 if(phase===i)return;phase=i;const d=topicData[i];
 document.querySelector('#topic').innerHTML=d.title+'<span>.</span>';
 document.querySelector('#statement').innerHTML=d.statement;
 document.querySelector('#description').textContent=d.description;
 document.querySelector('#keywords').replaceChildren(...d.keywords.map(t=>{const s=document.createElement('span');s.textContent=t;return s}));
 canvas.setAttribute('aria-label',d.alt);
 buttons.forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',String(i===j))});
}
function playbackUI(){motion.classList.toggle('paused',!playing);document.querySelector('#play-label').textContent=playing?'Pause':'Play';document.querySelector('#play').setAttribute('aria-label',playing?'Pause animation':'Play animation')}
function setTime(t){time=((t%DURATION)+DURATION)%DURATION;last=0;dirty=true;draw(time)}
function selectPhase(i){setTime(i*phaseDuration);document.querySelector('#announcement').textContent=topicData[i].title+'. '+topicData[i].description}
buttons.forEach((b,i)=>b.addEventListener('click',()=>selectPhase(i)));
document.querySelector('#play').addEventListener('click',()=>{playing=!playing;last=0;playbackUI();dirty=true});
document.querySelector('#restart').addEventListener('click',()=>{setTime(0);document.querySelector('#announcement').textContent='Animation restarted.'});
// On a full website, research shortcuts belong to the illustration.
motion.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.code === 'Space' && event.target === visual) {
    event.preventDefault();
    playing = !playing;
    last = 0;
    playbackUI();
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const next = (phase + (event.key === 'ArrowRight' ? 1 : 3)) % 4;
    selectPhase(next);
    if (event.target.closest('.topic')) buttons[next].focus();
  }
});
// Suspend scene rendering when the visitor scrolls through the rest of the site.
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  last = 0;
  if (inView) dirty = true;
}).observe(motion);
document.addEventListener('visibilitychange',()=>{last=0});
reduced.addEventListener('change',e=>{if(e.matches){playing=false;playbackUI()}});
playbackUI();
const labels=[];
function addLabel(text,position,topic,avoid=[]){const el=document.createElement('div');el.className='scene-label';el.textContent=text;document.querySelector('#labels').append(el);labels.push({el,p:new THREE.Vector3(...position),topic,avoid});}
try {
 const context=canvas.getContext('webgl2',{antialias:true,alpha:true})||canvas.getContext('webgl',{antialias:true,alpha:true});
 renderer=context?new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true,powerPreference:'high-performance'}):new ResearchSoftwareRenderer({canvas});
 canvas.dataset.renderer=renderer.isSoftwareRenderer?'software-3d':'webgl';
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0xffffff,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,80);
 const hemi=new THREE.HemisphereLight(0xffffff,0xb0b0b0,2.1);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-5,12,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.camera.near=1;key.shadow.camera.far=35;key.shadow.normalBias=.035;key.shadow.bias=-.00008;key.shadow.radius=4;scene.add(key);
 const fill=new THREE.DirectionalLight(0xffffff,.65);fill.position.set(6,6,-6);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:.10}));ground.rotation.x=-Math.PI/2;ground.position.y=-.52;ground.receiveShadow=true;scene.add(ground);
 const mats={
  white:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.7}),
  porcelain:new THREE.MeshStandardMaterial({color:0xf4f4f4,roughness:.86}),
  gray:new THREE.MeshStandardMaterial({color:SMOKEY,roughness:.8}),
  mid:new THREE.MeshStandardMaterial({color:0xa9a9a9,roughness:.8}),
  pale:new THREE.MeshStandardMaterial({color:0xd8d8d8,roughness:.9}),
  water:new THREE.MeshStandardMaterial({color:0xbfc2c3,roughness:.27,metalness:.12}),
  orange:new THREE.MeshBasicMaterial({color:ORANGE,toneMapped:false}),
  line:new THREE.LineBasicMaterial({color:0xbcbcbc}),
  grid:new THREE.LineBasicMaterial({color:0xe0e0e0}),
  orangeLine:new THREE.LineBasicMaterial({color:ORANGE,toneMapped:false})
 };
 const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 function group(p){let g=new THREE.Group();if(p)p.add(g);return g}
 function box(p,w,h,d,x,y,z,m='white',bevel=false){let geo;if(bevel&&!renderer.isSoftwareRenderer){let r=Math.min(.07,w/5,h/5,d/5),s=new THREE.Shape(),x0=-w/2,y0=-h/2;s.moveTo(x0+r,y0);s.lineTo(x0+w-r,y0);s.quadraticCurveTo(x0+w,y0,x0+w,y0+r);s.lineTo(x0+w,y0+h-r);s.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h);s.lineTo(x0+r,y0+h);s.quadraticCurveTo(x0,y0+h,x0,y0+h-r);s.lineTo(x0,y0+r);s.quadraticCurveTo(x0,y0,x0+r,y0);geo=new THREE.ExtrudeGeometry(s,{depth:Math.max(.01,d-r),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.3,bevelThickness:r*.5,curveSegments:3});geo.translate(0,0,-d/2+r/2)}else geo=new THREE.BoxGeometry(w,h,d,renderer.isSoftwareRenderer?Math.max(1,Math.ceil(w/.38)):1,renderer.isSoftwareRenderer?Math.max(1,Math.ceil(h/.5)):1,renderer.isSoftwareRenderer?Math.max(1,Math.ceil(d/.38)):1);let o=new THREE.Mesh(geo,mats[m]);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(p.name==='landscape'&&h<.08&&y<.30)o.renderOrder=-14;else if(h<=.07&&d<=.025)o.renderOrder=1;p.add(o);return o}
 function sphere(p,r,x,y,z,m='white',sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,renderer.isSoftwareRenderer?10:18,renderer.isSoftwareRenderer?7:12),mats[m]);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;p.add(o);return o}
 function cyl(p,r,h,x,y,z,m='gray',vertices=20){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,renderer.isSoftwareRenderer?Math.min(vertices,10):vertices),mats[m]);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o}
 function line(p,points,orange=false,closed=false){const geo=new THREE.BufferGeometry().setFromPoints(points);const o=closed?new THREE.LineLoop(geo,orange?mats.orangeLine:mats.line):new THREE.Line(geo,orange?mats.orangeLine:mats.line);p.add(o);return o}
 function tube(p,points,r=.015,m='orange'){const curve=new THREE.CatmullRomCurve3(points);const o=new THREE.Mesh(new THREE.TubeGeometry(curve,renderer.isSoftwareRenderer?30:60,r,renderer.isSoftwareRenderer?4:5,false),mats[m]);p.add(o);return o}
 function ring(p,r,y,m='orange',x=0,z=0){if(renderer.isSoftwareRenderer){let pts=Array.from({length:48},(_,i)=>v(r*Math.cos(i*TAU/48),0,r*Math.sin(i*TAU/48)));let o=line(p,pts,m==='orange',true);o.position.set(x,y,z);return o}const o=new THREE.Mesh(new THREE.TorusGeometry(r,.016,6,64),mats[m]);o.rotation.x=Math.PI/2;o.position.set(x,y,z);p.add(o);return o}
 function tree(p,x,z,scale=1,accent=false){const g=group(p);g.position.set(x,.23,z);cyl(g,.043,.42,0,.21,0,'mid',10);sphere(g,.25,0,.62,0,'pale',.90,1.3,.90);if(accent)sphere(g,.08,.13,.82,.06,'orange');g.scale.setScalar(scale);return g}
 const city=group(scene);city.name='landscape';box(city,8.5,.32,6.3,0,-.14,0,'pale',true).renderOrder=-20;box(city,8.5,.18,6.3,0,.09,0,'white',true).renderOrder=-19;
 let pts=[];for(let i=-4;i<=4;i++)pts.push(v(i,.188,-3),v(i,.188,3));for(let i=-3;i<=3;i++)pts.push(v(-4.1,.188,i),v(4.1,.188,i));const groundGrid=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),mats.grid);groundGrid.renderOrder=-18;city.add(groundGrid);
 function rx(z){return -1.55+.45*Math.sin(z*1.15+.7)}
 const riverN=64,riverPos=new Float32Array((riverN+1)*6),riverIdx=[];
 for(let i=0;i<riverN;i++){let a=i*2;riverIdx.push(a,a+2,a+1,a+1,a+2,a+3)}
 const riverGeo=new THREE.BufferGeometry();riverGeo.setAttribute('position',new THREE.BufferAttribute(riverPos,3));riverGeo.setIndex(riverIdx);riverGeo.computeVertexNormals();const water=new THREE.Mesh(riverGeo,mats.water);water.renderOrder=-17;water.receiveShadow=true;water.material.side=THREE.DoubleSide;city.add(water);
 const edgeL=new THREE.BufferGeometry().setFromPoints(Array.from({length:riverN+1},()=>v(0,0,0))),edgeR=edgeL.clone();const leftRiver=new THREE.Line(edgeL,mats.orangeLine),rightRiver=new THREE.Line(edgeR,mats.orangeLine);leftRiver.renderOrder=rightRiver.renderOrder=-16;city.add(leftRiver,rightRiver);
 box(city,7.8,.035,.43,0,.215,1.05,'pale');box(city,.38,.035,5.5,1.35,.215,0,'pale');
 for(let i=0;i<15;i++)box(city,.17,.008,.025,-3.7+i*.52,.238,1.05,'white');
 for(let i=0;i<11;i++)box(city,.025,.008,.17,1.35,.238,-2.55+i*.51,'white');
 box(city,1.4,.12,.56,-1.64,.32,1.05,'white',true);box(city,1.5,.05,.025,-1.64,.48,.80,'mid');box(city,1.5,.05,.025,-1.64,.48,1.30,'mid');
 for(const [x,z,r,h] of [[-3.1,-2.15,1.03,1.4],[-1.95,-2.43,.78,1.0],[-.85,-2.4,.64,.65]]){const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,5),mats.pale);o.position.set(x,.18+h/2,z);o.castShadow=true;city.add(o)}
 const buildingData=[[0,-.15,.66,.68,1.6],[.1,-1.25,.68,.62,1.0],[2.15,-.2,.75,.8,1.75],[3.25,-1.4,.62,.65,.92],[2.25,-1.75,.60,.62,.65],[3.24,.2,.67,.70,1.18],[.02,2.1,.65,.61,.68],[2.25,2.05,.78,.75,.75],[3.30,2.15,.55,.62,.58]];
 let hospital;
 buildingData.forEach(([x,z,w,d,h],i)=>{const g=group(city);g.position.set(x,.23,z);box(g,w,h,d,0,h/2,0,'white',true);box(g,w*.45,.06,d*.4,.07,h+.03,0,'porcelain',true);for(let j=0;j<Math.max(1,Math.floor(h/.32));j++)box(g,w*.68,.065,.014,0,.22+j*.31,d/2+.012,'mid');if(i===7){hospital=g;box(g,.38,.035,.11,0,h+.075,0,'orange');box(g,.11,.035,.38,0,h+.075,0,'orange')}});
 for(const [x,z] of [[-.48,2.45],[-.55,-1.05]]){box(city,.48,.42,.51,x,.44,z,'white',true);const roof=new THREE.Mesh(new THREE.ConeGeometry(.43,.28,4),mats.pale);roof.rotation.y=Math.PI/4;roof.position.set(x,.78,z);city.add(roof)}
 const trees=[[-3.55,2.1],[-3.45,.05],[-3.65,-1.0],[-2.65,-.55],[-.7,-1.8],[.65,-2.6],[3.70,-2.4],[3.75,.9],[.65,2.8],[-.65,.45],[2.9,-2.65]].map(([x,z],i)=>tree(city,x,z,.9+(i%3)*.08));
 const people=[];for(const [x,z] of [[.7,1.55],[1.8,.76],[2.7,1.58],[.68,-.3],[-.5,1.7],[1.8,-1.3]]){const p=group(city);p.position.set(x,.25,z);cyl(p,.045,.17,0,.11,0,'gray',8);sphere(p,.065,0,.25,0,'white');people.push({g:p,x,z})}
 const cars=[];for(let i=0;i<3;i++){const g=group(city);box(g,.35,.13,.18,0,0,0,i===1?'orange':'gray',true);box(g,.16,.075,.14,-.01,.085,0,'pale',true);cars.push(g)}
 // OBSERVE: instruments, scan footprint, and distinct data channels.
 const observe=group(scene);
 const satellite=group(observe);satellite.position.set(-2.8,4.15,-1.9);satellite.rotation.set(.12,0,-.13);box(satellite,.36,.43,.38,0,0,0,'white',true);cyl(satellite,.13,.14,0,-.29,0,'gray');
 for(const side of [-1,1]){box(satellite,.82,.035,.46,side*.68,0,0,'gray');for(let j=0;j<3;j++)box(satellite,.014,.012,.40,side*.68-.25+j*.25,.025,0,'orange')}
 const streetcam=group(observe);streetcam.position.set(-.65,.2,1.8);cyl(streetcam,.038,.7,0,.35,0,'gray',12);sphere(streetcam,.18,0,.80,0,'white');for(let i=0;i<4;i++)sphere(streetcam,.058,.15*Math.cos(i*Math.PI/2),.80,.15*Math.sin(i*Math.PI/2),'gray');ring(streetcam,.24,.78,'orange');
 const sensor=group(observe);sensor.position.set(3.6,.24,2.55);cyl(sensor,.035,.84,0,.42,0,'gray',12);box(sensor,.23,.30,.19,0,1,0,'white',true);for(let i=0;i<3;i++)box(sensor,.16,.015,.014,0,.9+i*.085,.1,'gray');ring(sensor,.26,1.27,'orange');
 const scan=group(observe);line(scan,[v(-.9,.25,-.55),v(.9,.25,-.55),v(.9,.25,.55),v(-.9,.25,.55)],true,true);line(scan,[v(0,.25,-.55),v(0,.25,.55)],true);
 const dataPackets=[],dataCurves=[];
 for(const [i,p] of [[0,[-2.8,3.9,-1.9]],[1,[-.65,1,1.8]],[2,[3.6,1.25,2.55]],[3,[3.5,.35,1.05]],[4,[.55,.45,-1.9]]]){const c=new THREE.QuadraticBezierCurve3(v(...p),v(p[0]*.55,3.5,p[2]*.5),v(0,2.7,0));dataCurves.push(c);line(observe,c.getPoints(36));for(let j=0;j<3;j++){let s=sphere(observe,.045,...p,'orange');dataPackets.push({s,c,offset:j/3+i*.13})}}
 const observationCore=sphere(observe,.18,0,2.7,0,'orange');ring(observe,.48,2.7,'gray');
 // MODEL: a dominant three-layer spatial neural network replaces the instruments.
 const model=group(scene);model.position.set(0,.55,0);
 const network=group(model);const nodePositions=[],modelNodes=[],connections=[];
 for(let layer=0;layer<3;layer++){let y=1.1+layer*1.25,r=layer===1?1.8:1.5;ring(network,r+.17,y,'orange');for(let j=0;j<7;j++){let a=j*TAU/7+layer*.25;let pos=v(r*Math.cos(a),y,r*Math.sin(a));nodePositions.push(pos);let n=sphere(network,.105,pos.x,pos.y,pos.z,j%3===0?'orange':'white');modelNodes.push(n)}}
 for(let layer=0;layer<3;layer++){for(let j=0;j<7;j++){let i=layer*7+j;connections.push(nodePositions[i],nodePositions[layer*7+(j+1)%7]);if(layer<2){connections.push(nodePositions[i],nodePositions[i+7]);if(j%2===0)connections.push(nodePositions[i],nodePositions[(layer+1)*7+(j+2)%7])}}}
 network.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(connections),mats.line));
 const core=box(network,.67,.67,.67,0,2.35,0,'gray',true);for(let i=0;i<3;i++)box(core,.39-i*.07,.035,.015,0,-.15+i*.15,.35,'orange');
 const modelPulses=[];for(let i=0;i<14;i++){let a=nodePositions[i],b=nodePositions[i+7];let o=sphere(network,.045,a.x,a.y,a.z,'orange');modelPulses.push({o,a,b,offset:i/14})}
 const spatialTiles=group(model);for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const o=box(spatialTiles,.31,.055,.31,x*.43,.44,z*.43,(x+z)%3===0?'orange':'white');}
 // UNDERSTAND: hazard processes and exposed communities are spatially explicit.
 const risk=group(city);const heat=[];for(let j=0;j<4;j++){let o=ring(risk,.52+j*.16,.5+j*.30,'orange',2.6,-.1);heat.push(o)}
 const smoke=[];for(let i=0;i<7;i++)smoke.push(sphere(risk,.18,-2.7,1.7,-1.95,'mid',1.15,1,1));
 const exposure=[];for(const [i,x,z,h] of [[0,-.52,2.3,.70],[1,-.5,-.9,1.05],[2,.4,-.1,.65],[3,2.6,.45,.8],[4,3.45,-.4,.55]]){const g=group(risk);g.position.set(x,.24,z);box(g,.12,h,.12,0,h/2,0,'orange');ring(g,.29,.02,'orange');sphere(g,.06,0,h+.12,0,'gray');exposure.push({g,h})}
 // ACT: engineered protection, essential-service access, and recovery.
 const act=group(city);const barriers=[];for(let i=0;i<9;i++){let z=-2.2+i*.54;let g=group(act);g.position.set(rx(z)+.67,.21,z);let o=box(g,.12,.55,.43,0,.275,0,'white',true);box(g,.145,.055,.43,0,.57,0,'orange');barriers.push(g)}
 const recoveryTrees=[[-.7,2.9],[.55,-2.5],[3.75,1.65],[-3.5,1.25]].map(([x,z])=>tree(act,x,z,1,true));
 const routePoints=[v(-.45,.27,2.5),v(.35,.29,2.6),v(1.05,.31,2.65),v(1.6,.31,2.65),v(2.25,.30,2.5)];const safeRoute=new THREE.CatmullRomCurve3(routePoints);const route=tube(act,routePoints,.034,'orange');const routeTotal=route.geometry.index.count;const routePeople=[];for(let i=0;i<3;i++){let g=group(act);cyl(g,.045,.17,0,.11,0,'gray',8);sphere(g,.067,0,.25,0,'white');routePeople.push(g)}
 const hospitalHalo=ring(act,.72,1.08,'orange',2.25,2.05);const hospitalBeacon=cyl(act,.06,.75,2.25,1.45,2.05,'orange',16);
 const shield=group(act);shield.position.set(2.25,2.15,2.05);const shieldPts=[v(-.23,.2,0),v(0,.30,0),v(.23,.2,0),v(.19,-.10,0),v(0,-.28,0),v(-.19,-.10,0)];line(shield,shieldPts,true,true);line(shield,[v(-.10,0,.01),v(-.02,-.08,.01),v(.13,.1,.01)],true);
 const geoai=createGeoAIElements({scene,city,observe,model,network,risk,act,camera,helpers:{group,box,sphere,line,ring,tube,v}});
 const sceneStories=createSceneStories({observe,act,helpers:{group,box,sphere,cyl,line,ring,v}});
 // Labels are anchored to actual 3D coordinates, and belong only to the current scene.
 addLabel('Multimodal data collection',[0,4.1,-2.2],0,[satellite,sceneStories.satellite]);addLabel('Street View images',[.25,1.6,2.15],0);addLabel('Raster + vector layers',[-3.1,2.65,.55],0);addLabel('Environmental data',[3.65,1.8,2.5],0);
 addLabel('Spatial graph',[2.0,1.65,0],1);addLabel('Forecast',[2.1,2.9,0],1);addLabel('Explain',[1.8,4.15,0],1);addLabel('GeoAI',[0,3.45,.10],1);
 addLabel('Smoke',[-2.6,3.2,-1.7],2);addLabel('Heat',[2.65,2.4,-.1],2);addLabel('Flood exposure',[-1.9,.45,2.6],2);
 addLabel('Responsible decision support',[-3.05,2.15,1.75],3);addLabel('Protect',[-.5,1.0,-1.4],3);addLabel('GeoAI-guided access',[1.05,.55,2.65],3);addLabel('Recover',[2.2,2.6,2.05],3);
 function showGroup(g,weight){const s=Math.max(.00001,smooth(weight));g.visible=weight>.0001;g.scale.setScalar(s)}
 function placeLabel(el, centerX, centerY, placed) {
  const halfWidth = el.offsetWidth / 2;
  const halfHeight = el.offsetHeight / 2;
  const x = clamp(centerX, halfWidth + 4, width - halfWidth - 4);
  const y = clamp(centerY, halfHeight + 3, height - halfHeight - 3);
  const neighbours = placed.filter(box => x + halfWidth + 3 > box.left && x - halfWidth - 3 < box.right);
  const candidates = [y, ...neighbours.flatMap(box => [box.top - halfHeight - 3, box.bottom + halfHeight + 3])];
  const top = candidates.sort((a,b) => Math.abs(a-y) - Math.abs(b-y)).find(pos =>
   pos >= halfHeight && pos <= height - halfHeight &&
   neighbours.every(box => pos + halfHeight <= box.top - 3 || pos - halfHeight >= box.bottom + 3)
  ) ?? y;
  el.style.left = x + 'px';
  el.style.top = top + 'px';
  placed.push({left: x-halfWidth, right: x+halfWidth, top: top-halfHeight, bottom: top+halfHeight});
 }
 function size() {
  const bounds = visual.getBoundingClientRect();
  width = Math.max(1, bounds.width);
  height = Math.max(1, bounds.height);
  renderer.setSize(width,height,false);
  const aspect = width / height;
  const viewHeight = Math.max(9.3, 11 / aspect);
  camera.left = -viewHeight * aspect / 2;
  camera.right = -camera.left;
  camera.top = viewHeight / 2;
  camera.bottom = -camera.top;
  camera.updateProjectionMatrix();
  dirty = true;
 }
 new ResizeObserver(size).observe(visual);size();
 canvas.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,a:dragAngle};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging')});
 canvas.addEventListener('pointermove',e=>{if(dragStart){dragAngle=dragStart.a+(e.clientX-dragStart.x)*.005;dirty=true}});
 const release=()=>{dragStart=null;canvas.classList.remove('dragging')};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 function render3D(t,state){
  const {w}=state,a=TAU*t/DURATION;
  const cityS=1-.25*w[1];city.scale.setScalar(cityS);city.position.y=-.35*w[1];
  showGroup(observe,w[0]);showGroup(model,w[1]);showGroup(risk,w[2]);showGroup(act,w[3]);
  // Actual scene geometry, not just captions, changes at every topic transition.
  satellite.position.y=4.15+.10*Math.sin(a);satellite.rotation.y=.12*Math.sin(a);scan.position.set(-1.25+1.35*Math.sin(a),0,-.2+1.20*Math.cos(a));
  observationCore.scale.setScalar(1+.15*Math.sin(a*4));
  dataPackets.forEach(({s,c,offset})=>{let p=(t/2+offset)%1;s.position.copy(c.getPoint(p));s.scale.setScalar(Math.pow(Math.sin(Math.PI*p),.4))});
  network.rotation.y=.16*Math.sin(a);core.rotation.set(.14*Math.sin(a),a,.18*Math.cos(a));
  modelNodes.forEach((o,i)=>o.scale.setScalar(1+.14*Math.sin(a*3-i*.6)));
  modelPulses.forEach(({o,a:p,b,offset})=>{let q=(t/1.3+offset)%1;o.position.lerpVectors(p,b,q);o.scale.setScalar(Math.sin(Math.PI*q))});
  spatialTiles.rotation.y=.05*Math.sin(a*2);
  for(let i=0;i<=riverN;i++){let z=-3.1+i*6.2/riverN,x=rx(z),rw=.27+w[2]*.42;let y=.193+w[2]*.025;riverPos.set([x-rw,y,z,x+rw,y,z],i*6);edgeL.attributes.position.setXYZ(i,x-rw,y+.012,z);edgeR.attributes.position.setXYZ(i,x+rw,y+.012,z)}
  riverGeo.attributes.position.needsUpdate=true;riverGeo.computeVertexNormals();edgeL.attributes.position.needsUpdate=true;edgeR.attributes.position.needsUpdate=true;leftRiver.visible=rightRiver.visible=w[2]>.03;
  heat.forEach((o,i)=>{let q=(t*.6+i/4)%1;o.position.y=.55+q*1.75;o.scale.setScalar(.75+q*.65)});
  smoke.forEach((o,i)=>{let q=(t*.25+i/7)%1;o.position.set(-2.9+q*.9,1.45+q*1.75,-1.95+q*.25);o.scale.setScalar(Math.sin(Math.PI*q)*(.9+q*.55))});
  exposure.forEach(({g},i)=>{g.scale.y=.75+.25*Math.sin(a*2+i)**2});
  barriers.forEach((g,i)=>g.scale.y=smooth(clamp((w[3]-.04*i)*1.8)));
  recoveryTrees.forEach((g,i)=>g.scale.setScalar(.2+.8*smooth(clamp(w[3]*1.2-i*.06))));
  const routeProgress=clamp((((t-7.5+10)%10)-.9)/.75);route.geometry.setDrawRange(0,Math.floor(routeTotal*routeProgress/3)*3);
  routePeople.forEach((g,i)=>{let q=((t-7.5)*.22+i/3+10)%1;g.position.copy(safeRoute.getPoint(q));g.scale.setScalar(routeProgress*Math.min(1,q*8,(1-q)*8))});
  hospital.position.y=.23+.23*w[3];hospital.scale.setScalar(1+.09*w[3]);hospitalHalo.scale.setScalar(1+.07*Math.sin(a*4));shield.rotation.y=.60;
  people.forEach(({g,x,z},i)=>{g.position.set(x+.035*Math.sin(a+i),.25,z+.04*Math.cos(a+i))});
  cars.forEach((g,i)=>{g.visible=i!==1||w[0]<.1;let q=(t/10+i/3)%1;g.position.set(-3.7+q*7.4,.32,1.05);g.scale.setScalar(Math.min(1,q*12,(1-q)*12))});
  const az=.61+dragAngle-.18*w[1]+.08*w[2]-.06*w[3];camera.position.set(18*Math.sin(az),12.2+1.5*w[2],18*Math.cos(az));camera.lookAt(0,1.5+.20*w[1],0);camera.updateMatrixWorld();
  geoai.update(t,w,width,height);
  sceneStories.update(t);
  renderer.render(scene,camera);
  const placed = [];
  labels.forEach(({el,p,topic,avoid})=>{const co=p.clone();if(topic===1)co.y+=.15;co.project(camera);const opacity=smooth(clamp((w[topic]-.45)/.45));el.style.opacity=String(opacity);el.style.display=opacity>.005?'block':'none';if(opacity<=.005)return;let top=(-co.y*.5+.5)*height;
   // Keep the collection label below the full projected satellite silhouettes.
   if(avoid.length&&opacity>.005){
    let bottom=-Infinity;
    for(const object of avoid){const bounds=new THREE.Box3().setFromObject(object);
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const corner=v(x,y,z).project(camera);bottom=Math.max(bottom,(-corner.y*.5+.5)*height)}
    }
    top=Math.max(top,bottom+el.offsetHeight/2+12);
   }
   placeLabel(el,(co.x*.5+.5)*width,top,placed);});
  canvas.dataset.scene=topicData[state.active].title.toLowerCase();
 }
 window.__renderScene=render3D;
 window.__sceneMetrics=()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width,height,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)});
} catch(error) {console.error('3D initialization failed',error);document.querySelector('#fallback').hidden=false;canvas.hidden=true;document.querySelector('.visual-hint').hidden=true;}
const tracks = buttons.map(button => button.querySelector('.track i'));
function draw(t) {
  const state = weightsAt(t);
  updateCopy(state.active);
  tracks.forEach((track, index) => {
    const progress = index === state.active ? state.progress : Number(index < state.active);
    track.style.transform = 'scaleX(' + progress + ')';
  });
  if (window.__renderScene) window.__renderScene(t, state);
}
function animate(now){requestAnimationFrame(animate);if(document.hidden || !inView){last=0;return}let dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing){time=(time+dt)%DURATION;dirty=true}if(dirty){draw(time);dirty=false}}
window.GRINDResearch={seek:seconds=>setTime(seconds),pause:()=>{playing=false;playbackUI()},play:()=>{playing=true;last=0;playbackUI()},restart:()=>setTime(0),getState:()=>({time,playing,topic:topicData[weightsAt(time).active].title,duration:DURATION,weights:weightsAt(time).w}),getMetrics:()=>window.__sceneMetrics?window.__sceneMetrics():{webgl:false}};
draw(0);requestAnimationFrame(animate);
})();
