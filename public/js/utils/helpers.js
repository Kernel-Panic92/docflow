// helpers.js - Shared utility functions for DocFlow
// Extracted from public/app.js

const COLS=['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#F97316','#06B6D4','#84CC16'];
const PASOS=[{id:'recepcion',l:'Recepción',d:'Sistema recibe'},{id:'revision',l:'Revisión',d:'Asigna CC'},{id:'aprobacion',l:'Aprobación',d:'Responsable'},{id:'causacion',l:'Causación',d:'Tesorería'},{id:'pagada',l:'Pagada',d:'Archivada'}];
const EORD=['recibida','revision','aprobada','causada','pagada'];
const EM={recibida:{l:'Recibida',c:'#60A5FA'},revision:{l:'En revisión',c:'#FBBF24'},aprobada:{l:'Aprobada',c:'#34D399'},causada:{l:'Causada',c:'#A78BFA'},rechazada:{l:'Rechazada',c:'#F87171'},pagada:{l:'Pagada',c:'#6EE7B7'}};

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmt(v){return '$'+Math.round(parseFloat(v)||0).toLocaleString('es-CO')}
function fdate(d){if(!d)return'—';return new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}
function fdatetime(d){if(!d)return'—';const dt=new Date(d);return dt.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})+' '+dt.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}
function bdg(e){const m=EM[e]||{l:e,c:'#888'};return`<span class="badge b-${e}">${m.l}</span>`}
function ctag(c,n){if(!n)return'<span style="color:var(--muted)">—</span>';return`<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${c||'#888'};flex-shrink:0"></span>${esc(n)}</span>`}

function toast(msg,type='info'){
  const t=$('toast');
  t.className=`toast ${type} show`;
  t.innerHTML=`<span>${type==='success'?'✓':type==='error'?'✗':'ℹ'}</span> ${esc(msg)}`;
  setTimeout(()=>t.classList.remove('show'),4000);
}

function toggleTheme(){
  S.theme=S.theme==='dark'?'light':'dark';
  document.body.className=S.theme;
  localStorage.setItem('vd_theme',S.theme);
  $('theme-btn').textContent=S.theme==='dark'?'🌙':'☀️';
}

function toggleSidebar(){$('sidebar').classList.add('open');$('mob-overlay').classList.add('visible')}
function closeSidebar(){$('sidebar').classList.remove('open');$('mob-overlay').classList.remove('visible')}

function toggleSidebarCollapse(){
  const s=$('sidebar');
  s.classList.toggle('collapsed');
  localStorage.setItem('sidebar_collapsed', s.classList.contains('collapsed'));
  const btn = $('sidebar-toggle');
  if(btn) btn.textContent = s.classList.contains('collapsed') ? '▶' : '◀';
}

function formatBytes(b){
  if(b===0)return'0 B';
  const k=1024,sizes=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(b)/Math.log(k));
  return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+sizes[i];
}
