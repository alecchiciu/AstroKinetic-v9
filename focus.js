'use strict';
setTimeout(()=>{
 const $=id=>document.getElementById(id);
 function fold(node,title,id){if(!node)return;const d=document.createElement('details');d.className='focus-details';if(id)d.id=id;const s=document.createElement('summary');s.textContent=title;node.before(d);d.append(s,node);return d;}
 const setup=$('guided-setup'),research=$('stress-research');
 setup.querySelector('h2').textContent='Connect & start';
 setup.querySelector('p').textContent='Choose your input mode, select a rail, then press Start. All processing and readings are unchanged.';
 const command=research.querySelector('.mode-command-bar');if(command)setup.append(command);
 const modes=document.querySelector('.mode-cards');if(modes)setup.append(modes);
 // Keep the original controls and listeners, moving only their container.
 $('surface').querySelector('.panel-header').after(setup);
 setup.classList.add('rail-connect-panel');
 if(modes){for(const key of ['lab','hardware','recorded']){const button=modes.querySelector('[data-mode="'+key+'"]');if(button)modes.append(button);}modes.querySelector('[data-mode="lab"]').classList.add('featured-lab');}
 const modeSelect=$('detection-mode');
 for(const key of ['lab','hardware','recorded']){const option=[...modeSelect.options].find(o=>o.value===key);if(option)modeSelect.append(option);}
 modeSelect.value='lab';modeSelect.dispatchEvent(new Event('change'));
 const diag=document.createElement('div');diag.className='focus-hardware';
 diag.append($('arduino-status'),$('arduino-zones'));setup.append(diag);
 const update=()=>{diag.hidden=$('detection-mode').value!=='hardware'};$('detection-mode').addEventListener('change',update);update();
 const split=$('pose-section'),digits=$('pose-fingers');
 const calibration=$('demo-calibration').parentElement,painter=$('finger').closest('div');
 const strip=document.createElement('div');strip.className='compact-digit-strip';
 const heading=document.createElement('h3');heading.textContent='Finger contact & load sharing';
 const controls=document.createElement('div');controls.className='compact-pose-controls';controls.append(calibration,painter);
 strip.append(heading,digits,controls);split.append(strip);
 const next=$('next-vessel');if(next)next.hidden=true;
 const affect=$('affect-title').closest('article');
 const extra=document.createElement('div');extra.className='focus-research';
 const reserved=new Set([affect]);for(const child of [...research.children])if(!reserved.has(child))extra.append(child);
 research.append(extra);fold(extra,'Research evidence · recorded datasets, stress model & seven-day profiles','research-details');
 const affectReplay=document.createElement('div');const replay=$('affect-window');if(replay){affectReplay.append(replay.closest('label'),$('affect-replay'),$('affect-reference'));affect.append(affectReplay);fold(affectReplay,'Explore a recorded CASE example');}
 fold($('live-detection-section'),'Additional physiological indicators & model context','indicator-details');
 fold($('parameters-section'),'Advanced settings · sensor geometry & calibration','advanced-settings');
 fold($('physiology'),'Physiology channels & charts · retained for standalone use','physiology-details');
 fold($('participant').closest('section'),'Individual baseline & session information');
 fold($('report-form').closest('section'),'Add a self-reported state');
 fold($('evidence'),'Scientific sources & research context');
 const intro=document.querySelector('.guided-intro h1');if(intro)intro.textContent='Your handrail. One clear view.';
 const timeline=$('timeline').closest('section');timeline.id='contact-history';timeline.querySelector('h3').textContent='Live contact timeline';
 const nav=document.querySelector('.guide-tabs');nav.replaceChildren();
 for(const [label,id] of [['◇ Spacecraft','vessel'],['⌁ Connect & start','guided-setup'],['♡ Estimated state','stress-research'],['✋ Live handrail','surface'],['↗ Timeline','contact-history'],['⚙ Advanced','advanced-settings']]){const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=()=>{const target=$(id);if(target.tagName==='DETAILS')target.open=true;target.scrollIntoView({behavior:'smooth',block:'start'})};nav.append(b)}
 // CASE result belongs to the selected rail; retain the same nodes and model.
 affect.classList.add('rail-affect-panel');$('surface').append(affect);
 const affectHeading=affect.querySelector('h3');if(affectHeading)affectHeading.textContent='Estimated state';
 const verdict=document.createElement('div');verdict.className='rail-affect-verdict';
 verdict.append($('affect-result'),$('affect-status'));
 const info=document.createElement('div');info.className='rail-affect-details';
 for(const item of [...affect.children])if(item.tagName==='DETAILS')info.append(item);
 const affectLayout=document.createElement('div');affectLayout.className='rail-affect-layout';affectLayout.append(verdict,info);affect.append(affectLayout);
 // Stack the compact hand visual and digit cards in one right sidebar.
 const side=document.createElement('aside');side.className='rail-hand-sidebar';side.setAttribute('aria-label','Hand pose and finger contact');
 const handCard=split.querySelector('.hand-view-card'),railCard=split.querySelector('.rail-visualizer-card');
 side.append(handCard,strip);split.append(side);split.prepend(railCard);
 const stateNav=[...nav.querySelectorAll('button')].find(b=>b.textContent.includes('Estimated state'));if(stateNav)stateNav.onclick=()=>affect.scrollIntoView({behavior:'smooth',block:'start'});
 const note=document.createElement('p');note.className='focus-note';note.textContent='Standalone physiology source · External website connection is not configured. Existing channels remain available below.';research.append(note);

 const retained=new Set([$('vessel'),$('surface'),$('advanced-settings'),$('contact-history')]);
 const status=$('status');if(status)setup.append(status);
 window.AKDetached=new Map();
 for(const child of [...document.querySelector('main').children]){
  if(retained.has(child))continue;
  if(child.id)window.AKDetached.set(child.id,child);
  for(const el of child.querySelectorAll('[id]'))window.AKDetached.set(el.id,el);
  child.remove();
 }
},100);
