// node make-page.cjs <root> <spec.cjs>: writes src/<kind>.html from a spec with the game's model and interface hooks.
const fs=require('fs'),path=require('path');
const [root,specFile]=process.argv.slice(2);const S=require(path.resolve(specFile));
const k=S.kind,M=S.model;
const legend=S.legends.map(([cls,key])=>`<span><i class="line-key ${cls}"></i>{{${key}}}</span>`).join('');
const metrics=S.metrics.map(([id,key,unit,eq,kind])=>`    <div class="metric ${kind||'scalar'}"><h3 class="metric-label">{{${key}}}</h3><p class="metric-value"><span id="${id}">${id==='time-value'?'0.00':'—'}</span>${unit?` <small>${unit}</small>`:''}</p><p class="metric-equation">${eq}</p></div>`).join('\n');
const missions=[0,1,2,3,4].map(i=>`    <button id="mission-${i}" aria-pressed="${i===0}"><b>${i+1} · {{mission${i}}}</b><span id="given-${i}">·</span></button>`).join('\n');
const html=`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${S.title} · Phisicos</title>
<style>
.${k}-page .answer-row .symbol{min-width:56px}.${k}-page .question{font-size:15px;font-weight:600;margin-top:4px}
.${k}-page .line-key.white{background:#f2f8fc}.${k}-page .line-key.blue{background:#77b9ff}.${k}-page .line-key.red{background:#ff7b6b}.${k}-page .line-key.green{background:#75efc7}
</style>
</head>
<body>
<div class="shell module-page ${k}-page">
__HEADER__
<main id="main-content">
__BREADCRUMBS__

<div class="masthead"><div><h1>{{title}}</h1><p class="intro">{{subtitle}}</p></div><div class="concept-tags"><span class="tag speed">{{tag1}}</span><span class="tag velocity">{{tag2}}</span></div></div>
<noscript><p class="no-js">{{noScript}}</p></noscript>
<div class="layout">
<aside class="sidebar" aria-label="{{setup}}">
  <section class="control-section"><h2 class="eyebrow">{{setup}}</h2><div class="mission-list" role="group" aria-label="{{setup}}">
${missions}
  </div><p class="hint">{{setupNote}}</p></section>
  <section class="control-section"><h2 class="eyebrow">{{answerHeading}}</h2>
    <p class="question" id="question">{{question0}}</p>
    <p class="field-label"><label for="answer">{{answerLabel}}</label></p>
    <div class="answer-row"><span class="symbol" id="answer-symbol">${S.symbol}</span><input id="answer" type="number" inputmode="decimal" step="any" value=""><span class="unit" id="answer-unit">${S.unit}</span></div>
    <p class="hint">{{answerHint}}</p>
  </section>
  <section class="control-section"><h2 class="eyebrow">{{observe}}</h2><label class="check"><input id="${S.toggle[0]}" type="checkbox" checked>{{${S.toggle[1]}}}</label><label class="check"><input id="show-guess" type="checkbox" checked>{{guessToggle}}</label><p class="hint">{{observeHint}}</p></section>
</aside>
<div class="workspace">
  <section class="scene" aria-label="{{sceneTitle}}"><div class="scene-top"><div><h2 class="scene-title">{{sceneTitle}}</h2><p class="scene-subtitle" id="mission-label">{{mission0}}</p></div><span class="status" id="${k}-status"><i class="status-dot" aria-hidden="true"></i><span id="${k}-status-text">{{ready}}</span></span></div>
    <div class="module-stage"><canvas id="${k}-canvas" role="img" aria-label="{{canvasLabel}}">{{noScript}}</canvas></div>
    <div class="legend">${legend}</div>
    <div class="module-equation"><span>{{equationTitle}}</span><output id="${k}-equation">${S.equation}</output></div>
    <div class="transport"><button id="play" class="primary" disabled>{{play}}</button><button id="pause" disabled>{{pause}}</button><button id="step" disabled>{{step}}</button><button id="reset" class="reset">{{reset}}</button></div>
  </section>
  <section class="metrics" aria-label="{{observe}}">
    <div class="metric scalar"><h3 class="metric-label">{{time}}</h3><p class="metric-value"><span id="time-value">0.00</span> <small>${S.timeUnit||'s'}</small></p><p class="metric-equation">t</p></div>
${metrics}
  </section>
  <div class="insight" id="insight"><span class="insight-icon" aria-hidden="true">↗</span><div><strong id="lesson-title">{{predictTitle}}</strong><p id="lesson-copy">{{predictCopy}}</p></div></div>
  <section class="challenge"><div class="mission-heading"><h2 class="challenge-title">{{missionTitle}}</h2><div class="score-card"><span>{{score}}</span><strong id="mission-score">—</strong></div></div><p class="mission-copy">{{missionCopy}}</p><div class="badges"><span id="right-badge">✓ {{rightBadge}}</span><span id="first-badge">① {{firstBadge}}</span></div></section>
</div>
</div>
<article class="learning-content"><section><h2>{{guideTitle}}</h2><ol><li>{{instruction1}}</li><li>{{instruction2}}</li><li>{{instruction3}}</li><li>{{instruction4}}</li></ol></section><section><h2>{{conceptTitle}}</h2><p>{{conceptCopy}}</p><aside class="worked-example"><h3>{{exampleTitle}}</h3><p>{{exampleCopy}}</p></aside></section><section><h2>{{modelTitle}}</h2><p>{{modelCopy}}</p></section></article>
<p class="language-note" id="language-note">{{languageNote}}</p>
</main>
__FOOTER__
<p class="sr-only" id="announcement" role="status" aria-live="polite"></p>
</div>
<script id="${k}-model">
${S.modelCode.trim()}
globalThis.${M}=${M};
</script>
<script id="${k}-locale" type="application/json">__LOCALE__</script>
<script id="${k}-interface">
(() => {
  'use strict';
  const $=id=>document.getElementById(id),locale=JSON.parse($('${k}-locale').textContent);
  const text=(key,values={})=>locale.strings[key].replace(/\\{(\\w+)\\}/g,(_,name)=>values[name]??'{'+name+'}');
  const number=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toLocaleString(locale.lang,{minimumFractionDigits:d,maximumFractionDigits:d}):n.toLocaleString(locale.lang,{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
  const plain=n=>n.toLocaleString(locale.lang,{maximumFractionDigits:3,useGrouping:false}).replace('-','−');
  const model=new ${M}();
  const canvas=$('${k}-canvas'),ctx=canvas.getContext('2d');
  const H=1/120,transferKey='phisicos-${k}-language-transfer';
  let running=false,previous=null,accumulator=0,lastUpdate=0,width=800,height=410;
  const say=message=>{$('announcement').textContent=message;};
  try{const data=JSON.parse(sessionStorage.getItem(transferKey)||'null');sessionStorage.removeItem(transferKey);if(data)model.restore(data.state);}catch{$('language-note').hidden=true;}
  const pace=()=>model.config.pace??1;
  const amount=v=>plain(Number(v.toPrecision(5)))+(model.unit()?' '+model.unit():'');
  const slipKey=name=>'slip'+name[0].toUpperCase()+name.slice(1);
  // The readings show only once a run starts, because they give the answer away.
  const started=()=>model.status==='done'||model.t>0;
${S.hooksCode.trim().split('\n').map(x=>'  '+x).join('\n')}
  function setRunning(value){
    const done=model.status==='done',blocked=!model.ready();running=value&&!done&&!blocked;previous=null;accumulator=0;
    $('play').disabled=running||done||blocked;$('pause').disabled=!running;$('step').disabled=running||done||blocked;
    $('${k}-status').classList.toggle('running',running);
    $('${k}-status-text').textContent=text(done?'done':running?'running':model.t?'paused':'ready');
  }
  function sync(){
    const c=model.config;
    ${M}.missions.forEach((m,i)=>{$('mission-'+i).setAttribute('aria-pressed',String(i===model.index));$('given-'+i).textContent=given(m);});
    $('question').textContent=text('question'+model.index);$('answer-symbol').textContent=symbols[c.ask];$('answer-unit').textContent=model.unit();
    $('answer').value=model.answer===null?'':String(model.answer);$('mission-label').textContent=text('mission'+model.index);
  }
  function update(){
    const ready=model.ready(),done=model.status==='done',t=ready?model.now():0,e=model.evaluate(),begun=started();
    $('time-value').textContent=number(t);metrics(t,begun);
    $('${k}-equation').textContent=begun?equation():baseEquation();
    let key,copy;
    if(done){
      const base=text('result'+model.index,values());
      if(e.ok){key='good';copy=base+' '+text('why'+model.index);}
      else{key='miss';copy=base+' '+text('missCopy',{p:amount(model.answer)})+' '+(e.slip?text(slipKey(e.slip)):text('hint'+model.index));}
    }
    else if(!ready){key='predict';copy=text('predictCopy');}
    else if(model.t>0){key='running';copy=runningCopy(t);}
    else{key='ready';copy=text('readyCopy');}
    $('lesson-title').textContent=text(key+'Title',{t:number(t),p:ready?amount(model.answer):''});$('lesson-copy').textContent=copy;
    $('insight').classList.toggle('warning',key==='miss');
    $('mission-score').textContent=done?String(model.score()):'—';
    $('right-badge').classList.toggle('earned',done&&e.ok);$('first-badge').classList.toggle('earned',done&&e.first);
  }
  function refresh(){setRunning(false);update();draw();}
  function simulate(dt){
    const result=model.advance(dt);
    if(result?.done){setRunning(false);update();say(text('doneAnnouncement')+' '+$('lesson-title').textContent);return true;}
    return false;
  }
  $('answer').addEventListener('input',event=>{const raw=String(event.target.value).trim(),value=raw===''?null:Number(raw);if(!model.setAnswer(value))model.setAnswer(null);refresh();});
  $('play').addEventListener('click',()=>{setRunning(true);update();say(text('startedAnnouncement'));});
  $('pause').addEventListener('click',()=>{setRunning(false);update();say(text('pausedAnnouncement'));});
  $('step').addEventListener('click',()=>{for(let i=0;i<12;i++)if(simulate(H*pace()))break;setRunning(false);update();draw();});
  $('reset').addEventListener('click',()=>{model.reset();refresh();say(text('resetAnnouncement'));});
  ${M}.missions.forEach((_,i)=>$('mission-'+i).addEventListener('click',()=>{model.setMission(i);sync();refresh();say(text('missionAnnouncement',{name:text('mission'+i)}));}));
  for(const id of ['${S.toggle[0]}','show-guess'])$(id).addEventListener('change',()=>{update();draw();});
  function suspend(){if(running){setRunning(false);say(text('suspendedAnnouncement'));}update();draw();}
  window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
  for(const link of document.querySelectorAll('.language-menu a'))link.addEventListener('click',()=>{setRunning(false);try{sessionStorage.setItem(transferKey,JSON.stringify({state:model.snapshot()}));}catch{}});
  function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<=0)return;width=rect.width;height=rect.height;const dpr=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  function draw(){
    if(!ctx)return;
    const c=model.config,ready=model.ready(),done=model.status==='done',t=ready?model.now():0,begun=started(),option=$('${S.toggle[0]}').checked,guess=$('show-guess').checked&&ready;
    ctx.clearRect(0,0,width,height);
    const label=(str,px,py,color='#b8ccdb',align='left',font=12)=>{ctx.fillStyle=color;ctx.textAlign=align;ctx.font=font+'px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(str,px,py);};
    const line=(points,color,w=1,dash=[])=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash);points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.setLineDash([]);};
    const fit=(str,px,py,color,size,room,align='left')=>{ctx.font=size+'px -apple-system,BlinkMacSystemFont,sans-serif';const w=ctx.measureText(str).width;label(str,px,py,color,align,w>room?Math.max(7,Math.floor(size*room/w)):size);};
    const dot=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(r,.5),0,Math.PI*2);ctx.fill();};
    const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const wide=width>=560,area=wide?width*.64:width;
    const env={c,ready,done,t,begun,option,guess,label,line,fit,dot,box,wide,area};
    fit(text('viewTitle'),16,20,'#d1e3ed',12,area-28);
    if(done){const ev=model.evaluate();fit(text(ev.ok?'rightBanner':'offBanner'),16,40,ev.ok?'#75efc7':'#efb958',width<430?12:14,area-28);}
    scene(env);
    label(text('scaleNote'),16,height-8,'#9fb6c7','left',10);
    if(!wide)return;
    panel(env);
  }
  function frame(now){if(previous===null)previous=now;const elapsed=Math.min(.1,(now-previous)/1000);previous=now;if(running){accumulator+=elapsed*pace();while(accumulator>=H&&running){accumulator-=H;simulate(H);}draw();}if(now-lastUpdate>=80){update();lastUpdate=now;}requestAnimationFrame(frame);}
  window.addEventListener('resize',resize);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(canvas);
  sync();setRunning(false);update();resize();requestAnimationFrame(frame);
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root,'src',k+'.html'),html);
const vm=require('vm'),ctx=vm.createContext({});vm.runInContext(S.modelCode+`\nglobalThis.${M}=${M};`,ctx);
new Function(html.match(new RegExp(`<script id="${k}-interface">([\\s\\S]*?)</script>`))[1]);
console.log('wrote src/'+k+'.html');
