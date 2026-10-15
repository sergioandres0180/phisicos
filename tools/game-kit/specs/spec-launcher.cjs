module.exports = {
kind:'launcher',model:'LauncherModel',title:'Spring Launcher',symbol:'v =',unit:'m/s',equation:'½·k·x² = ½·m·v²',
toggle:['show-scale','scaleToggle'],
legends:[['white','storedLegend'],['blue','motionLegend'],['green','heightLegend'],['orange','guessLegend']],
metrics:[['speed-value','speedMetric','m/s','v','vector'],['height-value','heightMetric','m','h'],['squash-value','squashMetric','cm','x','vector'],['stored-value','storedMetric','J','½·k·x²']],
modelCode:String.raw`
class LauncherModel {
  // A squashed spring stores ½·k·x². Let go, it hands that energy to what it pushes: ½·m·v² for a ball on a level table,
  // then m·g·h as a rocket climbs. Pushed in twice as far, it stores four times the energy. A moving cart squashing a spring
  // stops when ½·m·v² has all gone into the spring: x = v·√(m ÷ k). No friction or air; heights are measured from where the
  // rocket sits on the squashed spring, and the push itself is too quick to see.
  static g = 9.8;
  static tolerance = .02;
  static missions = [
    {key:'pinball',ask:'speed',kind:'lane',k:400,x:.05,m:.1,lane:4,run:1.5,pace:1},
    {key:'rocket',ask:'height',kind:'up',k:800,x:.08,m:.05,pace:1},
    {key:'aim',ask:'push',kind:'up',k:500,m:.1,target:2,pace:1},
    {key:'double',ask:'ratio',kind:'up',k:800,x:.08,m:.05,scale:2,pace:1.5},
    {key:'buffer',ask:'squash',kind:'buffer',k:200,m:2,v:3,gap:1,pace:.5}
  ];
  static units = {speed:'m/s',height:'m',push:'cm',ratio:'',squash:'cm'};
  static limits = {speed:1e4,height:1e5,push:100,ratio:1e4,squash:1e5};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=LauncherModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=LauncherModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // How far the spring is pushed in (m): given, twice as far, or yours when it is asked (the right push stands in before).
  push(){const c=this.config;if(c.ask==='push')return this.answer!==null?this.answer/100:Math.sqrt(2*c.m*LauncherModel.g*c.target/c.k);return c.x*(c.scale??1);}
  stored(){const c=this.config;return c.kind==='buffer'?c.m*c.v*c.v/2:c.k*this.push()**2/2;}
  launch(){const c=this.config;if(c.kind==='lane')return this.push()*Math.sqrt(c.k/c.m);if(c.kind==='up')return Math.sqrt(2*LauncherModel.g*this.top());return c.v;}
  top(x=this.push()){const c=this.config;return c.k*x*x/(2*c.m*LauncherModel.g);}
  omega(){const c=this.config;return Math.sqrt(c.k/c.m);}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  duration(){const c=this.config;if(c.kind==='lane')return c.run;if(c.kind==='up')return 2*this.launch()/LauncherModel.g;return 2*c.gap/c.v+Math.PI/this.omega();}
  // Where things are at time t: the ball along the lane, the rocket's height, or the cart and the spring's squash (m).
  state(t){
    const c=this.config,s=this.clamp(t),g=LauncherModel.g;
    if(c.kind==='lane'){const v=this.launch();return {pos:Math.min(v*s,c.lane),v:v*s<c.lane?v:0,height:0,squash:s>0?0:this.push()};}
    if(c.kind==='up'){const v0=this.launch();return {pos:0,v:Math.abs(v0-g*s),height:Math.max(0,v0*s-g*s*s/2),squash:s>0?0:this.push()};}
    const t1=c.gap/c.v,w=this.omega(),t2=t1+Math.PI/w;
    if(s<=t1)return {pos:-c.gap+c.v*s,v:c.v,height:0,squash:0};
    if(s<=t2){const x=c.v/w*Math.sin(w*(s-t1));return {pos:x,v:Math.abs(c.v*Math.cos(w*(s-t1))),height:0,squash:x};}
    return {pos:-c.v*(s-t2),v:c.v,height:0,squash:0};
  }
  // Energies at time t (J): stored in the spring, motion, height.
  energies(t){const c=this.config,st=this.state(t);return {stored:c.k*st.squash*st.squash/2,motion:c.m*st.v*st.v/2,height:c.m*LauncherModel.g*st.height};}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends when the rocket lands, the cart is back, or after 1.5 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,g=LauncherModel.g;
    if(c.ask==='speed')return c.x*Math.sqrt(c.k/c.m);
    if(c.ask==='height')return c.k*c.x*c.x/(2*c.m*g);
    if(c.ask==='push')return Math.sqrt(2*c.m*g*c.target/c.k)*100;
    if(c.ask==='ratio')return c.scale**2;
    return c.v*Math.sqrt(c.m/c.k)*100;
  }
  unit(){return LauncherModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),g=LauncherModel.g,tol=LauncherModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='speed'){if(near(a,c.k*c.x*c.x/c.m))slip='noRootSpeed';else if(near(a,e*100))slip='unitsCm';else if(near(a,e*Math.SQRT2))slip='extraTwo';}
      else if(c.ask==='height'){if(near(a,2*e))slip='noHalf';else if(near(a,c.k*c.x/(2*c.m*g)))slip='noSquare';else if(near(a,c.k*c.x*c.x/(2*c.m)))slip='noG';}
      else if(c.ask==='push'){if(near(a,2*c.m*g*c.target/c.k*100))slip='noRootPush';else if(near(a,e/100))slip='unitsM';else if(near(a,e/Math.SQRT2))slip='noTwo';}
      else if(c.ask==='ratio'){if(near(a,c.scale))slip='linear';else if(near(a,c.scale**3))slip='cubed';else if(near(a,Math.sqrt(c.scale)))slip='root';}
      else{if(near(a,c.v*c.m/c.k*100))slip='noRootSquash';else if(near(a,e/100))slip='unitsM';else if(near(a,e*Math.SQRT2))slip='extraTwo';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!LauncherModel.missions[saved.index])return false;
    const probe=new LauncherModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={speed:'v =',height:'h =',push:'x =',ratio:'h₂ ÷ h₁ =',squash:'x ='};
const joules=n=>number(n,Math.abs(n)<10?2:1);
// Givens: the spring, how far it is pushed in, and what it launches.
function given(m){
  const k='k = '+plain(m.k)+' N/m';
  if(m.kind==='buffer')return k+' · m = '+plain(m.m)+' kg · v = '+plain(m.v)+' m/s';
  if(m.ask==='push')return k+' · m = '+plain(m.m*1000)+' g · h = '+plain(m.target)+' m';
  if(m.ask==='ratio')return 'x = '+plain(m.x*100)+' cm → ×'+plain(m.scale);
  return k+' · x = '+plain(m.x*100)+' cm · m = '+plain(m.m*1000)+' g';
}
function equation(){
  const c=model.config,X=model.push();
  if(c.ask==='speed')return 'v = x·√(k ÷ m) = '+plain(c.x)+' × √('+plain(c.k)+' ÷ '+plain(c.m)+') = '+number(model.launch())+' m/s';
  if(c.ask==='height'||c.ask==='push')return 'h = k·x² ÷ (2·m·g) = '+plain(c.k)+' × '+plain(Number(X.toPrecision(4)))+'² ÷ (2 × '+plain(c.m)+' × '+plain(9.8)+') = '+number(model.top())+' m';
  if(c.ask==='ratio')return 'h ∝ x² → ('+plain(X*100)+' ÷ '+plain(c.x*100)+')² = '+plain(c.scale**2);
  return 'x = v·√(m ÷ k) = '+plain(c.v)+' × √('+plain(c.m)+' ÷ '+plain(c.k)+') = '+number(model.exact(),1)+' cm';
}
function baseEquation(){const a=model.config.ask;return a==='speed'?'½·k·x² = ½·m·v²':a==='squash'?'½·m·v² = ½·k·x²':'½·k·x² = m·g·h';}
function metrics(t,begun){
  const st=model.state(t);
  $('speed-value').textContent=begun?number(st.v):'—';$('height-value').textContent=begun?number(st.height):'—';
  $('squash-value').textContent=begun?number(st.squash*100,1):'—';$('stored-value').textContent=begun?joules(model.energies(t).stored):'—';
}
function values(){
  const c=model.config;
  return {v:number(model.launch()),h:number(model.top()),h1:number(model.top(c.x)),x:number(model.push()*100,1),E:joules(model.stored()),r:number(c.scale?c.scale**2:0,1),s:number(model.exact(),1)};
}
function runningCopy(t){const st=model.state(t),en=model.energies(t);return text('launchingCopy',{v:number(st.v),pe:joules(en.stored),ke:joules(en.motion),he:joules(en.height)});}
function coilH(line,x0,x1,y,color,n=10,w=7){const pts=[{x:x0,y}];for(let i=1;i<n;i++)pts.push({x:x0+(x1-x0)*i/n,y:y+(i%2?w:-w)});pts.push({x:x1,y});line(pts,color,2);}
function coilV(line,x,y0,y1,color,n=8,w=8){const pts=[{x,y:y0}];for(let i=1;i<n;i++)pts.push({x:x+(i%2?w:-w),y:y0+(y1-y0)*i/n});pts.push({x,y:y1});line(pts,color,2);}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,st=model.state(s);
  if(c.kind==='lane'){
    const y=height*.55,x0=60,x1=g.area-30,kp=(x1-x0)/(c.lane+.2),X=v=>x0+(v+.2)*kp,sq=st.squash;
    line([{x:x0-30,y:y+12},{x:x1,y:y+12}],'#8aa3b5',2);box(x1,y-22,8,34,'#8aa3b5');
    const springEnd=X(-sq);box(x0-34,y-14,8,28,'#22384a');coilH(line,x0-26,springEnd,y,'#f2f8fc',10,9);box(springEnd,y-12,6,24,'#d1e3ed');
    if(g.option)for(let m=0;m<=c.lane;m++){const x=X(m);line([{x,y:y+12},{x,y:y+20}],'#9fb6c7',1);label(plain(m)+' m',x,y+32,'#9fb6c7','center',9);}
    if(g.guess&&s>0){const gp=Math.min(model.answer*s,c.lane);ctx.strokeStyle='#efb958';ctx.setLineDash([3,3]);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(gp)+8,y,8,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);fit(text('guessTag'),X(gp)+8,y-16,'#efb958',9,90,'center');}
    dot(springEnd+14+st.pos*kp,y,8,'#d1e3ed');
    if(g.begun)fit(number(st.v)+' m/s',springEnd+14+st.pos*kp,y+(g.guess&&s>0?-30:-16),'#f2f8fc',10,100,'center');
  }else if(c.kind==='up'){
    const ground=height-30,top=62,two=c.ask==='ratio',hs=[model.top(),two?model.top(c.x):0,c.ask==='height'&&g.guess?model.answer:0,c.ask==='ratio'&&g.guess?model.answer*model.top(c.x):0,c.target??0],span=Math.max(...hs.map(v=>Math.min(v,1e4)))*1.12||1;
    const Y=h=>ground-Math.min(h,span)/span*(ground-top),rx=46;
    line([{x:16,y:ground},{x:g.area-16,y:ground}],'#8aa3b5',2);
    if(g.option){line([{x:rx,y:ground},{x:rx,y:top}],'#8aa3b5',1);const stepM=[1,2,5,10,20,50,100,200,500,1000,2000,5000].find(v=>span/v<=6)??1e4;for(let h=0;h<=span;h+=stepM){line([{x:rx,y:Y(h)},{x:rx+6,y:Y(h)}],'#8aa3b5',1);if(h>0)label(plain(h)+' m',rx-6,Y(h)+4,'#9fb6c7','right',9);}}
    const rocket=(x,h,color,squash)=>{const yb=Y(h);box(x-14,ground-8,28,8,'#22384a');coilV(line,x,ground-8,ground-8-(18-squash*60),'#f2f8fc',6,6);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,yb-30);ctx.lineTo(x+7,yb-16);ctx.lineTo(x+7,yb-(h>0?2:10+18-squash*60));ctx.lineTo(x-7,yb-(h>0?2:10+18-squash*60));ctx.lineTo(x-7,yb-16);ctx.closePath();ctx.fill();};
    if(c.target){const yt=Y(c.target);line([{x:g.area*.5-50,y:yt},{x:g.area*.5+50,y:yt}],'#75efc7',2);fit(text('targetTag',{h:plain(c.target)}),g.area*.5+56,yt+4,'#75efc7',10,g.area*.4);}
    if(two){const s1=model.top(c.x),v1=Math.sqrt(2*9.8*s1),h1=Math.max(0,Math.min(s1,v1*s-4.9*s*s));rocket(g.area*.36,s>0?h1:0,'#9fb6c7',s>0?0:c.x);fit('x = '+plain(c.x*100)+' cm',g.area*.36,ground+16,'#9fb6c7',10,g.area*.3,'center');}
    const xr=two?g.area*.62:g.area*.5;rocket(xr,st.height,'#ff7b6b',st.squash);if(two)fit('x = '+plain(model.push()*100)+' cm',xr,ground+16,'#d1e3ed',10,g.area*.3,'center');
    const gh=c.ask==='height'?model.answer:c.ask==='ratio'?model.answer*model.top(c.x):null;
    if(g.guess&&gh!==null){const yy=Y(gh);line([{x:xr-40,y:yy},{x:xr+40,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag')+(gh>span?' ↑':''),xr+46,yy+4,'#efb958',9,g.area-xr-50);}
    if(g.begun)fit('h = '+number(st.height)+' m',xr-14,Y(st.height)-36,'#f2f8fc',10,g.area*.3,'right');
  }else{
    const y=height*.6,wall=g.area-40,L=.5,kp=(wall-40)/(c.gap+L+.6),Xp=v=>wall-L*kp+v*kp,cw=.4*kp;
    line([{x:20,y:y+16},{x:wall,y:y+16}],'#8aa3b5',2);box(wall,y-40,10,56,'#8aa3b5');
    const end=Xp(st.squash);coilH(line,end,wall,y-4,'#f2f8fc',10,8);box(end-4,y-16,6,24,'#d1e3ed');
    const cartX=Xp(st.pos)-4;box(cartX-cw,y-20,cw,30,'#77b9ff');dot(cartX-cw*.75,y+12,6,'#d1e3ed');dot(cartX-cw*.25,y+12,6,'#d1e3ed');fit(plain(c.m)+' kg',cartX-cw/2,y-2,'#0f2233',10,cw-4,'center');
    if(g.option)for(let q=0;q<=50;q+=10){const x=Xp(q/100);line([{x,y:y+16},{x,y:y+24}],'#9fb6c7',1);label(plain(q),x,y+36,'#9fb6c7','center',9);}
    if(g.option)label('cm',Xp(.55),y+36,'#9fb6c7','left',9);
    if(g.guess){const x=Xp(Math.min(model.answer/100,L));line([{x,y:y-46},{x,y:y+20}],'#efb958',2,[5,3]);fit(text('guessTag'),x,y-52,'#efb958',9,120,'center');}
    if(g.begun)fit(number(st.v)+' m/s',cartX-cw/2,y-30,'#f2f8fc',10,100,'center');
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,box}=g;
  fit(text(c.ask==='ratio'?'compareGraph':'energyGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+16,px1=width-14,py0=76,py1=height-62;
  if(c.ask==='ratio'){
    const E1=c.k*c.x*c.x/2,E2=model.stored(),topE=Math.max(E2,g.guess?model.answer*E1:0)*1.1,bw=(px1-px0)/2-12,BY=v=>py1-Math.min(v,topE)/topE*(py1-py0);
    box(px0,BY(E1),bw,py1-BY(E1),'#9fb6c7');box(px0+bw+24,BY(E2),bw,py1-BY(E2),'#77b9ff');
    const tag=(v,x,str)=>{const y=BY(v),inside=py1-y>22;fit(str,x,inside?y+15:y-6,inside?'#0f2233':'#d1e3ed',10,bw-4,'center');};
    tag(E1,px0+bw/2,joules(E1)+' J');tag(E2,px0+bw*1.5+24,joules(E2)+' J');
    fit('x = '+plain(c.x*100)+' cm',px0+bw/2,py1+14,'#9fb6c7',9,bw+20,'center');fit('x = '+plain(model.push()*100)+' cm',px0+bw*1.5+24,py1+14,'#9fb6c7',9,bw+20,'center');
    if(g.guess){const yy=BY(model.answer*E1);line([{x:px0+bw+18,y:yy},{x:px1+4,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag'),px1,yy-5,'#efb958',9,bw,'right');}
    return;
  }
  const en=model.energies(g.t),tot=Math.max(model.stored(),1e-9)*1.1,bw=(px1-px0-24)/3,BY=v=>py1-v/tot*(py1-py0);
  const bars=[['stored','#f2f8fc','storedShort'],['motion','#77b9ff','motionShort'],['height','#75efc7','heightShort']];
  line([{x:px0-4,y:BY(model.stored())},{x:px1+4,y:BY(model.stored())}],'#9fb6c7',1,[4,3]);
  // Each value sits just above its bar, or inside it when the bar reaches the dashed total line.
  bars.forEach(([k2,color,key],i)=>{const x=px0+i*(bw+12),v=en[k2],y=BY(v),inside=y-BY(model.stored())<14&&py1-y>22;box(x,y,bw,Math.max(1,py1-y),color);fit(joules(v),x+bw/2,inside?y+15:y-6,inside?'#0f2233':'#d1e3ed',9,bw+8,'center');fit(text(key),x+bw/2,py1+14,'#9fb6c7',9,bw+10,'center');});
}
`
};
