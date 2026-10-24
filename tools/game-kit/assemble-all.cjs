// node tools/game-kit/assemble-all.cjs <root> <kind> "<header comment>" <commonKeys,comma> <fragment files...> [--draft]
// Like assemble.cjs, for all the site's languages at once (the order of locales/barrel.cjs). Fragments may hold any set
// of languages; shared keys come from barrel. Arabic text gets the same treatment add-lang.cjs gives it: each
// left-to-right run and each placeholder is isolated, except in routes, titles, and descriptions. --draft fills
// missing languages with English, for trying a game out before its translations exist; never ship a draft.
const path=require('path'),fs=require('fs');
const args=process.argv.slice(2),draft=args.includes('--draft'),[root,kind,header,commonList,...frags]=args.filter(a=>a!=='--draft');
const barrel=require(path.join(root,'locales/barrel.cjs')),common=commonList.split(','),langs=Object.keys(barrel);
const parts=Object.assign({},...frags.map(f=>require(path.resolve(f))));
const isolateRuns=require('./isolate.cjs');
const bOrder=Object.keys(barrel.en),pos=k=>bOrder.indexOf(k);
const fragKeys=Object.keys(parts.en),order=[],done=new Set();
for(const k of fragKeys){
  if(pos(k)>=0)for(const c of common)if(!done.has(c)&&pos(c)>=0&&pos(c)<pos(k)){order.push(c);done.add(c);}
  order.push(k);done.add(k);
}
for(const c of common)if(!done.has(c))order.push(c);
const out={},drafted=[];
for(const l of langs){
  let f=parts[l];
  if(!f){if(!draft)throw new Error('missing '+l);f=Object.assign({},parts.en,{route:draftRoute(l)});drafted.push(l);}
  const extra=Object.keys(f).filter(k=>!fragKeys.includes(k)),miss=fragKeys.filter(k=>!(k in f));
  if(extra.length||miss.length)throw new Error(l+' extra '+extra+' missing '+miss);
  out[l]={};
  for(const k of order){
    let v=k in f?f[k]:barrel[l][k];if(typeof v!=='string')throw new Error(l+' no '+k);
    if(l==='ar'&&k in f&&!drafted.includes(l)){if(!/^(route|pageTitle|pageDescription)$/.test(k))v=isolateRuns(v);v=v.replace(/\{\w+\}/g,'⁨$&⁩');}
    const a=(String(parts.en[k]??barrel.en[k]).match(/\{\w+\}/g)||[]).sort().join(),b=(v.match(/\{\w+\}/g)||[]).sort().join();
    if(a!==b)throw new Error(l+': placeholders of '+k+' are '+b+', expected '+a);
    out[l][k]=v;
  }
}
// A draft language keeps English text but needs its own route: its games section, its topic slug, the English game slug.
function draftRoute(l){const T=require(path.join(root,'locales/topics.cjs')),[,,topic,game]=parts.en.route.split('/');return T.section[l]+T.topics.find(t=>t.copy.en.slug===topic).copy[l].slug+'/'+game+'/';}
fs.writeFileSync(path.join(root,'locales',kind+'.cjs'),'// '+header+'\nmodule.exports = '+JSON.stringify(out,null,2)+';\n');
console.log(kind,order.length,'keys',drafted.length?'· DRAFT, English in '+drafted.join(' '):'');
