const params = new URLSearchParams(window.location.search);
const token  = params.get('token');

if (!token) {
  document.getElementById('form-section').innerHTML = `
    <div class="title">Enlace inválido</div>
    <div class="desc">Este enlace no tiene un token válido. Solicita uno nuevo desde la página de login.</div>
    <button class="btn" onclick="location.href='/'">Volver al login</button>
  `;
}

const $ = id => document.getElementById(id);

$('password').addEventListener('input', () => {
  const p = $('password').value;
  $('req-len').className = p.length >= 8 ? 'valid' : '';
  $('req-up').className  = /[A-Z]/.test(p) ? 'valid' : '';
  $('req-num').className = /[0-9]/.test(p) ? 'valid' : '';
  $('req-sym').className = /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(p) ? 'valid' : '';
});

async function doReset() {
  const password  = $('password').value;
  const password2 = $('password2').value;

  $('token-error').classList.remove('show');
  $('success-msg').classList.remove('show');

  if (password !== password2) {
    $('token-error').textContent = 'Las contraseñas no coinciden';
    $('token-error').classList.add('show');
    return;
  }

  if (password.length < 8) {
    $('token-error').textContent = 'La contraseña debe tener al menos 8 caracteres';
    $('token-error').classList.add('show');
    return;
  }

  $('btn-submit').disabled = true;
  $('btn-submit').textContent = 'Guardando...';

  try {
    const res = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido');
    }

    $('form-section').innerHTML = `
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <div class="title">¡Contraseña actualizada!</div>
        <div class="desc">Tu contraseña ha sido cambiada correctamente. Ahora puedes iniciar sesión.</div>
        <button class="btn" onclick="location.href='/'">Ir al login</button>
      </div>
    `;

  } catch (err) {
    $('token-error').textContent = err.message;
    $('token-error').classList.add('show');
    $('btn-submit').disabled = false;
    $('btn-submit').textContent = 'Guardar nueva contraseña';
  }
}
