module.exports = {
kind:'antenna',model:'AntennaModel',title:'Antenna Workshop',symbol:'λ =',unit:'m',equation:'λ = c ÷ f',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','waveLegend'],['white','antennaLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['frequency-value','frequencyMetric','MHz','f'],['wavelength-value','wavelengthMetric','m','λ = c ÷ f','vector'],['period-value','periodMetric','ns','T = 1 ÷ f'],['speed-value','speedMetric','m/s','c','vector']],
modelCode:String.raw`
class AntennaModel {
  // Radio waves, Wi-Fi, and microwaves are electromagnetic waves: they all travel at c = 3 × 10⁸ m/s, so a frequency f gives
  // crests λ = c ÷ f apart. A simple antenna works best a quarter of a wavelength long. In a microwave oven the waves bounce
  // between the walls and form a standing wave whose hot spots are half a wavelength apart. Waves are shown slowed down f times,
  // so one oscillation lasts one second on screen.
  static c = 3e8; // m/s
  static tolerance = .02;
  static run = 3;
  static missions = [
    {key:'fm',ask:'wavelength',f:1e8},
    {key:'antenna',ask:'antennaLength',f:1e8},
    {key:'wifi',ask:'wifi',f:2.4e9},
    {key:'oven',ask:'hotspots',f:2.45e9},
    {key:'am',ask:'am',f:1e6}
  ];
  static units = {wavelength:'m',antennaLength:'m',wifi:'cm',hotspots:'cm',am:'m'};
  static limits = {wavelength:1e20,antennaLength:1e20,wifi:1e20,hotspots:1e20,am:1e20};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=AntennaModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=AntennaModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  wavelength(){return AntennaModel.c/this.config.f;}
  // Display units: cm for the short waves, m otherwise.
  scale(){return this.unit()==='cm'?100:1;}
  oven(){return this.config.ask==='hotspots';}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // How far the wave has gone (m) after a displayed time: one wavelength per displayed second.
  front(t){return this.wavelength()*this.clamp(t);}
  // The field at x (m) as a share of its largest: a travelling wave, or the oven's standing wave growing in.
  field(x,t){const l=this.wavelength(),s=this.clamp(t);if(this.oven())return Math.sin(2*Math.PI*x/l)*Math.cos(2*Math.PI*s)*Math.min(1,s);return x<=l*s?Math.sin(2*Math.PI*(s-x/l)):0;}
  // The oven's hot spots (m from the wall), half a wavelength apart.
  hotspots(span){const l=this.wavelength(),out=[];for(let x=l/4;x<=span+1e-12;x+=l/2)out.push(x);return out;}
  duration(){return AntennaModel.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after three slowed oscillations.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config,l=this.wavelength();if(c.ask==='antennaLength')return l/4;if(c.ask==='wifi')return l*100;if(c.ask==='hotspots')return l/2*100;return l;}
  unit(){return AntennaModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),C=AntennaModel.c,l=this.wavelength(),tol=AntennaModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='wavelength'){if(near(a,C*c.f))slip='multiplied';else if(near(a,C/(c.f/1e6)))slip='megahertzAsHz';else if(near(a,c.f/C))slip='inverted';else if(near(a,340/c.f))slip='soundSpeed';}
      else if(c.ask==='antennaLength'){if(near(a,l))slip='fullWave';else if(near(a,l/2))slip='halfWave';}
      else if(c.ask==='wifi'){if(near(a,l))slip='metres';else if(near(a,l*1000*100))slip='gigaAsMega';else if(near(a,l*1000))slip='unitsMm';}
      else if(c.ask==='hotspots'){if(near(a,l*100))slip='fullWavelength';else if(near(a,l*25))slip='quarter';else if(near(a,l/2))slip='metres';}
      else{if(near(a,l/1000))slip='kilometres';else if(near(a,l*1000))slip='megaAsKilo';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!AntennaModel.missions[saved.index])return false;
    const probe=new AntennaModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={wavelength:'λ =',antennaLength:'L =',wifi:'λ =',hotspots:'d =',am:'λ ='};
const sup=n=>String(n).split('').map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');
// A power of ten written out: 10⁸, or 2.45 × 10⁹.
function sci(n){const e=Math.floor(Math.log10(n)+1e-9),m=n/10**e;return (Math.abs(m-1)<1e-9?'':plain(m)+' × ')+'10'+sup(e);}
const wrap=s=>s.includes('×')?'('+s+')':s;
function freq(f){return f>=1e9?plain(f/1e9)+' GHz':plain(f/1e6)+' MHz';}
function given(m){return 'f = '+freq(m.f)+(m.ask==='antennaLength'?' · λ = '+plain(AntennaModel.c/m.f)+' m':'');}
function equation(){
  const c=model.config,e=model.exact(),l=model.wavelength();
  if(c.ask==='antennaLength')return 'L = λ ÷ 4 = '+plain(l)+' ÷ 4 = '+number(e)+' m';
  if(c.ask==='hotspots')return 'd = c ÷ (2·f) = 3 × 10⁸ ÷ (2 × '+sci(c.f)+') = '+number(e)+' cm';
  return 'λ = c ÷ f = 3 × 10⁸ ÷ '+wrap(sci(c.f))+' = '+number(e,c.ask==='am'?0:c.ask==='wifi'?1:2)+' '+model.unit();
}
function baseEquation(){const a=model.config.ask;return a==='antennaLength'?'L = λ ÷ 4':a==='hotspots'?'d = λ ÷ 2':'λ = c ÷ f';}
function metrics(t,begun){
  const c=model.config,l=model.wavelength(),T=1e9/c.f;
  $('frequency-value').textContent=begun?plain(c.f/1e6):'—';$('wavelength-value').textContent=begun?number(l,l<1?3:l<10?2:0):'—';
  $('period-value').textContent=begun?number(T,T<1?3:T<100?1:0):'—';$('speed-value').textContent=begun?'3 × 10⁸':'—';
}
function values(){
  const c=model.config,l=model.wavelength();
  if(c.ask==='antennaLength')return {f:plain(c.f/1e6),l:plain(l),a:number(l/4)};
  if(c.ask==='wifi')return {g:plain(c.f/1e9),l:number(l*100,1)};
  if(c.ask==='hotspots')return {a:number(l*50),l:number(l*100,1)};
  if(c.ask==='am')return {f:plain(c.f/1e6),l:number(l,0),a:number(l/4,0)};
  return {f:plain(c.f/1e6),l:number(l)};
}
function runningCopy(t){const k=model.scale(),d=model.oven()?0:model.front(t)*k;return text(model.oven()?'standingCopy':'travellingCopy',{n:number(model.clamp(t),1),d:number(d,d<10?2:d<100?1:0)+' '+model.unit()});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,l=model.wavelength(),k=model.scale(),unit=k===100?'cm':'m',view=3.5*l,x0=62,x1=g.area-20,kp=(x1-x0)/view,X=x=>x0+x*kp,ym=height*.47,amp=Math.min(70,height*.16),top=ym-amp-26;
  if(model.oven()){
    // The oven: a box with walls at both ends, the standing wave inside, and a chocolate bar that melts at the hot spots.
    box(x0-8,ym-amp-14,x1-x0+16,2*amp+28,'#22384a');box(x0,ym-amp-6,x1-x0,2*amp+12,'#173a50');
    const pts=[],env=[];for(let i=0;i<=400;i++){const x=view*i/400;pts.push({x:X(x),y:ym-model.field(x,s)*amp});env.push({x:X(x),y:ym-Math.abs(Math.sin(2*Math.PI*x/l))*amp});}
    if(g.begun)line(env,'#9fb6c7',1,[3,4]);line(pts,'#77b9ff',3);
    const cy=ym+amp+30;box(x0,cy,x1-x0,14,'#6b4a33');
    if(g.begun)for(const x of model.hotspots(view))dot(X(x),cy+7,3+5*Math.min(1,s/2),'#f2c49b');
  }else{
    // The mast (or a quarter-wave antenna) and the wave leaving it, slowed down.
    if(c.ask==='antennaLength'){const h=l/4*kp;line([{x:x0-20,y:ym+amp+18},{x:x0-20,y:ym+amp+18-h}],'#f2f8fc',4);fit('λ ÷ 4',x0-20,ym+amp+32,'#d1e3ed',9,60,'center');
      if(g.guess){const gh=Math.min(model.answer*kp,ym+amp-40);line([{x:x0-34,y:ym+amp+18},{x:x0-34,y:ym+amp+18-gh}],'#efb958',3);}}
    else{line([{x:x0-20,y:ym+amp+18},{x:x0-20,y:ym-amp}],'#f2f8fc',4);dot(x0-20,ym-amp,4,'#f2f8fc');}
    const pts=[];for(let i=0;i<=500;i++){const x=view*i/500;pts.push({x:X(x),y:ym-model.field(x,s)*amp});}line(pts,'#77b9ff',3);
  }
  // One wavelength bracketed between two crests once it exists.
  if(g.begun&&(model.oven()||s>=1.25)){const start=model.oven()?l/4:(s-1.25)*l,yb=top;line([{x:X(start),y:yb},{x:X(start+l),y:yb}],'#f2f8fc',1.5);line([{x:X(start),y:yb-4},{x:X(start),y:yb+4}],'#f2f8fc',1.5);line([{x:X(start+l),y:yb-4},{x:X(start+l),y:yb+4}],'#f2f8fc',1.5);
    fit('λ = '+number(l*k,l*k<10?2:l*k<100?1:0)+' '+unit,X(start+l/2),yb-6,'#f2f8fc',10,kp*l+40,'center');}
  if(g.option){const ry=ym+amp+(model.oven()?56:44),step=[.01,.02,.05,.1,.2,.5,1,2,5,10,20,50,100,200,500,1000].find(v=>view*k/v<=8)||1000;line([{x:X(0),y:ry},{x:X(view),y:ry}],'#8aa3b5',1);
    for(let m=0;m<=view*k+1e-9;m+=step){const x=X(m/k);line([{x,y:ry},{x,y:ry+6}],'#9fb6c7',1);label(plain(m)+' '+unit,x,ry+18,'#9fb6c7','center',9);}}
  if(g.guess&&c.ask!=='antennaLength'){const step=model.answer/k,start=model.oven()?l/4:0;if(step*kp>=6)for(let x=start;x<=view+1e-9;x+=step)line([{x:X(x),y:top-30},{x:X(x),y:top-22}],'#efb958',2);fit(text('guessTag'),X(start),top-34,'#efb958',9,g.area*.4);}
  fit(text('slowTag',{n:sci(c.f)}),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('spectrumGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  // A ladder of lengths in powers of ten, from 1 mm to 10 km, with familiar waves marked.
  const px=g.area+70,py0=74,py1=height-46,lo=-3,hi=4,PY=m=>py1-(Math.log10(m)-lo)/(hi-lo)*(py1-py0);
  line([{x:px,y:py0},{x:px,y:py1}],'#8aa3b5',1);
  ['1 mm','1 cm','10 cm','1 m','10 m','100 m','1 km','10 km'].forEach((t,i)=>{const y=PY(10**(lo+i));line([{x:px-4,y},{x:px+4,y}],'#8aa3b5',1);label(t,px-8,y+3,'#9fb6c7','right',9);});
  for(const [key,m] of [['amTag',300],['fmTag',3],['microwaveTag',.123]]){const y=PY(m);line([{x:px+6,y},{x:px+16,y}],'#9fb6c7',1);fit(text(key),px+20,y+3,'#9fb6c7',9,width-px-28);}
  const shown=model.exact()/model.scale();
  if(g.done||g.begun)dot(px,PY(shown),5,'#77b9ff');
  if(g.guess){const a=model.answer/model.scale();if(a>=1e-3&&a<=1e4)dot(px,PY(a),4,'#efb958');}
}
`
};
