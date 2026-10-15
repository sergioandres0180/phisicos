module.exports = {
kind:'slinky',model:'SlinkyModel',title:'Slinky Lab',symbol:'θ =',unit:'°',equation:'v = f·λ',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','slinkyLegend'],['white','coilLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['frequency-value','frequencyMetric','Hz','f'],['speed-value','speedMetric','m/s','v','vector'],['wavelength-value','wavelengthMetric','m','λ','vector'],['coil-value','coilMetric','cm','u','vector']],
modelCode:String.raw`
class SlinkyModel {
  // A slinky lies stretched on a floor. Shaking its end side to side sends a transverse wave: each coil moves across the
  // slinky. Pushing and pulling the end sends a longitudinal wave: each coil moves back and forth along it, and the coils
  // bunch into compressions one wavelength apart. Either way the wave runs at v = f·λ from the hand; behind the front each
  // coil follows u = A·sin(2π·f·(t − x ÷ v)). A run ends as the front reaches the far end; it plays at half speed.
  static tolerance = .02;
  static missions = [
    {key:'across',ask:'angle',mode:'trans',f:2,v:3,L:6,pace:.5},
    {key:'along',ask:'angle',mode:'long',f:2,v:3,L:6,pace:.5},
    {key:'spacing',ask:'spacing',mode:'long',f:2,v:3,L:6,pace:.5},
    {key:'speed',ask:'speed',mode:'long',f:2.5,v:2,L:4,pace:.5},
    {key:'twoStep',ask:'spacing',mode:'long',f:1.5,v:3,L:6,pace:.5}
  ];
  static units = {angle:'°',spacing:'m',speed:'m/s'};
  static limits = {angle:360,spacing:1e4,speed:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SlinkyModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // An angle may be 0; every other answer is positive.
  valid(value){const a=this.config.ask;return Number.isFinite(value)&&(a==='angle'?value>=0:value>0)&&value<=SlinkyModel.limits[a];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  wavelength(){return this.config.v/this.config.f;}
  // Coils move 30 cm across, or along by 8% of a wavelength, which squeezes the coils to about half their spacing.
  amplitude(){return this.config.mode==='trans'?.3:.08*this.wavelength();}
  painted(){return this.config.L/3;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // The displacement (m) of the coil that rests at x (m), at time t (s): across for a transverse wave, along for a longitudinal one.
  shift(x,t){const c=this.config,s=this.clamp(t)-x/c.v;return s>0?this.amplitude()*Math.sin(2*Math.PI*c.f*s):0;}
  front(t){return this.config.v*this.clamp(t);}
  duration(){return this.config.L/this.config.v;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly as the front reaches the far end.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.key==='across')return 90;if(c.key==='along')return 0;if(c.ask==='speed')return c.v;return this.wavelength();}
  unit(){return SlinkyModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=SlinkyModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12,zero=a<=.5;
    // Every answer is right within 2%. Along the slinky is 0°, and 180° (pointing back) counts too; 0 gets a window of its own.
    const ok=c.key==='along'?zero||near(a,180):near(a,e);let slip=null;
    if(!ok){
      if(c.key==='across'){if(zero||near(a,180))slip='alongInstead';}
      else if(c.key==='along'){if(near(a,90))slip='acrossInstead';}
      else if(c.key==='spacing'){if(near(a,c.v*c.f))slip='multiplied';else if(near(a,c.f/c.v))slip='inverted';}
      else if(c.key==='speed'){const l=this.wavelength();if(near(a,l/c.f))slip='divided';else if(near(a,c.f/l))slip='invertedSpeed';}
      else{if(near(a,c.v))slip='speedInstead';else if(near(a,c.v*c.f))slip='multipliedTwo';else if(near(a,c.L/c.f))slip='noTime';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SlinkyModel.missions[saved.index])return false;
    const probe=new SlinkyModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={angle:'θ =',spacing:'λ =',speed:'v ='};
// Givens: ↕ for a sideways shake, ↔ for a push and pull, then the numbers.
function given(m){
  const way=m.mode==='trans'?'↕':'↔';
  if(m.key==='speed')return way+' · f = '+plain(m.f)+' Hz · λ = '+plain(m.v/m.f)+' m';
  if(m.key==='twoStep')return way+' · f = '+plain(m.f)+' Hz · '+plain(m.L)+' m · '+plain(m.L/m.v)+' s';
  if(m.key==='spacing')return way+' · f = '+plain(m.f)+' Hz · v = '+plain(m.v)+' m/s';
  return way+' · f = '+plain(m.f)+' Hz';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.key==='across')return 'θ = 90°';
  if(c.key==='along')return 'θ = 0°';
  if(c.key==='speed')return 'v = f·λ = '+plain(c.f)+' × '+plain(model.wavelength())+' = '+number(e)+' m/s';
  if(c.key==='twoStep')return 'λ = (d ÷ t) ÷ f = '+plain(c.v)+' ÷ '+plain(c.f)+' = '+number(e)+' m';
  return 'λ = v ÷ f = '+plain(c.v)+' ÷ '+plain(c.f)+' = '+number(e)+' m';
}
function baseEquation(){return model.config.ask==='angle'?'θ = ?':model.config.ask==='speed'?'v = f·λ':'λ = v ÷ f';}
function metrics(t,begun){
  const c=model.config;
  $('frequency-value').textContent=begun?number(c.f,1):'—';$('speed-value').textContent=begun?number(c.v,1):'—';
  $('wavelength-value').textContent=begun?number(model.wavelength()):'—';$('coil-value').textContent=begun?number(model.shift(model.painted(),t)*100,0):'—';
}
function values(){const c=model.config;return {l:plain(model.wavelength()),v:plain(c.v)};}
function runningCopy(t){return text(model.config.mode==='trans'?'acrossCopy':'alongCopy',{c:number(Math.abs(model.shift(model.painted(),t))*100,0)});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=56,x1=g.area-24,kp=(x1-x0)/c.L,X=x=>x0+x*kp,y0=height*.5,ky=Math.min(110,height*.26)/.3,trans=c.mode==='trans';
  const at=x=>{const u=g.begun?model.shift(x,s):0;return trans?{x:X(x),y:y0-u*ky}:{x:X(x+u),y:y0};};
  // The slinky from above: one stroke per coil, 10 cm apart at rest. The hand moves the first coil.
  const h0=at(0);box(h0.x-34,h0.y-14,28,28,'#c9b79c');
  const spine=[];for(let i=0;i<=c.L*10+1e-9;i++)spine.push(at(i/10));line(spine,'#3d6f99',1);
  for(const p of spine)line([{x:p.x,y:p.y-16},{x:p.x,y:p.y+16}],'#77b9ff',1.6);
  const pc=at(model.painted());line([{x:pc.x,y:pc.y-20},{x:pc.x,y:pc.y+20}],'#f2f8fc',4);
  if(g.option){const ry=height-58,step=c.L>5?1:.5;line([{x:X(0),y:ry},{x:X(c.L),y:ry}],'#8aa3b5',1);for(let m=0;m<=c.L+1e-9;m+=step){line([{x:X(m),y:ry},{x:X(m),y:ry+6}],'#9fb6c7',1);label(plain(m)+' m',X(m),ry+18,'#9fb6c7','center',9);}}
  // Your spacing: orange marks a guessed wavelength apart, back from the front; your speed: an orange dot.
  if(g.guess&&g.begun){const top=y0-(trans?ky*.3:0)-34;
    if(c.ask==='spacing'){const lg=model.answer,f=model.front(s);if(lg*kp>=6)for(let x=f;x>=-1e-9;x-=lg)line([{x:X(x),y:top},{x:X(x),y:top+10}],'#efb958',2.5);fit(text('guessTag'),X(f)-4,top-6,'#efb958',9,g.area*.4,'right');}
    if(c.ask==='speed'){const xg=model.answer*model.clamp(s);if(xg<=c.L)dot(X(xg),top+5,5,'#efb958');}}
  if(g.begun){const f=model.front(s);line([{x:X(f),y:y0+44},{x:X(f),y:y0+56}],'#9fb6c7',1.5);}
  fit(text('slowTag',{n:plain(1/c.pace)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text('pathGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The painted coil's path seen from above: along the slinky is across the page, the way the wave runs.
  const cx=(g.area+width)/2,cy=(80+height-80)/2,R=Math.min(width-g.area-40,height-200)/2,k=R/(model.amplitude()*1.15),trans=c.mode==='trans',upto=Math.min(g.t,model.duration());
  line([{x:cx-R,y:cy},{x:cx+R,y:cy}],'#8aa3b5',1);line([{x:cx,y:cy-R},{x:cx,y:cy+R}],'#8aa3b5',1,[3,4]);
  line([{x:cx+R-12,y:cy-5},{x:cx+R,y:cy},{x:cx+R-12,y:cy+5}],'#8aa3b5',1);
  if(g.guess&&c.ask==='angle'){const a=model.answer*Math.PI/180;line([{x:cx-R*Math.cos(a),y:cy+R*Math.sin(a)},{x:cx+R*Math.cos(a),y:cy-R*Math.sin(a)}],'#efb958',1.5,[5,4]);}
  const pts=[];for(let i=0;i<=200;i++){const u=model.shift(model.painted(),upto*i/200)*k;pts.push(trans?{x:cx,y:cy-u}:{x:cx+u,y:cy});}
  line(pts,'#f2f8fc',3);const u=model.shift(model.painted(),upto)*k;dot(trans?cx:cx+u,trans?cy-u:cy,5,'#f2f8fc');
  fit(text('alongAxis'),cx-R,cy+R+16,'#9fb6c7',9,2*R);
}
`
};
