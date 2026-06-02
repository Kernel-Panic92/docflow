// backup.js - Backup and restore views for DocFlow

async function rBackup(){
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Backup y Restauración</div><div class="page-sub">Exporta o restaura toda la información del sistema</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;">
        <div style="font-weight:700;font-size:16px;margin-bottom:6px;">📦 Exportar Backup</div>
        <p style="color:var(--muted);font-size:13px;margin-bottom:20px;line-height:1.6;">
          Descarga un archivo <strong style="color:var(--text)">ZIP</strong> con la información del sistema.
          Incluye un <code style="color:var(--accent)">backup.json</code> para restaurar.
        </p>
        <div style="background:var(--surface2);border-radius:10px;padding:16px;margin-bottom:20px;font-size:13px;">
          <div style="font-weight:600;margin-bottom:10px;">Opciones de backup:</div>
          <div style="display:flex;flex-direction:column;gap:6px;color:var(--muted);">
            <span>✓ Solo configuración (∼20KB): Facturas, categorías, usuarios, áreas, configuración</span>
            <span>✓ Backup completo: Genera en servidor (panel derecho)</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" id="btn-descargar-backup-config" onclick="descargarBackup('config')" style="flex:1;justify-content:center;padding:11px;">⚙️ Solo Config</button>
        </div>
        <div id="backup-ok" style="display:none;margin-top:14px;padding:10px 14px;background:rgba(79,190,150,0.1);border:1px solid rgba(79,190,150,0.3);border-radius:9px;font-size:13px;color:var(--success);">✓ Backup generado y descargado correctamente.</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;">
        <div style="font-weight:700;font-size:16px;margin-bottom:6px;">♻️ Restaurar Backup</div>
        <div style="background:rgba(231,76,60,0.06);border:1px solid rgba(231,76,60,0.2);border-radius:10px;padding:14px;margin-bottom:20px;font-size:12px;color:var(--danger);">
          ⚠ Los datos actuales serán reemplazados por los del backup. Tu usuario administrador actual no será afectado.
        </div>
        <div style="margin-bottom:20px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <span>📁 Backups en el Servidor</span>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-primary btn-sm" onclick="generarBackupServidor()">➕ Generar</button>
              <button class="btn btn-secondary btn-sm" onclick="cargarListaBackups()">🔄 Actualizar</button>
            </div>
          </div>
          <div id="backup-progress" style="display:none;margin:8px 0;padding:8px 12px;background:var(--surface2);border-radius:8px;"></div>
          <div id="lista-backups-loading" style="text-align:center;padding:16px;color:var(--muted);font-size:13px;">Cargando...</div>
          <div id="lista-backups-none" style="display:none;text-align:center;padding:16px;color:var(--muted);font-size:12px;background:var(--surface2);border-radius:9px;">🕐 No hay backups disponibles</div>
          <div id="lista-backups-body" style="display:none;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;"></div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:20px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px;">📂 Restaurar desde Archivo</div>
          <p style="color:var(--muted);font-size:12px;margin-bottom:14px;line-height:1.6;">
            Sube un <strong style="color:var(--text)">.zip</strong> generado por DocFlow.
          </p>
          <div id="restore-drop" onclick="document.getElementById('restore-file').click()"
            style="border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;margin-bottom:12px;transition:border-color 0.2s;"
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'"
            ondragover="event.preventDefault();this.style.borderColor='var(--accent)'"
            ondragleave="this.style.borderColor='var(--border)'"
            ondrop="handleRestoreDrop(event)">
            <div style="font-size:28px;margin-bottom:6px;">📂</div>
            <div style="font-size:13px;color:var(--muted);">Clic o arrastra tu archivo <strong style="color:var(--text)">.zip</strong></div>
            <div id="restore-filename" style="margin-top:6px;font-size:12px;color:var(--accent);display:none;"></div>
          </div>
          <input type="file" id="restore-file" accept=".zip" style="display:none"/>
          <button class="btn btn-danger" id="btn-restaurar" onclick="restaurarBackup()" disabled style="width:100%;justify-content:center;padding:11px;opacity:0.5;">
            ♻️ Restaurar desde Archivo
          </button>
        </div>
        <div id="restore-ok" style="display:none;margin-top:14px;padding:10px 14px;background:rgba(79,190,150,0.1);border:1px solid rgba(79,190,150,0.3);border-radius:9px;font-size:13px;color:var(--success);"></div>
        <div id="restore-err" style="display:none;margin-top:14px;padding:10px 14px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.3);border-radius:9px;font-size:13px;color:var(--danger);"></div>
      </div>
    </div>`;
  initBackupListeners();
  cargarListaBackups();
}

let _backupListenerInit=false;
let restoreFile=null;

function initBackupListeners(){
  if(_backupListenerInit)return;
  _backupListenerInit=true;
  const inp=document.getElementById('restore-file');
  if(inp){
    inp.addEventListener('change',function(){
      restoreFile=this.files[0];
      document.getElementById('restore-filename').textContent='📄 '+restoreFile.name;
      document.getElementById('restore-filename').style.display='block';
      document.getElementById('btn-restaurar').disabled=false;
      document.getElementById('btn-restaurar').style.opacity='1';
      document.getElementById('restore-ok').style.display='none';
      document.getElementById('restore-err').style.display='none';
    });
  }
}

function handleRestoreDrop(e){
  e.preventDefault();
  document.getElementById('restore-drop').style.borderColor='var(--border)';
  const file=e.dataTransfer.files[0];
  if(file&&file.name.endsWith('.zip')){
    restoreFile=file;
    document.getElementById('restore-filename').textContent='📄 '+restoreFile.name;
    document.getElementById('restore-filename').style.display='block';
    document.getElementById('btn-restaurar').disabled=false;
    document.getElementById('btn-restaurar').style.opacity='1';
  }
}

async function descargarBackup(tipo='completo'){
  const btn=tipo==='config'?document.getElementById('btn-descargar-backup-config'):document.getElementById('btn-descargar-backup');
  const label=tipo==='config'?'⚙️ Solo Config':'💾 Completo';
  btn.disabled=true;btn.textContent='Verificando...';
  
  const token=localStorage.getItem('vd_t');
  
  // Verificar conexión primero
  try{
    await fetch('/api/backup?action=generate&tipo=config',{headers:{Authorization:`Bearer ${token}`}});
  }catch(e){
    btn.disabled=false;btn.textContent=label;
    toast('Sin conexión al servidor','error');
    return;
  }
  
  btn.textContent='Generando...';
  const progresoEl=document.getElementById('mroot');
  progresoEl.innerHTML=`<div class="modal-overlay open">
    <div class="modal" style="max-width:520px">
      <div style="font-family:var(--font-head);font-size:18px;font-weight:700;margin-bottom:16px">
        ${tipo==='config'?'⚙️ Backup de Configuración':'💾 Backup Completo'}
      </div>
      <div id="backup-progress-msg" style="font-size:14px;color:var(--muted);margin-bottom:12px">Iniciando...</div>
      <div style="background:var(--surface2);border-radius:6px;height:10px;overflow:hidden;margin-bottom:16px">
        <div id="backup-progress-bar" style="background:var(--accent);height:100%;width:0%;transition:width .5s"></div>
      </div>
      <div id="backup-terminal" style="background:#1a1a1a;color:#00ff00;font-family:monospace;font-size:11px;padding:12px;border-radius:6px;height:120px;overflow-y:auto;line-height:1.6;margin-bottom:16px">
        <div style="opacity:0.7">[...] Iniciando backup...</div>
      </div>
      <div style="display:flex;justify-content:center">
        <button class="btn btn-secondary" onclick="window.cancelarBackupGen()">Cancelar</button>
      </div>
    </div>
  </div>`;
  
  let cancelled=false;
  let pollInterval=null;
  
  window.cancelarBackupGen=async function(){
      cancelled=true;
      if(pollInterval)clearInterval(pollInterval);
      try{await fetch('/api/backup/cancelar',{method:'POST',headers:{Authorization:'Bearer '+token}})}catch(_){}
      closeM();
      btn.disabled=false;
      btn.textContent=label;
    };
  
  try{
    // Paso 1: Generar backup
    const url=tipo==='config'?'/api/backup?action=generate&tipo=config&_='+Date.now():'/api/backup?action=generate&tipo=completo&_='+Date.now();
    document.getElementById('backup-terminal').innerHTML+='<div>[INFO] URL: '+url+'</div>';
    document.getElementById('backup-terminal').innerHTML+='<div>[INFO] Tipo: '+(tipo==='completo'?'COMPLETO (puede tardar)' : 'CONFIG (rápido)')+'</div>';
    document.getElementById('backup-terminal').innerHTML+='<div>[INFO] Token: '+(token?'presente':'FALTA')+'</div>';
    let resp;
    try{
      const startTime = Date.now();
      resp=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
      const elapsed = Date.now() - startTime;
      document.getElementById('backup-terminal').innerHTML+='<div>[INFO] Tiempo: '+elapsed+'ms, Status: '+resp.status+'</div>';
    }catch(e){
      document.getElementById('backup-terminal').innerHTML+='<div style="color:red">[ERROR] Fetch falló: '+e.name+' - '+e.message+'</div>';
      throw e;
    }
    
    if(!resp.ok){
      const errData=await resp.json().catch(()=>({}));
      document.getElementById('backup-terminal').innerHTML+='<div style="color:red">[ERROR] '+ (errData.error||'Error '+resp.status) +'</div>';
      throw new Error(errData.error||'Error generando');
    }
    
    const data=await resp.json();
    if(cancelled)return;
    
    document.getElementById('backup-progress-bar').style.width='100%';
    document.getElementById('backup-progress-msg').textContent='Completado! Descargando...';
    document.getElementById('backup-progress-msg').style.color='var(--success)';
    document.getElementById('backup-terminal').innerHTML+='<div style="color:#00ff00;margin-top:8px">[OK] Backup completado</div>';
    
    // Paso 2: Descargar
    setTimeout(function(){
      document.getElementById('backup-terminal').innerHTML+='<div>[DESCARGANDO] Descargando archivo...</div>';
      (async function(){
        try{
        const dlUrl=`/api/backup?action=download&filename=${encodeURIComponent(data.filename)}`;
        const dlResp=await fetch(dlUrl,{headers:{Authorization:`Bearer ${token}`}});
        if(!dlResp.ok)throw new Error('Error descargando');
        
        const blob=await dlResp.blob();
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=data.filename;a.click();
        URL.revokeObjectURL(a.href);
        
        document.getElementById('backup-terminal').innerHTML+='<div style="color:#00ff00">[OK] Descarga completada!</div>';
        setTimeout(function(){
          closeM();
          toast('Backup descargado','success');
          cargarListaBackups();
        },1000);
      }catch(e){
        document.getElementById('backup-terminal').innerHTML+='<div style="color:red">[X] Error: '+e.message+'</div>';
        closeM();
        toast(e.message,'error');
      }
      })();
      btn.disabled=false;btn.textContent=label;
    },500);
    
    // Polling para progreso mientras genera
    pollInterval=setInterval(async()=>{
      try{
        const p=await fetch('/api/backup/progreso',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
        if(p.stage && p.stage!=='done'){
          const pct=Math.round((p.current/p.total)*100)||0;
          document.getElementById('backup-progress-bar').style.width=pct+'%';
          document.getElementById('backup-progress-msg').textContent=p.message||'Procesando...';
          const term=document.getElementById('backup-terminal');
          if(term && p.message){
            term.innerHTML+=`<div>→ ${p.message}</div>`;
            term.scrollTop=term.scrollHeight;
          }
        }
      }catch(_){}
    },800);
    
  }catch(e){
    if(cancelled)return;
    document.getElementById('backup-terminal').innerHTML+='<div style="color:red">[ERROR] '+e.message+'</div>';
    document.getElementById('backup-progress-msg').textContent='Error: '+e.message;
    document.getElementById('backup-progress-msg').style.color='var(--danger)';
    btn.disabled=false;btn.textContent=label;
    btn.onclick=function(){closeM()};
    btn.textContent='Cerrar';
  }
}

async function cargarListaBackups(){
  const loading=document.getElementById('lista-backups-loading');
  const none=document.getElementById('lista-backups-none');
  const body=document.getElementById('lista-backups-body');
  loading.style.display='block';none.style.display='none';body.style.display='none';
  try{
    const lista=await api('GET','/backup/lista');
    loading.style.display='none';
    if(!lista.length){none.style.display='block';return}
    body.style.display='flex';
    body.innerHTML=lista.map(b=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:13px;">
        <div>
          <div style="font-weight:500">${esc(b.nombre)}</div>
          <div style="color:var(--muted);font-size:11px">${(b.tamano/1024/1024).toFixed(2)} MB — ${fdate(b.fecha)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="descargarBackupLocal('${esc(b.nombre)}')">⬇</button>
          <button class="btn btn-danger btn-sm" onclick="restaurarBackupLocal('${esc(b.nombre)}')">♻️</button>
          <button class="btn btn-secondary btn-sm" onclick="eliminarBackup('${esc(b.nombre)}')">🗑️</button>
        </div>
      </div>`).join('');
  }catch(e){
    loading.style.display='none';
    none.style.display='block';none.textContent='Error: '+e.message;
  }
}

