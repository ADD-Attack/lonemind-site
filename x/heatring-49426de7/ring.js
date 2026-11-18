/* Heat ring demo. Data: Einstein's StasDEQ checkpoints (data_A/B/C, trimmed). */
(()=>{
const $=id=>document.getElementById(id);
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL={ex:'#eef1f5',deq:'#ffb54a',cnn:'#7fa7d8',cnn8:'#7fd8a6',src:'255,106,61',line:'#2a3442',mut:'#a9b3c1'};
const NAME={deq:'StasDEQ',cnn:'plain, same size',cnn8:'plain, 8×'};

/* ---- living background: heat diffusing round a big ring ---- */
const bg=$('bg'),bx=bg.getContext('2d');const N=96;let T=new Float32Array(N),S=new Float32Array(N),W,H,dpr;
function bsize(){dpr=Math.min(devicePixelRatio||1,1.5);W=bg.width=innerWidth*dpr;H=bg.height=innerHeight*dpr}
bsize();addEventListener('resize',bsize);
for(let k=0;k<4;k++)S[(Math.random()*N)|0]=1;
function bstep(t){for(let i=0;i<N;i++)S[i]*=.995;if(Math.random()<.02)S[(Math.random()*N)|0]=1;
 const n=new Float32Array(N);for(let i=0;i<N;i++){const l=T[(i+N-1)%N],r=T[(i+1)%N];n[i]=T[i]+.22*(l+r-2*T[i])-.012*T[i]+.03*S[i]}T=n}
function bdraw(t){bx.clearRect(0,0,W,H);const cx=W*.72,cy=H*.48,R=Math.min(W,H)*.42;
 for(let i=0;i<N;i+=3){const a=2*Math.PI*i/N+t*0.00004,v=Math.min(1,(T[i]+T[(i+1)%N]+T[(i+2)%N])*.4);const x=cx+R*Math.cos(a),y=cy+R*Math.sin(a);
  const g=bx.createRadialGradient(x,y,0,x,y,R*.22*(.4+v));g.addColorStop(0,`rgba(255,${150+60*v|0},74,${.05+.22*v})`);g.addColorStop(1,'rgba(255,150,74,0)');
  bx.fillStyle=g;bx.fillRect(x-R*.3,y-R*.3,R*.6,R*.6)}
 bx.strokeStyle='rgba(90,107,128,.35)';bx.lineWidth=1.5*dpr;bx.beginPath();bx.arc(cx,cy,R,0,7);bx.stroke()}
if(still){for(let i=0;i<300;i++)bstep();bdraw(0)}
else{let lt=0;(function loop(t){if(t-lt>33){bstep();lt=t}bdraw(t);requestAnimationFrame(loop)})(0)}

/* ---- canvases ---- */
function fit(c){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return[x,r.width,r.height]}
function ring(c,f,series,vmax){const[x,w,h]=fit(c);const cx=w/2,cy=h/2,R=Math.min(w,h)/2-14,r0=R*.42,rs=r0*.72,n=f.length,sc=(R-r0)/vmax;
 const ang=i=>-Math.PI/2+2*Math.PI*i/n;const fm=Math.max(...f,1e-9);
 for(let i=0;i<n;i++){x.beginPath();x.arc(cx,cy,r0,ang(i),ang(i+1)+.003);x.arc(cx,cy,rs,ang(i+1)+.003,ang(i),true);x.closePath();x.fillStyle=`rgba(${COL.src},${.06+.94*f[i]/fm})`;x.fill()}
 x.beginPath();x.arc(cx,cy,r0,0,7);x.strokeStyle=COL.line;x.lineWidth=1;x.stroke();
 x.beginPath();x.arc(cx,cy,R,0,7);x.setLineDash([2,5]);x.stroke();x.setLineDash([]);
 for(const s of series){x.beginPath();for(let i=0;i<=n;i++){const j=i%n,rr=r0+Math.max(0,Math.min(s.v[j],vmax*1.35))*sc,a=ang(j);const px=cx+rr*Math.cos(a),py=cy+rr*Math.sin(a);i?x.lineTo(px,py):x.moveTo(px,py)}
  if(s.fill){x.globalAlpha=.16;x.fillStyle=s.col;x.fill();x.globalAlpha=1}x.strokeStyle=s.col;x.lineWidth=s.w||2;x.setLineDash(s.dash||[]);x.stroke();x.setLineDash([])}
 x.fillStyle=COL.mut;x.font='11px ui-monospace,monospace';x.textAlign='center';x.fillText('cell 0',cx,11)}
function line(c,series,o){const[x,w,h]=fit(c);const L=48,Rr=10,T=8,B=30,pw=w-L-Rr,ph=h-T-B;const lg=o.log;
 const tf=v=>lg?Math.log10(Math.max(v,o.ymin)):v,y0=tf(o.y0),y1=tf(o.y1);const X=v=>L+(v-o.x0)/(o.x1-o.x0)*pw,Y=v=>T+ph-(tf(v)-y0)/(y1-y0)*ph;
 x.font='11px ui-monospace,monospace';x.fillStyle=COL.mut;x.strokeStyle=COL.line;x.lineWidth=1;x.textAlign='right';
 const ticks=lg?[...Array(Math.round(y1-y0)+1)].map((_,i)=>Math.pow(10,y0+i)):o.yt;
 ticks.forEach(t=>{const yy=Y(t);x.beginPath();x.moveTo(L,yy);x.lineTo(w-Rr,yy);x.stroke();x.fillText(lg?(t>=1?Math.round(t).toLocaleString('en-US'):t.toPrecision(1)):String(t),L-5,yy+4)});
 x.textAlign='center';o.xt.forEach(t=>x.fillText(t,X(t),h-15));x.fillText(o.xl||'',L+pw/2,h-2);
 series.forEach(s=>{x.beginPath();s.ys.forEach((v,i)=>{const px=X(s.xs[i]),py=Y(Math.min(v,o.y1));i?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=s.col;x.lineWidth=s.w||2;x.setLineDash(s.dash||[]);x.stroke();x.setLineDash([])});
 if(o.mark!=null){x.strokeStyle=COL.deq;x.globalAlpha=.6;x.beginPath();x.moveTo(X(o.mark),T);x.lineTo(X(o.mark),T+ph);x.stroke();x.globalAlpha=1}}
function seg(id,labels,on,init=0,multi=false){const el=$(id);el.innerHTML='';const bs=labels.map((l,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=l;
 b.setAttribute('aria-pressed',multi?String(init.includes(i)):String(i===init));b.onclick=()=>{if(multi){b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'))}else bs.forEach((o,j)=>o.setAttribute('aria-pressed',String(j===i)));on(i,bs)};el.appendChild(b);return b});return bs}

/* ---- report numbers (REPORT.md / QSWEEP-SUMMARY.txt, copied from the original demo) ---- */
const S2={'1.0':{deq:[0.0021,0.0025],cnn:[0.0063,0.0076],cnn8:[0.0016,0.0014]},'0.3':{deq:[0.0023,0.0043],cnn:[0.122,0.233],cnn8:[0.0067,0.0171]},'0.1':{deq:[0.051,0.338],cnn:[0.281,1.337],cnn8:[0.079,0.573]}};
const QS=[['0.667',0.249,1.304,18],['0.8',0.216,1.203,32],['0.9',0.170,1.029,66],['0.95',0.104,0.714,130],['0.98',0.051,0.338,248]];
const NUMS=[
['StasDEQ 1,617 params ("~1.6k"); plain same-size 1,649; 8× plain 12,625','REPORT.md:14; S2-SUMMARY.txt:1-3'],
['S2 κ=1.0: StasDEQ 0.0021/0.0025, plain 0.0063/0.0076, 8× plain 0.0016/0.0014','REPORT.md:17'],
['S2 κ=0.3: 0.0023/0.0043, 0.122/0.233, 0.0067/0.0171','REPORT.md:18'],
['S2 κ=0.1: 0.051/0.338, 0.281/1.337, 0.079/0.573','REPORT.md:19'],
['training ring 64, test rings 64 and 256','REPORT.md:14'],
['q cap 0.667 / 0.8 / 0.9 / 0.95 / 0.98: error at 64 cells 0.249 / 0.216 / 0.170 / 0.104 / 0.051; at 256 cells 1.304 / 1.203 / 1.029 / 0.714 / 0.338; settle passes 18 / 32 / 66 / 130 / 248','REPORT.md:50-54; QSWEEP-SUMMARY.txt:1-5'],
['cap 0.98 never bound, q 0.973–0.979, equals the uncapped model','REPORT.md:54; QSWEEP-SUMMARY.txt:5-6'],
['At cap ≤ 0.8 StasDEQ loses to the 8× plain net and is near the same-size plain net','REPORT.md:56'],
['uncertified loop, κ=1.0: 0.085 (256 cells, R=256), 4,967 (R=1024; 3-seed mean 4966.6831, range 0.0941–14899.4656)','REPORT.md:17, :34; S2-SUMMARY.txt:4'],
['certified core refuses q ≥ 1 by construction; same answer from any start','REPORT.md:35'],
['S3 variable coefficient: StasDEQ 0.043/0.044, plain 0.146/0.296, 8× plain 0.013/0.025','REPORT.md:27; S3-SUMMARY.txt:1-3'],
['8× plain net is better at both sizes on the variable-coefficient stage','REPORT.md:7, :29'],
['prefix parity failed for every arm','REPORT.md:7, :22'],
['mean 248 settle passes at 64 cells, κ=0.1','REPORT.md:54; QSWEEP-SUMMARY.txt:5']];

fetch('data.json').then(r=>r.json()).then(D=>{
 /* ---- playground ---- */
 const K=['1.0','0.3','0.1'];let k='0.1',n=64,s=0,on={deq:1,cnn:0,cnn8:0},p=D.side['0.1_64'].stop[0],playing=false;
 const settled=()=>D.side['0.1_64'].stop[s];
 seg('sk',['1.0 short','0.3','0.1 long'],i=>{k=K[i];draw()},2);
 seg('sn',['64 · trained','256 · unseen'],i=>{n=i?256:64;draw()});
 seg('ss',['1','2','3'],i=>{s=i;p=settled();stop();draw()});
 const ms=['deq','cnn','cnn8'];
 seg('sm',ms.map(m=>`<i style="background:${COL[m]}"></i>${NAME[m]}`),i=>{on[ms[i]]^=1;draw()},[0],true);
 const ps=$('pass'),pb=$('play');
 ps.oninput=()=>{p=+ps.value;stop();draw()};
 function stop(){playing=false;pb.textContent='▶ Play'}
 /* Play is user-started, so it animates even under reduced motion; only autoplay is skipped. */
 pb.onclick=()=>{if(playing){stop();return}if(p>=320||p===settled())p=0;playing=true;pb.textContent='⏸ Pause';draw()};
 function draw(){const d=D.side[k+'_'+n];const fr=k==='0.1'&&n===64&&d.frames;
  ps.disabled=pb.disabled=!fr;if(fr)ps.value=p;$('pk').textContent=fr?p:'final';
  $('passnote').textContent=fr?`The solver's own stop rule fired at pass ${d.stop[s]} for this sample.`:'Pass-by-pass frames were exported for κ = 0.1 at 64 cells. Here StasDEQ shows its settled answer.';
  const ex=d.exact[s],vm=Math.max(...ex)*1.15,ser=[{v:ex,col:COL.ex,dash:[5,4],w:1.5}];
  ms.forEach(m=>{if(!on[m])return;const v=m==='deq'&&fr?d.frames[s][p]:d[m][s];ser.push({v,col:COL[m],fill:1,w:m==='deq'?2.6:2})});
  ring($('ring'),d.f[s],ser,vm);
  const eD=fr?d.frames_err[s][p]:d.err.deq[s];
  $('ringcap').textContent=`κ = ${k} · ${n} cells · sample ${s+1}`+(fr?` · pass ${p}`:'');
  $('errtab').innerHTML='<tr><th>model</th><th>error, this sample</th><th>report, 3-seed</th></tr>'+ms.map(m=>`<tr><td><i style="background:${COL[m]}"></i>${NAME[m]}</td><td>${(m==='deq'?eD:d.err[m][s]).toFixed(4)}</td><td>${S2[k][m][n===64?0:1]}</td></tr>`).join('');}
 let lt=0;function tick(t){if(playing&&t-lt>40){lt=t;p=Math.min(320,p+(p<40?1:p<120?2:4));ps.value=p;draw();if(p>=320)stop()}requestAnimationFrame(tick)}
 requestAnimationFrame(tick);

 /* ---- starts ---- */
 function drawStarts(){const S=D.side['0.1_64'].starts,nm=Object.keys(S),cs=[COL.deq,COL.cnn,COL.cnn8];
  line($('starts'),nm.map((m,i)=>({xs:S[m].err.map((_,j)=>j),ys:S[m].err,col:cs[i],dash:i?[5,4]:[],w:2})),{x0:0,x1:320,y0:.01,y1:100,log:1,ymin:.01,xt:[0,80,160,240,320],xl:'passes'});
  $('startscap').textContent='Error after 320 passes: '+nm.map(m=>`${m} ${S[m].err[320].toFixed(4)}`).join(' · ')}

 /* ---- q cap ---- */
 const CAPS=['0.667','0.8','0.9','0.95','0.98'];let qi=4,qk=still?320:0,qp=!still;
 function drawQ(){const q=D.qcap[CAPS[qi]],kk=Math.min(qk,320);$('qv').textContent=CAPS[qi];
  ring($('qring'),D.qf,[{v:D.qex,col:COL.ex,dash:[5,4],w:1.5},{v:q.frame[kk],col:COL.deq,fill:1,w:2.6}],Math.max(...D.qex)*1.15);
  $('qcap').textContent=`q = ${q.q.toFixed(3)} · pass ${kk} · ${q.mean_stop64.toFixed(0)} needed on average`;
  line($('reach'),CAPS.map((c,i)=>({xs:D.qcap[c].reach.map((_,j)=>j),ys:D.qcap[c].reach,col:i==qi?COL.deq:'#5a6b80',w:i==qi?3:1.2})),{x0:0,x1:320,y0:0,y1:48,yt:[0,12,24,36,48],xt:[0,80,160,240,320],xl:'passes',mark:kk});
  $('qtab').innerHTML=`<tr><th>q cap</th>${QS.map(r=>`<th>${r[0]}</th>`).join('')}</tr>`+[['error, 64 cells',1],['error, 256 cells',2],['settle passes',3]].map(([l,j])=>`<tr><td>${l}</td>${QS.map((r,i)=>`<td class="${i==qi?'win':''}">${r[j]}</td>`).join('')}</tr>`).join('')}
 $('qs').oninput=e=>{qi=+e.target.value;qk=still?320:0;qp=!still;drawQ()};$('qplay').onclick=()=>{qk=still?320:0;qp=!still;drawQ()};
 let ql=0;(function qt(t){if(qp&&t-ql>45){ql=t;const st=Math.round(D.qcap[CAPS[qi]].mean_stop64);if(qk<Math.min(320,st+8)){qk+=Math.max(1,Math.round(st/60));drawQ()}else qp=false}requestAnimationFrame(qt)})(0);

 /* ---- tables / loop ---- */
 const s2row=(kap,i)=>{const r=S2[kap],b=Math.min(r.deq[i],r.cnn[i],r.cnn8[i]);return ['deq','cnn','cnn8'].map(a=>`<td class="${r[a][i]===b?'win':''}">${r[a][i]}</td>`).join('')};
 $('s2tab').innerHTML='<tr><th>κ</th><th>cells</th><th>StasDEQ ~1.6k</th><th>plain, same size ~1.6k</th><th>plain, 8× 12.6k</th></tr>'+K.map(kp=>[0,1].map(i=>`<tr><td>${i?'':kp}</td><td>${i?256:64}</td>${s2row(kp,i)}</tr>`).join('')).join('');
 function drawLoop(){const cv=D.loop['1.0'],cs=[COL.deq,COL.cnn,COL.cnn8];line($('loop'),[1,2,3].map((sd,i)=>({xs:cv[sd].map((_,j)=>j*4),ys:cv[sd],col:cs[i],w:2})),{x0:0,x1:1024,y0:.01,y1:100000,log:1,ymin:.01,xt:[0,256,512,768,1024],xl:'passes'})}
 $('numtab').innerHTML='<tr><th>number(s)</th><th>source</th></tr>'+NUMS.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
 $('chk').innerHTML='<tr><th>run</th><th>κ</th><th>cells</th><th>logged</th><th>recomputed</th></tr>'+D.checks.map(c=>`<tr><td>${c.arm} s${c.seed}${c.R?' R='+c.R:''}</td><td>${c.kappa}</td><td>${c.n}</td><td>${c.logged}</td><td>${c.recomputed}</td></tr>`).join('');
 const all=()=>{draw();drawStarts();drawQ();drawLoop()};all();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(all,80)});
}).catch(e=>{$('ringcap').textContent='Could not load the model data. Reload to try again.';console.error(e)});
})();
