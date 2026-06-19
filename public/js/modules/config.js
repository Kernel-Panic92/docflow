// config.js - Configuration view with tabs (general, imap, smtp, horas, areas, seguridad, backups, cron, actualizar)

let cfgTabs='imap';

async function rConfig(){
  const cfg=await api('GET','/configuracion');
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Configuración</div><div class="page-sub">Parámetros del sistema</div></div></div>
    
    <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">
      <button class="fb${cfgTabs==='general'?' active':''}" onclick="cfgTabs='general';rConfig()">🏢 General</button>
      <button class="fb${cfgTabs==='imap'?' active':''}" onclick="cfgTabs='imap';rConfig()">📧 IMAP</button>
      <button class="fb${cfgTabs==='smtp'?' active':''}" onclick="cfgTabs='smtp';rConfig()">📤 SMTP</button>
      <button class="fb${cfgTabs==='horas'?' active':''}" onclick="cfgTabs='horas';rConfig()">⏱️ Tiempos</button>
      <button class="fb${cfgTabs==='areas'?' active':''}" onclick="cfgTabs='areas';rConfig()">🏠 Áreas</button>
      <button class="fb${cfgTabs==='seguridad'?' active':''}" onclick="cfgTabs='seguridad';rConfig()">🔒 Seguridad</button>
      <button class="fb${cfgTabs==='backups'?' active':''}" onclick="cfgTabs='backups';rConfig()">💾 Backups</button>
      <button class="fb${cfgTabs==='cron'?' active':''}" onclick="cfgTabs='cron';rConfig()">⏰ Tareas</button>
      <button class="fb${cfgTabs==='actualizar'?' active':''}" onclick="cfgTabs='actualizar';rConfig()">🚀 Actualizar</button>
    </div>
    
    <div id="cfg-content">Cargando...</div>
  `;
  await renderCfgTab(cfg);
}

async function renderCfgTab(cfg){
  const c=$('cfg-content');
  if(!c)return;
  
  if(cfgTabs==='general'){
    const logoPreview=cfg.empresa_logo?.valor?'<img src="'+cfg.empresa_logo.valor+'" style="max-height:60px;max-width:200px;border-radius:8px;margin-top:12px"/>':'<div style="width:120px;height:60px;background:var(--surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px;margin-top:12px">Sin logo</div>';
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:20px">Personalización</div>
        <div class="form-grid">
          <div class="field"><label>NOMBRE DE LA EMPRESA</label><input type="text" id="cfg-empresa-nombre" value="${esc(cfg.empresa_nombre?.valor||'')}" placeholder="Mi Empresa S.A.S."/></div>
          <div class="field"><label>NIT DE LA EMPRESA</label><input type="text" id="cfg-empresa-nit" value="${esc(cfg.empresa_nit?.valor||'')}" placeholder="901234567-1"/></div>
        </div>
        <div class="field"><label>LOGO DE LA EMPRESA (URL o subir)</label>
          <input type="text" id="cfg-empresa-logo-url" value="${esc(cfg.empresa_logo?.valor||'')}" placeholder="https://ejemplo.com/logo.png"/>
          <div style="margin-top:12px">
            <input type="file" id="cfg-empresa-logo-file" accept="image/*" style="display:none" onchange="subirLogoEmpresa(this)"/>
            <button class="btn btn-secondary btn-sm" onclick="$('cfg-empresa-logo-file').click()">📤 Subir imagen</button>
            <button class="btn btn-secondary btn-sm" onclick="previsualizarLogoUrl()" style="margin-left:8px">👁️ Previsualizar</button>
          </div>
          <div id="cfg-logo-preview" style="margin-top:12px">${logoPreview}</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('general')">💾 Guardar</button>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:12px">Nombre de la aplicación</div>
        <div class="field"><label>NOMBRE</label><input type="text" id="cfg-app-nombre" value="${esc(cfg.app_nombre?.valor||'DocFlow')}" placeholder="DocFlow"/></div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-primary" onclick="guardarCfg('general')">💾 Guardar</button>
        </div>
      </div>
    `;
  }
  else if(cfgTabs==='imap'){
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Conexión IMAP</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Configuración para recibir facturas por correo electrónico</div></div>
          <span class="badge ${cfg.imap_host?.valor?'b-aprobada':'b-revision'}">${cfg.imap_host?.valor?'Configurado':'Sin configurar'}</span>
        </div>
        <div class="form-grid">
          <div class="field"><label>HOST IMAP</label><input type="text" id="cfg-imap-host" value="${esc(cfg.imap_host?.valor||'')}" placeholder="mail.dominio.com"/></div>
          <div class="field"><label>PUERTO</label><input type="number" id="cfg-imap-port" value="${esc(cfg.imap_port?.valor||'993')}" placeholder="993"/></div>
          <div class="field"><label>USUARIO (EMAIL)</label><input type="email" id="cfg-imap-user" value="${esc(cfg.imap_user?.valor||'')}" placeholder="facturas@dominio.com"/></div>
          <div class="field"><label>CONTRASEÑA</label><input type="password" id="cfg-imap-pass" value="${esc(cfg.imap_password?.valor||'')}" placeholder="••••••••"/></div>
          <div class="field"><label>CARPETA</label><input type="text" id="cfg-imap-folder" value="${esc(cfg.imap_folder?.valor||'INBOX')}" placeholder="INBOX"/></div>
          <div class="field"><label>USAR TLS/SSL</label>
            <select id="cfg-imap-tls">
              <option value="true" ${cfg.imap_tls?.valor!=='false'?'selected':''}>Sí (puerto 993)</option>
              <option value="false" ${cfg.imap_tls?.valor==='false'?'selected':''}>No (puerto 143)</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('imap')">💾 Guardar</button>
          <button class="btn btn-secondary" onclick="testImap()">🧪 Probar conexión</button>
        </div>
        <div id="cfg-test-imap" style="margin-top:12px"></div>
      </div>
      
      <div style="background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.2);border-radius:12px;padding:16px">
        <div style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:8px">ℹ️ Nota sobre configuración IMAP</div>
        <div style="font-size:13px;color:var(--muted)">Esta configuración se usa para sincronizar automáticamente las facturas electrónicas recibidas por correo. El sistema buscará adjuntos PDF y XML en los mensajes no leídos de la carpeta configurada.</div>
      </div>
    `;
  }
  else if(cfgTabs==='smtp'){
    const heredar = cfg.smtp_heredar?.valor === '1' || cfg.smtp_heredar?.valor === 'true';
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px;max-width:600px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Servidor SMTP</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Configuración para enviar notificaciones por correo</div></div>
          <span class="badge ${cfg.smtp_host?.valor?'b-aprobada':'b-revision'}">${cfg.smtp_host?.valor?'Configurado':'Sin configurar'}</span>
        </div>
        <div style="margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;">
            <input type="checkbox" id="cfg-smtp-heredar" ${heredar?'checked':''} onchange="toggleHeredarSmtp()">
            Heredar configuración del Launcher
          </label>
          <div id="cfg-launcher-url-wrap" style="margin-top:8px;${heredar?'':'display:none;'}">
            <label style="font-size:12px;color:var(--muted);">URL del Launcher</label>
            <input id="cfg-launcher-url" value="${esc(cfg.launcher_url?.valor||'http://localhost:3002')}" style="width:100%;padding:7px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;">
          </div>
        </div>
        <div id="cfg-smtp-local" style="${heredar?'opacity:0.5;pointer-events:none;':''}">
          <div class="form-grid">
            <div class="field"><label>HOST SMTP</label><input type="text" id="cfg-smtp-host" value="${esc(cfg.smtp_host?.valor||'')}" placeholder="smtp.dominio.com"/></div>
            <div class="field"><label>PUERTO</label><input type="number" id="cfg-smtp-port" value="${esc(cfg.smtp_port?.valor||'587')}" placeholder="587"/></div>
            <div class="field"><label>USUARIO</label><input type="text" id="cfg-smtp-user" value="${esc(cfg.smtp_user?.valor||'')}" placeholder="notificaciones@dominio.com"/></div>
            <div class="field"><label>CONTRASEÑA</label><input type="password" id="cfg-smtp-pass" value="${esc(cfg.smtp_password?.valor||'')}" placeholder="••••••••"/></div>
            <div class="field"><label>REMITENTE (FROM)</label><input type="text" id="cfg-smtp-from" value="${esc(cfg.smtp_from?.valor||'')}" placeholder="notificaciones@dominio.com"/></div>
            <div class="field">
              <label>ENCRIPTACIÓN</label>
              <select id="cfg-smtp-secure">
                <option value="false" ${cfg.smtp_secure?.valor!=='true'?'selected':''}>STARTTLS (puerto 587)</option>
                <option value="true" ${cfg.smtp_secure?.valor==='true'?'selected':''}>SSL (puerto 465)</option>
              </select>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('smtp')">💾 Guardar</button>
          <button class="btn btn-secondary" onclick="testSmtp()">🧪 Probar conexión</button>
        </div>
        <div id="cfg-test-smtp" style="margin-top:12px"></div>
      </div>
      
      <div style="background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.2);border-radius:12px;padding:16px">
        <div style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:8px">ℹ️ Nota sobre SMTP</div>
        <div style="font-size:13px;color:var(--muted)">El servidor SMTP se usa para enviar notificaciones a los usuarios. Si activas "Heredar del Launcher", usará la config SMTP del orquestador central (puerto 3002).</div>
      </div>
    `;
  }
  else if(cfgTabs==='horas'){
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:20px">Tiempos y escalaciones</div>
        <div class="form-grid">
          <div class="field"><label>HORAS PARA REVISIÓN</label><input type="number" id="cfg-horas-revision" value="${esc(cfg.horas_limite_revision?.valor||'24')}" placeholder="24"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Horas antes de escalar al jefe de área</div></div>
          <div class="field"><label>HORAS ESCALACIÓN NIVEL 2</label><input type="number" id="cfg-horas-nivel2" value="${esc(cfg.horas_escalacion_nivel2?.valor||'48')}" placeholder="48"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Horas antes de escalar a gerencia</div></div>
          <div class="field"><label>HORAS DIAN TÁCITA</label><input type="number" id="cfg-horas-dian" value="${esc(cfg.horas_dian_tacita?.valor||'48')}" placeholder="48"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Horas para aceptación tácita DIAN</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('horas')">💾 Guardar</button>
        </div>
      </div>
    `;
  }
  else if(cfgTabs==='areas'){
    if(!S.usuarios)S.usuarios=await api('GET','/usuarios');
    const areas=await api('GET','/areas');
    const users=S.usuarios.filter(u=>u.rol==='jefe'||u.rol==='admin');
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Áreas</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Gestión de áreas organizacionales</div></div>
          <button class="btn btn-primary btn-sm" onclick="showM('Nueva área','<div class=form-grid><div class=field full><label>NOMBRE</label><input type=text id=new-area-nombre placeholder=Nombre del área/></div><div class=field><label>JEFE (opcional)</label><select id=new-area-jefe><option value=>— Sin jefe —</option>'+users.map(u=>'<option value='+u.id+'>'+esc(u.nombre)+'</option>').join('')+'</select></div><div class=field><label>EMAIL</label><input type=email id=new-area-email placeholder=area@empresa.com/></div></div><div class=modal-footer><button class=btn btn-primary onclick=crearArea()>Crear área</button></div>')">➕ Nueva área</button>
        </div>
        <div style="display:grid;gap:12px">${areas.length?areas.map(a=>`<div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface2);border-radius:10px">
          <div style="flex:1"><div style="font-weight:600">${esc(a.nombre)}</div><div style="font-size:12px;color:var(--muted)">${a.jefe_nombre?'Jefe: '+esc(a.jefe_nombre):'Sin jefe asignado'} · ${a.total_usuarios||0} usuario(s)</div></div>
          <button class="btn btn-secondary btn-sm" onclick="editarArea('${a.id}','${esc(a.nombre)}','${a.jefe_id||''}','${esc(a.email||'')}')">✏️</button>
        </div>`).join(''):'<div style="text-align:center;padding:40px;color:var(--muted)">No hay áreas configuradas</div>'}</div>
      </div>
    `;
  }
  else if(cfgTabs==='actualizar'){
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="font-family:var(--font-head);font-size:16px;font-weight:700;margin-bottom:20px">Actualización del sistema</div>
        
        <div id="update-status" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface2);border-radius:10px;margin-bottom:12px">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--accent)"></div>
            <div style="flex:1">
              <div style="font-weight:600" id="update-version">Versión: ${cfg.version||'—'}</div>
              <div style="font-size:12px;color:var(--muted)" id="update-commit">Commit: ${cfg.commit||'—'}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="checkUpdates()" id="btn-check-update">🔍 Verificar</button>
          </div>
          
          <div id="update-available" style="display:none;padding:16px;background:rgba(79,190,150,.1);border:1px solid rgba(79,190,150,.3);border-radius:10px;margin-bottom:12px">
            <div style="font-weight:600;color:var(--success);margin-bottom:8px">🎉 Nueva versión disponible</div>
            <div id="update-changes" style="font-size:13px;color:var(--text);margin-bottom:12px"></div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary" onclick="ejecutarActualizacion()" id="btn-update-now">🚀 Actualizar ahora</button>
            </div>
          </div>
          
          <div id="update-no-changes" style="display:none;padding:14px;background:var(--surface2);border-radius:10px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:8px;color:var(--success);font-weight:500">✓ Sistema actualizado</div>
          </div>
        </div>
        
        <div style="margin-top:20px">
          <div style="font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px">Registro de actualizaciones</div>
          <div id="update-log" style="background:#000;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;color:#0f0;max-height:200px;overflow-y:auto;white-space:pre-wrap">Cargando...</div>
        </div>
      </div>
    `;
    
    cargarStatusActualizacion();
    cargarLogActualizacion();
  }
  else if(cfgTabs==='seguridad'){
    const r=await api('GET','/configuracion/seguridad');
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Protección Fail2ban</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Protección contra ataques de fuerza bruta</div></div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge ${r.fail2ban?.installed?'b-aprobada':'b-revision'}">${r.fail2ban?.installed?'Instalado':'No instalado'}</span>
            ${r.fail2ban?.installed?'<span class="badge '+(r.fail2ban?.active?'b-aprobada':'b-revision')+'">'+(r.fail2ban?.active?'Activo':'Inactivo')+'</span>':''}
          </div>
        </div>
        <div class="form-grid">
          <div class="field"><label>HABILITAR FAIL2BAN</label>
            <select id="cfg-fail2ban-enabled">
              <option value="true" ${r.config?.fail2ban_enabled==='true'?'selected':''}>Sí</option>
              <option value="false" ${r.config?.fail2ban_enabled!=='true'?'selected':''}>No</option>
            </select>
          </div>
          <div class="field"><label>TIEMPO DE BAN (segundos)</label><input type="number" id="cfg-fail2ban-bantime" value="${r.config?.fail2ban_bantime||'3600'}" placeholder="3600"/></div>
          <div class="field"><label>VENTANA DE TIEMPO (segundos)</label><input type="number" id="cfg-fail2ban-findtime" value="${r.config?.fail2ban_findtime||'600'}" placeholder="600"/></div>
          <div class="field"><label>MÁXIMO REINTENTOS</label><input type="number" id="cfg-fail2ban-maxretry" value="${r.config?.fail2ban_maxretry||'10'}" placeholder="10"/></div>
        </div>
        ${r.fail2ban?.installed?'<div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-secondary btn-sm" onclick="f2bAction(\'start\')">▶ Iniciar</button><button class="btn btn-secondary btn-sm" onclick="f2bAction(\'stop\')">⏹ Detener</button><button class="btn btn-secondary btn-sm" onclick="f2bAction(\'restart\')">↻ Reiniciar</button></div>':''}
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('seguridad')">💾 Guardar</button>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Rate Limiting</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Límite de peticiones por IP</div></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>VENTANA DE TIEMPO (segundos)</label><input type="number" id="cfg-rate-window" value="${r.config?.rate_limit_window||'900'}" placeholder="900"/></div>
          <div class="field"><label>MÁXIMO PETICIONES</label><input type="number" id="cfg-rate-max" value="${r.config?.rate_limit_max||'100'}" placeholder="100"/></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('seguridad')">💾 Guardar</button>
        </div>
      </div>
    `;
  }
  else if(cfgTabs==='backups'){
    const r=await api('GET','/configuracion/backups-auto');
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Backups Automáticos</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Backups locales siempre se hacen. NAS es opcional como respaldo adicional.</div></div>
          <span class="badge ${r.config?.backup_auto_enabled==='true'?'b-aprobada':'b-revision'}">${r.config?.backup_auto_enabled==='true'?'Activo':'Inactivo'}</span>
        </div>
        <div class="form-grid">
          <div class="field"><label>HABILITAR BACKUPS AUTOMÁTICOS</label>
            <select id="cfg-backup-auto-enabled">
              <option value="true" ${r.config?.backup_auto_enabled==='true'?'selected':''}>Sí</option>
              <option value="false" ${r.config?.backup_auto_enabled!=='true'?'selected':''}>No</option>
            </select>
          </div>
          <div class="field"><label>FRECUENCIA (cron)</label><input type="text" id="cfg-backup-auto-cron" value="${r.config?.backup_auto_cron||'0 2 * * *'}" placeholder="0 2 * * *"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Formato: minuto hora día mes díaSemana. Ej: "0 2 * * *" = diario a las 2am</div></div>
          <div class="field"><label>RETENCIÓN LOCAL (días)</label><input type="number" id="cfg-backup-auto-retention" value="${r.config?.backup_auto_retention||'7'}" placeholder="7"/><div style="font-size:11px;color:var(--success);margin-top:4px">✓ Backup local: ~/backups/docflow</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('backups')">💾 Guardar</button>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Backup en NAS (opcional)</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Copia adicional en servidor de red</div></div>
          <span class="badge ${r.config?.backup_auto_type==='smb'?'b-aprobada':'b-revision'}">${r.config?.backup_auto_type==='smb'?'Configurado':'No configurado'}</span>
        </div>
        <div class="form-grid">
          <div class="field"><label>TIPO DE CONEXIÓN</label>
            <select id="cfg-backup-auto-type" onchange="toggleNasCreds()">
              <option value="local" ${r.config?.backup_auto_type!=='smb'?'selected':''}>No usar NAS</option>
              <option value="smb" ${r.config?.backup_auto_type==='smb'?'selected':''}>SMB/CIFS (Windows/NAS)</option>
            </select>
          </div>
          <div class="field full" id="cfg-nas-path-wrap" style="display:${r.config?.backup_auto_type==='smb'?'block':'none'}"><label>RUTA COMPARTIDA</label><input type="text" id="cfg-backup-auto-path" value="${r.config?.backup_auto_path||''}" placeholder="//192.168.0.10/nas"/></div>
          <div class="field full" id="cfg-nas-host-wrap" style="display:${r.config?.backup_auto_type==='smb'?'block':'none'}"><label>SERVIDOR SMB</label><input type="text" id="cfg-backup-auto-host" value="${r.config?.backup_auto_host||''}" placeholder="//192.168.1.100/backup"/></div>
          <div class="field" id="cfg-nas-user-wrap" style="display:${r.config?.backup_auto_type==='smb'?'block':'none'}"><label>USUARIO</label><input type="text" id="cfg-backup-auto-user" value="${r.config?.backup_auto_user||''}" placeholder="admin"/></div>
          <div class="field" id="cfg-nas-pass-wrap" style="display:${r.config?.backup_auto_type==='smb'?'block':'none'}"><label>CONTRASEÑA</label><input type="password" id="cfg-backup-auto-pass" value="${r.config?.backup_auto_pass||''}" placeholder="••••••••"/></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('backups')">💾 Guardar NAS</button>
          <button class="btn btn-secondary" id="cfg-nas-test-btn" style="display:${r.config?.backup_auto_type==='smb'?'inline-flex':'none'}" onclick="testBackupPath()">🧪 Probar conexión</button>
        </div>
      </div>
    `;
  }
  else if(cfgTabs==='cron'){
    const r=await api('GET','/configuracion/cron');
    c.innerHTML=`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div><div style="font-family:var(--font-head);font-size:16px;font-weight:700">Tareas Programadas</div><div style="font-size:13px;color:var(--muted);margin-top:4px">Configura la frecuencia de las tareas automáticas</div></div>
        </div>
        <div class="form-grid">
          <div class="field full"><label>SYNC CORREO IMAP</label><input type="text" id="cfg-cron-imap" value="${r.config?.cron_imap||'*/15 * * * *'}" placeholder="*/15 * * * *"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Ej: "*/15 * * * *" = cada 15 minutos</div></div>
          <div class="field full"><label>ESCALACIONES</label><input type="text" id="cfg-cron-escalaciones" value="${r.config?.cron_escalaciones||'0 * * * *'}" placeholder="0 * * * *"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Ej: "0 * * * *" = cada hora</div></div>
          <div class="field full"><label>VERIFICACIÓN DIAN TÁCITA</label><input type="text" id="cfg-cron-dian" value="${r.config?.cron_dian||'0 6 * * *'}" placeholder="0 6 * * *"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Ej: "0 6 * * *" = diario a las 6am</div></div>
          <div class="field full"><label>NOTIFICACIONES</label><input type="text" id="cfg-cron-notificaciones" value="${r.config?.cron_notificaciones||'0 8 * * *'}" placeholder="0 8 * * *"/><div style="font-size:11px;color:var(--muted);margin-top:4px">Ej: "0 8 * * *" = diario a las 8am</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="guardarCfg('cron')">💾 Guardar</button>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px">
        <div style="font-family:var(--font-head);font-size:14px;font-weight:700;margin-bottom:12px">CRON activo</div>
        <div style="background:#000;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;color:#0f0;max-height:150px;overflow-y:auto;white-space:pre-wrap">${r.crontab?.join('\n')||'(vacío)'}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="verCronLogs()">📋 Ver logs</button>
      </div>
    `;
  }
}

async function guardarCfg(tab){
  const data={};
  if(tab==='imap'){
    data.imap_host=$('cfg-imap-host')?.value?.trim()||'';
    data.imap_port=$('cfg-imap-port')?.value?.trim()||'993';
    data.imap_user=$('cfg-imap-user')?.value?.trim()||'';
    data.imap_password=$('cfg-imap-pass')?.value||'';
    data.imap_folder=$('cfg-imap-folder')?.value?.trim()||'INBOX';
    data.imap_tls=$('cfg-imap-tls')?.value||'true';
  }else if(tab==='smtp'){
    data.smtp_heredar=$('cfg-smtp-heredar')?.checked ? '1' : '0';
    data.launcher_url=$('cfg-launcher-url')?.value?.trim()||'http://localhost:3002';
    if (data.smtp_heredar !== '1') {
      data.smtp_host=$('cfg-smtp-host')?.value?.trim()||'';
      data.smtp_port=$('cfg-smtp-port')?.value?.trim()||'587';
      data.smtp_user=$('cfg-smtp-user')?.value?.trim()||'';
      data.smtp_password=$('cfg-smtp-pass')?.value||'';
      data.smtp_from=$('cfg-smtp-from')?.value?.trim()||'';
      data.smtp_secure=$('cfg-smtp-secure')?.value||'false';
    }
  }else if(tab==='horas'){
    data.horas_limite_revision=$('cfg-horas-revision')?.value?.trim()||'24';
    data.horas_escalacion_nivel2=$('cfg-horas-nivel2')?.value?.trim()||'48';
    data.horas_dian_tacita=$('cfg-horas-dian')?.value?.trim()||'48';
  }else if(tab==='seguridad'){
    data.fail2ban_enabled=$('cfg-fail2ban-enabled')?.value||'false';
    data.fail2ban_bantime=$('cfg-fail2ban-bantime')?.value?.trim()||'3600';
    data.fail2ban_findtime=$('cfg-fail2ban-findtime')?.value?.trim()||'600';
    data.fail2ban_maxretry=$('cfg-fail2ban-maxretry')?.value?.trim()||'10';
    data.rate_limit_window=$('cfg-rate-window')?.value?.trim()||'900';
    data.rate_limit_max=$('cfg-rate-max')?.value?.trim()||'100';
    const r=await api('PUT','/configuracion/seguridad',data);
    toast('Configuración de seguridad guardada','success');
    rConfig();
    return;
  }else if(tab==='backups'){
    data.backup_auto_enabled=$('cfg-backup-auto-enabled')?.value||'false';
    data.backup_auto_cron=$('cfg-backup-auto-cron')?.value?.trim()||'';
    data.backup_auto_path=$('cfg-backup-auto-path')?.value?.trim()||'$HOME/backups/docflow';
    data.backup_auto_type=$('cfg-backup-auto-type')?.value||'local';
    data.backup_auto_host=$('cfg-backup-auto-host')?.value?.trim()||'';
    data.backup_auto_user=$('cfg-backup-auto-user')?.value?.trim()||'';
    data.backup_auto_pass=$('cfg-backup-auto-pass')?.value||'';
    data.backup_auto_retention=$('cfg-backup-auto-retention')?.value?.trim()||'7';
    const r=await api('PUT','/configuracion/backups-auto',data);
    toast('Configuración de backups guardada','success');
    rConfig();
    return;
  }else if(tab==='cron'){
    const r=await api('PUT','/configuracion/cron',{
      cron_imap:$('cfg-cron-imap')?.value?.trim()||'',
      cron_escalaciones:$('cfg-cron-escalaciones')?.value?.trim()||'',
      cron_dian:$('cfg-cron-dian')?.value?.trim()||'',
      cron_notificaciones:$('cfg-cron-notificaciones')?.value?.trim()||''
    });
    toast('Tareas CRON actualizadas','success');
    rConfig();
    return;
  }else if(tab==='general'){
    data.empresa_nombre=$('cfg-empresa-nombre')?.value?.trim()||'';
    data.empresa_nit=$('cfg-empresa-nit')?.value?.trim()||'';
    data.empresa_logo=$('cfg-empresa-logo-url')?.value?.trim()||'';
    data.app_nombre=$('cfg-app-nombre')?.value?.trim()||'DocFlow';
    const r=await api('PUT','/configuracion',data);
    toast('Configuración guardada','success');
    if(data.app_nombre||data.empresa_logo){
      document.title=data.app_nombre||'DocFlow';
    }
    rConfig();
    return;
  }
  try{
    await api('PUT','/configuracion',data);
    toast('Configuración guardada','success');
    if(tab==='horas'){rConfig()}
  }catch(e){toast(e.message,'error')}
}

async function f2bAction(action){
  try{
    const r=await api('POST','/configuracion/seguridad/fail2ban/action',{action});
    toast(r.message||'Acción ejecutada','success');
    rConfig();
  }catch(e){toast(e.message,'error')}
}

async function testBackupPath(){
  const path=$('cfg-backup-auto-path')?.value?.trim();
  const type=$('cfg-backup-auto-type')?.value;
  const host=$('cfg-backup-auto-host')?.value?.trim();
  const user=$('cfg-backup-auto-user')?.value?.trim();
  const pass=$('cfg-backup-auto-pass')?.value;
  
  console.log('[DEBUG] testBackupPath:', { path, type, host, user, pass: pass ? '***' : '(empty)' });
  
  if(!path && type === 'smb'){toast('Ingresa la ruta','error');return}
  const data={path: path || '', type};
  if(type==='smb'){
    data.host=host;
    data.user=user;
    data.pass=pass;
  }
  try{
    console.log('[DEBUG] Sending:', JSON.stringify(data));
    const r=await api('POST','/configuracion/backups-auto/test',data);
    toast('Conexión exitosa','success');
  }catch(e){toast(e.message,'error')}
}

function toggleNasCreds(){
  const type=$('cfg-backup-auto-type')?.value;
  const wrap=['cfg-nas-path-wrap','cfg-nas-host-wrap','cfg-nas-user-wrap','cfg-nas-pass-wrap'];
  wrap.forEach(id=>{const el=$(id);if(el)el.style.display=type==='smb'?'block':'none'});
  const testBtn=$('cfg-nas-test-btn');
  if(testBtn)testBtn.style.display=type==='smb'?'inline-flex':'none';
}

async function ejecutarBackupAhora(){
  if(!confirm('¿Ejecutar backup ahora?'))return;
  try{
    const r=await api('POST','/configuracion/backups-auto/now');
    if(r.path){
      toast(`Backup guardado en: ${r.path}`,'success');
    }else{
      toast(r.message||'Backup completado','success');
    }
  }catch(e){toast(e.message,'error')}
}

async function verCronLogs(){
  try{
    const r=await api('GET','/configuracion/cron/logs');
    showM('Logs de Tareas',`<div style="background:#000;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;color:#0f0;max-height:400px;overflow-y:auto;white-space:pre-wrap">${r.log||'(sin logs)'}</div>`,600);
  }catch(e){toast(e.message,'error')}
}

async function subirLogoEmpresa(input){
  const file=input?.files?.[0];
  if(!file)return;
  const fd=new FormData();
  fd.append('logo',file);
  try{
    const r=await api('POST','/configuracion/logo',fd,true);
    if(r.url){
      $('cfg-empresa-logo-url').value=r.url;
      $('cfg-logo-preview').innerHTML='<img src="'+r.url+'" style="max-height:60px;max-width:200px;border-radius:8px;margin-top:12px"/>';
      toast('Logo subido','success');
    }
  }catch(e){toast(e.message,'error')}
}

function previsualizarLogoUrl(){
  const url=$('cfg-empresa-logo-url')?.value?.trim();
  if(url){
    $('cfg-logo-preview').innerHTML='<img src="'+esc(url)+'" style="max-height:60px;max-width:200px;border-radius:8px;margin-top:12px" onerror="this.style.display=\'none\'"/>';
  }
}

async function testImap(){
  const host=$('cfg-imap-host')?.value?.trim();
  const port=$('cfg-imap-port')?.value?.trim();
  const user=$('cfg-imap-user')?.value?.trim();
  const pass=$('cfg-imap-pass')?.value;
  const tls=$('cfg-imap-tls')?.value;
  const el=$('cfg-test-imap');
  if(!host||!user||!pass){el.innerHTML='<span style="color:var(--danger)">Completa host, usuario y contraseña</span>';return}
  el.innerHTML='<span style="color:var(--muted)">Probando conexión...</span>';
  try{
    const r=await api('GET',`/configuracion/imap/test?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&secure=${tls}`);
    el.innerHTML='<span style="color:var(--success)">✓ Conexión exitosa</span>';
  }catch(e){
    el.innerHTML=`<span style="color:var(--danger)">✗ Error: ${esc(e.message)}</span>`;
  }
}

async function testSmtp(){
  const heredar=$('cfg-smtp-heredar')?.checked;
  const el=$('cfg-test-smtp');
  if (heredar) {
    const launcherUrl=$('cfg-launcher-url')?.value?.trim()||'http://localhost:3002';
    el.innerHTML='<span style="color:var(--muted)">Probando conexión con Launcher...</span>';
    try{
      const r=await api('GET',`/configuracion/smtp/test?inherit=1&launcher_url=${encodeURIComponent(launcherUrl)}`);
      el.innerHTML='<span style="color:var(--success)">✓ Configuración SMTP correcta (heredada del Launcher)</span>';
    }catch(e){
      el.innerHTML=`<span style="color:var(--danger)">✗ Error: ${esc(e.message)}</span>`;
    }
    return;
  }
  const host=$('cfg-smtp-host')?.value?.trim();
  const port=$('cfg-smtp-port')?.value?.trim();
  const user=$('cfg-smtp-user')?.value?.trim();
  const pass=$('cfg-smtp-pass')?.value;
  const from=$('cfg-smtp-from')?.value?.trim();
  const secure=$('cfg-smtp-secure')?.value;
  if(!host||!user||!pass){el.innerHTML='<span style="color:var(--danger)">Completa host, usuario y contraseña</span>';return}
  el.innerHTML='<span style="color:var(--muted)">Probando conexión...</span>';
  try{
    const r=await api('GET',`/configuracion/smtp/test?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&from=${encodeURIComponent(from)}&secure=${encodeURIComponent(secure)}`);
    el.innerHTML='<span style="color:var(--success)">✓ Configuración SMTP correcta</span>';
  }catch(e){
    el.innerHTML=`<span style="color:var(--danger)">✗ Error: ${esc(e.message)}</span>`;
  }
}

function toggleHeredarSmtp() {
  const checked = $('cfg-smtp-heredar').checked;
  const wrap = $('cfg-launcher-url-wrap');
  if (wrap) wrap.style.display = checked ? '' : 'none';
  const local = $('cfg-smtp-local');
  if (local) { local.style.opacity = checked ? '0.5' : ''; local.style.pointerEvents = checked ? 'none' : ''; }
}

// ─── ACTUALIZACIÓN ─────────────────────────────────────────────────────────
let updatePolling=null;

async function cargarStatusActualizacion(){
  try{
    const r=await api('GET','/configuracion/updater/status');
    if(r.ok){
      $('update-version').textContent=`Versión: ${r.commit||'—'}`;
      $('update-commit').textContent=`Rama: ${r.branch||'—'} | Repo: ${r.remote||'—'}`;
      if(r.lastUpdate){
        const fecha=new Date(r.lastUpdate).toLocaleString('es-CO');
        $('update-commit').textContent+=` | Última update: ${fecha}`;
      }
    }
  }catch(e){console.log('Error cargando status:',e.message)}
}

async function cargarLogActualizacion(){
  try{
    const r=await api('GET','/configuracion/updater/logs');
    const logEl=$('update-log');
    if(logEl)logEl.textContent=r.log||'Sin registros';
    logEl.scrollTop=logEl.scrollHeight;
  }catch(e){console.log('Error cargando logs:',e.message)}
}

async function checkUpdates(){
  const btn=$('btn-check-update');
  btn.disabled=true;
  btn.textContent='Verificando...';
  try{
    const r=await api('POST','/configuracion/updater/check');
    const avEl=$('update-available');
    const ncEl=$('update-no-changes');
    if(r.hasUpdates){
      avEl.style.display='block';
      ncEl.style.display='none';
      const changesEl=$('update-changes');
      changesEl.innerHTML=`<strong>${r.commitsBehind}</strong> actualización(es) pendiente(s)<br>`+
        `<div style="margin-left:12px;margin-top:8px;color:#0f0">🔄 Local: ${r.currentCommit} → Remote: ${r.remoteCommit}</div>`+
        (r.changes||[]).map(c=>`<div style="margin-left:12px;margin-top:4px">• ${esc(c)}</div>`).join('');
    }else{
      avEl.style.display='none';
      ncEl.style.display='block';
    }
  }catch(e){
    toast('Error verificando: '+e.message,'error');
  }finally{
    btn.disabled=false;
    btn.textContent='🔍 Verificar';
  }
}

async function ejecutarActualizacion(){
  if(!confirm('¿Actualizar el sistema? El servicio se reiniciará automáticamente.'))return;
  const btn=$('btn-update-now');
  btn.disabled=true;
  btn.textContent='Actualizando...';
  try{
    const r=await api('POST','/configuracion/updater/update');
    if(r.ok){
      toast('Actualización iniciada. El sistema se reiniciará.','success');
      $('update-available').style.display='none';
      $('update-no-changes').style.display='block';
      
      updatePolling=setInterval(async()=>{
        await cargarLogActualizacion();
        try{
          const status=await api('GET','/configuracion/updater/status');
          if(status&&status.updaterLog?.includes('COMPLETADA')){
            clearInterval(updatePolling);
            toast('Actualización completada, reiniciando...','success');
            try{
              await api('POST','/configuracion/updater/restart');
            }catch(e){}
            // Esperar hasta que el servidor responda
            let intentos=0;
            const esperarServidor=setInterval(async()=>{
              try{
                await fetch('/api/health');
                clearInterval(esperarServidor);
                toast('Servicio reiniciado','success');
                window.location.reload();
              }catch(e){
                intentos++;
                if(intentos>60){
                  clearInterval(esperarServidor);
                  window.location.reload();
                }
              }
            },2000);
          }
        }catch(e){}
      },3000);
    }else{
      toast('Error: '+r.error,'error');
    }
    await cargarLogActualizacion();
  }catch(e){
    clearInterval(updatePolling);
    toast('Error: '+e.message,'error');
  }finally{
    btn.disabled=false;
    btn.textContent='🚀 Actualizar ahora';
  }
}
