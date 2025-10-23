const qs=(s,p=document)=>p.querySelector(s);
const qsa=(s,p=document)=>[...p.querySelectorAll(s)];

function nonce(){
  let n=localStorage.getItem('adm_nonce');
  if(!n){
    n=Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
    localStorage.setItem('adm_nonce',n)
  } return n
}
const token=()=>localStorage.getItem('adm_token')||'';
function updateTokenFromResponse(response) {
  const newToken = response.headers.get('X-Refreshed-Token');
  if(newToken) {
    localStorage.setItem('adm_token', newToken);
  }
}
const auth=()=>{
  const h={'X-Client-Nonce':nonce()};
  if(token()) {
    h.Authorization='Bearer '+token();
  }
  return h
}
async function get(u){
  try{
    const r=await fetch(u,{
      headers:{...auth()}
    });
    if(r.status === 401) {
      logout();
      throw new Error('Сессия истекла');
    }
    if(!r.ok) throw new Error('Ошибка сервера');
      updateTokenFromResponse(r);
      return r.json();
  } catch(err) {
    console.error('GET статус:', err);
    throw err;
  }
}
async function post(u,b){
  const r=await fetch(u,
    {
      method:'POST',
      headers:{'Content-Type':'application/json',...auth()},
      body:JSON.stringify(b),
    });
    updateTokenFromResponse(r);
  return r.json()
}

function logout() {
  let tokenLog = '';
  localStorage.removeItem('adm_token');
  loginCard.style.display = 'block';
  adminCard.style.display = 'none';
  qs('#adminPass').value = '';
}

const loginCard=qs('#loginCard');
const adminCard=qs('#adminCard');
const loginMsg=qs('#loginMsg');

qs('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const pwd=qs('#adminPass').value.trim();
  if(!pwd) {
    loginMsg.textContent='Введите пароль';
    return
  }
  loginMsg.textContent='...';
  const r=await fetch('/api/admin/login',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-Client-Nonce':nonce()
      
    },body:JSON.stringify({password:pwd})});
  const j=await r.json();
  if(j.ok) {
    localStorage.setItem('adm_token',j.token);
    loginCard.style.display='none';
    adminCard.style.display='block';
    await init()
  } else {
    loginMsg.textContent='Пароль/доступ не прошёл';
    qs('#adminPass').value = '';
  }
});

async function validateToken() {
  if(!token()) return false
  try {
    await get('/api/admin/playlist');
    return true;
  } catch {
    return false;
  }
}

async function init(){
  buildSettings();
  buildAnimations();
  buildMedia();
  buildPlaylist();
  buildStats();
  buildSecurity();
  qsa('.tab-btn')[0].click();
}

function tabTo(id) {
  qsa('.tab').forEach(t=>t.classList.remove('active'));
  qs('#'+id).classList.add('active');
  qsa('.tab-btn').forEach(b=>b.classList.remove('active'));
  qsa('.tab-btn').find(b=>b.dataset.tab===id)?.classList.add('active')
}
qsa('.tab-btn').forEach(b=>b.addEventListener('click',()=>tabTo(b.dataset.tab)));

