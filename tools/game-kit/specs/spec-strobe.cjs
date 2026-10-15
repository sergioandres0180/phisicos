module.exports = {
kind:'strobe',model:'StrobeModel',title:'Strobe Freeze',symbol:'f_s =',unit:'Hz',equation:'f_seen = f − f_s',
toggle:['show-blur','blurToggle'],
legends:[['blue','flashLegend'],['white','seenLegend'],['orange','guessLegend'],['gray','referenceLegend']],
metrics:[['flash-value','flashMetric','Hz','f_s'],['motion-value','motionMetric','Hz','f'],['seen-value','seenMetric','Hz','f_seen','vector'],['count-value','countMetric','','n']],
modelCode:String.raw`
class StrobeModel {
  // In the dark, a strobe lamp lights a moving wave (or wheel) for an instant f_s times a second, and your eye holds each
  // image for about a tenth of a second. If the flashes come once per cycle, every image catches the wave at the same point:
  // it looks frozen. If the wave is a little faster, each flash catches it a little further on, so it seems to creep forward
  // at f_seen = f − f_s; a little slower, and it creeps backwards. Runs are in real time.
  static tolerance = .02;
  static run = 3;
  static persist = .1; // s, how long the eye keeps each image
  static missions = [
    {key:'freeze',ask:'flash',f:25,l:20},
    {key:'drift',ask:'drift',f:26,fs:25,l:20},
    {key:'measure',ask:'frequency',f:42,fs:40,l:20},
    {key:'wheel',ask:'turns',spokes:8,fs:24},
    {key:'speed',ask:'speed',f:25,fs:25,l:5}
  ];
  static units = {flash:'Hz',drift:'Hz',frequency:'Hz',turns:'Hz',speed:'cm/s'};
  static limits = {flash:1000,drift:1e4,frequency:1e4,turns:1000,speed:1e6};
  constructor(index = 0){this.setMission(index);}
  setMission(index){this.index=index;this.config=StrobeModel.missions[index];this.answer=null;this.attempts=0;this.reset();}
  reset(){this.t=0;this.status='moving';}
  valid(value){return Number.isFinite(value)&&value>0&&value<=StrobeModel.limits[this.config.ask];}
  setAnswer(value){if(value!==null&&!this.valid(value))return false;this.answer=value;this.reset();return true;}
  ready(){return this.answer!==null;}
  clamp(t){return Math.min(Math.max(t,0),this.duration());}
  wheel(){return this.config.ask==='turns';}
  // The flash rate: yours when it is asked, otherwise the lamp's.
  flashRate(){const c=this.config;return c.ask==='flash'?(this.answer??this.exact()):c.fs;}
  // The wheel's turns per second: yours when it is asked.
  turnRate(){return this.wheel()?(this.answer??this.exact()):0;}
  // How many times a second the pattern repeats: the wave's cycles, or spokes passing a point.
  motion(){const c=this.config;return this.wheel()?c.spokes*this.turnRate():c.f;}
  // What the eye sees: the pattern's apparent cycles per second, between −f_s/2 and f_s/2.
  seen(){const f=this.motion(),s=this.flashRate();return f-s*Math.round(f/s);}
  // The flashes the eye still holds at time t, newest first.
  flashes(t){const s=this.clamp(t),fs=this.flashRate(),out=[];if(s<=0)return out;for(let k=Math.floor(s*fs+1e-9);k>=0;k--){const tau=k/fs;if(s-tau>StrobeModel.persist)break;out.push(tau);}return out;}
  count(t){return this.clamp(t)>0?Math.floor(this.clamp(t)*this.flashRate()+1e-9)+1:0;}
  // The rope's height (share of the largest) at x (cm) and time tau; the wheel's angle (rad).
  height(x,tau){const c=this.config;return Math.sin(2*Math.PI*(c.f*tau-x/c.l));}
  angle(tau){return 2*Math.PI*this.turnRate()*tau;}
  duration(){return StrobeModel.run;}
  now(){return this.status==='done'?this.duration():this.t;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid timestep');
    if(this.status==='done'||!this.ready())return null;
    // A run counts as an attempt as soon as it starts; it ends exactly after 3 s.
    if(this.t===0)this.attempts++;
    const T=this.duration();
    if(this.t+dt>=T*(1-1e-12)){this.t=T;this.status='done';return {t:T,done:true};}
    this.t+=dt;return null;
  }
  exact(){const c=this.config;if(c.ask==='flash')return c.f;if(c.ask==='drift')return c.f-c.fs;if(c.ask==='frequency')return c.f;if(c.ask==='turns')return c.fs/c.spokes;return c.f*c.l;}
  unit(){return StrobeModel.units[this.config.ask];}
  evaluate(){
    if(!this.ready())return {ok:false,slip:null,first:false,exact:this.exact()};
    const c=this.config,a=this.answer,e=this.exact(),tol=StrobeModel.tolerance,near=(p,q)=>Math.abs(p-q)<=tol*Math.abs(q)+1e-12;
    // Every answer is right within 2%.
    const ok=near(a,e);let slip=null;
    if(!ok){
      if(c.ask==='flash'){if(near(a,c.f/2))slip='half';else if(near(a,2*c.f))slip='double';else if(near(a,1/c.f))slip='period';}
      else if(c.ask==='drift'){if(near(a,c.f+c.fs))slip='added';else if(near(a,c.f/c.fs))slip='ratio';}
      else if(c.ask==='frequency'){const d=c.f-c.fs;if(near(a,c.fs-d))slip='subtracted';else if(near(a,d))slip='creepOnly';else if(near(a,c.fs))slip='strobeOnly';}
      else if(c.ask==='turns'){if(near(a,c.fs))slip='noSpokes';else if(near(a,c.fs*c.spokes))slip='times';else if(near(a,e/2))slip='halfway';}
      else{if(near(a,c.l/c.f))slip='divided';else if(near(a,c.f/c.l))slip='inverted';else if(near(a,e/100))slip='metresPerSecond';}
    }
    return {ok,slip,first:ok&&this.attempts===1,exact:e};
  }
  score(){if(this.status!=='done')return 0;const e=this.evaluate();return (e.ok?100:0)+(e.first?50:0);}
  snapshot(){return {index:this.index,answer:this.answer,attempts:this.attempts,t:this.t,status:this.status};}
  restore(saved){
    if(!Number.isInteger(saved?.index)||!StrobeModel.missions[saved.index])return false;
    const probe=new StrobeModel(saved.index);
    if(!probe.setAnswer(saved.answer??null)||!Number.isInteger(saved.attempts)||saved.attempts<0)return false;
    if(!['moving','done'].includes(saved.status)||!Number.isFinite(saved.t)||saved.t<0||saved.t>probe.duration()*(1+1e-9))return false;
    if(probe.answer===null&&(saved.t>0||saved.status==='done'))return false;
    if((saved.status==='done'||saved.t>0)&&saved.attempts<1)return false;
    this.setMission(saved.index);this.answer=probe.answer;this.attempts=saved.attempts;
    this.status=saved.status;this.t=saved.status==='done'?this.duration():saved.t;return true;
  }
}`,
hooksCode:String.raw`
const symbols={flash:'f_s =',drift:'f_seen =',frequency:'f =',turns:'f_rot =',speed:'v ='};
// Givens: the wave's frequency, the lamp's flash rate, the creep you see, or the wheel's spokes.
function given(m){
  if(m.ask==='flash')return 'f = '+plain(m.f)+' Hz';
  if(m.ask==='drift')return 'f = '+plain(m.f)+' Hz · f_s = '+plain(m.fs)+' Hz';
  if(m.ask==='frequency')return 'f_s = '+plain(m.fs)+' Hz · f_seen = '+plain(m.f-m.fs)+' Hz';
  if(m.ask==='turns')return 'n = '+plain(m.spokes)+' · f_s = '+plain(m.fs)+' Hz';
  return 'f = '+plain(m.f)+' Hz · λ = '+plain(m.l)+' cm';
}
function equation(){
  const c=model.config,e=model.exact();
  if(c.ask==='flash')return 'f_s = f = '+number(e,0)+' Hz';
  if(c.ask==='drift')return 'f_seen = f − f_s = '+plain(c.f)+' − '+plain(c.fs)+' = '+number(e,0)+' Hz';
  if(c.ask==='frequency')return 'f = f_s + f_seen = '+plain(c.fs)+' + '+plain(c.f-c.fs)+' = '+number(e,0)+' Hz';
  if(c.ask==='turns')return 'f_rot = f_s ÷ n = '+plain(c.fs)+' ÷ '+plain(c.spokes)+' = '+number(e,0)+' Hz';
  return 'v = f·λ = '+plain(c.f)+' × '+plain(c.l)+' = '+number(e,0)+' cm/s';
}
function baseEquation(){const a=model.config.ask;return a==='speed'?'v = f·λ':a==='turns'?'f_rot·n = f_s':'f_seen = f − f_s';}
function metrics(t,begun){
  $('flash-value').textContent=begun?plain(model.flashRate()):'—';$('motion-value').textContent=begun?plain(model.motion()):'—';
  $('seen-value').textContent=begun?number(Math.abs(model.seen())):'—';$('count-value').textContent=begun?plain(model.count(t)):'—';
}
function values(){const c=model.config;return {s:plain(c.ask==='flash'?c.f:c.fs),d:plain(c.ask==='drift'?c.f-c.fs:2),f:plain(c.f??0),r:plain(c.fs/(c.spokes||1)),v:plain(c.f*(c.l||0))};}
function runningCopy(t){return text('flashingCopy',{n:plain(model.count(t)),d:number(Math.abs(model.seen()))});}
// Where the guessed creep would put a crest (cm), starting from the first crest.
function guessCrest(c,t){const d=c.ask==='drift'?model.answer:model.answer-c.fs;return (((.75+d*t)%1)+1)%1*c.l;}
function scene(g){
  const c=g.c,{line,fit,dot,box,label}=g,s=g.ready?g.t:0,x0=50,x1=g.area-24,ym=height*.46,amp=Math.min(60,height*.15);
  // A dark room: the lamp, and what the eye holds from the latest flashes, brightest for the newest.
  box(16,56,g.area-32,height-110,'#0b1823');
  const shots=g.begun?model.flashes(s):[],lit=shots.length&&s-shots[0]<.02;
  box(24,64,22,14,lit?'#f6f3d0':'#5c6b78');
  if(model.wheel()){
    const cx=(x0+x1)/2,cy=ym,R=Math.min(amp*1.6,(x1-x0)/3);
    if(g.option&&g.begun){ctx.strokeStyle='rgba(159,182,199,.25)';ctx.lineWidth=R*.9;ctx.beginPath();ctx.arc(cx,cy,R*.5,0,2*Math.PI);ctx.stroke();}
    shots.forEach(tau=>{const a=1-(s-tau)/StrobeModel.persist;ctx.globalAlpha=Math.max(.15,a);ctx.strokeStyle='#e3f1ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,R,0,2*Math.PI);ctx.stroke();for(let k=0;k<c.spokes;k++){const th=model.angle(tau)+2*Math.PI*k/c.spokes;line([{x:cx,y:cy},{x:cx+Math.cos(th)*R,y:cy+Math.sin(th)*R}],'#e3f1ff',3);}ctx.globalAlpha=1;});
    if(!g.begun){ctx.strokeStyle='#5c6b78';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,R,0,2*Math.PI);ctx.stroke();}
    dot(cx,cy,5,'#f2f8fc');
  }else{
    const view=3*c.l,kp=(x1-x0)/view,X=x=>x0+x*kp;
    if(g.option&&g.begun)box(x0,ym-amp,x1-x0,2*amp,'rgba(159,182,199,.12)');
    line([{x:x0,y:ym},{x:x1,y:ym}],'#22384a',1);
    shots.forEach(tau=>{const a=1-(s-tau)/StrobeModel.persist,pts=[];for(let i=0;i<=300;i++){const x=view*i/300;pts.push({x:X(x),y:ym-model.height(x,tau)*amp});}ctx.globalAlpha=Math.max(.15,a);line(pts,'#e3f1ff',3);ctx.globalAlpha=1;});
    // The crest you would follow: white where it appears, orange where your creep would put it.
    if(shots.length&&(c.ask==='drift'||c.ask==='frequency')){const tau=shots[0],xc=((((c.f*tau-.25)%1)+1)%1)*c.l;dot(X(xc),ym-amp-12,5,'#f2f8fc');if(g.guess)dot(X(guessCrest(c,s)),ym-amp-24,5,'#efb958');}
    if(g.guess&&c.ask==='speed'){const step=model.answer/c.f;if(step*kp>=6){for(let x=0;x<=view+1e-9;x+=step)line([{x:X(x),y:ym-amp-22},{x:X(x),y:ym-amp-14}],'#efb958',2);fit(text('guessTag'),X(0),ym-amp-26,'#efb958',9,g.area*.4);}}
    const ry=ym+amp+22,step=c.l<10?1:5;line([{x:X(0),y:ry},{x:X(view),y:ry}],'#8aa3b5',1);for(let m=0;m<=view+1e-9;m+=step){const x=X(m);line([{x,y:ry},{x,y:ry+(m%(step*2)?4:8)}],'#9fb6c7',1);if(m%(step*2)===0)label(plain(m)+' cm',x,ry+20,'#9fb6c7','center',9);}
  }
  fit('t = '+number(g.t)+' s',g.area-16,44,'#f2f8fc',13,g.area*.3,'right');
}
function panel(g){
  const c=g.c,{line,fit,dot}=g;
  fit(text('samplingGraph'),g.area+8,44,'#d1e3ed',10,width-g.area-16);
  if(!g.begun){fit(text('panelHint'),g.area+8,70,'#9fb6c7',10,width-g.area-16);return;}
  // One point of the pattern over the last 0.4 s: the gray curve is the real motion, the dots are what each flash shows.
  const W=.4,end=g.t,start=Math.max(0,end-W),px0=g.area+14,px1=width-14,py0=90,py1=height-80,ym=(py0+py1)/2,PX=q=>px0+(q-(end-W))/W*(px1-px0),PY=y=>ym-y*(py1-py0)*.42;
  const y=q=>model.wheel()?Math.sin(2*Math.PI*model.motion()*q):model.height(0,q);
  line([{x:px0,y:ym},{x:px1,y:ym}],'#8aa3b5',1);
  const pts=[];for(let i=0;i<=500;i++){const q=start+(end-start)*i/500;pts.push({x:PX(q),y:PY(y(q))});}line(pts,'#5c6b78',1.5);
  const fs=model.flashRate();for(let k=Math.ceil(start*fs-1e-9);k/fs<=end+1e-9;k++)dot(PX(k/fs),PY(y(k/fs)),3.5,'#f2f8fc');
  fit(text('timeAxis'),px0,py1+14,'#9fb6c7',9,(px1-px0)/2);
}
`
};
