// soporte.js - Soporte de pago upload/view for DocFlow

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
