const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

function validateNoInlineScripts() {
  const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(publicDir, file), 'utf8');

    const scriptRegex = /<script(?! src)([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    let hasError = false;

    while ((match = scriptRegex.exec(content)) !== null) {
      const inlineCode = match[2].trim();
      if (inlineCode && inlineCode.length > 0) {
        console.error(`\n❌ ERROR: JavaScript inline detectado en ${file}`);
        console.error(`   Los scripts deben estar en archivos externos (.js)`);
        console.error(`   Mover el código a public/app.js y usar:`);
        console.error(`   <script src="/app.js"></script>`);
        hasError = true;
      }
    }

    if (hasError) {
      return false;
    }
  }

  return true;
}

function validateExternalScripts() {
  const appJs = path.join(publicDir, 'app.js');
  if (fs.existsSync(appJs)) {
    const stats = fs.statSync(appJs);
    if (stats.size > 100000) {
      console.warn(`\n⚠️  WARNING: app.js tiene ${(stats.size / 1024).toFixed(0)}KB`);
      console.warn('   Considera minificarlo para mejorar rendimiento.');
    }
  }
  return true;
}

console.log('🔍 Validando estructura HTML...\n');

const valid = validateNoInlineScripts() && validateExternalScripts();

if (valid) {
  console.log('✅ HTML validado correctamente');
  process.exit(0);
} else {
  console.log('\n❌ Validación fallida. Corrige los errores antes de continuar.');
  process.exit(1);
}
