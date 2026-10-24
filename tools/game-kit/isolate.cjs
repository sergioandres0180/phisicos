// isolateRuns from add-lang.cjs, as a module (that script runs on load): in right-to-left text, each left-to-right run
// (a formula, a number with its unit) is wrapped in LRI…PDI so it keeps its own order.
const rtlLetters=/([\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]+)/;
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
module.exports=isolateRuns;
