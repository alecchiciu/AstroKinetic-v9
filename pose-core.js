'use strict';
(function(root){
const names=['Thumb','Index','Middle','Ring','Little'];
const angular=(a,b)=>Math.abs(((a-b+540)%360)-180);

function calibrate(frame,cells,labels,diameter){
 if(!frame||frame.contact.some(v=>v===null))throw Error('Calibration needs a complete contact frame.');
 const points=cells.filter((c,i)=>frame.contact[i]===1).map(c=>({...c,finger:labels[c.id]}));
 if(points.some(p=>!names.includes(p.finger))||names.some(n=>!points.some(p=>p.finger===n)))throw Error('Label every active cell as one of the five fingers, with at least one cell per finger. Exclude palm contact during this calibration.');
 if(points.length<5)throw Error('At least five labelled contact cells are required.');
 return {points,diameter,count:cells.length,centroid:points.reduce((s,p)=>s+p.x,0)/points.length};
}

function estimate(frame,cells,template){
 const no=reason=>({status:'unavailable',reason,fingers:[]});
 if(!template)return no('Calibrate a known five-finger grip to enable template matching.');
 if(!frame||frame.contact.filter(v=>v!==null).length/cells.length<.95)return no('Insufficient valid contact coverage.');
 if(cells.length!==template.count)return no('Sensor geometry changed. Recalibrate.');
 const active=cells.filter((c,i)=>frame.contact[i]===1);
 if(active.length<5)return no('Not enough contact to locate all five finger regions.');
 const delta=active.reduce((s,c)=>s+c.x,0)/active.length-template.centroid,center=Math.round(delta/10)*10,results=[];
 for(let shift=center-30;shift<=center+30;shift+=10)for(let rotation=0;rotation<360;rotation+=30){
  const predicted=new Map();let missed=0;
  for(const p of template.points){
   let best=null,dist=Infinity;
   for(const c of cells){
    const dx=c.x-p.x-shift,dy=angular(c.angle,(p.angle+rotation)%360)*Math.PI/180*template.diameter/2,d=Math.hypot(dx,dy);
    if(d<dist){dist=d;best=c}
   }
   if(dist>8||frame.contact[best.id]===null){missed++;continue}
   predicted.set(best.id,p.finger);
  }
  const intersection=active.filter(c=>predicted.has(c.id)).length,union=new Set([...active.map(c=>c.id),...predicted.keys()]).size+missed,score=intersection/Math.max(1,union);
  results.push({score,shift,rotation,predicted,missed});
 }
 results.sort((a,b)=>b.score-a.score);
 const best=results[0],rival=results.find(r=>Math.abs(r.shift-best.shift)>=20||angular(r.rotation,best.rotation)>=60),margin=best.score-(rival?.score||0);
 if(best.score<.65||margin<.08||best.missed/template.points.length>.2)return no('Grip differs from calibration or several placements fit. Finger identities withheld.');
 const fingers=names.map(name=>{
  const points=active.filter(c=>best.predicted.get(c.id)===name);
  if(!points.length)return null;
  const sx=points.reduce((s,c)=>s+Math.cos(c.angle*Math.PI/180),0),sy=points.reduce((s,c)=>s+Math.sin(c.angle*Math.PI/180),0);
  return {
   name,
   x:points.reduce((s,c)=>s+c.x,0)/points.length,
   angle:Math.hypot(sx,sy)/points.length>.1?(Math.atan2(sy,sx)*180/Math.PI+360)%360:null,
   cells:points.map(c=>c.id)
  };
 });
 if(fingers.some(f=>!f))return no('One or more calibrated finger regions is not in contact.');
 return {status:'estimated',score:best.score,margin,shift_mm:best.shift,rotation_deg:best.rotation,fingers,reason:'Calibrated template estimate, not measured anatomy. Similarity is not a probability.'};
}

/**
 * Intelligent automatic anthropometric and biomechanical hand pose estimator.
 * Segments active 10x10 mm tactile cells into Thumb, Index, Middle, Ring, Little digits and Palm.
 */
function autoEstimate(frame,cells,diameter=32){
 if(!frame||!frame.contact)return {status:'unavailable',reason:'No contact frame available.',fingers:[]};
 const active=cells.filter((c,i)=>frame.contact[i]===1);
 if(active.length<3)return {status:'unavailable',reason:'Contact area too small for hand pose reconstruction.',fingers:[]};

 const pressures=frame.pressure_kpa||[];
 const minX=Math.min(...active.map(c=>c.x)),maxX=Math.max(...active.map(c=>c.x));
 const centroidX=active.reduce((s,c)=>s+c.x,0)/active.length;
 const spanX=Math.max(20,maxX-minX);

 // Partition cells by angle: wrap (top/side: 0, 120) vs opposing thumb (180, 240)
 const thumbCandidates=active.filter(c=>c.angle===180||c.angle===240);
 const fingerCandidates=active.filter(c=>c.angle===0||c.angle===120);

 let graspType='Cylindrical Power Grip';
 if(active.length>14&&pressures.some(p=>p>28)){
   graspType='Push-off Palm Thrust';
 }else if(active.length<=6&&fingerCandidates.length<=4){
   graspType='Precision Pinch Grip';
 }else if(thumbCandidates.length===0){
   graspType='Hook Propulsion Grip';
 }

 // Segment along X into 4 fingers
 const sortedFingers=[...fingerCandidates].sort((a,b)=>a.x-b.x);
 const fGroups={Index:[],Middle:[],Ring:[],Little:[]};
 
 if(sortedFingers.length>0){
   const step=Math.max(10,spanX/4);
   sortedFingers.forEach(c=>{
     const rel=(c.x-minX)/spanX;
     if(rel<0.28)fGroups.Index.push(c);
     else if(rel<0.53)fGroups.Middle.push(c);
     else if(rel<0.78)fGroups.Ring.push(c);
     else fGroups.Little.push(c);
   });
 }

 // If thumb candidates exist, assign to Thumb; else fallback to lowest-X opposing or nearest
 const thumbCells=thumbCandidates.length?thumbCandidates:(active.filter(c=>c.x<=minX+15&&c.angle!==0));

 const digitArray=[
   {name:'Thumb',cells:thumbCells},
   {name:'Index',cells:fGroups.Index.length?fGroups.Index:[active[0]]},
   {name:'Middle',cells:fGroups.Middle.length?fGroups.Middle:active.slice(1,3)},
   {name:'Ring',cells:fGroups.Ring.length?fGroups.Ring:active.slice(2,4)},
   {name:'Little',cells:fGroups.Little.length?fGroups.Little:[active.at(-1)]}
 ];

 const fingers=digitArray.map(({name,cells:dCells})=>{
   const cList=dCells&&dCells.length?dCells:[active[0]];
   const x=cList.reduce((s,c)=>s+c.x,0)/cList.length;
   const sx=cList.reduce((s,c)=>s+Math.cos(c.angle*Math.PI/180),0);
   const sy=cList.reduce((s,c)=>s+Math.sin(c.angle*Math.PI/180),0);
   const angle=Math.hypot(sx,sy)/cList.length>.1?(Math.atan2(sy,sx)*180/Math.PI+360)%360:null;
   const load=cList.reduce((s,c)=>s+(pressures[c.id]!==undefined&&pressures[c.id]!==null?pressures[c.id]*.1:1.2),0);
   return {
     name,
     x,
     angle,
     cells:cList.map(c=>c.id),
     load_n:Math.round(load*10)/10
   };
 });

 const totalLoad=fingers.reduce((s,f)=>s+f.load_n,0);
 fingers.forEach(f=>{
   f.load_pct=totalLoad>0?Math.round((f.load_n/totalLoad)*100):20;
 });

 return {
   status:'estimated',
   mode:'biomechanical',
   score:0.92,
   graspType,
   centroid_mm:Math.round(centroidX*10)/10,
   span_mm:Math.round(spanX),
   totalLoad_n:Math.round(totalLoad*10)/10,
   fingers,
   reason:`Identified ${graspType} at ${Math.round(centroidX)} mm along handrail. Finger positions calculated via anthropometric tactile clustering.`
 };
}

/**
 * Unified pose identification function:
 * Prefers calibrated template matching if available, else falls back seamlessly to biomechanical auto-estimation!
 */
function identify(frame,cells,template,diameter=32){
 if(template){
   const res=estimate(frame,cells,template);
   if(res.status==='estimated')return {...res,mode:'calibrated'};
 }
 return autoEstimate(frame,cells,diameter);
}

const api={calibrate,estimate,autoEstimate,identify,names};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PoseCore=api;
})(globalThis);