async function buildSettings(){
  const t=qs('#tab-settings');
  const s=await get('/api/settings');
  t.innerHTML=`
    <h3>Базовые</h3>
    <div class="row"><label style="min-width:180px">Название</label><input id="projectName" value="${s?.projectName||''}"></div>
    <div class="row"><label style="min-width:180px">GitHub</label><input id="github" value="${s?.github||''}"></div>
    <div class="row"><label style="min-width:180px">Громкость</label><input id="volume" type="number" step="0.05" min="0" max="1" value="${s?.volume??0.7}"></div>
    <div class="row"><label style="min-width:180px">Стекло таймера</label><select id="glassTimer"><option value="1" ${s?.glassTimer!==false?'selected':''}>Вкл</option><option value="0" ${s?.glassTimer===false?'selected':''}>Выкл</option></select></div>
    <div class="row"><label style="min-width:180px">Снег density</label><input id="snowDensity" type="number" value="${s?.snow?.density??180}"></div>
    <div class="row"><label style="min-width:180px">Снег fall</label><input id="snowFall" type="number" step="0.1" value="${s?.snow?.fall??1.4}"></div>
    <div class="row"><label style="min-width:180px">Shuffle по умолчанию</label><select id="shuffleDefault"><option value="1" ${s?.shuffle!==false?'selected':''}>Включён</option><option value="0" ${s?.shuffle===false?'selected':''}>Выключен</option></select></div>
    
    <h3 style="margin-top:14px">Автозапуск видео</h3>
    <div class="row"><label style="min-width:180px">Включить</label><select id="exEnabled"><option value="1" ${s?.exact2355?.enabled?'selected':''}>Вкл</option><option value="0" ${!s?.exact2355?.enabled?'selected':''}>Выкл</option></select></div>
    <div class="row"><label style="min-width:180px">Время запуска</label>
      <select id="exHour">
        ${Array.from({length:24},(_,i)=>`<option value="${i}" ${s?.exact2355?.hour===i?'selected':''}>${String(i).padStart(2,'0')}</option>`).join('')}
      </select>
      <span>:</span>
      <select id="exMinute">
        ${Array.from({length:60},(_,i)=>`<option value="${i}" ${s?.exact2355?.minute===i?'selected':''}>${String(i).padStart(2,'0')}</option>`).join('')}
      </select>
    </div>
    <div class="row"><label style="min-width:180px">Скрыть таймер</label><select id="exHide"><option value="1" ${s?.exact2355?.hideTimer?'selected':''}>Да</option><option value="0" ${!s?.exact2355?.hideTimer?'selected':''}>Нет</option></select></div>
    <div class="row"><label style="min-width:180px">Видео файл</label><input id="exMedia" type="text" value="${s?.exact2355?.media || ''}" placeholder="/frontend/media/video/file.mp4"></div>
    <div class="row"><button id="saveSettings" class="btn">Сохранить</button></div>
  `;
  
  qs('#saveSettings').onclick=async()=>{
    const body={
      projectName: qs('#projectName')?.value.trim() || '',
      github: qs('#github')?.value.trim() || '',
      targetISO: qs('#targetISO')?.value.trim() || '',
      volume: Number(qs('#volume')?.value || 0),
      glassTimer: qs('#glassTimer')?.value==='1',
      snow:{
        density: Number(qs('#snowDensity')?.value || 180),
        fall: Number(qs('#snowFall')?.value || 1.4)
      },
      shuffle: qs('#shuffleDefault')?.value==='1',
      exact2355:{
        enabled: qs('#exEnabled')?.value==='1',
        hour: Number(qs('#exHour')?.value || 23),
        minute: Number(qs('#exMinute')?.value || 55),
        media: qs('#exMedia')?.value.trim() || '',
        hideTimer: qs('#exHide')?.value==='1'
      }
    };
    
    console.log('Отправляем настройки:', body);
    
    const j=await post('/api/admin/settings',body);
    if(j.ok) {
      document.title = body.projectName || 'New Year CountDown';
      alert('Сохранено');
      // УБРАЛ location.reload() - пусть остается на странице
    } else {
      alert('Ошибка сохранения');
    }
  };
}

