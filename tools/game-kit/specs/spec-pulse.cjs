module.exports = {
kind:'pulse',model:'PulseModel',title:'Rope Pulse',symbol:'v =',unit:'m/s',equation:'v = d ÷ t',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','ropeLegend'],['red','ribbonLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['front-value','frontMetric','m','x = v·t','vector'],['ribbon-value','ribbonMetric','cm','y'],['along-value','alongMetric','m','x_ribbon','vector'],['speed-value','speedMetric','m/s','v']],
modelCode:String.raw`
class PulseModel {
  // A pulse is a shape that travels along a rope: y(x, t) = b(x − v·t). The rope itself only moves up and down, so a ribbon
  // tied to it stays where it is tied. Pulses add where they overlap (y = y₁ + y₂) and pass through each other unchanged.
  // At a fixed end the pulse comes back upside down: the rope's shape is the pulse minus its mirror image beyond the end.
  static tolerance = .02;
  static half = .6; // m, half-width of a bump
  static missions = [
    {key:'speed',ask:'speed',L:8,v:4,A:.15,ribbon:4},
    {key:'ribbon',ask:'along',L:8,v:4,A:.15,ribbon:4,zero:true},
    {key:'amplitude',ask:'amplitude',L:8,v:4,A:.15,ribbon:4,cycle:true},
    {key:'meet',ask:'overlap',L:8,v:4,A:.1,A2:.06},
    {key:'echo',ask:'echo',L:6,v:4,A:.12,fixed:true}
  ];
  static units = {speed:'m/s',along:'cm',amplitude:'cm',overlap:'cm',echo:'s'};
  static limits = {speed:1e4,along:1e5,amplitude:1e5,overlap:1e5,echo:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=PulseModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // The ribbon test accepts 0: the ribbon doesn't move along the rope at all.
  valid(value){const c=this.config;return Number.isFinite(value)&&(c.zero?value>=0:value>0)&&value<=PulseModel.limits[c.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // One bump (a raised cosine), or one full wave for the amplitude test: its crest arrives first, then its trough.
  bump(s,A=this.config.A){const w=PulseModel.half,c=this.config;if(c.cycle){const l=2*w;return s>-l&&s<l?A*Math.sin(Math.PI*s/l):0;}return Math.abs(s)<w?A*(1+Math.cos(Math.PI*s/w))/2:0;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The rope's height (m) at x: the pulse from the left end, a second from the right end, or the inverted reflection.
  height(x,t){
    const c=this.config,s=this.clamp(t),d=c.v*s;
    if(c.A2)return this.bump(x-d)+this.bump(x-(c.L-d),c.A2);
    if(c.fixed)return this.bump(x-d)-this.bump(2*c.L-x-d);
    return this.bump(x-d);
  }
  // Where the leading pulse's middle is (m): out and back for the echo.
  front(t){const c=this.config,d=c.v*this.clamp(t);return c.fixed&&d>c.L?2*c.L-d:d;}
  ribbonHeight(t){return this.config.ribbon===undefined?0:this.height(this.config.ribbon,t);}
  duration(){const c=this.config;return c.fixed?2*c.L/c.v:c.L/c.v;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends when the pulse reaches the far end, or is back for the echo.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='speed')return c.v;if(c.ask==='along')return 0;if(c.ask==='amplitude')return c.A*100;if(c.ask==='overlap')return (c.A+c.A2)*100;return 2*c.L/c.v;}
  unit(){return PulseModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=PulseModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%; for the ribbon, within half a centimetre of 0.
    const ok=e===0?a<=.5:near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='speed'){if(near(a,c.L*c.L/c.v))slip='multiplied';else if(near(a,1/c.v))slip='inverted';}
      else if(c.ask==='along'){if(near(a,c.L*100))slip='pulseDistance';else if(near(a,c.A*100))slip='upDown';else if(near(a,2*c.A*100))slip='upAndDown';}
      else if(c.ask==='amplitude'){if(near(a,2*e))slip='crestToTrough';else if(near(a,e/100))slip='unitsM';}
      else if(c.ask==='overlap'){if(near(a,(c.A-c.A2)*100))slip='subtracted';else if(near(a,c.A*100))slip='bigger';else if(near(a,(c.A+c.A2)*50))slip='average';}
      else{if(near(a,c.L/c.v))slip='oneWay';else if(near(a,c.L*c.v))slip='timesSpeed';else if(near(a,c.v/(2*c.L)))slip='speedOverDistance';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!PulseModel.missions[saved.index])return false;
    const probe=new PulseModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={speed:'v =',along:'Δx =',amplitude:'A =',overlap:'y =',echo:'t ='};
const cm=m=>number(m*100,1);
// Givens: the rope, the speed or the crossing time, the pulses' heights.
function given(m){
  if(m.ask==='speed')return 'L = '+plain(m.L)+' m · t = '+plain(m.L/m.v)+' s';
  if(m.ask==='along')return 'd = '+plain(m.L)+' m · '+text('ribbonTag');
  if(m.ask==='amplitude')return '+'+plain(m.A*100)+' cm · −'+plain(m.A*100)+' cm';
  if(m.A2)return plain(m.A*100)+' cm + '+plain(m.A2*100)+' cm';
  return 'L = '+plain(m.L)+' m · v = '+plain(m.v)+' m/s';
}
function equation(){
  const c=model.config;
  if(c.ask==='speed')return 'v = d ÷ t = '+plain(c.L)+' ÷ '+plain(c.L/c.v)+' = '+number(c.v)+' m/s';
  if(c.ask==='along')return 'd_pulse = v·t = '+number(c.L,1)+' m · Δx_ribbon = '+number(0,1)+' cm';
  if(c.ask==='amplitude')return 'A = (y_max − y_min) ÷ 2 = '+plain(2*c.A*100)+' ÷ 2 = '+number(c.A*100,1)+' cm';
  if(c.ask==='overlap')return 'y = y₁ + y₂ = '+plain(c.A*100)+' + '+plain(c.A2*100)+' = '+number((c.A+c.A2)*100,1)+' cm';
  return 't = 2·L ÷ v = 2 × '+plain(c.L)+' ÷ '+plain(c.v)+' = '+number(2*c.L/c.v)+' s';
}
function baseEquation(){const a=model.config.ask;return a==='speed'?'v = d ÷ t':a==='overlap'?'y = y₁ + y₂':a==='echo'?'t = d ÷ v':'y(x, t) = f(x − v·t)';}
function metrics(t,begun){
  const c=model.config;
  $('front-value').textContent=begun?number(model.front(t)):'—';$('ribbon-value').textContent=begun&&c.ribbon!==undefined?cm(model.ribbonHeight(t)):'—';
  $('along-value').textContent=begun&&c.ribbon!==undefined?number(c.ribbon):'—';$('speed-value').textContent=begun?number(c.v):'—';
}
function values(){const c=model.config;return {v:number(c.v),d:number(c.L,1),t:number(model.duration()),h:cm(c.A),A:cm(c.A),p:cm(c.A+(c.A2??0))};}
function runningCopy(t){const c=model.config;return text(c.ribbon!==undefined?'movingCopy':'travelCopy',{x:number(model.front(t)),y:cm(model.ribbonHeight(t))});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=36,x1=g.area-30,kp=(x1-x0)/c.L,X=x=>x0+x*kp,ym=height*.5,ky=Math.min(320,(height*.32)/.17),Y=y=>ym-y*ky;
  // The rope (heights exaggerated), its ends, and a ruler in metres.
  box(x0-14,ym-24,10,48,'#22384a');if(c.fixed)box(x1+4,ym-30,10,60,'#8aa3b5');
  const pts=[];for(let i=0;i<=400;i++){const x=c.L*i/400;pts.push({x:X(x),y:Y(model.height(x,s))});}line(pts,'#77b9ff',3);
  if(g.option){for(let m=0;m<=c.L;m++){const x=X(m);line([{x,y:ym+64},{x,y:ym+72}],'#9fb6c7',1);label(plain(m)+' m',x,ym+84,'#9fb6c7','center',9);}line([{x:X(0),y:ym+64},{x:X(c.L),y:ym+64}],'#8aa3b5',1);}
  // The ribbon, tied where it is: a dashed guide shows it never moves along the rope.
  if(c.ribbon!==undefined){const rx=X(c.ribbon),ry=Y(model.ribbonHeight(s));line([{x:rx,y:ym-ky*.2},{x:rx,y:ym+ky*.2}],'#9fb6c7',1,[3,4]);box(rx-3,ry-10,6,14,'#ff7b6b');fit(text('ribbonTag'),rx,ym-ky*.2-6,'#ff7b6b',10,120,'center');}
  if(g.guess){
    if(c.ask==='speed'&&s>0){const gx=Math.min(model.answer*s,c.L+1);line([{x:X(Math.min(gx,c.L)),y:ym-ky*.2},{x:X(Math.min(gx,c.L)),y:ym+12}],'#efb958',2,[5,3]);fit(text('guessTag'),X(Math.min(gx,c.L)),ym+28,'#efb958',9,100,'center');}
    if(c.ask==='along'){const gx=X(Math.min(c.ribbon+model.answer/100,c.L));line([{x:gx,y:ym-ky*.15},{x:gx,y:ym+ky*.15}],'#efb958',2,[5,3]);fit(text('guessTag'),gx+6,ym+ky*.15-2,'#efb958',9,120);}
    if(c.ask==='amplitude')for(const v of [model.answer,-model.answer]){const yy=Y(Math.max(Math.min(v/100,.3),-.3));line([{x:X(c.ribbon)-60,y:yy},{x:X(c.ribbon)+60,y:yy}],'#efb958',1.5,[5,3]);}
    if(c.ask==='overlap'){const yy=Y(Math.min(model.answer/100,.3));line([{x:X(c.L/2)-50,y:yy},{x:X(c.L/2)+50,y:yy}],'#efb958',2,[5,3]);fit(text('guessTag'),X(c.L/2)+54,yy+4,'#efb958',9,120);}
  }
  if(c.ask==='amplitude'&&g.begun)for(const v of [c.A,-c.A]){const yy=Y(v);line([{x:X(c.ribbon)+70,y:yy},{x:X(c.ribbon)+90,y:yy}],'#9fb6c7',1);}
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit}=g,heightGraph=c.ribbon!==undefined&&c.ask!=='speed'||c.A2;
  fit(text(heightGraph?(c.A2?'middleGraph':'ribbonGraph'):'frontGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const D=model.duration(),px0=g.area+14,px1=width-14,py0=70,py1=height-62,PX=q=>px0+q/D*(px1-px0),upto=Math.min(g.t,D);
  line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  const pts=[];
  if(heightGraph){
    const span=Math.max(c.A+(c.A2??0),g.guess?Math.min(model.answer/100,.3):0)*1.2||.1,ym=(py0+py1)/2,PY=v=>ym-v/span*(py1-py0)/2,xAt=c.A2?c.L/2:c.ribbon;
    line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);for(let i=0;i<=200;i++){const q=upto*i/200;pts.push({x:PX(q),y:PY(model.height(xAt,q))});}line(pts,'#77b9ff',2);
    if(g.guess&&(c.ask==='amplitude'||c.ask==='overlap'))for(const v of c.ask==='amplitude'?[model.answer,-model.answer]:[model.answer]){const yy=PY(Math.max(Math.min(v/100,span),-span));line([{x:px0,y:yy},{x:px1,y:yy}],'#efb958',1.5,[5,3]);}
  }else{
    const span=c.L*1.1,PY=v=>py1-v/span*(py1-py0);line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);
    for(let i=0;i<=200;i++){const q=upto*i/200;pts.push({x:PX(q),y:PY(model.front(q))});}line(pts,'#77b9ff',2);
    if(g.guess&&c.ask==='speed'){line([{x:PX(0),y:PY(0)},{x:PX(D),y:PY(Math.min(model.answer*D,span))}],'#efb958',1.5,[5,3]);}
    if(g.guess&&c.ask==='echo'&&model.answer<=D*1.5){const x=PX(Math.min(model.answer,D));line([{x,y:py0},{x,y:py1}],'#efb958',1.5,[5,3]);fit(text('guessTag'),x,py0-4,'#efb958',9,px1-px0,model.answer>D/2?'right':'left');}
    fit(plain(c.L)+' m',px0-4,PY(c.L)+4,'#9fb6c7',9,40,'right');
  }
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
