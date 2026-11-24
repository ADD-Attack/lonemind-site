// Six ways a model can think: the benches. Ported from Einstein's infographic toys,
// re-skinned for the ink field, drawn crisp at device pixel ratio, sized to the column.
(function(){
'use strict';
const $=id=>document.getElementById(id);
const C={blue:'#8fb3e0',lamp:'#ffb54a',lampD:'#e08a1e',ok:'#7fd8a6',bad:'#ff8a7a',grey:'#7d8898',text:'#eef1f5',muted:'#a9b3c1',track:'#1f2733',faint:'#2a3442',ink:'#090c12'};
function rnd(s){return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const LW=560;let FS=1; // font scale for narrow screens
function txt(g,s,x,y,col,f){g.fillStyle=col||C.text;f=f||'13px';const m=f.match(/(\d+(?:\.\d+)?)px/);const px=m?(+m[1]*FS).toFixed(1):13*FS;
  g.font=(f.replace(/\d+(?:\.\d+)?px.*/,'')+px+'px '+'ui-sans-serif, system-ui, sans-serif').trim();g.fillText(s,x,y);return x+g.measureText(s).width}
function dot(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
const toys={};

// LFM2 stack diagram
(function(){const g=$('lfm');if(!g)return;const pat='CCACCACCACCACCAA'.split('');let s='';
 pat.forEach((k,i)=>{s+=`<rect x="${i*33.5}" y="4" width="29" height="38" rx="5" fill="${k=='C'?C.blue:C.lamp}"/>`});g.innerHTML=s})();

// 1 LLM
toys[1]={init(){this.text=['The','cat','sat','on','the'];this.n=0},
 cands(){const sets=[[['mat',3],['floor',2.2],['sofa',1.6],['dog',0.4],['moon',-0.5]],[['.',3],['and',1.5],['while',0.8],['quietly',0.2],['purple',-1]],[['The',2],['It',1.8],['Then',1],['A',0.6],['Zebra',-1.5]]];return sets[this.n%3]},
 probs(){const T=+$('s1').value;const c=this.cands();const e=c.map(x=>Math.exp(x[1]/T));const z=e.reduce((a,b)=>a+b);return c.map((x,i)=>[x[0],e[i]/z])},
 step(){if(this.n>=3){this.init();return}const p=this.probs();let r=Math.random(),k=0;for(;k<p.length-1;k++){r-=p[k][1];if(r<0)break}this.n++;this.text.push(p[k][0]);if(this.text.length>11)this.text=this.text.slice(-11)},
 draw(g){const p=this.probs();txt(g,this.text.join(' ')+' ▮',14,30,C.text,'bold 17px');
  txt(g,'chances for the next token:',14,60,C.muted,'13px');
  p.forEach((x,i)=>{const y=72+i*30;g.fillStyle=C.track;g.fillRect(120,y,370,22);g.fillStyle=i==0?C.lamp:C.blue;g.fillRect(120,y,370*x[1],22);txt(g,x[0],14,y+17,C.text,'14px');txt(g,(x[1]*100).toFixed(0)+'%',498,y+17,C.text,'14px')});
  $('v1').textContent=(+$('s1').value).toFixed(2)}};

// 2 transformer
toys[2]={init(){this.toks=['The','cat','sat','on','it'];this.q=1;this.L=0},
 step(){this.L++;if(this.L>2){this.L=0;this.q=this.q%4+1}},
 draw(g){const xs=this.toks.map((_,i)=>60+i*105);const ys=[200,140,80,24];
  for(let l=0;l<3;l++){g.fillStyle=C.blue;g.globalAlpha=l==this.L?0.22:0.07;g.fillRect(20,ys[l+1]+10,520,ys[l]-ys[l+1]-20);g.globalAlpha=1;txt(g,'layer '+(l+1),476,ys[l]-26,C.blue,'12px')}
  const w=this.toks.map((_,j)=>j<=this.q?Math.abs(Math.sin(j*3.1+this.q*1.7+this.L*2.3))+0.1:0);const z=w.reduce((a,b)=>a+b);
  for(let j=0;j<=this.q;j++){g.strokeStyle=C.lamp;g.lineWidth=1+10*w[j]/z;g.globalAlpha=0.85;g.beginPath();g.moveTo(xs[j],ys[this.L]);g.quadraticCurveTo((xs[j]+xs[this.q])/2,ys[this.L]-40,xs[this.q],ys[this.L+1]);g.stroke();g.globalAlpha=1;
   txt(g,(100*w[j]/z).toFixed(0)+'%',xs[j]+14,ys[this.L]-10,C.lamp,'12px')}
  for(let l=0;l<4;l++)xs.forEach((x,i)=>dot(g,x,ys[l],l==0?16:8,(i==this.q&&(l==this.L||l==this.L+1))?C.text:(l==0?C.lamp:C.faint)));
  xs.forEach((x,i)=>{g.textAlign='center';txt(g,this.toks[i],x,ys[0]+4,C.ink,'bold 11px');g.textAlign='left'});
  txt(g,`“${this.toks[this.q]}” looks back (thicker = more attention)`,14,228,C.muted,'12px')}};

// 3 building blocks
const TK='the cat sat on a warm mat today'.split(' ');
function row(g,y,hi,col){const xs=TK.map((_,i)=>34+i*70);TK.forEach((t,i)=>{dot(g,xs[i],y,11,i==hi?col:C.faint);g.textAlign='center';txt(g,t,xs[i],y+28,i==hi?C.text:C.muted,'13px');g.textAlign='left'});return xs}
toys[31]={init(){this.i=0},step(){this.i=(this.i+1)%TK.length},
 draw(g){const w=+$('s31').value;$('v31').textContent=w+' tok';const xs=row(g,100,this.i,C.blue);
  const lo=Math.max(0,this.i-w+1);g.fillStyle='rgba(143,179,224,.14)';g.fillRect(xs[lo]-20,80,xs[this.i]-xs[lo]+40,40);
  g.strokeStyle=C.blue;g.lineWidth=2;for(let j=lo;j<this.i;j++){g.beginPath();g.moveTo(xs[j],88);g.quadraticCurveTo((xs[j]+xs[this.i])/2,55,xs[this.i],88);g.stroke()}
  const gate=(0.5+0.5*Math.sin(this.i*1.9)).toFixed(2);txt(g,'gate × conv(window) × gate   (gate = '+gate+')',14,24,C.blue,'bold 13px');
  txt(g,'window '+w+' tokens; outside it: not seen',14,44,C.muted,'12px')}};
toys[32]={init(){this.i=1},step(){this.i=this.i%(TK.length-1)+1},
 draw(g){const xs=row(g,108,this.i,C.lamp);const hc=['#ffb54a','#f59a3a','#e08a1e','#c97510'];
  for(let h=0;h<4;h++){g.strokeStyle=hc[h];g.globalAlpha=.75;for(let j=0;j<this.i;j++){const wt=Math.abs(Math.sin(j*2.3+h*1.7+this.i));g.lineWidth=.5+3*wt;g.beginPath();g.moveTo(xs[j],96);g.quadraticCurveTo((xs[j]+xs[this.i])/2,70-h*10,xs[this.i],96);g.stroke()}}g.globalAlpha=1;
  txt(g,'4 query heads look at ALL earlier tokens',14,22,C.lamp,'bold 13px');
  txt(g,'heads share 2 key/value groups: 1–2 → A, 3–4 → B',14,42,C.muted,'12px')}};
toys[33]={init(){this.i=0;this.h=[0,0,0,0];this.hist=[]},step(){const k=+$('s33').value,t=TK[this.i%TK.length];this.h=this.h.map((v,j)=>k*v+(1-k)*Math.sin(t.length*(j+1)+t.charCodeAt(0)*.3));this.hist.push(this.h.slice());if(this.hist.length>60)this.hist.shift();this.i++},
 draw(g){const kv=+$('s33').value;$('v33').textContent=kv.toFixed(2);const cur=(this.i-1+TK.length)%TK.length;
  TK.forEach((t,i)=>{g.fillStyle=this.i&&i==cur?C.lamp:C.track;g.fillRect(14+i*66,8,62,22);g.textAlign='center';txt(g,t,45+i*66,24,this.i&&i==cur?C.ink:C.muted,'12px');g.textAlign='left'});
  txt(g,'state: always 4 numbers',14,54,C.muted,'12px');this.h.forEach((v,j)=>{g.fillStyle=C.blue;g.fillRect(20+j*36,104,28,-v*36)});
  g.strokeStyle=C.faint;g.beginPath();g.moveTo(14,104);g.lineTo(170,104);g.stroke();
  for(let j=0;j<4;j++){g.strokeStyle=`hsl(${205+j*12},60%,${58+j*7}%)`;g.lineWidth=1.6;g.beginPath();this.hist.forEach((h,t)=>{const x=280+t*4.4,y=98-h[j]*36;t?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}
  txt(g,'state over time →',280,54,C.muted,'12px');txt(g,'new = '+(+$('s33').value).toFixed(2)+' × old + '+(1-$('s33').value).toFixed(2)+' × input',14,142,C.muted,'12px')}};
toys[34]={init(){this.i=0},step(){this.i=(this.i+1)%TK.length},
 draw(g){const xs=row(g,114,this.i,C.blue);const t=TK[this.i];const raw=[t.length,t.charCodeAt(0)%7+1,(t.charCodeAt(t.length-1)%5)+1];const z=raw.reduce((a,b)=>a+b);const w=raw.map(v=>v/z);
  txt(g,'weights made from “'+t+'”',14,20,C.blue,'bold 13px');g.textAlign='right';txt(g,'fixed weights',546,20,C.grey,'bold 13px');g.textAlign='left';
  w.forEach((v,k)=>{g.fillStyle=C.blue;g.fillRect(20+k*44,80,32,-v*110);g.fillStyle=C.grey;g.fillRect(310+k*44,80,32,-110/3)})}};
toys[35]={init(){this.t=0;this.pts=[];this.jump=[]},
 step(){const I=t=>Math.sin(t*1.3)>0?1.6:0.15,tau=1;let x=this.pts.length?this.pts[this.pts.length-1][1]:0;for(let k=0;k<5;k++){const f=1/(1+Math.exp(-(3*I(this.t)-2)));x+=0.04*(-(1/tau+f)*x+f);this.t+=0.04;this.pts.push([this.t,x])}
  const f=1/(1+Math.exp(-(3*I(this.t)-2))),k=1/tau+f,xe=f/k;const x0=this.jump.length?this.jump[this.jump.length-1][1]:0,dt=this.jump.length?this.t-this.jump[this.jump.length-1][0]:this.t;this.jump.push([this.t,xe+(x0-xe)*Math.exp(-k*dt)]);
  if(this.t>13)this.init()},
 draw(g){const X=t=>20+t*40,Y=v=>132-v*150;g.strokeStyle=C.faint;g.strokeRect(14,44,532,98);
  this.pts.forEach(p=>dot(g,X(p[0]),Y(p[1]),1.6,C.grey));this.jump.forEach(p=>dot(g,X(p[0]),Y(p[1]),4,C.ok));
  txt(g,'grey: LTC, many small steps',14,18,C.muted,'12px');txt(g,'green: CfC, one formula per point',14,36,C.ok,'12px')}};

// 4 Liquid neuron
toys[4]={init(){this.t=0;this.x=0;this.xf=0;this.tr=[]},
 step(){const S=+$('s4').value;for(let k=0;k<6;k++){const dt=0.05;this.t+=dt;const I=S*(Math.sin(this.t*0.9)>0?1:0.1);
  const f=1/(1+Math.exp(-(3*I-2)));const tau=1.5;this.x+=dt*(-(1/tau+f)*this.x+f);
  this.xf+=dt*(-(1/tau)*this.xf+0.5*I/(1+I));this.tr.push([I,this.x,this.xf,1/(1/tau+f)]);if(this.tr.length>470)this.tr.shift()}},
 draw(g){const sv=+$('s4').value;$('v4').textContent=sv.toFixed(2);
  const plot=(k,y0,h,col,sc)=>{g.strokeStyle=col;g.lineWidth=2;g.beginPath();this.tr.forEach((r,i)=>{const x=20+i*1.11,y=y0-r[k]/sc*h;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()};
  txt(g,'input × '+sv.toFixed(2),20,18,C.muted,'13px');plot(0,76,52,C.lamp,3.2);
  const ex=txt(g,'liquid neuron',20,106,C.ok,'bold 13px');txt(g,' vs fixed-speed',ex,106,C.grey,'13px');plot(2,214,96,C.grey,1);plot(1,214,96,C.ok,1);
  const last=this.tr[this.tr.length-1];if(last){g.textAlign='right';txt(g,'time-constant '+last[3].toFixed(2)+' s',546,18,C.ok,'bold 13px');g.textAlign='left'}}};

// 5 stasDEQ
const N=8;
function matmul(A,B){return A.map(r=>B[0].map((_,j)=>r.reduce((s,v,k)=>s+v*B[k][j],0)))}
function T(A){return A[0].map((_,j)=>A.map(r=>r[j]))}
function mv(A,v){return A.map(r=>r.reduce((s,x,k)=>s+x*v[k],0))}
function norm(v){return Math.sqrt(v.reduce((s,x)=>s+x*x,0))}
function opnorm(M){let v=new Array(N).fill(1);for(let i=0;i<200;i++){v=mv(T(M),mv(M,v));const n=norm(v);v=v.map(x=>x/n)}return norm(mv(M,v))}
toys[5]={init(){this.seed=(this.seed||3)+1;const r=rnd(this.seed);this.A0=[...Array(N)].map(()=>[...Array(N)].map(()=>(r()-.5)*0.6));this.B0=[...Array(N)].map(()=>[...Array(N)].map(()=>(r()-.5)));this.c=[...Array(N)].map(()=>r()*1.2-.2);this.build()},
 build(){const a=0.5,m=0.3,b=+$('s5').value;this.a=a;const AtA=matmul(T(this.A0),this.A0);
  this.W=[...Array(N)].map((_,i)=>[...Array(N)].map((_,j)=>(i==j?1-m:0)-AtA[i][j]+b*(this.B0[i][j]-this.B0[j][i])));
  this.M=this.W.map((r,i)=>r.map((w,j)=>a*w+(i==j?1-a:0)));this.q=opnorm(this.M);this.bkey=b;
  this.z=new Array(N).fill(0);this.k=0;this.rows=[];let zs=this.z.slice();for(let i=0;i<3000;i++)zs=this.f(zs);this.zstar=zs},
 f(z){const Mz=mv(this.M,z);return Mz.map((v,i)=>Math.max(0,v+this.a*this.c[i]))},
 step(){if(+$('s5').value!==this.bkey)this.build();if(this.k>=25)return this.build();const zn=this.f(this.z);const move=norm(zn.map((v,i)=>v-this.z[i]));this.z=zn;this.k++;
  const dist=norm(this.z.map((v,i)=>v-this.zstar[i]));this.rows.push({move,dist,bound:this.q<1?this.q/(1-this.q)*move:null})},
 draw(g){if(+$('s5').value!==this.bkey)this.build();$('v5').textContent=(+$('s5').value).toFixed(2);const ok=this.q<1;
  const cx=86,cy=100,R=58;g.lineWidth=12;g.strokeStyle='rgba(127,216,166,.35)';g.beginPath();g.arc(cx,cy,R,Math.PI,Math.PI*1.75);g.stroke();g.strokeStyle='rgba(255,138,122,.4)';g.beginPath();g.arc(cx,cy,R,Math.PI*1.75,0);g.stroke();
  const ang=Math.PI+Math.min(this.q,1.33)/1.33*Math.PI;g.strokeStyle=C.text;g.lineWidth=3;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+R*Math.cos(ang),cy+R*Math.sin(ang));g.stroke();dot(g,cx,cy,4,C.text);
  g.textAlign='center';txt(g,'q = '+this.q.toFixed(3),cx,cy+26,C.text,'bold 15px');g.textAlign='left';txt(g,'1.0',cx+R*Math.cos(Math.PI*1.75)+2,cy+R*Math.sin(Math.PI*1.75)-10,C.bad,'11px');
  txt(g,ok?'✓ CERTIFIED':'✗ REFUSES',14,162,ok?C.ok:C.bad,'bold 17px');
  txt(g,'pass '+this.k+(this.k>=25?' (restart)':''),14,186,C.muted,'13px');
  this.z.forEach((v,i)=>{g.globalAlpha=0.25+0.75*Math.min(1,v);dot(g,20+i*20,212,7,C.ok)});g.globalAlpha=1;
  const X0=190,Y0=214,W=354,H=196;g.strokeStyle=C.faint;g.lineWidth=1;g.strokeRect(X0,Y0-H,W,H);
  const ly=v=>Y0-(Math.log10(Math.max(v,1e-8))+8)/9*H;const lx=k=>X0+k*W/25;
  txt(g,'distance to settled state (log)',X0+8,Y0-H+18,C.muted,'12px');
  const line=(key,col,dash)=>{g.setLineDash(dash||[]);g.strokeStyle=col;g.lineWidth=2;g.beginPath();let st=0;this.rows.forEach((r,i)=>{if(r[key]==null)return;const x=lx(i+1),y=ly(r[key]);st?g.lineTo(x,y):g.moveTo(x,y);st=1});g.stroke();g.setLineDash([])};
  if(ok&&this.rows.length){g.fillStyle='rgba(127,216,166,.12)';g.beginPath();this.rows.forEach((r,i)=>g.lineTo(lx(i+1),ly(r.bound)));for(let i=this.rows.length-1;i>=0;i--)g.lineTo(lx(i+1),Y0);g.fill();line('bound',C.ok,[5,4])}
  line('dist',C.text);
  txt(g,ok?'solid: true distance · dashed: certified bound':'q ≥ 1: no guarantee it settles',14,Y0+28,ok?C.ok:C.bad,'12px')}};

// 6 hybrid routing
const KC=[C.grey,C.blue,C.lamp];
toys[6]={init(){this.toks='3 + 4 = ? and the cat , who was black , sat'.split(' ');this.i=0},
 kind(i){const t=this.toks[i];if(/^[0-9+=?]$/.test(t))return 0;if(t==='sat'||t==='who')return 2;return 1},
 step(){this.i=(this.i+1)%this.toks.length},
 draw(g){const w=+$('s6').value;$('v6').textContent='±'+w;const n=this.toks.length,xs=this.toks.map((_,i)=>24+i*(512/(n-1)));
  {const lo=Math.max(0,this.i-w),hi=Math.min(n-1,this.i+w);g.fillStyle='rgba(143,179,224,.12)';g.fillRect(xs[lo]-14,144,xs[hi]-xs[lo]+28,32)}
  const k=this.kind(this.i),col=KC[k],name=['rule: exact, fixed','local: nearby tokens only','wide: the whole input'][k];
  g.strokeStyle=col;g.lineWidth=2.5;
  if(k>0)for(let j=0;j<n;j++){if(j==this.i)continue;if(k==1&&Math.abs(j-this.i)>w)continue;g.beginPath();g.moveTo(xs[this.i],150);g.quadraticCurveTo((xs[j]+xs[this.i])/2,130-Math.abs(j-this.i)*7,xs[j],150);g.stroke()}
  if(k==0){const bx=Math.min(Math.max(xs[this.i]-48,4),460);g.fillStyle=col;g.fillRect(bx,62,96,38);g.textAlign='center';txt(g,this.toks[this.i]=='?'?'3+4 → 7':'rule',bx+48,87,C.ink,'bold 14px');g.textAlign='left';g.beginPath();g.moveTo(xs[this.i],100);g.lineTo(xs[this.i],140);g.stroke()}
  this.toks.forEach((t,i)=>{dot(g,xs[i],160,11,i==this.i?KC[this.kind(i)]:C.faint);g.textAlign='center';txt(g,t,xs[i],FS>1.25&&i%2?194:178,i==this.i?C.text:C.muted,'12px');g.textAlign='left'});
  txt(g,'“'+this.toks[this.i]+'” → '+name,14,26,col,'bold 14px');
  [['rule',C.grey],['local',C.blue],['wide',C.lamp]].forEach((l,i)=>{g.fillStyle=l[1];g.fillRect(14+i*130,216,12,12);txt(g,l[0],32+i*130,227,C.muted,'12px')})}};

// engine
const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv={},run={},vis={},last={};
const speed={1:900,2:700,31:800,32:900,33:300,34:900,35:120,4:40,5:450,6:900};
function size(){const any=document.querySelector('canvas[data-toy]');const cw=any?any.clientWidth:LW;
  FS=Math.min(1.9,Math.max(1,(LW/Math.max(cw,1))*0.86));
  document.querySelectorAll('canvas[data-toy]').forEach(c=>{const n=c.dataset.toy,h=+c.dataset.h,w=c.clientWidth||LW,d=Math.min(window.devicePixelRatio||1,2);
   c.style.height=(w*h/LW)+'px';c.width=Math.round(w*d);c.height=Math.round(w*h/LW*d);cv[n]={c,g:c.getContext('2d'),s:w*d/LW}})}
function redraw(n){const o=cv[n];if(!o)return;o.g.setTransform(1,0,0,1,0,0);o.g.clearRect(0,0,o.c.width,o.c.height);o.g.setTransform(o.s,0,0,o.s,0,0);o.g.lineCap='round';toys[n].draw(o.g)}
for(const n in toys){toys[n].init();run[n]=false;vis[n]=true}
// One play = one natural pass of each toy, in steps at that toy's existing speed.
const PLAY={1:3,2:11,31:7,32:6,33:8,34:7,35:64,4:70,5:25,6:14};
const left={},auto={},tall={},big={},card={};
(function(){const st=document.createElement('style');st.textContent='.sw-stage{position:relative}.sw-big{position:absolute;left:50%;top:50%;width:92px;height:92px;margin:-46px 0 0 -46px;padding:0;border-radius:50%;border:3px solid #090c12;background:var(--lamp);color:var(--lamp-ink);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--lamp),0 8px 26px rgba(0,0,0,.6)}.sw-big[hidden]{display:none!important}.sw-big:hover{filter:brightness(1.08)}.sw-big:focus-visible{outline:3px solid #eef1f5;outline-offset:4px}.sw-big svg{width:42px;height:42px;margin-left:6px;fill:currentColor}@media(max-width:640px){.sw-big{width:76px;height:76px;margin:-38px 0 0 -38px}.sw-big svg{width:34px;height:34px;margin-left:5px}}'+(still?'':'.ctl button[data-a=play]{display:inline-grid;justify-items:center;align-content:center}.ctl button[data-a=play]::after{content:"Pause";height:0;overflow:hidden;visibility:hidden}');document.head.appendChild(st);
 document.querySelectorAll('canvas[data-toy]').forEach(c=>{const n=c.dataset.toy,w=document.createElement('div');w.className='sw-stage';c.parentNode.insertBefore(w,c);w.appendChild(c);
  const b=document.createElement('button');b.type='button';b.className='sw-big';b.hidden=true;b.setAttribute('aria-label','Play: '+c.getAttribute('aria-label'));b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l16 9-16 9z"/></svg>';
  b.addEventListener('click',()=>{start(n);const k=document.querySelector(`button[data-t="${n}"][data-a=play]`);if(k)k.focus({preventScroll:true})});w.appendChild(b);big[n]=b;card[n]=c.closest('.toy')})})();
function sync(n){big[n].hidden=run[n]||!(auto[n]||still||tall[n])}
function start(n){auto[n]=true;if(n==5)toys[5].build();else toys[n].init();left[n]=PLAY[n];run[n]=true;last[n]=0;label(n);sync(n);redraw(n)}
function resume(n){auto[n]=true;left[n]=Infinity;run[n]=true;label(n);sync(n)}
function stop(n){run[n]=false;label(n);sync(n)}
// Auto-play fires only when the whole card is inside the visible viewport. A card that cannot fit waits for the big button.
function watch(){if(still)return;const v=window.visualViewport,L=v?v.offsetLeft:0,T=v?v.offsetTop:0,W=v?v.width:window.innerWidth,H=v?v.height:window.innerHeight;
 for(const n in toys){if(auto[n])continue;const r=card[n].getBoundingClientRect(),t=r.height>H+.5||r.width>W+.5;if(t!==!!tall[n]){tall[n]=t;sync(n)}
  if(!t&&r.height>0&&r.top>=T-.5&&r.bottom<=T+H+.5&&r.left>=L-.5&&r.right<=L+W+.5)start(n)}}
size();
// warm start so every bench shows motion history on first view
for(const n in toys)for(let i=0;i<(n==4?80:n==35?30:6);i++)toys[n].step();
function label(n){const b=document.querySelector(`button[data-t="${n}"][data-a=play]`);if(!b)return;const hold=still&&run[n]&&left[n]!==Infinity;if(hold&&!b.style.width){b.style.boxSizing='border-box';b.style.width=b.getBoundingClientRect().width+'px';b.style.paddingLeft=b.style.paddingRight='0'}else if(!hold&&b.style.width){b.style.boxSizing=b.style.width=b.style.paddingLeft=b.style.paddingRight=''}b.textContent=run[n]?'Pause':'Play'}
document.querySelectorAll('.ctl button').forEach(b=>b.addEventListener('click',()=>{const n=b.dataset.t,a=b.dataset.a;
 if(a=='play'){if(run[n])stop(n);else resume(n)}if(a=='step')toys[n].step();if(a=='reset'){toys[n].init();if(n=='5'){}if(run[n]&&left[n]!==Infinity)left[n]=PLAY[n]}redraw(n)}));
document.querySelectorAll('.ctl input[type=range]').forEach(s=>s.addEventListener('input',()=>redraw(s.id.slice(1))));
document.querySelectorAll('canvas[data-toy]').forEach(c=>c.addEventListener('click',()=>{const n=c.dataset.toy;toys[n].step();redraw(n)}));
for(const n in toys){label(n);sync(n)}
if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{vis[e.target.dataset.toy]=e.isIntersecting}),{rootMargin:'100px'});document.querySelectorAll('canvas[data-toy]').forEach(c=>io.observe(c))}
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{size();for(const n in toys)redraw(n)},120)});
function loop(t){watch();for(const n in toys){if(!vis[n]&&!(run[n]&&left[n]!==Infinity))continue;if(run[n]&&(!last[n]||t-last[n]>speed[n])){if(left[n]>0){toys[n].step();left[n]--;last[n]=t}else stop(n)}if(vis[n])redraw(n)}requestAnimationFrame(loop)}
for(const n in toys)redraw(n);
requestAnimationFrame(loop);
window.__sixways={toys,run,cv,left,auto,tall};
})();
