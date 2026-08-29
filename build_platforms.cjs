const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Rebuilds the static bundles served from platforms_dist/* (via express.static
// in server.ts) from the current src/ of each platform. Railway deploys only
// these prebuilt bundles, not src/ directly, so this must run on every build
// or changes to src/platforms/** never reach production.
const PLATFORMS = [
  {
    name: 'Senna',
    entry: 'src/platforms/senna_teste/main.tsx',
    outDir: 'platforms_dist/Senna',
    title: 'Teste Senna — Instituto Ayrton Senna',
    description: 'Portal de Testes do Instituto Ayrton Senna',
  },
  {
    name: 'autoavaliacao',
    entry: 'src/platforms/autoavaliacao/main.tsx',
    outDir: 'platforms_dist/autoavaliacao',
    title: 'Autoavaliação — Instituto Ayrton Senna',
    description: 'Portal de Autoavaliação do Instituto Ayrton Senna',
  },
  {
    name: 'hackathon',
    entry: 'src/platforms/hackathon_ias/main.tsx',
    outDir: 'platforms_dist/hackathon',
    title: 'Bem-vindo — Pensamento Crítico e Criatividade',
    description: 'Bem-vindo ao seu teste de Pensamento Crítico e Criatividade do Instituto Ayrton Senna.',
  },
  {
    name: 'SennaLogin',
    entry: 'src/platforms/senna_login/main.tsx',
    outDir: 'platforms_dist/SennaLogin',
    title: 'Login — Instituto Ayrton Senna',
    description: 'Portal de Login do Instituto Ayrton Senna',
  },
];

const indexHtmlPath = path.join(__dirname, 'index.html');
const originalIndexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

function buildTemplate({ entry, title, description }) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entry}"></script>
  </body>
</html>
`;
}

try {
  for (const platform of PLATFORMS) {
    console.log(`\n--- Construindo ${platform.name} com Vite ---`);
    fs.writeFileSync(indexHtmlPath, buildTemplate(platform), 'utf8');
    execSync(`npx vite build --outDir ${platform.outDir} --emptyOutDir --base ./`, { stdio: 'inherit' });
  }
} finally {
  fs.writeFileSync(indexHtmlPath, originalIndexHtml, 'utf8');
}

console.log('\nTodas as plataformas foram reconstruídas em platforms_dist/.');
