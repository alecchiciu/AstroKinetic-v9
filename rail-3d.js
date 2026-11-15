'use strict';
/**
 * AstroKinetic 3D Cylindrical Handrail Visualizer
 * Real-time 3D rendering of the spacecraft handrail with full-length dense 10x10 mm tactile sensor matrix (3-2-2-3 repeating pattern).
 * Displays real-time cell pressures, 3D hand placement overlay, and interactive simulated grasp placement.
 */
window.Rail3D = (() => {
  let canvas = null, ctx = null;
  let cells = [];
  let currentFrame = null;
  let railLength = 600, railDiameter = 32;
  let colorMode = 'contact'; // 'contact' | 'pressure' | 'fingers'
  let digitLabels = {};
  let poseData = null;

  // View state
  let rotAngle = 30 * Math.PI / 180; // circumferential spin angle (radians)
  let tiltX = 0.25; // slight pitch
  let isDragging = false, lastX = 0, lastY = 0;
  let onHandPlaced = null;

  const DIGIT_COLORS = {
    Thumb: '#f97316',
    Index: '#06b6d4',
    Middle: '#6366f1',
    Ring: '#a855f7',
    Little: '#eab308',
    Palm: '#10b981'
  };

  function init(containerEl, onPlace) {
    onHandPlaced = onPlace;
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
    setupInteraction();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    canvas.height = Math.max(160, Math.floor(rect.height * dpr));
    render();
  }

  function setupInteraction() {
    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      rotAngle += dx * 0.012;
      tiltX += dy * 0.006;
      tiltX = Math.max(-0.6, Math.min(0.6, tiltX));
      render();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (canvas) canvas.style.cursor = 'grab';
      }
    });

    // Click on handrail to simulate astronaut hand placement
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const margin = 50;
      const railDrawWidth = rect.width - margin * 2;
      if (clickX >= margin && clickX <= rect.width - margin) {
        const norm = (clickX - margin) / railDrawWidth;
        const mm = Math.round(norm * railLength);
        if (onHandPlaced) onHandPlaced(mm);
      }
    });
  }

  function update(newCells, frame, length, diameter, mode, labels, pose) {
    cells = newCells || [];
    currentFrame = frame;
    railLength = length || 600;
    railDiameter = diameter || 32;
    colorMode = mode || 'contact';
    digitLabels = labels || {};
    poseData = pose || null;
    render();
  }

  function setSpin(deg) {
    rotAngle = (deg * Math.PI) / 180;
    render();
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep tech dark background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c121e');
    bg.addColorStop(1, '#060a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const marginX = Math.max(40, w * 0.06);
    const railDrawW = w - marginX * 2;
    const centerY = h * 0.46;
    const tubeR = Math.max(14, Math.min(26, h * 0.12));

    // Draw Mounting Brackets at ends
    drawMountingBracket(ctx, marginX - 12, centerY, tubeR, true);
    drawMountingBracket(ctx, marginX + railDrawW + 12, centerY, tubeR, false);

    // Draw Main Cylindrical Metallic Tube
    const tubeGrad = ctx.createLinearGradient(0, centerY - tubeR, 0, centerY + tubeR);
    tubeGrad.addColorStop(0, '#64748b');
    tubeGrad.addColorStop(0.2, '#94a3b8');
    tubeGrad.addColorStop(0.5, '#cbd5e1');
    tubeGrad.addColorStop(0.8, '#64748b');
    tubeGrad.addColorStop(1, '#334155');

    ctx.fillStyle = tubeGrad;
    ctx.beginPath();
    ctx.roundRect(marginX, centerY - tubeR, railDrawW, tubeR * 2, 4);
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Longitudinal reference line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, centerY - tubeR * 0.4);
    ctx.lineTo(marginX + railDrawW, centerY - tubeR * 0.4);
    ctx.stroke();

    // Render 10x10 mm Tactile Sensor Cells around the cylinder
    if (cells.length > 0) {
      renderSensorCells(ctx, marginX, railDrawW, centerY, tubeR);
    }

    // Render 3D Hand Overlay if grip is detected
    if (poseData && poseData.status === 'estimated') {
      renderHandOverlay(ctx, marginX, railDrawW, centerY, tubeR, poseData);
    }

    // HUD overlays
    drawRailHUD(ctx, w, h, marginX, railDrawW, centerY, tubeR);
  }

  function drawMountingBracket(ctx, x, y, r, isLeft) {
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#00d2c4';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(x - (isLeft ? 8 : 4), y - r * 1.5, 12, r * 3, 3);
    ctx.fill();
    ctx.stroke();

    // Stanchion post to bulkhead
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 4, y + r * 1.3, 8, 30);

    ctx.restore();
  }

  function renderSensorCells(ctx, startX, drawW, centerY, r) {
    ctx.save();

    // Sort cells by 3D depth (Z) based on current rotAngle so back cells are occluded or dotted
    const cellProjections = cells.map(c => {
      const normX = (c.x - 5) / (railLength || 600);
      const px = startX + normX * drawW;

      // Angle in radians adjusted by rotAngle
      const curRad = ((c.angle * Math.PI) / 180) + rotAngle;
      const cosA = Math.cos(curRad);
      const sinA = Math.sin(curRad);

      // py position on tube projected with tilt
      const py = centerY + sinA * r + cosA * (tiltX * 18);
      const isFront = cosA >= -0.2; // visible on front hemisphere

      return {
        cell: c,
        px,
        py,
        cosA,
        sinA,
        isFront
      };
    });

    // Render cells
    cellProjections.forEach(p => {
      const c = p.cell;
      const i = c.id;
      const isContact = currentFrame?.contact?.[i] === 1;
      const isMissing = currentFrame?.contact?.[i] === null;
      const pressure = currentFrame?.pressure_kpa?.[i];
      const label = digitLabels[i];

      // Pad size scaled by perspective / front vs back
      const padW = Math.max(6, Math.min(14, (drawW / (railLength / 10)) * 0.85));
      const padH = Math.max(5, Math.min(12, padW * Math.max(0.35, Math.abs(p.cosA))));

      let fillColor = '#475569';
      let strokeColor = '#334155';
      let glow = false;

      if (isMissing) {
        fillColor = '#d97706';
        strokeColor = '#b45309';
      } else if (colorMode === 'pressure') {
        if (pressure !== null && pressure !== undefined) {
          const t = Math.min(1, pressure / 50);
          fillColor = getPressureColor(t);
          strokeColor = '#ffffff';
          if (pressure > 20) glow = true;
        } else {
          fillColor = isContact ? '#10b981' : '#334155';
        }
      } else if (colorMode === 'fingers' && label) {
        fillColor = DIGIT_COLORS[label] || '#00d2c4';
        strokeColor = '#ffffff';
        glow = true;
      } else {
        // Standard contact mode
        if (isContact) {
          fillColor = '#10b981';
          strokeColor = '#ecfdf5';
          glow = true;
        } else {
          fillColor = 'rgba(71, 85, 105, 0.7)';
          strokeColor = 'rgba(51, 65, 85, 0.9)';
        }
      }

      ctx.save();
      // If cell is on the back side, make it translucent
      if (!p.isFront) {
        ctx.globalAlpha = 0.25;
      }

      if (glow && p.isFront) {
        ctx.shadowColor = fillColor;
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = glow ? 1.2 : 0.6;

      ctx.beginPath();
      ctx.roundRect(p.px - padW * 0.5, p.py - padH * 0.5, padW, padH, 1.5);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  }

  function getPressureColor(t) {
    // 0 = cyan, 0.35 = emerald, 0.7 = amber, 1.0 = crimson
    if (t < 0.35) {
      return `rgb(${Math.round(6 + t * 45)}, ${Math.round(182 + t * 10)}, ${Math.round(212 - t * 80)})`;
    } else if (t < 0.7) {
      const u = (t - 0.35) / 0.35;
      return `rgb(${Math.round(16 + u * 229)}, ${Math.round(185 + u * -30)}, ${Math.round(129 + u * -118)})`;
    } else {
      const u = (t - 0.7) / 0.3;
      return `rgb(${Math.round(245 + u * -6)}, ${Math.round(158 + u * -90)}, ${Math.round(11 + u * 57)})`;
    }
  }

  function renderHandOverlay(ctx, startX, drawW, centerY, r, pose) {
    if (!pose.fingers || !pose.fingers.length) return;
    ctx.save();

    const handCentroidX = pose.centroid_mm || (pose.fingers.reduce((s, f) => s + f.x, 0) / pose.fingers.length);
    const normX = (handCentroidX) / (railLength || 600);
    const handPx = startX + normX * drawW;
    const handPy = centerY;

    // Translucent hand palm silhouette
    ctx.fillStyle = 'rgba(0, 210, 196, 0.12)';
    ctx.strokeStyle = 'rgba(0, 210, 196, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.ellipse(handPx, handPy, Math.max(35, drawW * 0.08), r * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Digit markers
    pose.fingers.forEach((f, idx) => {
      const fnorm = (f.x) / (railLength || 600);
      const fx = startX + fnorm * drawW;
      const angleRad = f.angle !== null ? (f.angle * Math.PI) / 180 + rotAngle : 0;
      const fy = centerY + Math.sin(angleRad) * r * 1.2;

      ctx.fillStyle = DIGIT_COLORS[f.name] || '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.name.slice(0, 2).toUpperCase(), fx, fy - 8);
    });

    ctx.restore();
  }

  function drawRailHUD(ctx, w, h, startX, drawW, centerY, tubeR) {
    ctx.save();

    // Top-left label
    ctx.fillStyle = '#00d2c4';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('3D CYLINDRICAL SENSOR RAIL · 10×10 mm TAXELS · 3-2-2-3 REPEATING', 16, 20);

    // Circumferential angle readout
    const curDeg = Math.round(((rotAngle * 180 / Math.PI) % 360 + 360) % 360);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`ROTATION: ${curDeg}° · LENGTH: ${railLength} mm · DIAMETER: ${railDiameter} mm`, 16, 36);

    // Millimeter ticks along rail
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';

    const step = Math.max(40, Math.ceil(railLength / 10 / 40) * 40);
    for (let mm = 0; mm <= railLength; mm += step) {
      const x = startX + (mm / railLength) * drawW;
      ctx.beginPath();
      ctx.moveTo(x, centerY + tubeR + 10);
      ctx.lineTo(x, centerY + tubeR + 15);
      ctx.stroke();
      ctx.fillText(`${mm}`, x, centerY + tubeR + 24);
    }

    // Interactive hint
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('🖱 Drag horizontally to spin 360° · Click along rail to simulate astronaut hand placement', w - 16, h - 14);

    ctx.restore();
  }

  return {
    init,
    resize,
    update,
    setSpin
  };
})();