async function descargarBackupLocal(n){
  try{
    const token=localStorage.getItem('vd_t');
    const resp=await fetch('/api/backup/descargar/'+encodeURIComponent(n),{headers:{Authorization:`Bearer ${token}`}});
    if(!resp.ok)throw new Error('Error descargando');
    const blob=await resp.blob();
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=n;a.click();
    URL.revokeObjectURL(a.href);
  }catch(e){toast(e.message,'error')}
}

async function restaurarBackupLocal(n){
  if(!confirm('¿Restaurar el backup "'+n+'"?\n\nLos datos actuales serán reemplazados. Tu sesión no se verá afectada.'))return;
  const ok=document.getElementById('restore-ok');
  const err=document.getElementById('restore-err');
  ok.style.display='none';err.style.display='none';
  try{
    const token=localStorage.getItem('vd_t');
    const resp=await fetch('/api/backup/restore/local/'+encodeURIComponent(n),{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({})
    });
    const j=await resp.json();
    if(!resp.ok)throw new Error(j.error||'Error');
    ok.textContent='✓ Restauración completada correctamente';
    ok.style.display='block';
    setTimeout(()=>{ok.style.display='none'},5000);
  }catch(e){
    err.textContent='Error: '+e.message;
    err.style.display='block';
  }
}

