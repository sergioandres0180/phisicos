module.exports = {
kind:'bank',model:'BankModel',title:'Bank Shot Ripples',symbol:'θ_out =',unit:'°',equation:'θ_out = θ_in',
toggle:['show-ruler','rulerToggle'],
legends:[['blue','incomingLegend'],['white','reflectedLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['speed-value','speedMetric','m/s','v','vector'],['travel-value','travelMetric','m','s','vector'],['height-value','heightMetric','cm','y','vector'],['bounce-value','bounceMetric','','n']],
modelCode:String.raw`
class BankModel {
  // Reflection. In a wave tank a ripple bounces off a straight wall like a ball: it leaves at the same angle to the wall as it
  // arrived. On a rope a pulse comes back from the end: upside down from a fixed (clamped) end, upright from a free end (a
  // ring sliding on a pole). Lengths are in metres and times in seconds; runs play at the pace that makes them about 4 s.
  static tolerance = .02;
  static missions = [
    {key:'angle',ask:'angle',mode:'tank',v:1,A:[.5,2],theta:35,pace:1.75},
    {key:'bank',ask:'aim',mode:'tank',v:1,A:[1,2],B:[7,1],pace:1.7},
    {key:'fixed',ask:'height',mode:'rope',v:4,L:6,y:5,end:'fixed',pace:.75},
    {key:'free',ask:'height',mode:'rope',v:4,L:6,y:5,end:'free',pace:.75},
    {key:'back',ask:'time',mode:'rope',v:4,L:6,y:5,end:'fixed',pace:.75}
  ];
  static W = 8; static H = 4; // tank size (m)
  static units = {angle:'°',aim:'m',height:'cm',time:'s'};
  static limits = {angle:180,aim:8,height:100,time:1e4};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=BankModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // A height may point down (negative) but not be 0; every other answer is positive.
  valid(value){const a=this.config.ask,lim=BankModel.limits[a];if(!Number.isFinite(value))return false;return a==='height'?value!==0&&Math.abs(value)<=lim:value>0&&value<=lim;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // The ripple's path in the tank: start, the point where it hits the wall (y = 0), and the end of its run.
  hitX(){const c=this.config;if(c.B)return c.A[0]+(c.B[0]-c.A[0])*c.A[1]/(c.A[1]+c.B[1]);return c.A[0]+c.A[1]/Math.tan(c.theta*Math.PI/180);}
  path(){const c=this.config,h=this.hitX();if(c.B)return [c.A,[h,0],c.B];return [c.A,[h,0],[2*h-c.A[0],c.A[1]]];}
  length(){const p=this.path();let s=0;for(let i=1;i<p.length;i++)s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return s;}
  angleIn(){const c=this.config,h=this.hitX();return Math.atan2(c.A[1],h-c.A[0])*180/Math.PI;}
  angleOut(){const p=this.path(),h=p[1][0],e=p[2];return Math.atan2(e[1],e[0]-h)*180/Math.PI;}
  // The ripple's position (m, m) after travelling s metres along its path.
  point(s){const p=this.path();for(let i=1;i<p.length;i++){const L=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);if(s<=L||i===p.length-1){const k=Math.min(Math.max(s/L,0),1);return [p[i-1][0]+(p[i][0]-p[i-1][0])*k,p[i-1][1]+(p[i][1]-p[i-1][1])*k];}s-=L;}}
  // The rope: a bump 1.2 m wide and y cm high leaves the hand; its mirror image (flipped for a fixed end) meets it at the end.
  static bump(u){return Math.abs(u)<.6?.5*(1+Math.cos(Math.PI*u/.6)):0;}
  rope(x,t){const c=this.config,s=c.v*this.clamp(t),r=c.end==='fixed'?-1:1;return c.y*(BankModel.bump(x-s)+r*BankModel.bump(2*c.L-x-s));}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  travelled(t){return this.config.v*this.clamp(t);}
  bounced(t){const c=this.config;return this.travelled(t)+1e-9>=(c.mode==='tank'?Math.hypot(this.path()[1][0]-c.A[0],c.A[1]):c.L)?1:0;}
  duration(){const c=this.config;return c.mode==='tank'?this.length()/c.v:2*c.L/c.v;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly as the ripple ends its run or the pulse is back at the hand.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='angle')return c.theta;if(c.ask==='aim')return this.hitX()-c.A[0];if(c.ask==='height')return c.end==='fixed'?-c.y:c.y;return this.duration();}
  unit(){return BankModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=BankModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='angle'){if(near(a,90-c.theta))slip='complement';else if(near(a,180-c.theta))slip='continued';else if(near(a,2*c.theta))slip='doubled';}
      else if(c.ask==='aim'){const dx=c.B[0]-c.A[0];if(near(a,dx/2))slip='halfway';else if(near(a,dx*c.B[1]/(c.A[1]+c.B[1])))slip='swapped';}
      else if(c.ask==='height'){if(near(a,-e))slip=c.end==='fixed'?'upright':'inverted';else if(near(Math.abs(a),2*c.y))slip='doubledHeight';}
      else{if(near(a,e/2))slip='oneWay';else if(near(a,c.L*c.v))slip='multiplied';else if(near(a,1/e))slip='invertedTime';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!BankModel.missions[saved.index])return false;
    const probe=new BankModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={angle:'θ_out =',aim:'x =',height:'y_back =',time:'t ='};
// Givens: the angle in, the two points, or the pulse and the kind of end.
function given(m){
  if(m.ask==='angle')return 'θ_in = '+plain(m.theta)+'°';
  if(m.ask==='aim')return 'A: '+plain(m.A[1])+' m · B: '+plain(m.B[1])+' m · '+plain(m.B[0]-m.A[0])+' m';
  if(m.ask==='height')return 'y = +'+plain(m.y)+' cm · '+text(m.end==='fixed'?'fixedTag':'freeTag');
  return 'L = '+plain(m.L)+' m · v = '+plain(m.v)+' m/s';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='angle')return 'θ_out = θ_in = '+plain(c.theta)+'°';
  if(c.ask==='aim')return 'x = '+plain(c.B[0]-c.A[0])+' × '+plain(c.A[1])+' ÷ ('+plain(c.A[1])+' + '+plain(c.B[1])+') = '+number(e)+' m';
  if(c.ask==='height')return c.end==='fixed'?'y_back = −y = −'+plain(c.y)+' cm':'y_back = +y = +'+plain(c.y)+' cm';
  return 't = 2L ÷ v = '+plain(2*c.L)+' ÷ '+plain(c.v)+' = '+number(e)+' s';
}
function baseEquation(){const a=model.config.ask;return a==='height'?'y_back = ±y':a==='time'?'t = 2L ÷ v':a==='aim'?'θ_out = θ_in':'θ_out = θ_in';}
const mark=1.5; // the marked point on the rope, 1.5 m from the hand
function metrics(t,begun){
  const c=model.config;
  $('speed-value').textContent=begun?number(c.v,1):'—';$('travel-value').textContent=begun?number(model.travelled(t),1):'—';
  $('height-value').textContent=begun&&c.mode==='rope'?number(model.rope(mark,t),1):'—';$('bounce-value').textContent=begun?plain(model.bounced(t)):'—';
}
function values(){const c=model.config;return {a:plain(c.theta||0),x:plain(c.B?model.hitX()-c.A[0]:0),t:plain(c.L?2*c.L/c.v:0)};}
function runningCopy(t){return text(model.config.mode==='tank'?'tankCopy':'ropeCopy',{s:number(model.travelled(t),1)});}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?model.travelled(g.t):0;
  if(c.mode==='tank'){
    // A wave tank from above; the wall is the bottom edge. The ripple's path is traced as it goes.
    const W=BankModel.W,H=BankModel.H,k=Math.min((g.area-60)/W,(height-170)/H),x0=(g.area-W*k)/2,yb=height-90,X=x=>x0+x*k,Y=y=>yb-y*k;
    box(X(0),Y(H),W*k,H*k,'#173a50');line([{x:X(0)-6,y:yb},{x:X(W)+6,y:yb}],'#9fb6c7',5);label(text('wallTag'),X(W)-6,yb-9,'#9fb6c7','right',9);
    const p=model.path();dot(X(c.A[0]),Y(c.A[1]),5,'#d9cfb8');label('A',X(c.A[0])-10,Y(c.A[1])-8,'#d9cfb8','center',11);
    if(c.B){dot(X(c.B[0]),Y(c.B[1]),5,'#d9cfb8');label('B',X(c.B[0])+10,Y(c.B[1])-8,'#d9cfb8','center',11);}
    if(g.option){for(let m=0;m<=W;m++){line([{x:X(m),y:yb+3},{x:X(m),y:yb+9}],'#9fb6c7',1);label(plain(m)+' m',X(m),yb+30,'#9fb6c7','center',8);}}
    if(g.begun){const L1=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]),q=model.point(s);
      line([{x:X(p[0][0]),y:Y(p[0][1])},{x:X(s<L1?q[0]:p[1][0]),y:Y(s<L1?q[1]:0)}],'#77b9ff',2);if(s>L1)line([{x:X(p[1][0]),y:Y(0)},{x:X(q[0]),y:Y(q[1])}],'#f2f8fc',2);
      for(const r of [6,12,18])line(Array.from({length:33},(_,i)=>({x:X(q[0])+r*Math.cos(i*Math.PI/16),y:Y(q[1])+r*Math.sin(i*Math.PI/16)})),r===6?'#f2f8fc':'#77b9ff',1.2);}
    if(g.guess){const len=3;
      if(c.ask==='angle'){const a=model.answer*Math.PI/180,h=model.hitX();line([{x:X(h),y:Y(0)},{x:X(h+len*Math.cos(a)),y:Y(len*Math.sin(a))}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(h+len*Math.cos(a))+4,Y(len*Math.sin(a)),'#efb958',9,120);}
      else{const hx=c.A[0]+model.answer;if(hx<=W){line([{x:X(c.A[0]),y:Y(c.A[1])},{x:X(hx),y:Y(0)}],'#efb958',1.5,[5,4]);const dx=hx-c.A[0],ex=Math.min(W,hx+dx*c.B[1]/c.A[1]*1.6),ey=(ex-hx)*c.A[1]/dx;line([{x:X(hx),y:Y(0)},{x:X(ex),y:Y(ey)}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(hx),yb-26,'#efb958',9,120,'center');}}}
  }else{
    // A rope from the hand to its end: clamped to a wall (fixed) or a ring on a pole (free). Heights are enlarged.
    const x0=48,x1=g.area-60,kx=(x1-x0)/c.L,X=x=>x0+x*kx,ym=height*.5,ky=Math.min(7,height*.016),fixed=c.end==='fixed';
    line([{x:x0,y:ym},{x:x1,y:ym}],'#3d556b',1,[3,4]);
    const pts=[];for(let i=0;i<=360;i++){const x=c.L*i/360;pts.push({x:X(x),y:ym-(g.begun?model.rope(x,g.t):0)*ky});}line(pts,'#77b9ff',3);
    box(16,ym-14,x0-20,28,'#c9b79c');
    if(fixed){box(x1,ym-60,18,120,'#5c6b78');label(text('fixedTag'),x1+9,ym+78,'#d1e3ed','center',9);}
    else{line([{x:x1+4,y:ym-70},{x:x1+4,y:ym+70}],'#9fb6c7',3);const ye=ym-(g.begun?model.rope(c.L,g.t):0)*ky;line(Array.from({length:25},(_,i)=>({x:x1+4+7*Math.cos(i*Math.PI/12),y:ye+3*Math.sin(i*Math.PI/12)})),'#f2f8fc',2);label(text('freeTag'),x1+4,ym+86,'#d1e3ed','center',9);}
    const my=ym-(g.begun?model.rope(mark,g.t):0)*ky;dot(X(mark),my,5,'#f2f8fc');
    if(g.option){const ry=height-58;line([{x:X(0),y:ry},{x:X(c.L),y:ry}],'#8aa3b5',1);for(let m=0;m<=c.L;m++){line([{x:X(m),y:ry},{x:X(m),y:ry+6}],'#9fb6c7',1);label(plain(m)+' m',X(m),ry+18,'#9fb6c7','center',9);}
      for(const h of [-5,5]){line([{x:x0-8,y:ym-h*ky},{x:x0-2,y:ym-h*ky}],'#9fb6c7',1);label((h>0?'+':'−')+plain(5)+' cm',x0-10,ym-h*ky+3,'#9fb6c7','right',8);}}
    // Your answer: an orange line at your height for the pulse coming back, or an orange dot on your round trip.
    if(g.guess&&g.begun){if(c.ask==='height'&&model.travelled(g.t)>c.L){const yg=ym-model.answer*ky;line([{x:X(c.L*.15),y:yg},{x:X(c.L*.95),y:yg}],'#efb958',1.5,[5,4]);fit(text('guessTag'),X(c.L*.15),yg-6,'#efb958',9,120);}
      if(c.ask==='time'){const q=2*c.L*Math.min(g.t/model.answer,1),xg=q<=c.L?q:2*c.L-q;dot(X(xg),ym-c.y*ky-14,5,'#efb958');}}
  }
  fit(text('paceTag',{n:plain(c.pace)}),16,height-24,'#9fb6c7',10,g.area*.5);
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot,label}=g;
  fit(text(c.mode==='tank'?'angleGraph':'markGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  const px0=g.area+14,px1=width-14,py0=80,py1=height-80;
  if(c.mode==='tank'){
    // Close-up of the bounce: the wall, the dashed normal, the ray in and the ray out with their angles to the wall.
    const cx=(px0+px1)/2,cy=py1-30,R=Math.min(px1-px0,py1-py0)*.42,ai=model.angleIn()*Math.PI/180,ao=model.angleOut()*Math.PI/180,p=model.path(),L1=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]),s=model.travelled(g.t);
    line([{x:px0,y:cy},{x:px1,y:cy}],'#9fb6c7',4);line([{x:cx,y:cy},{x:cx,y:cy-R-10}],'#8aa3b5',1,[3,4]);
    line([{x:cx-R*Math.cos(ai),y:cy-R*Math.sin(ai)},{x:cx,y:cy}],'#77b9ff',2.5);label(number(model.angleIn(),1)+'°',cx-R*.55,cy-12,'#77b9ff','center',10);
    if(s>L1){line([{x:cx,y:cy},{x:cx+R*Math.cos(ao),y:cy-R*Math.sin(ao)}],'#f2f8fc',2.5);label(number(model.angleOut(),1)+'°',cx+R*.55,cy-12,'#f2f8fc','center',10);}
    if(g.guess&&c.ask==='angle'){const a=model.answer*Math.PI/180;line([{x:cx,y:cy},{x:cx+R*Math.cos(a),y:cy-R*Math.sin(a)}],'#efb958',1.5,[5,4]);}
    fit(text('wallTag'),px0,cy+18,'#9fb6c7',9,px1-px0);
  }else{
    // The height of the marked point over time: the pulse going out, then coming back.
    const D=model.duration(),ym=(py0+py1)/2,PX=q=>px0+q/D*(px1-px0)*.92,PY=h=>ym-h/8*(py1-py0)*.45,upto=Math.min(g.t,D);
    line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);for(const h of [-5,5])label((h>0?'+':'−')+plain(5),px0+2,PY(h)+3,'#9fb6c7','left',8);
    if(g.guess&&c.ask==='height')line([{x:px0,y:PY(model.answer)},{x:px1,y:PY(model.answer)}],'#efb958',1.5,[5,4]);
    if(g.guess&&c.ask==='time'&&model.answer<=D*1.08)line([{x:PX(model.answer),y:py0},{x:PX(model.answer),y:py1}],'#efb958',1.5,[5,4]);
    const pts=[];for(let i=0;i<=400;i++){const q=upto*i/400;pts.push({x:PX(q),y:PY(model.rope(mark,q))});}line(pts,'#f2f8fc',2);
    fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,px1-px0);
  }
}
`
};
