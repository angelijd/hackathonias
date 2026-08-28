const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, 'public', 'a11y', 'accessibility.js');
let jsContent = fs.readFileSync(jsPath, 'utf8');

// 1. Fix isOpeningScreen to strictly be '/login'
jsContent = jsContent.replace(
  "var isOpeningScreen = window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/index.html' || window.location.pathname === '';",
  "var isOpeningScreen = window.location.pathname.includes('/login');"
);

// 2. Remove "Info" button from A11y menu
jsContent = jsContent.replace(
  "'<button class=\"ias-a11y-btn\" id=\"ias-btn-info-menu\">📚 Fundamentação Teórica</button>';",
  "'';"
);

// 3. Rename "Modo Adaptado (Alto Contraste)" to "Modo adaptado"
jsContent = jsContent.replace(
  "👁️‍🗨️ Modo Adaptado (Alto Contraste)",
  "👁️‍🗨️ Modo adaptado"
);

// 4. Disable TTS entirely on the Hub root page ('/')
// The function addTtsButtons(root) doesn't run if we return early. But MutationObserver runs it.
// Let's add a check at the very top of DOMContentLoaded
const hubCheck = `  if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '') {
    // Disable completely on Hub root
    return;
  }
`;
if (!jsContent.includes('// Disable completely on Hub root')) {
  jsContent = jsContent.replace(
    "document.addEventListener('DOMContentLoaded', function() {",
    "document.addEventListener('DOMContentLoaded', function() {\n" + hubCheck
  );
}

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('Fixed accessibility.js');

const cssPath = path.join(__dirname, 'public', 'a11y', 'accessibility.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Remove H1 from the visible headings in normal mode
// This satisfies "nas telas iniciais de cada teste (ex. Ayrton, conhecer a si mesmo pode abrir novos caminhos!), remova os ícones de áudio"
// Because "Ayrton..." is an H1, hiding it in normal mode works perfectly.
cssContent = cssContent.replace(
  "h1 .ias-tts-btn, \nh2 .ias-tts-btn, \nh3 .ias-tts-btn,\n.enunciado .ias-tts-btn",
  "h2 .ias-tts-btn, \nh3 .ias-tts-btn,\n.enunciado .ias-tts-btn"
);
// Also just in case the format is slightly different
cssContent = cssContent.replace(
  "h1 .ias-tts-btn,\nh2 .ias-tts-btn,\nh3 .ias-tts-btn,\n.enunciado .ias-tts-btn",
  "h2 .ias-tts-btn,\nh3 .ias-tts-btn,\n.enunciado .ias-tts-btn"
);
cssContent = cssContent.replace(
  /h1 \.ias-tts-btn,\s*h2 \.ias-tts-btn,\s*h3 \.ias-tts-btn,\s*\.enunciado \.ias-tts-btn/g,
  "h2 .ias-tts-btn, \nh3 .ias-tts-btn, \n.enunciado .ias-tts-btn"
);

fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('Fixed accessibility.css');
