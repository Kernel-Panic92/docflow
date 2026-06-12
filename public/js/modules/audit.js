// audit.js - Audit log views for DocFlow

let auditTab='accesos';
async function rAudit(){
  const [stats, usuarios] = await Promise.all([
    api('GET','/audit/estadisticas'),
    api('GET','/usuarios')
  ]);
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Auditoría</div><div class="page-sub">Registro de actividad y seguridad</div></div></div>
    
    <div class="stats-row" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card">
        <div class="stat-label">Accesos hoy</div>
        <div class="stat-value blue">${stats.accesos_hoy||0}</div>
        <div class="stat-s">${stats.accesos_7d||0} últimos 7 días</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Eventos flujo (30d)</div>
        <div class="stat-value green">${stats.eventos_30d||0}</div>
        <div class="stat-s">${stats.usuarios_activos_7d||0} usuarios activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Intentos fallidos (7d)</div>
        <div class="stat-value" style="color:var(--danger)">${stats.logins_fallidos_7d||0}</div>
        ${stats.top_ip_bloqueadas?.length?'<div class="stat-s">IPs con más errores</div>':''}
      </div>
    </div>
    
    ${stats.top_ip_bloqueadas?.length?`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">IPs con más intentos fallidos (7 días)</div>
      <table style="width:100%"><thead><tr><th style="text-align:left;font-size:11px;color:var(--muted)">IP</th><th style="text-align:left;font-size:11px;color:var(--muted)">Intentos</th><th style="text-align:left;font-size:11px;color:var(--muted)">Último intento</th></tr></thead>
      <tbody>
        ${stats.top_ip_bloqueadas.map(ip=>`<tr><td style="padding:8px 0;font-family:monospace;font-size:12px">${esc(ip.ip)}</td><td style="color:var(--danger);font-weight:600">${ip.intentos}</td><td style="color:var(--muted);font-size:12px">${fdate(ip.ultimo_intento)}</td></tr>`).join('')}
      </tbody></table>
    </div>`:''}
    
    <div style="display:flex;gap:6px;margin-bottom:20px">
      <button class="fb${auditTab==='accesos'?' active':''}" onclick="auditTab='accesos';rAudit()">🔐 Accesos</button>
      <button class="fb${auditTab==='eventos'?' active':''}" onclick="auditTab='eventos';rAudit()">📋 Eventos flujo</button>
    </div>
    
    <div class="tbl">
      <div class="tbl-head"><div class="tbl-title" id="audit-title">Cargando...</div></div>
      <table><thead id="audit-head"></thead>
      <tbody id="audit-body"><tr><td colspan="10" class="empty">Cargando...</td></tr></tbody>
    </div>
  `;
  await cargarAudit(usuarios);
}

async function cargarAudit(usuarios){
  if(auditTab==='accesos'){
    const r=await api('GET','/audit/accesos?limit=100');
    $('audit-title').textContent=`${r.total||0} registros de acceso`;
    $('audit-head').innerHTML=`<tr><th>Fecha</th><th>Usuario</th><th>IP</th><th>Resultado</th><th>Motivo</th></tr>`;
    $('audit-body').innerHTML=r.data?.length?r.data.map(l=>`<tr>
      <td style="color:var(--muted);font-size:12px">${fdate(l.creado_en)}</td>
      <td style="font-weight:500">${esc(l.usuario_nombre||l.email||'—')}</td>
      <td style="font-family:monospace;font-size:12px">${esc(l.ip||'—')}</td>
      <td><span class="badge ${l.exito?'b-aprobada':'b-rechazada'}">${l.exito?'Éxito':'Fallido'}</span></td>
      <td style="color:var(--muted);font-size:12px">${esc(l.motivo||'—')}</td>
    </tr>`).join(''):'<tr><td colspan="5" class="empty">Sin registros</td></tr>';
  }else{
    const r=await api('GET','/audit/eventos?limit=100');
    $('audit-title').textContent=`${r.total||0} eventos de flujo`;
    $('audit-head').innerHTML=`<tr><th>Fecha</th><th>Usuario</th><th>Tipo</th><th>Factura</th><th>Comentario</th></tr>`;
    $('audit-body').innerHTML=r.data?.length?r.data.map(e=>`<tr>
      <td style="color:var(--muted);font-size:12px">${fdate(e.creado_en)}</td>
      <td style="font-weight:500">${esc(e.usuario_nombre||'Sistema')}</td>
      <td><span class="tag">${esc(e.tipo)}</span></td>
      <td class="mono" style="font-size:12px">${esc(e.numero_factura||'—')}</td>
      <td style="color:var(--muted);font-size:12px">${esc(e.comentario||'—')}</td>
    </tr>`).join(''):'<tr><td colspan="5" class="empty">Sin eventos</td></tr>';
  }
}
