'use strict';
(()=>{
const $=id=>document.getElementById(id),main=document.querySelector('main');
const setup=document.createElement('section');setup.className='panel guided-setup';setup.id='guided-setup';setup.innerHTML='<span class="eyebrow">01 / DATA CONNECTION</span><h2>How would you like to begin?</h2><p>Use your sensor hardware or explore a synthetic recording. Hardware requires Chrome or Edge and a compatible USB data stream.</p><div id="setup-controls"></div><div class="setup-help"><article><h3>⌁ Hardware</h3><p>Connect a board, select the matching format, then choose the instrumented rail. Connecting does not establish a medical diagnosis.</p></article><article><h3>▷ Demo</h3><p>Explore without equipment. Values and hand placement are illustrative, not astronaut measurements.</p></article><article><h3>⇩ Recording</h3><p>Load a saved recording. Its rail and sensor dimensions must match your selected rail.</p></article></div><button class="btn btn-primary" id="next-vessel">Choose spacecraft →</button>';
$('vessel-name').parentElement.after(setup);
const controls=$('setup-controls');for(const id of ['source','usb-format','connect','disconnect','record-file','sample']){const e=$(id);if(!e)continue;const target=e.type==='file'?e.parentElement:e;target.style.display='';controls.append(target)}
$('source').setAttribute('aria-label','Data source');$('source').options[0].text='Explore synthetic demo';$('source').options[1].text='Load recording';$('source').options[2].text='Connect physical hardware';$('usb-format').setAttribute('aria-label','Hardware data format');$('connect').textContent='⌁ Connect hardware';
const tabs=[...document.querySelectorAll('[data-step]')];
const children=[...main.children].filter(e=>!e.classList.contains('guided-intro')&&e.id!=='status'&&e.tagName!=='FOOTER');
function step(name){const target=name==='setup'?setup:name==='vessel'?$('vessel'):name==='research'?$('stress-research'):name==='settings'?$('parameters-section'):document.getElementById('rail-name');target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
for(const e of children)e.hidden=e.classList.contains('hero-section');

tabs.forEach(b=>b.onclick=()=>step(b.dataset.step));$('next-vessel').onclick=()=>step('vessel');
const proceed=document.createElement('button');proceed.className='btn btn-primary';proceed.textContent='Monitor selected rail →';proceed.onclick=()=>step('monitor');$('vessel').append(proceed);
$('btn-quick-connect').onclick=()=>{step('setup');$('source').value='usb';$('source').dispatchEvent(new Event('change'));$('connect').click()};

document.querySelectorAll('.nav-links a').forEach(a=>a.onclick=e=>{e.preventDefault();step(a.hash==='#vessel'?'vessel':a.hash==='#parameters-section'||a.hash==='#evidence'?'settings':'monitor')});
document.querySelectorAll('.vessel-card[data-preset]').forEach(c=>{c.tabIndex=0;c.setAttribute('role','button');c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click()}}});
$('btn-view-3d').click();
const research=$('stress-research');if(research)main.insertBefore(research,$('live-detection-section'));
const nav=document.querySelector('.guide-tabs');const order=['vessel','setup','research','monitor','settings'];order.forEach((key,i)=>{const b=nav.querySelector('[data-step="'+key+'"]');if(b){nav.append(b);b.textContent=(i+1)+' · '+({vessel:'◇ Spacecraft',setup:'⌁ Connection',research:'♡ Mental state',monitor:'◉ Live monitor',settings:'⚙ Parameters'}[key])}});
const modebar=document.createElement('div');modebar.className='mode-command-bar';const modeLabel=document.createElement('label');modeLabel.htmlFor='detection-mode';modeLabel.textContent='Input & detection mode';modebar.append(modeLabel,$('detection-mode'),$('btn-live-toggle'));research.prepend(modebar);
const footer=main.querySelector('footer');if(footer)main.append(footer);

const live=$('live-detection-section'),modes=document.createElement('div');modes.className='mode-cards';modes.innerHTML='<button class="btn" data-mode="hardware">⌁ Hardware Live<small>Read connected sensors</small></button><button class="btn" data-mode="recorded">▷ Recorded Replay<small>Play synthetic rail telemetry</small></button><button class="btn" data-mode="lab">✋ Interactive Lab<small>Mouse pressure + manual physiology</small></button>';
live.querySelector('h2').parentElement.after(modes);
setTimeout(()=>{const selector=$('detection-mode');const update=()=>modes.querySelectorAll('button').forEach(b=>b.classList.toggle('btn-primary',b.dataset.mode===selector.value));modes.querySelectorAll('button').forEach(b=>b.onclick=()=>{selector.value=b.dataset.mode;selector.dispatchEvent(new Event('change'));update()});selector.addEventListener('change',update);update();},50);
})();
