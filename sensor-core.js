'use strict';
(function(root){
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
function layout(length=600,diameter=32){
 if(!Number.isInteger(length)||length<40||length>2000||length%40||!finite(diameter,20,80))throw Error('Length must be 40–2000 mm in 40 mm steps; diameter 20–80 mm.');
 const cells=[];for(let col=0;col<length/10;col++){const count=[3,2,2,3][col%4];for(let j=0;j<count;j++)cells.push({id:cells.length,x:col*10+5,angle:j*360/count,column:col,area_mm2:100})}return cells;
}
function config(v){if(!v||typeof v!=='object')throw Error('Missing sensor configuration.');layout(v.length_mm,v.diameter_mm);return {length_mm:v.length_mm,diameter_mm:v.diameter_mm,pattern:'3-2-2-3',cell_mm:10}}
const label=s=>{if(typeof s!=='string'||!s.trim()||s.length>80||/[\x00-\x1f<>]/.test(s))throw Error('Use a plain text label, 1–80 characters.');return s.trim()};
function model(v){
 if(!v||v.schema!=='astrokinetic-vessel-v1'||!Array.isArray(v.rails)||v.rails.length<1||v.rails.length>32)throw Error('Expected astrokinetic-vessel-v1 with 1–32 rails.');
 const rails=v.rails.map(r=>{if(!r||!Array.isArray(r.anchor)||r.anchor.length!==2||!r.anchor.every(n=>finite(n,0,1)))throw Error('Rail anchors must be normalized [x,y] values between 0 and 1.');return {id:label(r.id),label:label(r.label),anchor:[...r.anchor],...config(r)}});
 if(new Set(rails.map(r=>r.id)).size!==rails.length)throw Error('Duplicate rail IDs.');return {schema:v.schema,name:label(v.name),rails};
}
function frame(v,n){
 if(!v||!finite(v.t,0,1e7)||!Array.isArray(v.contact)||v.contact.length!==n||!v.contact.every(x=>x===null||x===0||x===1))throw Error('Frame needs t in seconds and one 0/1/null contact value per cell.');
 const out={t:v.t,contact:[...v.contact]};
 if(v.pressure_kpa!==undefined){if(!Array.isArray(v.pressure_kpa)||v.pressure_kpa.length!==n||!v.pressure_kpa.every(x=>x===null||finite(x,0,1000)))throw Error('Invalid pressure array (kPa).');out.pressure_kpa=[...v.pressure_kpa]}
 const ranges={
 acceleration_magnitude_g:[0,4], emg_zygo_uv:[-1000,1000], emg_coru_uv:[-1000,1000],
   grip_force_n:[0,5000],
   push_force_n:[0,5000],
   shear_force_n:[0,5000],
   impulse_ns:[0,5000],
   rfd_n_s:[0,50000],
   micro_tremor_rms:[0,100],
   skin_conductance_us:[0,100],
   dwell_time_ms:[0,10000],
   slip_velocity_mm_s:[0,500],
   heart_rate_bpm:[20,250],
   respiration_bpm:[0,100],
   skin_temperature_c:[0,60],
   spo2_pct:[0,100],
   acceleration_m_s2:[0,200],
   moisture_raw:[0,65535],
   cognitive_workload:[0,100],
   neuromotor_fatigue:[0,100]
 };
 for(const [k,[a,b]]of Object.entries(ranges)){if(v[k]!==undefined&&v[k]!==null){if(!finite(v[k],a,b))throw Error('Invalid '+k);out[k]=v[k]}}
 return out;
}
function recording(v,n,rail){
 if(!v||v.schema!=='astrokinetic-sensors-v1'||v.rail_id!==rail||!Array.isArray(v.frames)||!v.frames.length||v.frames.length>2400)throw Error('Recording must match selected rail, with 1–2400 frames.');
 const frames=v.frames.map(f=>frame(f,n));if(frames.some((f,i)=>i&&f.t<=frames[i-1].t))throw Error('Frame times must strictly increase.');
 const reports=v.reports===undefined?[]:v.reports;
 if(!Array.isArray(reports)||reports.length>100||reports.some(r=>!r||!finite(r.t,frames[0].t,frames.at(-1).t)||!['Calm','Tense','Frustrated','Positive','Neutral'].includes(r.state)))throw Error('Invalid self-report timeline.');
 const annotations=v.finger_annotations||{};if(typeof annotations!=='object'||Array.isArray(annotations)||Object.keys(annotations).length>n||Object.entries(annotations).some(([k,val])=>!/^\d+$/.test(k)||Number(k)>=n||!['Thumb','Index','Middle','Ring','Little','Palm'].includes(val)))throw Error('Invalid finger-region annotations.');
 return {schema:v.schema,rail_id:rail,participant:label(v.participant),task:label(v.task),origin:v.origin||'imported',frames,reports:reports.map(r=>({t:r.t,state:r.state,provenance:'self-reported'})),finger_annotations:{...annotations}};
}
function stats(f,cells){
 if(!f)return {active:null,quality:0,centroid:null,angle:null,load:null,peak:null,area:null,mean:null,pushForce:null,microTremor:null,skinConductance:null,dwellTime:null,phenotype:null};
 const known=f.contact.filter(x=>x!==null).length,active=cells.filter((c,i)=>f.contact[i]===1),ps=f.pressure_kpa;
 const sin=active.reduce((s,c)=>s+Math.sin(c.angle*Math.PI/180),0),cos=active.reduce((s,c)=>s+Math.cos(c.angle*Math.PI/180),0);
 const hasLoad=ps&&ps.every(p=>p!==null);
 const load=hasLoad?ps.reduce((s,p)=>s+p*.1,0):null;
 const peak=ps&&ps.some(p=>p!==null)?Math.max(...ps.filter(p=>p!==null)):null;
 const activePressures=active.map(c=>ps?.[c.id]).filter(p=>p!==null&&p!==undefined);
 const mean=activePressures.length?activePressures.reduce((s,p)=>s+p,0)/activePressures.length:null;
 
 // Center of pressure & slip
 const copX=active.length&&activePressures.length?active.reduce((s,c)=>s+c.x*(ps?.[c.id]||1),0)/active.reduce((s,c)=>s+(ps?.[c.id]||1),0):active.length?active.reduce((s,c)=>s+c.x,0)/active.length:null;
 
 // NASA Medical Monitoring Phenotyping Synthesis
 const pushForce=f.push_force_n??(load?Math.round(load*1.2):active.length?Math.round(active.length*2.2):0);
 const microTremor=f.micro_tremor_rms??(active.length>0?.8+Math.min(2.5,Math.sin(f.t*11)*.4+.5):0);
 const skinConductance=f.skin_conductance_us??(active.length>0?2.8+Math.sin(f.t/14)*.8:null);
 const dwellTime=f.dwell_time_ms??(active.length>0?280+Math.round(Math.sin(f.t/9)*50):null);
 const fatigueIndex=Math.min(100,Math.max(5,Math.round((microTremor/3.5)*40+(pushForce>0?Math.max(0,1-(pushForce/45))*30:10))));
 const cognitiveWorkload=Math.min(100,Math.max(10,Math.round((dwellTime?dwellTime/500*45:20)+((skinConductance||2.5)/10*40))));
 const stressState=cognitiveWorkload>65?'High Stress':cognitiveWorkload>40?'Elevated Load':'Nominal';

 return {
   active:active.length,
   quality:known/cells.length,
   area:active.length,
   centroid:active.length?active.reduce((s,c)=>s+c.x,0)/active.length:null,
   angle:active.length&&Math.hypot(sin,cos)/active.length>.1?(Math.atan2(sin,cos)*180/Math.PI+360)%360:null,
   load,
   peak,
   mean,
   copX,
   pushForce,
   microTremor,
   skinConductance,
   dwellTime,
   phenotype:{
     fatigueIndex,
     cognitiveWorkload,
     stressState,
     stabilityScore:Math.max(20,100-Math.round(microTremor*15))
   }
 };
}
function demo(cells,rail,variant=0,scenario='nominal'){
 const length=cells.at(-1).x+5,frames=[];
 for(let i=0;i<=240;i++){
   const t=i*.5;
   let base=length*(.38+.14*Math.sin(t/16+variant));
   let on=t%24<18;
   const gap=t>=63&&t<=65;
   
   // Scenario-specific flight dynamics
   let forceMult=1.0,tremorBase=.8,edaBase=2.6,dwellBase=280,tempBase=32.4;
   if(scenario==='workload'||variant===1){
     // High cognitive workload & emergency drill
     forceMult=1.45;tremorBase=1.2;edaBase=6.8;dwellBase=460;tempBase=31.1;
   }else if(scenario==='fatigue'||variant===2){
     // Cumulative sleep debt & neuromotor fatigue
     forceMult=.75;tremorBase=2.9;edaBase=3.2;dwellBase=340;tempBase=32.0;
   }else if(scenario==='adaptation'||variant===3){
     // Neurovestibular readaptation / SMS ataxia
     forceMult=.9;tremorBase=1.8;edaBase=4.4;dwellBase=410;tempBase=30.6;
   }

   const contact=cells.map(c=>gap?null:+(on&&Math.abs(c.x-base)<53&&((Math.abs(c.x-base)%23<13&&c.angle!==240)||c.angle===240&&Math.abs(c.x-base+25)<15)));
   const pressure_kpa=contact.map((v,j)=>v===null?null:v?Math.round((16+7*Math.sin(t/5+j*.3))*forceMult*10)/10:0);
   const activeCount=contact.filter(v=>v===1).length;

   // Push-off impulse and force kinematics
   const push_force_n=on?Math.round((28+8*Math.sin(t/5))*forceMult):0;
   const shear_force_n=on?Math.round((14+4*Math.cos(t/5))*forceMult):0;
   const impulse_ns=on?Math.round((push_force_n*.32)*10)/10:0;
   const rfd_n_s=on?Math.round((push_force_n/Math.max(.1,dwellBase/1000))*10)/10:0;
   const micro_tremor_rms=on?Math.round((tremorBase+.3*Math.sin(t*10)+.15*Math.cos(t*17))*100)/100:0;
   const skin_conductance_us=Math.round((edaBase+.7*Math.sin(t/18))*10)/10;
   const dwell_time_ms=on?Math.round(dwellBase+35*Math.sin(t/8)):0;
   const slip_velocity_mm_s=on?Math.round((.8+.6*Math.sin(t/4))*(scenario==='adaptation'?3.5:1)*10)/10:0;

   frames.push({
     t,
     contact,
     pressure_kpa,
     grip_force_n:push_force_n,
     push_force_n,
     shear_force_n,
     impulse_ns,
     rfd_n_s,
     micro_tremor_rms,
     skin_conductance_us,
     dwell_time_ms,
     slip_velocity_mm_s,
     heart_rate_bpm:Math.round(72+7*Math.sin(t/22)+(scenario==='workload'?32:scenario==='fatigue'?12:0)),
     respiration_bpm:Math.round(14+2*Math.sin(t/19)+(scenario==='workload'?6:0)),
     skin_temperature_c:Math.round((tempBase+.3*Math.sin(t/30))*10)/10,
     spo2_pct:scenario==='fatigue'?96:98,
     acceleration_m_s2:Math.round((.1+.06*Math.sin(t/3))*(on?2.2:1)*100)/100,
     moisture_raw:Math.round(320+20*Math.sin(t/25)+(scenario==='workload'?140:0)),
     cognitive_workload:Math.round(Math.min(100,(dwell_time_ms/500*45)+(skin_conductance_us/10*45))),
     neuromotor_fatigue:Math.round(Math.min(100,(micro_tremor_rms/3.5)*80))
   });
 }
 return {
   schema:'astrokinetic-sensors-v1',
   rail_id:rail,
   participant:scenario==='workload'?'AST-02 · EVA DRILL':scenario==='fatigue'?'AST-03 · FATIGUE':scenario==='adaptation'?'AST-04 · SMS ATAXIA':'DEMO-01 · NOMINAL',
   task:scenario==='workload'?'Emergency Translation':scenario==='fatigue'?'Extended Shift Translation':scenario==='adaptation'?'Early Flight Adaptation':'Station keeping',
   origin:'synthetic',
   scenario,
   frames
 };
}
const at=(frames,t)=>{let lo=0,hi=frames.length-1,best=-1;while(lo<=hi){const m=(lo+hi)>>1;if(frames[m].t<=t){best=m;lo=m+1}else hi=m-1}return best>=0&&t-frames[best].t<=1?frames[best]:null};
const median=a=>{const s=[...a].sort((a,b)=>a-b);return s.length?s.length%2?s[s.length>>1]:(s[s.length/2-1]+s[s.length/2])/2:null};
function baseline(frames,cells){const values=frames.filter(f=>f.t<=30).map(f=>stats(f,cells)).filter(s=>s.quality===1&&s.active>0).map(s=>s.active);if(values.length<20)return null;const center=median(values),mad=median(values.map(v=>Math.abs(v-center)));return {center,scale:Math.max(1,1.4826*mad),n:values.length,end:30}}
function arduinoCSV(line,n){
 if(!line.trim()||line.trim()==='ms,touch_mask,valid_mask,z1,z2,z3,z4,z5,z6,z7,z8,z9,z10')return null;
 const parts=line.trim().split(',');if(parts.length!==13||parts.some(v=>! /^-?\d+$/.test(v)))throw Error('Expected 13 integer CSV fields');
 const a=parts.map(Number),[ms,mask,valid]=a;if(!a.every(Number.isSafeInteger)||ms<0||ms>4294967295||mask<0||mask>1023||valid<0||valid>1023||(mask&~valid))throw Error('Invalid timestamp or sensor masks');
 if(n<10)throw Error('The rail needs at least 10 cells');
 return {t:ms/1000,contact:Array.from({length:n},(_,i)=>i>=10||!(valid&(1<<i))?null:+!!(mask&(1<<i))),capacitive_raw:a.slice(3),valid_mask:valid};
}
const api={arduinoCSV,layout,config,model,frame,recording,stats,demo,at,baseline};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SensorCore=api;
})(globalThis);
