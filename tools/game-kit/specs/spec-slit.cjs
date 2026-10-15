module.exports = {
kind:'slit',model:'SlitModel',title:'Laser Slit',symbol:'y =',unit:'mm',equation:'y = λ·L ÷ a',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','lightLegend'],['white','meterLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['lambda-value','lambdaMetric','nm','λ'],['slit-value','slitMetric','mm','a'],['dist-value','distMetric','m','L'],['meter-value','meterMetric','mm','y']],
modelCode:String.raw`
class SlitModel {
  // Diffraction of light by a single slit. Laser light of wavelength λ passes a slit of width a and lands on a screen L
  // away. The screen shows a wide bright band in the middle with dark bands either side; the n-th dark band is at
  // y = n·λ·L ÷ a from the centre (small angles), so the central band is 2·λ·L ÷ a wide. The brightness is
  // (sin β ÷ β)² with β = π·a·y ÷ (λ·L). Lengths are in mm, wavelengths in nm. A run sends the light to the screen and then
  // sweeps a light meter from the centre outwards.
  static tolerance = .02;
  static missions = [
    {key:'dark',ask:'y',lambda:650,a:.1,L:2,pace:1},
    {key:'width',ask:'w',lambda:532,a:.2,L:1.5,pace:1},
    {key:'slit',ask:'a',lambda:650,L:2,y:20,pace:1},
    {key:'wavelength',ask:'lambda',a:.15,L:3,y:9,pace:1},
    {key:'second',ask:'y2',lambda:650,a:.2,L:2.4,pace:1}
  ];
  static units = {y:'mm',w:'mm',a:'mm',lambda:'nm',y2:'mm'};
  static limits = {y:1e6,w:1e6,a:1e6,lambda:1e6,y2:1e6};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=SlitModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=SlitModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The real wavelength (nm) and slit width (mm) of each test, and the first dark band's distance (mm) from the centre.
  lambda(){const c=this.config;return c.lambda??c.a*c.y/c.L*1e3;}
  slit(){const c=this.config;return c.a??c.lambda*c.L/c.y*1e-3;}
  dark(){return this.lambda()*this.config.L/this.slit()*1e-3;}
  // Brightness on the screen at y (mm), as a share of the centre.
  brightness(y){const b=Math.PI*y/this.dark();return Math.abs(b)<1e-9?1:(Math.sin(b)/b)**2;}
  // The light reaches the slit by 0.8 s and the screen by 2 s; the meter then sweeps out to three dark bands by 4 s.
  front(t){const s=this.clamp(t);return {laser:Math.min(1,s/.8),spread:Math.min(1,Math.max(0,(s-.8)/1.2))};}
  meter(t){return 3*this.dark()*Math.min(1,Math.max(0,(this.clamp(t)-2)/2));}
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
  exact(){const c=this.config;if(c.ask==='w')return 2*this.dark();if(c.ask==='a')return this.slit();if(c.ask==='lambda')return this.lambda();if(c.ask==='y2')return 2*this.dark();return this.dark();}
  unit(){return SlitModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),y=this.dark(),tol=SlitModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.key==='dark'){if(near(a,2*y))slip='widthInstead';else if(near(a,y/2))slip='halfDark';else if(near(a,y/1e3))slip='metres';}
      else if(c.key==='width'){if(near(a,y))slip='halfWidth';else if(near(a,4*y))slip='twiceWidth';else if(near(a,e/1e3))slip='metresWidth';}
      else if(c.key==='slit'){if(near(a,2*e))slip='widthReading';else if(near(a,c.y/(c.lambda*c.L*1e-3)))slip='invertedSlit';else if(near(a,e/1e3))slip='metresSlit';}
      else if(c.key==='wavelength'){if(near(a,e/2))slip='secondDark';else if(near(a,2*e))slip='doubled';else if(near(a,e/1e3))slip='micrometres';}
      else{if(near(a,y))slip='firstOnly';else if(near(a,1.5*y))slip='brightFringe';else if(near(a,4*y))slip='squared';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!SlitModel.missions[saved.index])return false;
    const probe=new SlitModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={y:'y =',w:'w =',a:'a =',lambda:'λ =',y2:'y₂ ='};
// Givens: the laser's wavelength, the slit, and the screen distance, or a dark band's distance in place of the unknown.
function given(m){
  if(m.key==='slit')return plain(m.lambda)+' nm · L = '+plain(m.L)+' m · y = '+plain(m.y)+' mm';
  if(m.key==='wavelength')return 'a = '+plain(m.a)+' mm · L = '+plain(m.L)+' m · y = '+plain(m.y)+' mm';
  return plain(m.lambda)+' nm · a = '+plain(m.a)+' mm · L = '+plain(m.L)+' m';
}
function equation(){
  const c=model.config,e=model.exact(),y=model.dark();
  if(c.key==='width')return 'w = 2·λL ÷ a = 2 × '+number(y)+' = '+number(e)+' mm';
  if(c.key==='slit')return 'a = '+plain(c.lambda)+' nm × '+plain(c.L)+' m ÷ '+plain(c.y)+' mm = '+number(e,3)+' mm';
  if(c.key==='wavelength')return 'λ = '+plain(c.a)+' mm × '+plain(c.y)+' mm ÷ '+plain(c.L)+' m = '+number(e,0)+' nm';
  if(c.key==='second')return 'y₂ = 2·λL ÷ a = 2 × '+number(y,1)+' = '+number(e,1)+' mm';
  return 'y = '+plain(c.lambda)+' nm × '+plain(c.L)+' m ÷ '+plain(c.a)+' mm = '+number(e,1)+' mm';
}
function baseEquation(){const k=model.config.key;return k==='width'?'w = 2·λ·L ÷ a':k==='second'?'y_n = n·λ·L ÷ a':'y = λ·L ÷ a';}
// The asked quantity stays hidden until the run is over.
function metrics(t,begun){
  const c=model.config,over=model.status==='done',show=(id,v,hide)=>{$(id).textContent=!begun?'—':hide&&!over?'?':v;};
  show('lambda-value',number(model.lambda(),0),c.ask==='lambda');show('slit-value',number(model.slit(),3),c.ask==='a');show('dist-value',number(c.L,1));
  show('meter-value',number(model.meter(t),1));
}
function values(){const c=model.config,e=model.exact();return {e:number(e,c.ask==='a'?3:c.ask==='lambda'?0:c.ask==='w'?2:1)};}
function runningCopy(t){const y=model.meter(t);return text('slitCopy',{y:number(y,1),p:number(model.brightness(y)*100,0)});}
// Laser colours, and the dark band distance (mm) your answer points at.
function rgbOf(nm){return nm<490?[90,125,255]:nm<570?[80,240,110]:nm<600?[255,210,60]:[255,75,60];}
function guessDark(){const c=model.config,a=model.answer;if(c.ask==='w')return a/2;if(c.ask==='a')return c.lambda*c.L/a*1e-3;if(c.ask==='lambda')return a*c.L/c.a*1e-3;if(c.ask==='y2')return a/2;return a;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,f=model.front(s),[r,gg,b]=rgbOf(model.lambda()),col='rgb('+r+','+gg+','+b+')';
  // Not to scale: the beam runs left to right over metres, while the pattern across the screen is in millimetres.
  const xl=40,xs=Math.round(g.area*.36),xc=g.area-70,H=(height-210)/2,mid=80+H,yw=3.2*model.dark(),SY=y=>mid-y/yw*H;
  box(16,56,g.area-32,height-126,'#16212c');
  box(xl-26,mid-9,30,18,'#9fb6c7');label(text('laserTag'),xl-26,mid-16,'#d1e3ed','left',9);
  box(xs-3,mid-H-6,6,H+2,'#d9cfb8');box(xs-3,mid+4,6,H+2,'#d9cfb8');label(text('slitTag'),xs+6,mid-H+4,'#d1e3ed','left',9);
  box(xc,mid-H-6,10,2*H+12,'#e8edf2');label(text('screenTag'),xc-4,mid-H-4,'#d1e3ed','right',9);
  // L between slit and screen; the slit is labelled with its width unless that is the question.
  line([{x:xs,y:mid+H+14},{x:xc,y:mid+H+14}],'#9fb6c7',1);label('L = '+plain(c.L)+' m',(xs+xc)/2,mid+H+28,'#9fb6c7','center',9);
  label(c.ask==='a'&&!g.done?'a = ?':'a = '+plain(Number(model.slit().toPrecision(3)))+' mm',xs+6,mid+H-2,'#9fb6c7','left',9);
  if(g.begun){line([{x:xl+4,y:mid},{x:xl+4+(xs-xl-4)*f.laser,y:mid}],col,3);
    if(f.spread>0){const xf=xs+(xc-xs)*f.spread;for(let i=-6;i<=6;i++){const y=model.dark()*i/6;line([{x:xs,y:mid},{x:xf,y:mid+(SY(y)-mid)*f.spread}],'rgba('+r+','+gg+','+b+','+(.55-Math.abs(i)*.06)+')',1.5);}}
    if(f.spread>=1){for(let py=-H;py<H;py+=2){const y=-py/H*yw,v=Math.sqrt(model.brightness(y));box(xc,mid+py,10,2,'rgb('+Math.round(232*(1-v)+r*v)+','+Math.round(237*(1-v)+gg*v)+','+Math.round(242*(1-v)+b*v)+')');}}}
  if(g.option){const st=yw>20?5:yw>8?2:1;for(let y=-Math.floor(yw/st)*st;y<=yw;y+=st){line([{x:xc+10,y:SY(y)},{x:xc+(y%(2*st)===0?18:14),y:SY(y)}],'#9fb6c7',1);if(y%(2*st)===0)label(plain(y),xc+22,SY(y)+3,'#9fb6c7','left',8);}label('mm',xc+22,mid-H-12,'#9fb6c7','left',8);}
  // Your answer: orange marks on the screen at the dark bands it implies.
  if(g.guess){const gd=guessDark(),n=c.key==='second'?2:1;for(const sg of [1,-1])for(let k=1;k<=n;k++){const y=sg*k*gd;if(Math.abs(y)<=yw)line([{x:xc-14,y:SY(y)},{x:xc-2,y:SY(y)}],'#efb958',3);}fit(text('guessTag'),xc-16,SY(Math.min(gd,yw*.9))-6,'#efb958',9,110,'right');}
  if(g.begun&&s>2){const ym=model.meter(s);dot(xc-6,SY(ym),4,'#f2f8fc');}
  fit(text('scaleTag'),16,height-24,'#9fb6c7',10,g.area*.7);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const {line,fit,dot,label}=g;
  fit(text('brightGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun||g.t<2){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // Brightness against distance from the centre, measured by the meter as it moves out: zero at each dark band.
  const yw=3*model.dark(),px0=g.area+14,px1=width-14,py0=90,py1=height-90,PX=y=>px0+y/yw*(px1-px0),PY=v=>py1-v*(py1-py0),m=model.meter(Math.min(g.t,model.duration()));
  line([{x:px0,y:py1},{x:px1,y:py1}],'#8aa3b5',1);line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);
  for(let k=0;k<=3;k++){line([{x:PX(k*model.dark()),y:py1},{x:PX(k*model.dark()),y:py1+4}],'#9fb6c7',1);}
  label('0',PX(0),py1+14,'#9fb6c7','center',8);label(plain(Number((yw).toPrecision(3))),PX(yw),py1+14,'#9fb6c7','right',8);
  if(g.guess){const gd=guessDark();for(let k=1;k<=(model.config.key==='second'?2:1);k++)if(k*gd<=yw)line([{x:PX(k*gd),y:py0},{x:PX(k*gd),y:py1}],'#efb958',1.5,[5,4]);}
  const pts=[];for(let i=0;i<=300;i++){const y=m*i/300;pts.push({x:PX(y),y:PY(model.brightness(y))});}line(pts,'#f2f8fc',2);dot(PX(m),PY(model.brightness(m)),4,'#f2f8fc');
  fit(text('distAxis'),px0,py1+28,'#9fb6c7',9,px1-px0);
}
`
};
