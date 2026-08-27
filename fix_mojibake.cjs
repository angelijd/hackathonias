const fs = require('fs');
const path = require('path');

const serverTsPath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(serverTsPath, 'utf8');

const correctText = `              <p>Cada funcionalidade tem uma hipótese pedagógica por trás. O bot de IA, por exemplo, não está aqui porque é tendência, e sim porque uma devolutiva que não gera conversa, tampouco gera mudança.</p>
              <h4 style="margin-top: 16px;">Se você avalia a pedagogia:</h4>
              <p>Cada escolha de apresentação é, também, pedagógica. Personalizar questões pelo hobby do aluno, por exemplo, não é entretenimento, mas como jovens se engajam mais. Já um relatório via WhatsApp não é apenas conveniência: a devolutiva tem mais valor e ação se chegar onde o aluno está.</p>`;

// We will use a regex to replace this specific block.
// The block starts with "Cada funcionalidade tem uma hip" and ends with "onde o aluno est" and the closing </p>.
const regex = /<p>Cada funcionalidade tem uma hip[\s\S]*?onde o aluno est[^<]*<\/p>/;

if (regex.test(content)) {
  content = content.replace(regex, correctText);
  fs.writeFileSync(serverTsPath, content, 'utf8');
  console.log('Fixed mojibake in HTML template.');
} else {
  console.log('Could not find the mojibake text.');
}
