module.exports = {
kind:'fuse',model:'FuseModel',title:'Fuse Test',symbol:'I =',unit:'A',equation:'I = V ÷ R',sci:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .fuse-page .mission-list span{unicode-bidi:plaintext}.fuse-page .line-key.fuse{background:linear-gradient(90deg,#c9d6e0,#ff7b4a)}',
toggle:['show-flow','flowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['fuse','fuseLegend'],['orange','guessLegend']],
metrics:[['supply-value','supplyMetric','V','V_supply','scalar'],['current-value','currentMetric','A','I = V ÷ R','vector'],['load-value','loadMetric','%','I ÷ I_fuse','scalar']],
modelCode:String.raw`
class FuseModel {
  // A fuse is a thin wire that melts when the current through it reaches its rating, breaking the circuit. The current is
  // set by Ohm's law, I = V ÷ R, with a battery's own internal resistance counted in a short circuit. The supply ramps
  // steadily from 0 to its voltage over 2 s; the fuse melts the exact moment the current reaches its rating (a current
  // within 0.05% of the rating counts as holding), and a fuse that holds is watched 1 s more. Teaching values, not safety
  // limits: the kettle and skin tests use 230 V mains, and a fuse protects wiring, not people.
  static T = 3;
  static ramp = 2;
  static tolerance = .02;
  static grace = .0005;
  static missions = [
    {key:'kettle',ask:'current',V:230,R:26.45,fuse:13},
    {key:'least',ask:'resistance',V:12,R:null,fuse:2,limit:'least'},
    {key:'skin',ask:'milli',V:230,R:1000,fuse:13},
    {key:'rating',ask:'voltage',V:null,R:47,fuse:.1,limit:'most'},
    {key:'short',ask:'current',V:12,R:0,r:.05,fuse:300}
  ];
  static units = {current:'A',resistance:'Ω',milli:'mA',voltage:'V'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=FuseModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e6;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The supply's set voltage and the circuit's resistance (yours in the limit tests), the battery's own included.
  setV(){const c=this.config;return c.V??(this.ready()?this.answer:0);}
  resistance(){const c=this.config;return (c.R??(this.ready()?this.answer:Infinity))+(c.r||0);}
  supply(t){return this.setV()*Math.min(1,Math.max(0,t/FuseModel.ramp));}
  // The current the supply would drive, and whether and when the fuse melts.
  drive(t){const R=this.resistance();return Number.isFinite(R)?this.supply(t)/R:0;}
  peak(){return this.drive(FuseModel.ramp);}
  melts(){return this.peak()>this.config.fuse*(1+FuseModel.grace);}
  meltTime(){return this.melts()?FuseModel.ramp*this.config.fuse/this.peak():Infinity;}
  melted(t){return t>=this.meltTime();}
  current(t){return this.melted(t)?0:this.drive(t);}
  duration(){return FuseModel.T;}
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
  exact(){const c=this.config;return {kettle:c.V/c.R,least:c.V/c.fuse,skin:c.V/c.R*1000,rating:c.fuse*c.R,short:c.V/c.r}[c.key];}
  unit(){return FuseModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=FuseModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    // A limit holds with at most 2% to spare: the least resistance, or the most voltage, that the fuse survives.
    const ok=c.limit==='least'?!this.melts()&&a<=x*(1+tol):c.limit==='most'?!this.melts()&&a>=x*(1-tol):near(a,x);let slip=null;
    if(!ok){
      if(c.key==='kettle'){if(near(a,c.V*c.R))slip='kettleTimes';else if(near(a,c.R/c.V))slip='kettleInverted';}
      else if(c.key==='least'){if(near(a,c.V*c.fuse))slip='leastTimes';else if(near(a,c.fuse/c.V))slip='leastInverted';else slip=this.melts()?'melted':'spare';}
      else if(c.key==='skin'){if(near(a,x/1000))slip='amps';}
      else if(c.key==='rating'){if(near(a,c.R/c.fuse))slip='ratingDivided';else slip=this.melts()?'melted':'spare';}
      else{if(near(a,c.V*c.r))slip='shortTimes';else if(near(a,c.r/c.V))slip='shortInverted';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!FuseModel.missions[saved.index])return false;
    const probe=new FuseModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={current:'I =',resistance:'R =',milli:'I =',voltage:'V =',};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the load and the supply, the fuse to survive, or the battery and its internal resistance.
function given(m){
  const keys={kettle:'givenKettle',least:'givenLeast',skin:'givenSkin',rating:'givenRating',short:'givenShort'};
  return text(keys[m.key],{V:plain(m.V??0),R:plain(m.R??0),F:plain(m.fuse),r:plain(m.r??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='kettle')return 'I = V ÷ R = 230 ÷ '+plain(26.45)+' = '+sig(230/26.45)+' A';
  if(k==='least')return 'R = V ÷ I = 12 ÷ 2 = 6 Ω';
  if(k==='skin')return 'I = 230 ÷ 1000 = '+plain(.23)+' A = 230 mA';
  if(k==='rating')return 'V = I·R = '+plain(.1)+' × 47 = '+plain(4.7)+' V';
  return 'I = V ÷ r = 12 ÷ '+plain(.05)+' = 240 A';
}
function baseEquation(){return 'I = V ÷ R';}
function metrics(t,begun){
  if(!begun){for(const id of ['supply-value','current-value','load-value'])$(id).textContent='—';return;}
  const I=model.current(t);$('supply-value').textContent=sig(model.supply(t));$('current-value').textContent=sig(I);$('load-value').textContent=number(100*I/model.config.fuse,1);
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={V:sig(model.supply(t)),I:sig(model.current(t)),F:plain(c.fuse)};
  if(model.melted(t))return text('meltCopy',v);
  if(t>=FuseModel.ramp)return text('holdCopy',{...v,I:sig(model.drive(t))});
  return text('rampCopy',v);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.12,R=area*.88,Ty=110,By=height-120,sx=L,sy=(Ty+By)/2,fx=L+(R-L)*.3,lx=L+(R-L)*.68,ax=R,ay=sy;
  const I=g.begun?model.current(t):0,melted=g.begun&&model.melted(t),load=g.begun?model.drive(t)/c.fuse:0;
  const path=[[sx,sy-30],[sx,Ty],[R,Ty],[R,By],[sx,By],[sx,sy+30]];
  // The supply's label sits on the wire below it, or under the bottom wire when the loop is too short (phones).
  const tagY=By-sy>=80?sy+60:By+16;
  for(let i=1;i<path.length;i++)line([{x:path[i-1][0],y:path[i-1][1]},{x:path[i][0],y:path[i][1]}],'#c9d6e0',c.key==='short'&&i===2?5:2);
  // The supply, with the battery's internal resistance shown inside it in the short-circuit test.
  box(sx-34,sy-30,68,60,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(sx-34,sy-30,68,60);
  fit(g.begun?sig(model.supply(t))+' V':'? V',sx,sy+5,'#f2f8fc',13,62,'center');label('+',sx+8,sy-36,'#75efc7','left',11);label('−',sx+8,sy+44,'#77b9ff','left',11);
  if(c.r){const tag=text('internalTag',{r:plain(c.r)});ctx.font='9px -apple-system,BlinkMacSystemFont,sans-serif';const tw=Math.min(ctx.measureText(tag).width,120)+8;box(sx-tw/2,tagY-10,tw,14,'#0b1c29');fit(tag,sx,tagY,'#d1e3ed',9,120,'center');}
  // The fuse: a glass cartridge whose wire warms with the current and melts at the rating.
  box(fx-36,Ty-10,72,20,'rgba(209,227,237,.12)');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1;ctx.strokeRect(fx-36,Ty-10,72,20);box(fx-42,Ty-10,8,20,'#9fb6c7');box(fx+34,Ty-10,8,20,'#9fb6c7');
  const u=Math.min(1,load),wire='rgb('+Math.round(201+54*u)+','+Math.round(214-100*u)+','+Math.round(224-150*u)+')';
  if(melted){line([{x:fx-34,y:Ty},{x:fx-8,y:Ty}],'#ff7b4a',2);line([{x:fx+8,y:Ty},{x:fx+34,y:Ty}],'#ff7b4a',2);dot(fx-6,Ty+3,2.5,'#ffb070');dot(fx+5,Ty+5,2,'#ffb070');fit(text('meltedTag'),fx,Ty+30,'#efb958',11,140,'center');}
  else{if(u>.6)dot(fx,Ty,8+10*u,'rgba(255,140,80,'+(.1+.3*(u-.6)/.4)+')');line([{x:fx-34,y:Ty},{x:fx+34,y:Ty}],wire,2);}
  fit(text('fuseTag',{F:plain(c.fuse)}),fx,Ty-18,'#d1e3ed',10,140,'center');
  // The load: a kettle, wet skin, a resistor, your resistor, or a thick shorting wire.
  if(c.key!=='short'){box(lx-30,Ty-11,60,22,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.strokeRect(lx-30,Ty-11,60,22);}
  const loadLabel={kettle:text('kettleTag',{R:plain(26.45)}),least:model.ready()?plain(model.answer)+' Ω':'R = ?',skin:text('skinTag',{R:plain(1000)}),rating:text('ratedTag',{R:plain(47),F:plain(.1)}),short:text('shortTag')}[c.key];
  fit(loadLabel,lx,Ty-18,'#d1e3ed',10,160,'center');
  // The ammeter.
  dot(ax,ay,14,'#0b1c29');ctx.beginPath();ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.arc(ax,ay,14,0,Math.PI*2);ctx.stroke();label('A',ax,ay+4,'#f2f8fc','center',12);
  box(ax-46,ay+20,92,20,'#0b1c29');fit(g.begun?sig(I)+' A':'? A',ax,ay+34,'#f2f8fc',11,86,'center');
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),(L+R)/2,By+30,'#efb958',10,area*.6,'center');
  if(g.option&&I>0){
    const seg=[];let total=0;for(let i=1;i<path.length;i++){const l=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push([path[i-1],path[i],total,l]);total+=l;}
    const at=d=>{d=((d%total)+total)%total;for(const [a,bb,s0,l] of seg)if(d<=s0+l){const q=(d-s0)/l;return [a[0]+(bb[0]-a[0])*q,a[1]+(bb[1]-a[1])*q,(bb[0]-a[0])/l,(bb[1]-a[1])/l];}return [path[0][0],path[0][1],1,0];};
    const skip=(x,y)=>Math.abs(y-Ty)<14&&(Math.abs(x-fx)<44||(c.key!=='short'&&Math.abs(x-lx)<36))||Math.hypot(x-ax,y-ay)<18||Math.abs(x-ax)<8&&y>ay&&y<ay+44||c.r&&Math.abs(x-sx)<8&&y>tagY-16&&y<tagY+8;
    const shift=t*I/(model.peak()*model.duration()||1)*120;
    for(let d=0;d<total;d+=32){const [x,y]=at(d-shift);if(!skip(x,y)){dot(x,y,4.5,'#77b9ff');line([{x:x-2.5,y},{x:x+2.5,y}],'#0b1c29',1.5);}}
    for(const fr of [.15,.45,.7,.92]){const [x0,y0,ux,uy]=at(fr*total),x=x0-uy*11,y=y0+ux*11;if(skip(x0,y0))continue;line([{x:x-ux*11,y:y-uy*11},{x:x+ux*11,y:y+uy*11}],'#75efc7',3);line([{x:x+ux*4-uy*5,y:y+uy*4+ux*5},{x:x+ux*11,y:y+uy*11},{x:x+ux*4+uy*5,y:y+uy*4-ux*5}],'#75efc7',3);}
  }
  if(g.option)fit(text('dotNote'),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('currentGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+44,px1=width-14,py0=70,py1=height-64,Vset=model.setV(),peak=model.peak();
  // Current against the supply voltage: Ohm's line up to the set voltage, and the fuse's rating if it is on the scale.
  const showFuse=c.fuse<=3*peak,Itop=Math.max(peak,showFuse?c.fuse:0,1e-9)*1.2,Vtop=Vset*1.1||1;
  const PX=v=>px0+Math.max(0,Math.min(v,Vtop))/Vtop*(px1-px0),PY=i=>py1-Math.max(0,Math.min(i,Itop))/Itop*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  line([{x:PX(0),y:PY(0)},{x:PX(Vset),y:PY(peak)}],'#5c7a8f',1,[3,3]);
  if(showFuse){line([{x:px0,y:PY(c.fuse)},{x:px1,y:PY(c.fuse)}],'#ff9a6a',1.5,[5,4]);fit(text('ratingTag',{F:plain(c.fuse)}),px0+4,PY(c.fuse)-5,'#ff9a6a',9,(px1-px0)*.7);}
  else fit(text('offScaleTag',{F:plain(c.fuse)}),px0+4,py0+10,'#ff9a6a',9,(px1-px0)*.9);
  if(g.guess&&!c.limit){const a=c.ask==='milli'?model.answer/1000:model.answer;line([{x:px0,y:PY(a)},{x:px1,y:PY(a)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-4,PY(a)-5,'#efb958',9,px1-px0,'right');}
  const tEnd=Math.min(t,model.meltTime(),FuseModel.ramp),pts=[];for(let i=0;i<=40;i++){const s=tEnd*i/40;pts.push({x:PX(model.supply(s)),y:PY(model.drive(s))});}line(pts,'#d1e3ed',2);
  if(model.melted(t)){const mx=PX(model.supply(model.meltTime())),my=PY(c.fuse);line([{x:mx-5,y:my-5},{x:mx+5,y:my+5}],'#ff7b4a',2);line([{x:mx-5,y:my+5},{x:mx+5,y:my-5}],'#ff7b4a',2);line([{x:mx,y:my},{x:mx,y:py1}],'#ff7b4a',1,[2,3]);}
  else dot(PX(model.supply(t)),PY(model.drive(t)),4,'#f2f8fc');
  if(!model.melted(t))label(sig(model.current(t))+' A',px1,PY(model.current(t))+14,'#f2f8fc','right',10);
  for(const v of [0,Vset/2,Vset])label(sig(v),PX(v),py1+14,'#9fb6c7','center',9);
  fit(text('voltAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
