// Adds a language to the site, inserted after an existing one. Idempotent: each step is skipped when the language is already there.
//   node tools/game-kit/add-lang.cjs <root> <lang> <after> shell   — pages, topics, collections, legacy routes, and the lab's translation table
//   node tools/game-kit/add-lang.cjs <root> <lang> <after> games   — every game with a fragment in tools/game-kit/text/<lang>/<kind>.cjs
// A game's fragment holds its own strings. Values that every Latin-script language keeps identical to English
// (axis labels, formulas, units) are copied from English when the fragment leaves them out.
const fs=require('fs'),path=require('path');
const [root,lang,after,step]=process.argv.slice(2);
if(!root||!/^[a-z]{2}$/.test(lang||'')||!/^[a-z]{2}$/.test(after||''))throw new Error('usage: add-lang.cjs <root> <lang> <after> shell|games');
const L=f=>path.join(root,'locales',f),T=f=>path.join(root,'tools/game-kit/text',lang,f);
const lit=v=>JSON.stringify(v);
// Right-to-left text isolates each left-to-right run inside it (a formula, a number with its unit) between LRI and PDI,
// so the run keeps its own order, even when a closing bracket or a number meets the surrounding right-to-left words.
// Brackets the run doesn't close, and the punctuation around it, stay with the sentence. Strings without right-to-left letters are left alone.
const rtlLetters=/([֐-ࣿיִ-﷿ﹰ-﻿]+)/;
const count=(s,c)=>s.split(c).length-1;
function isolateRuns(text){
  if(typeof text!=='string'||!rtlLetters.test(text))return text;
  return text.split(rtlLetters).map((part,i)=>{
    if(i%2)return part;
    let lead='',run=part,tail='',moved=true;
    while(moved){
      moved=false;
      const a=run.match(/^[\s.,:;!?]*/)[0];lead+=a;run=run.slice(a.length);
      const b=run.match(/[\s.,:;!?]*$/)[0];tail=b+tail;run=run.slice(0,run.length-b.length);
      const open=count(run,'('),close=count(run,')');
      if(open>close&&run.startsWith('(')){lead+='(';run=run.slice(1);moved=true;}
      else if(open>close&&run.endsWith('(')){tail='('+tail;run=run.slice(0,-1);moved=true;}
      else if(close>open&&run.endsWith(')')){tail=')'+tail;run=run.slice(0,-1);moved=true;}
      else if(close>open&&run.startsWith(')')){lead+=')';run=run.slice(1);moved=true;}
    }
    if(!/[A-Za-z0-9Ͱ-Ͽ]/.test(run.replace(/\{\w+\}/g,''))||/<\/?[a-z]/i.test(run))return part;
    return lead+'⁦'+run+'⁩'+tail;
  }).join('');
}
// Keys matching `meta` become page metadata or routes, which stay free of direction marks.
const isolateDeep=(v,meta)=>typeof v==='string'?isolateRuns(v):Array.isArray(v)?v.map(x=>isolateDeep(x,meta)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,meta.test(k)?x:isolateDeep(x,meta)])):v;
// Insert `<lang>:{...}` after each block whose first line starts with `<after>:{`, in order, taking values from `list`.
function insertAfter(file,list){
  const lines=fs.readFileSync(file,'utf8').split('\n');let n=0;const open=new RegExp('^\\s*'+after+':\\{');
  for(let i=0;i<lines.length;i++){
    if(!open.test(lines[i]))continue;
    let end=i;while(!/^\s*\}/.test(lines[end+1]))end++;
    const indent=lines[i].match(/^\s*/)[0];
    lines[end]=lines[end].replace(/,?\s*$/,',');
    lines.splice(end+1,0,indent+lang+':'+lit(list[n++]));i=end+1;
  }
  if(n!==list.length)throw new Error(path.basename(file)+': '+n+' '+after+' blocks, '+list.length+' '+lang+' values');
  fs.writeFileSync(file,lines.join('\n'));
}
if(step==='shell'){
  const site=require(T('site.cjs')),rtl=site.pages.dir==='rtl';
  const s=rtl?isolateDeep(site,/[Tt]itle$|[Dd]escription$/):site;
  // Pages: a static block at the end of the language map.
  let p=fs.readFileSync(L('pages.cjs'),'utf8');
  if(!new RegExp('\\n '+lang+': \\{').test(p)){
    const mark='\n};\n// Shared navigation';if(!p.includes(mark))throw new Error('pages mark');
    p=p.replace(mark,',\n '+lang+': '+lit(s.pages).replace(/^\{/,'{\n ')+mark);fs.writeFileSync(L('pages.cjs'),p);
  }
  // Topics: section, index, ui, then each topic in file order.
  let t=fs.readFileSync(L('topics.cjs'),'utf8');
  if(!t.includes(lang+":'"+s.section+"'")){
    const t2=t.replace(new RegExp("(section: \\{[^\\n]*"+after+":'[^']*')\\}"),"$1,"+lang+":'"+s.section+"'}");
    if(t2===t)throw new Error('topics section mark');fs.writeFileSync(L('topics.cjs'),t2);
    const ids=require(L('topics.cjs')).topics.map(x=>x.id);
    insertAfter(L('topics.cjs'),[s.index,s.ui,...ids.map(id=>{if(!s.topics[id])throw new Error('topic '+id);return s.topics[id];})]);
  }
  // Collections: ui, then each tag in file order.
  if(!new RegExp('\\b'+lang+':\\{').test(fs.readFileSync(L('tags.cjs'),'utf8'))){
    const ids=require(L('tags.cjs')).tags.map(x=>x.id);
    insertAfter(L('tags.cjs'),[s.tagsUi,...ids.map(id=>{if(!s.tags[id])throw new Error('tag '+id);return s.tags[id];})]);
  }
  // Legacy routes: a new language never had pre-topic routes.
  let r=fs.readFileSync(L('legacy-routes.cjs'),'utf8');
  if(!new RegExp('\\n '+lang+': \\{').test(r)){
    r=r.replace(new RegExp('\\n '+after+': \\{\\}\\n\\};'),'\n '+after+': {},\n '+lang+': {}\n};');
    if(!new RegExp('\\n '+lang+': \\{').test(r))throw new Error('legacy mark');fs.writeFileSync(L('legacy-routes.cjs'),r);
  }
  // The lab's translation table: one more column.
  const rows=fs.readFileSync(L('translations.tsv'),'utf8').trimEnd().split('\n');
  if(!rows[0].split('\t').includes(lang)){
    const col=fs.readFileSync(T('lab.txt'),'utf8').trimEnd().split('\n').map(line=>rtl?isolateRuns(line):line);
    if(col.length!==rows.length-1)throw new Error('lab has '+col.length+' lines, table '+(rows.length-1));
    fs.writeFileSync(L('translations.tsv'),rows.map((r,i)=>r+'\t'+(i?col[i-1]:lang)).join('\n')+'\n');
  }
  console.log('shell done');
}
if(step==='games'){
  const latin=['es','fr','de','nl','pt','sv','da','nb','fi','it'];
  const rtl=require(T('site.cjs')).pages.dir==='rtl';
  const kinds=require(L('games.cjs')).map(g=>g.kind);let added=0;const missing=[];
  for(const kind of kinds){
    const file=L(kind+'.cjs'),src=fs.readFileSync(file,'utf8');
    if(new RegExp('\\n  "'+lang+'": \\{').test(src))continue;
    if(!fs.existsSync(T(kind+'.cjs'))){missing.push(kind);continue;}
    const copy=require(file),frag=require(T(kind+'.cjs')),out={};
    for(const k of Object.keys(copy.en)){
      if(k in frag)out[k]=frag[k];
      else if(k!=='route'&&latin.every(l=>!copy[l]||copy[l][k]===copy.en[k]))out[k]=copy.en[k];
      else throw new Error(kind+': no '+lang+' for '+k);
      if(typeof out[k]!==typeof copy.en[k])throw new Error(kind+': bad type for '+k);
      // A right-to-left language isolates its left-to-right runs, and every placeholder, so a filled-in number such as −6 keeps its own direction.
      if(rtl){if(!/^(route|pageTitle|pageDescription)$/.test(k))out[k]=isolateRuns(out[k]);out[k]=out[k].replace(/\{\w+\}/g,'⁨$&⁩');}
      const a=(copy.en[k].match(/\{\w+\}/g)||[]).sort().join(),b=(out[k].match(/\{\w+\}/g)||[]).sort().join();
      if(a!==b)throw new Error(kind+': placeholders of '+k+' are '+b+', expected '+a);
    }
    const extra=Object.keys(frag).filter(k=>!(k in copy.en));if(extra.length)throw new Error(kind+': unknown keys '+extra);
    const end=src.lastIndexOf('\n};');if(end<0)throw new Error(kind+': no end');
    const block=',\n  "'+lang+'": '+JSON.stringify(out,null,2).replace(/\n/g,'\n  ');
    fs.writeFileSync(file,src.slice(0,end).replace(/\s*$/,'')+block+src.slice(end));added++;
  }
  console.log('added',lang,'to',added,'games;',missing.length,'still without a fragment'+(missing.length?': '+missing.join(' '):''));
}
