// Checks every proposed answer and slip for ELECTRICITY_PLAN.md (node tools/game-kit/check-electricity.cjs): prints the
// exact answer and flags any slip within 2% of the answer or of another slip. The window is purely relative because charges
// near 10⁻¹⁹ C would fall inside the family's usual +1e-12 absolute slack.
const k=8.99e9,e=1.602e-19,me=9.109e-31,mp=1.673e-27,g=9.8,n=8.5e28,cu=1.68e-8,al=2.65e-8,ni=1.10e-6,cw=4180;
const games={
rubbing:[
 ['balloon nC',-3e12*e*1e9,{sign:3e12*e*1e9,coulombs:-3e12*e,divided:3e12/e*1e9}],
 ['hair nC',3e12*e*1e9,{sameSign:-3e12*e*1e9,none:0}],
 ['count',8e-9/e,{multiplied:8e-9*e,nano:8/e}],
 ['quantum n',2.4e-18/e,{inverted:e/2.4e-18}],
 ['ion C',2*e,{sign:-2*e,oneElectron:e}],
],
oildrop:[
 ['q C',3.27e-15*g*0.01/1000,{noGravity:3.27e-15*0.01/1000,noDistance:3.27e-15*g/1000}],
 ['n',3.27e-15*g*0.01/1000/e,{inverted:e/(3.27e-15*g*0.01/1000)}],
 ['V',4.9e-15*g*0.012/(3*e),{oneElectron:4.9e-15*g*0.012/e,noDistance:4.9e-15*g/(3*e)}],
 ['e',1.6e-19,{smallest:4.8e-19,difference:3.2e-19}],
 ['newV',900*2/3,{multiplied:900*3/2,halved:450}],
],
share:[
 ['B',6,{allMoved:12,noneMoved:0}],
 ['A',3,{threeWay:4,firstOnly:6}],
 ['plastic A',12,{likeMetal:6,gaveAll:0}],
 ['small (wire)',16*1/4,{equal:8,swapped:12,area:16*1/10}],
 ['C',1.5,{firstOnly:3,ignoredSign:3.5,threeWay:2}],
],
tester:[
 ['I',12/(ni*1/0.5e-6),{multiplied:12*ni/0.5e-6,inverted:ni/0.5e-6/12,noMm:12/(ni*1/0.5)}],
 ['I glass',12/(1e12*0.1/1e-4),{multiplied:12*1e12*0.1/1e-4,noArea:12/(1e12*0.1),units:12/(1e12*10/1)}],
 ['L',10*0.5e-6/ni,{inverted:10*ni/0.5e-6,noMm:10*0.5/ni}],
 ['A mm2',1*al/cu,{inverted:cu/al,same:1}],
 ['R lead',3.5e-5*0.06/(Math.PI*0.35e-3**2),{diameterAsRadius:3.5e-5*0.06/(Math.PI*0.7e-3**2),noPi:3.5e-5*0.06/(0.35e-3**2)}],
],
levitate:[
 ['r cm',100*Math.sqrt(k*(40e-9)**2/(1e-3*g)),{notSquared:100*k*(40e-9)**2/(1e-3*g),metres:Math.sqrt(k*(40e-9)**2/(1e-3*g))}],
 ['q nC',1e9*0.05*Math.sqrt(1.5e-3*g/k),{notSquared:1e9*0.05*1.5e-3*g/k,coulombs:0.05*Math.sqrt(1.5e-3*g/k)}],
 ['r2 cm',100*Math.sqrt(k*(40e-9)**2/(1e-3*g))*Math.SQRT2,{doubled:2*100*Math.sqrt(k*(40e-9)**2/(1e-3*g)),same:100*Math.sqrt(k*(40e-9)**2/(1e-3*g)),quadrupled:4*100*Math.sqrt(k*(40e-9)**2/(1e-3*g))}],
 ['N mN',(3e-3*g+1e-3*g)*1e3,{noPush:3e-3*g*1e3,minus:(3e-3-1e-3)*g*1e3,topOnly:1e-3*g*1e3}],
 ['m g',1e3*k*(30e-9)**2/(g*0.02**2),{notSquared:1e3*k*(30e-9)**2/(g*0.02),kilograms:k*(30e-9)**2/(g*0.02**2)}],
],
coulomb:[
 ['F',k*2e-6*3e-6/0.09,{notSquared:k*2e-6*3e-6/0.3,centimetres:k*2e-6*3e-6/900}],
 ['x',0.9*2/3,{midpoint:0.45,noRoot:0.72,outside:1.8}],
 ['Fnet',k*1e-12*(1/0.01+1/0.04),{subtracted:k*1e-12*(1/0.01-1/0.04),firstOnly:k*1e-12/0.01}],
 ['q uC',1e6*1.8*0.25/(k*5e-6),{notSquared:1e6*1.8*0.5/(k*5e-6),coulombs:1.8*0.25/(k*5e-6)}],
 ['F2',k*1e-12/0.01,{doubled:2*k*1e-12/0.01,quadrupled:4*k*1e-12/0.01,halved:k*1e-12/0.02}],
],
fieldprobe:[
 ['E',0.6e-3/2e-9,{multiplied:0.6e-3*2e-9,inverted:2e-9/0.6e-3,noNano:0.6e-3/2,noMilli:0.6/2e-9}],
 ['E2',k*5e-9/0.09,{notSquared:k*5e-9/0.3,centimetres:k*5e-9/900}],
 ['F mN',1.8,{same:0.6,ratioInverted:0.2,newtons:1.8e-3}],
 ['Emid',2*k*4e-9/0.04,{cancelled:0,oneCharge:k*4e-9/0.04,fullGap:2*k*4e-9/0.16}],
 ['r',Math.sqrt(k*10e-9/1000),{notRoot:k*10e-9/1000}],
],
deflect:[
 ['E',500/0.02,{multiplied:500*0.02,cm:500/2}],
 ['a',e*15000/me,{protonMass:e*15000/mp,forceOnly:e*15000}],
 ['y mm',1e3*0.5*e*15000/me*(0.05/2e7)**2,{noHalf:1e3*e*15000/me*(0.05/2e7)**2,metres:0.5*e*15000/me*(0.05/2e7)**2}],
 ['V',2*0.005*me*0.02*(2e7)**2/(e*0.05**2),{noHalf:0.005*me*0.02*(2e7)**2/(e*0.05**2),field:2*0.005*me*(2e7)**2/(e*0.05**2)}],
 // Asked in µm when built (−0.00449 mm loses its digits at 3 decimals); the electron's bend is a slip in µm or in mm.
 ['proton y µm',-1e6*0.5*e*15000/mp*(0.05/2e7)**2,{sameAsElectron:1e6*0.5*e*15000/me*(0.05/2e7)**2,sameAsElectronMm:1e3*0.5*e*15000/me*(0.05/2e7)**2,mirrored:-1e6*0.5*e*15000/me*(0.05/2e7)**2,mirroredMm:-1e3*0.5*e*15000/me*(0.05/2e7)**2,sameDirection:1e6*0.5*e*15000/mp*(0.05/2e7)**2,millimetres:-1e3*0.5*e*15000/mp*(0.05/2e7)**2}],
],
potmap:[
 ['V',k*2e-9/0.3,{squared:k*2e-9/0.09,centimetres:k*2e-9/30}],
 ['W nJ',1e9*1e-9*(k*2e-9/0.1-k*2e-9/0.3),{finalOnly:1e9*1e-9*k*2e-9/0.1,fieldWork:-1e9*1e-9*(k*2e-9/0.1-k*2e-9/0.3)}],
 ['W ring',0,{potential:1e9*1e-9*k*2e-9/0.3,forceTimesPath:1e9*1e-9*k*2e-9/0.09*Math.PI*0.3}],
 ['Vmid',k*4e-9/0.2,{subtracted:k*2e-9/0.2,field:k*2e-9/0.04}],
 ['r ring',k*4e-9/120,{squared:Math.sqrt(k*4e-9/120)}],
],
accelerator:[
 ['E J',e*1000,{noCharge:1000,halved:e*1000/2}],
 ['v',Math.sqrt(2*e*250/me),{noTwo:Math.sqrt(e*250/me),noRoot:2*e*250/me}],
 ['vp',Math.sqrt(2*e*250/mp),{electronMass:Math.sqrt(2*e*250/me),noRoot:2*e*250/mp}],
 ['alpha eV',2000,{oneCharge:1000,squared:4000,joules:2*e*1000}],
 ['Vstop',me*(4e6)**2/(2*e),{noHalf:me*(4e6)**2/e,joules:me*(4e6)**2/2}],
],
batteries:[
 ['series',6,{parallel:1.5}],
 ['reversed',3,{dropped:4.5,ignored:6}],
 ['parallel',1.5,{added:4.5}],
 ['W',4.5,{divided:18,inverted:0.5/9}],
 ['cells',Math.ceil(9/1.2),{roundedDown:7,oneFive:6}],
],
voltwalk:[
 ['reversed',-9,{sign:9}],
 ['open switch',9,{zero:0,swappedGap:-9}],
 ['wire',0,{battery:9,batteryNegative:-9}],
 ['junction',12-2*2,{drop:4,againstPlus:-4,wholeBattery:12}],
 ['opposed',7.5,{added:10.5,ignoredCell:9}],
],
turnstile:[
 ['I',30/60,{minutes:30,inverted:60/30}],
 ['Q',2*300,{minutes:10,divided:2/300}],
 ['electrons/s',1/e,{multiplied:e}],
 ['Q phone',2*1.5*3600,{hours:3,minutes:180}],
 ['t',90/0.25,{multiplied:22.5,minutes:6}],
],
drift:[
 ['v mm/s',1e3*1/(n*e*1e-6),{areaMm:1e3*1/(n*e*1),metres:1/(n*e*1e-6)}],
 ['t h',1/(1/(n*e*1e-6))/3600,{seconds:1/(1/(n*e*1e-6)),minutes:1/(1/(n*e*1e-6))/60}],
 ['I',n*e*2.5e-6*1e-4,{areaMm:n*e*2.5*1e-4,speedMetres:n*e*2.5e-6*0.1}],
 ['v4 mm/s',1e3*1/(n*e*4e-6),{half:1e3*1/(n*e*2e-6),same:1e3*1/(n*e*1e-6)}],
 ['signal ns',1e9*3/2e8,{electrons:1e9*3/(1/(n*e*1e-6)),seconds:3/2e8}],
],
wire:[
 ['R',cu*2/0.5e-6,{noMm:cu*2/0.5}],
 ['R2L',6,{halved:1.5,squared:12}],
 ['R2d',2,{halved:4,doubled:16}],
 ['stretch',20,{lengthOnly:10,unchanged:5}],
 ['L',20*Math.PI*1e-4**2/ni,{diameterAsRadius:20*Math.PI*2e-4**2/ni,noPi:20*(2e-4**2/4)/ni}],
],
filament:[
 ['Rcu',10*(1+0.00393*50),{noBase:10*0.00393*50,absolute:10*(1+0.00393*70)}],
 ['Rw',40*(1+0.0045*2480),{noBase:40*0.0045*2480}],
 ['ratio',(40*(1+0.0045*2480))/40,{inverted:40/(40*(1+0.0045*2480))}],
 ['T',(119.25/100-1)/0.00385,{noBase:119.25/(100*0.00385)}],
 ['T2',20+1/0.00393,{rise:1/0.00393}],
],
ohm:[
 ['I',3,{multiplied:48,inverted:1/3}],
 ['R',24,{multiplied:1.5,inverted:0.25/6}],
 ['V',110,{divided:440,inverted:0.5/220}],
 ['I9',9/(2/0.1),{multiplied:9*(2/0.1),resistance:2/0.1}],
 ['R led',7/0.02,{noLed:9/0.02,ledOnly:2/0.02}],
],
fuse:[
 ['I',230/26.45,{multiplied:230*26.45,inverted:26.45/230}],
 ['Rmin',6,{multiplied:24,inverted:2/12}],
 ['I mA',230,{amps:0.23}],
 ['Vmax',4.7,{divided:470}],
 ['Ishort',240,{multiplied:0.6,inverted:0.05/12}],
],
series:[
 ['I',1,{oneBulb:3,resistance:12}],
 ['R',10,{parallel:1/(1/2+1/3+1/5),average:10/3}],
 ['V5',10,{equalShare:20/3,current:2}],
 ['I4',0.75,{same:1,more:4/3}],
 ['bulbs',92,{multiplied:575}],
],
divider:[
 ['Vout',6,{swapped:3,noSum:18}],
 ['R2',1.0,{swapped:1.96,total:1.4*12/5}],
 ['Vldr',9*1/11,{swapped:9*10/11,noSum:0.9}],
 ['Rth',4.7,{doubled:9.4,half:2.35}],
 ['Vnode',6,{twoOnly:4,top:10}],
],
parallel:[
 ['R',2,{added:9,average:4.5,sumInverse:0.5}],
 ['I',6,{series:12/9,oneBranch:4}],
 ['I2',2,{same:3,oneLamp:1}],
 ['Radd',1/(1/4-1/10),{subtracted:6,inverted:1/4-1/10}],
 ['lamps',32,{multiplied:8}],
],
junction:[
 ['I2',1.8,{added:4.2,whole:3}],
 ['I2ohm',4,{swapped:2,equal:3}],
 ['Imain',1.0,{largest:0.5,average:1/3}],
 ['I4',3,{shared:1.8,halved:1.5}],
 ['shunt',0.05*20/0.95,{noSubtract:0.05*20/1,inverted:20*0.95/0.05}],
],
brightness:[
 ['P',24,{divided:6,inverted:1/6}],
 ['R',230**2/60,{VoverP:230/60,current:60/230}],
 ['P each',15,{halved:30,rated:60}],
 ['P60',(()=>{const a=230**2/60,b=230**2/100,i=230/(a+b);return i*i*a;})(),{rated:60,swapped:(()=>{const a=230**2/60,b=230**2/100,i=230/(a+b);return i*i*b;})()}],
 ['Phalf',25,{halved:50,rated:100}],
],
powerline:[
 ['loss W',(1e5/1000)**2*0.5,{VsquaredR:1000**2/0.5,drop:1e5/1000*0.5}],
 ['loss10 W',(1e5/1e4)**2*0.5,{tenth:500,same:5000}],
 ['V',1e6/Math.sqrt(1e4/2),{noRoot:1e6/(1e4/2),current:Math.sqrt(1e4/2)}],
 ['loss',20**2*4,{IR:80}],
 ['R',230**2/2000,{VoverP:230/2000,current:2000/230}],
],
kettle:[
 ['t s',1*cw*80/2000,{minutes:1*cw*80/2000/60,fullRange:1*cw*100/2000}],
 ['E kJ',1500*180/1e3,{minutesEnergy:1500*3/1e3,joules:1500*180}],
 ['t90',1*cw*80/2000/0.9,{times:1*cw*80/2000*0.9,minutes:1*cw*80/2000/0.9/60}],
 ['P',0.5*cw*80/60,{fullLitre:1*cw*80/60,seconds:0.5*cw*80}],
 ['t115',1*cw*80/(2000/4),{half:1*cw*80/(2000/2),same:1*cw*80/2000}],
],
bill:[
 ['kWh',0.5,{wh:500,joulesKwh:500*3600}],
 ['standby',2*24*30/1000,{wh:1440,oneDay:2*24/1000}],
 ['kJ',15*3600/1000,{minutes:15*60/1000,joules:15*3600}],
 ['saved',51,{wh:51000,oldOnly:60}],
 ['Wh',3*3.7,{noMilli:3000*3.7,charge:3}],
],
};
const near=(p,q)=>Math.abs(p-q)<=0.02*Math.abs(q);
let bad=0;
for(const [kind,tests] of Object.entries(games)){
  for(const [name,ans,slips] of tests){
    const list=Object.entries(slips);
    const issues=[];
    for(const [s,v] of list){if(!Number.isFinite(v))issues.push(s+' not finite');else if(near(v,ans))issues.push(s+' within 2% of answer');}
    for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(near(list[i][1],list[j][1])||near(list[j][1],list[i][1]))issues.push(list[i][0]+'≈'+list[j][0]);
    if(issues.length)bad++;
    console.log(kind.padEnd(12),name.padEnd(14),Number(ans.toPrecision(5)),'|',list.map(([s,v])=>s+'='+Number(v.toPrecision(4))).join(' '),issues.length?'  <<< '+issues.join('; '):'');
  }
}
console.log(bad?bad+' tests with problems':'all slips clear of the answer and of each other');
