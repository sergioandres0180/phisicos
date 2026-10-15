module.exports = {
kind:'wrecking',model:'WreckingModel',title:'Wrecking Ball',symbol:'v =',unit:'m/s',equation:'m·g·h = ½·m·v²',
toggle:['show-marks','marksToggle'],
legends:[['green','heightLegend'],['blue','motionLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['angle-value','angleMetric','°','θ','vector'],['height-value','heightMetric','m','h = L·(1 − cos θ)'],['speed-value','speedMetric','m/s','v = √(2·g·Δh)','vector'],['tension-value','tensionMetric','N','m·g·cos θ + m·v² ÷ L']],
modelCode:String.raw`
class WreckingModel {
  // A ball on a rope swings without friction, so the height it loses becomes speed: v = √(2·g·Δh), with h = L·(1 − cos θ).
  // The swing is integrated exactly for any angle (θ'' = −g ÷ L·sin θ, not just small swings) and stored as a table; speeds come
  // from the energy, and the rope's pull is m·g·cos θ + m·v² ÷ L. A peg can catch the rope so the ball swings on a shorter
  // string; it still rises to the height it started from.
  static g = 9.8;
  static mass = 100; // kg
  static tolerance = .02;
  static step = 1/2000; // s, for the table
  static missions = [
    {key:'bottom',ask:'speed',L:2,start:60},
    {key:'partway',ask:'speedAt',L:2,start:60,at:30},
    {key:'tension',ask:'tension',L:2,start:45},
    {key:'peg',ask:'rise',L:2,drop:.5,peg:1},
    {key:'angle',ask:'angle',L:2,v:3}
  ];
  static units = {speed:'m/s',speedAt:'m/s',tension:'N',rise:'m',angle:'°'};
  static limits = {speed:1e4,speedAt:1e4,tension:1e7,rise:1e4,angle:180};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=WreckingModel.missions[index];this.answer=null;this.attempts=0;this.table=this.build();this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=WreckingModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  rad(d){return d*Math.PI/180;}
  // The starting angle (rad, on the left) and the speed it starts with.
  startAngle(){const c=this.config;if(c.start)return this.rad(c.start);if(c.drop)return Math.acos(1-c.drop/c.L);return 0;}
  startHeight(){return this.config.L*(1-Math.cos(this.startAngle()));}
  topHeight(){const c=this.config;return this.startHeight()+(c.v?c.v*c.v/(2*WreckingModel.g):0);}
  pegLength(){const c=this.config;return c.peg?c.L-c.peg:c.L;}
  // Integrates the swing with RK4: from the left down through the bottom and up the right side (or back down for the
  // angle test), switching to the shorter string when the peg catches it. Samples: time, angle about the current pivot, segment.
  build(){
    const c=this.config,g=WreckingModel.g,dt=WreckingModel.step,out=[];
    let seg=0,l=c.L,th=-this.startAngle(),w=c.v?c.v/c.L:0,t=0;
    const acc=(a)=>-g/l*Math.sin(a),push=()=>out.push({t,th,seg});
    push();
    for(let n=0;n<200000;n++){
      const k1v=acc(th),k1x=w,k2v=acc(th+dt/2*k1x),k2x=w+dt/2*k1v,k3v=acc(th+dt/2*k2x),k3x=w+dt/2*k2v,k4v=acc(th+dt*k3x),k4x=w+dt*k3v;
      const th2=th+dt/6*(k1x+2*k2x+2*k3x+k4x),w2=w+dt/6*(k1v+2*k2v+2*k3v+k4v);
      if(c.peg&&seg===0&&th<0&&th2>=0){const f=-th/(th2-th);t+=f*dt;const wc=w+f*(w2-w);th=0;push();seg=1;l=this.pegLength();w=wc*c.L/l;out.push({t,th:0,seg:1});continue;}
      const ending=c.v?(th>0&&th2<=0&&w2<0):(w>0&&w2<=0);
      if(ending){const f=c.v?th/(th-th2):w/(w-w2);t+=f*dt;th=th+f*(th2-th);out.push({t,th,seg});break;}
      th=th2;w=w2;t+=dt;push();
    }
    return out;
  }
  duration(){return this.table[this.table.length-1].t;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The sample at time t, interpolated (binary search: the table's times are not evenly spaced around the peg).
  sample(t){
    const s=this.clamp(t),T=this.table;let lo=0,hi=T.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(T[mid].t<=s)lo=mid;else hi=mid;}
    const a=T[lo],b=T[hi],f=b.t>a.t?(s-a.t)/(b.t-a.t):0;
    const seg=b.seg!==a.seg?(f<1?a.seg:b.seg):a.seg;return {th:a.th+f*(b.th-a.th),seg};
  }
  length(seg){return seg?this.pegLength():this.config.L;}
  // The ball's position from the top pivot (m, x right, y down), its height above the lowest point, speed, and the rope's pull.
  position(t){const {th,seg}=this.sample(t),c=this.config,l=this.length(seg),py=seg?c.peg:0;return {x:l*Math.sin(th),y:py+l*Math.cos(th),th,seg,l};}
  height(t){const p=this.position(t);return this.config.L-p.y;}
  speed(t){return Math.sqrt(Math.max(0,2*WreckingModel.g*(this.topHeight()-this.height(t))));}
  tension(t){const p=this.position(t),v=this.speed(t);return WreckingModel.mass*(WreckingModel.g*Math.cos(p.th)+v*v/p.l);}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends when the ball stops on the far side, or is back at the bottom.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,g=WreckingModel.g,m=WreckingModel.mass;
    if(c.ask==='speed')return Math.sqrt(2*g*c.L*(1-Math.cos(this.rad(c.start))));
    if(c.ask==='speedAt')return Math.sqrt(2*g*c.L*(Math.cos(this.rad(c.at))-Math.cos(this.rad(c.start))));
    if(c.ask==='tension')return m*g*(3-2*Math.cos(this.rad(c.start)));
    if(c.ask==='rise')return c.drop;
    return Math.acos(1-c.v*c.v/(2*g*c.L))*180/Math.PI;
  }
  unit(){return WreckingModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),g=WreckingModel.g,m=WreckingModel.mass,tol=WreckingModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      const h=this.startHeight();
      if(c.ask==='speed'){if(near(a,Math.sqrt(2*g*c.L)))slip='lengthAsHeight';else if(near(a,Math.sqrt(g*h)))slip='noTwo';else if(near(a,2*g*h))slip='noRoot';}
      else if(c.ask==='speedAt'){const vb=Math.sqrt(2*g*h);if(near(a,Math.sqrt(2*g*c.L*(1-Math.cos(this.rad(c.at))))))slip='fromThirty';else if(near(a,vb/2))slip='halfSpeed';else if(near(a,vb))slip='bottomSpeed';}
      else if(c.ask==='tension'){const cent=m*2*g*h/c.L;if(near(a,m*g))slip='weightOnly';else if(near(a,cent))slip='noWeight';else if(near(a,m*g-cent))slip='minus';}
      else if(c.ask==='rise'){if(near(a,c.drop/2))slip='halved';else if(near(a,2*c.drop))slip='doubled';else if(near(a,c.L))slip='length';}
      else{const r=c.v*c.v/(2*g*c.L);if(near(a,this.rad(e)))slip='radians';else if(near(a,Math.acos(r)*180/Math.PI))slip='noOneMinus';else if(near(a,Math.asin(r)*180/Math.PI))slip='sine';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!WreckingModel.missions[saved.index])return false;
    const probe=new WreckingModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={speed:'v =',speedAt:'v =',tension:'T =',rise:'h′ =',angle:'θ ='};
const deg=r=>r*180/Math.PI;
// Givens: the rope, where the ball is let go from, the peg, or the speed at the bottom.
function given(m){
  const L='L = '+plain(m.L)+' m';
  if(m.at)return L+' · θ₀ = '+plain(m.start)+'° → '+plain(m.at)+'°';
  if(m.start)return L+' · θ₀ = '+plain(m.start)+'°'+(m.ask==='tension'?' · m = 100 kg':'');
  if(m.peg)return L+' · h = '+plain(m.drop)+' m · '+text('pegTag')+' '+plain(m.peg)+' m';
  return L+' · v = '+plain(m.v)+' m/s';
}
function equation(){
  const c=model.config,g=plain(9.8),h=model.startHeight();
  if(c.ask==='speed')return 'h = L·(1 − cos '+plain(c.start)+'°) = '+number(h)+' m · v = √(2·g·h) = '+number(model.exact())+' m/s';
  if(c.ask==='speedAt')return 'v = √(2·g·L·(cos '+plain(c.at)+'° − cos '+plain(c.start)+'°)) = '+number(model.exact())+' m/s';
  if(c.ask==='tension'){const W=100*9.8,cent=model.exact()-W;return 'T = m·g + m·v² ÷ L = '+number(W,0)+' + '+number(cent,1)+' = '+number(model.exact(),1)+' N';}
  if(c.ask==='rise')return 'm·g·h = m·g·h′ → h′ = '+number(c.drop)+' m';
  return 'cos θ = 1 − v² ÷ (2·g·L) = 1 − '+plain(c.v*c.v)+' ÷ '+plain(2*9.8*c.L)+' → θ = '+number(model.exact(),1)+'°';
}
function baseEquation(){const a=model.config.ask;return a==='tension'?'T − m·g = m·v² ÷ L':a==='angle'?'h = L·(1 − cos θ)':'m·g·h = ½·m·v²';}
function metrics(t,begun){
  const p=model.position(t);
  $('angle-value').textContent=begun?number(deg(p.th),1):'—';$('height-value').textContent=begun?number(model.height(t)):'—';
  $('speed-value').textContent=begun?number(model.speed(t)):'—';$('tension-value').textContent=begun?number(model.tension(t),0):'—';
}
function values(){
  const c=model.config,g=9.8,h=c.at?c.L*(Math.cos(model.rad(c.at))-Math.cos(model.rad(c.start))):c.v?c.v*c.v/(2*g):model.startHeight();
  const end=model.position(model.duration());
  return {v:number(c.ask==='angle'?c.v:c.ask==='speedAt'?model.exact():Math.sqrt(2*g*model.startHeight())),vb:number(Math.sqrt(2*g*model.startHeight())),h:number(h),T:number(c.ask==='tension'?model.exact():model.tension(model.duration()/2),1),W:number(100*g,0),r:number(model.height(model.duration())),a:number(c.ask==='angle'?model.exact():Math.abs(deg(end.th)),1)};
}
function runningCopy(t){return text('swingingCopy',{a:number(deg(model.position(t).th),1),h:number(model.height(t)),v:number(model.speed(t))});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,top=56;
  const kp=Math.max(40,Math.min((height-top-48)/(c.L+.15),(g.area-150)/(2*c.L*Math.sin(Math.PI/3)+.4))),px=g.area*.46,P=(x,y)=>({x:px+x*kp,y:top+y*kp});
  box(px-60,top-10,120,10,'#22384a');line([{x:px-60,y:top},{x:px+60,y:top}],'#8aa3b5',2);
  const bottomY=top+c.L*kp;
  if(g.option){
    line([{x:px-c.L*kp-10,y:bottomY},{x:px+c.L*kp+10,y:bottomY}],'#9fb6c7',1,[3,4]);
    const hs=model.startHeight(),ys=bottomY-hs*kp;if(hs>0){line([{x:px-c.L*kp-10,y:ys},{x:px+c.L*kp+10,y:ys}],'#9fb6c7',1,[3,4]);fit('h = '+plain(Number(hs.toPrecision(3)))+' m',px-c.L*kp-10,ys-5,'#9fb6c7',9,c.L*kp);}
    const arc=[];for(let d=-70;d<=70;d+=2){const r=model.rad(d);arc.push(P(c.L*Math.sin(r),c.L*Math.cos(r)));}line(arc,'#8aa3b5',1,[2,4]);
  }
  if(c.at){const r=model.rad(c.at),q=P(-c.L*Math.sin(r),c.L*Math.cos(r));line([P(0,0),q],'#9fb6c7',1.2,[5,4]);fit(plain(c.at)+'°',q.x-8,q.y+4,'#9fb6c7',10,60,'right');}
  if(c.peg){const pg=P(0,c.peg);dot(pg.x,pg.y,5,'#efb958');fit(text('pegTag'),pg.x-10,pg.y+4,'#d1e3ed',10,90,'right');}
  if(g.guess&&c.ask==='rise'){const yy=bottomY-Math.min(model.answer,c.L)*kp;line([{x:px,y:yy},{x:px+c.L*kp+10,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag'),px+c.L*kp+12,yy+4,'#efb958',9,g.area-px-c.L*kp-16);}
  if(g.guess&&c.ask==='angle'){const r=model.rad(Math.min(model.answer,90)),q=P(c.L*Math.sin(r),c.L*Math.cos(r));line([P(0,0),q],'#efb958',2,[5,3]);fit(text('guessTag'),q.x+8,q.y+4,'#efb958',9,g.area-q.x-12);}
  const p=g.ready?model.position(s):model.position(0),b=P(p.x,p.y),pv=p.seg?P(0,c.peg):P(0,0);
  if(p.seg)line([P(0,0),pv],'#d1e3ed',2);line([pv,b],'#d1e3ed',2);
  const r=Math.max(10,.16*kp);dot(b.x,b.y,r,'#55626d');dot(b.x-r*.3,b.y-r*.3,r*.3,'#8f9daa');
  if(g.begun)fit('v = '+number(model.speed(s))+' m/s',b.x,b.y+r+16,'#f2f8fc',10,120,'center');
  // A meter at the side: the speed, or the rope's pull against the ball's weight, with your prediction.
  if(c.ask==='speed'||c.ask==='speedAt'||c.ask==='tension'){
    const mx=g.area-34,m0=bottomY,m1=top+20,isT=c.ask==='tension',full=isT?Math.max(model.exact(),g.guess?model.answer:0)*1.2:Math.max(model.exact(),Math.sqrt(2*9.8*model.startHeight()),g.guess?model.answer:0)*1.2,MY=v=>m0-Math.min(v,full)/full*(m0-m1);
    line([{x:mx,y:m0},{x:mx,y:m1}],'#8aa3b5',1);
    if(g.begun){const v=isT?model.tension(s):model.speed(s);box(mx-7,MY(v),14,m0-MY(v),'#77b9ff');}
    if(isT){const yw=MY(980);line([{x:mx-12,y:yw},{x:mx+12,y:yw}],'#9fb6c7',1.5,[3,3]);fit('m·g',mx-14,yw+4,'#9fb6c7',9,40,'right');}
    if(g.guess){const yy=MY(model.answer);line([{x:mx-14,y:yy},{x:mx+14,y:yy}],'#efb958',2,[4,3]);fit(text('guessTag'),mx-16,yy-6,'#efb958',9,g.area*.25,'right');}
    fit(isT?'T':'v',mx,m0+14,'#9fb6c7',10,20,'center');
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,box}=g;
  fit(text('energyGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+16,px1=width-14,py0=76,py1=height-62,m=100,g0=9.8,tot=m*g0*model.topHeight(),he=m*g0*model.height(g.t),ke=m*model.speed(g.t)**2/2,top2=tot*1.12,bw=(px1-px0)/2-12,BY=v=>py1-v/top2*(py1-py0);
  line([{x:px0-4,y:BY(tot)},{x:px1+4,y:BY(tot)}],'#9fb6c7',1,[4,3]);
  [[he,'#75efc7','heightShort'],[ke,'#77b9ff','motionShort']].forEach(([v,color,key],i)=>{const x=px0+i*(bw+24);box(x,BY(v),bw,Math.max(1,py1-BY(v)),color);const inside=py1-BY(v)>22;fit(number(v/1000,2)+' kJ',x+bw/2,inside?BY(v)+15:BY(v)-6,inside?'#0f2233':'#d1e3ed',10,bw-4,'center');fit(text(key),x+bw/2,py1+14,'#9fb6c7',9,bw+20,'center');});
}
`
};
