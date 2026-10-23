// Adds Swedish (sv) to the site. Idempotent: each step is skipped when Swedish is already there.
//   node tools/game-kit/add-sv.cjs <root> shell     — pages, topics, collections, and the lab's translation table
//   node tools/game-kit/add-sv.cjs <root> games     — every game with a fragment in tools/game-kit/text/sv/<kind>.cjs
// A game's fragment holds its own strings; strings it shares with Pascal's Barrel (barrel.cjs) are taken from barrel's sv.
const fs=require('fs'),path=require('path');
const [root,step]=process.argv.slice(2);
const L=f=>path.join(root,'locales',f),T=f=>path.join(root,'tools/game-kit/text/sv',f);
const lit=v=>JSON.stringify(v);
// Insert `sv:{...}` after each block whose first line starts with `ja:{`, in order, taking values from `list`.
function afterJa(file,list){
  const lines=fs.readFileSync(file,'utf8').split('\n');let n=0;
  for(let i=0;i<lines.length;i++){
    if(!/^\s*ja:\{/.test(lines[i]))continue;
    let end=i;while(!/^\s*\}/.test(lines[end+1]))end++;
    const indent=lines[i].match(/^\s*/)[0];
    lines[end]=lines[end].replace(/,?\s*$/,',');
    lines.splice(end+1,0,indent+'sv:'+lit(list[n++]));i=end+1;
  }
  if(n!==list.length)throw new Error(path.basename(file)+': '+n+' ja blocks, '+list.length+' sv values');
  fs.writeFileSync(file,lines.join('\n'));
}
if(step==='shell'){
  const s=require(T('site.cjs'));
  // Pages: a static sv block after ja.
  let p=fs.readFileSync(L('pages.cjs'),'utf8');
  if(!/\n sv: \{/.test(p)){
    const mark='\n};\n// Shared navigation';if(!p.includes(mark))throw new Error('pages mark');
    p=p.replace(mark,',\n sv: '+lit(s.pages).replace(/^\{/,'{\n ')+mark);fs.writeFileSync(L('pages.cjs'),p);
  }
  // Topics: section, index, ui, then each topic in file order.
  let t=fs.readFileSync(L('topics.cjs'),'utf8');
  if(!t.includes("sv:'/sv/spel/'")){
    t=t.replace(/(section: \{[^\n]*ja:'\/ja\/gemu\/')\}/,"$1,sv:'/sv/spel/'}");fs.writeFileSync(L('topics.cjs'),t);
    const ids=require(L('topics.cjs')).topics.map(x=>x.id);
    afterJa(L('topics.cjs'),[s.index,s.ui,...ids.map(id=>{if(!s.topics[id])throw new Error('topic '+id);return s.topics[id];})]);
  }
  // Collections: ui, then each tag in file order.
  if(!/\bsv:\{/.test(fs.readFileSync(L('tags.cjs'),'utf8'))){
    const ids=require(L('tags.cjs')).tags.map(x=>x.id);
    afterJa(L('tags.cjs'),[s.tagsUi,...ids.map(id=>{if(!s.tags[id])throw new Error('tag '+id);return s.tags[id];})]);
  }
  // The lab's translation table: one more column.
  const rows=fs.readFileSync(L('translations.tsv'),'utf8').trimEnd().split('\n');
  if(!rows[0].split('\t').includes('sv')){
    const sv=fs.readFileSync(T('lab.txt'),'utf8').trimEnd().split('\n');
    if(sv.length!==rows.length-1)throw new Error('lab has '+sv.length+' lines, table '+(rows.length-1));
    fs.writeFileSync(L('translations.tsv'),rows.map((r,i)=>r+'\t'+(i?sv[i-1]:'sv')).join('\n')+'\n');
  }
  console.log('shell done');
}
if(step==='games'){
  const barrelFrag=require(T('barrel.cjs'));
  const barrel=require(L('barrel.cjs'));
  const kinds=require(L('games.cjs')).map(g=>g.kind);let added=0;const missing=[];
  for(const kind of kinds){
    const file=L(kind+'.cjs'),src=fs.readFileSync(file,'utf8');
    if(/\n  "sv": \{/.test(src))continue;
    if(!fs.existsSync(T(kind+'.cjs'))){missing.push(kind);continue;}
    const copy=require(file),frag=require(T(kind+'.cjs')),sv={};
    for(const k of Object.keys(copy.en)){
      if(k in frag)sv[k]=frag[k];
      else if(kind!=='barrel'&&k in barrel.en&&barrel.en[k]===copy.en[k]&&barrel.nb[k]===copy.nb[k])sv[k]=barrelFrag[k];
      else throw new Error(kind+': no sv for '+k);
      if(typeof sv[k]!==typeof copy.en[k])throw new Error(kind+': bad type for '+k);
    }
    const extra=Object.keys(frag).filter(k=>!(k in copy.en));if(extra.length)throw new Error(kind+': unknown keys '+extra);
    const end=src.lastIndexOf('\n};');if(end<0)throw new Error(kind+': no end');
    const block=',\n  "sv": '+JSON.stringify(sv,null,2).replace(/\n/g,'\n  ');
    fs.writeFileSync(file,src.slice(0,end).replace(/\s*$/,'')+block+src.slice(end));added++;
  }
  console.log('added sv to',added,'games;',missing.length,'still without a fragment'+(missing.length?': '+missing.join(' '):''));
}
