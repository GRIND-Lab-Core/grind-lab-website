/* Spatially explicit GeoAI additions. All layers, forecasts and attributions are illustrative. */
function createGeoAIElements({scene,city,observe,model,network,risk,act,camera,helpers}) {
 const {group,box,sphere,line,ring,tube,v}=helpers;
 const TAU=Math.PI*2;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 // OBSERVE: co-registered raster and vector layers, rather than an abstract data cloud.
 const layerStack=group(observe);layerStack.position.set(-2.9,1.6,.45);
 const layers=[],pixels=[];
 for(let layer=0;layer<3;layer++){
  const plane=group(layerStack);plane.position.set(layer*.075,layer*.32,-layer*.06);layers.push(plane);
  const slab=box(plane,1.45,.055,1.35,0,0,0,'white');slab.renderOrder=.10;
  line(plane,[v(-.72,.04,-.67),v(.72,.04,-.67),v(.72,.04,.67),v(-.72,.04,.67)],true,true).renderOrder=.14;
  if(layer===1){
   // A vector mobility network, aligned with the same spatial footprint as the rasters.
   const roads=[[-.53,-.42],[.02,-.42],[.02,.05],[.48,.05],[.48,.46],[-.45,.46],[-.45,.05]];
   line(plane,roads.map(([x,z])=>v(x,.075,z)),true).renderOrder=.15;
   for(const [x,z] of roads)sphere(plane,.035,x,.08,z,'gray').renderOrder=.16;
  } else {
   for(let x=0;x<5;x++)for(let z=0;z<5;z++){
    const accent=layer===0?((x+2*z)%5===0):(x===2||x+z===5);
    const px=box(plane,.205,.014,.195,-.48+x*.24,.045,-.44+z*.22,accent?'orange':'pale');px.renderOrder=.12;
    if(accent)pixels.push({o:px,layer,x,z});
   }
  }
 }
 const registration=group(layerStack);
 for(const [x,z] of [[-.78,-.74],[.78,-.74],[.78,.74],[-.78,.74]])line(registration,[v(x,-.04,z),v(x,.76,z)],false);
 // MODEL: a neighborhood graph anchored to real locations in the illustrated landscape.
 const spatialGraph=group(city);spatialGraph.name='GeoAI neighborhood graph';
 const places=[v(-3.2,.50,1.65),v(-2.5,.65,-.55),v(-.48,1.03,2.45),v(0,2.02,-.15),v(2.15,2.19,-.2),v(2.25,1.3,2.05),v(3.25,1.32,-1.4)];
 const edges=[[0,1],[0,2],[1,3],[2,3],[2,5],[3,4],[3,5],[4,5],[4,6],[5,6]];
 const graphNodes=places.map((p,i)=>{const o=sphere(spatialGraph,.07,p.x,p.y,p.z,i===3?'orange':'white');o.renderOrder=.25;return o});
 const messages=[];
 for(let i=0;i<edges.length;i++){
  const [a,b]=edges[i];const edge=line(spatialGraph,[places[a],places[b]],i===2||i===5);edge.renderOrder=.20;
  const packet=sphere(spatialGraph,.035,places[a].x,places[a].y,places[a].z,'orange');packet.renderOrder=.26;
  messages.push({o:packet,a:places[a],b:places[b],offset:i/edges.length});
 }
 // A geographic graticule around the neural core makes the 'Geo' visible.
 const globe=group(network);globe.position.set(0,2.35,0);
 for(const lat of [-.55,0,.55]){
  const radius=.64*Math.cos(lat),y=.64*Math.sin(lat);
  line(globe,Array.from({length:56},(_,j)=>v(radius*Math.cos(j*TAU/56),y,radius*Math.sin(j*TAU/56))),lat===0,true);
 }
 for(let i=0;i<3;i++){
  const a=i*Math.PI/3;
  line(globe,Array.from({length:56},(_,j)=>{let q=j*TAU/56;return v(.64*Math.cos(q)*Math.cos(a),.64*Math.sin(q),.64*Math.cos(q)*Math.sin(a))}),i===0,true);
 }
 // An explicit time-forward path carries model outputs to geospatial forecast cells.
 const forecast=group(model);forecast.position.set(-2.4,.1,1.9);
 const forecastPlaces=[v(-.30,.38,.35),v(-.58,.75,-.45),v(-.35,1.20,-1.30)];
 const forecastCurve=new THREE.CatmullRomCurve3(forecastPlaces);
 const forecastCells=[];
 for(let i=0;i<3;i++){
  const p=forecastPlaces[i],tile=group(forecast);tile.position.copy(p);
  box(tile,.54,.035,.46,0,0,0,'white');line(tile,[v(-.27,.03,-.23),v(.27,.03,-.23),v(.27,.03,.23),v(-.27,.03,.23)],true,true);
  for(let k=0;k<=i;k++)box(tile,.095,.022,.095,-.15+k*.14,.035,-.08+i*.06,'orange');forecastCells.push(tile);
 }
 for(let j=0;j<18;j+=2)line(forecast,[forecastCurve.getPoint(j/18),forecastCurve.getPoint((j+1)/18)],true);
 const forecastPulse=sphere(forecast,.05,0,0,0,'orange');
 // UNDERSTAND: local attribution links environmental and human features to a location.
 const localExplanation=group(risk);
 const target=v(0,2.04,-.15);
 const factors=[v(-2.55,1.9,-1.7),v(-1.25,.32,1.8),v(1.8,.55,1.45)];
 const explanations=[];
 for(let i=0;i<3;i++){
  const c=new THREE.QuadraticBezierCurve3(factors[i],v((factors[i].x+target.x)/2,2.45+i*.12,(factors[i].z+target.z)/2),target);
  const edge=line(localExplanation,c.getPoints(32),i===0);edge.renderOrder=.12;
  const packet=sphere(localExplanation,.035,factors[i].x,factors[i].y,factors[i].z,'orange');packet.renderOrder=.15;
  explanations.push({c,packet,offset:i/3});
 }
 const attention=ring(localExplanation,.42,2.02,'orange',0,-.15);
 const explanationCard=document.createElement('div');explanationCard.className='geoai-card';explanationCard.setAttribute('aria-hidden','true');
 explanationCard.innerHTML='<div class="geoai-card-title">Local explanation</div><div class="geoai-factor"><span>Hazard</span><i><b style="--amount:.83"></b></i></div><div class="geoai-factor"><span>Exposure</span><i><b style="--amount:.62"></b></i></div><div class="geoai-factor"><span>Access</span><i><b style="--amount:.39"></b></i></div>';
 document.querySelector('.visual').append(explanationCard);
 const bars=[...explanationCard.querySelectorAll('b')];
 // ACT: comparing a candidate scenario with the selected service-access route.
 const scenario=group(act);const alternative=new THREE.CatmullRomCurve3([v(-.45,.30,2.5),v(-.1,.32,1.58),v(1.2,.33,1.55),v(2.25,.33,2.5)]);
 for(let j=0;j<30;j+=2){const l=line(scenario,[alternative.getPoint(j/30),alternative.getPoint((j+1)/30)]);l.renderOrder=.08}
 const decisionNode=sphere(scenario,.075,-.45,.48,2.5,'orange');
 const futureBoundary=group(risk);
 for(let i=0;i<24;i+=2){let z0=-2.9+i*5.8/24,z1=-2.9+(i+1)*5.8/24;
  const x=z=>-1.55+.45*Math.sin(z*1.15+.7)+.93;
  const l=line(futureBoundary,[v(x(z0),.26,z0),v(x(z1),.26,z1)],true);l.renderOrder=-15;
 }
 const cardAnchor=v(3.7,4.9,.2);
 return {
  update(t,w,width,height){
   const a=TAU*t/10;
   layers.forEach((g,i)=>{g.position.y=i*.32+.035*Math.sin(a*2+i*.8);});
   pixels.forEach(({o,layer,x,z})=>{o.scale.y=1+.45*Math.sin(a*3+x*.6+z*.5+layer)**2;});
   spatialGraph.visible=w[1]>.01;spatialGraph.scale.setScalar(Math.max(.0001,smooth(w[1])));
   graphNodes.forEach((o,i)=>o.scale.setScalar(1+.16*Math.sin(a*3-i*.7)));
   messages.forEach(({o,a:p,b,offset})=>{let q=(t/1.8+offset)%1;o.position.lerpVectors(p,b,q);o.scale.setScalar(Math.sin(Math.PI*q));});
   globe.rotation.y=.16*Math.sin(a*2);
   forecastCells.forEach((o,i)=>{o.scale.setScalar(.90+.10*Math.sin(a*2-i*.8)**2);});
   let q=(t/1.5)%1;forecastPulse.position.copy(forecastCurve.getPoint(q));forecastPulse.scale.setScalar(Math.sin(Math.PI*q));
   explanations.forEach(({c,packet,offset})=>{let q=(t/1.6+offset)%1;packet.position.copy(c.getPoint(q));packet.scale.setScalar(Math.sin(Math.PI*q));});
   attention.scale.setScalar(.96+.08*Math.sin(a*3)**2);
   decisionNode.scale.setScalar(1+.14*Math.sin(a*3));
   const opacity=smooth(clamp((w[2]-.5)*2));explanationCard.style.opacity=String(opacity);explanationCard.style.visibility=opacity>.01?'visible':'hidden';
   if(opacity>.01){
    const p=cardAnchor.clone().project(camera),cw=explanationCard.offsetWidth,ch=explanationCard.offsetHeight;
    const x=Math.max(10,Math.min(width-cw-10,(p.x*.5+.5)*width-cw/2));
    const y=Math.max(16,Math.min(height-ch-18,(-p.y*.5+.5)*height-ch/2));
    explanationCard.style.left=x+'px';explanationCard.style.top=y+'px';
    bars.forEach((bar,i)=>{bar.style.transform='scaleX('+([.83,.62,.39][i]*(.94+.06*Math.sin(a*2+i)**2))+')';});
   }
  }
 };
}
