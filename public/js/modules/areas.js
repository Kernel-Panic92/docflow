// areas.js - Area management for DocFlow

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
