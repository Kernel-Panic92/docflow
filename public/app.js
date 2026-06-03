// ─── STATE ───────────────────────────────────────────────────────────────────
const S={
  token:localStorage.getItem('vd_t'),
  usuario:JSON.parse(localStorage.getItem('vd_u')||'null'),
  view:'dashboard',
  areas:[],
  cats:[],
  theme:localStorage.getItem('vd_theme')||'dark'
};
const NAV=[
  {id:'dashboard',l:'Dashboard',i:'📊',s:'p'},
  {id:'facturas',l:'Facturas',i:'📄',s:'p'},
  {id:'pendientes',l:'Pendientes',i:'⏰',s:'p'},
  {id:'porpagar',l:'Por Pagar',i:'💳',s:'f',roles:['admin','tesorero']},
  {id:'causacion',l:'Causación',i:'📥',s:'f',roles:['admin','contador','tesorero']},
  {id:'categorias',l:'Categorías',i:'🏷️',s:'c',roles:['admin','contador']},
  {id:'centros',l:'Centros',i:'🗺️',s:'c',roles:['admin','contador']},
  {id:'configuracion',l:'Configuración',i:'⚙️',s:'c',roles:['admin']},
  {id:'backup',l:'Backup',i:'💾',s:'c',roles:['admin']},
  {id:'usuarios',l:'Usuarios',i:'👤',s:'c',roles:['admin']},
  {id:'audit',l:'Auditoría',i:'🔒',s:'c',roles:['admin','auditor']}
];
const SECS=[{id:'p',l:'Principal'},{id:'f',l:'Flujo'},{id:'c',l:'Config'}];

// ─── ROUTING ─────────────────────────────────────────────────────────────────
function getPageFromHash(){
  const hash=location.hash.slice(1);
  if(!hash)return localStorage.getItem('vd_last_page')||'dashboard';
  return NAV.find(n=>n.id===hash)?hash:'dashboard';
}
function savePage(v){localStorage.setItem('vd_last_page',v)}

