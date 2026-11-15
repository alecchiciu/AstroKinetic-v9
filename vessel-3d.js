'use strict';
/**
 * AstroKinetic Vessel 3D Engine
 * Interactive 3D WebGL / Canvas Spacecraft and Rocket Explorer for NASA Digital Phenotyping.
 * Supports preset spacecraft (Asteria, Orion, ISS Laboratory, Gateway), custom 3D model uploads (.obj / .gltf / .glb),
 * and interactive 3D rail anchoring.
 */
window.Vessel3D = (() => {
  const PRESETS = [
    {
      id: 'asteria',
      name: 'Asteria · Deep Space Exploration Rocket',
      type: 'rocket',
      description: '25-meter crewed interplanetary transit rocket with 5 pressurized compartments.',
      rails: [
        { id: 'r1', label: 'Systems · Wall Rail', start: [1.2, 0.8, 1.4], end: [1.2, 0.8, 3.4], length_mm: 600, diameter_mm: 32, anchor: [0.18, 0.5] },
        { id: 'r2', label: 'Systems · Passage Rail', start: [1.4, 4.8, 1.2], end: [3.4, 4.8, 1.2], length_mm: 600, diameter_mm: 32, anchor: [0.24, 0.5] },
        { id: 'r3', label: 'Habitat · Bunk Push-off', start: [5.2, 0.8, 1.4], end: [5.2, 0.8, 3.4], length_mm: 600, diameter_mm: 32, anchor: [0.31, 0.5] },
        { id: 'r4', label: 'Habitat · Central Translation', start: [5.4, 4.8, 1.2], end: [7.8, 4.8, 1.2], length_mm: 600, diameter_mm: 32, anchor: [0.37, 0.5] },
        { id: 'r5', label: 'Laboratory · Glovebox Rail', start: [10.2, 0.8, 1.4], end: [10.2, 0.8, 3.4], length_mm: 600, diameter_mm: 32, anchor: [0.44, 0.5] },
        { id: 'r6', label: 'Laboratory · Ceiling Guide', start: [10.4, 4.8, 1.2], end: [13.8, 4.8, 1.2], length_mm: 600, diameter_mm: 32, anchor: [0.51, 0.5] },
        { id: 'r7', label: 'Command · Pilot Push-off', start: [16.2, 0.8, 1.4], end: [16.2, 0.8, 3.4], length_mm: 600, diameter_mm: 32, anchor: [0.57, 0.5] },
        { id: 'r8', label: 'Command · Flight Deck Rail', start: [16.4, 4.8, 1.2], end: [19.8, 4.8, 1.2], length_mm: 600, diameter_mm: 32, anchor: [0.64, 0.5] },
        { id: 'r9', label: 'Airlock · Ingress Handrail', start: [22.2, 0.8, 1.4], end: [22.2, 0.8, 3.4], length_mm: 600, diameter_mm: 32, anchor: [0.70, 0.5] },
        { id: 'r10', label: 'Airlock · Outer Hatch Rail', start: [22.4, 4.8, 1.2], end: [24.4, 4.8, 1.2], length_mm: 600, diameter_mm: 32, anchor: [0.77, 0.5] }
      ]
    },
    {
      id: 'orion',
      name: 'NASA Orion · Crew Exploration Vehicle',
      type: 'capsule',
      description: 'NASA Artemis deep-space exploration capsule with forward docking hatch.',
      rails: [
        { id: 'or1', label: 'Forward Hatch · Egress Rail', start: [2.8, 2.5, 3.0], end: [2.8, 3.5, 3.0], length_mm: 600, diameter_mm: 32, anchor: [0.30, 0.35] },
        { id: 'or2', label: 'Commander Station · Primary Rail', start: [1.2, 1.2, 1.5], end: [1.8, 1.2, 1.5], length_mm: 600, diameter_mm: 32, anchor: [0.42, 0.45] },
        { id: 'or3', label: 'Pilot Station · Push-off Bar', start: [1.2, 3.8, 1.5], end: [1.8, 3.8, 1.5], length_mm: 600, diameter_mm: 32, anchor: [0.42, 0.65] },
        { id: 'or4', label: 'Starboard Avionics · Translation Rail', start: [0.5, 4.5, 1.8], end: [1.5, 4.5, 1.8], length_mm: 600, diameter_mm: 32, anchor: [0.60, 0.72] },
        { id: 'or5', label: 'Port Life-Support · Translation Rail', start: [0.5, 0.5, 1.8], end: [1.5, 0.5, 1.8], length_mm: 600, diameter_mm: 32, anchor: [0.60, 0.28] },
        { id: 'or6', label: 'Aft Tunnel · Translation Guide', start: [0.2, 2.5, 1.2], end: [0.8, 2.5, 1.2], length_mm: 600, diameter_mm: 32, anchor: [0.78, 0.50] }
      ]
    },
    {
      id: 'iss_lab',
      name: 'ISS Columbus / Destiny · Science Laboratory Module',
      type: 'module',
      description: 'International Space Station cylindrical microgravity science laboratory.',
      rails: [
        { id: 'iss1', label: 'Overhead Deck · Translation Rail 01', start: [0.8, 2.0, 3.8], end: [2.2, 2.0, 3.8], length_mm: 600, diameter_mm: 32, anchor: [0.22, 0.25] },
        { id: 'iss2', label: 'Overhead Deck · Translation Rail 02', start: [3.0, 2.0, 3.8], end: [4.4, 2.0, 3.8], length_mm: 600, diameter_mm: 32, anchor: [0.50, 0.25] },
        { id: 'iss3', label: 'Overhead Deck · Translation Rail 03', start: [5.2, 2.0, 3.8], end: [6.4, 2.0, 3.8], length_mm: 600, diameter_mm: 32, anchor: [0.78, 0.25] },
        { id: 'iss4', label: 'Floor Deck · Foot Restraint Handhold', start: [1.0, 2.0, 0.4], end: [2.4, 2.0, 0.4], length_mm: 600, diameter_mm: 32, anchor: [0.22, 0.75] },
        { id: 'iss5', label: 'Floor Deck · Science Rack Rail', start: [3.2, 2.0, 0.4], end: [4.6, 2.0, 0.4], length_mm: 600, diameter_mm: 32, anchor: [0.50, 0.75] },
        { id: 'iss6', label: 'Starboard Experiment Rack · Push-off', start: [2.5, 3.8, 2.0], end: [2.5, 3.8, 2.6], length_mm: 600, diameter_mm: 32, anchor: [0.38, 0.50] },
        { id: 'iss7', label: 'Port Glovebox Rack · Push-off', start: [4.8, 0.2, 2.0], end: [4.8, 0.2, 2.6], length_mm: 600, diameter_mm: 32, anchor: [0.65, 0.50] }
      ]
    },
    {
      id: 'gateway',
      name: 'Lunar Gateway · HALO Habitation Outpost',
      type: 'gateway',
      description: 'Next-generation lunar orbital habitat with axial and radial push-off handrails.',
      rails: [
        { id: 'gw1', label: 'Radial Port A · Transit Rail', start: [1.0, 0.5, 1.8], end: [1.6, 0.5, 1.8], length_mm: 600, diameter_mm: 32, anchor: [0.25, 0.35] },
        { id: 'gw2', label: 'Axial Tunnel · Central Handhold', start: [2.2, 2.0, 2.2], end: [3.4, 2.0, 2.2], length_mm: 600, diameter_mm: 32, anchor: [0.45, 0.50] },
        { id: 'gw3', label: 'Lunar Science Bay · Push-off Bar', start: [4.0, 3.5, 1.8], end: [4.6, 3.5, 1.8], length_mm: 600, diameter_mm: 32, anchor: [0.65, 0.65] },
        { id: 'gw4', label: 'Docking Collar · Translation Guide', start: [5.2, 2.0, 2.0], end: [5.8, 2.0, 2.0], length_mm: 600, diameter_mm: 32, anchor: [0.82, 0.50] }
      ]
    }
  ];

  let canvas = null, ctx = null;
  let currentPreset = PRESETS[0];
  let customMesh = null; // user-uploaded OBJ mesh
  let selectedRailId = 'r1';
  let onSelectCallback = null;

  // 3D Camera / Orbit state
  let rotX = 0.32, rotY = -0.58;
  let zoom = 1.0;
  let panX = 0, panY = 0;
  let isDragging = false, lastMouseX = 0, lastMouseY = 0;
  let autoRotate = false, dragDistance=0;
  let animId = null;

  function init(containerEl, onSelect) {
    onSelectCallback = onSelect;
    containerEl.replaceChildren();

    canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'grab';
    containerEl.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize);
    new ResizeObserver(resize).observe(containerEl);
    setupInteraction();
    startLoop();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    canvas.height = Math.max(200, Math.floor(rect.height * dpr));
  }

  function setupInteraction() {
    canvas.addEventListener('mousedown', e => {
      isDragging = true; dragDistance=0;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY; dragDistance+=Math.hypot(dx,dy);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      if (e.shiftKey || e.button === 2) {
        panX += dx * 0.8;
        panY += dy * 0.8;
      } else {
        rotY += dx * 0.007;
        rotX += dy * 0.007;
        rotX = Math.max(-1.4, Math.min(1.4, rotX));
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (canvas) canvas.style.cursor = 'grab';
      }
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      zoom *= (e.deltaY > 0 ? 0.92 : 1.08);
      zoom = Math.max(0.4, Math.min(4.5, zoom));
    }, { passive: false });

    canvas.addEventListener('click', e => {
      if(dragDistance>6)return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const clickX = (e.clientX - rect.left) * dpr;
      const clickY = (e.clientY - rect.top) * dpr;
      checkRailHit(clickX, clickY);
    });
  }

  function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    function loop() {
      if (autoRotate) rotY += 0.004;
      render();
      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // 3D Math & Projection
  function project(x, y, z, cx, cy, scale) {
    // Rotation around Y
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Rotation around X
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Perspective projection
    const fov = 800;
    const dist = z2 + 600;
    if (dist <= 10) return null;
    const factor = (fov / dist) * scale;
    return {
      x: cx + x1 * factor + panX,
      y: cy + y2 * factor + panY,
      z: dist,
      depth: z2
    };
  }

  // Render loop
  const railScreenCoords = [];

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep space background gradient
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 40, w * 0.5, h * 0.5, Math.max(w, h));
    bg.addColorStop(0, '#101726');
    bg.addColorStop(0.6, '#080d17');
    bg.addColorStop(1, '#03060a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle star field / grid markers
    drawBackdropStars(ctx, w, h);

    const cx = w * 0.5, cy = h * 0.5;
    const scale = (Math.min(w, h) / 700) * zoom;

    railScreenCoords.length = 0;

    // If custom OBJ mesh is loaded, render it
    if (customMesh) {
      renderCustomMesh(ctx, customMesh, cx, cy, scale);
    } else {
      // Render procedural spacecraft based on currentPreset
      renderProceduralSpacecraft(ctx, currentPreset, cx, cy, scale);
    }

    if(!customMesh) cabinDetails(ctx,currentPreset,cx,cy,scale);

    // Render 3D Handrails
    renderHandrails(ctx, currentPreset.rails, cx, cy, scale);

    // Telemetry HUD overlay
    drawHUD(ctx, w, h);
  }

  function drawBackdropStars(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(100, 150, 200, 0.15)';
    // Fixed procedural stars
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137.5) % w);
      const sy = ((i * 269.3) % h);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.restore();
  }

  function renderProceduralSpacecraft(ctx, preset, cx, cy, scale) {
    ctx.save();
    const type = preset.type || 'rocket';

    if (type === 'capsule') {
      // Orion capsule geometry
      renderOrionCapsule(ctx, cx, cy, scale);
    } else if (type === 'module') {
      // ISS Columbus / Destiny cylinder
      renderISSModule(ctx, cx, cy, scale);
    } else if (type === 'gateway') {
      // Lunar Gateway HALO
      renderGatewayHalo(ctx, cx, cy, scale);
    } else {
      // Default Asteria exploration rocket
      renderAsteriaRocket(ctx, cx, cy, scale);
    }
    ctx.restore();
  }

  function renderAsteriaRocket(ctx, cx, cy, scale) {
    // 5 modules spanning X from -250 to +250
    const segs = [
      { name: 'Systems & Propulsion', x0: -240, x1: -150, color: '#334155' },
      { name: 'Crew Habitat', x0: -150, x1: -50, color: '#1e293b' },
      { name: 'Science Laboratory', x0: -50, x1: 50, color: '#1e293b' },
      { name: 'Flight Command', x0: 50, x1: 150, color: '#334155' },
      { name: 'EVA Airlock', x0: 150, x1: 220, color: '#1e293b' }
    ];

    const rad = 75;

    // Draw cylindrical outer wireframe ribs & semi-transparent hull
    for (const seg of segs) {
      drawCylinderSection(ctx, seg.x0, seg.x1, rad, cx, cy, scale, seg.color);
    }

    // Ogive nose cone
    drawNoseCone(ctx, 220, 310, rad, cx, cy, scale);

    // Aft engine skirt & nozzle
    drawEngineBell(ctx, -240, -290, rad, cx, cy, scale);

    // Stabilizer swept fins
    drawStabilizerFin(ctx, -210, rad, 1, cx, cy, scale);
    drawStabilizerFin(ctx, -210, rad, -1, cx, cy, scale);
  }

  function renderOrionCapsule(ctx, cx, cy, scale) {
    const baseR = 120, topR = 50;
    const x0 = -80, x1 = 100;
    // Truncated cone
    drawTruncatedCone(ctx, x0, x1, baseR, topR, cx, cy, scale, '#1e293b');
    drawCylinderSection(ctx,-155,-85,87,cx,cy,scale,'#9aa7b4');
    for(const sign of [-1,1])surfacePatch(ctx,[[-150,sign*85,-15],[-75,sign*85,-15],[-75,sign*245,-15],[-150,sign*245,-15]],cx,cy,scale,'#183e66');
    // Forward docking tunnel
    drawCylinderSection(ctx, x1, x1 + 45, topR * 0.7, cx, cy, scale, '#334155');
  }

  function renderISSModule(ctx, cx, cy, scale) {
    const r = 85;
    drawCylinderSection(ctx, -180, 180, r, cx, cy, scale, '#1e293b');
    // CBM docking end-rings
    drawCylinderSection(ctx, -210, -180, 48, cx, cy, scale, '#475569');
    drawCylinderSection(ctx, 180, 210, 48, cx, cy, scale, '#475569');
  }

  function renderGatewayHalo(ctx, cx, cy, scale) {
    const r = 70;
    drawCylinderSection(ctx, -140, 140, r, cx, cy, scale, '#1e293b');
    for(const sign of [-1,1])surfacePatch(ctx,[[-125,sign*70,-15],[-45,sign*70,-15],[-45,sign*220,-15],[-125,sign*220,-15]],cx,cy,scale,'#203d69');
    // Radial docking port
    drawCylinderSection(ctx, -30, 30, r * 1.3, cx, cy, scale, '#334155');
  }


  function cabinDetails(ctx,preset,cx,cy,scale){
    const capsule=preset.type==='capsule',rocket=preset.type==='rocket';
    const lo=rocket?-225:capsule?-65:preset.type==='module'?-170:-130;
    const hi=rocket?210:capsule?65:preset.type==='module'?170:130;
    const radius=capsule?95:rocket?75:78;
    const patch=(p,c)=>surfacePatch(ctx,p,cx,cy,scale,c);
    // Equipment racks: separate faces give cabinet depth and readable service panels.
    for(let x=lo+12;x<hi-28;x+=42){
      const z=-radius*.67;
      patch([[x,-36,z],[x+29,-36,z],[x+29,31,z],[x,31,z]],'#c1c7cd');
      patch([[x+29,-36,z],[x+34,-31,z-8],[x+34,31,z-8],[x+29,31,z]],'#677785');
      patch([[x+3,-29,z+1],[x+25,-29,z+1],[x+25,-10,z+1],[x+3,-10,z+1]],'#101f2c');
      for(let k=0;k<4;k++)patch([[x+4,-5+k*7,z+1],[x+24,-5+k*7,z+1],[x+24,-3+k*7,z+1],[x+4,-3+k*7,z+1]],'#667887');
      patch([[x+5,-24,z+2],[x+20,-24,z+2],[x+20,-23,z+2],[x+5,-23,z+2]],'#71c9d5');
    }
    // Deck panels with narrow seams and contrasting edge strips.
    for(let x=lo;x<hi-20;x+=25){
      patch([[x,37,-35],[x+23,37,-35],[x+23,37,35],[x,37,35]],'#536474');
      patch([[x,36,-34],[x+23,36,-34],[x+23,36,-31],[x,36,-31]],'#d1d9db');
    }
    // Open pressure hatches and structural rings; not a certified engineering layout.
    for(const x of [lo,hi]){
      for(let i=0;i<40;i++){
        const a=i*Math.PI/20,b=(i+1)*Math.PI/20;
        patch([[x,Math.cos(a)*radius,Math.sin(a)*radius],[x,Math.cos(b)*radius,Math.sin(b)*radius],[x,Math.cos(b)*(radius-8),Math.sin(b)*(radius-8)],[x,Math.cos(a)*(radius-8),Math.sin(a)*(radius-8)]],'#9daab6');
      }
    }
    if(capsule){
      for(const y of [-35,18]){
        patch([[-30,y,-15],[12,y,-15],[12,y+25,-15],[-30,y+25,-15]],'#344b63');
        patch([[-30,y,-15],[-42,y,-52],[-42,y+25,-52],[-30,y+25,-15]],'#60758c');
        patch([[30,y,-25],[40,y,-53],[40,y+25,-53],[30,y+25,-25]],'#121e2c');
      }
    }
    ctx.save();ctx.fillStyle='#aab9ca';ctx.font='11px monospace';ctx.fillText('CUTAWAY • CONCEPTUAL INTERIOR / SELECT A NUMBERED HANDRAIL',22,canvas.height-22);ctx.restore();
  }
  function surfacePatch(ctx,points,cx,cy,scale,color){
    const ps=points.map(v=>project(...v,cx,cy,scale));if(ps.some(p=>!p))return;
    ctx.beginPath();ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='rgba(208,224,245,.24)';ctx.lineWidth=.7;ctx.stroke();
  }
  function metalShell(ctx,x0,x1,r0,r1,cx,cy,scale){
    const faces=[];
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
      // Open near-side quarter reveals the cabin rather than hiding its rails.
      if(i>=3&&i<=12)continue;
      const pts=[[x0,Math.cos(a)*r0,Math.sin(a)*r0],[x1,Math.cos(a)*r1,Math.sin(a)*r1],[x1,Math.cos(b)*r1,Math.sin(b)*r1],[x0,Math.cos(b)*r0,Math.sin(b)*r0]];
      const shade=Math.round(88+80*Math.max(0,Math.cos(a-2.3)));
      faces.push({pts,z:pts.reduce((n,v)=>n+(project(...v,cx,cy,scale)?.depth||0),0),color:`rgb(${shade},${shade+10},${shade+22})`});
    }
    faces.sort((a,b)=>b.z-a.z).forEach(f=>surfacePatch(ctx,f.pts,cx,cy,scale,f.color));
    surfacePatch(ctx,[[x0,35,-r0*.65],[x1,35,-r1*.65],[x1,35,r1*.65],[x0,35,r0*.65]],cx,cy,scale,'#233448');
    for(let x=x0+15;r0===r1 && x<x1-24;x+=32){
      surfacePatch(ctx,[[x,-25,-r0*.72],[x+23,-25,-r0*.72],[x+23,30,-r0*.72],[x,30,-r0*.72]],cx,cy,scale,'#b2bdc9');
      surfacePatch(ctx,[[x+3,-19,-r0*.72+1],[x+19,-19,-r0*.72+1],[x+19,-4,-r0*.72+1],[x+3,-4,-r0*.72+1]],cx,cy,scale,'#172d42');
    }
  }
  function drawCylinderSection(ctx, x0, x1, r, cx, cy, scale, fillColor) {
    metalShell(ctx,x0,x1,r,r,cx,cy,scale);
    const steps = 18;
    const rings = [x0, x1];

    // Longitudinal ribs
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const y = Math.cos(a) * r, z = Math.sin(a) * r;
      const p0 = project(x0, y, z, cx, cy, scale);
      const p1 = project(x1, y, z, cx, cy, scale);
      if (p0 && p1) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    // Circumferential rings
    ctx.strokeStyle = 'rgba(192, 207, 221, 0.55)';
    for (const rx of rings) {
      ctx.beginPath();
      let first = null;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const y = Math.cos(a) * r, z = Math.sin(a) * r;
        const p = project(rx, y, z, cx, cy, scale);
        if (p) {
          if (!first) { first = p; ctx.moveTo(p.x, p.y); }
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }
  }

  function drawNoseCone(ctx, x0, x1, r, cx, cy, scale) {
    metalShell(ctx,x0,x1,r,1,cx,cy,scale);
    const steps = 14;
    ctx.strokeStyle = 'rgba(203, 216, 228, 0.35)';
    const tip = project(x1, 0, 0, cx, cy, scale);
    if (!tip) return;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const y = Math.cos(a) * r, z = Math.sin(a) * r;
      const p = project(x0, y, z, cx, cy, scale);
      if (p) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
    }
  }

  function drawEngineBell(ctx, x0, x1, r, cx, cy, scale) {
    metalShell(ctx,x0,x1,r*.5,r*.85,cx,cy,scale);
    const steps = 12;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const y0 = Math.cos(a) * (r * 0.8), z0 = Math.sin(a) * (r * 0.8);
      const y1 = Math.cos(a) * (r * 1.3), z1 = Math.sin(a) * (r * 1.3);
      const p0 = project(x0, y0, z0, cx, cy, scale);
      const p1 = project(x1, y1, z1, cx, cy, scale);
      if (p0 && p1) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
  }

  function drawStabilizerFin(ctx, xRoot, r, sign, cx, cy, scale) {
    const y0 = r * sign, y1 = (r + 70) * sign;
    const pA = project(xRoot, y0, 0, cx, cy, scale);
    const pB = project(xRoot - 60, y1, 0, cx, cy, scale);
    const pC = project(xRoot + 40, y0, 0, cx, cy, scale);
    if (pA && pB && pC) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.fillStyle = 'rgba(170,190,212,.8)';
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawTruncatedCone(ctx, x0, x1, r0, r1, cx, cy, scale) {
    metalShell(ctx,x0,x1,r0,r1,cx,cy,scale);
    const steps = 16;
    ctx.strokeStyle = 'rgba(0, 210, 196, 0.4)';
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const y0 = Math.cos(a) * r0, z0 = Math.sin(a) * r0;
      const y1 = Math.cos(a) * r1, z1 = Math.sin(a) * r1;
      const p0 = project(x0, y0, z0, cx, cy, scale);
      const p1 = project(x1, y1, z1, cx, cy, scale);
      if (p0 && p1) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
  }

  function renderHandrails(ctx, rails, cx, cy, scale) {
    if (!rails) return;

    rails.forEach((r, idx) => {
      // Map normalized/module coords to model 3D space
      let x0 = 0, y0 = 0, z0 = 0, x1 = 0, y1 = 0, z1 = 0;
      if (r.start && r.end) {
        // scale meters to 3D units
        const to3D = v => currentPreset.type==='rocket'?[(v[0]-12.5)*18,(v[1]-2.5)*22,(v[2]-2.5)*22]:currentPreset.type==='capsule'?[(v[0]-1.5)*48,(v[1]-2.5)*32,(v[2]-2)*32]:[(v[0]-3.3)*48,(v[1]-2)*30,(v[2]-2)*30];
        const p0 = to3D(r.start);
        const p1 = to3D(r.end);
        x0 = p0[0]; y0 = p0[1]; z0 = p0[2];
        x1 = p1[0]; y1 = p1[1]; z1 = p1[2];
      } else if (r.anchor) {
        // map normalized 2D anchor to cylindrical rail in 3D
        x0 = (r.anchor[0] - 0.5) * 440;
        y0 = (r.anchor[1] - 0.5) * 80;
        z0 = 40;
        x1 = x0 + (r.length_mm ? r.length_mm * 0.08 : 30);
        y1 = y0;
        z1 = z0;
      }

      const pA = project(x0, y0, z0, cx, cy, scale);
      const pB = project(x1, y1, z1, cx, cy, scale);
      if (!pA || !pB) return;

      const isSelected = r.id === selectedRailId;

      // Draw metallic cylindrical rail
      ctx.save();
      ctx.lineWidth = isSelected ? 7 : 4;
      ctx.lineCap = 'round';

      // Rail outer glow if selected
      if (isSelected) {
        ctx.strokeStyle = 'rgba(203, 216, 228, 0.35)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }

      // Main rail body
      ctx.strokeStyle = isSelected ? '#f59e0b' : '#00d2c4';
      ctx.lineWidth = isSelected ? 6 : 3.5;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();

      // Rail highlight core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();

      // Anchor stanchions
      for (const p of [pA, pB]) {
        ctx.fillStyle = isSelected ? '#f59e0b' : '#00d2c4';
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rail badge label
      const midX = (pA.x + pB.x) * 0.5;
      const midY = (pA.y + pB.y) * 0.5 - 18;

      ctx.fillStyle = isSelected ? '#f59e0b' : 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isSelected ? '#ffffff' : '#00d2c4';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(midX, midY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), midX, midY);

      // Store screen coordinates for hit testing
      railScreenCoords.push({
        id: r.id,
        label: r.label,
        x: midX,
        y: midY,
        ax:pA.x, ay:pA.y, bx:pB.x, by:pB.y, radius: 20
      });

      ctx.restore();
    });
  }

  function checkRailHit(px, py) {
    for (const r of railScreenCoords) {
      const d = Math.hypot(px - r.x, py - r.y);
      const dx=r.bx-r.ax,dy=r.by-r.ay,t=Math.max(0,Math.min(1,((px-r.ax)*dx+(py-r.ay)*dy)/(dx*dx+dy*dy||1)));
      if (d <= r.radius || Math.hypot(px-r.ax-t*dx,py-r.ay-t*dy)<14) {
        selectRail(r.id);
        if(onSelectCallback)onSelectCallback(r.id);
        return;
      }
    }
  }

  function selectRail(id) {
    selectedRailId = id;

  }

  function drawHUD(ctx, w, h) {
    ctx.save();
    // Top-left Spacecraft info badge
    ctx.fillStyle = 'rgba(8, 13, 23, 0.85)';
    ctx.strokeStyle = 'rgba(0, 210, 196, 0.3)';
    ctx.lineWidth = 1;
    ctx.roundRect(16, 16, 320, 64, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00d2c4';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('3D SPACECRAFT MODEL · FLIGHT READY', 28, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(currentPreset.name, 28, 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(currentPreset.description, 28, 68);

    // Bottom-right controls hint
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('🖱 Drag: 360° Orbit · Scroll: Zoom · Shift+Drag: Pan · Click Rail: Select', w - 16, h - 16);
    ctx.restore();
  }

  // Custom OBJ / Mesh Parser
  function loadOBJ(objText) {
    const lines = objText.split('\n');
    const vertices = [];
    const faces = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'v') {
        vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (parts[0] === 'f') {
        const faceIndices = parts.slice(1).map(p => parseInt(p.split('/')[0], 10) - 1);
        if (faceIndices.length >= 3) {
          faces.push(faceIndices);
        }
      }
    }

    if (!vertices.length) throw new Error('No valid 3D vertices found in OBJ file.');

    // Normalize mesh scale to fit within ~300 units
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    vertices.forEach(([x, y, z]) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    });

    const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const normScale = 320 / maxDim;

    const normVerts = vertices.map(([x, y, z]) => [
      (x - cx) * normScale,
      (y - cy) * normScale,
      (z - cz) * normScale
    ]);

    customMesh = { vertices: normVerts, faces };
  }

  function renderCustomMesh(ctx, mesh, cx, cy, scale) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 210, 196, 0.4)';
    ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
    ctx.lineWidth = 0.8;

    const projVerts = mesh.vertices.map(([x, y, z]) => project(x, y, z, cx, cy, scale));

    for (const face of mesh.faces) {
      ctx.beginPath();
      let valid = true;
      face.forEach((idx, i) => {
        const p = projVerts[idx];
        if (!p) { valid = false; return; }
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      if (valid) {
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function setPreset(presetId) {
    const p = PRESETS.find(x => x.id === presetId);
    if (!p) return;
    currentPreset = p;
    customMesh = null;
    selectedRailId = p.rails[0].id;
    resize();
  }

  function addRail(newRail) {
    currentPreset.rails.push(newRail);
  }

  function removeRail(railId) {
    currentPreset.rails = currentPreset.rails.filter(r => r.id !== railId);
  }

  return {
    PRESETS,
    init,
    resize,
    setPreset,
    loadOBJ,
    selectRail,
    addRail,
    removeRail,
    getPreset: () => currentPreset,
    toggleAutoRotate: () => { autoRotate = !autoRotate; return autoRotate; },
    resetView: () => { rotX = 0.32; rotY = -0.58; zoom = 1.0; panX = 0; panY = 0; }
  };
})();

