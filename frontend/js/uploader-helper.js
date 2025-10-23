export function bindDropZone(zoneEl, inputEl) {
  if(!zoneEl || !inputEl) return;
  const hl = (on) => { zoneEl.style.outline = on ? '2px dashed rgba(255,255,255,.5)' : 'none'};
  ['dragenter','dragover'].forEach(e= zoneEl.addEventListener(e = ev =>{ ev.preventDefault(); hl(true); }));
  ['dragleave','drop'].forEach(e= zoneEl.addEventListener(e = ev =>{ ev.preventDefault(); hl(false); }));
  zoneEl.addEventListener('drop', ev => {
    const files = [...(ev.dataTransfer.files || [])];
    if(!files.length) return;
    const dt = new DataTransfer();
    files.forEach(f=dt.items.add(f));
    inputEl.files = dt.files;
  });
}
