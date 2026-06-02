// facturas.js - Facturas listing, detail, filter, CRUD for DocFlow

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

let fFiltro='todas';
function getFiltrosKey(){return'vd_f_'+S.usuario?.id}
let fBusqueda=JSON.parse(localStorage.getItem(getFiltrosKey())||'{}');
fBusqueda.fecha_desde=fBusqueda.fecha_desde||'';
fBusqueda.fecha_hasta=fBusqueda.fecha_hasta||'';
function initFiltros(){const k=getFiltrosKey();const f=JSON.parse(localStorage.getItem(k)||'{}');f.fecha_desde=f.fecha_desde||'';f.fecha_hasta=f.fecha_hasta||'';if(f.categoria_id||f.proveedor_id)fBusqueda=f}

async function rFacturas(filtro){
  if(filtro!==undefined)fFiltro=filtro;
  
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
  
  if(!S.proveedores)S.proveedores=await api('GET','/proveedores');
  if(!S.cats?.length)S.cats=await api('GET','/categorias');
  const provOpts=S.proveedores.map(p=>`<option value="${p.id}" ${fBusqueda.proveedor_id===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('');
  const catOpts=S.cats.map(c=>`<option value="${c.id}" ${fBusqueda.categoria_id===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('');
  
  const hayFiltros=fBusqueda.numero||fBusqueda.nit||fBusqueda.fecha_desde||fBusqueda.fecha_hasta||fBusqueda.valor_min||fBusqueda.valor_max||fBusqueda.proveedor_id||fBusqueda.categoria_id||fBusqueda.buscar;
  
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Facturas</div><div class="page-sub">${f.total||0} factura(s) encontrada(s)</div></div><button class="btn btn-primary" onclick="mNuevaF()">+ Nueva factura</button></div>
    <div class="filters">${fbs}</div>
    
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
