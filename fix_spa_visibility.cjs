const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, 'public', 'a11y', 'accessibility.js');
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Revert the early return on '/'
jsContent = jsContent.replace(
  "  if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '') {\n    // Disable completely on Hub root\n    return;\n  }\n",
  ""
);

// We need a dynamic checker inside the MutationObserver or just a setInterval to toggle widget visibility
// because it's a React SPA.

const dynamicVisibilityCode = `
  // Dynamic Visibility Check for SPA
  setInterval(function() {
    var text = document.body.innerText || "";
    var isHub = text.includes("O que avaliamos quando avaliamos?");
    var isTestWelcome = text.includes("Bem-vindo ao seu teste de");
    var isLogin = text.includes("Login") && text.includes("Senha") && window.location.pathname.includes("login");
    
    // We want widgets on Login or Test Welcome screens.
    // The user specifically asked to remove from Hub ("O que avaliamos...")
    // And from tests when they are already being answered.
    var shouldShowWidgets = !isHub && (isTestWelcome || text.includes("Logins & Dashboards") || window.location.pathname.includes('/login'));
    // wait, if isHub is true, shouldShowWidgets is false.

    var a11yWidget = document.getElementById('ias-a11y-widget');
    var infoWidget = document.getElementById('ias-info-widget');
    
    if (a11yWidget) a11yWidget.style.display = shouldShowWidgets ? 'flex' : 'none';
    if (infoWidget) infoWidget.style.display = shouldShowWidgets ? 'flex' : 'none';

    // Para o audio (TTS), a regra no CSS ja esconde de H1 (que sao as telas de welcome).
    // Porem no Hub, queremos esconder COMPLETAMENTE os botoes de audio.
    var ttsBtns = document.querySelectorAll('.ias-tts-btn');
    ttsBtns.forEach(function(btn) {
      if (isHub) {
        btn.style.display = 'none';
      } else {
        btn.style.display = ''; // Let CSS handle it
      }
    });
  }, 500);
`;

// Insert the dynamic visibility code at the end of DOMContentLoaded
if (!jsContent.includes('Dynamic Visibility Check for SPA')) {
  jsContent = jsContent.replace(
    "// Starts the observer",
    dynamicVisibilityCode + "\n  // Starts the observer"
  );
}

// We must also revert the isOpeningScreen logic so the widgets are ALWAYS appended initially, 
// and then the setInterval toggles their visibility.
jsContent = jsContent.replace(
  "var isOpeningScreen = window.location.pathname.includes('/login');",
  "var isOpeningScreen = true;" // append them always, the setInterval will hide them
);

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('Fixed SPA dynamic visibility.');
