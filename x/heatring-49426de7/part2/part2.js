/* Heat ring part 2: layout shell. Loader reads results.json (schema: SCHEMA.md).
   Until it exists, every figure draws a clearly labelled DUMMY pattern. */
(()=>{
const $=id=>document.getElementById(id);
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAL=['#ffb54a','#7fa7d8','#7fd8a6','#d88fd8','#eef1f5','#e07a6a','#c9c36a','#6ad0d8'];

/* ---- background: same living ring as part 1 ---- */
const bg=$('bg'),bx=bg.getContext('2d');const N=96;let T=new Float32Array(N),S=new Float32Array(N),W,H,dpr;
function bsize(){dpr=Math.min(devicePixelRatio||1,1.5);W=bg.width=innerWidth*dpr;H=bg.height=innerHeight*dpr}
bsize();addEventListener('resize',bsize);
for(let k=0;k<4;k++)S[(Math.random()*N)|0]=1;
function bstep(){for(let i=0;i<N;i++)S[i]*=.995;if(Math.random()<.02)S[(Math.random()*N)|0]=1;
 const n=new Float32Array(N);for(let i=0;i<N;i++){const l=T[(i+N-1)%N],r=T[(i+1)%N];n[i]=T[i]+.22*(l+r-2*T[i])-.012*T[i]+.03*S[i]}T=n}
function bdraw(t){bx.clearRect(0,0,W,H);const cx=W*.72,cy=H*.48,R=Math.min(W,H)*.42;
 for(let i=0;i<N;i+=3){const a=2*Math.PI*i/N+t*0.00004,v=Math.min(1,(T[i]+T[(i+1)%N]+T[(i+2)%N])*.4);const x=cx+R*Math.cos(a),y=cy+R*Math.sin(a);
  const g=bx.createRadialGradient(x,y,0,x,y,R*.22*(.4+v));g.addColorStop(0,`rgba(255,${150+60*v|0},74,${.05+.22*v})`);g.addColorStop(1,'rgba(255,150,74,0)');
  bx.fillStyle=g;bx.fillRect(x-R*.3,y-R*.3,R*.6,R*.6)}
 bx.strokeStyle='rgba(90,107,128,.35)';bx.lineWidth=1.5*dpr;bx.beginPath();bx.arc(cx,cy,R,0,7);bx.stroke()}
if(still){for(let i=0;i<300;i++)bstep();bdraw(0)}
else{let lt=0;(function loop(t){if(t-lt>33){bstep();lt=t}bdraw(t);requestAnimationFrame(loop)})(0)}

/* ---- data ---- */
let R=null; // results.json, or null => placeholders
const get=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEYS={'2d':'2d',fno:'fno',unk:'unknown',par:'parity'};
const DUMMY_ARMS={'2d':['StasDEQ','plain','plain 8×'],fno:['StasDEQ','FNO','classical'],unk:['StasDEQ','FNO','plain 8×'],par:['StasDEQ','plain','plain 8×']};

function canvasFit(c){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c.width=Math.max(1,r.width*d);c.height=Math.max(1,r.height*d);return [c.getContext('2d'),c.width,c.height,d]}

/* one replayable control per limit */
function control(id){
 const key=KEYS[id],L=R&&R.limits&&R.limits[key],fig=L&&L.figure;
 const rng=$('r-'+id),pb=$('play-'+id),kb=$('k-'+id),seg=$('seg-'+id),cv=$('fig-'+id),cap=$('cap-'+id);
 const steps=fig&&fig.steps?fig.steps:null;
 if(steps){rng.max=steps.length-1}
 const max=+rng.max;let v=max,playing=false,lt=0;
 const arms=(L&&L.arms)?L.arms.map(a=>a.name):DUMMY_ARMS[id];const on=arms.map(()=>true);
 seg.innerHTML='';arms.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed','true');
  b.innerHTML=`<i style="background:${PAL[i%PAL.length]}"></i>${esc(a)}`;b.onclick=()=>{on[i]=!on[i];b.setAttribute('aria-pressed',on[i]);draw()};seg.appendChild(b)});
 function label(){kb.textContent=steps?steps[v]:(id==='fno'?64*2**v:id==='2d'?v:'step '+(v+1))}
 function draw(){label();const [x,w,h,d]=canvasFit(cv);x.clearRect(0,0,w,h);
  if(fig&&fig.series){plotSeries(x,w,h,d,fig,on,v)}else dummy(x,w,h,d,id,on,v/max);
  cap.textContent=fig?(fig.caption||''):'DUMMY figure · awaiting Einstein\'s results'}
 function stop(){playing=false;pb.textContent=v>=max?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',pb.textContent)}
 /* user-started Play animates even with Reduce Motion on; Play at the end restarts from 0 */
 pb.onclick=()=>{if(playing){stop();return}if(v>=max)v=0;rng.value=v;playing=true;pb.textContent='⏸ Pause';draw();requestAnimationFrame(tick)};
 const dt=max>10?50:450;
 function tick(t){if(!playing)return;if(t-lt>dt){lt=t;v=Math.min(max,v+1);rng.value=v;draw();if(v>=max){stop();return}}requestAnimationFrame(tick)}
 rng.oninput=()=>{v=+rng.value;if(playing)stop();draw()};
 rng.value=v;addEventListener('resize',draw);draw();
}

function dummy(x,w,h,d,id,on,f){
 x.fillStyle='rgba(255,181,74,.05)';x.fillRect(0,0,w,h);
 if(id==='2d'){const n=24,cw=w/n,ch=h/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const r=Math.hypot(i-n/2,j-n/2)/n;const v=Math.max(0,1-r/(.08+.6*f));x.fillStyle=`rgba(255,181,74,${.08+.6*v})`;x.fillRect(i*cw+1,j*ch+1,cw-2,ch-2)}}
 else{x.strokeStyle='#2a3442';x.lineWidth=d;x.beginPath();x.moveTo(40*d,10*d);x.lineTo(40*d,h-28*d);x.lineTo(w-10*d,h-28*d);x.stroke();
  on.forEach((o,a)=>{if(!o)return;x.strokeStyle=PAL[a];x.lineWidth=2*d;x.setLineDash([6*d,4*d]);x.globalAlpha=f>=1?1:.25;x.beginPath();
   for(let i=0;i<=40;i++){const t=i/40;const X=40*d+t*(w-50*d),Y=(h-28*d)-(h-40*d)*(.15+.2*a+.35*Math.sin(t*3+a))*0.9;i?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke();x.globalAlpha=1;const t=Math.min(1,f),X=40*d+t*(w-50*d),Y=(h-28*d)-(h-40*d)*(.15+.2*a+.35*Math.sin(t*3+a))*0.9;x.fillStyle=PAL[a];x.beginPath();x.arc(X,Y,4*d,0,7);x.fill();x.setLineDash([])})}
 x.fillStyle='rgba(255,181,74,.85)';x.font=`${13*d}px ui-monospace,monospace`;x.textAlign='center';x.fillText('DUMMY · not data',w/2,22*d);
}

function plotSeries(x,w,h,d,fig,on,v){ // fig: {x:[...], series:[{arm,y:[...]}], ylog?, xlabel, ylabel}
 const pad=44*d,X=fig.x,ys=fig.series.flatMap(s=>s.y).filter(y=>Number.isFinite(y)&&(!fig.ylog||y>0)),lg=!!fig.ylog;
 const f=y=>lg?Math.log10(y):y;let lo=Math.min(...ys.map(f)),hi=Math.max(...ys.map(f));if(hi===lo)hi=lo+1;
 const px=i=>pad+(w-pad-10*d)*i/Math.max(1,X.length-1),py=y=>(h-pad)-(h-pad-10*d)*(f(y)-lo)/(hi-lo);
 x.strokeStyle='#2a3442';x.lineWidth=d;x.beginPath();x.moveTo(pad,10*d);x.lineTo(pad,h-pad);x.lineTo(w-10*d,h-pad);x.stroke();
 x.fillStyle='#a9b3c1';x.font=`${11*d}px ui-monospace,monospace`;x.textAlign='right';
 if(lg){for(let k=Math.ceil(lo);k<=Math.floor(hi);k+=Math.max(1,Math.ceil((hi-lo)/5)))x.fillText('1e'+k,pad-4*d,py(10**k)+4*d)}else{for(let k=0;k<=4;k++){const yy=lo+(hi-lo)*k/4;x.fillText(yy.toFixed(2),pad-4*d,py(yy)+4*d)}}
 x.textAlign='center';const tooMany=X.length*90*d>(w-pad);X.forEach((t,i)=>{if(tooMany&&i!==v)return;const tw=x.measureText(t).width/2,cx=Math.max(pad+tw,Math.min(w-4*d-tw,px(i)));x.fillText(t,cx,h-pad+16*d)});
 x.strokeStyle='rgba(169,179,193,.25)';x.setLineDash([3*d,3*d]);x.beginPath();x.moveTo(px(v),10*d);x.lineTo(px(v),h-pad);x.stroke();x.setLineDash([]);
 if(fig.xlabel)x.fillText(fig.xlabel,w/2,h-8*d);
 fig.series.forEach((s,a)=>{if(!on[a])return;x.strokeStyle=PAL[a%PAL.length];x.lineWidth=2*d;x.beginPath();
  let pen=false;s.y.forEach((y,i)=>{if(i>v)return;const ok=Number.isFinite(y)&&(!lg||y>0);if(!ok){pen=false;return}
   pen?x.lineTo(px(i),py(y)):x.moveTo(px(i),py(y));pen=true;x.fillStyle=x.strokeStyle;x.fillRect(px(i)-2*d,py(y)-2*d,4*d,4*d)});x.stroke()});
}

function table(id,t){const el=$(id);if(!el)return;
 if(!t){el.innerHTML='<tr><th>arm</th><th>metric</th><th>±</th></tr><tr><td class="ph">awaiting</td><td class="ph">—</td><td class="ph">—</td></tr>';return}
 el.innerHTML='<tr>'+t.columns.map(c=>`<th>${esc(c)}</th>`).join('')+'</tr>'+t.rows.map(r=>'<tr>'+r.map((c,i)=>`<td${t.win&&t.win.some(w=>w[0]===t.rows.indexOf(r)&&w[1]===i)?' class="win"':''}>${esc(c)}</td>`).join('')+'</tr>').join('')}

function fill(){
 document.querySelectorAll('[data-slot]').forEach(el=>{const v=R&&get(R.limits?Object.assign({meta:R.meta},R.limits):{},el.dataset.slot);
  if(v!=null){el.textContent=el.dataset.slot.endsWith('.source')?'Source: '+v:v;el.classList.remove('ph')}});
 Object.entries(KEYS).forEach(([id,k])=>table('t-'+id,R&&R.limits[k]&&R.limits[k].table));
 if(R&&R.limits_of_part2)$('limits').innerHTML=R.limits_of_part2.map(s=>`<li>${esc(s)}</li>`).join('');
 const src=$('srctab');src.innerHTML='<tr><th>figure</th><th>file in results folder</th></tr>'+
  Object.entries(KEYS).map(([id,k])=>{const L=R&&R.limits[k];return `<tr><td>Limit ${Object.keys(KEYS).indexOf(id)+1} · ${k}</td><td${L?'':' class="ph"'}>${esc(L?[L.source].concat(L.figure&&L.figure.file||[]).join(' · '):'awaiting Einstein\'s results')}</td></tr>`}).join('');
 Object.keys(KEYS).forEach(control);
}

fetch('results.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{R=(j&&j.schema==='heatring-part2/1')?j:null;fill()});
})();
