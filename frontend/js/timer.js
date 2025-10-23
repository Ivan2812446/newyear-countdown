let SETTINGS = null;
const clock = document.getElementById('clock'),
      sub = document.getElementById('sub'),
      player = document.getElementById('player');

let playlist = [], musicPtr = -1;
let overlay = null, ovAudio = null;
let videoShownToday = false;

let videoFiles = [];

async function loadVideoFiles() {
    try {
        const response = await fetch('/api/media');
        const mediaData = await response.json();
        videoFiles = (mediaData.video || []).map(n => '/frontend/media/video/' + n);
        console.log('Автоматически загружены видео:', videoFiles);
    } catch {
        videoFiles = [];
        console.log('Не удалось загрузить видео');
    }
}

let currentVideoIndex = 0;

(async () => {
    try {
        SETTINGS = await (await fetch('/api/settings')).json();
    } catch {}
    startSnow();
    startAll();
})();

function pad(n) {
    return String(n).padStart(2, '0');
}

function localFromISO(s) {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) {
        return new Date(s);
    }
    const [_, Y, M, D, h, mn, sc] = m;
    return new Date(+Y, +M - 1, +D, +h, +mn, +(sc || 0), 0);
}

function nextLocalNY() {
    const n = new Date();
    return new Date(n.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

function targetTime() {
    const iso = SETTINGS?.targetISO;
    if (!iso) {
        return nextLocalNY();
    }
    return /Z$|[+-]\d\d:\d\d$/.test(iso) ? new Date(iso) : localFromISO(iso);
}

let target = targetTime();
console.log(target);

function fit() {
    const box = document.querySelector('.center');
    const w = box.clientWidth - 26;
    const tmp = document.createElement('span');
    tmp.style.position = 'absolute';
    tmp.style.visibility = 'hidden';
    tmp.style.whiteSpace = 'nowrap';
    tmp.style.font = window.getComputedStyle(clock).font;
    tmp.textContent = clock.textContent;
    document.body.appendChild(tmp);
    const need = tmp.getBoundingClientRect().width;
    tmp.remove();
    const s = Math.min(1, Math.max(0.44, w / need));
    clock.style.transform = `scale(${s})`;
}

function runTimer() {
    let lastTime = Date.now();

    const step = () => {
        const now = Date.now();
        const elapsed = now - lastTime;

        if (elapsed >= 1000) {
            lastTime = now;

            // ОБНОВЛЯЕМ target каждый раз из текущих настроек
            target = targetTime();
            const d = +target - Date.now();
	    console.log('Target:', target);
	    console.log('Разница:', target-Date.now())
            
            console.log('Осталось мс:', d);
            
            if (d <= 0) {
                console.log('🎉 С НОВЫМ ГОДОМ!');
                clock.textContent = 'С Новым Годом! 🎉';
                sub.textContent = '';
                stopMusic();
                fit();
            } else {
                const s = Math.floor(d / 1000),
                    dd = Math.floor(s / 86400),
                    h = Math.floor((s % 86400) / 3600),
                    m = Math.floor((s % 3600) / 60),
                    se = s % 60;
                clock.textContent = `${dd > 0 ? pad(dd) + ':' : ''}${pad(h)}:${pad(m)}:${pad(se)}`;
                sub.textContent = dd > 0 ? 'дни · часы · минуты · секунды' : 'часы · минуты · секунды';
                fit();
            }
        }
        requestAnimationFrame(step);
    };
    step();
}

function startSnow() {
    const c = document.getElementById('snow');
    if (!c) return;
    const x = c.getContext('2d');
    let w = 0, h = 0, f = [];
    const D = (SETTINGS?.snow?.density ?? 180);
    const F = 0.7;

    function cnt() {
        const k = (w * h) / 20000;
        return Math.min(240, Math.max(60, Math.round(k * (D / 180))));
    }

    function R() {
        w = innerWidth;
        h = innerHeight;
        c.width = w;
        c.height = h;
        const N = cnt();
        f = Array.from({ length: N }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 1 + Math.random() * 1.9,
            s: (.4 + Math.random()) * F,
            a: Math.random() * 6
        }));
    }
    addEventListener('resize', R);
    R();

    function L(t) {
        x.clearRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,255,255,.9)';
        for (const p of f) {
            p.y += p.s;
            p.x += Math.sin((t + p.a) / 900) * .45;
            if (p.y > h) {
                p.y = -6;
                p.x = Math.random() * w;
            }
            x.beginPath();
            x.arc(p.x, p.y, p.r, 0, 7);
            x.fill();
        }
        requestAnimationFrame(L);
    }
    requestAnimationFrame(L);
}

