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

$('chpass-new').addEventListener('input',function(){
  const p=this.value;
  $('req-len').style.color=p.length>=8?'var(--success)':'';
  $('req-up').style.color=/[A-Z]/.test(p)?'var(--success)':'';
  $('req-num').style.color=/[0-9]/.test(p)?'var(--success)':'';
  $('req-sym').style.color=/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(p)?'var(--success)':'';
});
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
syncPollInterval=null;

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

// ─── Version polling (new deploy detection) ──────────────────────────────
let _versionBanner=null;
function _mostrarBannerVersion(msg){
  if(_versionBanner)return;
  _versionBanner=document.createElement('div');
  _versionBanner.id='version-banner';
  _versionBanner.innerHTML=`<span>${msg}</span><button onclick="recargarApp()" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:var(--font-body)">Recargar</button>`;
  Object.assign(_versionBanner.style,{position:'fixed',top:0,left:0,right:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'10px 16px',fontSize:13,fontWeight:500,fontFamily:'var(--font-body)',background:'rgba(79,142,247,.15)',borderBottom:'1px solid var(--accent)',color:'var(--accent)',backdropFilter:'blur(8px)'});
  document.body.appendChild(_versionBanner);
  document.body.style.paddingTop='44px';
}
function recargarApp(){localStorage.removeItem('vd_last_page');location.reload()}
function _pollVersion(){
  fetch('/api/version').then(r=>r.json()).then(d=>{
    if(window._appVersion&&d.version&&d.version!==window._appVersion){
      _mostrarBannerVersion('📦 Nueva versión disponible: '+d.version+(d.branch?' ['+d.branch+']':'')+' (actual: '+window._appVersion+(window._appBranch?' ['+window._appBranch+']':'')+')');
    }
  }).catch(()=>{});
}
setInterval(_pollVersion,60000);

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
