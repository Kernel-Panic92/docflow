// api.js - Shared API helpers for DocFlow
// Extracted from public/app.js

const $=id=>document.getElementById(id);

async function api(m,p,b,isF){
  const o={method:m,headers:{Authorization:`Bearer ${S.token}`}};
  if(b&&!isF){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}
  else if(isF)o.body=b;
  const url=m==='GET'?`/api${p}${p.includes('?')?'&':'?'}_t=${Date.now()}`:`/api${p}`;
  const r=await fetch(url,o);
  if (r.status === 401) {
    localStorage.removeItem('vd_t'); localStorage.removeItem('vd_u');
    S.token = null; S.usuario = null;
    const loginEl = document.getElementById('login-screen');
    const appEl = document.getElementById('app-screen');
    if (loginEl) loginEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
    window.history.replaceState(null, '', location.pathname);
    throw new Error('Sesión expirada');
  }
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}

const GET = (p) => api('GET', p);
const POST = (p, b) => api('POST', p, b);
const PUT = (p, b) => api('PUT', p, b);
const DEL = (p) => api('DELETE', p);
