const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const hookDir = path.join(__dirname, '..', '.git', 'hooks');
const hookFile = path.join(hookDir, 'pre-commit');

if (!fs.existsSync(path.join(__dirname, '..', '.git'))) {
  console.log('⚠️  No se encontró repositorio git. Saltando instalación de hooks.');
  console.log('   Puedes crear el hook manualmente en .git/hooks/pre-commit');
  process.exit(0);
}

if (!fs.existsSync(hookDir)) {
  fs.mkdirSync(hookDir, { recursive: true });
}

fs.copyFileSync(path.join(__dirname, 'pre-commit'), hookFile);
fs.chmodSync(hookFile, '755');

console.log('✅ Hook pre-commit instalado');
console.log('   Ahora se validará el HTML antes de cada commit');
