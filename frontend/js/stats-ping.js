(function() {
    const key='nyc_uid';
    let uid=localStorage.getItem(key);
    if(!uid) {
        uid=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
        localStorage.setItem(key,uid)
    }
    fetch('/api/stat/visit',{
        method:'POST',
        headers: {
            'Content-Type':'application/json'
        },body:JSON.stringify({
            uid,page:location.pathname
        })
    }).catch(()=>{})})();