// Музыкальные функции
const allow = () => localStorage.getItem('music-choice') === 'yes';

(function setupPlaylist() {
    fetch('/api/media').then(r => r.json()).then(m => {
        const arr = (m.audio || []).map(n => '/frontend/media/audio/' + n);
        playlist = arr.length ? arr : ['/frontend/media/audio/track1.mp3', '/frontend/media/audio/track2.mp3', '/frontend/media/audio/track3.mp3'];
    }).catch(() => {
        playlist = ['/frontend/media/audio/track1.mp3', '/frontend/media/audio/track2.mp3', '/frontend/media/audio/track3.mp3'];
    });
})();

function fy(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function nextMusic() {
    if (!allow() || !playlist.length) return;
    const sh = localStorage.getItem('music-shuffle') === '1';
    if (musicPtr === -1) {
        if (sh) playlist = fy(playlist.slice());
    }
    musicPtr = (musicPtr + 1) % playlist.length;
    if (musicPtr === 0 && sh) playlist = fy(playlist.slice());
    player.src = playlist[musicPtr];
    player.play().catch(() => {});
}

function startMusic() {
    if (!allow()) return;
    musicPtr = -1;
    player.onended = nextMusic;
    nextMusic();
}

function stopMusic() {
    player.pause();
    player.removeAttribute('src');
    player.onended = null;
}

// Функция для показа диалога музыки
function initMusicDialog() {
    const dlg = document.getElementById('soundPrompt');
    const yes = document.getElementById('sndYes');
    const no = document.getElementById('sndNo');
    const mode = document.getElementById('shuffleYes');
    
    if (!dlg || !yes || !no) return;
    
    // ПРОСТО ВСЕГДА ПОКАЗЫВАЕМ ДИАЛОГ
    dlg.classList.remove('hidden');
    
    yes.addEventListener('click', () => {
        localStorage.setItem('music-choice', 'yes');
        localStorage.setItem('music-shuffle', mode.checked ? '1' : '0');
        dlg.classList.add('hidden');
        startMusic();
    });
    
    no.addEventListener('click', () => {
        localStorage.setItem('music-choice', 'no');
        dlg.classList.add('hidden');
        stopMusic();
    });
}

// Функции для видео в 23:55
function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:100;display:grid;place-items:center';

    ovAudio = document.createElement('video');
    ovAudio.style.width = '100vw';
    ovAudio.style.height = '100vh';
    ovAudio.style.objectFit = 'contain';
    ovAudio.style.position = 'fixed';
    ovAudio.style.top = '0';
    ovAudio.style.left = '0';
    ovAudio.style.backgroundColor = '#000';
    ovAudio.style.margin = '0';
    ovAudio.style.padding = '0';
    ovAudio.style.border = 'none';
    ovAudio.style.outline = 'none';
    ovAudio.style.boxSizing = 'border-box';
    ovAudio.controls = true;
    ovAudio.autoplay = true;
    ovAudio.muted = false;
    ovAudio.playsInline = true;

    stopMusic();

    // ОБРАБОТЧИКИ ДЛЯ ОТСЛЕЖИВАНИЯ ЗАГРУЗКИ
    ovAudio.addEventListener('loadedmetadata', function() {
        console.log('Метаданные загружены, длительность:', ovAudio.duration);
    });

    ovAudio.addEventListener('canplay', function() {
        console.log('Видео готово к воспроизведению');
    });

    ovAudio.addEventListener('error', function(e) {
        console.error('Ошибка видео:', e);
        console.error('Код ошибки:', ovAudio.error);
    });

    ovAudio.addEventListener('ended', function() {
        console.log('🎬 Видео закончилось, переключаем...');
        playNextVideo();
    });

    // ПРОСТАЯ ПРОВЕРКА ВМЕСТО ИНТЕРВАЛА
    function checkVideoProgress() {
        if (ovAudio && ovAudio.duration && ovAudio.duration !== Infinity) {
            const timeLeft = ovAudio.duration - ovAudio.currentTime;
            console.log('⏱️ Прогресс:', ovAudio.currentTime.toFixed(1) + ' / ' + ovAudio.duration.toFixed(1) + 'сек');
            
            if (timeLeft <= 1) {
                console.log('Видео заканчивается, переключаем...');
                playNextVideo();
            }
        } else {
            console.log('Видео еще загружается...');
        }
    }

    // ЗАПУСКАЕМ ПРОВЕРКУ КОГДА ВИДЕО НАЧИНАЕТ ИГРАТЬ
    ovAudio.addEventListener('playing', function() {
        console.log('Видео началось');
        // Проверяем прогресс каждую секунду
        setInterval(checkVideoProgress, 1000);
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        position:absolute;
        top:20px;
        right:20px;
        background:rgba(255, 255, 255, 1);
        color:black;
        border:none;
        border-radius:50%;
        width:40px;
        height:40px;
        font-size:20px;
        cursor:pointer;
        z-index:101;
    `;
    closeBtn.onclick = hideOverlay;

    overlay.appendChild(ovAudio);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    return overlay;
}

// Воспроизведение следующего видео
function playNextVideo() {
    if (!ovAudio || videoFiles.length === 0) return;
    
    currentVideoIndex = (currentVideoIndex + 1) % videoFiles.length;
    const nextVideo = videoFiles[currentVideoIndex];
    ovAudio.src = nextVideo;
    
    ovAudio.play().catch(e => {
        // Если ошибка, пробуем следующее видео
        setTimeout(playNextVideo, 1000);
    });
}

function hideOverlay() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    ovAudio = null;
    document.querySelector('.center').style.display = '';
    currentVideoIndex = 0;

    if(allow()) {
        startMusic();
    }
}

function watch2355() {
    const cfg = SETTINGS?.exact2355 || {};

    const targetHour = cfg.hour !== undefined ? cfg.hour : 23;
    const targetMinute = cfg.minute !== undefined ? cfg.minute : 55;

    const tick = () => {
        const n = new Date();
        const currentHour = n.getHours();
        const currentMinute = n.getMinutes();

        if (cfg.enabled && currentHour === targetHour && currentMinute === targetMinute) {
            if (SETTINGS?.exact2355?.hideTimer) {
                const timerElement = document.querySelector('.center');
                if (timerElement) {
                    timerElement.style.display = 'none';
                }
            }

            ensureOverlay();

            // Добавляем обработчик для отслеживания загрузки видео
            ovAudio.addEventListener('loadeddata', function() {
                // console.log('Сейчас играет видео:', ovAudio.src);
                // console.log('Индекс видео:', currentVideoIndex);
                // console.log('Файл:', videoFiles[currentVideoIndex]);
            });

            if (videoFiles.length > 0) {
                ovAudio.src = videoFiles[0];
                currentVideoIndex = 0;
                ovAudio.play().catch(e => {
                    ovAudio.muted = true;
                    ovAudio.play();
                });
                // console.log('Все видео:', videoFiles);
                // console.log('Количество видео:', videoFiles.length);
                // console.log('Элемент видео:', ovAudio);
                // console.log('Стартовый индекс:', currentVideoIndex);
            }

            return;
        }

        if (overlay && (currentHour !== targetHour || currentMinute !== targetMinute)) {
            hideOverlay();
        }

        setTimeout(tick, 1000);
    };
    tick();
}

// ФУНКЦИИ ДЛЯ ПОЛНОЭКРАННОГО РЕЖИМА
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => {});
    } else {
        document.exitFullscreen();
    }
}

function initFullscreenDialog() {
    const dlg = document.getElementById('fullscreenPrompt');
    const yes = document.getElementById('fsYes');
    const no = document.getElementById('fsNo');
    
    if (!dlg || !yes || !no) return;
    
    dlg.classList.remove('hidden');
    
    yes.addEventListener('click', () => {
        toggleFullscreen();
        dlg.classList.add('hidden');
    });
    
    no.addEventListener('click', () => {
        dlg.classList.add('hidden');
    });
}

async function startAll() {
    await loadVideoFiles();
    initMusicDialog();
    initFullscreenDialog();
    playNextVideo();
    if (allow()) startMusic();
    runTimer();
    watch2355();
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && allow() && player?.src) {
        player.play().catch(() => {});
    }
});

// Функция для обновления настроек
async function updateSettings() {
    try {
        SETTINGS = await (await fetch('/api/settings')).json();
        console.log('Настройки обновлены:', SETTINGS?.exact2355);
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
    }
}

// Обновляем настройки каждые 30 секунд
setInterval(updateSettings, 10000);

// Обновляем когда страница становится видимой
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        updateSettings();
    }
});
