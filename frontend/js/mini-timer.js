function pad(n){
    return String(n).padStart(2,"0")
}
function localFromISO(s){
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if(!m) {
        return new Date(s);
    }
    const[_,Y,M,D,h,mn,sc]=m;
    return new Date(+Y,+M-1,+D,+h,+mn,+(sc||0),0)
    }
function nextLocalNY(){
    const n=new Date();
    return new Date(n.getFullYear()+1,0,1,0,0,0,0);
}

let target=nextLocalNY();

(
    async() => {
        try{
            const s=await (
                await fetch("/api/settings")).json();
            if(s?.targetISO){
                target=/Z$|[+-]\d\d:\d\d$/.test(s.targetISO)?new Date(s.targetISO):localFromISO(s.targetISO)}
        } catch(err) {
            console.error('Ошибка запроса', err)
        } run()
    }
) ();
function run(){
    const c = document.getElementById("miniClock"),
    sub = document.getElementById("miniSub");
    
    // Создаем смещенную цель
    const shiftedTarget = new Date(target.getTime());
    
    const step = () => {
        const d = +shiftedTarget - Date.now();
        
        if(d <= 0){
            c.textContent="🎉 00:00:00";
            sub.textContent="С Новым Годом!";
            clearInterval(timer);
            return;
        }
        
        const s=Math.floor(d/1000),
        dd=Math.floor(s/86400),
        h=Math.floor((s%86400)/3600),
        m=Math.floor((s%3600)/60),
        se=s%60;
        
        c.textContent=`${dd>0?pad(dd)+":":""}${pad(h)}:${pad(m)}:${pad(se)}`;
    };
    
    const timer = setInterval(step, 1000); // Исправлено: 1000ms вместо 100ms
    step(); // Запустить сразу
}