// categorias.js - Category management for DocFlow

let catExp=null;
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
