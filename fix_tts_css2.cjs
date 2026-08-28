const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'a11y', 'accessibility.css');
let content = fs.readFileSync(cssPath, 'utf8');

// The class starts with .ias-tts-btn {
const index = content.indexOf('.ias-tts-btn {');
if (index !== -1) {
    content = content.substring(0, index);
}

const newCss = `.ias-tts-btn {
  background: #e0f2fe;
  color: #0369a1;
  border: 2px solid #bae6fd;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: none !important; /* Escondido por padrao no modo original */
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  font-size: 20px;
  vertical-align: middle;
  transition: transform 0.2s;
}

/* No modo original, mostrar APENAS nos titulos (H1, H2, H3 - que normalmente sao as perguntas) e menorzinho */
h1 .ias-tts-btn, 
h2 .ias-tts-btn, 
h3 .ias-tts-btn,
.enunciado .ias-tts-btn {
  display: inline-flex !important;
  transform: scale(0.7);
}

.ias-tts-btn:hover { background: #bae6fd; transform: scale(0.75); }

/* No modo acessibilidade, mostrar em TODOS os textos e no tamanho normal */
body.ias-a11y-mode .ias-tts-btn {
  display: inline-flex !important;
  background: #FDC300 !important;
  color: #000 !important;
  border: 2px solid #FFF !important;
  transform: scale(1) !important;
}

body.ias-a11y-mode h1 .ias-tts-btn,
body.ias-a11y-mode h2 .ias-tts-btn,
body.ias-a11y-mode h3 .ias-tts-btn,
body.ias-a11y-mode .enunciado .ias-tts-btn {
  transform: scale(1) !important;
}

body.ias-a11y-mode .ias-tts-btn:hover {
  transform: scale(1.05) !important;
}
`;

content += newCss;
fs.writeFileSync(cssPath, content, 'utf8');
console.log('Successfully updated CSS.');
