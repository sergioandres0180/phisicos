// node assemble.cjs <root> <kind> "<header comment>" <commonKeys,comma> <fragment files...>
const path=require('path'),fs=require('fs');
const [root,kind,header,commonList,...frags]=process.argv.slice(2);
const barrel=require(path.join(root,'locales/barrel.cjs')),common=commonList.split(',');
const parts=Object.assign({},...frags.map(f=>require(path.resolve(f))));
const langs=['en','es','fr','de','nl','fi','nb','da','pt','hi','ja'];
const bOrder=Object.keys(barrel.en),pos=k=>bOrder.indexOf(k);
const fragKeys=Object.keys(parts.en),order=[],done=new Set();
for(const k of fragKeys){
  if(pos(k)>=0)for(const c of common)if(!done.has(c)&&pos(c)>=0&&pos(c)<pos(k)){order.push(c);done.add(c);}
  order.push(k);done.add(k);
}
for(const c of common)if(!done.has(c))order.push(c);
const out={};
for(const l of langs){
  const f=parts[l];if(!f)throw new Error('missing '+l);
  const extra=Object.keys(f).filter(k=>!fragKeys.includes(k)),miss=fragKeys.filter(k=>!(k in f));
  if(extra.length||miss.length)throw new Error(l+' extra '+extra+' missing '+miss);
  out[l]={};for(const k of order){const v=k in f?f[k]:barrel[l][k];if(typeof v!=='string')throw new Error(l+' no '+k);out[l][k]=v;}
}
fs.writeFileSync(path.join(root,'locales',kind+'.cjs'),'// '+header+'\nmodule.exports = '+JSON.stringify(out,null,2)+';\n');
console.log(kind,order.length,'keys');