async function buildAnimations(){
  const t=qs('#tab-anim');
  const s=await get('/api/settings');
  const anim=s?.anim||{
    enabled:true,
    intensity:1,
    garland:true,
    glow:true
  };
  t.innerHTML=`
    <h3>Анимации</h3>
    <div class="row">
      <label style="min-width:180px">Включить</label>
      <select id="anEnabled">
        <option value="1" ${anim.enabled?'selected':''}>Да</option>
        <option value="0" ${!anim.enabled?'selected':''}>Нет</option>
      </select>
    </div>
    <div class="row">
      <label style="min-width:180px">Интенсивность</label>
      <input id="anInt" type="range" min="0" max="2" step="0.1" value="${anim.intensity??1}"></div>
    <div class="row">
      <label style="min-width:180px">Гирлянда</label>
      <select id="anGarland"><option value="1" ${anim.garland!==false?'selected':''}>Да</option><option value="0" ${anim.garland===false?'selected':''}>Нет</option></select></div>
    <div class="row">
      <label style="min-width:180px">Подсветка текста</label>
      <select id="anGlow">
        <option value="1" ${anim.glow!==false?'selected':''}>Да</option>
        <option value="0" ${anim.glow===false?'selected':''}>Нет</option>
      </select>
    </div>
    <div class="row">
      <button id="saveAnim" class="btn">Сохранить</button>
    </div>
  `;
  qs('#saveAnim').onclick=async()=>{
    const body={anim:{
      enabled:qs('#anEnabled').value==='1',
      intensity:Number(qs('#anInt').value),
      garland:qs('#anGarland').value==='1',
      glow:qs('#anGlow').value==='1'
    }};
    const j=await post('/api/admin/settings',body);
    alert(j.ok?'Сохранено':'Ошибка');
  };
}

async function buildMedia(){
  const t=qs('#tab-media');
  t.innerHTML=`
    <h3>Медиа</h3>
    <div class="row">
      <select id="mediaType">
        <option value="audio">audio</option>
        <option value="video">video</option>
      </select>
      <input id="fileInput" type="file" multiple>
      <button id="uploadBtn" class="btn">Загрузить</button>
      <button id="refreshMedia" class="btn">Обновить</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px">
      <div>
        <b>Audio</b>
        <div id="listAudio"></div>
      </div>
      <div>
        <b>Video</b>
          <div id="listVideo">
        </div>
      </div>
    </div>
    <div id="preview" style="width: 90%; margin-left: 6%;"></div>
  `;

  const render=(id,arr,type)=>{
    const box=qs('#'+id);
    box.innerHTML='';
    if(!arr.length) {
      box.innerHTML='<i>пусто</i>';
      return;
    }
    arr.forEach(name=>{
      const d=document.createElement('div');
      d.style.margin='4px 0';
      const url=type==='audio'?`/frontend/media/audio/${name}`:`/frontend/media/video/${name}`;
      d.innerHTML=`<code>${name}</code> <button data-prev>Превью</button>`;
      d.querySelector('[data-prev]').onclick=()=>{const p=qs('#preview');
        p.innerHTML='';
        if(type==='audio') {
          const a=document.createElement('audio');
          a.controls=true;
          a.src=url;p.appendChild(a);
        } else {
          const v=document.createElement('video');
          v.controls=true;
          v.src=url;
          v.style.maxWidth='100%';
          p.appendChild(v);
        }
      };
      box.appendChild(d)
    });
  };

  const refresh=async()=>{
    const m=await get('/api/media');
    render('listAudio',m.audio||[],'audio');
    render('listVideo',m.video||[],'video');
  };
  refresh();
  qs('#refreshMedia').onclick=refresh;
  qs('#uploadBtn').onclick=async()=>{
    const t=qs('#mediaType').value;const fi=qs('#fileInput');if(!fi.files.length)return alert('Выберите файлы');
    const fd=new FormData();[...fi.files].forEach(f=>fd.append('files',f));
    const r=await fetch('/api/admin/upload?type='+t,{method:'POST',headers:{...auth()},body:fd});
    const j=await r.json();alert(j.ok?('Загружено: '+j.files.length):'Ошибка');fi.value='';refresh();
  };
}

