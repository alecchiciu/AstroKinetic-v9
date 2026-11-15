'use strict';
(()=>{
document.querySelectorAll('input,select').forEach(e=>{if(e.tagName==='SELECT'){const i=[...e.options].findIndex(o=>o.defaultSelected);e.selectedIndex=i<0?0:i;}else if(e.type==='checkbox'||e.type==='radio')e.checked=e.defaultChecked;else if(e.type!=='file')e.value=e.defaultValue;});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
const $=id=>(document.getElementById(id)||window.AKDetached?.get(id)),C=SensorCore,P=PoseCore,V=window.Vessel3D,R=window.Rail3D,NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n};
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const tell=t=>{const el=$('status');if(el)el.firstElementChild?el.firstElementChild.textContent='● '+t:el.textContent=t;};
const clock=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');

const defaultVessel=()=>({schema:'astrokinetic-vessel-v1',name:V.PRESETS[0].name,rails:structuredClone(V.PRESETS[0].rails)});

let vessel=defaultVessel(),image=null,selected='r1',source='demo',currentScenario='nominal',time=25,timer=null,port=null,reader=null,connecting=false,place=false;
const sessions=new Map(),annotations=new Map();
let modelRevision=0,customView=false,viewMode='3d';
let liveDetectionActive=false,liveInterval=null;

// Biomechanical interactive overrides
let paramOverrides={
  impulse:12.4,
  tremor:0.82,
  eda:3.2,
  dwell:290
};

const rail=()=>vessel.rails.find(r=>r.id===selected)||vessel.rails[0];
const key=()=>modelRevision+':'+source+':'+currentScenario+':'+selected;
const cells=()=>C.layout(rail().length_mm,rail().diameter_mm);

function session(){
  const k=key();
  if(!sessions.has(k)){
    const d=source==='demo'
      ? C.demo(cells(),selected,vessel.rails.indexOf(rail()),currentScenario)
      : {schema:'astrokinetic-sensors-v1',rail_id:selected,participant:'LOCAL-01',task:'Translation',origin:source==='usb'?'live USB':'imported',frames:[]};
    d.reports=[];
    d.dropped=0;
    sessions.set(k,d);
  }
  return sessions.get(k);
}

const labels=()=>{
  const k=modelRevision+':'+selected;
  if(!annotations.has(k))annotations.set(k,{});
  return annotations.get(k);
};

function download(name,data){
  const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=node('a');
  a.href=u;
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(u),1000);
}

function stop(){
  clearInterval(timer);
  timer=null;
  $('play').textContent='▶';
  $('play').setAttribute('aria-label','Play recording');
}

function choose(id,scroll=true){
  if(!vessel.rails.some(r=>r.id===id))return;
  stop();
  selected=id;
  if(V)V.selectRail(id);
  time=source==='demo'?25:(session().frames.at(-1)?.t||0);
  render();
  if(scroll&&document.getElementById('surface')){
    document.getElementById('surface').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
}

// 2D SVG Spacecraft Map
function draw2DMap(){
  const map=$('architecture');
  if(!image&&!customView){
    ShipCutaway.draw(map,{...ShipCutaway.presets[0],rails:vessel.rails},selected,id=>choose(id));
  }else{
    map.replaceChildren();
    map.setAttribute('viewBox','0 0 1200 640');
    map.append(svg('rect',{width:1200,height:640,fill:'#0a0e1c'}));
    if(image){
      map.append(svg('image',{href:image,x:0,y:0,width:1200,height:640,preserveAspectRatio:'xMidYMid meet'}));
    }else{
      map.append(
        svg('text',{x:600,y:260,'text-anchor':'middle',fill:'#5ef2ff','font-size':22,'font-weight':'600'},'Custom Spacecraft Cabin Layout'),
        svg('text',{x:600,y:295,'text-anchor':'middle',fill:'#9aa6c8','font-size':15},'Load a cutaway image to anchor rails in context.')
      );
    }
    vessel.rails.forEach((r,i)=>{
      const x=r.anchor[0]*1200,y=r.anchor[1]*640;
      const isSel=r.id===selected;
      const color=isSel?'#5ef2ff':'#8f7cff';
      const g=svg('g',{role:'button',tabindex:0,'aria-label':'Select '+r.label,'aria-pressed':isSel});
      g.append(
        svg('rect',{x:x-28,y:y-9,width:56,height:18,rx:9,fill:color,stroke:'#ffffff','stroke-width':isSel?2.5:1}),
        svg('circle',{cx:x,cy:y-28,r:14,fill:color}),
        svg('text',{x,y:y-23,'text-anchor':'middle',fill:'#04060d','font-size':11,'font-weight':'bold'},i+1)
      );
      g.onclick=e=>{if(place)return;e.stopPropagation();choose(r.id)};
      g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(r.id)}};
      map.append(g);
    });
  }
  $('vessel-name').textContent=vessel.name;
  updateRailList();
}

function updateRailList(){
  const list=$('rail-list');
  if(!list)return;
  list.replaceChildren();
  vessel.rails.forEach((r,i)=>{
    const card=node('div',undefined,'rail-card'+(r.id===selected?' selected':''));
    card.setAttribute('role','button');
    card.setAttribute('tabindex',0);
    card.append(
      node('div',`Rail 0${i+1} · ${r.label}`,'rail-card-title'),
      node('div',`${r.length_mm} mm · Ø ${r.diameter_mm} mm · ${Math.round(r.length_mm/40)*10} taxels`,'rail-card-meta')
    );
    card.onclick=()=>choose(r.id);
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(r.id);}};
    list.append(card);
  });
}

const fingerColors={Thumb:'#f97316',Index:'#06b6d4',Middle:'#6366f1',Ring:'#a855f7',Little:'#eab308',Palm:'#10b981'};

// Unwrapped 2D Tactile Matrix Map
function drawSurface(f,cs){
  const m=$('sensor-map'),r=rail(),circ=Math.PI*r.diameter_mm,width=r.length_mm+35,height=circ+32;
  m.replaceChildren();
  m.setAttribute('viewBox',`0 0 ${width} ${height}`);
  m.style.minWidth=Math.max(650,r.length_mm*1.4)+'px';

  for(const a of [0,120,180,240]){
    const y=12+a/360*circ;
    m.append(
      svg('line',{x1:25,y1:y,x2:width,y2:y,stroke:'rgba(140, 170, 255, 0.2)','stroke-dasharray':'2 3'}),
      svg('text',{x:0,y:y+3,'font-size':6,fill:'#5d6888'},a+'°')
    );
  }

  cs.forEach((c,i)=>{
    const x=25+c.x-5,y=12+c.angle/360*circ,v=f?.contact[i],p=f?.pressure_kpa?.[i],lab=labels()[i];
    let fill=v===undefined||v===null?'#ea580c':v?'#4dffb0':'#162032';
    if($('colour').value==='pressure'){
      fill=p===undefined||p===null?'#ea580c':p>0?`hsl(${Math.max(0,175-p*2.6)} 85% ${Math.min(65,32+p*.8)}%)`:'#162032';
    }
    if($('colour').value==='fingers'&&lab)fill=fingerColors[lab]||'#5ef2ff';

    const rect=svg('rect',{
      x,y,width:10,height:10,rx:1.2,
      fill,
      stroke:v?'#5ef2ff':'#243247',
      'stroke-width':v?1:.5,
      role:'button',tabindex:0,
      'aria-label':`Cell ${i+1}: ${c.x} mm, ${c.angle}°; ${v===null||v===undefined?'unknown':v?'contact':'free'}`
    });
    rect.append(svg('title',{},`Cell ${i+1} · ${c.x} mm · ${c.angle}° · ${v?'Contact':'Free'}${p?` · ${p.toFixed(1)} kPa`:''}${lab?' · '+lab:''}`));

    const inspect=()=>{
      const finger=$('finger').value;
      if(finger==='Clear')delete labels()[i];
      else if(finger)labels()[i]=finger;
      $('cell-info').textContent=`Cell ${i+1} · ${c.x} mm · ${c.angle}° · ${v===null||v===undefined?'unknown':v?'contact':'free'} · ${p===undefined||p===null?'no pressure':p.toFixed(1)+' kPa'}${labels()[i]?' · annotated '+labels()[i]:''}`;
      if(finger)renderDetail();
    };
    rect.onclick=inspect;
    rect.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect()}};
    m.append(rect);
  });

  for(let x=0;x<=r.length_mm;x+=Math.max(40,Math.ceil(r.length_mm/6/40)*40)){
    m.append(svg('text',{x:x+25,y:height-2,'font-size':6,fill:'#5d6888'},x+' mm'));
  }
}

