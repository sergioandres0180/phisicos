// node tools/game-kit/check-keys.cjs <kind>: every text('key') and {{key}} used by src/<kind>.html exists in locales/<kind>.cjs,
// all languages have the same keys and placeholders, every slip has a localized line, and no Latin-decimal dot leaks into
// decimal-comma languages. ('2d', question, mission, result, why, hint are built from prefixes and are expected in "dynamic".)
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..'),kind=process.argv[2];
const s=fs.readFileSync(path.join(root,'src',kind+'.html'),'utf8'),L=require(path.join(root,'locales',kind+'.cjs'));
const used=new Set([...s.matchAll(/text\('(\w+)'/g),...s.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]));
const dynamic=['2d','question','mission','result','why','hint'];
const miss=[...used].filter(k=>!(k in L.en)&&!dynamic.includes(k)),en=Object.keys(L.en);
const problems=[];if(miss.length)problems.push('missing: '+miss.join(', '));
for(const l in L){for(const k of en){if(!(k in L[l]))problems.push(l+' lacks '+k);const a=(L.en[k].match(/\{\w+\}/g)||[]).sort().join(),b=(String(L[l][k]).match(/\{\w+\}/g)||[]).sort().join();if(a!==b)problems.push(l+' '+k+' placeholders '+a+' vs '+b);}
 if(['es','fr','de','nl','fi','nb','da','pt','it','ro','pl','tr'].includes(l))for(const k of en){const m=String(L[l][k]).match(/\b\d+\.\d+\b/g);if(m)problems.push(l+' '+k+' decimal dot '+m.join(' '));}}
for(const slip of new Set([...s.matchAll(/slip=\x27(\w+)\x27/g)].map(m=>m[1])))for(const l in L){const key='slip'+slip[0].toUpperCase()+slip.slice(1);if(!L[l][key])problems.push(l+' lacks '+key);}
console.log(kind,Object.keys(L).length,'languages,',en.length,'keys');console.log(problems.length?problems.join('\n'):'ok');process.exitCode=problems.length?1:0;
