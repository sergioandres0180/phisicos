module.exports = {
kind:'decibel',model:'DecibelModel',title:'Decibel Meter',symbol:'L =',unit:'dB',equation:'L = 10·log(I ÷ I₀)',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','soundLegend'],['white','meterLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['level-value','levelMetric','dB','L'],['intensity-value','intensityMetric','','I ÷ I₀'],['dist-value','distMetric','m','r'],['count-value','countMetric','','n']],
modelCode:String.raw`
class DecibelModel {
  // Sound level in decibels. L = 10·log(I ÷ I₀) with I₀ = 10⁻¹² W/m², the quietest sound we can hear. Every 10 dB is ten
  // times the intensity, so levels add when intensities multiply. Far from a small source the intensity falls as 1 ÷ r², so
  // twice as far is a quarter of the intensity: 20·log 2 ≈ 6 dB quieter. A run changes one thing over 3.5 s (speakers
  // switched on, the meter carried away, the power turned up) and holds the last reading for 0.5 s.
  static tolerance = .02;
  static missions = [
    {key:'tenfold',ask:'level',L1:60,n:10,pace:1},
    {key:'distance',ask:'level',L1:80,r1:2,r2:4,pace:1},
    {key:'ratio',ask:'ratio',L1:60,L2:90,pace:1},
    {key:'intensity',ask:'level',I:1e-5,pace:1},
    {key:'farther',ask:'distance',L1:110,r1:10,L2:90,pace:1}
  ];
  static units = {level:'dB',ratio:'',distance:'m'};
  static limits = {level:1e4,ratio:1e12,distance:1e7};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=DecibelModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=DecibelModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  progress(t){return Math.min(1,this.clamp(t)/3.5);}
  // The far distance in the last test, where the level has dropped to L2.
  farEnd(){const c=this.config;return c.r1*10**((c.L1-c.L2)/20);}
  sources(t){const c=this.config;return c.key==='tenfold'?Math.min(c.n,1+Math.floor(this.progress(t)*(c.n-1)+1e-9)):1;}
  distance(t){const c=this.config,p=this.progress(t);if(c.key==='distance')return c.r1+(c.r2-c.r1)*p;if(c.key==='farther')return c.r1+(this.farEnd()-c.r1)*p;return 3;}
  level(t){const c=this.config,p=this.progress(t);
    if(c.key==='tenfold')return c.L1+10*Math.log10(this.sources(t));
    if(c.key==='distance'||c.key==='farther')return c.L1-20*Math.log10(this.distance(t)/c.r1);
    if(c.key==='ratio')return c.L1+(c.L2-c.L1)*p;
    return 10*Math.log10(c.I/1e-12)*p;}
  ratio(t){return 10**(this.level(t)/10);}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  duration(){return 4;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after 4 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='ratio')return 10**((c.L2-c.L1)/10);if(c.ask==='distance')return this.farEnd();return this.level(this.duration());}
  unit(){return DecibelModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=DecibelModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='tenfold'){if(near(a,c.L1*c.n))slip='multipliedLevel';else if(near(a,c.L1+3))slip='threeDb';}
      else if(c.key==='distance'){if(near(a,c.L1/2))slip='halvedLevel';else if(near(a,c.L1-10*Math.log10(c.r2/c.r1)))slip='firstPower';else if(near(a,c.L1-10))slip='tenDb';}
      else if(c.key==='ratio'){if(near(a,c.L2-c.L1))slip='difference';else if(near(a,(c.L2-c.L1)/10))slip='belsOnly';else if(near(a,c.L2/c.L1))slip='levelRatio';}
      else if(c.key==='intensity'){if(near(a,e/10))slip='bels';else if(near(a,10*Math.log(c.I/1e-12)))slip='naturalLog';else if(near(a,-10*Math.log10(c.I)))slip='noThreshold';}
      else{if(near(a,2*c.r1))slip='doubledDistance';else if(near(a,c.r1*10**((c.L1-c.L2)/10)))slip='intensityRatioDistance';else if(near(a,c.r1+c.L1-c.L2))slip='addedLevels';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!DecibelModel.missions[saved.index])return false;
    const probe=new DecibelModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={level:'L =',ratio:'I₂ ÷ I₁ =',distance:'r ='};
// Powers of ten written with superscripts, as on a calculator display.
function sup(n){return String(n).replace(/-/g,'⁻').replace(/[0-9]/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);}
function sci(x){const n=Math.floor(Math.log10(x)+1e-9),m=x/10**n;return number(m,1)+' × 10'+sup(n);}
// Givens: the level and how the intensity, the distance, or the level changes.
function given(m){
  if(m.key==='tenfold')return plain(m.L1)+' dB · I × '+plain(m.n);
  if(m.key==='distance')return plain(m.L1)+' dB · '+plain(m.r1)+' m → '+plain(m.r2)+' m';
  if(m.key==='ratio')return plain(m.L1)+' dB → '+plain(m.L2)+' dB';
  if(m.key==='intensity')return 'I = 10⁻⁵ W/m² · I₀ = 10⁻¹² W/m²';
  return plain(m.L1)+' dB · '+plain(m.r1)+' m → '+plain(m.L2)+' dB';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.key==='tenfold')return 'L = '+plain(c.L1)+' + 10·log '+plain(c.n)+' = '+number(e,0)+' dB';
  if(c.key==='distance')return 'L = '+plain(c.L1)+' − 20·log('+plain(c.r2)+' ÷ '+plain(c.r1)+') = '+number(e,1)+' dB';
  if(c.key==='ratio')return 'I₂ ÷ I₁ = 10^('+plain(c.L2-c.L1)+' ÷ 10) = '+number(e,0);
  if(c.key==='intensity')return 'L = 10·log(10⁻⁵ ÷ 10⁻¹²) = '+number(e,0)+' dB';
  return 'r = '+plain(c.r1)+' × 10^('+plain(c.L1-c.L2)+' ÷ 20) = '+number(e,0)+' m';
}
function baseEquation(){const k=model.config.key;return k==='distance'||k==='farther'?'I ∝ 1 ÷ r²':'L = 10·log(I ÷ I₀)';}
// The asked quantity stays hidden until the run is over.
function hidden(){return model.config.ask!=='ratio'&&model.status!=='done';}
function metrics(t,begun){
  const a=model.config.ask,show=(id,v,hide)=>{$(id).textContent=!begun?'—':hide&&hidden()?'?':v;};
  show('level-value',number(model.level(t),1),a==='level');show('intensity-value',sci(model.ratio(t)),a==='level');
  show('dist-value',number(model.distance(t),1),a==='distance');show('count-value',plain(model.sources(t)));
}
function values(){const a=model.config.ask;return {e:number(model.exact(),a==='level'?1:0)};}
function runningCopy(t){return text('decibelCopy',{n:plain(model.sources(t)),r:number(model.distance(t),1)});}
// The level your answer implies at the end of the run, or for the distance test the time the meter passes your distance.
function guessLevel(){const c=model.config,a=model.answer;if(c.ask==='level')return a;if(c.ask==='ratio')return c.L1+10*Math.log10(a);return null;}
function guessTime(){const c=model.config,a=model.answer;if(c.ask!=='distance')return null;const f=(a-c.r1)/(model.farEnd()-c.r1);return f>=0&&f<=1?3.5*f:null;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,L=g.begun?model.level(s):(c.L1??0),x0=24,x1=g.area-24,mid=58+(height-150)*.42;
  box(16,56,g.area-32,height-126,'#1d2a36');
  // Sources on the left (one box per speaker switched on) sending out rings that brighten with the level.
  const n=g.begun?model.sources(s):1,sx=x0+24;for(let i=0;i<Math.max(n,1);i++){const col=i%5,row=Math.floor(i/5);box(sx-12+col*0-row*16,mid-50+col*22,14,18,'#d9cfb8');}
  if(g.begun){ctx.save();ctx.beginPath();ctx.rect(16,56,g.area-32,height-126);ctx.clip();const a=Math.min(1,Math.max(.15,(L-20)/100));for(let k=0;k<6;k++){const r=((s*60+k*36)%216)+10,pts=[];for(let i=0;i<=40;i++){const q=-Math.PI/2.4+i/40*Math.PI/1.2;pts.push({x:sx+8+r*Math.cos(q),y:mid+r*Math.sin(q)});}line(pts,'rgba(119,185,255,'+a.toFixed(2)+')',1.5);}ctx.restore();}
  label(text('sourceTag'),sx-12,mid-60,'#d1e3ed','left',9);
  // The listener's meter on a distance scale.
  const dmax=c.key==='farther'?120:c.key==='distance'?5:4,rx0=sx+20,rx1=x1-170,RX=r=>rx0+r/dmax*(rx1-rx0),ry=mid+70,rr=g.begun?model.distance(s):model.distance(0);
  line([{x:rx0,y:ry},{x:rx1,y:ry}],'#8aa3b5',1);
  if(g.option){const st=dmax>20?20:1,every=RX(st)-RX(0)<34?2:1;for(let r=0,i=0;r<=dmax+1e-9;r+=st,i++){line([{x:RX(r),y:ry},{x:RX(r),y:ry+5}],'#9fb6c7',1);if(i%every===0)label(plain(r)+' m',RX(r),ry+17,'#9fb6c7','center',8);}}
  box(RX(rr)-8,mid-10,16,24,'#f2f8fc');label(text('meterTag'),RX(rr),mid-16,'#f2f8fc','center',9);line([{x:RX(rr),y:mid+14},{x:RX(rr),y:ry}],'#f2f8fc',1,[2,3]);
  if(g.guess&&c.ask==='distance'&&model.answer<=dmax)line([{x:RX(model.answer),y:ry-14},{x:RX(model.answer),y:ry+14}],'#efb958',3);
  // The meter's dial: 0 to 120 dB; the asked reading's number stays hidden until the run ends.
  const cx=x1-80,cy=mid+20,R=62,ang=l=>Math.PI*(1-Math.min(120,Math.max(0,l))/120);
  const arc=[];for(let i=0;i<=48;i++){const q=Math.PI*i/48;arc.push({x:cx+R*Math.cos(q),y:cy-R*Math.sin(q)});}line(arc,'#8aa3b5',2);
  for(let l=0;l<=120;l+=20){const q=ang(l);line([{x:cx+(R-6)*Math.cos(q),y:cy-(R-6)*Math.sin(q)},{x:cx+R*Math.cos(q),y:cy-R*Math.sin(q)}],'#9fb6c7',1);label(plain(l),cx+(R+12)*Math.cos(q),cy-(R+12)*Math.sin(q)+3,'#9fb6c7','center',8);}
  if(g.guess){const gl=guessLevel();if(gl!==null){const q=ang(gl);line([{x:cx,y:cy},{x:cx+(R-4)*Math.cos(q),y:cy-(R-4)*Math.sin(q)}],'#efb958',2,[4,3]);}}
  if(g.begun){const q=ang(L);line([{x:cx,y:cy},{x:cx+(R-4)*Math.cos(q),y:cy-(R-4)*Math.sin(q)}],'#f2f8fc',2.5);}dot(cx,cy,4,'#f2f8fc');
  label(!g.begun?'— dB':c.ask==='level'&&hidden()?'? dB':number(L,1)+' dB',cx,cy+20,'#f2f8fc','center',13);
  fit(text('dialTag'),cx-R,cy+40,'#9fb6c7',9,2*R);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,dot,label}=g;
  fit(text('levelGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The level over the run: steps as speakers switch on, a fall as the meter moves away, a rise as the power goes up.
  const gl=g.guess?guessLevel():null,ls=[model.level(0),model.level(4)].concat(gl===null?[]:[gl]),lo=Math.floor((Math.min(...ls)-8)/10)*10,hi=Math.ceil((Math.max(...ls)+8)/10)*10;
  const px0=g.area+36,px1=width-14,py0=90,py1=height-90,PX=q=>px0+q/4*(px1-px0),PY=l=>py1-(l-lo)/(hi-lo)*(py1-py0),upto=Math.min(g.t,model.duration());
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  for(let q=0;q<=4;q++){line([{x:PX(q),y:py1},{x:PX(q),y:py1+4}],'#9fb6c7',1);label(plain(q),PX(q),py1+14,'#9fb6c7','center',8);}
  for(let l=lo;l<=hi;l+=10){line([{x:px0-4,y:PY(l)},{x:px0,y:PY(l)}],'#9fb6c7',1);label(plain(l),px0-6,PY(l)+3,'#9fb6c7','right',8);}
  if(gl!==null)line([{x:px0,y:PY(gl)},{x:px1,y:PY(gl)}],'#efb958',1.5,[5,4]);
  if(g.guess){const gt=guessTime();if(gt!==null)line([{x:PX(gt),y:py0},{x:PX(gt),y:py1}],'#efb958',1.5,[5,4]);}
  const pts=[];for(let i=0;i<=400;i++){const q=upto*i/400;pts.push({x:PX(q),y:PY(model.level(q))});}line(pts,'#f2f8fc',2);dot(PX(upto),PY(model.level(upto)),4,'#f2f8fc');
  fit(text('timeAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
