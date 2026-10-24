module.exports = {
kind:'turnstile',model:'TurnstileModel',title:'Charge Gate',symbol:'I =',unit:'A',equation:'I = Q ÷ t',sci:true,timeUnits:true,
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .turnstile-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-arrows','arrowToggle'],
legends:[['green','currentLegend'],['blue','electronLegend'],['white','gateLegend'],['orange','guessLegend']],
metrics:[['charge-value','chargeMetric','C','Q = I·t','scalar'],['current-value','currentMetric','A','I = Q ÷ t','vector'],['electrons-value','electronsMetric','e⁻','N = Q ÷ e','scalar']],
modelCode:String.raw`
class TurnstileModel {
  // A current is charge per second through a cut across the wire: I = Q ÷ t, so Q = I·t, and one ampere is one coulomb
  // each second, 1 ÷ e = 6.242 × 10¹⁸ electrons. The current is steady from the start. Each test runs over its own time
  // (1 s, 1 min, 5 min, 1.5 h, or until 90 C has passed) in its own unit, shown sped up or slowed so a run takes 4 s.
  static e = 1.602e-19;
  static seconds = {s:1,min:60,h:3600};
  static tolerance = .02;
  static missions = [
    {key:'rate',ask:'current',I:.5,tu:'min',T:1},
    {key:'lamp',ask:'charge',I:2,tu:'min',T:5},
    {key:'electrons',ask:'rate',I:1,tu:'s',T:1},
    {key:'phone',ask:'charge',I:2,tu:'h',T:1.5},
    {key:'wait',ask:'time',I:.25,tu:'s',T:360,target:90}
  ].map(m=>({...m,pace:m.T/4}));
  static units = {current:'A',charge:'C',rate:'e⁻/s',time:'s'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=TurnstileModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e30;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // Time t is in the test's own unit; the charge through the gate by then, in C, and the electrons that carried it.
  charge(t){const c=this.config;return c.I*t*TurnstileModel.seconds[c.tu];}
  electrons(t){return this.charge(t)/TurnstileModel.e;}
  duration(){return this.config.T;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at the test's time.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const k=this.config.key;return {rate:.5,lamp:600,electrons:1/TurnstileModel.e,phone:10800,wait:360}[k];}
  unit(){return TurnstileModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=TurnstileModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='rate'){if(near(a,30))slip='perMinute';else if(near(a,2))slip='inverted';}
      else if(c.key==='lamp'){if(near(a,10))slip='lampMinutes';else if(near(a,2/300))slip='divided';}
      else if(c.key==='electrons'){if(near(a,TurnstileModel.e))slip='multiplied';}
      else if(c.key==='phone'){if(near(a,3))slip='hours';else if(near(a,180))slip='phoneMinutes';}
      else{if(near(a,22.5))slip='timesCharge';else if(near(a,6))slip='waitMinutes';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!TurnstileModel.missions[saved.index])return false;
    const probe=new TurnstileModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={current:'I =',charge:'Q =',rate:'N ÷ t =',time:'t =',};
function timeUnit(){return model.config.tu;}
// Givens: the charge and the time, the current and the time, or the current and the charge to carry.
function given(m){
  const keys={rate:'givenRate',lamp:'givenLamp',electrons:'givenElectrons',phone:'givenPhone',wait:'givenWait'};
  return text(keys[m.key],{I:m.I===2?number(2,1):plain(m.I),Q:plain(m.key==='rate'?30:90),t:plain(m.T),e:plain(TurnstileModel.e)});
}
function equation(){
  const k=model.config.key;
  if(k==='rate')return 'I = Q ÷ t = 30 ÷ 60 = '+number(.5,2)+' A';
  if(k==='lamp')return 'Q = I·t = '+number(2,1)+' × 300 = 600 C';
  if(k==='electrons')return 'N ÷ t = I ÷ e = 1 ÷ '+plain(TurnstileModel.e)+' = '+plain(1/TurnstileModel.e)+' e⁻/s';
  if(k==='phone')return 'Q = I·t = '+number(2,1)+' × 5400 = 10800 C';
  return 't = Q ÷ I = 90 ÷ '+plain(.25)+' = 360 s';
}
function baseEquation(){return 'I = Q ÷ t';}
function metrics(t,begun){
  if(!begun){for(const id of ['charge-value','current-value','electrons-value'])$(id).textContent='—';return;}
  $('charge-value').textContent=number(model.charge(t),1);$('current-value').textContent=number(model.config.I,2);$('electrons-value').textContent=plain(model.electrons(t));
}
function values(){const k=model.config.key,x=model.exact();return {x:k==='rate'?number(x,2):plain(x)};}
const span=t=>number(t)+' '+model.config.tu;
function runningCopy(t){
  if(model.config.key==='electrons')return text('electronCopy',{N:plain(model.electrons(t)),t:span(t)});
  return text('countCopy',{Q:number(model.charge(t),1),t:span(t)});
}
// How much charge each moving dot stands for: a thirtieth of the run's total.
function chunk(){return model.charge(model.duration())/30;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0;
  const L=area*.05,R=area*.95,cx=(L+R)/2,cy=height*.52,h=58,top=cy-h/2,bottom=cy+h/2;
  // The wire, magnified, with the gate: a cut across it where the charge is counted.
  box(L,top,R-L,h,'#1d3346');line([{x:L,y:top},{x:R,y:top}],'#8aa3b5',1.5);line([{x:L,y:bottom},{x:R,y:bottom}],'#8aa3b5',1.5);
  ctx.save();ctx.beginPath();ctx.rect(L,top,R-L,h);ctx.clip();
  // Electrons move to the left, against the current; their spacing passes the gate at a rate that follows I.
  // A whole number of gaps fits the wire, so the spacing stays even where the dots wrap round.
  const W=R-L,cnt=Math.max(4,Math.round(W/26)),gap=W/cnt,shift=model.charge(t)/chunk()*gap;
  for(const [row,off] of [[cy-13,0],[cy+13,gap/2]])for(let k=0;k<cnt;k++){const x=L+((k*gap+off-shift)%W+W)%W;dot(x,row,4.5,'#77b9ff');line([{x:x-2.5,y:row},{x:x+2.5,y:row}],'#0b1c29',1.5);}
  ctx.restore();
  ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.ellipse(cx,cy,10,h/2+10,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  fit(text('gateTag'),cx,bottom+30,'#d1e3ed',10,area*.4,'center');
  // The counter above the gate.
  const isN=c.key==='electrons',reading=isN?'N = '+(g.begun?plain(model.electrons(t)):'?')+' e⁻':'Q = '+(g.begun?number(model.charge(t),1):'?')+' C';
  box(cx-86,top-66,172,32,'#0b1c29');ctx.strokeStyle='#5c7a8f';ctx.lineWidth=1;ctx.strokeRect(cx-86,top-66,172,32);fit(reading,cx,top-44,'#f2f8fc',15,164,'center');
  line([{x:cx,y:top-34},{x:cx,y:top-10}],'#5c7a8f',1);
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),cx,top-74,'#efb958',10,area*.6,'center');
  // The current: mint arrows to the right, the other way from the electrons.
  if(g.option)for(const fr of [.15,.5,.85]){const x=L+fr*W,y=bottom+14;if(Math.abs(x-cx)<30)continue;line([{x:x-16,y},{x:x+16,y}],'#75efc7',3);line([{x:x+9,y:y-5},{x:x+16,y},{x:x+9,y:y+5}],'#75efc7',3);label('I',x,y+16,'#75efc7','center',11);}
  const per=chunk();fit(text('dotNote',{q:isN?plain(per/TurnstileModel.e)+' e⁻':plain(Number(per.toPrecision(3)))+' C'}),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+span(t),area-16,44,'#f2f8fc',13,area*.3,'right');
  fit(text('paceNote',{t:plain(Number(c.pace.toPrecision(3)))+' '+c.tu}),area-16,62,'#9fb6c7',10,area*.4,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now(),isN=c.key==='electrons';
  fit(text(isN?'electronGraph':'countGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+48,px1=width-14,py0=70,py1=height-64,T=c.T,xmax=c.target?T*1.25:T;
  const amount=s=>isN?model.electrons(s):model.charge(s),total=amount(T),top=total*1.25;
  const PX=s=>px0+Math.min(s,xmax)/xmax*(px1-px0),PY=q=>py1-Math.max(0,Math.min(q,top))/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  // Your prediction: a slope for a current, a level for a charge, a time for the wait.
  if(g.guess){
    const a=model.answer;
    if(c.ask==='current'||c.ask==='rate'){const q=s=>a*s*TurnstileModel.seconds[c.tu];const s1=Math.min(xmax,top/(q(1)||1));line([{x:PX(0),y:PY(0)},{x:PX(s1),y:PY(q(s1))}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(s1)-4,PY(q(s1))-6,'#efb958',9,px1-px0,'right');}
    else if(c.ask==='charge'){line([{x:px0,y:PY(a)},{x:px1,y:PY(a)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px0+4,PY(a)-5,'#efb958',9,px1-px0);}
    else{line([{x:PX(a),y:py0},{x:PX(a),y:py1}],'#efb958',1.5,[5,4]);fit(text('guessTag'),PX(a)-4,py0+10,'#efb958',9,px1-px0,'right');}
  }
  if(c.target){line([{x:px0,y:PY(c.target)},{x:px1,y:PY(c.target)}],'#9fb6c7',1.5,[5,4]);fit(text('targetTag',{Q:plain(c.target)}),px0+4,PY(c.target)-5,'#9fb6c7',9,(px1-px0)*.6);}
  line([{x:PX(0),y:PY(0)},{x:PX(t),y:PY(amount(t))}],'#d1e3ed',2);dot(PX(t),PY(amount(t)),4,'#f2f8fc');
  for(const s of [0,T/2,T])label(plain(s),PX(s),py1+14,'#9fb6c7','center',9);
  if(!c.target){line([{x:px0-3,y:PY(total)},{x:px0+3,y:PY(total)}],'#9fb6c7',1);fit((isN?plain(total)+' e⁻':plain(Number(total.toPrecision(4)))+' C'),px0+6,PY(total)+3,'#9fb6c7',9,(px1-px0)*.5);}label('0',px0-4,PY(0)+3,'#9fb6c7','right',9);
  fit(text('timeAxis',{u:c.tu}),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
