// usuarios.js - User management for DocFlow

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
