(function(){
    const c=document.getElementById('snow');
    if(!c)return;
    const x=c.getContext('2d');
    let w=0,h=0,f=[];function R(){
        w=innerWidth;h=innerHeight;
        c.width=w;
        c.height=h;
        f=Array.from({
            length:Math.min(150,Math.floor(w*h/14000))
        },()=>({
            x:Math.random()*w,y:Math.random()*h,
            r:1+Math.random()*1.6,
            s:.5+Math.random()*.8,
            a:Math.random()*6
        })
    )}addEventListener('resize',R);R();
    function L(t){
        x.clearRect(0,0,w,h);
        x.fillStyle='rgba(255,255,255,.9)';
        for(const p of f){
            p.y+=p.s;p.x+=Math.sin((t+p.a)/900)*.55;if(p.y>h){p.y=-5;
                p.x=Math.random()*w}x.beginPath();
                x.arc(p.x,p.y,p.r,0,7);x.fill()
            }
            requestAnimationFrame(L)
        }requestAnimationFrame(L)
    })();

const bgm=document.getElementById('bgm');
let deck=[],ptr=-1;

function fy(a){
    for(let i=a.length-1;i>0;i--){
        const j=(Math.random()*(i+1))|0;
        [a[i],a[j]]=[a[j],a[i]]
    }return a
}

async function buildDeck(){
    try{
        const s=await (await fetch('/api/settings')).json();
        const med=await (await fetch('/api/media')).json();
        let arr=(med.audio||[]).map(n=>'/frontend/media/audio/'+n);
        if(!arr.length)arr=[
            '/frontend/media/audio/track1.mp3',
            '/frontend/media/audio/track2.mp3',
            '/frontend/media/audio/track3.mp3'
        ];
        deck=(s.shuffle!==false?fy(arr.slice()):arr.slice())
    }catch{
        deck=[
            '/frontend/media/audio/track1.mp3',
            '/frontend/media/audio/track2.mp3',
            '/frontend/media/audio/track3.mp3'
        ]
    }
}

function next(){
    if(!deck.length)return;
    ptr=(ptr+1)%deck.length;
    if(ptr===0)deck=fy(deck.slice());
    bgm.src=deck[ptr];
    bgm.play().catch(()=>{})
}

function start(){
    bgm.onended=next;
    ptr=-1;
    next()
}

function stop(){
    bgm.pause();
    bgm.removeAttribute('src');
    bgm.onended=null
}

document.addEventListener('DOMContentLoaded',async()=>{
    await buildDeck();
    
    // Автоматически запускаем музыку в mute режиме
    bgm.muted = true;
    start();
    
    // Добавляем кнопку для включения/выключения звука
    addMuteButton();
});

// Функция для добавления кнопки mute/unmute
function addMuteButton() {
    const muteBtn = document.createElement('button');
    muteBtn.innerHTML = '🔇';
    muteBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;background:var(--glass);border:1px solid var(--brd);border-radius:50%;width:50px;height:50px;font-size:20px;cursor:pointer;backdrop-filter:blur(14px)';
    
    muteBtn.addEventListener('click', function() {
        bgm.muted = !bgm.muted;
        muteBtn.innerHTML = bgm.muted ? '🔇' : '🔊';
    });
    
    document.body.appendChild(muteBtn);
}