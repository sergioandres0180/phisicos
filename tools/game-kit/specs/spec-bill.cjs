module.exports = {
kind:'bill',model:'BillModel',title:'Energy Meter',symbol:'E =',unit:'kWh',equation:'E (kWh) = P (kW) · t (h)',sci:true,timeUnits:true,timeUnit:'h',
// Givens mix words and numbers: in right-to-left pages each card's given takes the direction of its first letter.
css:'[dir=rtl] .bill-page .mission-list span{unicode-bidi:plaintext}.bill-page .line-key.lamp{background:#ffd27a}',
toggle:['show-flow','flowToggle'],
legends:[['green','energyLegend'],['lamp','applianceLegend'],['white','meterLegend'],['orange','guessLegend']],
metrics:[['power-value','powerMetric','W','P','scalar'],['hours-value','hoursMetric','h','t','scalar'],['energy-value','energyMetric','','E = P·t','scalar']],
modelCode:String.raw`
class BillModel {
  // Energy is power times time: E = P·t. With the power in kilowatts and the time in hours the energy comes out in
  // kilowatt-hours, the unit on an energy bill; 1 kWh = 1000 Wh = 3600 kJ, and 1 Wh = 3.6 kJ. A battery's energy is its
  // charge times its voltage: 1 Ah at 3.7 V holds 3.7 Wh. Each test runs over its own time (hours or days), sped up so a
  // run lasts 4 s, while the meter's digits count the energy drawn. Energies only: prices differ from place to place.
  static tolerance = .02;
  static missions = [
    {key:'bulb',ask:'kwh',P:100,T:5,tu:'h'},
    {key:'standby',ask:'kwh',P:2,T:30,tu:'d'},
    {key:'battery',ask:'kj',P:10,T:1.5,tu:'h',wh:15},
    {key:'swap',ask:'kwh',P:60,P2:9,T:1000,tu:'h'},
    {key:'phone',ask:'wh',P:3.7,T:3,tu:'h',mAh:3000,V:3.7}
  ].map(m=>({...m,pace:m.T/4}));
  static units = {kwh:'kWh',kj:'kJ',wh:'Wh'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BillModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=1e9;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // Time t is in the test's own unit; the hours it makes, and the energy drawn by then in Wh (saved, in the swap test).
  hours(t){return t*(this.config.tu==='d'?24:1);}
  wh(t){const c=this.config;return (c.P-(c.P2??0))*this.hours(t);}
  used(i,t){const c=this.config;return (i===0?c.P:c.P2)*this.hours(t);}
  reading(t){const c=this.config,w=this.wh(t);return c.ask==='kwh'?w/1000:c.ask==='kj'?w*3.6:w;}
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
  exact(){return this.reading(this.duration());}
  unit(){return BillModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,x=this.exact(),tol=BillModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      const w=this.wh(this.duration());
      if(c.key==='bulb'){if(near(a,w))slip='wh';else if(near(a,w*3600))slip='joulesKwh';}
      else if(c.key==='standby'){if(near(a,w))slip='wh';else if(near(a,w/c.T/1000))slip='oneDay';}
      else if(c.key==='battery'){if(near(a,w*60/1000))slip='minutes';else if(near(a,w*3600))slip='joules';}
      else if(c.key==='swap'){if(near(a,w))slip='wh';else if(near(a,c.P*this.hours(c.T)/1000))slip='oldOnly';}
      else{if(near(a,c.mAh*c.V))slip='noMilli';else if(near(a,c.mAh/1000))slip='charge';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BillModel.missions[saved.index])return false;
    const probe=new BillModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={kwh:'E =',kj:'E =',wh:'E ='};
const sig=x=>Number(x.toPrecision(10)).toLocaleString(locale.lang,{maximumSignificantDigits:4,useGrouping:false});
// Givens: the appliance's power and the time, the power bank, the swap, or the phone battery.
function given(m){
  const keys={bulb:'givenBulb',standby:'givenStandby',battery:'givenBattery',swap:'givenSwap',phone:'givenPhone'};
  return text(keys[m.key],{P:plain(m.P),Q:plain(m.P2??0),T:plain(m.T),w:plain(m.wh??0),a:plain(m.mAh??0),V:plain(m.V??0)});
}
function equation(){
  const k=model.config.key;
  if(k==='bulb')return 'E = '+plain(.1)+' kW × 5 h = '+plain(.5)+' kWh';
  if(k==='standby')return 'E = 2 W × 720 h = 1440 Wh = '+plain(1.44)+' kWh';
  if(k==='battery')return 'E = 15 Wh × '+plain(3.6)+' kJ/Wh = 54 kJ';
  if(k==='swap')return 'E = (60 − 9) W × 1000 h = 51000 Wh = 51 kWh';
  return 'E = 3 Ah × '+plain(3.7)+' V = '+plain(11.1)+' Wh';
}
function baseEquation(){return 'E (kWh) = P (kW) · t (h)';}
function timeUnit(){return model.config.tu;}
function metrics(t,begun){
  if(!begun){for(const id of ['power-value','hours-value','energy-value'])$(id).textContent='—';return;}
  const c=model.config;$('power-value').textContent=sig(c.P-(c.P2??0));$('hours-value').textContent=sig(model.hours(t));$('energy-value').textContent=sig(model.reading(t))+' '+model.unit();
}
function values(){return {x:sig(model.exact())};}
function runningCopy(t){
  const c=model.config,v={P:sig(c.P),Q:sig(c.P2??0),h:sig(model.hours(t)),w:sig(model.wh(t)),k:sig(model.wh(t)/1000)};
  return text(c.key==='swap'?'swapCopy':'meterCopy',v);
}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,area=g.area,t=g.begun?model.now():0,swap=c.key==='swap';
  const my=height*.42,mx=area*.68,mw=Math.min(190,area*.42);
  // The meter: a box of rolling digits with its unit, kWh for the house tests and Wh for the batteries.
  const kwh=c.ask==='kwh',show=(g.begun?(kwh?model.wh(t)/1000:model.wh(t)):0),digits=(kwh?show.toFixed(3):show.toFixed(2)).padStart(kwh?8:7,'0');
  box(mx-mw/2,my-40,mw,80,'#0b1c29');ctx.strokeStyle='#d1e3ed';ctx.lineWidth=1.5;ctx.strokeRect(mx-mw/2,my-40,mw,80);
  fit(text(swap?'savedTag':'meterTag'),mx,my-24,'#9fb6c7',9,mw-10,'center');
  const n=digits.length,cw=Math.min(18,(mw-40)/n);for(let i=0;i<n;i++){const x=mx-n*cw/2+i*cw;if(digits[i]==='.'){dot(x+cw/2,my+12,2,'#f2f8fc');continue;}box(x+1,my-10,cw-2,28,'#102637');label(digits[i],x+cw/2,my+10,'#f2f8fc','center',Math.round(cw*.9));}
  fit(kwh?'kWh':'Wh',mx+mw/2-6,my+32,'#d1e3ed',10,40,'right');
  // The appliance: a lamp, a TV on standby, a power bank, two lamps side by side, or a phone on charge.
  const ax=area*.24,ay=my;const b=g.begun?1:0;
  if(c.key==='bulb'||swap){const xs=swap?[ax-34,ax+34]:[ax];xs.forEach((x,i)=>{const P=i===0?c.P:c.P2;if(b)dot(x,ay,18+P/6,'rgba(255,210,120,'+(.15+P/300)+')');dot(x,ay,14,b?'#ffd27a':'#46596a');ctx.beginPath();ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.arc(x,ay,14,0,Math.PI*2);ctx.stroke();
    line([{x:x-9,y:ay-9},{x:x+9,y:ay+9}],'#f2f8fc',1.5);line([{x:x-9,y:ay+9},{x:x+9,y:ay-9}],'#f2f8fc',1.5);fit(text(swap?(i===0?'oldTag':'ledTag'):'lampTag',{P:plain(P)}),x,ay+32,'#d1e3ed',9,swap?62:120,'center');
    if(swap)fit(sig(g.begun?model.used(i,t)/1000:0)+' kWh',x,ay+46,'#9fb6c7',9,62,'center');});}
  else if(c.key==='standby'){box(ax-40,ay-28,80,52,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.strokeRect(ax-40,ay-28,80,52);line([{x:ax-14,y:ay+32},{x:ax+14,y:ay+32}],'#f2f8fc',2);dot(ax+32,ay+18,3,'#ff7b6b');fit(text('tvTag',{P:plain(c.P)}),ax,ay+48,'#d1e3ed',9,120,'center');}
  else{const phone=c.key==='phone',w=phone?34:62,h=phone?64:34,f=g.begun?(phone?model.wh(t)/model.wh(c.T):1-model.wh(t)/model.wh(c.T)):(phone?0:1);
    box(ax-w/2,ay-h/2,w,h,'#102637');ctx.strokeStyle='#f2f8fc';ctx.lineWidth=1.5;ctx.strokeRect(ax-w/2,ay-h/2,w,h);
    if(phone)box(ax-w/2+4,ay+h/2-4-(h-8)*f,w-8,(h-8)*f,'#75efc7');else box(ax-w/2+4,ay-h/2+4,(w-8)*f,h-8,'#75efc7');
    fit(text(phone?'phoneTag':'bankTag',{w:plain(c.wh??0),a:plain(c.mAh??0),V:plain(c.V??0)}),ax,ay+Math.max(h/2,20)+16,'#d1e3ed',9,area*.4,'center');}
  // The wires between meter and appliance, with energy flowing out of the meter.
  line([{x:mx-mw/2,y:my},{x:ax+(swap?62:46),y:my}],'#c9d6e0',2);
  if(g.option&&g.begun){const off=(t/c.pace*30)%24,x0=ax+(swap?66:50),x1=mx-mw/2-4;for(let x=x1-off;x>x0;x-=24){line([{x:x+4,y:my-8},{x:x-4,y:my-8}],'#75efc7',2.5);line([{x,y:my-11},{x:x-4,y:my-8},{x,y:my-5}],'#75efc7',2.5);}}
  // The timeline: how far through the test's hours or days the run has come.
  const lx0=area*.1,lx1=area*.9,ly=height-82,f=t/c.T;line([{x:lx0,y:ly},{x:lx1,y:ly}],'#5c7a8f',4);line([{x:lx0,y:ly},{x:lx0+(lx1-lx0)*f,y:ly}],'#75efc7',4);dot(lx0+(lx1-lx0)*f,ly,5,'#f2f8fc');
  label('0 '+c.tu,lx0,ly+16,'#9fb6c7','left',9);label(plain(c.T)+' '+c.tu,lx1,ly+16,'#9fb6c7','right',9);
  if(g.guess)fit(text('guessTag')+': '+plain(model.answer)+' '+model.unit(),area/2,height-46,'#efb958',10,area*.7,'center');
  fit(text('speedTag',{p:sig(c.pace),u:c.tu}),16,height-24,'#9fb6c7',10,area-28);
  fit('t = '+number(t)+' '+c.tu,area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g,t=model.now();
  fit(text('energyGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+40,px1=width-14,py0=86,py1=height-64,T=model.duration(),x=model.exact();
  // The energy in the asked unit against time: a straight line, since the power is steady.
  const top=Math.max(x,g.guess?Math.min(model.answer,3*x):0)*1.2,PX=s=>px0+s/T*(px1-px0),PY=v=>py1-Math.max(0,Math.min(v,top))/top*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
  line([{x:PX(0),y:PY(0)},{x:PX(t),y:PY(model.reading(t))}],'#75efc7',2);dot(PX(t),PY(model.reading(t)),4,'#f2f8fc');
  label(sig(model.reading(t))+' '+model.unit(),PX(t)-6,PY(model.reading(t))-8,'#f2f8fc','right',10);
  if(g.guess){line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),px1-2,PY(model.answer)+12,'#efb958',9,px1-px0,'right');}
  fit(sig(c.P-(c.P2??0))+' W × '+sig(model.hours(t))+' h = '+sig(model.wh(t))+' Wh',g.area+8,66,'#d1e3ed',10,width-g.area-16);
  for(const s of [0,T/2,T])label(sig(s),PX(s),py1+14,'#9fb6c7','center',9);
  fit(text('timeAxis',{u:c.tu}),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
