(async () => {
  try{
    const s = await (await fetch('/api/settings')).json();
    console.log(s);
    const gh = document.getElementById('gitID');
    if(gh){
      if(s?.github && s.github.trim()){
        gh.href = s.github.trim();
        gh.target = "_blank"; gh.rel="noopener";
      }else{
        gh.style.display='none';
      }
    }
  }catch{}
})();