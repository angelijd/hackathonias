const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Limpando assets antigos de SennaLogin ---');
const distAssetsDir = path.join(__dirname, 'platforms_dist', 'SennaLogin', 'assets');
if (fs.existsSync(distAssetsDir)) {
  fs.readdirSync(distAssetsDir).forEach(file => {
    if ((file.startsWith('main-') || file.startsWith('index-')) && (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.map'))) {
      fs.unlinkSync(path.join(distAssetsDir, file));
    }
  });
}

console.log('--- Construindo SennaLogin com Vite ---');
execSync('npx vite build --config vite.senna_login.config.ts', { stdio: 'inherit' });

const files = fs.readdirSync(distAssetsDir);
const jsFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('main-') && f.endsWith('.css'));

console.log('Arquivo JS ativo:', jsFile);
console.log('Arquivo CSS ativo:', cssFile);

const indexHtmlPath = path.join(__dirname, 'platforms_dist', 'SennaLogin', 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

if (jsFile) {
  html = html.replace(/src="\.?\/assets\/[^"]+\.js"/g, `src="./assets/${jsFile}"`);
}
if (cssFile) {
  html = html.replace(/href="\.?\/assets\/[^"]+\.css"/g, `href="./assets/${cssFile}"`);
}

fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log('platforms_dist/SennaLogin/index.html apontando com 100% de certeza para o novo bundle!');
