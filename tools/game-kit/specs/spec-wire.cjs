module.exports = {
kind:'wire',model:'WireModel',title:'Wire Stretcher',symbol:'R =',unit:'Ω',equation:'R = ρ·L ÷ A',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .wire-page .mission-list span{unicode-bidi:plaintext}.wire-page .line-key.copper{background:#c9a27a}.wire-page .line-key.nichrome{background:#b8c4cc}',
toggle:['show-sizes','sizeToggle'],
legends:[['copper','copperLegend'],['nichrome','nichromeLegend'],['white','meterLegend'],['orange','guessLegend']],
metrics:[['resistance-value','resistanceMetric','Ω','R = ρ·L ÷ A','scalar'],['length-value','lengthMetric','m','L','scalar'],['area-value','areaMetric','mm²','A = π·d² ÷ 4','scalar']],
modelCode:String.raw`
class WireModel {
  // A wire's resistance grows with its length and falls with its cross-section: R = ρ·L ÷ A, with A = π·d² ÷ 4 for a round
  // wire. Doubling the length doubles R; doubling the diameter makes A four times larger and R a quarter; stretching a wire
  // to twice its length at the same volume also halves A, so R is four times larger. Each change is made steadily over
  // 2 s and held for 1 s, and the ohmmeter (ideal) follows it. Copper 1.68 × 10⁻⁸ Ω·m; nichrome 1.10 × 10⁻⁶ Ω·m. The
  // wires of tests 2 to 4 are nichrome, with the sizes that give their starting resistances.
  static T = 3;
  static change = 2;
  static tolerance = .02;
  static rho = {copper:1.68e-8,nichrome:1.10e-6};
  static missions = [
    {key:'copper',ask:'resistance',metal:'copper',L0:0,L1:2,A0:.5,A1:.5},
    {key:'longer',ask:'resistance',metal:'nichrome',L0:3*.5/1.1,L1:6*.5/1.1,A0:.5,A1:.5,R0:3},
    {key:'thicker',ask:'resistance',metal:'nichrome',L0:8*Math.PI*.04/1.1,L1:8*Math.PI*.04/1.1,A0:Math.PI*.04,A1:Math.PI*.16,R0:8},
    {key:'stretch',ask:'resistance',metal:'nichrome',L0:5*.5/1.1,L1:10*.5/1.1,A0:.5,A1:.25,R0:5},
    {key:'coil',ask:'length',metal:'nichrome',L0:0,L1:null,A0:Math.PI*.01,A1:Math.PI*.01,target:20}
  ];
  static units = {resistance:'Ω',length:'m'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=WireModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=(this.config.ask==='length'?1000:1e9);}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // How far the change has gone at time t (0 to 1).
  progress(t){return Math.min(1,Math.max(0,t/WireModel.change));}
  // The wire's length (m) and cross-section (mm²) at time t; in the last test it unrolls to your length. Stretching keeps
  // the volume, so the area falls as the length grows.
  length(t){const c=this.config,L1=c.L1??(this.ready()?this.answer:0);return c.L0+(L1-c.L0)*this.progress(t);}
  area(t){const c=this.config,u=this.progress(t);if(c.key==='stretch')return c.A0*c.L0/this.length(t);if(c.key==='thicker'){const d0=Math.sqrt(c.A0),d=d0*(1+u);return d*d;}return c.A0;}
  resistance(t){return WireModel.rho[this.config.metal]*this.length(t)/(this.area(t)*1e-6);}
  duration(){return WireModel.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at 3 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;return c.key==='coil'?c.target*c.A0*1e-6/WireModel.rho.nichrome:WireModel.rho[c.metal]*c.L1/(({copper:c.A1,longer:c.A1,thicker:Math.PI*.16,stretch:.25})[c.key]*1e-6);}
  unit(){return WireModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=WireModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='copper'){if(near(a,x*1e-6))slip='noMm';}
      else if(c.key==='longer'){if(near(a,1.5))slip='halved';else if(near(a,12))slip='squared';}
      else if(c.key==='thicker'){if(near(a,4))slip='thickHalved';else if(near(a,16))slip='doubled';}
      else if(c.key==='stretch'){if(near(a,10))slip='lengthOnly';else if(near(a,5))slip='unchanged';}
      else{if(near(a,x*4))slip='diameterAsRadius';else if(near(a,x/Math.PI))slip='noPi';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!WireModel.missions[saved.index])return false;
    const probe=new WireModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={resistance:'R =',length:'L =',};
// Three significant figures, in the page's language.
const sig=x=>x.toLocaleString(locale.lang,{maximumSignificantDigits:3,useGrouping:false});
// Givens: the copper wire, the starting resistance and the change, or the nichrome wire and the resistance to reach.
function given(m){
  const keys={copper:'givenCopper',longer:'givenLonger',thicker:'givenThicker',stretch:'givenStretch',coil:'givenCoil'};
  return text(keys[m.key],{L:plain(2),A:plain(.5),R:plain(m.R0??m.target??0),d:plain(.2)});
}
function equation(){
  const k=model.config.key;
  if(k==='copper')return 'R = ρ·L ÷ A = '+plain(1.68e-8)+' × 2 ÷ '+plain(5e-7)+' = '+sig(.0672)+' Ω';
  if(k==='longer')return 'R ∝ L: 3 × 2 = 6 Ω';
  if(k==='thicker')return 'R ∝ 1 ÷ d²: 8 ÷ 2² = 2 Ω';
  if(k==='stretch')return 'L × 2, A ÷ 2: 5 × 2 × 2 = 20 Ω';
  return 'L = R·A ÷ ρ = 20 × π × ('+plain(1e-4)+')² ÷ '+plain(1.1e-6)+' = '+sig(model.exact())+' m';
}
function baseEquation(){return 'R = ρ·L ÷ A';}
function metrics(t,begun){
  if(!begun){for(const id of ['resistance-value','length-value','area-value'])$(id).textContent='—';return;}
  $('resistance-value').textContent=sig(model.resistance(t));$('length-value').textContent=sig(model.length(t));$('area-value').textContent=sig(model.area(t));
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const k=model.config.key,v={R:sig(model.resistance(t)),L:sig(model.length(t))};
  return text({copper:'unrollCopy',longer:'longerCopy',thicker:'thickerCopy',stretch:'stretchCopy',coil:'unrollCopy'}[k],v);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const x0=area*.1,xmax=area*.9,cy=height*.56,L=g.begun||c.L0?model.length(t):c.L0,A=model.area(t);
  // The scale: the longest the wire gets in this test fits the bench.
  const Lend=c.L1??(model.ready()?Math.max(model.answer,model.exact()):model.exact()),pxm=(xmax-x0)/Math.max(Lend*1.08,1e-9);
  const thick=Math.max(3,Math.min(28,18*Math.sqrt(A/.5))),x1=x0+L*pxm,col=c.metal==='copper'?'#c9a27a':'#b8c4cc';
  line([{x:x0-30,y:cy+40},{x:xmax+30,y:cy+40}],'#5c7a8f',1);
  if(L>0){box(x0,cy-thick/2,x1-x0,thick,col);line([{x:x0,y:cy-thick/2},{x:x1,y:cy-thick/2}],'rgba(255,255,255,.35)',1);}
  // The clamps: the left one fixed, the right one moving with the wire's end.
  for(const x of [x0,Math.max(x0+2,x1)]){box(x-7,cy-24,14,48,'#3a5468');ctx.strokeStyle='#9fb6c7';ctx.lineWidth=1;ctx.strokeRect(x-7,cy-24,14,48);}
  // The ohmmeter, wired to both clamps.
  const mx=(x0+xmax)/2,my=cy-110;line([{x:x0,y:cy-24},{x:x0,y:my},{x:mx-60,y:my}],'#9fb6c7',1);line([{x:Math.max(x0+2,x1),y:cy-24},{x:Math.max(x0+2,x1),y:my+18},{x:mx+60,y:my+18},{x:mx+60,y:my}],'#9fb6c7',1);
  box(mx-60,my-18,120,36,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.strokeRect(mx-60,my-18,120,36);
  fit(g.begun?'R = '+sig(model.resistance(t))+' Ω':'R = ? Ω',mx,my+6,'#f2f8fc',15,112,'center');
  if(g.guess&&c.ask==='resistance')fit(text('guessTag')+': '+plain(model.answer)+' Ω',mx,my-26,'#efb958',10,area*.6,'center');
  fit(text(c.metal==='copper'?'copperTag':'nichromeTag'),x0,cy+60,'#d1e3ed',11,area*.4);
  if(c.target)fit(text('targetTag',{R:plain(c.target)}),xmax,cy+60,'#d1e3ed',11,area*.4,'right');
  // Sizes: the length under the wire and the cross-section beside it.
  if(g.option&&L>0){
    const yy=cy+28;line([{x:x0,y:yy},{x:x1,y:yy}],'#d1e3ed',1);line([{x:x0,y:yy-4},{x:x0,y:yy+4}],'#d1e3ed',1);line([{x:x1,y:yy-4},{x:x1,y:yy+4}],'#d1e3ed',1);
    fit('L = '+sig(L)+' m',(x0+x1)/2,yy-4,'#d1e3ed',10,Math.max(60,x1-x0),'center');
    fit('A = '+sig(A)+' mm²',x0+14,cy-thick/2-34,'#d1e3ed',10,area*.4);
  }
  if(g.guess&&c.ask==='length'){const gx=x0+model.answer*pxm;line([{x:gx,y:cy-36},{x:gx,y:cy+40}],'#efb958',1.5,[5,4]);fit(text('guessTag'),gx,cy-40,'#efb958',10,area*.3,'center');}
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now(),k=c.key;
  fit(text('resistanceGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64;
  // R against what changes: the length in metres, or the length or diameter as a multiple of the start.
  const steps=40,par=s=>k==='thicker'?1+model.progress(s):k==='longer'||k==='stretch'?model.length(s)/c.L0:model.length(s);
  const pEnd=par(model.duration()),pMin=k==='copper'||k==='coil'?0:1,pMax=Math.max(pEnd,k==='coil'&&g.guess?model.answer:0,1e-9)*(pMin?1:1.1);
  const Rend=model.resistance(model.duration()),Rtop=Math.max(Rend,c.R0||0,c.target||0,g.guess&&c.ask==='resistance'?Math.min(model.answer,3*Rend):0)*1.2;
  const PX=p=>px0+(p-pMin)/(pMax-pMin||1)*(px1-px0),PY=r=>py1-Math.max(0,Math.min(r,Rtop))/Rtop*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{R:plain(c.target)}),px0+4,PY(c.target)-5,'#9fb6c7',9,(px1-px0)*.6);}
  if(g.guess){const a=model.answer;if(c.ask==='resistance'){line([{x:px0,y:PY(a)},{x:px1,y:PY(a)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,PY(a)-5,'#efb958',9,px1-px0);}
    else{line([{x:PX(a),y:py0},{x:PX(a),y:py1}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(a)-4,py0+10,'#efb958',9,px1-px0,'right');}}
  const pts=[];for(let i=0;i<=steps;i++){const s=t*i/steps;pts.push({x:PX(par(s)),y:PY(model.resistance(s))});}line(pts,'#d1e3ed',2);dot(PX(par(t)),PY(model.resistance(t)),4,'#f2f8fc');
  label(sig(model.resistance(t))+' Ω',px1,PY(model.resistance(t))-8,'#f2f8fc','right',10);
  for(const p of [pMin,(pMin+pMax)/2,pMax])label(sig(p),PX(p),py1+14,'#9fb6c7','center',9);
  fit(text(k==='copper'||k==='coil'?'lengthAxis':k==='thicker'?'widthAxis':'stretchAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
