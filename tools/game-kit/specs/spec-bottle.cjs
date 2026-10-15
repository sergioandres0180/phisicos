module.exports = {
kind:'bottle',model:'BottleModel',title:'Bottle Flute',symbol:'f =',unit:'Hz',equation:'f = v ÷ 4L',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','airLegend'],['white','pitchLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['pitch-value','pitchMetric','Hz','f'],['air-value','airMetric','cm','L'],['water-value','waterMetric','cm','h'],['lambda-value','lambdaMetric','cm','λ']],
modelCode:String.raw`
class BottleModel {
  // A bottle as a pipe closed at one end. Blowing across the neck sets the air column ringing with a node at the closed
  // end (the water surface or the bottom) and an antinode at the open end, so the column holds a quarter wavelength:
  // λ = 4L and f = v ÷ 4L, with v = 340 m/s. Only odd harmonics fit, so the next note up is 3f. Pouring in water shortens
  // the air column and raises the pitch. Lengths in cm; a run pours (or blows) for 4 s.
  static tolerance = .02;
  static v = 340;
  static missions = [
    {key:'pitch',ask:'pitch',depth:20,water:0,pace:1},
    {key:'water',ask:'pitch',depth:30,water:13,pace:1},
    {key:'length',ask:'length',f:340,pace:1},
    {key:'fill',ask:'water',depth:32,f:680,pace:1},
    {key:'overtone',ask:'pitch',depth:20,water:0,harmonic:3,pace:1}
  ];
  static units = {pitch:'Hz',length:'cm',water:'cm'};
  static limits = {pitch:1e6,length:1e5,water:1e5};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BottleModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=BottleModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  harmonic(){return this.config.harmonic??1;}
  // The bottle's depth, the water in it at the end, and the water and air column at time t (water pours in over 3.5 s).
  depth(){const c=this.config;return c.depth??BottleModel.v*100/(4*c.f);}
  finalWater(){const c=this.config;if(c.key==='fill')return c.depth-BottleModel.v*100/(4*c.f);return c.water??0;}
  water(t){const c=this.config,w=this.finalWater();return c.key==='water'||c.key==='fill'?w*Math.min(1,this.clamp(t)/3.5):w;}
  air(t){return this.depth()-this.water(t);}
  pitch(t){return this.harmonic()*BottleModel.v*100/(4*this.air(t));}
  wavelength(t){return 4*this.air(t)/this.harmonic();}
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
  exact(){const a=this.config.ask;if(a==='length')return this.depth();if(a==='water')return this.finalWater();return this.pitch(this.duration());}
  unit(){return BottleModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),v=BottleModel.v,L=this.air(this.duration()),tol=BottleModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='pitch'){if(near(a,v*100/(2*L)))slip='openPipe';else if(near(a,v/(4*L)))slip='centimetres';else if(near(a,v*100/L))slip='noFour';}
      else if(c.key==='water'){if(near(a,v*100/(4*c.depth)))slip='wholeBottle';else if(near(a,v*100/(4*c.water)))slip='waterColumn';else if(near(a,v*100/(2*L)))slip='openPipe';}
      else if(c.key==='length'){if(near(a,v*100/(2*c.f)))slip='openLength';else if(near(a,v*100/c.f))slip='fullWave';else if(near(a,v/(4*c.f)))slip='metresLength';}
      else if(c.key==='fill'){if(near(a,L))slip='airInstead';else if(near(a,c.depth-v*100/(2*c.f)))slip='openFill';else if(near(a,c.depth+L))slip='addedLengths';}
      else{if(near(a,2*v*100/(4*L)))slip='evenHarmonic';else if(near(a,v*100/(4*L)))slip='fundamental';else if(near(a,v*100/(4*L)/3))slip='dividedHarmonic';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BottleModel.missions[saved.index])return false;
    const probe=new BottleModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={pitch:'f =',length:'L =',water:'h ='};
// Givens: the bottle's depth and water, the note wanted, or the bottle and the note wanted; v = 340 m/s throughout.
function given(m){
  if(m.key==='water')return 'D = '+plain(m.depth)+' cm · h = '+plain(m.water)+' cm';
  if(m.key==='length')return 'f = '+plain(m.f)+' Hz · v = 340 m/s';
  if(m.key==='fill')return 'D = '+plain(m.depth)+' cm · f = '+plain(m.f)+' Hz';
  if(m.key==='overtone')return 'L = '+plain(m.depth)+' cm · n = 3';
  return 'L = '+plain(m.depth)+' cm · v = 340 m/s';
}
function equation(){
  const c=model.config,e=model.exact(),L=model.air(model.duration());
  if(c.key==='water')return 'f = 340 ÷ (4 × '+plain(L/100)+') = '+number(e,0)+' Hz';
  if(c.key==='length')return 'L = 340 ÷ (4 × '+plain(c.f)+') = '+number(e/100,2)+' m';
  if(c.key==='fill')return 'h = D − v ÷ 4f = '+plain(c.depth)+' − '+plain(L)+' = '+number(e,1)+' cm';
  if(c.key==='overtone')return 'f₃ = 3 × 340 ÷ (4 × '+plain(L/100)+') = '+number(e,0)+' Hz';
  return 'f = 340 ÷ (4 × '+plain(L/100)+') = '+number(e,0)+' Hz';
}
function baseEquation(){return model.config.key==='overtone'?'f_n = n·v ÷ 4L, n = 1, 3, 5…':'f = v ÷ 4L';}
// The asked quantity stays hidden until the run is over.
function metrics(t,begun){
  const a=model.config.ask,over=model.status==='done',show=(id,v,hide)=>{$(id).textContent=!begun?'—':hide&&!over?'?':v;};
  show('pitch-value',number(model.pitch(t),0),a==='pitch');show('air-value',number(model.air(t),1),a==='length');
  show('water-value',number(model.water(t),1),a==='water');show('lambda-value',number(model.wavelength(t),1),a==='length');
}
function values(){const a=model.config.ask;return {e:number(model.exact(),a==='pitch'?0:1)};}
function runningCopy(t){return text('bottleCopy',{f:model.config.ask==='pitch'&&model.status!=='done'?'?':number(model.pitch(t),0)});}
// The air column (cm) your answer implies: from a pitch, a length, or a water depth.
function guessAir(){const c=model.config,a=model.answer;if(c.ask==='length')return a;if(c.ask==='water')return model.depth()-a;return model.harmonic()*BottleModel.v*100/(4*a);}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,D=model.depth(),hideLen=c.ask==='length'&&!g.begun,k=(height-170)/36,bx=g.area*.36,bw=56,top=86,Y=d=>top+d*k,bottom=Y(D);
  // The bottle seen from the side: glass, water at the bottom, and the air column ringing above it with a quarter wave
  // (a node at the water, the widest swing at the open neck), drawn slowed down.
  box(16,56,g.area-32,height-126,'#1d2a36');
  if(!hideLen){const w=model.water(g.begun?s:0),L=D-w,ws=Y(D-w);
    box(bx,ws,bw,bottom-ws,'#2f6f9b');line([{x:bx,y:ws},{x:bx+bw,y:ws}],'#8fd0ff',1.5);
    if(g.begun){const n=model.harmonic(),sw=Math.cos(2*Math.PI*s),L2=[],R2=[];for(let i=0;i<=60;i++){const u=i/60,env=Math.sin(n*Math.PI/2*u),y=ws-(ws-top)*u;L2.push({x:bx+bw/2-env*sw*(bw/2-4),y});R2.push({x:bx+bw/2+env*sw*(bw/2-4),y});}line(L2,'#77b9ff',2);line(R2,'#77b9ff',2);}
    line([{x:bx-4,y:top-18},{x:bx-4,y:bottom},{x:bx+bw+4,y:bottom},{x:bx+bw+4,y:top-18}],'#d1e3ed',3);}
  else{line([{x:bx-4,y:top-18},{x:bx-4,y:top+40},{x:bx+bw+4,y:top+40},{x:bx+bw+4,y:top-18}],'#d1e3ed',3,[6,5]);label('?',bx+bw/2,top+70,'#efb958','center',16);}
  label(text('neckTag'),bx+bw+12,top-10,'#d1e3ed','left',9);if(!hideLen&&model.water(g.begun?s:0)>0)label(text('waterTag'),bx+bw+12,bottom-6,'#8fd0ff','left',9);
  if(g.option&&!hideLen){for(let d=0;d<=D+1e-9;d+=5){line([{x:bx-20,y:Y(d)},{x:bx-10,y:Y(d)}],'#9fb6c7',1);label(plain(d),bx-24,Y(d)+3,'#9fb6c7','right',8);}label('cm',bx-24,top-12,'#9fb6c7','right',8);}
  // Your answer: the air column it implies, as an orange water line.
  if(g.guess){const ga=guessAir();if(ga>0&&ga<=Math.max(D,ga)&&top+ga*k<height-80){const gy=top+ga*k;line([{x:bx-10,y:gy},{x:bx+bw+10,y:gy}],'#efb958',2.5,[6,4]);fit(text('guessTag'),bx+bw+14,gy+4,'#efb958',9,120);}}
  // Blowing across the neck.
  if(g.begun){for(let i=0;i<3;i++)line([{x:bx-50+i*6,y:top-26-i*5},{x:bx+bw/2,y:top-22}],'rgba(242,248,252,.5)',1);}
  fit(text('slowTag'),16,height-24,'#9fb6c7',10,g.area*.6);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,dot,label}=g;
  fit(text('pitchGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Pitch against the air column's length: the shorter the column, the higher the note.
  const n=model.harmonic(),f=L=>n*BottleModel.v*100/(4*L),Lmin=8,Lmax=36,fmax=f(Lmin),px0=g.area+40,px1=width-14,py0=90,py1=height-90,PX=L=>px0+(L-Lmin)/(Lmax-Lmin)*(px1-px0),PY=q=>py1-q/fmax*(py1-py0);
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  for(let L=10;L<=Lmax;L+=5){line([{x:PX(L),y:py1},{x:PX(L),y:py1+4}],'#9fb6c7',1);label(plain(L),PX(L),py1+14,'#9fb6c7','center',8);}
  const step=fmax>2000?1000:fmax>800?250:100;for(let q=0;q<=fmax;q+=step){line([{x:px0-4,y:PY(q)},{x:px0,y:PY(q)}],'#9fb6c7',1);label(plain(q),px0-6,PY(q)+3,'#9fb6c7','right',8);}
  const pts=[];for(let i=0;i<=200;i++){const L=Lmin+(Lmax-Lmin)*i/200;pts.push({x:PX(L),y:PY(f(L))});}line(pts,'#4b6275',1.5);
  if(g.guess){const ga=guessAir();if(ga>=Lmin&&ga<=Lmax)line([{x:PX(ga),y:py0},{x:PX(ga),y:py1}],'#efb958',1.5,[5,4]);}
  const t=Math.min(g.t,model.duration()),hist=[];for(let i=0;i<=100;i++){const q=t*i/100,L=model.air(q);if(L>=Lmin&&L<=Lmax)hist.push({x:PX(L),y:PY(model.pitch(q))});}if(hist.length)line(hist,'#f2f8fc',2.5);
  const L=model.air(t);if(L>=Lmin&&L<=Lmax)dot(PX(L),PY(model.pitch(t)),5,'#f2f8fc');
  fit(text('airAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
