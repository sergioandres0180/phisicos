// Strict in-memory DOM/Canvas adapter for template-driven games. It rejects unknown IDs,
// duplicate IDs, and non-finite drawing coordinates, and records painted canvas text.
const vm=require('node:vm'),assert=require('node:assert/strict');
const script=(html,id)=>html.match(new RegExp('<script id="'+id+'"[^>]*>([\\s\\S]*?)<\\/script>'))[1];
function mount(html,{scripts,locale,langs,storage=new Map(),size={width:800,height:410}}){
 let clock=0;
 const elements=new Map(),frames=[],events=new Map(),windowEvents=new Map(),painted=[];
 const drawing=new Proxy({measureText:s=>({width:String(s).length*7})},{get:(o,k)=>o[k]??((...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),'nonfinite canvas argument for '+String(k));if(k==='fillText')painted.push(args[0]);}),set:(o,k,v)=>(o[k]=v,true)});
 for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  const tag=m[0],id=m[1];assert.ok(!elements.has(id),'duplicate ID '+id);
  elements.set(id,{id,value:tag.match(/\bvalue="([^"]*)"/)?.[1]??'',checked:/\bchecked\b/.test(tag),hidden:/\shidden[\s>]/.test(tag),disabled:/\sdisabled[\s>]/.test(tag),textContent:id===locale?script(html,id):'',events:{},attributes:{},
   classList:{values:new Set(),toggle(k,on){on?this.values.add(k):this.values.delete(k);},has(k){return this.values.has(k);}},
   setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.events[k]=f;},getContext(){return drawing;},getBoundingClientRect(){return size;}});
 }
 const el=id=>{assert.ok(elements.has(id),'Missing ID '+id);return elements.get(id);};
 const links=langs.map(lang=>({lang,events:{},addEventListener(k,f){this.events[k]=f;}}));
 const doc={hidden:false,getElementById:el,querySelectorAll(selector){assert.equal(selector,'.language-menu a');return links;},addEventListener(k,f){events.set(k,f);}};
 const win={devicePixelRatio:2,addEventListener(k,f){windowEvents.set(k,f);}};
 const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const env=vm.createContext({document:doc,window:win,sessionStorage,requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}},console});
 for(const id of scripts)vm.runInContext(script(html,id),env);
 const ui={el,doc,links,events,windowEvents,painted,storage,env,
  click(id){assert.ok(!el(id).disabled,id+' disabled');assert.ok(!el(id).hidden,id+' hidden');el(id).events.click({target:el(id)});},
  input(id,value){el(id).value=String(value);el(id).events.input({target:el(id)});},
  tick(time){frames.splice(0).forEach(fn=>fn(time));},
  // Advances animation frames in 100 ms increments until a condition holds or the limit is reached.
  run(until,{limit=400}={}){ui.tick(clock);for(let i=1;i<=limit&&!until();i++){clock+=100;ui.tick(clock);}}};
 return ui;
}
module.exports={mount,script};