async function buildPlaylist(){
  const t=qs('#tab-playlist');
  t.innerHTML=`<h3>Плейлист</h3><div class="row"><button id="plLoad" class="btn">Загрузить текущий</button><button id="plSave" class="btn">Сохранить порядок</button></div><div id="plList" style="margin-top:8px"></div>`;
  qs('#plLoad').onclick=async()=>{const m=await get('/api/media');const a=(m.audio||[]);const box=qs('#plList');box.innerHTML='';if(!a.length){box.innerHTML='<i>пусто</i>';return}a.forEach(n=>{const d=document.createElement('div');d.style.margin='4px 0';d.innerHTML=`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" checked data-name="${n}"><span>${n}</span></label>`;box.appendChild(d)})};
  qs('#plSave').onclick=async()=>{const picks=[...document.querySelectorAll('#plList input[type="checkbox"]:checked')].map(i=>i.getAttribute('data-name'));const j=await post('/api/admin/playlist',{order:picks});alert(j.ok?'Сохранено':'Ошибка')};
}

async function buildStats(){
  const t=qs('#tab-stats');
  t.innerHTML=`<h3>Статистика</h3><div id="statsBox" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"><div><div>Всего</div><b id="stTotal">0</b></div><div><div>Уникальные</div><b id="stUnique">0</b></div><div><div>Сегодня</div><b id="stToday">0</b></div><div><div>Треки</div><b id="stTracks">0</b></div></div><div class="row" style="margin-top:12px"><button id="stRefresh" class="btn">Обновить</button><a id="stDownload" class="btn" href="/api/admin/download/stats.json" target="_blank" rel="noopener">Скачать JSON</a><button id="stReset" class="btn">Сбросить</button></div>`;
  const refresh=async()=>{
    const j=await get('/api/stats');
    qs('#stTotal').textContent=j.total;
    qs('#stUnique').textContent=j.unique;
    qs('#stToday').textContent=j.today;
    qs('#stTracks').textContent=j.tracks
  };
  qs('#stRefresh').onclick=refresh;
  qs('#stReset').onclick=async()=>{
    if(confirm('Сбросить?')) {
      await post('/api/stats', {
        action: "reset"
      });
      if(j.ok) refresh();
      console.log(j.ok)
    }
  };
  refresh();
}

async function buildSecurity(){
  const t=qs('#tab-security');const s=await get('/api/settings');
  t.innerHTML=`<h3>Безопасность</h3><div class="row"><label style="min-width:220px">Nonce обязателен</label><select id="secNonce"><option value="1" ${s.security?.nonceRequired?'selected':''}>Да</option><option value="0" ${!s.security?.nonceRequired?'selected':''}>Нет</option></select></div><div class="row"><label style="min-width:220px">Привязка к IP</label><select id="secIP"><option value="1" ${s.security?.ipLock?'selected':''}>Да</option><option value="0" ${!s.security?.ipLock?'selected':''}>Нет</option></select></div><div class="row"><input id="newPwd" type="password" placeholder="Новый пароль (мин 6)"><button id="pwdSave" class="btn">Сменить пароль</button></div><div class="row"></div>`;
  qs('#pwdSave').onclick=async()=>{const p=qs('#newPwd').value.trim();if(!p||p.length<6)return alert('Короткий пароль');const j=await post('/api/admin/password',{newPassword:p});alert(j.ok?'Пароль обновлён':'Ошибка')};
  qs('#revokeTokens').onclick=async()=>{const j=await post('/api/admin/tokens/revoke',{});alert(j.ok?'Все сессии сброшены':'Ошибка')};
}

if(token()){
  loginCard.style.display='none';
  adminCard.style.display='block';
  init().catch(()=>{})
}

// Инициализация токена
(async function () {
  if(token()) {
    const isValid = await validateToken();
    if(isValid) {
      loginCard.style.display = 'none';
      adminCard.style.display = 'block';
      init().catch(console.error)
    } else {
      logout();
    }
  }
})();

document.getElementById('logoutBtn')?.addEventListener('click', function() {
    // Очищаем все данные авторизации
    localStorage.clear();
    sessionStorage.clear();
    
    // Перезагружаем страницу чтобы показать форму логина
    window.location.reload();
});