// Chart rendering
function chart(target,frames,fn,maxOverride){
  const s=$(target);
  if(!s)return;
  s.replaceChildren();
  const first=frames[0]?.t||0,end=frames.at(-1)?.t||120,span=Math.max(.1,end-first);
  const vals=frames.map(fn),valid=vals.filter(v=>v!==null&&Number.isFinite(v));
  const max=maxOverride||Math.max(1,...valid)*1.15;
  const x=t=>45+(t-first)/span*930,y=v=>135-v/max*112;

  // Grid lines
  for(let j=0;j<=4;j++){
    const v=max*j/4;
    s.append(
      svg('line',{x1:45,y1:y(v),x2:975,y2:y(v),stroke:'rgba(140, 170, 255, 0.12)'}),
      svg('text',{x:38,y:y(v)+4,'text-anchor':'end','font-size':10,fill:'#5d6888'},v.toFixed(max>10?0:1))
    );
    const t=first+span*j/4;
    s.append(svg('text',{x:x(t),y:162,'font-size':10,'text-anchor':'middle',fill:'#5d6888'},clock(t)));
  }

  let d='';
  frames.forEach((f,i)=>{
    const v=vals[i];
    if(v===null||!Number.isFinite(v)){
      d+=' ';
      s.append(svg('rect',{x:x(f.t),y:23,width:Math.max(1,930/span*.5),height:112,fill:'rgba(234, 88, 12, 0.25)'}));
      return;
    }
    const connected=i&&vals[i-1]!==null&&f.t-frames[i-1].t<=1;
    d+=(connected?' L':' M')+x(f.t).toFixed(1)+','+y(v).toFixed(1);
  });

  s.append(svg('path',{d,fill:'none',stroke:'#5ef2ff','stroke-width':2.2}));
  if(!frames.length){
    s.append(svg('text',{x:500,y:85,'text-anchor':'middle',fill:'#5d6888','font-size':15},'No measurements recorded for this rail'));
  }
  // Time cursor line
  s.append(svg('line',{x1:x(time),x2:x(time),y1:20,y2:138,stroke:'#ffc65c','stroke-width':2}));
}

// 2D Heatmap Canvas
function heatmap(frames,cs){
  const canvas=$('heatmap');
  if(!canvas)return;
  canvas.width=1000;
  canvas.height=cs.length*3;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#04060d';
  ctx.fillRect(0,0,1000,canvas.height);
  if(!frames.length)return;
  const start=frames[0].t,span=Math.max(.1,frames.at(-1).t-start);

  frames.forEach((f,j)=>{
    const end=frames[j+1]?.t;
    if(end===undefined||end-f.t>1)return;
    const x=(f.t-start)/span*1000,w=Math.max(1,(end-f.t)/span*1000);
    f.contact.forEach((v,i)=>{
      ctx.fillStyle=v===null?'#ea580c':v?'#4dffb0':'#162032';
      ctx.fillRect(x,i*3,w,2.5);
    });
  });
}

/**
 * Truly Realistic Anatomical Hand SVG Renderer with Data-Driven Biomechanical Animations
 */
