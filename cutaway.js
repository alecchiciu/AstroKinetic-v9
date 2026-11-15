'use strict';
// Authored conceptual spacecraft, not a NASA vehicle or engineering drawing.
window.ShipCutaway=(()=>{
const NS='http://www.w3.org/2000/svg';
const sections=[['service','Systems',0,4],['crew','Habitat',4,9],['lab','Laboratory',9,15],['command','Command',15,21],['airlock','Airlock',21,25]];
const rails=sections.flatMap(([id,label,a,b],i)=>[
{id:'r'+(i*2+1),label:label+' · wall',start:[a+.8,.6,1.3],end:[a+.8,.6,3.4]},
{id:'r'+(i*2+2),label:label+' · passage',start:[a+1,4.8,1.1],end:[b-.5,4.8,1.1]}
]);
const presets=[{name:'Asteria · whole spacecraft cutaway',size:[25,6,6],modules:sections.map(([id,label,a,b])=>({id,label,origin:[a,0,0],size:[b-a,6,6]})),rails}];
function draw(svg,ship,selected,choose){
svg.replaceChildren();svg.setAttribute('viewBox','0 0 1200 640');
const n=(tag,attrs={},text)=>{const node=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;return node};
const add=(tag,attrs,text)=>{const node=n(tag,attrs,text);svg.append(node);return node};
const p=([x,y,z])=>[165+x*31+y*12,348-x*3+y*9-z*28];
const poly=(pts,fill,stroke='#82939a',extra={})=>add('polygon',{points:pts.map(v=>p(v).join(',')).join(' '),fill,stroke,'stroke-width':.8,...extra});
const line=(a,b,color='#81949b',width=1,extra={})=>{a=p(a);b=p(b);return add('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':width,...extra})};
const text=(x,y,t,attrs={})=>add('text',{x,y,fill:'#60777f','font-size':10,...attrs},t);
const defs=n('defs');for(const [id,stops]of [['hull',['#f7faf9','#c6d1d3','#899ba2']],['inner',['#a3b4bc','#e8eeec','#bdcacb']],['deck',['#e3e9e6','#a7b7ba']],['solar',['#253f56','#476d80']],['gold',['#a58340','#e1c788']]]){const g=n('linearGradient',{id:'cut-'+id,x1:0,y1:0,x2:0,y2:1});stops.forEach((c,i)=>g.append(n('stop',{offset:i/(stops.length-1),'stop-color':c})));defs.append(g)}const pat=n('pattern',{id:'cut-dots',width:22,height:22,patternUnits:'userSpaceOnUse'});pat.append(n('circle',{cx:1,cy:1,r:.65,fill:'#c8d2d1'}));defs.append(pat);svg.append(defs);
add('rect',{width:1200,height:640,fill:'url(#cut-dots)'});
// Swept stabilizer fins give the vehicle a recognizable rocket silhouette.
add('path',{d:'M185 235 L102 112 Q100 105 112 108 L335 214 Z',fill:'#dce5e7',stroke:'#708996','stroke-width':2});
add('path',{d:'M185 235 L102 112 L147 135 L241 230 Z',fill:'#c74e32'});
add('path',{d:'M232 345 L132 452 Q129 460 142 455 L387 360 Z',fill:'url(#cut-hull)',stroke:'#708996','stroke-width':2});
add('path',{d:'M232 345 L132 452 L176 435 L294 350 Z',fill:'#c74e32'});
// Complete pressure hull: closed rear/top quarter, open facing quarter.
poly([[0,0,1],[25,0,1],[25,0,4],[0,0,4]],'url(#cut-inner)');
poly([[0,0,4],[25,0,4],[25,1,5.5],[0,1,5.5]],'url(#cut-hull)');
poly([[0,1,5.5],[25,1,5.5],[25,2.5,6],[0,2.5,6]],'url(#cut-hull)');
poly([[0,0,1],[25,0,1],[25,1,0],[0,1,0]],'#93a6ae');
poly([[0,1,0],[25,1,0],[25,5,0],[0,5,0]],'url(#cut-deck)');
poly([[0,5,0],[25,5,0],[25,6,1],[0,6,1]],'url(#cut-hull)');
poly([[0,6,1],[25,6,1],[25,6,1.6],[0,6,1.6]],'#e4ebea');
// Deck panels, wall cabling, structural ribs and exposed cut edges.
for(let x=.5;x<25;x+=1){line([x,1,0],[x,5,0],'#859b9e',.65);line([x,5,0],[x,6,1],'#84969d',.65)}
for(let y=1;y<=5;y++)line([0,y,0],[25,y,0],'#94a8aa',.7);
for(const z of [3.9,4.05,4.2])line([0,.07,z],[25,.07,z],'#9aaeb5',1.6);
for(let x=0;x<=25;x+=2.5){
const pts=[[x,6,1.6],[x,6,1],[x,5,0],[x,1,0],[x,0,1],[x,0,4],[x,1,5.5],[x,2.5,6]];
add('polyline',{points:pts.map(q=>p(q).join(',')).join(' '),fill:'none',stroke:'#778c95','stroke-width':5});
add('polyline',{points:pts.map(q=>p(q).join(',')).join(' '),fill:'none',stroke:'#d8e2e2','stroke-width':2});
}
// End bulkheads with visible docking opening.
for(const x of [0]){const q=p([x,3,3]);add('ellipse',{cx:q[0],cy:q[1],rx:43,ry:92,transform:'rotate(-15 '+q[0]+' '+q[1]+')',fill:x===0?'#a3b4bc':'#d8e1e1',stroke:'#6f858f','stroke-width':3});add('ellipse',{cx:q[0]+2,cy:q[1],rx:24,ry:54,transform:'rotate(-15 '+q[0]+' '+q[1]+')',fill:'#485e6a',stroke:'#ecf1ed','stroke-width':7});}
// Systems racks, personal bunks, laboratory racks and command consoles.
function box(x,y,z,w,d,h,color){poly([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],color);poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'#91a5ae');poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'#e9eeeb');}
sections.forEach(([id,label,a,b],idx)=>{
for(let x=a+1.2;x<b-.6;x+=1.25){box(x,.15,.15,.95,1,3.3,idx===1?'#b5c4c9':'#d4deda');for(let z=.6;z<3;z+=.65){const q=p([x+.12,1.17,z]);add('rect',{x:q[0],y:q[1]-10,width:18,height:12,rx:1,fill:idx===3?'#355864':'#839aa3',stroke:'#ecf2ee','stroke-width':1});for(let j=0;j<3;j++)add('circle',{cx:q[0]+j*5+3,cy:q[1]+6,r:1.2,fill:j===1?'#dcad69':'#d9e7df'});}}
if(idx===1){for(const x of [a+1,a+3]){box(x,3.4,.2,1.3,1.8,.55,'#d0d8d2');poly([[x,3.5,.8],[x+1.2,3.5,.8],[x+1.2,5,.8],[x,5,.8]],'#778e91');}}
if(idx===2){box(a+2,3.1,.1,2.5,1.2,1.7,'#cdd9d6');const q=p([a+2.6,3.3,2]);add('ellipse',{cx:q[0],cy:q[1],rx:10,ry:5,fill:'#d6b57c',stroke:'#758992'});}
if(idx===3){for(const x of [a+1.2,a+3.3]){box(x,2,.1,1.3,1.2,1.5,'#9daeb2');const q=p([x,2.2,2.2]);add('path',{d:`M${q[0]},${q[1]} l30,-3 l-3,22 l-30,3 Z`,fill:'#294b5b',stroke:'#78949d','stroke-width':3});add('path',{d:`M${q[0]+5},${q[1]+7} l7,0 l3,-4 l5,9 l4,-5`,fill:'none',stroke:'#99c1b0','stroke-width':1});}}
// Light partition frames, leaving the passage open.
if(a>0){for(const y of [1.3,4.8])line([a,y,.2],[a,y,3.8],'#adbdc1',3);line([a,1.3,3.8],[a,4.8,3.8],'#adbdc1',3);}
});
// Engine/service assembly, docking collar and small exterior systems.
for(const y of [1.5,4.5]){const q=p([-1.6,y,2.6]);add('path',{d:`M${q[0]+30},${q[1]-19} L${q[0]-30},${q[1]-28} L${q[0]-28},${q[1]+25} L${q[0]+30},${q[1]+17} Z`,fill:'#71838b',stroke:'#4c6470','stroke-width':2});add('ellipse',{cx:q[0]-28,cy:q[1]-1,rx:12,ry:26,fill:'#263e4b',stroke:'#b8c6c9','stroke-width':3});}
// Tapered ogive nose closes the entire forward section, instead of a docking tube.
const nose=p([25,3,3]);
add('path',{d:`M${nose[0]-24} ${nose[1]-92} Q1090 115 1180 190 Q1100 292 ${nose[0]+24} ${nose[1]+92} Q${nose[0]+50} ${nose[1]} ${nose[0]-24} ${nose[1]-92} Z`,fill:'url(#cut-hull)',stroke:'#718a97','stroke-width':2});
add('path',{d:`M${nose[0]-24} ${nose[1]-92} Q1090 115 1180 190 Q1095 171 ${nose[0]+4} ${nose[1]+4} Z`,fill:'#f8fbfa','fill-opacity':.8});
add('path',{d:'M1136 159 Q1165 176 1180 190 Q1161 211 1140 228 Q1153 194 1136 159 Z',fill:'#c95032'});
add('path',{d:`M${nose[0]-24} ${nose[1]-92} Q${nose[0]+48} ${nose[1]} ${nose[0]+24} ${nose[1]+92}`,fill:'none',stroke:'#536e7d','stroke-width':5});
// Cockpit glazing and visible heat-shield seams on the solid nose.
add('path',{d:'M1026 173 L1074 174 L1093 194 L1041 199 Z',fill:'#294a5d',stroke:'#8ba9b7','stroke-width':3});
add('path',{d:'M1050 175 L1066 198',stroke:'#a8c3cf','stroke-width':2});
add('path',{d:'M1015 257 Q1089 236 1130 215',fill:'none',stroke:'#a4b5bc','stroke-width':1});
// Near-side tail fin and propulsion collar; no exhaust in this observation view.
add('path',{d:'M210 336 L85 360 L154 387 L330 363 Z',fill:'#aebfc7',stroke:'#688391','stroke-width':2});
add('path',{d:'M85 360 L154 387 L180 384 L120 359 Z',fill:'#c95032'});
text(475,190,'A S T E R I A',{'font-size':13,'letter-spacing':3,fill:'#536d79',transform:'rotate(-5 475 190)'});
// All instrumented rails are on top of the cutaway for an unobstructed hit target.
ship.rails.forEach((r,i)=>{const a=p(r.start),b=p(r.end),active=r.id===selected,color=active?'#d65a32':'#3d7f76';const g=n('g',{role:'button',tabindex:0,'aria-label':'Select '+r.label,'aria-pressed':active});g.append(n('line',{class:'rail-hit',x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':24}),n('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#eff6ee','stroke-width':8,'stroke-linecap':'round'}),n('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':active?5:3.5,'stroke-linecap':'round'}));for(const q of [a,b])g.append(n('circle',{cx:q[0],cy:q[1],r:3,fill:color}));const cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2-15;g.append(n('circle',{cx,cy,r:10,fill:active?color:'#f0f4ed',stroke:color}),n('text',{x:cx,y:cy+3,'text-anchor':'middle','font-size':8,fill:active?'white':color},String(i+1).padStart(2,'0')));g.onclick=()=>choose(r.id);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(r.id)}};svg.append(g)});
// Compartment index and envelope dimensions make the entire craft readable.
sections.forEach(([id,label,a,b],i)=>{const q=p([(a+b)/2,6,0]),y=470;add('path',{d:`M${q[0]},${q[1]+15} L${q[0]},${y-25}`,stroke:'#a0b0b5',fill:'none','stroke-dasharray':'2 4'});text(q[0],y,String(i+1).padStart(2,'0')+' / '+label.toUpperCase(),{'text-anchor':'middle','font-size':10,'letter-spacing':1.3});text(q[0],y+18,2+' rails · '+(b-a)+' m',{'text-anchor':'middle','font-size':9,fill:'#8b9c9e'})});
text(55,65,'ASTERIA / EXPLORATION ROCKET',{'font-size':13,'letter-spacing':2,fill:'#3e5966'});text(55,85,'CUTAWAY VIEW · WHOLE SPACECRAFT',{'font-size':9,'letter-spacing':1.5});
text(55,535,'PROPULSION  ←',{'font-size':9,'letter-spacing':1.5});text(1100,535,'→  NOSE CONE',{'font-size':9,'text-anchor':'end','letter-spacing':1.5});
add('line',{x1:165,y1:561,x2:1012,y2:561,stroke:'#aab9bb'});for(const x of [165,1012])add('line',{x1:x,y1:556,x2:x,y2:566,stroke:'#aab9bb'});text(588,580,'PRESSURIZED BODY / 25 m · CONCEPTUAL GEOMETRY',{'font-size':9,'text-anchor':'middle','letter-spacing':1.2});
}
return {presets,draw};
})();
