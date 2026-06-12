// pendientes.js - Pendientes, Causación and Por Pagar views for DocFlow

let pendFiltro='todas';
let pendBusqueda='';
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

let causBusqueda='';
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

let porPagarBusqueda='';
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