function drawPose(f,cs){
  const e=session();
  const result=P.identify(f,cs,e.poseTemplate,rail().diameter_mm);
  const view=$('hand-view');
  view.replaceChildren();

  $('pose-badge').textContent=result.status==='estimated'
    ?(result.mode==='calibrated'?'CALIBRATED TEMPLATE':'BIOMECHANICAL ESTIMATE')
    :'NO CONTACT';

  $('pose-result').textContent=result.reason||'No active handrail grip detected at current timestamp.';
  $('pose-fingers').replaceChildren();

  // SVG Definitions for Gradients and Glow Filters
  const defs=svg('defs');
  defs.innerHTML=`
    <linearGradient id="hand-glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5ef2ff" stop-opacity="0.22" />
      <stop offset="50%" stop-color="#8f7cff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#ff6ad5" stop-opacity="0.08" />
    </linearGradient>
    <linearGradient id="thrust-grad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#ff6ad5" stop-opacity="0.1" />
      <stop offset="70%" stop-color="#5ef2ff" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#4dffb0" stop-opacity="1" />
    </linearGradient>
    <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  `;
  view.append(defs);

  // Background cylinder shadow indicating handrail engagement
  view.append(
    svg('rect',{x:15,y:105,width:290,height:48,rx:10,fill:'rgba(94, 242, 255, 0.04)',stroke:'rgba(94, 242, 255, 0.15)','stroke-width':1,'stroke-dasharray':'4 4'}),
    svg('text',{x:25,y:133,'font-size':9,fill:'rgba(94, 242, 255, 0.4)','font-family':'var(--mono)'},'CYLINDRICAL RAIL AXIS')
  );

  // Determine dynamic animation classes based on data
  const grasp=result.graspType||'Cylindrical Power Grip';
  let animClass='hand-silhouette';
  if(grasp.includes('Thrust')||grasp.includes('Push-off'))animClass+=' thrust-active';
  else if(grasp.includes('Power'))animClass+=' pulse-clamp';

  const tremor=source==='demo'?paramOverrides.tremor:(f?.micro_tremor_rms||0);
  animClass='hand-silhouette';

  // Realistic Anatomical Human Hand Outer Silhouette (Right Hand Palmar View)
  const handPath='M120 280 L116 232 Q105 212 92 195 L53 146 Q43 132 52 124 Q62 117 73 130 L112 167 Q119 173 120 159 L120 63 Q120 49 131 49 Q143 49 143 63 L144 141 L152 141 L152 36 Q152 22 164 22 Q176 22 176 36 L176 140 L184 140 L184 49 Q184 35 196 35 Q208 35 208 49 L208 151 L216 151 L216 86 Q216 72 227 72 Q239 72 239 86 L239 192 Q239 216 221 239 L213 280 Z';

  view.append(
    svg('path',{
      d:handPath,
      fill:'url(#hand-glow)',
      stroke:'#5ef2ff',
      'stroke-width':1.8,
      'stroke-linejoin':'round',
      class:animClass,transform:'translate('+Math.max(-35,Math.min(35,((C.stats(f,cs).centroid??rail().length_mm/2)/rail().length_mm-.5)*70))+',0)',
      filter:'url(#cyan-glow)'
    })
  );

  // Anatomical Palmar Creases (Life line, Head line, Heart line, Interphalangeal creases)
  view.append(
    // Thenar Crease ("Life Line")
    svg('path',{d:'M 112 150 C 116 185, 128 220, 150 255',fill:'none',stroke:'rgba(94, 242, 255, 0.45)','stroke-width':1.2,'stroke-linecap':'round'}),
    // Distal Transverse Crease ("Heart Line")
    svg('path',{d:'M 135 130 C 165 140, 200 145, 232 155',fill:'none',stroke:'rgba(143, 124, 255, 0.45)','stroke-width':1.2,'stroke-linecap':'round'}),
    // Proximal Transverse Crease ("Head Line")
    svg('path',{d:'M 118 160 C 150 168, 185 180, 225 190',fill:'none',stroke:'rgba(94, 242, 255, 0.35)','stroke-width':1.2,'stroke-linecap':'round'}),
    // Wrist Basal Crease
    svg('path',{d:'M 135 272 Q 160 278 185 272',fill:'none',stroke:'rgba(94, 242, 255, 0.3)','stroke-width':1.4,'stroke-linecap':'round'}),

    // Finger Knuckle / Joint Creases
    svg('path',{d:'M 124 55 Q 133 57 142 55',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 123 85 Q 134 88 144 85',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 158 35 Q 167 37 176 35',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 156 68 Q 168 70 179 68',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 194 48 Q 203 50 211 48',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 192 80 Q 204 82 214 80',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 233 78 Q 239 80 245 78',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 228 102 Q 236 104 242 102',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1}),
    svg('path',{d:'M 48 116 Q 55 122 62 120',fill:'none',stroke:'rgba(140, 170, 255, 0.3)','stroke-width':1})
  );

  // Dynamic Data-Driven Vector Animations on Hand
  if(grasp.includes('Thrust')||grasp.includes('Push-off')){
    // Animated Forward Propulsion Vector Arrows from Palm
    view.append(
      svg('line',{x1:160,y1:205,x2:160,y2:65,stroke:'url(#thrust-grad)','stroke-width':3.5,'stroke-linecap':'round',class:'thrust-vector-stream'}),
      svg('polygon',{points:'152,70 160,52 168,70',fill:'#4dffb0'})
    );
  }else if(grasp.includes('Pinch')){
    // Precision Pinch Reticle between Thumb [51, 106] and Index [133, 31]
    view.append(
      svg('line',{x1:51,y1:106,x2:133,y2:31,stroke:'#ff6ad5','stroke-width':1.5,'stroke-dasharray':'3 3'}),
      svg('circle',{cx:92,cy:68,r:14,fill:'none',stroke:'#ff6ad5','stroke-width':1.5,'stroke-dasharray':'2 2'}),
      svg('circle',{cx:92,cy:68,r:3,fill:'#ff6ad5'})
    );
  }

  // Exact Anatomical Fingertip Anchors
  const anchors={
    Thumb:[51,106],
    Index:[133,31],
    Middle:[167,9],
    Ring:[203,21],
    Little:[240,54],
    Palm:[160,205]
  };

  P.names.forEach((name,i)=>{
    const p=result.fingers?.find(x=>x.name===name);
    const a=anchors[name];
    const col=p?fingerColors[name]:'#475569';
    const loadPct=p?.load_pct||20;
    const rSize=Math.max(7,Math.min(15,8+(loadPct-15)*0.3));

    // Fingertip glowing halo
    if(p){
      view.append(
        svg('circle',{cx:a[0],cy:a[1],r:rSize+5,fill:'none',stroke:col,'stroke-width':1.2,'stroke-opacity':0.6,'stroke-dasharray':'2 2'})
      );
    }
    view.append(
      svg('circle',{cx:a[0],cy:a[1],r:rSize,fill:col,stroke:'#ffffff','stroke-width':1.5}),
      svg('text',{x:a[0],y:a[1]+3.5,'text-anchor':'middle',fill:'#04060d','font-size':9,'font-weight':'900'},i+1)
    );

    // Render Digit Breakdown Card
    const card=node('div',undefined,'digit-bar-card');
    const header=node('div',undefined,'digit-bar-header');
    header.append(
      node('strong',`${i+1}. ${name}`),
      node('span',p?`${p.load_pct||20}% · ${p.load_n?p.load_n.toFixed(1)+' N':'—'}`:'No contact')
    );
    const track=node('div',undefined,'digit-track');
    const fill=node('div',undefined,'digit-fill');
    fill.style.width=(p?p.load_pct||20:0)+'%';
    fill.style.backgroundColor=fingerColors[name];
    track.append(fill);
    const info=node('small',p?`Centroid: ${p.x.toFixed(0)} mm · Angle: ${p.angle!==null?p.angle.toFixed(0)+'°':'balanced'} · ${p.cells.length} cells`:'Awaiting tactile contact');

    card.append(header,track,info);
    $('pose-fingers').append(card);

    // Highlight on 2D map
    if(p&&p.angle!==null){
      const x=25+p.x,y=12+p.angle/360*Math.PI*rail().diameter_mm;
      $('sensor-map').append(
        svg('circle',{cx:x,cy:y,r:8,fill:'none',stroke:fingerColors[name],'stroke-width':1.4,'stroke-dasharray':'2 1'}),
        svg('text',{x:x+9,y:y-4,'font-size':7,fill:fingerColors[name],'font-weight':'bold'},name)
      );
    }
  });

  return result;
}

// NASA Medical Monitoring & Affective Telemetry Panel
function updatePhenotyping(f,st,pose){
 const show=(id,key,unit)=>{if($(id))$(id).textContent=typeof f?.[key]==='number'?f[key].toFixed(1)+' '+unit:'—';};
 [['pheno-impulse','impulse_ns','N·s'],['pheno-rfd','rfd_n_s','N/s'],['pheno-tremor','micro_tremor_rms','mm/s²'],['pheno-eda','skin_conductance_us','μS'],['pheno-dwell','dwell_time_ms','ms'],['pheno-slip','slip_velocity_mm_s','mm/s'],['pheno-temp','skin_temperature_c','°C'],['hero-push-force','push_force_n','N'],['hero-tremor','micro_tremor_rms','mm/s²'],['hero-eda','skin_conductance_us','μS'],['hero-dwell','dwell_time_ms','ms']].forEach(x=>show(...x));
 ['pheno-hesitation','pheno-cop-status','pheno-vaso','pheno-arousal','pheno-stability','meter-cognitive-val','meter-fatigue-val'].forEach(id=>{if($(id))$(id).textContent='Not assessed';});
 ['meter-cognitive-fill','meter-fatigue-fill'].forEach(id=>{if($(id))$(id).style.width='0%';});
 $('live-state-title').textContent=liveDetectionActive?'Monitoring contact & sensor channels':'Ready to monitor';
 $('live-state-icon').textContent='◉';$('live-state-desc').textContent='Tactile hardware does not supply all required physiology. Open Stress research for held-out public-data predictions.';
 $('badge-stress').textContent='INSUFFICIENT COMPATIBLE DATA';$('flight-surgeon-note').textContent='Research display. No medical diagnosis or fitness-for-duty assessment. Missing sensor channels remain unavailable.';
}

// Multimodal Telemetry channels list
const channels=[
  ['push_force_n','Push-Off Normal Force','N','Normal propulsion load on handrail'],
  ['shear_force_n','Shear Propulsion Force','N','Lateral thrust in flight direction'],
  ['impulse_ns','Propulsion Impulse','N·s','Integral of takeoff thrust ∫ F dt'],
  ['micro_tremor_rms','8–12 Hz Micro-Tremor','mm/s²','Physiological neuromuscular jitter'],
  ['skin_conductance_us','Autonomic EDA','μS','Palmar sympathetic nervous arousal'],
  ['dwell_time_ms','Pre-Propulsion Dwell','ms','Contact dwell latency before takeoff'],
  ['slip_velocity_mm_s','CoP Slip Velocity','mm/s','Dynamic grip stability along rail'],
  ['heart_rate_bpm','Heart Rate','bpm','Cardiac autonomic rate'],
  ['respiration_bpm','Respiration','breaths/min','Breathing frequency'],
  ['skin_temperature_c','Skin Temperature','°C','Peripheral fingertip thermal flux'],
  ['spo2_pct','Oxygen Saturation','%','Optical pulse oximetry']
];

function renderDetail(){
  $('legacy-check').hidden=$('usb-format').value!=='legacy';
  const e=session(),cs=cells(),f=C.at(e.frames,time),st=C.stats(f,cs);

  $('rail-name').textContent=rail().label;
  $('cell-count').textContent=cs.length+' CELLS / '+rail().length_mm+' MM';
  $('length').value=rail().length_mm;
  $('diameter').value=rail().diameter_mm;

  // Primary metrics
  $('active').textContent=st.active!==null?st.active+' / '+cs.length:'—';
  $('centroid').textContent=st.centroid!==null?st.centroid.toFixed(1)+' mm':'—';
  $('load').textContent=st.load!==null?st.load.toFixed(1)+' N':'—';
  $('peak-pressure-readout').textContent=st.peak!==null?st.peak.toFixed(1)+' kPa':'—';
  $('quality').textContent=st.quality!==null?(st.quality*100).toFixed(0)+' %':'—';

  $('surface-note').textContent='10 × 10 mm tactile cells · '+(cs.length*100/(rail().length_mm*Math.PI*rail().diameter_mm)*100).toFixed(1)+'% surface coverage. Pattern: 3-2-2-3 repeating.';
  $('angle').textContent='Angle: '+(st.angle===null?'balanced':st.angle.toFixed(0)+'°');

  // Time & cursor
  $('cursor').min=e.frames[0]?.t||0;
  $('cursor').max=e.frames.at(-1)?.t||120;
  $('cursor').value=time;
  $('cursor').disabled=!e.frames.length;
  $('play').disabled=!e.frames.length||!!reader;
  $('clock').textContent=clock(time);
  $('origin').textContent=e.origin.toUpperCase();
  $('channels-origin').textContent=e.origin.toUpperCase();
  $('origin-note').textContent=source==='demo'?'Synthetic demonstration. Not NASA recordings.'
    :source==='usb'?'Live USB hardware streaming.'
    :'User imported telemetry.';

  $('participant').value=e.participant||'AST-01';
  $('task').value=e.task||'Station keeping';

  // Draw 2D & 3D handrails and pose
  drawSurface(f,cs);
  const pose=drawPose(f,cs);

  // Update 3D Handrail view
  if(R){
    R.update(cs,f,rail().length_mm,rail().diameter_mm,$('colour').value,labels(),pose);
  }

  // Update NASA Medical Monitoring Dashboard
  updatePhenotyping(f,st,pose);
  window.dispatchEvent(new CustomEvent('phenotype-frame',{detail:{frame:f,source,rail:selected,mode:$('detection-mode')?.value,running:liveDetectionActive||$('manual-enabled')?.checked}}));

  // Charts
  chart('timeline',e.frames,x=>x.contact.every(v=>v!==null)?x.contact.reduce((a,b)=>a+b,0):null,cs.length);
  chart('channel-chart',e.frames,x=>{
    const sel=$('channel-select').value;
    if(sel==='peak_pressure_kpa')return C.stats(x,cs).peak;
    return x[sel]??null;
  });

  // Multimodal telemetry mini-cards
  const channelGrid=$('channel-cards');
  if(channelGrid){
    channelGrid.replaceChildren();
    channels.forEach(([k,title,unit,note])=>{
      const a=node('div',undefined,'channel-box');
      a.append(
        node('span',title.toUpperCase(),'eyebrow'),
        node('strong',f?.[k]===undefined||f?.[k]===null?'—':Number(f[k]).toFixed(k==='skin_temperature_c'||k==='acceleration_m_s2'||k==='micro_tremor_rms'?1:0)+' '+unit,'pheno-val'),
        node('small',f?.[k]===undefined?'No measurement supplied':note,'dim')
      );
      channelGrid.append(a);
    });
  }

  // Personal Baseline comparison
  const b=C.baseline(e.frames,cs);
  let text='Initial 30-second baseline window active.';
  if(b){
    text=`${e.participant} · ${e.task}: baseline median ${b.center.toFixed(1)} active cells (${b.n} contact samples). `;
    if(time<=30)text+='Inside baseline calibration window.';
    else if(st.quality!==1||!st.active)text+='Frame has incomplete coverage or zero contact.';
    else{
      const z=Math.abs(st.active-b.center)/b.scale;
      text+=`Deviation from personal habit: ${z.toFixed(1)} robust scale units. ${z>3?'Statistically significant deviation — review context and fatigue biomarkers.':'Within nominal reference band.'}`;
    }
  }
  $('baseline').textContent=text;

  // Self-reports
  $('reports').replaceChildren();
  (e.reports||[]).forEach(r=>{
    const b=node('button',clock(r.t)+' · '+r.state+' · Self-Report','btn btn-secondary btn-sm');
    b.onclick=()=>{stop();time=r.t;renderDetail()};
    $('reports').append(b);
  });
}

function render(){
  if(viewMode==='3d'&&V){
    $('ship-3d-view').style.display='block';
    V.resize();
    $('vessel-name').textContent=vessel.name;
    $('ship-view').style.display='none';
  }else{
    $('ship-3d-view').style.display='none';
    $('ship-view').style.display='block';
    draw2DMap();
  }
  updateRailList();
  renderDetail();
  heatmap(session().frames,cells());
}

// Model & 3D setup
function initSpacecraft(){
  if(V){
    V.init($('ship-3d-view'),id=>choose(id));
  }
  if(R){
    R.init($('rail-3d-container'),mm=>{
      simulateHandAt(mm);
    });
  }
}

function simulateHandAt(mm){
  const f=C.at(session().frames,time);
  if(!f)return;
  const cs=cells();
  const grasp=$('sim-grasp-type').value;

  cs.forEach((c,i)=>{
    const dx=c.x-mm;
    let on=false;
    let pres=0;
    if(grasp==='power'){
      on=Math.abs(dx)<45&&((c.angle!==240&&Math.abs(dx)%22<12)||(c.angle===240&&Math.abs(dx+20)<15));
      pres=on?24+12*Math.sin(dx):0;
    }else if(grasp==='thrust'){
      on=Math.abs(dx)<55;
      pres=on?36+15*Math.cos(dx/2):0;
    }else if(grasp==='pinch'){
      on=Math.abs(dx)<20&&(c.angle===0||c.angle===120);
      pres=on?18+6*Math.sin(dx):0;
    }else{
      // hook
      on=Math.abs(dx)<35&&c.angle===0;
      pres=on?20:0;
    }
    f.contact[i]=on?1:0;
    if(f.pressure_kpa)f.pressure_kpa[i]=pres;
  });
  renderDetail();
  tell(`Simulated ${grasp} grasp placed at ${mm} mm along handrail.`);
}


// Explicit synthetic-only manual sandbox. Pointer duration is simulated pressure.
function initManualSandbox(){
 const host=$('rail-3d-container'),panel=document.createElement('div');panel.className='manual-sandbox';
 panel.innerHTML='<label><input type="checkbox" id="manual-enabled"> Enable manual demo laboratory</label><p>Move the hand over the rail. Hold to increase simulated pressure; release to remove contact. These values do not measure your hand or diagnose stress.</p><output id="manual-pressure">Ready · 0 kPa</output><div id="lab-live-summary" aria-live="polite">Start the lab, then press and move on the rail.</div><div id="lab-live-charts" class="research-grid"></div><details><summary>Advanced controls</summary><label><input type="checkbox" id="lab-auto-signals" checked> Generate simulated physiology from mouse interaction</label><p>This illustrative mapping is not a learned link between grip and emotion. Disable it to set every channel manually.</p><div id="manual-fields"></div></details>';
 host.before(panel);host.style.position='relative';
 const hand=document.createElement('div');hand.className='manual-hand';hand.innerHTML='<svg viewBox="0 0 140 180"><defs><linearGradient id="glove-shade"><stop stop-color="#e5edf7"/><stop offset=".55" stop-color="#8ca7c5"/><stop offset="1" stop-color="#3e5774"/></linearGradient></defs><path fill="url(#glove-shade)" stroke="#d9e6f3" stroke-width="2" d="M42 166 L35 125 Q27 104 14 89 Q6 78 15 74 Q23 70 38 92 L33 39 Q32 25 42 25 Q51 24 52 39 L57 83 L55 17 Q55 5 65 6 Q74 6 75 20 L78 81 L82 25 Q84 13 93 16 Q101 18 100 30 L98 87 L107 48 Q110 36 119 40 Q126 43 123 55 L115 113 Q112 138 99 165 Z"/><path d="M40 109 Q75 94 108 112 M53 122 Q77 113 104 125" fill="none" stroke="#425f7d" stroke-width="4"/></svg>';host.append(hand);hand.style.left='50%';hand.style.top='50%';
 const fields=[['eda_sd_us','EDA window SD · μS',0,30,.01],['temperature_sd_c','Temperature window SD · °C',0,5,.01],['emg_zygo_uv','Zygomatic facial EMG mean · μV',-1000,1000,.01],['emg_zygo_sd_uv','Zygomatic facial EMG SD · μV',0,1000,.01],['emg_coru_uv','Corrugator facial EMG mean · μV',-1000,1000,.01],['emg_coru_sd_uv','Corrugator facial EMG SD · μV',0,1000,.01],['acceleration_magnitude_g','Acceleration magnitude · g',0,4,.01],['heart_rate_bpm','Heart rate · bpm',35,220,1],['skin_conductance_us','EDA · μS',0,30,.1],['skin_temperature_c','Skin temperature · °C',20,42,.1],['respiration_bpm','Respiration · breaths/min',4,50,1],['spo2_pct','SpO₂ · %',70,100,1],['impulse_ns','Impulse · N·s',0,60,.1],['micro_tremor_rms','Tremor · mm/s²',0,5,.01],['dwell_time_ms','Dwell · ms',0,2000,10],['slip_velocity_mm_s','Slip · mm/s',0,30,.1],['push_force_n','Push force · N',0,200,1],['shear_force_n','Shear force · N',0,200,1]];
 let active=false,tick=null,begin=0,mm=0;const vals={};let labClock=null;
 let pressure=0,activation=0,lastMM=0,impulse=0,labRail='',history=[];const inputs={};
 const plotLab=f=>{history.push({t:f.t,p:pressure,x:mm,hr:f.heart_rate_bpm});history=history.slice(-300);$('lab-live-charts').replaceChildren(...[['p','Pressure','kPa',60],['x','Hand position','mm',rail().length_mm],['hr','Simulated heart rate','bpm',180]].map(([key,label,unit,max])=>{const a=document.createElement('article'),h=document.createElement('h4');h.textContent=label+' · '+Number(history.at(-1)[key]).toFixed(1)+' '+unit;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 300 90');svg.setAttribute('role','img');svg.setAttribute('aria-label',label+' over the last 60 seconds');const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',history.map((r,i)=>(i*300/299)+','+(85-Math.min(1,r[key]/max)*80)).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#5ef2ff');line.setAttribute('stroke-width','2');svg.append(line);const caption=document.createElement('small');caption.textContent='Last 60 s · live selected rail';a.append(h,svg,caption);return a}));};
 const updateSignals=f=>{const distance=Math.abs(mm-lastMM),movement=Math.min(1,distance/30);lastMM=mm;const target=Math.min(1,pressure/60+movement*.25);activation+=(target-activation)*.14;
 if($('lab-auto-signals').checked){const a=activation;Object.assign(vals,{heart_rate_bpm:78+42*a,respiration_bpm:16+12*a,skin_conductance_us:19.1019+2.4018*a,eda_sd_us:.3362+.3335*a,skin_temperature_c:26.6092+.1394*a,temperature_sd_c:.0137,emg_zygo_uv:5.8016+.5007*a,emg_zygo_sd_uv:.5648+.3063*a,emg_coru_uv:7.0647+.3478*a,emg_coru_sd_uv:.5016+.1495*a,acceleration_magnitude_g:1+movement*.2,micro_tremor_rms:.2+a*.8,slip_velocity_mm_s:tick?distance/.2:0,dwell_time_ms:tick?Math.min(2000,performance.now()-begin):0});for(const k of Object.keys(vals))if(inputs[k])inputs[k].value=Number(vals[k].toFixed(3));}
 Object.assign(f,vals);const force=pressure*f.contact.filter(v=>v===1).length*.1;if(tick)impulse+=force*.2;f.push_force_n=force;f.grip_force_n=force;f.impulse_ns=impulse;f.pressure_kpa=f.contact.map(c=>c?pressure:0);};
 const recordLab=()=>{if(!active||source!=='demo')return;const e=session(),previous=C.at(e.frames,time);if(!previous)return;const next=structuredClone(previous);next.t=+(e.frames.at(-1).t+.2).toFixed(3);if(labRail!==selected){release();labRail=selected;history=[];impulse=0;activation=0;next.contact.fill(0);}updateSignals(next);e.frames.push(next);if(e.frames.length>3000)e.frames.shift();time=next.t;renderDetail();plotLab(next);};
 fields.forEach(([key,label,min,max,step])=>{const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='number';input.autocomplete='off';input.min=min;input.max=max;input.step=step;input.value=C.at(session().frames,time)?.[key]??(key==='acceleration_magnitude_g'?1:key.startsWith('emg_')?0:min);vals[key]=Number(input.value);inputs[key]=input;l.append(input);$('manual-fields').append(l);input.oninput=()=>{if(!active||source!=='demo')return;const v=Number(input.value);if(!Number.isFinite(v)||v<min||v>max)return;vals[key]=v;const f=C.at(session().frames,time);Object.assign(f,vals);renderDetail()}});
 function release(){clearInterval(tick);tick=null;pressure=0;hand.classList.remove('pressing');if(active&&source==='demo'){const f=C.at(session().frames,time);f.contact.fill(0);if(f.pressure_kpa)f.pressure_kpa.fill(0);renderDetail();$('manual-pressure').textContent='Released · 0 kPa · simulated physiology recovering'}}
 $('manual-enabled').onchange=e=>{if(e.target.checked&&source!=='demo'){e.target.checked=false;tell('Choose synthetic demo before enabling the manual laboratory.');return;}release();active=e.target.checked;clearInterval(labClock);labClock=null;if(active)labClock=setInterval(recordLab,200);host.classList.toggle('manual-active',active);if(active){history=[];impulse=0;activation=0;labRail=selected;stop();if(liveDetectionActive)toggleLiveDetection();Object.assign(C.at(session().frames,time),vals);renderDetail();}};
 host.addEventListener('mousedown',e=>{if(active){e.preventDefault();e.stopImmediatePropagation()}},true);
 host.addEventListener('pointermove',e=>{if(!active)return;const b=host.getBoundingClientRect();const x=Math.max(0,Math.min(b.width,e.clientX-b.left));mm=Math.max(0,Math.min(rail().length_mm,(x/b.width-.12)/.76*rail().length_mm));hand.style.left=x+'px';hand.style.top=(e.clientY-b.top)+'px'});
 host.addEventListener('pointerdown',e=>{if(!active||source!=='demo')return;e.preventDefault();e.stopImmediatePropagation();host.setPointerCapture(e.pointerId);if(tick)return;begin=performance.now();impulse=0;hand.classList.add('pressing');const apply=()=>{if(source!=='demo'){release();return;}pressure=Math.min(60,2+(performance.now()-begin)/1000*12);simulateHandAt(mm);const f=C.at(session().frames,time);f.pressure_kpa=f.contact.map(c=>c?pressure:0);Object.assign(f,vals);renderDetail();$('manual-pressure').textContent=pressure.toFixed(1)+' kPa · simulated hold pressure'};apply();tick=setInterval(apply,100)},true);
 host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);host.addEventListener('lostpointercapture',release);window.addEventListener('blur',release);
 host.addEventListener('click',e=>{if(active){e.preventDefault();e.stopImmediatePropagation()}},true);
}
setTimeout(()=>{
 initManualSandbox();
 const select=$('detection-mode');let labRunning=false;
 const enableLab=on=>{const e=$('manual-enabled');e.checked=on;e.dispatchEvent(new Event('change'));};
 select.onchange=()=>{if(liveDetectionActive)toggleLiveDetection();enableLab(false);labRunning=false;$('btn-live-toggle').textContent='▶ Start Live Detection';$('source').value=select.value==='hardware'?'usb':'demo';$('source').dispatchEvent(new Event('change'));$('manual-enabled').closest('.manual-sandbox').hidden=select.value!=='lab';window.dispatchEvent(new Event('phenotype-reset'));};
 $('btn-live-toggle').onclick=()=>{if(select.value!=='lab')return toggleLiveDetection();labRunning=!labRunning;enableLab(labRunning);$('btn-live-toggle').textContent=labRunning?'Ⅱ Pause Interactive Lab':'▶ Start Interactive Lab';$('live-indicator-badge').textContent=labRunning?'INTERACTIVE LAB · SYNTHETIC INPUT':'PAUSED';if(labRunning)$('rail-3d-container').scrollIntoView({block:'center',behavior:'smooth'});};
 select.value='recorded';select.onchange();
},0);

// Background Starfield Animation
function initStarfield(){
  const canvas=$('starfield');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let w,h,stars=[];
  const resize=()=>{
    w=canvas.width=window.innerWidth;
    h=canvas.height=window.innerHeight;
    stars=Array.from({length:100},()=>({
      x:Math.random()*w,
      y:Math.random()*h,
      z:Math.random()*2+0.2,
      r:Math.random()*1.3+0.4,
      alpha:Math.random()*0.6+0.25,
      speed:Math.random()*0.12+0.04
    }));
  };
  resize();
  window.addEventListener('resize',resize);
  function loop(){
    ctx.clearRect(0,0,w,h);
    for(const s of stars){
      s.y+=s.speed*s.z;
      if(s.y>h){s.y=0;s.x=Math.random()*w;}
      ctx.fillStyle=`rgba(140, 210, 255, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

// Live Waveform Canvas Rendering
function initWaveforms(){
  const waveCanvas=$('live-arousal-canvas');
  const heroSparkline=$('hero-sparkline');
  let phase=0;

  function drawWave(){
    if(waveCanvas){
      const ctx=waveCanvas.getContext('2d');
      const w=waveCanvas.width=waveCanvas.clientWidth||300;
      const h=waveCanvas.height=waveCanvas.clientHeight||60;
      ctx.clearRect(0,0,w,h);

      const eda=paramOverrides.eda||3.2;
      const tremor=paramOverrides.tremor||0.82;
      const amp=Math.min(25,eda*2.8);
      const freq=0.04+tremor*0.02;

      ctx.beginPath();
      ctx.strokeStyle='#5ef2ff';
      ctx.lineWidth=2;
      for(let x=0;x<w;x++){
        const jitter=(Math.random()-0.5)*tremor*3;
        const y=h/2+Math.sin(x*freq+phase)*amp+jitter;
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    if(heroSparkline){
      const ctx=heroSparkline.getContext('2d');
      const w=heroSparkline.width=heroSparkline.clientWidth||240;
      const h=heroSparkline.height=heroSparkline.clientHeight||50;
      ctx.clearRect(0,0,w,h);

      ctx.beginPath();
      ctx.strokeStyle='#4dffb0';
      ctx.lineWidth=1.8;
      for(let x=0;x<w;x++){
        const y=h/2+Math.sin(x*0.06+phase*1.2)*12;
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    phase+=0.08;
    requestAnimationFrame(drawWave);
  }
  drawWave();
}

// Live Detection Engine Toggle
function toggleLiveDetection(){
  if(!liveDetectionActive&&source==='usb'&&!reader){tell('Connect hardware before starting monitoring.');return;}liveDetectionActive=!liveDetectionActive;
  const btnToggle=$('btn-live-toggle');
  const btnHero=$('btn-hero-live');
  const badge=$('live-indicator-badge');

  if(liveDetectionActive){
    if(btnToggle){
      btnToggle.textContent='⏸ Pause Live Detection';
      btnToggle.classList.add('active');
    }
    if(btnHero){
      btnHero.textContent='⏸ Pause Live Detection';
      btnHero.classList.add('active');
    }
    if(badge){
      badge.className='badge ok';
      badge.innerHTML='<span class="dot pulse ok"></span> <span id="live-freq-text">MONITORING ACTIVE</span>';
    }

    // High frequency 25 Hz telemetry advance loop
    liveInterval=setInterval(()=>{
      const fs=session().frames;
      if(!fs.length)return;
      time=source==='usb'?fs.at(-1).t:Math.min(time+0.1,fs.at(-1).t);if(source!=='usb'&&time>=fs.at(-1).t){toggleLiveDetection();return;}
      if(time<fs[0].t)time=fs[0].t;
      renderDetail();
    },100);

    tell(source==='demo'?'Demo playback active · synthetic data.':'Monitoring received measurements · not emotion detection.');
  }else{
    if(btnToggle){
      btnToggle.textContent='▶ Start Live Detection';
      btnToggle.classList.remove('active');
    }
    if(btnHero){
      btnHero.textContent='▶ Start Live Detection';
      btnHero.classList.remove('active');
    }
    if(badge){
      badge.className='badge accent';
      badge.innerHTML='<span class="dot pulse"></span> <span id="live-freq-text">PAUSED · CLICK START</span>';
    }
    clearInterval(liveInterval);
    liveInterval=null;
    tell('Live detection paused.');
  }
}

// Spacecraft Preset Selection Helper
function setSpacecraftPreset(val){
  const selector=$('vessel-preset');
  if(selector)selector.value=val;
  if(V)V.setPreset(val);
  const p=V?V.getPreset():null;
  if(p){
    vessel={schema:'astrokinetic-vessel-v1',name:p.name,rails:p.rails};
    modelRevision++;
    selected=p.rails[0].id;
    time=25;
    render();
    tell(`Loaded ${p.name}. Select a rail to explore.`);
  }

  // Update active card styling
  document.querySelectorAll('.vessel-card').forEach(c=>{
    c.classList.toggle('active',c.dataset.preset===val);
  });
}

// Wire Preset Spacecraft Cards
document.querySelectorAll('.vessel-card[data-preset]').forEach(card=>{
  card.onclick=()=>setSpacecraftPreset(card.dataset.preset);
});

const uploadTrigger=$('btn-upload-vessel-modal');
if(uploadTrigger){
  uploadTrigger.onclick=()=>{
    const details=$('details-upload-vessel');
    if(details){
      details.open=!details.open;
      details.scrollIntoView({behavior:'smooth'});
    }
  };
}

// Wire Live Detection Buttons
if($('btn-live-toggle'))$('btn-live-toggle').onclick=toggleLiveDetection;
if($('btn-hero-live'))$('btn-hero-live').onclick=toggleLiveDetection;

// Wire Parameter Sliders & Presets
const sliderImpulse=$('slider-impulse');
if(sliderImpulse){
  sliderImpulse.oninput=()=>{
    paramOverrides.impulse=Number(sliderImpulse.value);
    $('param-impulse-val').textContent=paramOverrides.impulse.toFixed(1)+' N·s';
    renderDetail();
  };
}
const sliderTremor=$('slider-tremor');
if(sliderTremor){
  sliderTremor.oninput=()=>{
    paramOverrides.tremor=Number(sliderTremor.value);
    $('param-tremor-val').textContent=paramOverrides.tremor.toFixed(2)+' mm/s²';
    renderDetail();
  };
}
const sliderEda=$('slider-eda');
if(sliderEda){
  sliderEda.oninput=()=>{
    paramOverrides.eda=Number(sliderEda.value);
    $('param-eda-val').textContent=paramOverrides.eda.toFixed(1)+' μS';
    renderDetail();
  };
}
const sliderDwell=$('slider-dwell');
if(sliderDwell){
  sliderDwell.oninput=()=>{
    paramOverrides.dwell=Number(sliderDwell.value);
    $('param-dwell-val').textContent=paramOverrides.dwell.toFixed(0)+' ms';
    renderDetail();
  };
}

document.querySelectorAll('.preset-chip').forEach(chip=>{
  chip.onclick=()=>{
    const param=chip.dataset.param;
    const val=Number(chip.dataset.val);
    if(param==='impulse'&&sliderImpulse){
      sliderImpulse.value=val;paramOverrides.impulse=val;
      $('param-impulse-val').textContent=val.toFixed(1)+' N·s';
    }else if(param==='tremor'&&sliderTremor){
      sliderTremor.value=val;paramOverrides.tremor=val;
      $('param-tremor-val').textContent=val.toFixed(2)+' mm/s²';
    }else if(param==='eda'&&sliderEda){
      sliderEda.value=val;paramOverrides.eda=val;
      $('param-eda-val').textContent=val.toFixed(1)+' μS';
    }else if(param==='dwell'&&sliderDwell){
      sliderDwell.value=val;paramOverrides.dwell=val;
      $('param-dwell-val').textContent=val.toFixed(0)+' ms';
    }
    renderDetail();
    tell(`Calibrated parameter ${param.toUpperCase()} to ${val}.`);
  };
});

// Quick Connect Button Sync
const quickConn=$('btn-quick-connect');
if(quickConn){
  quickConn.onclick=()=>{
    if(reader||connecting){
      $('disconnect').click();
      quickConn.textContent='⚡ Connect Hardware';
      quickConn.className='btn btn-secondary btn-sm';
      $('conn-pill').className='conn-pill';
      $('conn-status-text').textContent='Simulated Flight';
    }else{
      $('connect').click();
      quickConn.textContent='Disconnect USB';
      quickConn.className='btn btn-secondary btn-sm';
      $('conn-pill').className='conn-pill connected';
      $('conn-status-text').textContent='Live USB Active';
    }
  };
}

// Event Listeners & Controls
$('vessel-preset').onchange=()=>setSpacecraftPreset($('vessel-preset').value);

$('btn-view-3d').onclick=()=>{
  viewMode='3d';
  $('btn-view-3d').classList.add('active');
  $('btn-view-2d').classList.remove('active');
  render();
};

$('btn-view-2d').onclick=()=>{
  viewMode='2d';
  $('btn-view-2d').classList.add('active');
  $('btn-view-3d').classList.remove('active');
  render();
};

$('btn-auto-rotate').onclick=()=>{
  if(V){
    const rotating=V.toggleAutoRotate();
    $('btn-auto-rotate').classList.toggle('active',rotating);
  }
};

$('btn-reset-view').onclick=()=>{
  if(V)V.resetView();
};

$('rail-spin').oninput=()=>{
  if(R)R.setSpin(Number($('rail-spin').value));
};

$('btn-sim-hand').onclick=()=>{
  const r=rail();
  simulateHandAt(Math.round(r.length_mm*0.45));
};

$('scenario-select').onchange=()=>{
  stop();
  currentScenario=$('scenario-select').value;
  time=25;
  render();
  tell(`Switched to scenario: ${$('scenario-select').selectedOptions[0].text}`);
};

$('model-3d-file').onchange=async e=>{
  const file=e.target.files[0];
  if(!file)return;
  try{
    const text=await file.text();
    if(V){
      V.loadOBJ(text);
      viewMode='3d';
      $('btn-view-3d').classList.add('active');
      $('btn-view-2d').classList.remove('active');
      render();
      tell(`Custom 3D model ${file.name} loaded and rendered in 3D orbit viewport.`);
    }
  }catch(err){
    tell('3D Model Error: '+err.message);
  }finally{
    e.target.value='';
  }
};

// File handlers
async function readJSON(file,limit){
  if(!file||file.size>limit)throw Error('File exceeds allowed limit.');
  return JSON.parse(await file.text());
}

async function verifyImage(url){
  if(typeof url!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url)||url.length>11200000){
    throw Error('Only bounded PNG/JPG images allowed.');
  }
  const im=new Image();
  im.src=url;
  await im.decode();
  if(im.width>4096||im.height>4096)throw Error('Image must not exceed 4096 × 4096 px.');
  return url;
}

$('image-file').onchange=async e=>{
  const f=e.target.files[0];
  if(!f)return;
  try{
    const url=await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=()=>res(r.result);
      r.onerror=rej;
      r.readAsDataURL(f);
    });
    image=await verifyImage(url);
    customView=true;
    viewMode='2d';
    $('btn-view-2d').classList.add('active');
    $('btn-view-3d').classList.remove('active');
    render();
    tell('Blueprint cutaway image loaded. Enable placement to anchor rails.');
  }catch(err){
    tell(err.message);
  }finally{
    e.target.value='';
  }
};

$('model-file').onchange=async e=>{
  const f=e.target.files[0];
  if(!f)return;
  try{
    const v=await readJSON(f,12*1024*1024);
    const m=C.model(v);
    const img=v.image?await verifyImage(v.image):null;
    stop();
    vessel=m;
    image=img;
    customView=true;
    modelRevision++;
    selected=m.rails[0].id;
    time=25;
    render();
    tell('Vessel JSON loaded.');
  }catch(err){
    tell(err.message);
  }finally{
    e.target.value='';
  }
};

$('record-file').onchange=async e=>{
  const f=e.target.files[0];
  if(!f)return;
  try{
    const v=await readJSON(f,20*1024*1024);
    const data=C.recording(v,cells().length,selected);
    stop();
    source='import';
    $('source').value=source;
    data.dropped=0;
    sessions.set(key(),data);
    annotations.set(modelRevision+':'+selected,data.finger_annotations);
    time=data.frames[0].t;
    render();
    tell('Sensor telemetry recording imported.');
  }catch(err){
    tell(err.message);
  }finally{
    e.target.value='';
  }
};

$('export-model').onclick=()=>download('AstroKinetic-vessel.json',{...vessel,image});
$('reset-model').onclick=()=>{
  stop();
  vessel=defaultVessel();
  image=null;
  modelRevision++;
  customView=false;
  place=false;
  $('place-mode').checked=false;
  selected='r1';
  time=25;
  render();
  tell('Asteria preset restored.');
};

$('place-mode').onchange=()=>{
  place=$('place-mode').checked;
  if(place&&!image){
    place=false;
    $('place-mode').checked=false;
    tell('Load a 2D cutaway image first before positioning rails.');
  }
};

$('architecture').onclick=e=>{
  if(!place||!image)return;
  const s=$('architecture'),p=new DOMPoint(e.clientX,e.clientY).matrixTransform(s.getScreenCTM().inverse());
  rail().anchor=[Math.max(0,Math.min(1,p.x/1200)),Math.max(0,Math.min(1,p.y/640))];
  draw2DMap();
  tell('Handrail coordinate updated.');
};

$('add-rail').onclick=()=>{
  try{
    if(vessel.rails.length>=32)throw Error('Maximum 32 rails allowed.');
    const r={
      id:'rail-'+Date.now(),
      label:$('new-rail-name').value.trim()||'New Handrail',
      anchor:[.5,.5],
      length_mm:600,
      diameter_mm:32
    };
    vessel=C.model({...vessel,rails:[...vessel.rails,r]});
    if(V)V.addRail(r);
    customView=true;
    selected=r.id;
    $('new-rail-name').value='';
    render();
    tell('Handrail added.');
  }catch(err){
    tell(err.message);
  }
};

$('remove-rail').onclick=()=>{
  if(vessel.rails.length===1){tell('Keep at least one rail in vessel.');return}
  vessel.rails=vessel.rails.filter(r=>r.id!==selected);
  if(V)V.removeRail(selected);
  customView=true;
  selected=vessel.rails[0].id;
  render();
  tell('Handrail removed.');
};

$('apply-geometry').onclick=()=>{
  try{
    const cfg=C.config({length_mm:Number($('length').value),diameter_mm:Number($('diameter').value)});
    if(cfg.length_mm===rail().length_mm&&cfg.diameter_mm===rail().diameter_mm)return;
    Object.assign(rail(),cfg);
    sessions.delete(key());
    annotations.delete(modelRevision+':'+selected);
    render();
    tell('Handrail geometry updated. Dense 10x10 mm 3-2-2-3 array recomputed.');
  }catch(err){
    tell(err.message);
  }
};

$('source').onchange=()=>{
  stop();
  source=$('source').value;
  time=source==='demo'?25:(session().frames.at(-1)?.t||0);
  render();
  tell(source==='demo'?'Synthetic flight telemetry loaded.':'Hardware or imported source active.');
};

$('colour').onchange=()=>renderDetail();
$('channel-select').onchange=()=>renderDetail();
$('clear-labels').onclick=()=>{annotations.set(modelRevision+':'+selected,{});renderDetail()};
$('cursor').oninput=()=>{stop();time=Number($('cursor').value);renderDetail()};

$('timeline').onclick=e=>{
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform($('timeline').getScreenCTM().inverse()),fs=session().frames;
  if(!fs.length)return;
  stop();
  time=fs[0].t+Math.max(0,Math.min(1,(p.x-45)/930))*(fs.at(-1).t-fs[0].t);
  renderDetail();
};

$('play').onclick=()=>{
  if(timer){stop();return}
  const fs=session().frames;
  if(!fs.length)return;
  if(time>=fs.at(-1).t)time=fs[0].t;
  $('play').textContent='Ⅱ';
  $('play').setAttribute('aria-label','Pause recording');
  timer=setInterval(()=>{
    time=Math.min(time+.5,fs.at(-1).t);
    renderDetail();
    if(time>=fs.at(-1).t)stop();
  },500);
};

$('participant').onchange=()=>{
  const v=$('participant').value.trim();
  if(!v)return;
  session().participant=v;
  renderDetail();
};

$('task').onchange=()=>{
  const v=$('task').value.trim();
  if(!v)return;
  session().task=v;
  renderDetail();
};

$('report-form').onsubmit=e=>{
  e.preventDefault();
  if(!C.at(session().frames,time)){tell('A valid frame at cursor is required.');return}
  session().reports.push({t:time,state:$('feeling').value,provenance:'self-reported'});
  renderDetail();
  tell('Astronaut psychological self-report recorded.');
};

$('demo-calibration').onclick=()=>{
  const f=C.at(session().frames,time),cs=cells();
  if(!f||f.contact.some(v=>v===null)){tell('Select a frame with complete contact.');return}
  const active=cs.filter(c=>f.contact[c.id]===1).sort((a,b)=>a.x-b.x||a.angle-b.angle);
  if(active.length<5){tell('Need at least 5 active cells for template calibration.');return}
  const lab={};
  active.forEach((c,i)=>lab[c.id]=P.names[Math.min(4,Math.floor(i*5/active.length))]);
  try{
    session().poseTemplate=P.calibrate(f,cs,lab,rail().diameter_mm);
    renderDetail();
    tell('Calibrated hand template loaded.');
  }catch(err){
    tell(err.message);
  }
};

$('calibrate-pose').onclick=()=>{
  try{
    const f=C.at(session().frames,time);
    session().poseTemplate=P.calibrate(f,cells(),labels(),rail().diameter_mm);
    renderDetail();
    tell('User-annotated template calibrated for this recording.');
  }catch(err){
    tell(err.message);
  }
};

$('clear-pose').onclick=()=>{
  delete session().poseTemplate;
  renderDetail();
  tell('Calibration cleared. Automatic biomechanical estimation active.');
};

$('sample').onclick=()=>download('AstroKinetic-demo-telemetry.json',{...C.demo(cells(),selected,0,currentScenario),config:C.config(rail())});
$('export-session').onclick=()=>download('AstroKinetic-flight-session.json',{
  ...session(),
  config:C.config(rail()),
  vessel_name:vessel.name,
  standard:'NASA Space Apps Challenge · Medical Monitoring Software',
  biomechanics:'3-2-2-3 dense array 10x10 mm tactile phenotyping'
});

$('export-pheno-report').onclick=()=>{
  const e=session(),cs=cells(),f=C.at(e.frames,time),st=C.stats(f,cs),pose=P.identify(f,cs,e.poseTemplate,rail().diameter_mm);
  const report={
    title:'NASA Space Apps Challenge · Astronaut Digital Phenotyping Report',
    mission:'Medical Monitoring Software',
    astronaut:e.participant,
    task:e.task,
    timestamp_s:time,
    spacecraft:vessel.name,
    rail:rail().label,
    phenotyping_telemetry:{
      push_force_n:st.pushForce,
      impulse_ns:f?.impulse_ns,
      micro_tremor_rms:st.microTremor,
      skin_conductance_us:st.skinConductance,
      dwell_time_ms:st.dwellTime,
      slip_velocity_mm_s:f?.slip_velocity_mm_s,
      skin_temperature_c:f?.skin_temperature_c,
      cognitive_workload_score:st.phenotype?.cognitiveWorkload,
      neuromotor_fatigue_pct:st.phenotype?.fatigueIndex,
      psychological_stress_state:null
    },
    grasp_pose:{
      type:pose.graspType,
      hand_centroid_mm:pose.centroid_mm,
      fingers:pose.fingers?.map(d=>({name:d.name,x_mm:d.x,angle_deg:d.angle,load_pct:d.load_pct}))
    },
    flight_surgeon_assessment:$('flight-surgeon-note').textContent
  };
  download(`NASA-Phenotyping-Report-${e.participant}.json`,report);
};

// Web Serial Support
function lock(v){
  for(const id of ['source','usb-format','legacy-geometry','model-file','image-file','record-file','length','diameter','apply-geometry','reset-model','add-rail','remove-rail']){
    $(id).disabled=v;
  }
  $('connect').disabled=v;
  $('disconnect').disabled=!v;
}

$('connect').onclick=async()=>{
  if(connecting||reader)return;
  if(!navigator.serial){tell('Web Serial requires Chrome or Edge browser.');return}
  if($('detection-mode').value!=='hardware'){$('detection-mode').value='hardware';$('detection-mode').dispatchEvent(new Event('change'));}if(source!=='usb'){$('source').value='usb';source='usb';render()}
  stop();
  connecting=true;
  lock(true);
  const target=session(),n=cells().length,boundName=rail().label,format=$('usb-format').value;
  let prev=null,offset=target.frames.length?target.frames.at(-1).t+2:0,first=null,count=0,rejected=0,lastPacket=0,watchdog=null,usbError='';

  try{
    port=await navigator.serial.requestPort();
    await port.open({baudRate:115200});
    reader=port.readable.getReader();
    tell('USB connected to '+boundName+'. Keep your hand off the bar during calibration.');$('arduino-status').textContent='Connected · waiting for calibration and first data';watchdog=setInterval(()=>{if(lastPacket&&Date.now()-lastPacket>2500)$('arduino-status').textContent='No recent data · check the USB connection';},1000);
    let buffer='',decoder=new TextDecoder();

    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      if(buffer.length>131072){buffer='';continue}
      let end;
      while((end=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,end).trim();
        buffer=buffer.slice(end+1);
        if(!line)continue;
        try{
          let raw;
          if(format==='dense'||(format==='auto'&&line.startsWith('{')))raw=JSON.parse(line);
          else {raw=C.arduinoCSV(line,n);if(!raw)continue;}
          const checked=C.frame(raw,n);
          if(first===null)first=checked.t;
          if(prev!==null&&checked.t<prev){offset=target.frames.length?target.frames.at(-1).t+.02:0;first=checked.t;}else if(prev!==null&&checked.t===prev)continue;
          prev=checked.t;
          checked.t=offset+checked.t-first;
          count++;lastPacket=Date.now();$('arduino-status').textContent='Receiving live · '+count+' frames · '+rejected+' rejected · '+boundName;
          if(raw.capacitive_raw){$('arduino-zones').replaceChildren(...raw.capacitive_raw.map((v,i)=>{const zone=document.createElement('div');zone.className='arduino-zone '+(checked.contact[i]===null?'invalid':checked.contact[i]?'touched':'');zone.textContent='Z'+(i+1)+' · '+(checked.contact[i]===null?'Sensor error':checked.contact[i]?'Touched':'Free')+' · '+v+' counts';return zone}));}
          target.frames.push(checked);
          if(target.frames.length>2400)target.frames.shift();
          if(session()===target){time=checked.t;renderDetail()}
        }catch(e){rejected++;$('arduino-status').textContent='Skipped invalid data · '+rejected+' lines · '+e.message;}
      }
    }
  }catch(err){
    usbError=err.name==='NotFoundError'?'Port selection cancelled':err.message; tell('USB Error: '+usbError);
  }finally{
    clearInterval(watchdog);
    if(reader){reader.releaseLock();reader=null}
    if(port){try{await port.close()}catch{}}
    port=null;
    connecting=false;
    lock(false);
    if(liveDetectionActive)toggleLiveDetection();$('arduino-status').textContent=usbError?'Connection issue: '+usbError+' · Close Arduino Serial Monitor and retry.':'Disconnected · '+count+' frames received';tell('USB stream disconnected.');
    render();
  }
};

$('disconnect').onclick=async()=>{if(reader)await reader.cancel()};

// Boot
initStarfield();
initWaveforms();
initSpacecraft();
render();
})();
