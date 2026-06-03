// dashboard.js - Dashboard rendering, sync, and charts for DocFlow

let _chartJsLoaded = false;
const _charts = {};

function cargarChartJs() {
  if (_chartJsLoaded) return Promise.resolve();
  if (typeof Chart !== 'undefined') { _chartJsLoaded = true; return Promise.resolve(); }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => { _chartJsLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(s);
  });
}

function crearOActualizar(id, config) {
  if (!config.options) config.options = {};
  if (_charts[id]) {
    _charts[id].data = config.data;
    _charts[id].options = config.options;
    _charts[id].update();
  } else {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    _charts[id] = new Chart(ctx, config);
  }
}

function destruirCharts() {
  Object.keys(_charts).forEach(k => { _charts[k].destroy(); delete _charts[k]; });
}

async function rDash(){
  const d=await api('GET','/dashboard');
  const r=d.resumen;
  const rol=S.usuario?.rol;
  const esComprador=rol==='comprador';
  const esTesorero=['tesorero','admin'].includes(rol);
  const esAdmin=rol==='admin';
  const sync=await checkSyncStatus();
  if(sync.sincronizando){
    startSyncPoll();
  }else{
    stopSyncPoll();
  }
  let stats='';
  if(esComprador){
    stats+=stat('Pendientes aprobar',r.recibidas+r.revision,'var(--accent2)','orange');
  }else if(esAdmin){
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
  const storageHtml=await cargarStorage();
  $('content').innerHTML=`
    <div class="page-header"><div><div class="page-title">Dashboard</div><div class="page-sub">${esTesorero?'Gestión de pagos':esComprador?'Facturas por aprobar':'Resumen general'}</div></div></div>
    ${!esComprador?sync.bar:''}
    <div class="stats-row">${stats}${storageHtml}</div>
    <div class="tbl">
      <div class="tbl-head"><div class="tbl-title">Actividad reciente</div><button class="btn btn-primary btn-sm" onclick="mNuevaF()">+ Nueva</button></div>
      <table><thead><tr><th># Factura</th><th>Proveedor</th><th>Categoría</th><th>Valor</th><th>Estado</th><th>Recibida</th><th></th></tr></thead>
      <tbody>${rc.length?rc.map(f=>`<tr onclick="abrirF('${f.id}')"><td class="mono">${esc(f.numero_factura)}</td><td style="font-weight:500">${esc(f.proveedor_nombre||'—')}</td><td>${ctag(f.categoria_color,f.categoria_nombre)}</td><td style="font-weight:500">${fmt(f.valor_total||f.valor||0)}</td><td>${bdg(f.estado)}</td><td style="color:var(--muted);font-size:12px">${fdatetime(f.recibida_en)}</td><td>${f.archivo_pdf?`<span onclick="event.stopPropagation();verPdf('${f.id}')" title="Ver PDF" style="color:var(--accent);font-size:16px;cursor:pointer">📄</span>`:''}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Sin facturas</td></tr>'}</tbody></table>
    </div>
    ${esAdmin||esTesorero?`
    <div style="margin-top:28px"><div style="font-family:var(--font-head);font-size:18px;font-weight:700;margin-bottom:16px">📊 Gráficos</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px">
        <div class="tbl" style="padding:20px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Facturas por Mes</div><canvas id="chart-mes" height="200"></canvas></div>
        <div class="tbl" style="padding:20px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Distribución por Estado</div><canvas id="chart-estado" height="200"></canvas></div>
        <div class="tbl" style="padding:20px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Top Proveedores</div><canvas id="chart-proveedor" height="200"></canvas></div>
        <div class="tbl" style="padding:20px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Facturas por Categoría</div><canvas id="chart-categoria" height="200"></canvas></div>
        <div class="tbl" style="padding:20px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Valor por Mes</div><canvas id="chart-valor" height="200"></canvas></div>
        <div class="tbl" style="padding:20px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Facturas por Área</div><canvas id="chart-area" height="200"></canvas></div>
      </div>
    </div>`:''}`;
  refreshBadges();
  if(esAdmin||esTesorero) renderCharts();
}
function stat(l,v,c,s){return`<div class="stat-card"><div class="stat-label">${l}</div><div class="stat-value ${c}">${v}</div>${s?`<div class="stat-s">${s}</div>`:''}</div>`}

async function cargarStorage(){
  try{
    const s=await api('GET','/dashboard/storage');
    if(s.error||!s.total_gb)return '';
    const pct=s.percent_used;
    const barColor=pct>90?'var(--danger)':pct>75?'var(--warning)':'var(--success)';
    return `<div class="stat-card" style="grid-column:span 1">
      <div class="stat-label">ALMACENAMIENTO</div>
      <div class="stat-value" style="font-size:18px;font-weight:700;color:${barColor}">${s.used_gb} GB <span style="font-size:13px;font-weight:400;color:var(--muted)">/ ${s.total_gb} GB</span></div>
      <div style="margin-top:8px;background:var(--surface2);border-radius:6px;height:6px;overflow:hidden">
        <div style="background:${barColor};height:100%;width:${Math.min(pct,100)}%;transition:width .3s"></div>
      </div>
      <div class="stat-s">${s.avail_gb} GB libres &middot; ${pct}% usado</div>
    </div>`;
  }catch{return''}
}

async function renderCharts(){
  try{
    await cargarChartJs();
    const data=await api('GET','/dashboard/charts');
    if(!data) return;

    const isLight=document.body.classList.contains('light');
    const gridColor=isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)';
    const textColor=isLight?'#2c3e50':'#e8ecf5';

    const meses=data.por_mes||[];
    const mesesLabels=meses.map(m=>{const d=new Date(m.mes);return d.toLocaleString('es',{month:'short',year:'2-digit'})});
    const mesesCounts=meses.map(m=>m.total);
    const mesesValores=meses.map(m=>parseFloat(m.valor));

    crearOActualizar('chart-mes',{
      type:'line',
      data:{labels:mesesLabels,datasets:[{label:'Facturas',data:mesesCounts,borderColor:'#4f8ef7',backgroundColor:'rgba(79,142,247,0.1)',fill:true,tension:0.4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor}},x:{grid:{color:gridColor},ticks:{color:textColor}}}}
    });

    const estados=data.por_estado||[];
    const estadoColors={'recibida':'#60A5FA','revision':'#FBBF24','aprobada':'#34D399','causada':'#A78BFA','pagada':'#6EE7B7','rechazada':'#F87171'};
    crearOActualizar('chart-estado',{
      type:'doughnut',
      data:{labels:estados.map(e=>e.estado),datasets:[{data:estados.map(e=>e.total),backgroundColor:estados.map(e=>estadoColors[e.estado]||'#7a85a0')}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:textColor}}}}
    });

    const provs=data.por_proveedor||[];
    crearOActualizar('chart-proveedor',{
      type:'bar',
      data:{labels:provs.map(p=>p.nombre),datasets:[{label:'Facturas',data:provs.map(p=>p.total),backgroundColor:'#4f8ef7',borderRadius:6}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor}},y:{grid:{color:gridColor},ticks:{color:textColor}}}}
    });

    const cats=data.por_categoria||[];
    crearOActualizar('chart-categoria',{
      type:'bar',
      data:{labels:cats.map(c=>c.nombre),datasets:[{label:'Facturas',data:cats.map(c=>c.total),backgroundColor:cats.map(c=>c.color||'#4f8ef7'),borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor}},x:{grid:{color:gridColor},ticks:{color:textColor}}}}
    });

    const valPorMes=data.valor_por_mes||[];
    const valLabels=valPorMes.map(m=>{const d=new Date(m.mes);return d.toLocaleString('es',{month:'short',year:'2-digit'})});
    const valData=valPorMes.map(m=>parseFloat(m.valor));
    crearOActualizar('chart-valor',{
      type:'bar',
      data:{labels:valLabels,datasets:[{label:'Valor',data:valData,backgroundColor:'#34D399',borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>'$'+Number(ctx.raw).toLocaleString('es-CO')}}},scales:{y:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor,callback:v=>'$'+Number(v).toLocaleString('es-CO')}},x:{grid:{color:gridColor},ticks:{color:textColor}}}}
    });

    const areas=data.por_area||[];
    crearOActualizar('chart-area',{
      type:'bar',
      data:{labels:areas.map(a=>a.nombre),datasets:[{label:'Facturas',data:areas.map(a=>a.total),backgroundColor:'#A78BFA',borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor}},x:{grid:{color:gridColor},ticks:{color:textColor}}}}
    });

  }catch(e){console.log('Chart error:',e.message)}
}

async function refreshBadges(){
}

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
let syncPollInterval=null;
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
