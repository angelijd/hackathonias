const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'platforms', 'senna_login', 'components', 'PortalLoginScreen.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Atualizar mensagem de introdução
content = content.replace(
  'Olá! Se você não consegue entrar, informe seus dados abaixo e solicite entrada.',
  'Olá! Se você esqueceu seu código de acesso, informe seus dados para solicitar entrada.'
);

// 2. Atualizar nota de timeout
content = content.replace(
  'Se a liberação demorar mais do que 10 minutos, feche esta tela e procure a Secretaria para solicitar entrada.',
  'Se não houver resposta em 10 minutos, feche esta tela e procure a Secretaria da sua escola.'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('PortalLoginScreen.tsx atualizado com as mensagens exatas!');
