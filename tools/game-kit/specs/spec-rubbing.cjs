module.exports = {
kind:'rubbing',model:'RubbingModel',title:'Static Rub',symbol:'Q =',unit:'nC',equation:'Q = ±n·e',sci:true,
// Givens are formulas: in right-to-left pages each card's given takes the direction of its first letter, so a trailing e⁻ stays put.
css:'[dir=rtl] .rubbing-page .mission-list span{unicode-bidi:plaintext}',
toggle:['show-pairs','pairsToggle'],
legends:[['blue','electronLegend'],['green','positiveLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['moved-value','movedMetric','','n','scalar'],['gain-value','gainMetric','C','Q₁ = −n·e','vector'],['lose-value','loseMetric','C','Q₂ = +n·e','vector'],['total-value','totalMetric','C','Q₁ + Q₂','scalar']],
modelCode:String.raw`
class RubbingModel {
  // Rubbing moves electrons from one object to the other; no charge is made or destroyed. The object that gains n electrons
  // carries Q = −n·e, the one that lost them +n·e, and the total stays 0. Charge comes only in whole electrons:
  // e = 1.602 × 10⁻¹⁹ C. Every run lasts 2 s (3 s for the dust grain); electrons move at a steady rate.
  static e = 1.602e-19;
  static tolerance = .02;
  static missions = [
    {key:'balloon',ask:'charge',scene:'rub',n:3e12,duration:2},
    {key:'jumper',ask:'charge',scene:'rub',n:3e12,duration:2},
    {key:'count',ask:'count',scene:'comb',q:-8e-9,duration:2},
    {key:'quantum',ask:'count',scene:'grain',q:-2.4e-18,n:15,duration:3},
    {key:'ion',ask:'ion',scene:'atom',n:2,duration:2}
  ];
  static units = {charge:'nC',count:'',ion:'C'};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=RubbingModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  // Charges may be signed (and 0, the "nothing happened" slip); a count of electrons is positive.
  valid(value){if(!Number.isFinite(value))return false;return this.config.ask==='count'?value>0&&value<=1e30:Math.abs(value)<=1e45;}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  // Electrons moved in the whole run: the comb's from its charge, the dust grain's and the atom's whole numbers.
  total(){const c=this.config;return c.scene==='comb'?Math.abs(c.q)/RubbingModel.e:c.n;}
  duration(){return this.config.duration;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  // Electrons moved by time t: a steady stream for the balloon and the comb, one at a time for the grain and the atom.
  moved(t){const c=this.config,N=this.total(),f=this.clamp(t)/this.duration();return c.scene==='grain'||c.scene==='atom'?Math.min(N,Math.floor(N*f+1e-9)):N*f;}
  // Charge (C) on the object that gains electrons and on the one that loses them; they always add to 0.
  charges(t){const q=this.moved(t)*RubbingModel.e;return {gain:-q,lose:q};}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly at the end of the rub.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){
    const c=this.config,e=RubbingModel.e;
    if(c.key==='balloon')return -c.n*e*1e9;
    if(c.key==='jumper')return c.n*e*1e9;
    if(c.ask==='count')return Math.abs(c.q)/e;
    return c.n*e;
  }
  unit(){return RubbingModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    // The window is purely relative: charges near 10⁻¹⁹ C would fit inside any fixed slack.
    const c=this.config,a=this.answer,x=this.exact(),e=RubbingModel.e,tol=RubbingModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q);
    const ok=near(a,x);let slip=null;
    if(!ok){
      if(c.key==='balloon'){if(near(a,-x))slip='sign';else if(near(Math.abs(a),Math.abs(x)*1e-9))slip='coulombs';else if(near(Math.abs(a),c.n/e*1e9))slip='divided';}
      else if(c.key==='jumper'){if(near(a,-x))slip='sameSign';else if(a===0)slip='none';}
      else if(c.key==='count'){if(near(a,Math.abs(c.q)*e))slip='multiplied';else if(near(a,Math.abs(c.q)*1e9/e))slip='nano';}
      else if(c.key==='quantum'){if(near(a,e/Math.abs(c.q)))slip='inverted';}
      else{if(near(a,-x))slip='ionSign';else if(near(a,e))slip='oneElectron';else if(near(a,c.n))slip='electrons';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:x};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!RubbingModel.missions[saved.index])return false;
    const probe=new RubbingModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={charge:'Q =',count:'n =',ion:'q ='};
const E=RubbingModel.e,four=x=>plain(Number(x.toPrecision(4)));
// Givens: the electrons moved, the comb's or the grain's charge, or the atom's protons and electrons.
function given(m){
  if(m.scene==='rub')return 'n = '+plain(m.n)+' e⁻';
  if(m.scene==='comb')return 'Q = '+plain(m.q*1e9)+' nC';
  if(m.scene==='grain')return 'Q = '+plain(m.q)+' C';
  return '6 p⁺ · 6 → 4 e⁻';
}
function equation(){
  const c=model.config,x=model.exact();
  if(c.key==='balloon')return 'Q = −n·e = '+four(x)+' nC';
  if(c.key==='jumper')return 'Q = +n·e = +'+four(x)+' nC';
  if(c.key==='count')return 'n = |Q| ÷ e = '+four(x);
  if(c.key==='quantum')return 'n = |Q| ÷ e = '+number(x,2)+' ≈ 15';
  return 'q = +2·e = +'+four(x)+' C';
}
function baseEquation(){const a=model.config.ask;return a==='count'?'n = |Q| ÷ e':a==='ion'?'q = +n·e':'Q = ±n·e';}
const charge=q=>q===0?'0':(q>0?'+':'')+four(q);
function metrics(t,begun){
  const s=model.charges(t);
  $('moved-value').textContent=begun?four(model.moved(t)):'—';
  $('gain-value').textContent=begun?charge(s.gain):'—';$('lose-value').textContent=begun?charge(s.lose):'—';
  $('total-value').textContent=begun?charge(s.gain+s.lose):'—';
}
function values(){const x=model.exact();return {q:four(x),n:four(x)};}
function runningCopy(t){return text('rubCopy',{n:four(model.moved(t))});}
// Which two objects take part, as text keys: the one that gains electrons first.
function names(c){return c.scene==='rub'?['balloonTag','woolTag']:c.scene==='comb'?['combTag','hairTag']:c.scene==='grain'?['grainTag','airTag']:['ionTag','freeTag'];}
function scene(g){
  const c=g.c,{line,fit,dot,box}=g,area=g.area,T=model.duration(),t=g.begun?model.now():0,f=t/T;
  const top=60,bottom=height-48,cy=(top+bottom)/2+6,tags=names(c);
  const sign=(x,y,s,size=15)=>g.label(s>0?'+':'−',x,y+5,s>0?'#75efc7':'#77b9ff','center',size);
  if(c.scene==='rub'||c.scene==='comb'){
    // Each moving − stands for a tenth of the electrons; its + partner stays behind on the other object.
    const N=10,run=f*N,shake=g.begun&&!g.done?9*Math.sin(2*Math.PI*t/.4):0;
    const ax=area*.32+shake-(g.done?20:0),bx=area*.68;
    if(c.scene==='rub'){
      ctx.fillStyle='#b87a7a';ctx.beginPath();ctx.ellipse(ax,cy-6,56,70,0,0,Math.PI*2);ctx.fill();
      line([{x:ax,y:cy+64},{x:ax-6,y:cy+86},{x:ax+4,y:bottom}],'#c9d6e0',1);
      box(bx-48,cy-84,96,168,'#6f6252');for(let i=0;i<9;i++){const y=cy-74+i*19;line([{x:bx-44,y},{x:bx-22,y:y+5},{x:bx,y},{x:bx+22,y:y+5},{x:bx+44,y}],'#8c7a63',2);}
    }else{
      box(ax-14,cy-90,28,180,'#9fb6c7');for(let i=0;i<16;i++)line([{x:ax+14,y:cy-84+i*11},{x:ax+30,y:cy-84+i*11}],'#9fb6c7',2);
      for(let i=0;i<7;i++){const x=bx-36+i*12;line(Array.from({length:12},(_,j)=>({x:x+5*Math.sin(j*.9+i),y:cy-86+j*16})),'#a07850',2);}
    }
    const slotA=i=>({x:ax-24+(i%3)*24,y:cy-44+Math.floor(i/3)*20}),slotB=i=>({x:bx-24+(i%3)*24,y:cy-44+Math.floor(i/3)*20});
    // With the pairs shown, every neutral + − pair is drawn; otherwise only the charge that is not paired.
    if(g.option)for(let i=0;i<3;i++)for(const x of [ax,bx]){sign(x-30+i*30-6,cy+44,1,13);sign(x-30+i*30+6,cy+44,-1,13);}
    for(let j=0;j<N;j++){
      const s=Math.min(Math.max(run-j,0),1),from=slotB(j),to=slotA(j),paired=s===0;
      if(paired&&!g.option)continue;
      sign(from.x-(paired?6:0),from.y,1);
      if(paired){sign(from.x+6,from.y,-1);continue;}
      sign(from.x+6+(to.x-from.x-6)*s,from.y+(to.y-from.y)*s-34*Math.sin(Math.PI*s),-1);
    }
    if(g.begun&&!g.done){line([{x:bx-60,y:top+4},{x:ax+60,y:top+4}],'#77b9ff',2);line([{x:ax+68,y:top-2},{x:ax+60,y:top+4},{x:ax+68,y:top+10}],'#77b9ff',2);fit('e⁻',(ax+bx)/2,top,'#77b9ff',11,40,'center');}
    fit(text('markNote',{n:plain(Number((model.total()/N).toPrecision(3)))}),16,height-24,'#9fb6c7',10,area*.6);
    fit(text(tags[0]),ax,bottom+2,'#d1e3ed',10,area*.3,'center');fit(text(tags[1]),bx,bottom+2,'#d1e3ed',10,area*.3,'center');
    if(g.begun){const s=model.charges(t);fit('Q = '+charge(s.gain*1e9)+' nC',ax,top+26,'#77b9ff',11,area*.3,'center');fit('Q = '+charge(s.lose*1e9)+' nC',bx,top+26,'#75efc7',11,area*.3,'center');}
  }else if(c.scene==='grain'){
    // Electrons from the air land on the grain one at a time; the last arrives as the run ends.
    const gx=area*.58,N=c.n;
    ctx.fillStyle='#8c7a63';ctx.beginPath();ctx.moveTo(gx+30,cy);for(let i=1;i<=12;i++){const a=i*Math.PI/6,r=26+5*Math.sin(i*2.3);ctx.lineTo(gx+r*Math.cos(a),cy+r*Math.sin(a));}ctx.fill();
    if(g.option)for(let i=0;i<4;i++){sign(gx-12+i*8,cy-4,i%2?-1:1,11);}
    for(let i=0;i<N;i++){
      const arrive=(i+1)/N*T,start=Math.max(0,arrive-.4*T/N*3),a=2*Math.PI*i/N,end={x:gx+40*Math.cos(a),y:cy+40*Math.sin(a)};
      if(t>=arrive-1e-9){sign(end.x,end.y,-1,13);continue;}
      if(!g.begun||t<start)continue;
      const s=(t-start)/(arrive-start),from={x:40,y:cy-90+(i%5)*45};sign(from.x+(end.x-from.x)*s,from.y+(end.y-from.y)*s,-1,13);
    }
    fit(text(tags[0]),gx,cy+70,'#d1e3ed',10,area*.3,'center');fit(text(tags[1]),40,top+10,'#9fb6c7',10,area*.3,'left');
    if(g.begun){const k=model.moved(t);fit('n = '+k+' · Q = '+charge(-k*E)+' C',gx,top+10,'#77b9ff',11,area*.5,'center');}
  }else{
    // A carbon atom: 6 protons, 2 inner and 4 outer electrons; two outer electrons leave, one after the other.
    const ax=area*.42,ox=area-40;
    for(let i=0;i<12;i++){const a=i*2.4,r=i?7+2*Math.floor(i/4):0,x=ax+r*Math.cos(a),y=cy+r*Math.sin(a);dot(x,y,6,i%2?'#5c6b78':'#1f6f5a');if(!(i%2))g.label('+',x,y+4,'#f2f8fc','center',11);}
    ctx.strokeStyle='#33526b';ctx.lineWidth=1;for(const r of [40,86]){ctx.beginPath();ctx.arc(ax,cy,r,0,Math.PI*2);ctx.stroke();}
    const spin=g.begun?.8*t:0;
    for(let i=0;i<2;i++){const a=spin*1.6+i*Math.PI;const x=ax+40*Math.cos(a),y=cy+40*Math.sin(a);dot(x,y,7,'#77b9ff');g.label('−',x,y+4,'#102637','center',12);}
    for(let i=0;i<4;i++){
      const a=spin+i*Math.PI/2-Math.PI/4,home={x:ax+86*Math.cos(a),y:cy+86*Math.sin(a)};let p=home;
      if(i<c.n&&g.begun){const s=Math.min(Math.max(f*c.n-i,0),1);const away={x:ox,y:top+30+i*40};p={x:home.x+(away.x-home.x)*s,y:home.y+(away.y-home.y)*s};}
      dot(p.x,p.y,7,'#77b9ff');g.label('−',p.x,p.y+4,'#102637','center',12);
    }
    fit(text(tags[0]),ax,bottom+2,'#d1e3ed',10,area*.4,'center');fit(text(tags[1]),ox,top+16,'#9fb6c7',10,area*.3,'right');
    if(g.begun){const k=model.moved(t);fit('q = +'+k+'·e = '+charge(k*E)+' C',ax,top+4,'#75efc7',11,area*.6,'center');}
  }
  fit('t = '+number(t)+' s',area-16,44,'#f2f8fc',13,area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,label}=g;
  fit(text(c.ask==='count'?'countGraph':'chargeGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // The test's quantity over time, in its own unit; the charge graph shows both objects and their total.
  const T=model.duration(),t=model.now(),px0=g.area+46,px1=width-14,py0=70,py1=height-64,PX=q=>px0+q/T*(px1-px0),k=c.ask==='charge'?1e9:1;
  const full=Math.abs(model.exact()),a=model.answer,big=g.guess&&Number.isFinite(a)?Math.min(Math.abs(a),2.5*full):0,span=Math.max(full,big)*1.15;
  const lo=c.ask==='count'?0:-span,hi=span,PY=v=>py1-(v-lo)/(hi-lo)*(py1-py0);
  line([{x:px0,y:py0},{x:px0,y:py1}],'#8aa3b5',1);line([{x:px0,y:PY(0)},{x:px1,y:PY(0)}],'#8aa3b5',1);
  const u=model.unit();label(plain(Number((span/1.15).toPrecision(3)))+(u?' '+u:''),px0-4,PY(span/1.15)+3,'#9fb6c7','right',9);if(lo<0)label(plain(-Number((span/1.15).toPrecision(3))),px0-4,PY(-span/1.15)+3,'#9fb6c7','right',9);label('0',px0-4,PY(0)+3,'#9fb6c7','right',9);
  if(g.guess&&Number.isFinite(a)){const v=Math.max(lo,Math.min(hi,a));line([{x:px0,y:PY(v)},{x:px1,y:PY(v)}],'#efb958',1.5,[5,4]);fit(text('guessTag')+(v!==a?' ↕':''),px1,PY(v)-5,'#efb958',9,px1-px0,'right');}
  const trace=(fn,colour)=>{const pts=[];for(let i=0;i<=240;i++){const q=t*i/240;pts.push({x:PX(q),y:PY(fn(q))});}line(pts,colour,2);};
  if(c.ask==='count')trace(q=>model.moved(q),'#f2f8fc');
  else{trace(q=>model.charges(q).gain*k,'#77b9ff');trace(q=>model.charges(q).lose*k,'#75efc7');line([{x:px0,y:PY(0)},{x:PX(t),y:PY(0)}],'#9fb6c7',1,[3,3]);fit(text('totalTag'),px1,PY(0)+12,'#9fb6c7',9,px1-px0,'right');}
  fit(text('timeAxis'),px0,py1+16,'#9fb6c7',9,px1-px0);
}
`
};
