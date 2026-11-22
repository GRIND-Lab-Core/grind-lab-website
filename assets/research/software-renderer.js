/* Small Canvas renderer for the same Three.js scene graph when WebGL is unavailable.
   Uses orthographic projection, depth sorting, back-face culling and directional shading. */
class ResearchSoftwareRenderer {
 constructor({canvas}){this.domElement=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw new Error('Canvas unavailable');this.isSoftwareRenderer=true;this.ratio=1;this.shadowMap={};this.info={render:{calls:0,triangles:0}};this.view=new THREE.Matrix4();this.mvp=new THREE.Matrix4();this.normalMatrix=new THREE.Matrix3();this.light=new THREE.Vector3(-5,12,8).normalize();this._cache=new WeakMap()}
 setPixelRatio(r){this.ratio=Math.min(r,1.25)}
 setClearColor(){}
 setSize(w,h){this.w=w;this.h=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio)}
 getContext(){return {RENDERER:0,getParameter:()=> 'Canvas 3D software renderer'}}
 render(scene,camera){
  const ctx=this.ctx,w=this.w,h=this.h,r=this.ratio;ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,w,h);
  scene.updateMatrixWorld();camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const items=[];let faceCount=0,objectCount=0;
  const shadow=new THREE.Vector3(0,-.55,0).project(camera),sx=(shadow.x/2+.5)*w,sy=(-shadow.y/2+.5)*h;
  ctx.save();ctx.translate(sx,sy);ctx.scale(w*.32,h*.09);const grad=ctx.createRadialGradient(0,0,.05,0,0,1);grad.addColorStop(0,'rgba(75,75,75,.15)');grad.addColorStop(1,'rgba(75,75,75,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
  const light=this.light;
  scene.traverseVisible(o=>{
   if(!o.geometry||!o.material||o.material.isShadowMaterial||o.material.visible===false)return;
   const geo=o.geometry,mat=o.material,position=geo.attributes.position;if(!position)return;objectCount++;
   this.view.multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld);this.mvp.multiplyMatrices(camera.projectionMatrix,this.view);
   const m=this.mvp.elements,vm=this.view.elements,pa=position.array,count=position.count,projected=new Float32Array(count*4);
   for(let j=0;j<count;j++){let p=j*3,k=j*4,x=pa[p],y=pa[p+1],z=pa[p+2],iw=1/(m[3]*x+m[7]*y+m[11]*z+m[15]);projected[k]=((m[0]*x+m[4]*y+m[8]*z+m[12])*iw*.5+.5)*w;projected[k+1]=(-(m[1]*x+m[5]*y+m[9]*z+m[13])*iw*.5+.5)*h;projected[k+2]=vm[2]*x+vm[6]*y+vm[10]*z+vm[14];projected[k+3]=(m[2]*x+m[6]*y+m[10]*z+m[14])*iw}
   const color=mat.color?mat.color.getHex():0xffffff;
   const rgb=[color>>16&255,color>>8&255,color&255];
   if(o.isLine){let idx=geo.index?.array;let n=idx?idx.length:count;const segment=(a,b)=>{let i=a*4,j=b*4;items.push({layer:o.renderOrder||0,line:true,x:[projected[i],projected[j]],y:[projected[i+1],projected[j+1]],z:(projected[i+2]+projected[j+2])/2+.002,c:'#'+color.toString(16).padStart(6,'0'),width:color===0xff8200?1.7:1})};if(o.isLineSegments){for(let j=0;j<n-1;j+=2)segment(idx?idx[j]:j,idx?idx[j+1]:j+1)}else{for(let j=0;j<n-1;j++)segment(idx?idx[j]:j,idx?idx[j+1]:j+1);if(o.isLineLoop)segment(idx?idx[n-1]:n-1,idx?idx[0]:0)}return}
   if(!o.isMesh)return;
   this.normalMatrix.getNormalMatrix(o.matrixWorld);const nm=this.normalMatrix.elements,na=geo.attributes.normal?.array,ix=geo.index?.array;
   const start=geo.drawRange.start||0,end=Math.min(ix?ix.length:count,start+(geo.drawRange.count??Infinity));
   let colors=this._cache.get(mat);if(!colors){colors=Array.from({length:33},(_,s)=>{let b=.64+.36*s/32;return `rgb(${rgb.map(v=>Math.round(v*b)).join(',')})`});this._cache.set(mat,colors)}
   for(let j=start;j<end-2;j+=3){let a=ix?ix[j]:j,b=ix?ix[j+1]:j+1,c=ix?ix[j+2]:j+2,ai=a*4,bi=b*4,ci=c*4;
    const xx=[projected[ai],projected[bi],projected[ci]],yy=[projected[ai+1],projected[bi+1],projected[ci+1]];
    const cross=(xx[1]-xx[0])*(yy[2]-yy[0])-(yy[1]-yy[0])*(xx[2]-xx[0]);if(mat.side!==THREE.DoubleSide&&cross>=0)continue;
    if(xx.every(x=>x<0)||xx.every(x=>x>w)||yy.every(y=>y<0)||yy.every(y=>y>h))continue;
    let fill;if(mat.isMeshBasicMaterial)fill='#'+color.toString(16).padStart(6,'0');else{let nx,ny,nz;if(na){nx=(na[a*3]+na[b*3]+na[c*3])/3;ny=(na[a*3+1]+na[b*3+1]+na[c*3+1])/3;nz=(na[a*3+2]+na[b*3+2]+na[c*3+2])/3}else{nx=0;ny=1;nz=0}let tx=nm[0]*nx+nm[3]*ny+nm[6]*nz,ty=nm[1]*nx+nm[4]*ny+nm[7]*nz,tz=nm[2]*nx+nm[5]*ny+nm[8]*nz,mag=Math.hypot(tx,ty,tz)||1;let shade=Math.max(0,(tx*light.x+ty*light.y+tz*light.z)/mag);fill=colors[Math.round(shade*32)]}
    items.push({layer:o.renderOrder||0,line:false,x:xx,y:yy,z:(projected[ai+2]+projected[bi+2]+projected[ci+2])/3,c:fill});faceCount++;
   }
  });
  items.sort((a,b)=>a.layer-b.layer||a.z-b.z);ctx.lineJoin='round';ctx.lineCap='round';
  for(const item of items){ctx.beginPath();ctx.moveTo(item.x[0],item.y[0]);ctx.lineTo(item.x[1],item.y[1]);if(item.line){ctx.lineWidth=item.width;ctx.strokeStyle=item.c;ctx.stroke()}else{ctx.lineTo(item.x[2],item.y[2]);ctx.closePath();ctx.fillStyle=item.c;ctx.fill();ctx.lineWidth=.55;ctx.strokeStyle=item.c;ctx.stroke()}}
  this.info.render.calls=objectCount;this.info.render.triangles=faceCount;
 }
}
