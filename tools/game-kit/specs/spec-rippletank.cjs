module.exports = {
kind:'rippletank',model:'RippleTankModel',title:'Ripple Tank Ruler',symbol:'λ =',unit:'cm',equation:'λ = d ÷ (n − 1)',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','waterLegend'],['white','crestLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['frequency-value','frequencyMetric','Hz','f'],['wavelength-value','wavelengthMetric','cm','λ','vector'],['speed-value','speedMetric','cm/s','v = f·λ','vector'],['front-value','frontMetric','cm','x']],
modelCode:String.raw`
class RippleTankModel {
  // A bar dips into a shallow tank 8 times a second and sends straight ripples along it. Crests leave once a period and travel at
  // the water's speed, so they sit λ = v ÷ f apart; n crests in a row span n − 1 gaps. Over the shallow end the ripples slow
  // down; the bar still sets the frequency, so they bunch up: λ₂ = v₂ ÷ f. Lengths are in cm, times in s.
  static tolerance = .02;
  static f = 8; // Hz
  static tank = 60; // cm
  static run = 2.5; // s
  static missions = [
    {key:'count',ask:'spacing',v:40,n:10,d:45},
    {key:'photo',ask:'real',v:40,photo:2.5,scale:.5},
    {key:'speed',ask:'speed',v:40,l:5},
    {key:'shallow',ask:'shallow',v:40,v2:24,edge:30},
    {key:'cross',ask:'cross',v:40,l:5}
  ];
  static units = {spacing:'cm',real:'cm',speed:'cm/s',shallow:'cm',cross:'s'};
  static limits = {spacing:1e4,real:1e4,speed:1e5,shallow:1e4,cross:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=RippleTankModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=RippleTankModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  speedAt(x){const c=this.config;return c.v2&&x>=c.edge?c.v2:c.v;}
  wavelength(x=0){return this.speedAt(x)/RippleTankModel.f;}
  // When the first ripple reaches x (s): slower over the shallow end.
  delay(x){const c=this.config;return c.v2&&x>c.edge?c.edge/c.v+(x-c.edge)/c.v2:x/c.v;}
  front(t){const c=this.config,s=this.clamp(t),L=RippleTankModel.tank;if(c.v2&&s>c.edge/c.v)return Math.min(c.edge+(s-c.edge/c.v)*c.v2,L);return Math.min(c.v*s,L);}
  // The water's height at x (as a share of the largest), behind the first ripple.
  height(x,t){const s=this.clamp(t),tau=this.delay(x);return s<tau?0:Math.sin(2*Math.PI*RippleTankModel.f*(s-tau));}
  // Where the crests are now (cm from the bar), nearest first.
  crests(t){
    const c=this.config,s=this.clamp(t),f=RippleTankModel.f,out=[];
    for(let k=0;;k++){const tau=s-(k+.25)/f;if(tau<0)break;const x=c.v2&&tau>c.edge/c.v?c.edge+(tau-c.edge/c.v)*c.v2:c.v*tau;if(x<=RippleTankModel.tank)out.push(x);}
    return out.sort((a,b)=>a-b);
  }
  duration(){return RippleTankModel.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after 2.5 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,f=RippleTankModel.f;if(c.ask==='spacing')return c.d/(c.n-1);if(c.ask==='real')return c.photo/c.scale;if(c.ask==='speed')return f*c.l;if(c.ask==='shallow')return c.v2/f;return RippleTankModel.tank/(f*c.l);}
  unit(){return RippleTankModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),f=RippleTankModel.f,L=RippleTankModel.tank,tol=RippleTankModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='spacing'){if(near(a,c.d/c.n))slip='dividedByCount';else if(near(a,c.d/(c.n+1)))slip='extraGap';else if(near(a,c.n/c.d))slip='countPerCm';}
      else if(c.ask==='real'){if(near(a,c.photo))slip='photoValue';else if(near(a,c.photo*c.scale))slip='wrongWay';}
      else if(c.ask==='speed'){if(near(a,c.l/f))slip='divided';else if(near(a,f/c.l))slip='inverted';else if(near(a,e/100))slip='metresPerSecond';}
      else if(c.ask==='shallow'){if(near(a,c.v/f))slip='sameWavelength';else if(near(a,c.v/f*c.v/c.v2))slip='longer';else if(near(a,c.v2*f))slip='multiplied';}
      else{if(near(a,L/c.l))slip='countWaves';else if(near(a,L/f))slip='usedFrequency';else if(near(a,1/f))slip='period';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!RippleTankModel.missions[saved.index])return false;
    const probe=new RippleTankModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={spacing:'λ =',real:'λ =',speed:'v =',shallow:'λ₂ =',cross:'t ='};
// Givens: the counted crests, the photo, the bar's frequency and the spacing, or the change of speed.
function given(m){
  const f=RippleTankModel.f;
  if(m.ask==='spacing')return 'n = '+plain(m.n)+' · d = '+plain(m.d)+' cm';
  if(m.ask==='real')return 'λ_photo = '+plain(m.photo)+' cm · ×½';
  if(m.ask==='shallow')return 'f = '+plain(f)+' Hz · v: '+plain(m.v)+' → '+plain(m.v2)+' cm/s';
  return (m.ask==='cross'?'L = '+plain(RippleTankModel.tank)+' cm · ':'')+'f = '+plain(f)+' Hz · λ = '+plain(m.l)+' cm';
}
function equation(){
  const c=model.config,e=model.exact(),f=RippleTankModel.f;
  if(c.ask==='spacing')return 'λ = d ÷ (n − 1) = '+plain(c.d)+' ÷ '+plain(c.n-1)+' = '+number(e,1)+' cm';
  if(c.ask==='real')return 'λ = λ_photo ÷ ½ = '+plain(c.photo)+' × 2 = '+number(e,1)+' cm';
  if(c.ask==='speed')return 'v = f·λ = '+plain(f)+' × '+plain(c.l)+' = '+number(e,1)+' cm/s';
  if(c.ask==='shallow')return 'λ₂ = v₂ ÷ f = '+plain(c.v2)+' ÷ '+plain(f)+' = '+number(e,1)+' cm';
  return 't = L ÷ (f·λ) = '+plain(RippleTankModel.tank)+' ÷ ('+plain(f)+' × '+plain(c.l)+') = '+number(e)+' s';
}
function baseEquation(){const a=model.config.ask;return a==='spacing'?'λ = d ÷ (n − 1)':a==='real'?'λ = λ_photo ÷ ½':'v = f·λ';}
function metrics(t,begun){
  const x=model.front(t),here=Math.max(x-.1,0);
  $('frequency-value').textContent=begun?plain(RippleTankModel.f):'—';$('wavelength-value').textContent=begun?number(model.wavelength(here),1):'—';
  $('speed-value').textContent=begun?plain(model.speedAt(here)):'—';$('front-value').textContent=begun?number(x,1):'—';
}
function values(){const c=model.config,x=c.v2?c.edge+1:0;return {l:number(model.wavelength(x),1),v:plain(model.speedAt(x)),t:number(RippleTankModel.tank/c.v)};}
function runningCopy(t){const x=model.front(t);return text('rippleCopy',{x:number(x,1),l:number(model.wavelength(Math.max(x-.1,0)),1)});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,L=RippleTankModel.tank,x0=40,x1=g.area-20,kp=(x1-x0)/L,X=x=>x0+x*kp,top=70,bottom=height*.52;
  // The tank from above: lighter where the water is higher, a line along every crest, and the shallow end shaded.
  box(x0,top,x1-x0,bottom-top,'#173a50');
  if(c.v2){box(X(c.edge),top,X(L)-X(c.edge),bottom-top,'#1f4d63');fit(text('shallowTag'),X(c.edge)+6,bottom-8,'#d1e3ed',10,X(L)-X(c.edge)-12);}
  if(g.begun){const cols=240,w=(x1-x0)/cols+1,mix=(a,b,k)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*k)).join(',')+')';for(let i=0;i<cols;i++){const x=L*(i+.5)/cols,h=model.height(x,s),base=c.v2&&x>=c.edge?[31,77,99]:[23,58,80];if(model.delay(x)<=s)box(X(x)-w/2,top,w,bottom-top,mix(base,[119,185,255],.12+.45*(h+1)/2));}
    for(const x of model.crests(s))line([{x:X(x),y:top},{x:X(x),y:bottom}],'#e3f1ff',2);}
  const bar=g.begun?Math.sin(2*Math.PI*RippleTankModel.f*s)*3:0;box(x0-14+bar,top,8,bottom-top,'#8aa3b5');
  if(g.option){line([{x:X(0),y:bottom+10},{x:X(L),y:bottom+10}],'#8aa3b5',1);for(let m=0;m<=L;m+=5){const x=X(m);line([{x,y:bottom+10},{x,y:bottom+(m%10?14:18)}],'#9fb6c7',1);if(m%10===0)label(plain(m)+' cm',x,bottom+30,'#9fb6c7','center',9);}}
  // The counted crests, bracketed once all of them are in the tank.
  if(c.ask==='spacing'&&g.begun){const xs=model.crests(s);if(xs.length>=c.n){const a=X(xs[0]),b=X(xs[c.n-1]),yb=top+14;line([{x:a,y:yb},{x:b,y:yb}],'#f2f8fc',1.5);line([{x:a,y:yb-5},{x:a,y:yb+5}],'#f2f8fc',1.5);line([{x:b,y:yb-5},{x:b,y:yb+5}],'#f2f8fc',1.5);fit(text('countTag',{n:plain(c.n),d:plain(c.d)}),(a+b)/2,yb+16,'#f2f8fc',10,b-a,'center');}}
  // The photo: the same ripples at half size, with its own ruler in photo centimetres.
  if(c.ask==='real'){
    const pw=(x1-x0)/2,py=bottom+42,ph=Math.max(40,height*.18),xs=new RippleTankModel(0).crests(RippleTankModel.run);
    box(x0,py,pw,ph,'#d9cfb8');box(x0+3,py+3,pw-6,ph-6,'#2a4a5e');
    for(const x of xs)line([{x:x0+x*kp/2,y:py+3},{x:x0+x*kp/2,y:py+ph-3}],'#e3f1ff',1.5);
    for(let p=0;p<=L/2;p+=2.5){const x=x0+p*kp;line([{x,y:py+ph},{x,y:py+ph+(p%5?4:7)}],'#9fb6c7',1);if(p%10===0)label(plain(p),x,py+ph+17,'#9fb6c7','center',8);}
    fit(text('photoTag'),x0+pw+8,py+12,'#d1e3ed',10,g.area-x0-pw-24);
  }
  if(g.guess){
    const a=model.answer;
    if(c.ask==='speed'||c.ask==='cross'){if(s>0){const gx=X(Math.min(c.ask==='speed'?a*s:L*s/a,L));line([{x:gx,y:top},{x:gx,y:bottom}],'#efb958',2,[5,3]);fit(text('guessTag'),gx,top-4,'#efb958',9,120,'center');}}
    else{const from=c.ask==='shallow'?c.edge:0,xs=g.begun?model.crests(s).filter(x=>x>=from):[],start=xs.length?xs[0]:from;if(a*kp>=5){for(let x=start;x<=L+1e-9;x+=a)line([{x:X(x),y:top-10},{x:X(x),y:top-2}],'#efb958',2);fit(text('guessTag'),X(start),top-14,'#efb958',9,g.area*.4);}}
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit}=g,L=RippleTankModel.tank;
  fit(text('profileGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+14,px1=width-14,py0=80,py1=height-80,ym=(py0+py1)/2-14,PX=x=>px0+x/L*(px1-px0),PY=h=>ym-h*28;
  // The water surface along the tank, and the bottom: deeper under the fast water, shallower under the slow.
  const pts=[];for(let i=0;i<=300;i++){const x=L*i/300;pts.push({x:PX(x),y:PY(model.height(x,g.t))});}line(pts,'#77b9ff',2);
  const deep=py1-10,shallow=c.v2?ym+50:deep;line([{x:PX(0),y:deep},{x:PX(c.v2?c.edge:L),y:deep},{x:PX(c.v2?c.edge:L),y:shallow},{x:PX(L),y:shallow}],'#8a6d4f',2);
  fit(text('positionAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
