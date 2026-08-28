// accessibility.js
document.addEventListener('DOMContentLoaded', function() {

  var isOpeningScreen = window.location.pathname.includes("/login");
  var modalHtmlContent = "\n<h1>Fundamentação Teórica: Personalização e Cultura Pop como Envelope de Apresentação</h1>\n<p><strong>Projeto:</strong> Bot socrático de pensamento crítico e criatividade e novo envelope para as perguntas dos testes — Instituto Ayrton Senna</p>\n<p><strong>Escopo deste documento:</strong> Apresentar a fonte teórica que orientou a decisão de usar elementos de cultura pop, hobbies e interesses pessoais do estudante como <strong>camada de apresentação (envelope)</strong> do teste e das interações do bot, sem alterar o método nem qualquer parâmetro, escala ou instrumento de avaliação do IAS.</p>\n<p><strong>Natureza deste documento:</strong> este texto tem finalidade <strong>documental e de rastreabilidade</strong>: registrar qual literatura embasou a decisão de design, não afirmar que a decisão está cientificamente \"provada\" ou é a única leitura possível.</p>\n<p>Como detalhado na Seção 5, os estudos citados são objeto de debate acadêmico ativo, têm tamanhos de efeito modestos e nem sempre se replicam. O documento não deve ser lido como validação científica do produto, e sim como registro de que a escolha de design não foi arbitrária, mas sim orientada por um corpo específico e identificável de pesquisa em psicologia educacional.</p>\n<hr/>\n<h2>1. A decisão de design em uma frase</h2>\n<p>O bot utiliza o <strong>método</strong> de diálogo socrático e mantém o <strong>instrumento</strong> (escalas e critérios do IAS) inalterado. O que muda é apenas a <strong>roupagem</strong> dos exemplos e analogias usados durante o diálogo, que passam a se conectar a interesses declarados pelo próprio estudante (jogos, séries, esportes, música, etc.), em vez de a exemplos genéricos e descontextualizados.</p>\n<p>Essa distinção — <strong>conteúdo/instrumento intocado vs. camada de apresentação personalizada</strong> — é exatamente o que a literatura de motivação educacional recomenda e o que já foi testado empiricamente em domínios estruturalmente parecidos (raciocínio matemático, resolução de problemas), com resultados positivos e replicáveis.</p>\n<h2>2. Por que isso deveria funcionar: três pilares teóricos</h2>\n<h3>2.1 O interesse pessoal como \"gancho\" de entrada (Hidi &amp; Renninger)</h3>\n<p>O Modelo de Quatro Fases do Desenvolvimento do Interesse (Hidi &amp; Renninger, 2006, <em>Educational Psychologist</em>) descreve o interesse como algo que se constrói em fases, começando por um <strong>interesse situacional disparado</strong> por um estímulo externo (novidade, relevância pessoal), que pode evoluir para interesse mantido e, com o tempo, para interesse individual duradouro.</p>\n<p>Isso justifica diretamente o desenho do bot e dos testes: o elemento de cultura pop/hobby não é o objetivo pedagógico em si, mas representa o gatilho que abre a porta para o estudante se engajar. A literatura descreve esse gatilho externo como, para muitos alunos, um facilitador prático para que a atenção sustentada aconteça, especialmente antes que haja interesse intrínseco já estabelecido pelo tema (pensamento crítico/criatividade em si, a título de exemplo).</p>\n<p><strong>Mapeamento explícito das duas estratégias às fases do modelo:</strong></p>\n<p>As duas estratégias de design do produto correspondem, cada uma, a uma fase distinta e inicial do modelo de Hidi &amp; Renninger — e a ambas, deliberadamente, apenas as duas primeiras das quatro fases:</p>\n<ul>\n  <li><strong>Fase 1 — Interesse situacional desperto:</strong> corresponde ao <strong>envelope de cultura pop/personalização</strong>. É o estímulo pontual de entrada — a referência ao hobby, jogo ou série do estudante — cuja função é captar atenção no momento em que o exemplo é apresentado, através de reconhecimento e relevância pessoal imediata.</li>\n  <li><strong>Fase 2 — Interesse situacional mantido:</strong> corresponde ao <strong>método socrático em si</strong>. A sequência de perguntas que sustenta o raciocínio do estudante ao longo do diálogo é o mecanismo que mantém a atenção <em>além</em> do estímulo inicial, exigindo engajamento cognitivo ativo e continuado, não apenas a reação passiva ao gatilho.</li>\n</ul>\n<p>Essa é uma leitura estrutural do modelo, não uma medição empírica: o modelo de Hidi &amp; Renninger foi originalmente descrito para explicar o desenvolvimento do interesse ao longo de semanas ou meses de exposição repetida a um domínio, não para uma única sessão. É razoável e defensável mapear o desenho do produto às duas primeiras fases porque a lógica funcional é a mesma (estímulo de entrada → sustentação da atenção), mas isso é uma <strong>inferência de design</strong>, não uma constatação de que o bot efetivamente induz essas fases nos estudantes reais; isso exigiria medição (ex.: escalas de interesse situacional aplicadas antes/depois do uso).</p>\n<p>Importante: o documento <strong>não</strong> reivindica que o produto avança o estudante às Fases 3 (Interesse individual emergente) ou 4 (Interesse individual bem desenvolvido) do modelo. Essas fases descrevem interesse duradouro e autorregulado, que exigiria evidência longitudinal de uso continuado, já fora do escopo desta justificativa de design.</p>\n<h3>2.2 Autonomia, competência e pertencimento (Ryan &amp; Deci, Teoria da autodeterminação)</h3>\n<p>Quando o exemplo ou analogia usado no diálogo vem do próprio universo do estudante, três necessidades psicológicas básicas descritas pela Teoria da Autodeterminação são atendidas:</p>\n<ul>\n  <li><strong>Autonomia</strong> — o estudante sente que a atividade dialoga com escolhas e gostos que são dele, não impostos;</li>\n  <li><strong>Competência</strong> — o estudante já é \"especialista\" no próprio hobby, o que reduz a insegurança inicial diante de um tema abstrato (pensamento crítico);</li>\n  <li><strong>Pertencimento</strong> — validar o interesse do estudante (mesmo que seja um jogo ou uma série) sinaliza que o espaço de diálogo reconhece sua identidade.</li>\n</ul>\n<p>Isso é coerente com o próprio desenho pedagógico do método socrático: o objetivo é que o estudante construa o raciocínio, não que receba uma resposta pronta, e ele constrói melhor a partir de um ponto de partida familiar.</p>\n<h3>2.3 Personalização de contexto sem alterar o núcleo do problema (Cordova &amp; Lepper; Walkington)</h3>\n<p>O estudo de referência aqui é Cordova &amp; Lepper (1996, <em>Journal of Educational Psychology</em>): quando o <strong>mesmo conteúdo</strong> de aritmética foi embutido em contextos personalizados aos interesses dos alunos, sem alterar a estrutura ou a dificuldade da tarefa, os alunos mostraram maior engajamento, maior persistência e aprenderam mais no mesmo tempo, comparado ao grupo com o conteúdo abstrato, idêntico em substância.</p>\n<p>O trabalho de Candace Walkington em álgebra (2013 em diante) reforça o mesmo padrão em um domínio mais próximo do \"raciocínio estruturado\": problemas matemáticos reescritos para refletir os interesses do aluno (esportes, jogos) mantiveram a mesma estrutura lógica e o mesmo nível de dificuldade (só a \"casca\" do problema mudou), e os alunos com essa versão personalizada tiveram desempenho melhor e mais duradouro, inclusive em unidades posteriores sem personalização.</p>\n<p>Isso é a validação empírica mais direta da lógica do bot do IAS: <strong>o \"envelope\" muda, o raciocínio e a métrica não mudam.</strong></p>\n<h2>3. Um cuidado que a literatura exige (e que orienta o desenho técnico)</h2>\n<p>A mesma literatura documenta um risco quando a personalização é malfeita: o chamado <strong>efeito dos detalhes sedutores</strong> (Mayer e colegas), quando o elemento \"atraente\" (referência de cultura pop, piada, curiosidade) é decorativo e <strong>não carrega</strong> relação com o raciocínio, ele pode desviar atenção e prejudicar a retenção, em vez de ajudar.</p>\n<p>A implicação prática para o bot: a referência ao hobby/interesse do aluno deve <strong>estruturar</strong> a analogia usada no diálogo socrático (ex.: usar a lógica de progressão de um jogo para discutir causa-e-efeito), e não apenas ser mencionada de forma solta ou cosmética. Esse cuidado já está alinhado ao desenho do bot, que usa a referência para <em>ilustrar</em> o raciocínio pedido pelo método, não para substituí-lo.</p>\n<p>Vale também registrar, com transparência: parte da pesquisa mostra que esse efeito de personalização é mais forte em alunos com menor interesse prévio ou menor confiança no tema, e que a autenticidade da referência importa; tentativas de personalização \"forçada\" ou fora de contexto podem ser percebidas como artificiais por adolescentes e ter efeito contrário. Isso reforça a importância de a personalização vir de interesses <strong>efetivamente declarados pelo estudante</strong>, não de suposições genéricas sobre \"o que os jovens gostam\".</p>\n<h2>4. Síntese das duas estratégias e suas fases correspondentes</h2>\n<table>\n  <thead>\n    <tr>\n      <th>Estratégia de design</th>\n      <th>Fase do modelo Hidi &amp; Renninger (2006)</th>\n      <th>Função</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Envelope de cultura pop / personalização</td>\n      <td>Fase 1 — Interesse Situacional Desperto</td>\n      <td>Capturar atenção inicial via relevância pessoal</td>\n    </tr>\n    <tr>\n      <td>Tutor socrático (sequência de perguntas)</td>\n      <td>Fase 2 — Interesse Situacional Mantido</td>\n      <td>Sustentar engajamento cognitivo ao longo do diálogo</td>\n    </tr>\n    <tr>\n      <td><em>(fora de escopo)</em></td>\n      <td>Fases 3 e 4 — Interesse Individual (emergente/desenvolvido)</td>\n      <td>Não reivindicado; exigiria evidência longitudinal</td>\n    </tr>\n  </tbody>\n</table>\n<h2>5. Ressalva sobre o status dos estudos citados</h2>\n<p>Os estudos e modelos referenciados neste documento são amplamente citados na literatura de psicologia educacional, mas <strong>não são consensuais nem estão isentos de crítica</strong>. Vale registrar, para uso responsável desta documentação:</p>\n<ul>\n  <li><strong>Tamanhos de efeito modestos:</strong> a correlação entre interesse pessoal e desempenho acadêmico observada em meta-análises (ex.: Schiefele, Krapp &amp; Winteler, 1992) é de magnitude pequena a moderada (r ≈ 0,31), não uma relação determinística.</li>\n  <li><strong>Resultados nulos e até negativos existem:</strong> nem todo estudo de personalização baseada em interesse encontra efeito positivo. Um RCT de grande porte (Iterbeke, Schelfhout &amp; De Witte, 2022, com 1.449 estudantes) não encontrou aumento de interesse com personalização de exemplos, e identificou efeito <strong>negativo</strong> em estudantes com baixa autoconfiança — um contraponto relevante ao otimismo geral da área.</li>\n  <li><strong>O modelo de Hidi &amp; Renninger é uma estrutura teórica, não uma lei empírica testável diretamente:</strong> as quatro fases foram propostas como um framework explicativo qualitativo; sua aplicação a um produto específico (como este bot) é uma extrapolação razoável, não uma validação direta do modelo.</li>\n  <li><strong>Personalização malfeita pode ter efeito reverso:</strong> o efeito dos \"detalhes sedutores\" (Mayer e colegas) mostra que a mesma estratégia, se executada sem cuidado, pode prejudicar em vez de ajudar — o que significa que a fundamentação teórica aqui apresentada justifica a <em>direção</em> da decisão de design, mas não garante o resultado; a qualidade de execução do envelope segue sendo determinante.</li>\n  <li><strong>O documento fornecido pela pesquisa complementar (material extenso em anexo)</strong> contém as mesmas fontes primárias citadas aqui, mas com formulações retóricas e conclusões mais fortes do que as fontes originais sustentam; este documento manteve apenas as afirmações rastreáveis diretamente aos estudos primários.</li>\n</ul>\n<p>Em suma: a literatura dá suporte razoável e coerente à direção da decisão de design, mas deve ser lida como <strong>fundamentação teórica plausível</strong>, não como comprovação definitiva de eficácia do produto.</p>\n<h2>6. Síntese para a documentação do projeto</h2>\n<table>\n  <thead>\n    <tr>\n      <th>Elemento</th>\n      <th>O que muda</th>\n      <th>O que NÃO muda</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Exemplos e analogias no diálogo</td>\n      <td>Passam a referenciar hobbies/interesses declarados pelo aluno</td>\n      <td>—</td>\n    </tr>\n    <tr>\n      <td>Método pedagógico</td>\n      <td>—</td>\n      <td>Diálogo socrático permanece o mesmo</td>\n    </tr>\n    <tr>\n      <td>Instrumento de avaliação (IAS)</td>\n      <td>—</td>\n      <td>Escalas, critérios e método de aplicação do IAS permanecem inalterados</td>\n    </tr>\n    <tr>\n      <td>Estrutura/dificuldade do raciocínio pedido</td>\n      <td>—</td>\n      <td>Idêntica à versão sem personalização</td>\n    </tr>\n  </tbody>\n</table>\n<p><strong>Referências centrais:</strong></p>\n<ul>\n  <li>Cordova, D. &amp; Lepper, M. (1996). <em>Journal of Educational Psychology</em>, 88(4), 715–730.</li>\n  <li>Hidi, S. &amp; Renninger, K.A. (2006). <em>Educational Psychologist</em>, 41(2), 111–127.</li>\n  <li>Ryan, R. &amp; Deci, E. (2000). <em>American Psychologist</em>, 55(1), 68–78.</li>\n  <li>Walkington, C. (2013). <em>Journal of Educational Psychology</em>, 105(4), 932–945.</li>\n  <li>Ito, M. et al. (2013). <em>Connected Learning: An Agenda for Research and Design</em>. MacArthur Foundation.</li>\n  <li>Harp, S. &amp; Mayer, R. (1998). <em>Journal of Educational Psychology</em>, 90(3), 414–434 (efeito dos detalhes sedutores).</li>\n</ul>\n<p><em>Nota metodológica: este documento consolida a pesquisa acadêmica já levantada em revisão anterior (fontes primárias verificadas com DOI), mantendo apenas as afirmações rastreáveis a estudos reais e removendo formulações retóricas sem valor probatório. Seu objetivo é registrar a fonte teórica da decisão de design, não afirmar validação científica do produto.</em></p>\n";

  // 1. Widget Flutuante ♿
  var widget = document.createElement('button');
  widget.id = 'ias-a11y-widget';
  widget.innerHTML = '♿';
  widget.setAttribute('aria-label', 'Menu de Acessibilidade');
  if (isOpeningScreen) { document.body.appendChild(widget); }

  // 2. Widget Flutuante de Informação ℹ️
  var infoWidget = document.createElement('button');
  infoWidget.id = 'ias-info-widget';
  infoWidget.innerHTML = 'ℹ️';
  infoWidget.setAttribute('aria-label', 'Fundamentação Teórica do Projeto');
  infoWidget.setAttribute('title', 'Fundamentação Teórica');
  if (isOpeningScreen) { document.body.appendChild(infoWidget); }

  // Menu de Acessibilidade
  var menu = document.createElement('div');
  menu.id = 'ias-a11y-menu';
  menu.innerHTML = '<button class="ias-a11y-btn" id="ias-btn-contrast">👁️ Modo adaptado</button>' +
                   '';
  if (isOpeningScreen) { document.body.appendChild(menu); }

  // Modal de Fundamentação Teórica
  var backdrop = document.createElement('div');
  backdrop.id = 'ias-info-modal-backdrop';
  backdrop.innerHTML = '<div id="ias-info-modal" role="dialog" aria-modal="true">' +
    '<div class="ias-modal-header">' +
      '<h2 id="ias-modal-title">📘 Fundamentação Teórica — Instituto Ayrton Senna</h2>' +
      '<button class="ias-modal-close" id="ias-modal-close-btn" aria-label="Fechar">&times;</button>' +
    '</div>' +
    '<div class="ias-modal-body">' + modalHtmlContent + '</div>' +
  '</div>';
  if (isOpeningScreen) { document.body.appendChild(backdrop); }

  function openModal() {
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  infoWidget.addEventListener('click', openModal);
  var closeBtn = document.getElementById('ias-modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', function(e) { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && backdrop.classList.contains('active')) closeModal();
  });

  widget.addEventListener('click', function() { menu.classList.toggle('active'); });

  var btnContrast = document.getElementById('ias-btn-contrast');
  if (btnContrast) {
    btnContrast.addEventListener('click', function() {
      document.body.classList.toggle('ias-a11y-mode');
      btnContrast.innerHTML = document.body.classList.contains('ias-a11y-mode') ? 
        '👁️ Desativar Modo Adaptado' : '👁️ Modo adaptado';
    });
  }

  var btnInfoMenu = document.getElementById('ias-btn-info-menu');
  if (btnInfoMenu) {
    btnInfoMenu.addEventListener('click', function() {
      menu.classList.remove('active');
      openModal();
    });
  }

  // 3. Áudio (🔊) ativo por PADRÃO para todos os alunos
  function injectAudioButtons() {
    var textElements = document.querySelectorAll('h1, h2, h3, p');
    textElements.forEach(function(el) {
      if (el.hasAttribute('data-has-tts') || el.closest('#ias-a11y-menu') || el.closest('#ias-info-modal') || el.innerText.trim() === '') return;
      el.setAttribute('data-has-tts', 'true');

      var btn = document.createElement('button');
      btn.className = 'ias-tts-btn';
      btn.innerHTML = '🔊';
      btn.setAttribute('aria-label', 'Ouvir texto');

      if (el.tagName === 'P') {
        el.appendChild(btn);
      } else {
        el.insertAdjacentElement('beforeend', btn);
      }

      var currentAudio = null;

      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (currentAudio && !currentAudio.paused) {
           currentAudio.pause();
           btn.innerHTML = '🔊';
           return;
        }

        var textToRead = el.innerText.replace('🔊', '').replace('⏸️', '').replace('⏳', '').replace('❌', '').trim();
        var isDynamic = window.location.pathname.includes('/hackathon');
        
        btn.innerHTML = '⏳';
        try {
          var res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToRead, isDynamic: isDynamic })
          });
          var data = await res.json();
          
          if (data.audioUrl) {
            currentAudio = new Audio(data.audioUrl);
            currentAudio.play();
            btn.innerHTML = '⏸️';
            currentAudio.onended = function() { btn.innerHTML = '🔊'; };
          } else {
            btn.innerHTML = '❌';
            setTimeout(function() { btn.innerHTML = '🔊'; }, 2000);
          }
        } catch (err) {
          btn.innerHTML = '❌';
          setTimeout(function() { btn.innerHTML = '🔊', 2000; });
        }
      });
    });
  }

  injectAudioButtons();

  var observer = new MutationObserver(function() {
    injectAudioButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