// ─── PDF ─────────────────────────────────────────────────────────────────────
async function verPdf(id){
  const token = localStorage.getItem('vd_t');
  try {
    const resp = await fetch(`/api/facturas/${id}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) {
      const err = await resp.json().catch(()=>({error:'Error'}));
      toast(err.error || 'Error cargando PDF', 'error');
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    $('mroot').innerHTML=`<div class="modal-overlay open" onclick="if(event.target===this){closeM();URL.revokeObjectURL('${url}');}">
      <div class="modal" style="width:90vw;max-width:900px;height:85vh;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="font-family:var(--font-head);font-size:16px;font-weight:700">Factura PDF</span>
          <button class="btn btn-secondary btn-sm" onclick="closeM();URL.revokeObjectURL('${url}')">✕ Cerrar</button>
        </div>
        <iframe src="${url}" style="flex:1;border:none;border-radius:8px;background:#fff"></iframe>
      </div>
    </div>`;
  } catch(e) {
    toast('Error cargando PDF', 'error');
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function doLogin(){
  const email=$('login-email').value.trim();
  const pass=$('login-pass').value;
  const errEl=$('login-error');
  errEl.classList.remove('show');
  try{
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Error');
    S.token=d.token;S.usuario=d.usuario;
    localStorage.setItem('vd_t',d.token);localStorage.setItem('vd_u',JSON.stringify(d.usuario));
    if(d.cambio_password)showChPass();else showApp();
  }catch(ex){errEl.textContent=ex.message;errEl.classList.add('show')}
}
function doLogout(){localStorage.removeItem('vd_t');localStorage.removeItem('vd_u');S.token=null;S.usuario=null;$('app-screen').classList.remove('show');$('login-screen').style.display='flex'}
function showLogoutConfirm(){$('logout-modal').classList.add('open')}
function closeLogoutConfirm(){$('logout-modal').classList.remove('open')}
function confirmLogout(){closeLogoutConfirm();doLogout()}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&$('login-screen').style.display!=='none')doLogin()});

function showForgot(e){e.preventDefault();$('forgot-modal').classList.add('open')}
function closeForgot(){$('forgot-modal').classList.remove('open');$('forgot-email').value='';$('forgot-msg').innerHTML=''}
async function doForgot(){
  const email=$('forgot-email').value.trim();
  if(!email)return;
  try{
    await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    $('forgot-msg').innerHTML=`<span style="color:var(--success)">✓ Se envió un enlace a tu correo.</span>`;
    setTimeout(closeForgot,3000);
  }catch(e){$('forgot-msg').innerHTML=`<span style="color:var(--danger)">${e.message}</span>`}
}

function showChPass(){$('chpass-modal').classList.add('open')}
$('chpass-new').addEventListener('input',function(){
  const p=this.value;
  $('req-len').style.color=p.length>=8?'var(--success)':'';
  $('req-up').style.color=/[A-Z]/.test(p)?'var(--success)':'';
  $('req-num').style.color=/[0-9]/.test(p)?'var(--success)':'';
  $('req-sym').style.color=/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(p)?'var(--success)':'';
});
async function doChangePass(){
  const p1=$('chpass-new').value,p2=$('chpass-confirm').value;
  if(p1!==p2){$('chpass-msg').innerHTML='<span style="color:var(--danger)">Las contraseñas no coinciden</span>';return}
  try{
    await api('POST','/auth/cambio-forzado',{password:p1});
    $('chpass-modal').classList.remove('open');
    toast('Contraseña actualizada','success');
    showApp();
  }catch(e){$('chpass-msg').innerHTML=`<span style="color:var(--danger)">${e.message}</span>`}
}

// ─── APP ─────────────────────────────────────────────────────────────────────
function showApp(){
  $('login-screen').style.display='none';
  $('app-screen').classList.add('show');
  document.body.className=S.theme;
  $('theme-btn').textContent=S.theme==='dark'?'🌙':'☀️';
  $('u-name').textContent=S.usuario?.nombre||'—';
  $('u-role').textContent=S.usuario?.rol||'—';
  const rolClass={'admin':'role-admin','contador':'role-contador','tesorero':'role-tesorero','comprador':'role-comprador','auditor':'role-auditor'};
  $('u-badge').className=`role-badge ${rolClass[S.usuario?.rol]||'role-comprador'}`;
  $('u-badge').textContent=S.usuario?.rol||'';
  initFiltros();
  
  // Cargar versión
  fetch('/api/version').then(r=>r.json()).then(d=>{
    const el=document.getElementById('app-version');
    if(el&&d.version)el.textContent='v'+d.version+(d.branch?' ['+d.branch+']':'');
    const cr=document.getElementById('app-copyright');
    if(cr&&d.author)cr.textContent=d.author;
    const repoEl=document.getElementById('app-repo');
    if(repoEl&&d.repo)repoEl.innerHTML='<a href="'+d.repo+'" target="_blank" style="color:var(--accent);text-decoration:none;">GitHub</a>';
  }).catch(()=>{});
  if(S.empresaLogo){
    $('header-logo').innerHTML='<img src="'+S.empresaLogo+'" style="height:32px;border-radius:6px"/>';
    const loginLogo=$('login-logo-container');
    if(loginLogo)loginLogo.innerHTML='<img src="'+S.empresaLogo+'" style="max-height:60px;max-width:200px;border-radius:8px"/>';
  }else if(S.appNombre){
    $('header-logo').innerHTML=S.appNombre.toUpperCase();
  }
  buildNav();
  
  // Restore sidebar state
  if(localStorage.getItem('sidebar_collapsed')==='true'){
    $('sidebar').classList.add('collapsed');
    $('sidebar-toggle').textContent='▶';
  }
  
  // Navigate to hash or saved page
  const v=getPageFromHash();
  goTo(v);
}

function buildNav(){
  let h='';
  for(const sec of SECS){
    const items=NAV.filter(n=>n.s===sec.id&&(!n.roles||n.roles.includes(S.usuario?.rol)));
    if(!items.length)continue;
    h+=`<div style="font-size:9px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;padding:10px 24px 4px;margin-top:4px">${sec.l}</div>`;
    for(const n of items)h+=`<div class="nav-item" id="nv-${n.id}" onclick="goNav('${n.id}')">${n.i}<span style="flex:1">${n.l}</span>${n.badge?`<span class="badge" style="font-size:10px;padding:2px 6px;background:${n.w?'rgba(251,191,36,.15)':'rgba(79,142,247,.15)'};color:${n.w?'var(--warning)':'var(--accent)'}" id="nb-${n.badge}">0</span>`:''}</div>`;
  }
  $('nav').innerHTML=h;
}
function goNav(v){closeSidebar();goTo(v)}
function setNav(id){
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
  const e=$(`nv-${id}`);if(e)e.classList.add('active');
  const T={'dashboard':'Dashboard','facturas':'Facturas','pendientes':'Pendientes','aprobaciones':'Aprobaciones','causacion':'Causación','categorias':'Categorías','usuarios':'Usuarios','backup':'Backup'};
  $('content').parentElement.querySelector('.page-title')?.remove();
  $('content').parentElement.querySelector('.page-sub')?.remove();
}
async function goTo(v){
  destruirCharts();
  S.view=v;setNav(v);
  savePage(v);
  history.pushState(null,'','#'+v);
  const el=$('content');el.innerHTML='<div class="empty">Cargando…</div>';
  try{
    if(v==='dashboard')await rDash();
    else if(v==='facturas')await rFacturas();
    else if(v==='pendientes')await rPend();
    else if(v==='causacion')await rCaus();
    else if(v==='porpagar')await rPorPagar();
    else if(v==='categorias')await rCats();
    else if(v==='centros')await rCentros();
    else if(v==='usuarios')await rUsers();
    else if(v==='backup')await rBackup();
    else if(v==='configuracion')await rConfig();
    else if(v==='audit')await rAudit();
    else el.innerHTML='<div class="empty">Módulo en construcción</div>';
  }catch(ex){el.innerHTML=`<div class="empty" style="color:var(--danger)">${ex.message}</div>`}
}
window.addEventListener('popstate',()=>{
  const v=getPageFromHash();
  if(v!==S.view)goTo(v);
});
async function refreshBadges(){
  // Badges removed from menu - badges only shown when opening modals
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
async function rDash(){
  const d=await api('GET','/dashboard');
  const r=d.resumen;
  const rol=S.usuario?.rol;
  const esComprador=rol==='comprador';
  const esTesorero=['tesorero','admin'].includes(rol);
  const sync=await checkSyncStatus();
  if(sync.sincronizando){
    startSyncPoll();
  }else{
    stopSyncPoll();
  }
  let stats='';
  if(esComprador){
    stats+=stat('Pendientes aprobar',r.recibidas+r.revision,'var(--accent2)','orange');
  }else if(rol==='admin'){
    stats+=stat('Recibidas',r.recibidas,'var(--accent)','blue');
    stats+=stat('En revisión',r.revision,'var(--accent2)','orange');
    stats+=stat('Por causar',r.aprobadas,'var(--success)','green');
    stats+=stat('Por pagar',r.causadas,'var(--accent)','blue');
    stats+=stat('Valor mes',fmt(r.valor_mes),'var(--warning)','yellow');
  }else if(esTesorero){
    stats+=stat('Por causar',r.aprobadas,'var(--success)','green');
    stats+=stat('Por pagar',r.causadas,'var(--accent)','blue');
    stats+=stat('Valor mes',fmt(r.valor_mes),'var(--warning)','yellow');
  }else{
    stats+=stat('Recibidas',r.recibidas,'var(--accent)','blue');
    stats+=stat('En revisión',r.revision,'var(--accent2)','orange');
    stats+=stat('Por causar',r.aprobadas,'var(--success)','green');
    stats+=stat('Valor mes',fmt(r.valor_mes),'var(--warning)','yellow');
  }
  const rc=d.recientes||[];
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Dashboard</div><div class="page-sub">${esTesorero?'Gestión de pagos':esComprador?'Facturas por aprobar':'Resumen general'}</div></div></div>
    ${!esComprador?sync.bar:''}
    <div class="stats-row">${stats}</div>
    <div class="tbl">
      <div class="tbl-head"><div class="tbl-title">Actividad reciente</div><button class="btn btn-primary btn-sm" onclick="mNuevaF()">+ Nueva</button></div>
      <table><thead><tr><th># Factura</th><th>Proveedor</th><th>Categoría</th><th>Valor</th><th>Estado</th><th>Recibida</th><th></th></tr></thead>
      <tbody>${rc.length?rc.map(f=>`<tr onclick="abrirF('${f.id}')"><td class="mono">${esc(f.numero_factura)}</td><td style="font-weight:500">${esc(f.proveedor_nombre||'—')}</td><td>${ctag(f.categoria_color,f.categoria_nombre)}</td><td style="font-weight:500">${fmt(f.valor_total||f.valor||0)}</td><td>${bdg(f.estado)}</td><td style="color:var(--muted);font-size:12px">${fdatetime(f.recibida_en)}</td><td>${f.archivo_pdf?`<span onclick="event.stopPropagation();verPdf('${f.id}')" title="Ver PDF" style="color:var(--accent);font-size:16px;cursor:pointer">📄</span>`:''}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Sin facturas</td></tr>'}</tbody></table>
    </div>`;
  refreshBadges();
}
function stat(l,v,c){return`<div class="stat-card"><div class="stat-label">${l}</div><div class="stat-value ${c}">${v}</div></div>`}

async function checkSyncStatus(){
  try{
    const r=await api('GET','/sync/status');
    if(r.sincronizando){
      return{sincronizando:true,bar:`<div style="background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.3);border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-weight:600;color:var(--accent)">Sincronizando correo...</span>
          <span style="color:var(--muted);font-size:13px">${r.procesando}/${r.totalMensajes} — ${r.creadas} nuevas</span>
        </div>
        <div style="background:var(--surface2);border-radius:6px;height:8px;overflow:hidden">
          <div style="background:var(--accent);height:100%;width:${r.progreso}%;transition:width .3s"></div>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">${r.mensaje}</div>
      </div>`};
    }else{
      return{sincronizando:false,bar:`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:13px;color:var(--muted)">Ultima sync: ${r.ultimoSyncFormateado||'Nunca'} — ${r.mensaje||''}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="rescanearTodo()" title="Re-escanear todos los mensajes (incluye leídos)"><span style="font-size:12px">⟲</span> Rescanear</button>
          <button class="btn btn-secondary btn-sm" onclick="iniciarSync()" title="Sincronizar solo mensajes no leídos"><span style="font-size:14px">↻</span> Sync</button>
        </div>
      </div>`};
    }
  }catch(e){return{sincronizando:false,bar:`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:13px;color:var(--muted)">Sincronización manual</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="rescanearTodo()"><span style="font-size:12px">⟲</span> Rescanear</button>
          <button class="btn btn-secondary btn-sm" onclick="iniciarSync()"><span style="font-size:14px">↻</span> Sync</button>
        </div>
      </div>`}}
}
syncPollInterval=null;
async function iniciarSync(){
  try{
    await api('POST','/sync');
    toast('Sincronizacion iniciada','info');
    if(S.view==='dashboard')rDash();
  }catch(e){toast(e.message,'error')}
}
async function rescanearTodo(){
  try{
    await api('POST','/sync',{rescanAll:true});
    toast('Reescaneo iniciado','info');
    if(S.view==='dashboard')rDash();
  }catch(e){toast(e.message,'error')}
}
function startSyncPoll(){
  if(syncPollInterval)return;
  syncPollInterval=setInterval(async()=>{
    if(S.view==='dashboard')await rDash();
  },2000);
}
function stopSyncPoll(){
  if(syncPollInterval){clearInterval(syncPollInterval);syncPollInterval=null}
}

// ─── FACTURAS ────────────────────────────────────────────────────────────────
fFiltro='todas';
function getFiltrosKey(){return'vd_f_'+(S?.usuario?.id||'0')}
fBusqueda=null;
function initFiltros(){
  if(!S?.usuario?.id)return;
  const k=getFiltrosKey();
  const f=JSON.parse(localStorage.getItem(k)||'{}');
  f.fecha_desde=f.fecha_desde||'';
  f.fecha_hasta=f.fecha_hasta||'';
  fBusqueda=f;
}

async function rFacturas(filtro){
  if(!fBusqueda)initFiltros();
  if(filtro!==undefined)fFiltro=filtro;
  
  // Construir query params
  const params=new URLSearchParams();
  if(fFiltro!=='todas')params.set('estado',fFiltro);
  if(fBusqueda.numero)params.set('numero',fBusqueda.numero);
  if(fBusqueda.nit)params.set('nit_emisor',fBusqueda.nit);
  if(fBusqueda.fecha_desde)params.set('fecha_desde',fBusqueda.fecha_desde);
  if(fBusqueda.fecha_hasta)params.set('fecha_hasta',fBusqueda.fecha_hasta);
  if(fBusqueda.valor_min)params.set('valor_min',fBusqueda.valor_min);
  if(fBusqueda.valor_max)params.set('valor_max',fBusqueda.valor_max);
  if(fBusqueda.proveedor_id)params.set('proveedor_id',fBusqueda.proveedor_id);
  if(fBusqueda.categoria_id)params.set('categoria_id',fBusqueda.categoria_id);
  if(fBusqueda.buscar)params.set('buscar',fBusqueda.buscar);
  params.set('limit','100');

  const f=await api('GET',`/facturas?${params.toString()}`);S.facturas=f.data||[];
  const all=f.data||[];
  const isAdmin=S.usuario?.rol==='admin';
  const cnts={todas:f.total||all.length};
  ['recibida','revision','aprobada','causada','rechazada'].forEach(e=>cnts[e]=all.filter(x=>x.estado===e).length);
  const fbs=[{id:'todas',l:'Todas'},{id:'recibida',l:'Recibidas'},{id:'revision',l:'En revisión'},{id:'aprobada',l:'Aprobadas'},{id:'causada',l:'Causadas'},{id:'rechazada',l:'Rechazadas'}].map(fb=>`<button class="fb${fFiltro===fb.id?' active':''}" onclick="rFacturas('${fb.id}')">${fb.l}<span class="fc">${cnts[fb.id]||0}</span></button>`).join('');
  
  // Cargar proveedores y categorías para el filtro
  if(!S.proveedores)S.proveedores=await api('GET','/proveedores');
  if(!S.cats?.length)S.cats=await api('GET','/categorias');
  const provOpts=S.proveedores.map(p=>`<option value="${p.id}" ${fBusqueda.proveedor_id===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('');
  const catOpts=S.cats.map(c=>`<option value="${c.id}" ${fBusqueda.categoria_id===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('');
  
  const hayFiltros=fBusqueda.numero||fBusqueda.nit||fBusqueda.fecha_desde||fBusqueda.fecha_hasta||fBusqueda.valor_min||fBusqueda.valor_max||fBusqueda.proveedor_id||fBusqueda.categoria_id||fBusqueda.buscar;
  
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Facturas</div><div class="page-sub">${f.total||0} factura(s) encontrada(s)</div></div><button class="btn btn-primary" onclick="mNuevaF()">+ Nueva factura</button></div>
    <div class="filters">${fbs}</div>
    
    <!-- Filtros avanzados -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-weight:600;font-size:13px">Filtros de búsqueda</span>
        ${hayFiltros?`<button onclick="limpiarFiltrosF()" style="background:rgba(247,97,79,.1);border:1px solid rgba(247,97,79,.2);color:var(--danger);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer">✕ Limpiar</button>`:''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Buscar</label>
          <input type="text" id="ff-buscar" placeholder="N°, proveedor, NIT, CUFE..." value="${esc(fBusqueda.buscar)}" onkeydown="if(event.key==='Enter')aplicarFiltrosF()">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">N° Factura</label>
          <input type="text" id="ff-numero" placeholder="Ej: 59826" value="${esc(fBusqueda.numero)}">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">NIT Emisor</label>
          <input type="text" id="ff-nit" placeholder="Ej: 900768941" value="${esc(fBusqueda.nit)}">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Proveedor</label>
          <select id="ff-proveedor"><option value="">Todos</option>${provOpts}</select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Categoría</label>
          <select id="ff-categoria"><option value="">Todas</option>${catOpts}</select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Desde fecha</label>
          <input type="date" id="ff-fd" value="${fBusqueda.fecha_desde||''}">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Hasta fecha</label>
          <input type="date" id="ff-fh" value="${fBusqueda.fecha_hasta||''}">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Valor mín ($)</label>
          <input type="number" id="ff-vmin" placeholder="0" value="${fBusqueda.valor_min}">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:10px;text-transform:uppercase;color:var(--muted)">Valor máx ($)</label>
          <input type="number" id="ff-vmax" placeholder="999999999" value="${fBusqueda.valor_max}">
        </div>
      </div>
      <button onclick="aplicarFiltrosF()" class="btn btn-primary btn-sm" style="margin-top:12px">🔍 Buscar</button>
    </div>
    
    <div class="tbl">
      <div class="tbl-head"><div class="tbl-title">${all.length} factura(s)</div></div>
      <table><thead><tr><th># Factura</th><th>Centro</th><th>Proveedor</th><th>Categoría</th><th>Valor</th><th>Estado</th><th>Recibida</th><th></th></tr></thead>
      <tbody>${all.length?all.map(f=>`<tr onclick="abrirF('${f.id}')"><td class="mono" data-label="Factura">${esc(f.numero_factura)}</td><td data-label="Centro" style="font-size:12px;color:var(--muted)">${esc(f.centro_operacion_nombre||'—')}</td><td data-label="Proveedor" style="font-weight:500">${esc(f.proveedor_nombre||f.nombre_emisor||'—')}</td><td data-label="Categoría">${ctag(f.categoria_color,f.categoria_nombre)}</td><td data-label="Valor" style="font-weight:500">${fmt(f.valor_total||f.valor||0)}</td><td data-label="Estado">${bdg(f.estado)}</td><td data-label="Recibida" style="color:var(--muted);font-size:12px">${fdatetime(f.recibida_en)}</td><td>${f.archivo_pdf?`<span onclick="event.stopPropagation();verPdf('${f.id}')" title="Ver PDF" style="color:var(--accent);font-size:16px;cursor:pointer">📄</span>`:''}${isAdmin?`<span onclick="event.stopPropagation();delFactura('${f.id}','${esc(f.numero_factura)}')" title="Eliminar" style="color:var(--danger);font-size:14px;cursor:pointer;margin-left:6px">🗑️</span>`:''}</td></tr>`).join(''):'<tr><td colspan="8" class="empty">Sin facturas</td></tr>'}</tbody></table>
    </div>`;
  refreshBadges();
}

function aplicarFiltrosF(){
  fBusqueda={
    numero:$('ff-numero')?.value||'',
    nit:$('ff-nit')?.value||'',
    fecha_desde:$('ff-fd')?.value||'',
    fecha_hasta:$('ff-fh')?.value||'',
    valor_min:$('ff-vmin')?.value||'',
    valor_max:$('ff-vmax')?.value||'',
    proveedor_id:$('ff-proveedor')?.value||'',
    categoria_id:$('ff-categoria')?.value||'',
    buscar:$('ff-buscar')?.value||''
  };
  guardarFiltros();
  rFacturas();
}
function guardarFiltros(){
  localStorage.setItem(getFiltrosKey(),JSON.stringify(fBusqueda))}

function limpiarFiltrosF(){
  fBusqueda={numero:'',nit:'',fecha_desde:'',fecha_hasta:'',valor_min:'',valor_max:'',proveedor_id:'',categoria_id:'',buscar:''};
  guardarFiltros();
  rFacturas();
}

// ─── PENDIENTES ──────────────────────────────────────────────────────────────
pendFiltro='todas';
pendBusqueda='';
async function rPend(){
  const savedSearch=pendBusqueda;
  let savedCursorPos=0;
  const input=$('pend-buscar');
  if(input)savedCursorPos=input.selectionStart||0;
  const f=await api('GET','/facturas/pendientes');
  let all=f.data||[];
  
  if(pendBusqueda.trim()){
    const b=pendBusqueda.toLowerCase();
    all=all.filter(x=>{
      const num=(x.numero_factura||'').toLowerCase();
      const prov=(x.proveedor_nombre||'').toLowerCase();
      return num.includes(b)||prov.includes(b);
    });
  }
  
  const sinAprobar=all.filter(x=>['recibida','revision'].includes(x.estado));
  const sinPagar=all.filter(x=>['aprobada','causada'].includes(x.estado)&&x.estado!=='pagada');
  const porVencer=all.filter(x=>{
    if(!x.limite_pago)return false;
    const dias=Math.ceil((new Date(x.limite_pago)-new Date())/(1000*60*60*24));
    return dias>=0&&dias<=7;
  });
  
  let criticas,alertas,normales;
  if(pendFiltro==='sinaprobar'){criticas=all.filter(x=>['recibida','revision'].includes(x.estado));alertas=[];normales=[];}
  else if(pendFiltro==='sinpagar'){criticas=all.filter(x=>['aprobada','causada'].includes(x.estado));alertas=[];normales=[];}
  else if(pendFiltro==='vencer'){criticas=porVencer;alertas=[];normales=[];}
  else{
    criticas=all.filter(x=>['critico','sinaprobar'].includes(x.prioridad));
    alertas=all.filter(x=>['alerta','sinpagar'].includes(x.prioridad));
    normales=all.filter(x=>x.prioridad==='normal');
  }
  
function renderItem(f){
    let colorBarra='var(--accent)';
    let badgeExtra='';
    if(['recibida','revision'].includes(f.estado)){
      colorBarra='var(--warning)';
      badgeExtra='<span class="badge" style="background:rgba(251,191,36,.2);color:#f7d44f">⏳ Sin aprobar</span>';
    }else if(['aprobada','causada'].includes(f.estado)){
      colorBarra='#A78BFA';
      badgeExtra='<span class="badge" style="background:rgba(167,139,250,.2);color:#A78BFA">💳 Sin pagar</span>';
    }else if(f.limite_pago){
      const dias=Math.ceil((new Date(f.limite_pago)-new Date())/(1000*60*60*24));
      if(dias>=0&&dias<=7){colorBarra='var(--danger)';badgeExtra='<span class="badge" style="background:rgba(248,113,113,.2);color:#f7614f">⏰ Vence pronto</span>'}
    }
    const priorBadge=f.prioridad==='critico'?'<span class="badge" style="background:rgba(248,113,113,.2);color:#f7614f">🔴 Crítico</span>':
                          f.prioridad==='alerta'?'<span class="badge" style="background:rgba(251,191,36,.2);color:#f7d44f">🟡 Alerta</span>':
                          f.prioridad==='sinaprobar'?'<span class="badge" style="background:rgba(251,191,36,.2);color:#f7d44f">⏳ Sin aprobar</span>':
                          f.prioridad==='sinpagar'?'<span class="badge" style="background:rgba(167,139,250,.2);color:#A78BFA">💳 Sin pagar</span>':'';
    const tipoBadge=f.tipo_urgencia==='dian'?'<span class="badge b-revision">DIAN</span>':
                    f.tipo_urgencia==='soporte'?'<span class="badge b-causada">Sin soporte</span>':
                    f.tipo_urgencia==='revision'?'<span class="badge b-recibida">Sin revisar</span>':'';
    return `<div class="tbl" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;gap:20px;border-left:4px solid ${colorBarra}" onclick="abrirF('${f.id}')">
      <div style="flex:1"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="mono">${esc(f.numero_factura)}</span>${bdg(f.estado)}${priorBadge}${badgeExtra}${tipoBadge}</div>
      <div style="font-weight:500;margin-bottom:4px">${esc(f.proveedor_nombre||'Desconocido')}</div>
      <div style="font-size:12px;color:var(--muted)">${esc(f.area_nombre||'Sin área')} · Recibida: ${fdatetime(f.recibida_en)}</div></div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px"><div style="font-size:18px;font-weight:700">${fmt(f.valor_total||f.valor||0)}</div>${f.archivo_pdf?`<button onclick="event.stopPropagation();verPdf('${f.id}')" class="btn btn-secondary btn-sm">📄 PDF</button>`:''}${f.limite_pago?`<div style="font-size:12px;color:${new Date(f.limite_pago)<new Date()?'var(--danger)':f.prioridad==='alerta'?'var(--warning)':'var(--muted)'}">Vence: ${fdate(f.limite_pago)}</div>`:f.limite_dian?`<div style="font-size:12px;color:${f.prioridad==='critico'?'var(--danger)':'var(--muted)'}">DIAN: ${fdate(f.limite_dian)}</div>`:''}</div>
    </div>`;
  }
  
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Pendientes</div><div class="page-sub">${all.length} factura(s) requieren atención</div></div></div>
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
      <input type="text" id="pend-buscar" placeholder="🔍 Buscar factura o proveedor..." value="${esc(pendBusqueda)}" style="flex:1;min-width:200px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text)" oninput="pendBusqueda=this.value;rPend()"/>
      <button class="fb${pendFiltro==='todas'?' active':''}" onclick="pendFiltro='todas';rPend()">Todas</button>
      <button class="fb${pendFiltro==='sinaprobar'?' active':''}" onclick="pendFiltro='sinaprobar';rPend()">⏳ Sin aprobar</button>
      <button class="fb${pendFiltro==='sinpagar'?' active':''}" onclick="pendFiltro='sinpagar';rPend()">💳 Sin pagar</button>
      <button class="fb${pendFiltro==='vencer'?' active':''}" onclick="pendFiltro='vencer';rPend()">⏰ Por vencer</button>
    </div>
    ${criticas.length?`<div style="margin-bottom:20px">
      <div style="font-size:11px;text-transform:uppercase;color:var(--danger);font-weight:600;margin-bottom:10px">🔴 Críticas (vencen pronto)</div>
      ${criticas.map(renderItem).join('')}
    </div>`:''}
    ${alertas.length?`<div style="margin-bottom:20px">
      <div style="font-size:11px;text-transform:uppercase;color:var(--warning);font-weight:600;margin-bottom:10px">🟡 Alertas</div>
      ${alertas.map(renderItem).join('')}
    </div>`:''}
    ${normales.length?`<div>
      <div style="font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:10px">Pendientes</div>
      ${normales.map(renderItem).join('')}
    </div>`:''}
    ${all.length===0?'<div class="empty">No hay facturas pendientes ✓</div>':''}
  `;
  const inp=$('pend-buscar');
  if(inp){
    inp.value=savedSearch;
    inp.setSelectionRange(savedCursorPos,savedCursorPos);
    inp.focus();
  }
}

// ─── CAUSACIÓN ───────────────────────────────────────────────────────────────
causBusqueda='';
async function rCaus(){
  causBusqueda=$('caus-buscar')?.value||'';
  const params=new URLSearchParams();
  params.set('estado','aprobada');
  if(causBusqueda){
    params.set('buscar',causBusqueda);
  }
  const f=await api('GET',`/facturas?${params.toString()}&limit=100`);
  const all=f.data||[];
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Causación</div><div class="page-sub">${all.length} factura(s) por causar</div></div></div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
      <input type="text" id="caus-buscar" placeholder="Buscar por # factura o proveedor..." value="${esc(causBusqueda)}" onkeydown="if(event.key==='Enter')rCaus()" style="width:100%">
    </div>
    <div style="display:grid;gap:12px">${all.length?all.map(f=>`<div class="tbl" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;gap:20px" onclick="abrirF('${f.id}')">
      <div style="flex:1"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="mono">${esc(f.numero_factura)}</span>${bdg(f.estado)}</div>
      <div style="font-weight:500;margin-bottom:4px">${esc(f.proveedor_nombre||'Desconocido')}</div>
      <div style="font-size:12px;color:var(--muted)">${esc(f.centro_operacion_nombre||'Sin CO')} · ${f.fecha_factura?'Fact: '+fdate(f.fecha_factura):''} ${f.limite_pago?'· Vence: '+fdate(f.limite_pago):''}</div></div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px"><div style="font-size:18px;font-weight:700">${fmt(f.valor_total||f.valor||0)}</div>${f.archivo_pdf?`<button onclick="event.stopPropagation();verPdf('${f.id}')" class="btn btn-secondary btn-sm">📄 PDF</button>`:''}</div>
    </div>`).join(''):'<div class="empty">No hay facturas por causar ✓</div>'}</div>`;
}

// ─── POR PAGAR ───────────────────────────────────────────────────────────
porPagarBusqueda='';
async function rPorPagar(){
  porPagarBusqueda=$('porpagar-buscar')?.value||'';
  const params=new URLSearchParams();
  params.set('estado','causada');
  if(porPagarBusqueda){
    params.set('buscar',porPagarBusqueda);
  }
  const f=await api('GET',`/facturas?${params.toString()}&limit=100`);
  const all=f.data||[];
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Por Pagar</div><div class="page-sub">${all.length} factura(s) causadas pendientes de pago</div></div></div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
      <input type="text" id="porpagar-buscar" placeholder="Buscar por # factura o proveedor..." value="${esc(porPagarBusqueda)}" onkeydown="if(event.key==='Enter')rPorPagar()" style="width:100%">
    </div>
    <div style="display:grid;gap:12px">${all.length?all.map(f=>`<div class="tbl" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;gap:20px" onclick="abrirF('${f.id}')">
      <div style="flex:1"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="mono">${esc(f.numero_factura)}</span>${bdg(f.estado)}</div>
      <div style="font-weight:500;margin-bottom:4px">${esc(f.proveedor_nombre||'Desconocido')}</div>
      <div style="font-size:12px;color:var(--muted)">${esc(f.centro_operacion_nombre||'Sin CO')} · ${f.fecha_factura?'Fact: '+fdate(f.fecha_factura):''} ${f.limite_pago?'· Vence: '+fdate(f.limite_pago):''}</div></div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <div style="font-size:18px;font-weight:700">${fmt(f.valor_total||f.valor||0)}</div>
        ${f.archivo_pdf?`<button onclick="event.stopPropagation();verPdf('${f.id}')" class="btn btn-secondary btn-sm">📄 PDF</button>`:''}
        ${f.soporte_pago?`<button onclick="event.stopPropagation();verSoporte('${f.id}')" class="btn btn-secondary btn-sm">📎 Soporte</button>`:''}
      </div>
    </div>`).join(''):'<div class="empty">No hay facturas por pagar ✓</div>'}</div>`;
}

// ─── FACTURA DETALLE ─────────────────────────────────────────────────────────
async function abrirF(id){
  const f=await api('GET',`/facturas/${id}`);
  if(!S.areas?.length)S.areas=await api('GET','/areas');
  if(!S.cats?.length)S.cats=await api('GET','/categorias');
  const catsPref=f.proveedor_id?(await api('GET',`/proveedores/${f.proveedor_id}/categorias-preferidas`)||[]):[];
  const ei=EORD.indexOf(f.estado);
  const prog=EORD.map((e,i)=>{const d=i<=ei;return`<div style="display:flex;align-items:center"><div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:50%;border:2px solid var(--border);background:${d?'var(--accent)':'var(--surface2)'};flex-shrink:0"></div><span style="font-size:10px;color:${d?'var(--accent)':'var(--muted)'};margin-top:4px">${EM[e]?.l||e}</span></div>${i<EORD.length-1?`<div style="width:24px;height:2px;background:${d?'var(--accent)':'var(--border)'}"></div>`:''}</div>`}).join('');
  const acc=[];
  if(['recibida','revision'].includes(f.estado)){acc.push(`<button class="btn btn-success btn-sm" onclick="mAprobar('${id}')">✓ Aprobar</button>`);acc.push(`<button class="btn btn-danger btn-sm" onclick="mRechazar('${id}')">✗ Rechazar</button>`);}
  if(f.estado==='aprobada')acc.push(`<button class="btn btn-success btn-sm" onclick="acF('${id}','causar')">📥 Causar</button>`);
  const isTesorero=['admin','tesorero'].includes(S.usuario?.rol);
  const isAdmin=S.usuario?.rol==='admin';
  if(f.estado==='causada'&&isTesorero){
    if(!f.soporte_pago)acc.push(`<button class="btn btn-warning btn-sm" onclick="mSubirSoporte('${id}')">📤 Adjuntar soporte</button>`);
    if(f.soporte_pago)acc.push(`<button class="btn btn-secondary btn-sm" onclick="verSoporte('${id}')">📎 Ver soporte</button>`);
    acc.push(`<button class="btn btn-primary btn-sm" onclick="mPagar('${id}')">✓ Marcar pagada</button>`);
  }
  if(isAdmin)acc.push(`<button class="btn btn-danger btn-sm" onclick="delFactura('${id}','${esc(f.numero_factura)}')">🗑️ Eliminar</button>`);
  showM(`Factura ${f.numero_factura}`,`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Proveedor</div><div style="font-weight:600;margin-top:4px">${esc(f.proveedor_nombre||f.nombre_emisor||'—')}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">NIT Emisor</div><div style="font-weight:600;margin-top:4px">${esc(f.nit_emisor||f.proveedor_nit||'—')}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Valor total</div><div style="font-weight:700;font-size:18px;margin-top:4px">${fmt(f.valor_total||0)}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">IVA</div><div style="font-weight:600;margin-top:4px">${fmt(f.valor_iva||0)}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Fecha factura</div><div style="font-weight:500;margin-top:4px">${fdate(f.fecha_factura||f.recibida_en)}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Estado</div><div style="margin-top:4px">${bdg(f.estado)}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Centro de operación</div><div style="font-weight:600;margin-top:4px">${esc(f.centro_operacion_nombre||'—')}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Área</div><div style="font-weight:500;margin-top:4px">${esc(f.area_nombre||'—')}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Categoría</div><select id="fc-cat" style="margin-top:4px;padding:6px;border-radius:4px;border:1px solid var(--border);background:var(--bg);color:var(--text);width:100%" onchange="cambiarCat('${id}',this.value)"><option value="">— Seleccionar categoría —</option>${S.cats.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(c=>`<option value="${c.id}" ${f.categoria_id===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('')}</select>${catsPref.length?`<div style="font-size:11px;color:var(--muted);margin-top:8px">💡 Más usadas para este proveedor:</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${catsPref.map(cp=>`<span onclick="cambiarCat('${id}','${cp.id}')" style="cursor:pointer;padding:4px 8px;background:var(--surface);border-radius:4px;font-size:12px;color:var(--text);border:1px solid var(--border)">${esc(cp.nombre)} (${cp.contador})</span>`).join('')}</div>`:''}</div>
      ${f.centro_costos?`<div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Centro de costos</div><div style="font-weight:600;margin-top:4px">${esc(f.centro_costos)}</div></div>`:''}
      ${f.referencia?`<div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Orden de compra</div><div style="font-weight:500;margin-top:4px">${esc(f.referencia)}</div></div>`:''}
      ${f.descripcion_gasto?`<div style="grid-column:1/-1;background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Descripción del gasto</div><div style="margin-top:4px">${esc(f.descripcion_gasto)}</div></div>`:''}
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Recibida</div><div style="font-weight:500;margin-top:4px">${fdate(f.recibida_en)}</div></div>
      <div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Límite DIAN</div><div style="font-weight:500;margin-top:4px;color:${f.dian_tacita?'var(--warning)':'inherit'}">${fdate(f.limite_dian)}${f.dian_tacita?' (tácita)':''}</div></div>
      ${f.limite_pago?`<div style="background:var(--surface2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Límite de pago</div><div style="font-weight:600;margin-top:4px;color:${new Date(f.limite_pago)<new Date()?'var(--danger)':'var(--success)'}">${fdate(f.limite_pago)} ${new Date(f.limite_pago)<new Date()?'(vencida)':''}</div></div>`:''}
      ${f.cufe?`<div style="grid-column:1/-1;background:var(--surface2);padding:10px 12px;border-radius:8px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">CUFE</div><div style="font-family:monospace;font-size:11px;margin-top:4px;word-break:break-all">${esc(f.cufe)}</div></div>`:''}
      ${f.soporte_pago?`<div style="grid-column:1/-1;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--success);text-transform:uppercase;letter-spacing:.5px;font-weight:600">✓ Soporte de pago adjunto</div><div style="color:var(--muted);font-size:13px;margin-top:4px">${esc(f.soporte_pago_nombre||f.soporte_pago)}</div></div>`:''}
      ${f.pagada_en?`<div style="grid-column:1/-1;background:rgba(110,231,183,.1);border:1px solid rgba(110,231,183,.2);padding:12px;border-radius:8px"><div style="font-size:10px;color:#6EE7B7;text-transform:uppercase;letter-spacing:.5px;font-weight:600">✓ Pagada</div><div style="color:var(--muted);font-size:13px;margin-top:4px">${fdate(f.pagada_en)}</div></div>`:''}
    </div>
    ${f.motivo_rechazo?`<div style="background:rgba(248,113,113,.1);border-left:3px solid var(--danger);padding:12px;border-radius:0 8px 8px 0;margin-bottom:16px"><div style="font-size:11px;color:var(--danger);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Motivo de rechazo</div><div style="color:var(--danger);margin-top:4px">${esc(f.motivo_rechazo)}</div></div>`:''}
    <div style="margin-bottom:16px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Progreso del flujo</div><div style="display:flex;align-items:center;overflow-x:auto;padding-bottom:4px">${prog}</div></div>
    <div style="margin-bottom:16px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Historial</div>
    <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">
      ${(f.eventos||[]).map(ev=>`<div style="display:flex;gap:10px;font-size:13px;padding:8px;background:var(--surface2);border-radius:6px"><span style="color:var(--muted);white-space:nowrap">${fdate(ev.creado_en)}</span><span style="color:var(--accent)">${ev.tipo}</span><span style="color:var(--text);flex:1">${esc(ev.comentario||'')}${ev.usuario_nombre?` <em style="color:var(--muted)">— ${esc(ev.usuario_nombre)}</em>`:''}</span></div>`).join('')||'<div style="color:var(--muted);font-size:13px">Sin eventos</div>'}
    </div></div>
    <div class="modal-footer">${f.archivo_pdf?`<button onclick="verPdf('${id}')" class="btn btn-secondary btn-sm">📄 Ver PDF</button>`:''}<button class="btn btn-secondary btn-sm" onclick="closeM()">Cerrar</button>${acc.join('')}</div>`,640);
}

async function mAprobar(id){
  const f=await api('GET',`/facturas/${id}`);
  if(!S.centros)S.centros=await api('GET','/centros');
  const ao=S.areas.map(a=>`<option value="${a.id}" ${f.area_responsable_id===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');
  const co=S.centros.map(c=>`<option value="${c.id}" ${f.centro_operacion_id===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('');
  const ordenDelXml=f.orden_compra?`<div style="font-size:11px;color:var(--success);margin-top:4px">✓ Orden de compra detectada del XML: <strong>${esc(f.orden_compra)}</strong></div>`:'';
  showM('Información de aprobación',`
    <div style="margin-bottom:16px;padding:12px;background:rgba(79,142,247,.1);border-radius:8px;border:1px solid rgba(79,142,247,.2)">
      <div style="font-size:12px;color:var(--muted)">Factura</div>
      <div style="font-weight:700;font-size:16px">${esc(f.numero_factura)}</div>
      <div style="font-size:14px;margin-top:4px">${esc(f.proveedor_nombre||f.nombre_emisor||'—')}</div>
      <div style="font-size:20px;font-weight:700;color:var(--accent);margin-top:8px">${fmt(f.valor_total||0)}</div>
      ${ordenDelXml}
    </div>
    <div class="form-grid">
      <div class="field"><label>CENTRO DE OPERACIÓN *</label><select id="ap-centro"><option value="">— Seleccionar centro —</option>${co}</select></div>
      <div class="field"><label>ÁREA DE DESTINO</label><select id="ap-area"><option value="">— Seleccionar área —</option>${ao}</select></div>
    </div>
    <div class="form-grid">
      <div class="field"><label>CENTRO DE COSTOS</label><input type="text" id="ap-cc" value="${esc(f.centro_costos||'')}" placeholder="Ej: CC-001"/></div>
      <div class="field"><label>ORDEN DE COMPRA / REFERENCIA</label><input type="text" id="ap-ref" value="${esc(f.orden_compra||f.referencia||'')}" placeholder="OC-2025-0042"/></div>
    </div>
    <div class="field"><label>DESCRIPCIÓN DEL GASTO</label><textarea id="ap-desc" rows="3" placeholder="Ej: Compra de teclado ergonomic para el area de sistemas...">${esc(f.descripcion_gasto||'')}</textarea></div>
    <div class="field"><label>COMENTARIO (Opcional)</label><textarea id="ap-com" rows="2" placeholder="Observaciones adicionales..."></textarea></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-success" onclick="doAprobar('${id}')">✓ Confirmar aprobación</button></div>
  `,560);
}

async function doAprobar(id){
  const centro_id=$('ap-centro')?.value;
  const area_id=$('ap-area')?.value;
  if(!centro_id){toast('Selecciona el centro de operación','error');return}
  const b={
    centro_operacion_id:centro_id,
    ...(area_id && {area_responsable_id:area_id}),
    centro_costos:$('ap-cc')?.value?.trim()||null,
    descripcion_gasto:$('ap-desc')?.value?.trim()||null,
    referencia:$('ap-ref')?.value?.trim()||null,
    comentario:$('ap-com')?.value?.trim()||null
  };
  try{
    await api('PATCH',`/facturas/${id}/aprobar`,b);
    closeM();
    toast('Factura aprobada','success');
    goTo(S.view);
  }catch(e){toast(e.message,'error')}
}

async function mRechazar(id){
  showM('Rechazar factura',`
    <div style="margin-bottom:16px;padding:12px;background:rgba(248,113,113,.1);border-radius:8px;border:1px solid rgba(248,113,113,.2)">
      <div style="font-size:12px;color:var(--muted)">¿Por qué rechazas esta factura?</div>
    </div>
    <div class="field"><label>MOTIVO DEL RECHAZO *</label><textarea id="rechazo-motivo" rows="4" placeholder="Ej: Factura duplicada, valores incorrectos, falta orden de compra..."></textarea></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-danger" onclick="doRechazar('${id}')">✗ Confirmar rechazo</button></div>
  `,400);
}

async function doRechazar(id){
  const motivo=$('rechazo-motivo')?.value?.trim();
  if(!motivo){toast('Ingresa el motivo del rechazo','error');return}
  try{
    await api('PATCH',`/facturas/${id}/rechazar`,{motivo});
    closeM();
    toast('Factura rechazada','success');
    goTo(S.view);
  }catch(e){toast(e.message,'error')}
}

async function acF(id,a){
  let b={};
  try{await api('PATCH',`/facturas/${id}/${a}`,b);closeM();toast('Acción ejecutada','success');goTo(S.view)}catch(e){toast(e.message,'error')}
}

// ─── NUEVA FACTURA ───────────────────────────────────────────────────────────
async function mNuevaF(){
  if(!S.areas?.length)S.areas=await api('GET','/areas');
  if(!S.cats?.length)S.cats=await api('GET','/categorias');
  const ao=S.areas.map(a=>`<option value="${a.id}">${esc(a.nombre)}</option>`).join('');
  const co=S.cats.map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  window.gF=async()=>{
    const n=$('fn-num').value.trim();if(!n){toast('Número de factura requerido','error');return}
    const v=parseFloat($('fn-val').value)||0,iv=parseFloat($('fn-iva').value)||0;
    const fd=new FormData();
    fd.append('numero_factura',n);fd.append('valor',v);fd.append('valor_iva',iv);fd.append('valor_total',v+iv);
    if($('fn-cat').value)fd.append('categoria_id',$('fn-cat').value);
    if($('fn-area').value)fd.append('area_responsable_id',$('fn-area').value);
    if($('fn-lp').value)fd.append('limite_pago',$('fn-lp').value);
    if($('fn-ob').value)fd.append('observaciones',$('fn-ob').value);
    if($('fn-pdf').files[0])fd.append('pdf',$('fn-pdf').files[0]);
    try{await api('POST','/facturas',fd,true);closeM();toast('Factura creada','success');goTo('facturas')}catch(e){toast(e.message,'error')}
  };
  showM('Nueva factura',`
    <div class="field"><label>NÚMERO DE FACTURA *</label><input id="fn-num" placeholder="FV-2025-0001"/></div>
    <div class="form-grid">
      <div class="field"><label>VALOR BASE</label><input id="fn-val" type="number" placeholder="0"/></div>
      <div class="field"><label>IVA</label><input id="fn-iva" type="number" placeholder="0"/></div>
    </div>
    <div class="form-grid">
      <div class="field"><label>CATEGORÍA</label><select id="fn-cat"><option value="">— Seleccionar —</option>${co}</select></div>
      <div class="field"><label>ÁREA</label><select id="fn-area"><option value="">— Seleccionar —</option>${ao}</select></div>
    </div>
    <div class="field"><label>LÍMITE DE PAGO</label><input id="fn-lp" type="date"/></div>
    <div class="field"><label>OBSERVACIONES</label><textarea id="fn-ob" rows="2" placeholder="Notas adicionales..."></textarea></div>
    <div class="field"><label>ARCHIVO PDF</label><input id="fn-pdf" type="file" accept=".pdf" style="color:var(--text)"/></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="gF()">Crear factura</button></div>`,560);
}

// ─── SOPORTE DE PAGO ────────────────────────────────────────────────────────
function mSubirSoporte(id){
  showM('Adjuntar soporte de pago',`
    <div style="padding:8px 0">
      <p style="color:var(--muted);margin-bottom:16px">Adjunta el comprobante de pago (transferencia, screenshot, etc.)</p>
      <div class="field"><label>ARCHIVO (PDF, PNG, JPG)</label><input type="file" id="sp-archivo" accept=".pdf,.png,.jpg,.jpeg,.gif" style="color:var(--text)"/></div>
      <div style="font-size:11px;color:var(--muted);margin-top:8px">Formatos: PDF, PNG, JPG, GIF. Máximo 10MB.</div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="doSubirSoporte('${id}')">Subir archivo</button></div>
  `,400);
}

async function doSubirSoporte(id){
  const fileInput=$('sp-archivo');
  if(!fileInput?.files?.length){toast('Selecciona un archivo','error');return}
  const file=fileInput.files[0];
  const fd=new FormData();
  fd.append('soporte',file);
  try{
    await api('POST',`/facturas/${id}/soporte-pago`,fd,true);
    closeM();
    toast('Soporte adjuntado','success');
    abrirF(id);
  }catch(e){toast(e.message,'error')}
}

function verSoporte(id){window.open(`/api/facturas/${id}/soporte-pago`,'_blank')}

function mPagar(id){
  showM('Confirmar pago',`
    <div style="padding:8px 0;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">💰</div>
      <p style="color:var(--muted);margin-bottom:8px">¿Confirmar que esta factura ha sido pagada?</p>
      <p style="font-size:13px;color:var(--muted)">Esta acción registrará la fecha de pago y moverá la factura a estado "Pagada".</p>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="acF('${id}','pagar')">✓ Confirmar pago</button></div>
  `,380);
}

// ─── CATEGORÍAS ─────────────────────────────────────────────────────────────
catExp=null;
async function rCats(){
  S.areas=await api('GET','/areas');S.cats=await api('GET','/categorias');
  $('content').innerHTML=`<div class="page-header"><div><div class="page-title">Categorías</div><div class="page-sub">Tipos de compra y flujo de aprobación</div></div><button class="btn btn-primary" onclick="mCat()">+ Nueva</button></div><div id="clist"></div>`;
  renderClist();
}
function renderClist(){
  const el=$('clist');if(!el)return;
  if(!S.cats.length){el.innerHTML='<div class="empty">No hay categorías</div>';return}
  el.innerHTML=S.cats.map(cat=>{const an=(cat.areas||[]).map(a=>a.nombre);const ex=catExp===cat.id;
    return`<div class="tbl" style="margin-bottom:10px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;cursor:pointer" onclick="togCat('${cat.id}')">
        <span style="width:12px;height:12px;border-radius:50%;background:${cat.color};flex-shrink:0"></span>
        <div style="flex:1"><div style="font-weight:600">${esc(cat.nombre)}</div><div style="font-size:12px;color:var(--muted)">${esc(cat.descripcion||'')}</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${an.map(n=>`<span class="tag">${esc(n)}</span>`).join('')}</div>
        <div style="display:flex;gap:6px" onclick="event.stopPropagation()"><button class="btn btn-secondary btn-sm" onclick="mCat('${cat.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="delCat('${cat.id}')">🗑️</button></div>
        <span style="color:var(--muted)">${ex?'▲':'▼'}</span>
      </div>
      ${ex?`<div style="padding:16px 20px;border-top:1px solid var(--border)">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Flujo de aprobación</div>
        <div class="progress-line">${PASOS.map((p,i)=>{const a=(cat.pasos||[]).includes(p.id);return`<div class="fs${a?' active':''}"><div class="fs-l">${p.l}</div><div class="fs-d">${p.d}</div></div>${i<PASOS.length-1?`<div class="fc2${a?' active':''}"></div>`:''}`}).join('')}</div>
      </div>`:''}
    </div>`}).join('');
}
function togCat(id){catExp=catExp===id?null:id;renderClist()}
async function mCat(id){
  let cat=null;
  if(id)cat=S.cats.find(c=>c.id===id)||await api('GET',`/categorias/${id}`);
  const form=cat?{nombre:cat.nombre,desc:cat.descripcion||'',color:cat.color||'#3B82F6',pasos:[...(cat.pasos||[])]}:{nombre:'',desc:'',color:'#3B82F6',pasos:['recepcion','revision','aprobacion','causacion']};
  function rr(){
    const cp=$('cp');if(cp)cp.innerHTML=COLS.map(c=>`<div class="cd${form.color===c?' sel':''}" style="background:${c};outline-color:${c}" onclick="sCo('${c}')"></div>`).join('');
    const cpa=$('cpa');if(cpa)cpa.innerHTML=PASOS.map(p=>{const s=form.pasos.includes(p.id);const f=p.id==='recepcion';return`<div class="ci${s&&!f?' sel':''}" style="${f?'opacity:.5':''}" ${f?'':'onclick="tP(\''+p.id+'\')"'}><div class="cb${s&&!f?' sel':''}">${s&&!f?'✓':''}</div><div style="flex:1"><span style="font-size:13px">${p.l}</span><span style="font-size:11px;color:var(--muted);margin-left:8px">${p.d}</span></div>${f?'<span class="tag">obligatorio</span>':''}</div>`}).join('');
  }
  window.sCo=c=>{form.color=c;rr()};
  window.tP=pid=>{form.pasos=form.pasos.includes(pid)?form.pasos.filter(x=>x!==pid):[...form.pasos,pid];rr()};
  window.saveCat=async()=>{const n=$('cn').value.trim();if(!n){toast('Nombre requerido','error');return}form.nombre=n;form.desc=$('cd').value.trim();try{if(id)await api('PUT',`/categorias/${id}`,{nombre:form.nombre,descripcion:form.desc,color:form.color,pasos:form.pasos});else await api('POST','/categorias',{nombre:form.nombre,descripcion:form.desc,color:form.color,pasos:form.pasos});closeM();toast('Categoría guardada','success');await rCats()}catch(e){toast(e.message,'error')}};
  showM(id?'Editar categoría':'Nueva categoría',`
    <div class="field"><label>NOMBRE *</label><input id="cn" value="${esc(form.nombre)}" placeholder="Ej: Tecnología"/></div>
    <div class="field"><label>DESCRIPCIÓN</label><textarea id="cd" rows="2">${esc(form.desc)}</textarea></div>
    <div style="margin-bottom:14px"><label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;display:block;margin-bottom:8px">COLOR</label><div class="cp" id="cp"></div></div>
    <div style="margin-bottom:14px"><label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;display:block;margin-bottom:8px">PASOS DEL FLUJO</label><div id="cpa"></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="saveCat()">Guardar</button></div>`,560);
  rr();
}
async function delCat(id){if(!confirm('¿Desactivar esta categoría?'))return;try{await api('DELETE',`/categorias/${id}`);toast('Categoría desactivada','success');await rCats()}catch(e){toast(e.message,'error')}}

// ─── ÁREAS ──────────────────────────────────────────────────────────────────
async function rAreas(){
  S.areas=await api('GET','/areas');
  const isAdmin=S.usuario?.rol==='admin';
  $('content').innerHTML=`<div class="page-header"><div><div class="page-title">Áreas</div><div class="page-sub">Unidades organizativas</div></div><button class="btn btn-primary" onclick="mArea()">+ Nueva área</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${S.areas.map(a=>`<div class="tbl" style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div style="font-weight:700;font-size:15px">${esc(a.nombre)}</div>
          <span class="badge ${a.activo?'b-aprobada':'b-rechazada'}" style="font-size:10px">${a.activo?'Activa':'Inactiva'}</span>
        </div>
        <div style="font-size:13px;color:var(--muted)">Jefe: ${esc(a.jefe_nombre||'—')}</div>
        ${a.email?`<div style="font-size:12px;color:var(--muted);margin-top:4px">${esc(a.email)}</div>`:''}
        ${isAdmin?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="mArea('${a.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="delArea('${a.id}','${esc(a.nombre)}')">🗑️</button>
        </div>`:''}
      </div>`).join('')}
    </div>`;
}

async function mArea(id){
  let area=null;
  if(id){
    area=S.areas.find(a=>a.id===id);
    if(!area)return;
  }
  if(!S.usuariosList){
    try{const u=await api('GET','/usuarios/simple');S.usuariosList=u;}catch(e){S.usuariosList=[]}
  }
  window.saveArea=async()=>{
    const n=$('an')?.value?.trim();
    if(!n){toast('Nombre requerido','error');return}
    try{
      if(id){
        await api('PUT',`/areas/${id}`,{
          nombre:n,
          jefe_id:$('aj')?.value||null,
          email:$('ae')?.value?.trim()||null,
          activo:$('aa-activo')?.checked??true
        });
      }else{
        await api('POST','/areas',{
          nombre:n,
          jefe_id:$('aj')?.value||null,
          email:$('ae')?.value?.trim()||null
        });
      }
      closeM();
      toast(id?'Área actualizada':'Área creada','success');
      rAreas();
    }catch(e){toast(e.message,'error')}
  };
  const opts=S.usuariosList.map(u=>`<option value="${u.id}" ${area?.jefe_id===u.id?'selected':''}>${esc(u.nombre)}</option>`).join('');
  showM(id?'Editar área':'Nueva área',`
    <div class="field"><label>NOMBRE *</label><input id="an" value="${esc(area?.nombre||'')}" placeholder="Ej: Sistemas"/></div>
    <div class="field"><label>JEFE</label><select id="aj"><option value="">— Sin asignar —</option>${opts}</select></div>
    <div class="field"><label>CORREO</label><input id="ae" type="email" value="${esc(area?.email||'')}" placeholder="area@tu-dominio.com"/></div>
    ${id?`<div class="field"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="aa-activo" ${area?.ativo!==false?'checked':''}/> Área activa</label></div>`:''}
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="saveArea()">Guardar</button></div>
  `,400);
}

async function delArea(id,nombre){
  if(!confirm(`¿Eliminar el área "${nombre}"?`))return;
  try{
    await api('DELETE',`/areas/${id}`);
    toast('Área eliminada','success');
    rAreas();
  }catch(e){toast(e.message,'error')}
}

// ─── USUARIOS ────────────────────────────────────────────────────────────────
async function rUsers(){
  const [us, areas, cats] = await Promise.all([
    api('GET','/usuarios'),
    api('GET','/areas'),
    api('GET','/categorias')
  ]);
  S.areas=areas;
  S.cats=cats;
  const isAdmin=S.usuario?.rol==='admin';
  $('content').innerHTML=`<div class="page-header"><div><div class="page-title">Usuarios</div><div class="page-sub">Gestión de accesos y permisos</div></div><button class="btn btn-primary" onclick="mUser()">+ Nuevo</button></div>
    <div class="tbl">
      <table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Área</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
      <tbody>${us.map(u=>`<tr>
        <td style="font-weight:500">${esc(u.nombre)}</td>
        <td style="color:var(--muted)">${esc(u.email)}</td>
        <td><span class="tag">${u.rol}</span></td>
        <td style="color:var(--muted)">${esc(u.area_nombre||'—')}</td>
        <td style="color:var(--muted)">${u.ultimo_acceso?fdate(u.ultimo_acceso):'Nunca'}</td>
        <td><span class="badge ${u.activo?'b-aprobada':'b-rechazada'}">${u.activo?'Activo':'Inactivo'}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-secondary btn-sm" onclick="mUser('${u.id}')">✏️</button>
          ${isAdmin&&u.id!==S.usuario?.id?(u.activo?
            `<button class="btn btn-warning btn-sm" onclick="toggleUser('${u.id}',false)" title="Inactivar">⛔</button>`:
            `<button class="btn btn-success btn-sm" onclick="toggleUser('${u.id}',true)" title="Activar">✅</button>`):''}
          ${isAdmin&&u.id!==S.usuario?.id?`<button class="btn btn-danger btn-sm" onclick="delUser('${u.id}','${esc(u.nombre)}')" title="Eliminar">🗑️</button>`:''}
        </td>
      </tr>`).join('')}</tbody></table>
    </div>`;
}

async function toggleUser(id,activo){
  try{
    await api('PUT',`/usuarios/${id}`,{activo});
    toast(activo?'Usuario activado':'Usuario inactivado','success');
    rUsers();
  }catch(e){toast(e.message,'error')}
}

async function delUser(id,nombre){
  if(!confirm(`¿Eliminar definitivamente al usuario "${nombre}"?`))return;
  try{
    await api('DELETE',`/usuarios/${id}`);
    toast('Usuario eliminado','success');
    rUsers();
  }catch(e){toast(e.message,'error')}
}

async function delFactura(id,numero){
  if(!confirm(`¿Eliminar la factura "${numero}"? Esta acción no se puede deshacer.`))return;
  try{
    await api('DELETE',`/facturas/${id}`);
    toast('Factura eliminada','success');
    if(S.view==='facturas')rFacturas();
    closeM();
  }catch(e){toast(e.message,'error')}
}

async function mUser(id){
  let usr=null;
  if(id){
    const us=await api('GET','/usuarios');
    usr=us.find(u=>u.id===id);
    if(!usr)return;
  }
  if(!S.cats)S.cats=await api('GET','/categorias/todas');
  const ao=S.areas.map(a=>`<option value="${a.id}" ${usr?.area_id===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');
  const catsIds=usr?.categoria_ids||[];
  const co=S.cats.map(c=>`<div class="cat-item" onclick="togCatU('${c.id}')">
    <div class="cat-check" id="cc-${c.id}">${catsIds.includes(c.id)?'✓':''}</div>
    <div class="cat-dot" style="background:${c.color}"></div>
    <div class="cat-name">${esc(c.nombre)}</div>
    <input type="checkbox" class="ucat" value="${c.id}" ${catsIds.includes(c.id)?'checked':''} style="display:none"/>
  </div>`).join('');
  
  window.saveUser=async()=>{
    const catIds=[...document.querySelectorAll('.ucat:checked')].map(el=>el.value);
    try{
      if(id){
        await api('PUT',`/usuarios/${id}`,{
          nombre:$('un')?.value?.trim(),
          email:$('ue')?.value?.trim(),
          rol:$('ur')?.value,
          area_id:$('ua')?.value||null,
          activo:$('ua-activo')?.checked??true,
          password:$('up')?.value||null
        });
        await api('PUT',`/categorias/usuario/${id}`,{categoria_ids:catIds});
      }else{
        await api('POST','/usuarios',{
          nombre:$('un')?.value?.trim(),
          email:$('ue')?.value?.trim(),
          password:$('up')?.value,
          rol:$('ur')?.value,
          area_id:$('ua')?.value||null
        });
      }
      closeM();
      toast('Usuario guardado','success');
      await rUsers();
    }catch(e){toast(e.message,'error')}
  };
  
  showM(id?'Editar usuario':'Nuevo usuario',`
    <div class="field"><label>NOMBRE *</label><input id="un" value="${esc(usr?.nombre||'')}" placeholder="Nombre completo"/></div>
    <div class="field"><label>EMAIL *</label><input id="ue" type="email" value="${esc(usr?.email||'')}" placeholder="usuario@tu-dominio.com"/></div>
    <div class="field"><label>CONTRASEÑA ${id?'(dejar vacío para no cambiar)':''}</label><input id="up" type="password" placeholder="••••••••"/></div>
    <div class="form-grid">
      <div class="field"><label>ROL</label><select id="ur"><option value="comprador" ${usr?.rol==='comprador'?'selected':''}>Comprador</option><option value="contador" ${usr?.rol==='contador'?'selected':''}>Contador</option><option value="tesorero" ${usr?.rol==='tesorero'?'selected':''}>Tesorero</option><option value="auditor" ${usr?.rol==='auditor'?'selected':''}>Auditor</option><option value="admin" ${usr?.rol==='admin'?'selected':''}>Admin</option></select></div>
      <div class="field"><label>ÁREA</label><select id="ua"><option value="">— Sin área —</option>${ao}</select></div>
    </div>
    ${id?`<div class="field"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="ua-activo" ${usr?.activo!==false?'checked':''}/> Usuario activo</label></div>`:''}
    <div style="margin-top:16px"><div style="font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">CATEGORÍAS PERMITIDAS</div>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">${co}</div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">Selecciona las categorías que puede ver. Sin selección: ve según su área.</div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="saveUser()">Guardar</button></div>
  `,560);
}

window.togCatU=function(id){
  const cb=$('cc-'+id)?.parentElement.querySelector('.ucat');
  if(!cb)return;
  cb.checked=!cb.checked;
  const el=$('cc-'+id);
  if(el)el.textContent=cb.checked?'✓':'';
};


// ─── CENTROS DE OPERACIÓN ─────────────────────────────────────────────────
async function rCentros(){
  const centros=await api('GET','/centros');
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Centros de Operación</div><div class="page-sub">Territorios y sedes de la compañía</div></div><button class="btn btn-primary" onclick="mCentro()">+ Nuevo centro</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px" id="centros-grid">
      ${centros.length?centros.map(c=>`<div class="tbl" style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div style="font-weight:700;font-size:16px">${esc(c.nombre)}</div>
          <span class="badge ${c.activo?'b-aprobada':'b-rechazada'}">${c.activo?'Activo':'Inactivo'}</span>
        </div>
        ${c.codigo?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">📍 ${esc(c.codigo)}</div>`:''}
        ${c.direccion?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">🏠 ${esc(c.direccion)}</div>`:''}
        ${c.telefono?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">📞 ${esc(c.telefono)}</div>`:''}
        ${c.email?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">✉️ ${esc(c.email)}</div>`:''}
        ${c.descripcion?`<div style="font-size:12px;color:var(--text);margin-top:8px;border-top:1px solid var(--border);padding-top:8px">${esc(c.descripcion)}</div>`:''}
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="mCentro('${c.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="delCentro('${c.id}','${esc(c.nombre)}')">🗑️</button>
        </div>
      </div>`).join(''):'<div class="empty" style="grid-column:1/-1">No hay centros registrados</div>'}
    </div>
  `;
}

async function mCentro(id){
  let centro=null;
  if(id)centro=await api('GET',`/centros/${id}`);
  const esNuevo=!id;
  window.saveCentro=async()=>{
    const n=$('cn-nombre')?.value?.trim();
    if(!n){toast('El nombre es requerido','error');return}
    const data={
      nombre:n,
      codigo:$('cn-codigo')?.value?.trim()||null,
      descripcion:$('cn-desc')?.value?.trim()||null,
      direccion:$('cn-dir')?.value?.trim()||null,
      telefono:$('cn-tel')?.value?.trim()||null,
      email:$('cn-email')?.value?.trim()||null,
      activo:$('cn-activo')?.checked??true
    };
    try{
      if(esNuevo)await api('POST','/centros',data);
      else await api('PUT',`/centros/${id}`,data);
      closeM();
      toast('Centro guardado','success');
      rCentros();
    }catch(e){toast(e.message,'error')}
  };
  showM(esNuevo?'Nuevo centro':'Editar centro',`
    <div class="field"><label>NOMBRE *</label><input id="cn-nombre" value="${esc(centro?.nombre||'')}" placeholder="Ej: Bogotá Centro"/></div>
    <div class="form-grid">
      <div class="field"><label>CÓDIGO</label><input id="cn-codigo" value="${esc(centro?.codigo||'')}" placeholder="Ej: BOG-01"/></div>
      <div class="field"><label>EMAIL</label><input id="cn-email" type="email" value="${esc(centro?.email||'')}" placeholder="sede@tu-dominio.com"/></div>
    </div>
    <div class="field"><label>DIRECCIÓN</label><input id="cn-dir" value="${esc(centro?.direccion||'')}" placeholder="Dirección completa"/></div>
    <div class="form-grid">
      <div class="field"><label>TELÉFONO</label><input id="cn-tel" value="${esc(centro?.telefono||'')}" placeholder="+57 1 234 5678"/></div>
      <div class="field"><label>ESTADO</label><label style="display:flex;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="cn-activo" ${centro?.activo!==false?'checked':''}/> Activo</label></div>
    </div>
    <div class="field"><label>DESCRIPCIÓN</label><textarea id="cn-desc" rows="2" placeholder="Descripción u observaciones...">${esc(centro?.descripcion||'')}</textarea></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeM()">Cancelar</button><button class="btn btn-primary" onclick="saveCentro()">Guardar</button></div>
  `,500);
}

async function delCentro(id,nombre){
  if(!confirm(`¿Eliminar el centro "${nombre}"?`))return;
  try{await api('DELETE',`/centros/${id}`);toast('Centro eliminado','success');rCentros()}catch(e){toast(e.message,'error')}
}

async function cambiarCat(facturaId,catId){
  try{
    await api('PATCH',`/facturas/${facturaId}/categoria`,{categoria_id:catId});
    toast('Categoría actualizada','success');
    abrirF(facturaId);
  }catch(e){toast(e.message,'error')}
}

// ─── INIT ───────────────────────────────────────────────────────────────────
if(S.token&&S.usuario){showApp()}else{$('app-screen').classList.remove('show');$('login-screen').style.display='flex'}
setInterval(refreshBadges,60000);

async function cargarConfigGlobal(){
  try{
    const cfg=await api('GET','/configuracion');
    if(cfg.app_nombre?.valor){
      document.title=cfg.app_nombre.valor;
      S.appNombre=cfg.app_nombre.valor;
    }
    if(cfg.empresa_logo?.valor){
      S.empresaLogo=cfg.empresa_logo.valor;
      const logoEl=$('header-logo');
      if(logoEl)logoEl.innerHTML='<img src="'+cfg.empresa_logo.valor+'" style="height:32px;border-radius:6px"/>';
      const loginLogo=$('login-logo-container');
      if(loginLogo)loginLogo.innerHTML='<img src="'+cfg.empresa_logo.valor+'" style="max-height:60px;max-width:200px;border-radius:8px"/>';
    }
    if(cfg.empresa_nombre?.valor){
      S.empresaNombre=cfg.empresa_nombre.valor;
      const loginLogo=$('login-logo-container');
      if(loginLogo&&!S.empresaLogo)loginLogo.innerHTML='<div class="login-logo">'+cfg.empresa_nombre.valor.toUpperCase()+'</div>';
    }
  }catch(e){}
}
cargarConfigGlobal();

async function crearArea(){
  const nombre=$('new-area-nombre')?.value?.trim();
  const jefe_id=$('new-area-jefe')?.value||null;
  const email=$('new-area-email')?.value?.trim();
  if(!nombre){toast('El nombre es requerido','error');return}
  try{
    await api('POST','/areas',{nombre,jefe_id,email});
    toast('Área creada','success');
    closeM();
    rConfig();
  }catch(e){toast(e.message,'error')}
}

async function editarArea(id,nombre,jefe_id,email){
  const users=(S.usuarios||[]).filter(u=>u.rol==='jefe'||u.rol==='admin');
  showM('Editar área','<div class=form-grid><div class=field full><label>NOMBRE</label><input type=text id=edit-area-nombre value='+esc(nombre)+'/></div><div class=field><label>JEFE (opcional)</label><select id=edit-area-jefe><option value=>— Sin jefe —</option>'+users.map(u=>'<option value='+u.id+' '+(u.id===jefe_id?'selected':'')+'>'+esc(u.nombre)+'</option>').join('')+'</select></div><div class=field><label>EMAIL</label><input type=email id=edit-area-email value='+esc(email||'')+'/></div></div><div style=display:flex;gap:10px;margin-top:16px><button class=btn btn-danger onclick=eliminarArea(\''+id+'\')>Eliminar</button><button class=btn btn-primary style=margin-left:auto onclick=guardarArea(\''+id+'\')>Guardar</button></div>');
}

async function guardarArea(id){
  const nombre=$('edit-area-nombre')?.value?.trim();
  const jefe_id=$('edit-area-jefe')?.value||null;
  const email=$('edit-area-email')?.value?.trim();
  if(!nombre){toast('El nombre es requerido','error');return}
  try{
    await api('PUT',`/areas/${id}`,{nombre,jefe_id,email});
    toast('Área actualizada','success');
    closeM();
    rConfig();
  }catch(e){toast(e.message,'error')}
}

async function eliminarArea(id){
  if(!confirm('¿Eliminar esta área? Los usuarios quedan sin área asignada.'))return;
  try{
    await api('DELETE',`/areas/${id}`);
    toast('Área eliminada','success');
    closeM();
    rConfig();
  }catch(e){toast(e.message,'error')}
}