async function restaurarBackup(){
  if(!restoreFile)return;
  const archivoARestaurar=restoreFile;
  const ok=document.getElementById('restore-ok');
  const err=document.getElementById('restore-err');
  ok.style.display='none';err.style.display='none';
  if(!confirm('¿Restaurar el backup "'+archivoARestaurar.name+'"?\n\nLos datos actuales serán reemplazados.'))return;
  try{
    const token=localStorage.getItem('vd_t');
    const form=new FormData();
    form.append('backup',archivoARestaurar);
    const resp=await fetch('/api/backup/restore',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
    const j=await resp.json();
    if(!resp.ok)throw new Error(j.error||'Error');
    ok.textContent='✓ Restauración completada correctamente';
    ok.style.display='block';
    restoreFile=null;
    document.getElementById('restore-file').value='';
    document.getElementById('restore-filename').style.display='none';
    document.getElementById('btn-restaurar').disabled=true;
    document.getElementById('btn-restaurar').style.opacity='0.5';
    await cargarListaBackups();
  }catch(e){
    err.textContent='Error: '+e.message;
    err.style.display='block';
  }
}

async function eliminarBackup(n){if(!confirm('¿Eliminar este backup?'))return;try{await api('DELETE',`/backup/${n}`);toast('Backup eliminado','success');await cargarListaBackups()}catch(e){toast(e.message,'error')}}

let backupPollingTimer=null;
async function generarBackupServidor(){
  const btn=event.target;
  const progDiv=$('backup-progress');
  btn.disabled=true;
  btn.textContent='Generando...';
  try{
    const r=await api('POST','/backup?action=generate&tipo=completo');
    if(progDiv)progDiv.style.display='block';
    let attempts=0;
    const poll=setInterval(async()=>{
      attempts++;
      try{
        const p=await api('GET','/backup/progreso');
        if(progDiv){
          progDiv.innerHTML=`<div style="font-size:12px;color:var(--accent)">${p.message||p.stage||'Generando...'} ${p.total?Math.round(p.current*100/p.total)+'%':''}</div>
            <div style="background:var(--surface2);border-radius:4px;height:6px;margin-top:4px;overflow:hidden">
              <div style="background:var(--accent);height:100%;width:${p.total?Math.round(p.current*100/p.total):0}%"></div>
            </div>`;
        }
        if(p.stage==='done'||!p.total){
          clearInterval(poll);
          if(progDiv)progDiv.style.display='none';
          toast('Backup generado','success');
          cargarListaBackups();
        }
        if(attempts>300){
          clearInterval(poll);
          if(progDiv)progDiv.style.display='none';
          toast('Tiempo de espera agotado','error');
        }
      }catch(e){clearInterval(poll)}
    },1000);
  }catch(e){toast(e.message,'error')}
  btn.disabled=false;
  btn.textContent='➕ Generar';
}
