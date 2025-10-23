let lastSeq=0; const ui={bannerBox:null,fwCanvas:null};

function ensureBanner(){ if(ui.bannerBox) return ui.bannerBox;
  const wrap=document.createElement('div'); wrap.style.cssText='position:fixed;left:50%;top:6%;transform:translateX(-50%);z-index:9';
  const box=document.createElement('div'); box.style.cssText='padding:10px 16px;border-radius:14px;background:rgba(255,255,255,.14);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.28);font-weight:800;color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.35)';
  wrap.appendChild(box); document.body.appendChild(wrap); ui.bannerBox=box; return box;
}
function showBanner(text,ms=5000){const box=ensureBanner(); box.textContent=text; box.style.opacity='1'; setTimeout(()=>{box.style.opacity='0'},ms);}

function ensureFW(){ if(ui.fwCanvas) return ui.fwCanvas;
  const c=document.createElement('canvas'); c.style.cssText='position:fixed;inset:0;z-index:8;pointer-events:none'; document.body.appendChild(c); ui.fwCanvas=c; return c;
}
function fireworks(seconds=6){ const c=ensureFW(),ctx=c.getContext('2d'); const R=()=>{c.width=innerWidth;c.height=innerHeight}; R(); addEventListener('resize',R,{passive:true});
  const dots=[]; let tEnd=performance.now()+seconds*1000; function blast(){const cx=Math.random()*c.width,cy=Math.random()*c.height*.7; for(let i=0;i<80;i++){const ang=Math.random()*Math.PI*2,sp=1+Math.random()*3; dots.push({x:cx,y:cy,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:60+Math.random()*40});}}
  let last=0; function loop(ts){ if(ts-last>500){blast();last=ts;} ctx.clearRect(0,0,c.width,c.height); ctx.globalCompositeOperation='lighter';
    for(let i=dots.length-1;i>=0;i--){const d=dots[i]; d.x+=d.vx; d.y+=d.vy; d.vy+=0.02; d.life-=1; if(d.life<=0){dots.splice(i,1);continue} const a=Math.max(0,d.life/100); ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillRect(d.x,d.y,2,2); }
    if(ts<tEnd||dots.length) requestAnimationFrame(loop); else ctx.clearRect(0,0,c.width,c.height);
  } requestAnimationFrame(loop);
}

async function poll(){ try{const r=await fetch('/api/live?after='+lastSeq); const j=await r.json(); lastSeq=j.seq||lastSeq; (j.events||[]).forEach(e=>{ if(e.type==='banner') showBanner(e.payload?.text||'🎉'); if(e.type==='fireworks') fireworks(Number(e.payload?.seconds)||6); }); }catch{} setTimeout(poll,1500);}
export function startLiveClient(){ poll(); }
