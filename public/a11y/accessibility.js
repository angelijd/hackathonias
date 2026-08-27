// accessibility.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Criar o Widget Flutuante
  const widget = document.createElement('button');
  widget.id = 'ias-a11y-widget';
  widget.innerHTML = '♿';
  widget.setAttribute('aria-label', 'Menu de Acessibilidade');
  widget.setAttribute('aria-expanded', 'false');
  document.body.appendChild(widget);

  const menu = document.createElement('div');
  menu.id = 'ias-a11y-menu';
  menu.innerHTML = \
    <button class="ias-a11y-btn" id="ias-btn-contrast">👁️ Ativar Modo Adaptado (Alto Contraste)</button>
  \;
  document.body.appendChild(menu);

  // Toggle do menu
  widget.addEventListener('click', () => {
    const isActive = menu.classList.toggle('active');
    widget.setAttribute('aria-expanded', isActive);
  });

  // Toggle do Alto Contraste
  const btnContrast = document.getElementById('ias-btn-contrast');
  btnContrast.addEventListener('click', () => {
    document.body.classList.toggle('ias-a11y-mode');
    if (document.body.classList.contains('ias-a11y-mode')) {
      btnContrast.innerHTML = '👁️ Desativar Modo Adaptado';
    } else {
      btnContrast.innerHTML = '👁️ Ativar Modo Adaptado (Alto Contraste)';
    }
  });

  // 2. Lógica de TTS (Áudio)
  const observer = new MutationObserver((mutations) => {
    const textElements = document.querySelectorAll('h1, h2, h3, p');
    textElements.forEach(el => {
      // Ignora se já injetamos, se está vazio ou se é do próprio menu de acessibilidade
      if (el.hasAttribute('data-has-tts') || el.closest('#ias-a11y-menu') || el.innerText.trim() === '') return;
      el.setAttribute('data-has-tts', 'true');

      const btn = document.createElement('button');
      btn.className = 'ias-tts-btn';
      btn.innerHTML = '🔊';
      btn.setAttribute('aria-label', 'Ouvir texto');

      if (el.tagName === 'P') {
          el.appendChild(btn);
      } else {
          el.insertAdjacentElement('beforeend', btn);
      }

      let currentAudio = null;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (currentAudio && !currentAudio.paused) {
           currentAudio.pause();
           btn.innerHTML = '🔊';
           return;
        }

        const textToRead = el.innerText.replace('🔊', '').replace('⏸️', '').replace('⏳', '').trim();
        
        // Determina se estamos nas telas estáticas ou na dinâmica
        const isDynamic = window.location.pathname.includes('/hackathon');
        
        btn.innerHTML = '⏳';
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToRead, isDynamic: isDynamic })
          });
          const data = await res.json();
          
          if (data.audioUrl) {
            currentAudio = new Audio(data.audioUrl);
            currentAudio.play();
            btn.innerHTML = '⏸️';
            currentAudio.onended = () => { btn.innerHTML = '🔊'; };
          } else {
            btn.innerHTML = '❌';
            setTimeout(() => btn.innerHTML = '🔊', 2000);
          }
        } catch (e) {
          btn.innerHTML = '❌';
          setTimeout(() => btn.innerHTML = '🔊', 2000);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
