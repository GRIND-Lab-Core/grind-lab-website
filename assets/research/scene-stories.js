/* Observe and Act story details. All collection and decision workflows are schematic. */
function createSceneStories({observe,act,helpers}) {
 const {group,box,sphere,cyl,line,ring,v}=helpers;
 const TAU=Math.PI*2;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 // A second Earth-observation satellite, with its own instrument and data link.
 const satellite=group(observe);satellite.name='Second Earth-observation satellite';satellite.position.set(2.8,4.9,-2.8);satellite.rotation.set(.16,-.5,.12);satellite.scale.setScalar(.88);
 box(satellite,.39,.46,.43,0,0,0,'white',true);
 for(const side of [-1,1]){
  box(satellite,.94,.04,.55,side*.77,.015,0,'gray');
  for(let j=0;j<4;j++)box(satellite,.014,.012,.49,side*.77-.32+j*.21,.042,0,'orange');
  box(satellite,.014,.013,.54,side*.77,.047,0,'pale');
 }
 cyl(satellite,.14,.17,0,-.30,0,'gray');sphere(satellite,.10,0,-.40,0,'orange',1,.3,1);
 const antenna=cyl(satellite,.018,.32,.14,.37,0,'gray',10);antenna.rotation.z=-.28;sphere(satellite,.055,.18,.53,0,'white');
 const satelliteCurve=new THREE.QuadraticBezierCurve3(v(2.8,4.5,-2.8),v(2.5,4.15,-.55),v(0,2.7,0));
 const satelliteLink=line(observe,satelliteCurve.getPoints(40));
 const satellitePackets=[0,.5].map(offset=>({offset,o:sphere(observe,.045,2.8,4.5,-2.8,'orange')}));
 const secondFootprint=group(observe);secondFootprint.position.set(2.6,0,-1.3);
 line(secondFootprint,[v(-.65,.25,-.45),v(.65,.25,-.45),v(.65,.25,.45),v(-.65,.25,.45)],true,true);
 // Street View imagery is collected by a moving camera vehicle.
 const vehicle=group(observe);vehicle.name='Street View 360-degree capture vehicle';
 box(vehicle,.64,.22,.31,0,.17,0,'white',true);box(vehicle,.34,.15,.29,-.03,.34,0,'pale',true);
 box(vehicle,.16,.115,.012,.02,.35,.153,'gray');box(vehicle,.16,.115,.012,.02,.35,-.153,'gray');
 box(vehicle,.54,.045,.018,0,.19,.166,'orange');box(vehicle,.54,.045,.018,0,.19,-.166,'orange');
 for(const x of [-.22,.22])for(const z of [-.17,.17])sphere(vehicle,.075,x,.08,z,'gray',1,1,.45);
 cyl(vehicle,.024,.23,-.04,.51,0,'gray',10);sphere(vehicle,.115,-.04,.68,0,'white');
 for(let i=0;i<4;i++){let a=i*TAU/4;sphere(vehicle,.04,-.04+.10*Math.cos(a),.68,.10*Math.sin(a),'gray')}
 ring(vehicle,.15,.68,'orange',-.04,0);
 const captureTarget=[v(1.8,.48,.235),v(2.5,.48,.235),v(2.5,1.74,.235),v(1.8,1.74,.235)];
 const captureRays=captureTarget.map(p=>line(observe,[v(0,.93,1.17),p]));
 // Four corner brackets identify the sampled building facade.
 const facadeFrame=group(observe);
 for(let i=0;i<4;i++){
  const p=captureTarget[i],dx=i===0||i===3?1:-1,dy=i<2?1:-1;
  line(facadeFrame,[v(p.x+dx*.13,p.y,p.z+.006),v(p.x,p.y,p.z+.006),v(p.x,p.y+dy*.19,p.z+.006)],true);
 }
 const geotags=[-.45,.15,.75].map(x=>ring(observe,.075,.255,'orange',x,1.17));
 // An explicit decision-support terminal and a human reviewer in the Act scene.
 const terminal=group(act);terminal.name='Responsible decision-support terminal';terminal.position.set(-3.05,.22,1.75);terminal.rotation.y=.48;
 box(terminal,.72,.09,.48,0,.05,0,'white',true);cyl(terminal,.055,.65,0,.39,0,'gray',12);
 box(terminal,1.04,.75,.09,0,.97,0,'gray',true);box(terminal,.94,.65,.015,0,.97,.057,'white');
 for(let i=0;i<3;i++){
  box(terminal,.15,.045,.018,-.31,1.17-i*.17,.073,'orange');
  box(terminal,.40-i*.07,.025,.018,.06,1.17-i*.17,.073,'pale');
 }
 box(terminal,.35,.045,.022,.20,.71,.075,'orange');
 const reviewer=group(act);reviewer.name='Human decision owner';reviewer.position.set(-2.30,.22,2.15);
 cyl(reviewer,.18,.07,0,.035,0,'white',20);cyl(reviewer,.10,.35,0,.27,0,'gray',12);sphere(reviewer,.14,0,.59,0,'white');
 const reviewerArm=box(reviewer,.27,.06,.07,-.12,.36,.05,'gray');reviewerArm.rotation.z=.35;
 const reviewHalo=ring(reviewer,.26,.08,'orange');
 const supportPath=new THREE.CatmullRomCurve3([v(-3.05,1.22,1.75),v(-2.75,1.05,1.95),v(-2.3,.85,2.15)]);
 const decisionPath=new THREE.CatmullRomCurve3([v(-2.30,.65,2.15),v(-1.45,.72,2.65),v(-.45,.48,2.5)]);
 for(const curve of [supportPath,decisionPath])for(let i=0;i<16;i+=2)line(act,[curve.getPoint(i/16),curve.getPoint((i+1)/16)]);
 const reviewPacket=sphere(act,.045,0,0,0,'orange'),decisionPacket=sphere(act,.045,0,0,0,'orange');
 return {
  satellite,
  update(t){
   const a=TAU*t/10;
   satellite.position.set(2.8+.10*Math.sin(a),4.9+.10*Math.sin(a+.7),-2.8+.07*Math.cos(a));satellite.rotation.y=-.5+.08*Math.sin(a);
   satelliteCurve.v0.set(satellite.position.x,satellite.position.y-.37,satellite.position.z);
   const lp=satelliteLink.geometry.attributes.position;
   for(let i=0;i<=40;i++){const p=satelliteCurve.getPoint(i/40);lp.setXYZ(i,p.x,p.y,p.z)}lp.needsUpdate=true;
   satellitePackets.forEach(({o,offset})=>{const p=(t/2.5+offset)%1;o.position.copy(satelliteCurve.getPoint(p));o.scale.setScalar(Math.sin(Math.PI*p)**.5)});
   secondFootprint.position.x=2.6+.25*Math.sin(a*2);
   const travel=(t/10+.45)%1;vehicle.position.set(-3.4+travel*6.8,.25,1.17);vehicle.scale.setScalar(Math.min(1,travel*10,(1-travel)*10));
   captureRays.forEach((r,i)=>{const p=r.geometry.attributes.position;p.setXYZ(0,vehicle.position.x-.04,.93,1.17);p.setXYZ(1,captureTarget[i].x,captureTarget[i].y,captureTarget[i].z);p.needsUpdate=true});
   facadeFrame.visible=Math.sin(a*6)>.0; // brief capture brackets, with no bright flashes
   geotags.forEach((g,i)=>g.scale.setScalar(.75+.25*Math.sin(a*3-i)**2));
   const local=(t-7.5+10)%10;
   const reviewProgress=smooth((local-.65)/.65),selection=smooth((local-1.25)/.45);
   reviewHalo.scale.setScalar(1+.12*reviewProgress*Math.sin(a*3)**2);
   let q=(local/.85)%1;reviewPacket.position.copy(supportPath.getPoint(q));reviewPacket.scale.setScalar(Math.sin(Math.PI*q));
   q=((local-1.2+10)/.9)%1;decisionPacket.position.copy(decisionPath.getPoint(q));decisionPacket.scale.setScalar(selection*Math.sin(Math.PI*q));
  }
 };
}
