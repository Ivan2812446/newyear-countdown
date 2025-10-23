const box=document.getElementById("chatBox"),input=document.getElementById("msg"),send=document.getElementById("send"),warn=document.getElementById("warn");
function line(a,t){const d=document.createElement("div");d.style.margin="4px 0";d.innerHTML=`<b>${a}:</b> ${t}`;box.appendChild(d);box.scrollTop=box.scrollHeight}
async function enabled(){try{const s=await (await fetch("/api/settings")).json();return !!s.discord?.enabled}catch{return false}}
async function pushHistory(){const en=await enabled();warn.textContent=en?"":"Discord отключён в настройках";if(!en){box.innerHTML="";return}const r=await fetch("/api/discord/history");const arr=await r.json();box.innerHTML="";arr.forEach(m=>line(m.author,m.content))}
document.getElementById("loadHistory").addEventListener("click",pushHistory);
send.addEventListener("click",async()=>{const t=input.value.trim();if(!t)return;const en=await enabled();if(!en){warn.textContent="Discord отключён";return}input.value="";line("Вы",t);const r=await fetch("/api/discord/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t})});const j=await r.json();if(!j.ok){line("Система","не отправлено")}});input.addEventListener("keydown",e=>{if(e.key==="Enter")send.click()});
pushHistory();
setInterval(pushHistory,8000);
