// modals.js - Modal management for DocFlow
// Extracted from public/app.js

function showM(title,body,w=560){
  $('mroot').innerHTML=`<div class="modal-overlay open" onclick="if(event.target===this)closeM()">
    <div class="modal" style="max-width:${w}px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <span style="font-family:var(--font-head);font-size:18px;font-weight:700">${title}</span>
        <button class="btn btn-secondary btn-sm" onclick="closeM()">✕</button>
      </div>
      ${body}
    </div>
  </div>`;
}

function closeM(){$('mroot').innerHTML=''}

function confirmDialog({ title, message, icon='⚠️', btnText='Confirmar', btnClass='btn-primary', onConfirm, obsLabel=null }){
  let obsHtml='';
  if(obsLabel){
    obsHtml=`
      <div style="margin-bottom:16px;text-align:left">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px">${obsLabel}</div>
        <textarea id="confirm-obs" rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:14px;font-family:var(--font-body);resize:vertical;"></textarea>
      </div>`;
  }
  showM(title,`
    <div style="padding:8px 0;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">${icon}</div>
      <p style="color:var(--muted);margin-bottom:8px">${message}</p>
    </div>
    ${obsHtml}
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeM()">Cancelar</button>
      <button class="btn ${btnClass}" id="confirm-btn" onclick="doConfirm()">${btnText}</button>
    </div>
  `, 400);
  window.doConfirm = async () => {
    const btn = $('confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Procesando...';
    try {
      await onConfirm();
    } catch(e) {
      toast(e.message, 'error');
    }
    closeM();
    delete window.doConfirm;
  };
}

function setLoading(id, v){
  const btn=$(id);
  if(!btn)return;
  if(!btn.dataset.txt) btn.dataset.txt = btn.textContent.trim();
  btn.disabled = v;
  if(v){
    btn.innerHTML = '<span class="spinner"></span> Procesando...';
  } else {
    btn.textContent = btn.dataset.txt || 'Guardar';
  }
}
