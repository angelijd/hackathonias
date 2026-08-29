
import dns from 'dns';
// Muitos hosts de container (Railway incluso) anunciam um endereço IPv6 para
// smtp.gmail.com que não tem rota de saída, causando ENETUNREACH. Forçar IPv4
// evita que o Node tente esse endereço primeiro.
dns.setDefaultResultOrder('ipv4first');

// Normaliza números de WhatsApp brasileiros, adicionando o DDI 55 quando ausente.
// Sem isso, um número como "16981875080" (DDD 16 + celular) é interpretado pelo
// WhatsApp como pertencente ao DDI +1 (EUA/Canadá), e a Evolution API rejeita o
// envio com "exists": false.
function formatWhatsAppNumber(phone: string): string {
  let clean = (phone || '').replace(/\D/g, '');
  if (!clean) return '';
  // Números brasileiros sem DDI têm 10 (fixo) ou 11 (celular) dígitos
  if ((clean.length === 10 || clean.length === 11) && !clean.startsWith('55')) {
    clean = `55${clean}`;
  }
  return clean;
}

function createEmailTransporter(smtpUser: string, smtpPass: string, smtpHost: string, smtpPort: number | string) {
  const cleanPass = smtpPass ? smtpPass.replace(/\s+/g, '') : '';
  const portNum = Number(smtpPort) || 465;
  if ((smtpHost && smtpHost.includes('gmail')) || (smtpUser && smtpUser.includes('@gmail.com'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: cleanPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }
  return nodemailer.createTransport({
    host: smtpHost || 'smtp.gmail.com',
    port: portNum,
    secure: portNum === 465,
    auth: { user: smtpUser, pass: cleanPass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false }
  });
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

// Load environment variables from .env.local if it exists, otherwise fall back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

// Helper to call Gemini API with model fallback and automatic retry
async function generateGeminiContent(ai: GoogleGenAI, contents: any, config: any = {}) {
  const models = ['gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  let lastErr: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`[Gemini API] ${model} attempt ${attempt} warning:`, err?.message || err);
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }
  throw lastErr || new Error('Todos os modelos Gemini falharam');
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hcbbwzqufnyriphdaqdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmJ3enF1Zm55cmlwaGRhcWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mjk3NDEsImV4cCI6MjEwMzQwNTc0MX0.eIBYSHQO2K6ubK98vcVcWZQpfywVH0gxHa1FvphQyQo';

async function logTelemetry(origem: string, acao: string, detalhes: any = {}) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/logs_telemetria`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        origem,
        acao,
        detalhes
      })
    });
  } catch (err) {
    console.error('[Telemetry Error]', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  // API Route for Telemetry
  app.post('/api/telemetry', async (req, res) => {
    try {
      const { origem, acao, detalhes } = req.body;
      await logTelemetry(origem, acao, detalhes);
      res.sendStatus(200);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  // API Route for Gemini
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const { name, age, grade, city, school, interests, interestDetail = '', testType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const isCreativity = testType === 'creativity';

      // Log AI Usage
      logTelemetry('ia_gemini', 'generate_questions_request', { name, testType, isFallback: !apiKey || apiKey === 'MY_GEMINI_API_KEY' });
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback mock questions for testing the UI without an API key
        const interestName = interestDetail || (interests && interests[0]) || 'seus interesses';
        
        let fallbackItems = [];
        
        if (isCreativity) {
          fallbackItems = [
            { rubricaId: "cr2", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer criar um novo espaço perto da ${school} para estimular a imaginação dos jovens, mas o local atual é cinza e sem graça. Como o ambiente afeta sua vontade de criar e o que você faria para transformar esse lugar?` },
            { rubricaId: "cr3", tipo: "dissertativa", enunciado: `Pense no seu dia a dia e na sua paixão por ${interestName}. Qual foi a ideia mais simples e criativa que você teve recentemente para resolver um problema comum e como você se sentiu ao colocá-la em prática?` },
            { rubricaId: "cr5", tipo: "dissertativa", enunciado: `Se você tivesse que inventar 5 usos totalmente diferentes e fora do comum para um objeto relacionado a ${interestName}, quais seriam?` },
            { rubricaId: "cr6", tipo: "dissertativa", enunciado: `Conte sobre uma experiência recente na qual você tentou criar algo diferente, mas a sua ideia não deu certo. Como você lidou com a frustração desse erro e tentou novamente?` },
            { rubricaId: "cr7", tipo: "dissertativa", enunciado: `Imagine que você e seus amigos do ${grade} precisam organizar um evento sobre ${interestName}, mas ninguém sabe direito o que fazer e as opiniões são muito diferentes. Como você lidaria com essa confusão sem perder a calma e a criatividade?` }
          ];
        } else {
          fallbackItems = [
            { rubricaId: "pc1", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer proibir o uso de celulares na ${school} para melhorar o foco, mas alguns alunos dizem que usam para pesquisar sobre ${interestName}. Como você analisaria os argumentos dos dois lados sem deixar sua emoção falar mais alto?` },
            { rubricaId: "pc2", tipo: "multipla_marcacao", enunciado: `Pense em uma situação em que você teve que tomar uma decisão difícil envolvendo seus amigos do ${grade} e sua paixão por ${interestName}. Como você lidou com o conflito entre o que você sentia e o que a lógica dizia ser o certo? Marque as opções que se aplicam:`, opcoes: ["Procurei confirmar se os fatos eram verdadeiros.", "Procurei verificar a credibilidade da fonte.", "Busquei mais informação antes de decidir.", "Refleti sobre os impactos éticos."] },
            { rubricaId: "pc4", tipo: "multipla_marcacao", enunciado: `Sendo um estudante de ${age}, é comum a gente buscar informações que só confirmam o que já pensamos sobre ${interestName}. Como você faria para não cair nessa armadilha? Marque o que você faz:`, opcoes: ["Presto atenção em como minhas crenças influenciam meu julgamento.", "Examino argumentos contrários com calma.", "Busco fontes alternativas confiáveis."] },
            { rubricaId: "pc5", tipo: "multipla_marcacao", enunciado: `Ao assistir a um vídeo ou post polêmico sobre ${interestName}, como você identifica o que realmente está sendo dito? Marque o que se aplica:`, opcoes: ["Consigo identificar as ideias principais.", "Percebo o que está dito diretamente e o que fica nas entrelinhas.", "Distingo o que é opinião, o que é fato e o que é bem fundamentado.", "Entendo o que o autor quis dizer, mesmo nas entrelinhas."] },
            { rubricaId: "pc8", tipo: "multipla_marcacao", enunciado: `Quando surge uma novidade sobre ${interestName} que vai contra algo que você sempre defendeu, como você age? Marque suas atitudes:`, opcoes: ["Percebo quando minhas crenças podem estar influenciando o que penso.", "Percebo quando estou buscando só o que confirma o que já acredito.", "Me esforço para buscar informações que contradizem o que acredito.", "Analiso com cuidado antes de rejeitar."] }
          ];
        }
        
        // Small delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({ items: fallbackItems });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptCriticalThinking = `# CONTEXTO

Você é um avaliador do Instituto Ayrton Senna. As rubricas abaixo são material oficial do IAS — não são inspiração, são fonte primária. Nunca parafraseie o conteúdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# RESOLUÇÃO DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte específico):
1. Você DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situações nesse universo.
2. Se o item específico listado não for reconhecível (nome inventado ou erro irreconhecível), use o interesse amplo correspondente.
3. Nunca invente mecânicas, personagens, times, artistas ou elementos que não existam de verdade. Se não tiver certeza de algum item específico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS — PENSAMENTO CRÍTICO (5 itens)

Cada rubrica contém o campo "intencao_cena", que orienta o tipo de situação a construir, e o campo "formato", que define a estrutura do item gerado. Respeite ambos rigorosamente.
Para rubricas de múltipla marcação: "itens_originais" contém o texto oficial do IAS (não use nas opções geradas). "itens_traduzidos" contém a versão acessível — use exclusivamente estes nas opções.

[
  {
    "id": "pc1",
    "formato": "dissertativa",
    "habilidade": "Conhecimento específico do tema",
    "intencao_cena": "Crie um momento em que o aluno se depara com uma afirmação ou debate sobre algo diretamente ligado ao seu interesse específico, e alguém pede a opinião dele ou ele precisa tomar uma posição.",
    "niveis": [
      "Não tenho conhecimento algum sobre o tema.",
      "Conheço um pouco o tema, mas não o suficiente para refletir muito sobre ele.",
      "Conheço o tema, consigo refletir sobre ele e imaginar diferentes pontos de vista.",
      "Conheço bem o tema, consigo refletir sobre ele quando necessário."
    ]
  },
  {
    "id": "pc2",
    "formato": "multipla_marcacao",
    "habilidade": "Conhecimento específico do pensamento crítico",
    "intencao_cena": "Crie um momento em que o aluno recebe uma informação sobre seu interesse que pode ser verdadeira ou falsa — e precisa decidir se confia nela.",
    "itens_originais": [
      "Conheço os princípios científicos para inferência causal.",
      "Conheço lógica categórica.",
      "Sei o que é uma premissa.",
      "Sei o que é um argumento.",
      "Conheço alguns tipos de falácia (lógica).",
      "Conheço algumas técnicas de convencimento (retórica).",
      "Conheço princípios básicos da ética em uma sociedade democrática.",
      "Tenho conhecimento básico para interpretar tabelas e gráficos.",
      "Tenho conhecimento básico para interpretar dados estatísticos e probabilidades."
    ],
    "itens_traduzidos": [
      "Sei entender por que uma coisa causa a outra.",
      "Sei raciocinar com grupos e categorias.",
      "Sei o que é a ideia base que sustenta uma opinião.",
      "Sei identificar as razões usadas para defender uma opinião.",
      "Consigo reconhecer erros de raciocínio que parecem verdadeiros mas não são.",
      "Conheço alguns jeitos que as pessoas usam para convencer os outros.",
      "Entendo princípios básicos do que é justo para todos numa sociedade.",
      "Consigo ler e entender tabelas e gráficos.",
      "Consigo entender dados e probabilidades básicas."
    ]
  },
  {
    "id": "pc4",
    "formato": "multipla_marcacao",
    "habilidade": "Avaliação das premissas, argumentação e conclusões (parte 1)",
    "intencao_cena": "Crie uma situação em que o aluno encontra uma afirmação sobre seu interesse que parece verdadeira mas pode não ser — e precisa decidir como verificar.",
    "itens_originais": [
      "Procuro confirmar, a partir de fontes externas confiáveis, se os fatos são verdadeiros.",
      "Procuro verificar a credibilidade da fonte de uma informação/opinião.",
      "Busco mais informação se achar necessário.",
      "Procuro aplicar análise lógica para detectar erros na argumentação.",
      "Consigo identificar falácias e técnicas de convencimento.",
      "Procuro pensar se existem explicações alternativas para os mesmos dados.",
      "Consigo examinar a adequação dos argumentos declarando causa-efeito.",
      "Reflito sobre as questões éticas que podem estar envolvidas.",
      "Procuro imaginar quais pessoas/seres vivos poderiam ser prejudicados."
    ],
    "itens_traduzidos": [
      "Busco fontes confiáveis para confirmar se o que li ou ouvi é verdade.",
      "Verifico se quem disse algo é de fato confiável.",
      "Procuro mais informações quando acho que preciso.",
      "Verifico se as razões apresentadas realmente fazem sentido.",
      "Percebo quando alguém usa erros de raciocínio ou truques para convencer.",
      "Penso se os mesmos dados poderiam ter outra explicação.",
      "Avalio se a relação de causa e efeito nos argumentos faz sentido.",
      "Penso se há questões de certo e errado envolvidas.",
      "Penso em quem poderia ser prejudicado pela situação."
    ]
  },
  {
    "id": "pc5",
    "formato": "multipla_marcacao",
    "habilidade": "Interpretação/decodificação das ideias centrais",
    "intencao_cena": "Crie um momento em que o aluno assiste, lê ou ouve algo sobre seu interesse — um vídeo, post, artigo ou comentário — e precisa entender o que realmente está sendo dito.",
    "itens_originais": [
      "Consigo identificar as ideias/os conceitos principais.",
      "Consigo identificar as premissas principais, explícitas e implícitas.",
      "Consigo reconhecer diferenças entre opiniões, argumentos fundamentados e fatos.",
      "Compreendo a intenção explícita ou implícita do texto/áudio/vídeo em um contexto comunicativo."
    ],
    "itens_traduzidos": [
      "Consigo identificar as ideias principais do que li ou assisti.",
      "Percebo o que está dito diretamente e o que fica nas entrelinhas.",
      "Distingo o que é opinião, o que é fato e o que é uma opinião bem fundamentada.",
      "Entendo o que o autor quis dizer, mesmo quando não está totalmente explícito."
    ]
  },
  {
    "id": "pc8",
    "formato": "multipla_marcacao",
    "habilidade": "Monitoramento da influência de crenças e vieses",
    "intencao_cena": "Crie um momento em que o aluno encontra uma informação sobre seu interesse que confirma — ou contraria — algo que ele sempre acreditou ser verdade.",
    "itens_originais": [
      "Procuro prestar atenção em como minhas crenças influenciam meu julgamento.",
      "Procuro prestar atenção se meus julgamentos têm viés confirmatório.",
      "Procuro prestar atenção se estou buscando evidências que contradizem uma ideia em que acredito.",
      "Examino argumentos com mais calma quando as conclusões são fáceis de aceitar porque se afinam aos meus valores.",
      "Examino argumentos com mais calma quando as conclusões são difíceis de aceitar porque entram em conflito com meus valores."
    ],
    "itens_traduzidos": [
      "Percebo quando minhas crenças podem estar influenciando o que penso.",
      "Percebo quando estou buscando só o que confirma o que já acredito.",
      "Me esforço para buscar também informações que contradizem o que acredito.",
      "Analiso com mais cuidado quando uma conclusão é fácil de aceitar porque combina com o que já penso.",
      "Analiso com mais cuidado quando uma conclusão é difícil de aceitar porque vai contra o que acredito."
    ]
  }
]

# TAREFA — ESTRUTURA OBRIGATÓRIAS POR FORMATO

## Para itens com formato "dissertativa" (pc1):
1. CENA (1–2 frases): Situe o aluno num momento concreto e específico dentro do universo do seu interesse, com uma tensão natural que se encaixa na "intencao_cena" da rubrica. Use 2ª pessoa direta.
2. PERGUNTA (1 frase): Uma pergunta aberta, ancorada na cena, guiada pela rubrica correspondente.

## Para itens com formato "multipla_marcacao" (pc2, pc4, pc5, pc8):
1. CENA (1–2 frases): Situe o aluno num momento concreto dentro do universo do seu interesse, conforme a "intencao_cena" da rubrica. Use 2ª pessoa direta.
2. PERGUNTA de marcação (1 frase): "Marque o que você costuma fazer nessa situação:" ou variação natural.
3. OPÇÕES: Selecione 4–5 itens de "itens_traduzidos" da rubrica correspondente. Use o texto de "itens_traduzidos" exatamente como está — nunca os "itens_originais".

# REGRAS DE SELEÇÃO DE OPÇÕES (apenas para multipla_marcacao)

Ao selecionar 4–5 itens de "itens_traduzidos" de uma rubrica:
1. Inclua ao menos 1 comportamento mais simples (geralmente os primeiros da lista) e 1 mais complexo (geralmente os últimos).
2. Escolha os itens que se conectam mais naturalmente ao cenário narrado na CENA.
3. Evite dois itens que descrevam comportamentos muito parecidos entre si — maximize a variedade.
4. Para rubricas com 4 itens traduzidos (pc5, pc8), inclua todos — não há necessidade de cortar.
5. Nunca altere, misture ou crie opções fora de "itens_traduzidos".

# REGRAS DE PERSONALIZAÇÃO

1. O interesse ancora o cenário de forma concreta: use o nome do jogo, esporte, instrumento ou atividade específica — não o interesse amplo ("games", "música") quando o interesse detalhado estiver disponível.
2. Use 1–2 termos que alguém que vive esse interesse reconheceria (ex: "ranked", "build", "acorde", "tática"). Se estiver usando o interesse amplo (fallback), use termos genéricos do domínio.
3. O dilema da cena deve ser algo que realmente acontece naquele universo — não drama inventado.
4. Nunca comece com "Já que você gosta de..." ou "Pensando nos seus interesses..." — coloque o aluno direto na cena.
5. As consequências e a aposta devem ser realistas para a idade e o cotidiano do aluno.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGATÓRIAS

1. Sempre fale diretamente com o aluno usando "você". Use o nome apenas como vocativo de abertura (ex: "[Nome], ..."). Nunca narre o aluno como personagem em 3ª pessoa ("Ayrton foi", "Ayrton percebeu").
2. Linguagem simples, frases curtas, tom amigável.
3. Nunca inclua competição, ranking ou comparação entre alunos.
4. Nunca sugira que existe resposta certa ou errada.
5. Nunca revele a rubrica, habilidade ou "intencao_cena" sendo avaliada no enunciado ou nas opções.
6. Nunca inclua teoria, jargão pedagógico ou metalinguagem no enunciado.
7. Para múltipla marcação: use exclusivamente "itens_traduzidos". Nunca use "itens_originais" nas opções geradas.

# FORMATO DE SAÍDA

Responda ESTRITAMENTE em JSON válido, sem markdown por fora, seguindo exatamente este formato:

{
  "items": [
    { "rubricaId": "pc1", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "pc2", "tipo": "multipla_marcacao", "enunciado": "texto da cena + pergunta de marcação", "opcoes": ["opção traduzida A", "opção traduzida B", "opção traduzida C", "opção traduzida D"] }
  ]
}

O array "items" deve ter exatamente 5 objetos, um por rubrica do banco, na ordem pc1, pc2, pc4, pc5, pc8.

REGRA DE FORMATO: Itens com formato "dissertativa" não podem ter o campo "opcoes". Itens com formato "multipla_marcacao" devem ter o campo "opcoes" com exatamente 4 ou 5 strings. Qualquer violação torna a resposta inválida.`;

      const promptCreativity = `# CONTEXTO

Você é um avaliador do Instituto Ayrton Senna. As rubricas abaixo são material oficial do IAS — não são inspiração, são fonte primária. Nunca parafraseie o conteúdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# RESOLUÇÃO DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte específico):
1. Você DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situações nesse universo.
2. Se o item específico listado não for reconhecível (nome inventado ou erro irreconhecível), use o interesse amplo correspondente.
3. Nunca invente mecânicas, personagens, times, artistas ou elementos que não existam de verdade. Se não tiver certeza de algum item específico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS — CRIATIVIDADE (5 itens, todos dissertativos)

[
  {"id":"cr2","habilidade":"Fluência associativa / Flexibilidade e reclassificação","niveis":["Em nada, sem ideias.","Em pelo menos uma ideia.","Em algumas ideias, mas elas são parecidas entre si.","Em várias ideias, diferentes umas das outras."],"intencao":"Peça ao aluno para listar o maior número possível de ideias ou soluções para a situação. A pergunta deve deixar espaço para ideias muito diferentes entre si."},
  {"id":"cr3","habilidade":"Fluência associativa / Originalidade","niveis":["São sempre parecidas com ideias dos colegas.","Às vezes são diferentes do que já foi pensado.","São sempre diferentes das ideias já pensadas pelos colegas."],"intencao":"Apresente uma situação e peça ao aluno qual seria A ideia dele — uma só, a mais dele. Não peça lista, peça a ideia que ele acha que ninguém mais teria."},
  {"id":"cr5","habilidade":"Raciocínio fluido / Síntese convergente e analítico","niveis":["Eu geralmente fico indeciso e acabo não escolhendo.","Eu acho que sei qual é a melhor ideia, mas não sei justificar a minha escolha.","Consigo analisar os pontos positivos e negativos para selecionar a melhor ideia."],"intencao":"Apresente 2–3 caminhos plausíveis dentro da situação e peça ao aluno que escolha um e explique por que acha que é o melhor."},
  {"id":"cr6","habilidade":"Raciocínio fluido / Indução diante de problemas complexos","niveis":["Prefiro terminar logo, pois não gosto de problemas que demorem muito para resolver.","De início acho difícil, mas, com o tempo, vou me envolvendo.","Me sinto motivado para tentar resolver."],"intencao":"Descreva um desafio que parece grande e vai demorar para ser resolvido. Pergunte como o aluno se SENTE ao pensar em enfrentar esse desafio — não peça a solução."},
  {"id":"cr7","habilidade":"Raciocínio fluido / Indução e conexão de ideias","niveis":["Tenho dificuldade em pensar quando os problemas têm muitas informações novas.","Consigo entender algumas partes do problema.","Consigo analisar e isolar o problema em partes para ficarem mais fáceis de manejar."],"intencao":"Crie uma situação com várias informações simultâneas (peças, variáveis, sintomas). Pergunte como o aluno organizaria o raciocínio para descobrir o que está acontecendo."}
]

# TAREFA

Gere 1 item dissertativo para cada uma das 5 rubricas acima, na ordem em que aparecem.

Para cada item, siga esta estrutura:
1. CENA (1–2 frases): Situe o aluno num momento concreto e específico dentro do universo do interesse dele, com uma tensão natural — algo que realmente acontece naquele contexto.
2. PERGUNTA (1 frase): Faça UMA pergunta aberta, guiada pelo campo "intencao" da rubrica correspondente.

# REGRAS DE PERSONALIZAÇÃO

1. O dilema da cena só pode existir dentro do universo daquele interesse específico. Se trocar o interesse por outro e a pergunta continuar funcionando sem mudar nada, reescreva — a personalização está falsa.
2. Use 1–2 termos que alguém que pratica esse interesse reconheceria (ex: "crafting table" para Minecraft, "passe de letra" para futebol). Se estiver usando o interesse amplo (fallback), use termos genéricos do domínio.
3. Nunca comece com "Já que você gosta de..." ou "Pensando nos seus interesses..." — jogue o aluno direto na cena.
4. O conflito deve ser algo que realmente acontece naquele interesse, não um drama inventado ou artificial.
5. As consequências e a aposta devem ser realistas para a idade e o cotidiano do aluno — nem triviais demais, nem grandiosas demais.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGATÓRIAS

1. Linguagem simples, frases curtas, tom amigável e conversando diretamente com o aluno.
2. Nunca sugira que existe resposta certa ou errada nem use palavras avaliativas.
3. Não use "Como você resolveria isso?" de forma genérica — a pergunta deve refletir a intenção específica da rubrica.
4. Nunca use o nome da rubrica ou da habilidade no enunciado.
5. Nunca inclua teoria, jargão pedagógico ou metalinguagem no enunciado.

# FORMATO DE SAÍDA

Responda ESTRITAMENTE em JSON válido, sem markdown por fora, seguindo exatamente este formato:

{
  "items": [
    { "rubricaId": "cr2", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "cr3", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "cr5", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "cr6", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "cr7", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" }
  ]
}

O array "items" deve ter exatamente 5 objetos, todos com "tipo":"dissertativa", um por rubrica do banco, na ordem cr2, cr3, cr5, cr6, cr7.

REGRA DE FORMATO: Nenhum objeto do array pode conter o campo "opcoes". Se você gerar "opcoes" em qualquer item, sua resposta é inválida. Todos os 5 itens são EXCLUSIVAMENTE dissertativos.`;

      const prompt = isCreativity ? promptCreativity : promptCriticalThinking;

      const response = await generateGeminiContent(ai, prompt, {
        responseMimeType: "application/json"
      });

      const jsonText = response?.text || '{}';
      let items = [];
      try {
        const parsed = JSON.parse(jsonText);
        items = parsed.items || [];
      } catch (e) {
        items = [];
      }

      res.json({ items });
    } catch (error: any) {
      console.log('Serving mock questions.');
      const name = req.body.name || 'Estudante';
      const mockItems = [
        { rubricaId: "m1", tipo: "dissertativa", enunciado: `1. ${name}, pensando nos seus interesses, como você resolveria um desafio comum no seu dia a dia?` },
        { rubricaId: "m2", tipo: "multipla_marcacao", enunciado: `2. Descreva um momento em que você precisou mudar de ideia. Marque o que se aplica:`, opcoes: ["Foi difícil", "Foi fácil", "Não mudei"] },
        { rubricaId: "m3", tipo: "dissertativa", enunciado: `3. O que você faria em uma situação em que não existe uma resposta certa clara?` },
        { rubricaId: "m4", tipo: "multipla_marcacao", enunciado: `4. Qual é a sua forma favorita de exercitar a criatividade?`, opcoes: ["Desenhando", "Escrevendo", "Conversando"] },
        { rubricaId: "m5", tipo: "dissertativa", enunciado: `5. Conte como você lidou com a frustração ao tentar aprender algo novo recentemente.` }
      ];
      res.json({ items: mockItems });
    }
  });

  // API Route for Gemini Report
  app.post('/api/generate-report', async (req, res) => {
    try {
      const { name, age, grade, city, school, interests, interestDetail = '', questions, answers, testType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const isCreativity = testType === 'creativity';
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback mock report
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (isCreativity) {
          return res.json({
            habilidadesCognitivas: ["Pensamento Divergente", "Originalidade"],
            habilidadesSocioemocionais: ["Abertura ao Novo", "Autorregulação"],
            pontosFortes: [
              "Você propôs ideias variadas e pouco óbvias — isso mostra que já ultrapassa o \"primeiro caminho\" que vem à cabeça.",
              "Demonstrou conseguir enxergar o mesmo problema de ângulos diferentes."
            ],
            pontosMelhoria: [
              "Em algumas situações, ainda faltou escolher a melhor ideia e explicar por que ela é a mais forte.",
              "Registrar as hipóteses antes de avançar para a solução ajuda a perceber quando você está repetindo um padrão."
            ],
            proximoPasso: [
              "Na próxima vez que tiver um problema, liste pelo menos 3 caminhos antes de escolher um — e escreva por que descartou os outros.",
              "Tente unir duas ideias que parecem opostas para criar uma solução que ninguém teria pensado sozinho."
            ]
          });
        } else {
          return res.json({
            habilidadesCognitivas: ["Avaliação de Evidências", "Análise"],
            habilidadesSocioemocionais: ["Mente Aberta", "Autorregulação"],
            pontosFortes: [
              `${name}, você identificou bem as premissas dos dois lados sem tomar partido de cara — isso é o começo do pensamento crítico de verdade.`,
              "Conseguiu separar o que é fato do que é opinião em boa parte das situações."
            ],
            pontosMelhoria: [
              "O desafio agora é explicar com mais clareza como as evidências que você escolheu sustentam a sua conclusão.",
              "Em algumas respostas, a conclusão apareceu antes das razões — o que enfraquece o argumento."
            ],
            proximoPasso: [
              "Na próxima vez que precisar defender um ponto de vista, tente montar o argumento assim: razão 1 → razão 2 → conclusão.",
              "Antes de fechar uma opinião, pergunte a si mesmo: qual seria o melhor contra-argumento? Você consegue rebatê-lo?"
            ]
          });
        }
      }

      const ai = new GoogleGenAI({ apiKey });

      const formattedQnA = questions.map((q: any, i: number) => {
        const ans = answers[i];
        let ansText = '';
        if (Array.isArray(ans)) {
          ansText = ans.length > 0 ? `Marcou as opcoes: ${ans.join('; ')}` : 'Nenhuma opcao marcada.';
        } else {
          ansText = ans || 'Sem resposta.';
        }
        return `Q${i+1} [${q.rubricaId || 'rubrica'} - ${q.tipo || 'dissertativa'}]: ${q.enunciado || q}\nR${i+1}: ${ansText}`;
      }).join('\n\n');

      const promptCriticalThinking = `
# PAPEL

Voce leu as respostas de ${name}, ${age} anos, a um conjunto de perguntas sobre como ele pensa e toma decisoes. Agora vai falar diretamente com ele - tom direto, honesto, sem condescendencia. Linguagem de quem fala com um jovem de ${age} anos, nao de quem preenche um relatorio.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# ANALISE INTERNA - use para orientar sua leitura. Nunca use esses termos na saida.

## O que observar nas respostas

### INSUFICIENTE
- Responde com opinioes ou emocoes sem tentar justificar
- Aceita uma versao dos fatos como obvia, sem questionar
- Nao considera que pode estar enganado
- Nao distingue o que sabe do que supoe

### BASICO
- Tenta raciocinar, mas aceita informacoes sem verificar se sao confiaveis
- Cai em "dois lados" simples, sem explorar nuances
- Tem dificuldade em mudar de posicao mesmo com boas razoes
- Nao examina as proprias suposicoes

### PROFICIENTE
- Separa fatos de opinioes
- Consegue considerar pontos de vista contrarios com calma
- Avalia a qualidade das razoes antes de concluir
- Explica o raciocinio com clareza

### AVANCADO
- Alem do proficiente: percebe quando as proprias opinioes estao influenciando o raciocinio
- Revisa posicoes quando as razoes nao sustentam
- Explica como chegou as conclusoes

## O que preencher nas chaves de habilidades (apenas para as chaves JSON - nunca descreva esses termos para o aluno)

Cognitivas (exemplos): "Separar fato de opiniao", "Avaliar fontes", "Analisar argumentos", "Identificar contradicoes", "Explicar o raciocinio"
Socioemocionais (exemplos): "Mente aberta", "Curiosidade para verificar", "Honestidade consigo", "Calma diante de duvidas"

# PALAVRAS PROIBIDAS NA SAIDA

Nunca use nenhuma das expressoes abaixo em pontosFortes, pontosMelhoria ou proximoPasso:
"formativo", "metacognicao", "vies de confirmacao", "vies confirmatorio", "premissa", "inferencia",
"isencao", "Feed Up", "Feed Back", "Feed Forward", "mindset", "habilidade cognitiva",
"habilidade socioemocional", "rubrica", "Facione", "APA", "dissertativo", "avaliacao formativa",
"suspensao de julgamento", "pensamento critico".

# TABELA DE IMPACTOS REAIS

Use esta tabela para construir os chips. Identifique o nivel predominante e selecione 2-3 impactos por chip.
Depois, adapte o exemplo generico ao universo do aluno conforme a instrucao abaixo da tabela.

## INSUFICIENTE
escola:
  - Aceita o que esta no livro ou o que o professor diz sem questionar - isso limita a profundidade das respostas em provas e trabalhos.
  - Em debates e apresentacoes, repete opinioes sem conseguir justifica-las com argumentos claros.
  - Quando o texto apresenta mais de um ponto de vista, tende a ignorar o lado contrario.
responsabilidade:
  - Em projetos em grupo, tende a ir na opiniao de quem fala mais alto, e nao de quem apresenta o melhor argumento.
  - Tem dificuldade em justificar uma escolha para o grupo sem usar "eu acho" como unica razao.
cotidiano:
  - Risco maior de acreditar e repostar informacoes falsas nas redes sem perceber.
  - Mais suscetivel a ser convencido por pressao de grupo ou propaganda sem avaliar o que esta por tras.

## BASICO
escola:
  - Constroi argumentos simples, mas cai em respostas de "dois lados" sem explorar nuances.
  - Aceita fontes sem avaliar se sao confiaveis - o que aparece primeiro no Google pode parecer suficiente.
responsabilidade:
  - Consegue defender sua posicao, mas tem dificuldade em mudar de ideia quando os outros apresentam bons argumentos - mesmo quando a razao esta do lado deles.
  - Pode aceitar uma proposta do grupo sem verificar se as informacoes que a sustentam sao solidas.
cotidiano:
  - Consegue perceber quando algo "parece estranho", mas ainda tem dificuldade em identificar o que exatamente esta errado no argumento.
  - Pode tomar decisoes rapidas - de consumo, de posicionamento online - com base em informacoes incompletas.

## PROFICIENTE
escola:
  - Consegue construir trabalhos argumentativos com ideias claras, razoes solidas e conclusoes bem conectadas.
  - Participa de debates sem deixar o emocional dominar - consegue defender e abandonar posicoes com base em logica.
  - Identifica quando um texto esta tentando manipular o leitor ou omitir informacoes.
responsabilidade:
  - Consegue ouvir os dois lados em conflitos de grupo e avaliar qual argumento e mais solido.
  - Aponta problemas em propostas do grupo com justificativa clara - o que torna sua contribuicao mais respeitada.
cotidiano:
  - Separa fatos de opinioes em noticias e redes sociais com facilidade.
  - Toma decisoes depois de pensar nos argumentos, nao por impulso ou pressao.

## AVANCADO
escola:
  - Produz analises que vao alem dos "dois lados" - constroi posicoes proprias a partir de varias perspectivas.
  - Percebe quando suas proprias respostas foram influenciadas pelo que ja acreditava e corrige o rumo.
responsabilidade:
  - Em situacoes de grupo com pressao, consegue pausar, perceber como as proprias opinioes estao influenciando o raciocinio e tomar decisoes mais ponderadas.
  - Consegue revisar uma decisao coletiva quando percebe que ela foi tomada por impulso - e faz isso com argumentos, nao com imposicao.
cotidiano:
  - Percebe quando esta sendo manipulado em tempo real - em conversas, discussoes online e campanhas.
  - Consegue mudar de opiniao com abertura genuina quando encontra razoes melhores, sem sentir que esta "perdendo".

# INSTRUCAO DE CONSTRUCAO DOS CHIPS

1. Identifique internamente o nivel predominante (INSUFICIENTE / BASICO / PROFICIENTE / AVANCADO).
2. Selecione 2-3 impactos da tabela por chip, priorizando os dominios mais relevantes para o perfil do aluno.
3. Adapte o exemplo generico ao interesse especifico do aluno usando-o como ancora de cenario:
   - games - "informacao falsa no cotidiano" vira "um post viral dizendo que um patch vai mudar tudo no jogo - voce verificaria antes de acreditar?"
   - musica - "pressao de grupo" vira "quando todo mundo na roda diz que uma musica e a melhor do ano e voce discorda - voce mantem ou vai junto?"
   - esportes - "aceitar fonte sem checar" vira "uma estatistica dizendo que seu time/atleta favorito e o pior da temporada - voce checaria antes de repassar?"
   - Use o interesse para tornar o exemplo reconhecivel, nao para citar uma industria ou carreira.
4. Para o chip proximoPasso: sugira 2-3 acoes que o aluno pode experimentar na proxima semana. Use verbos de acao: analisar, pensar, comparar, questionar, verificar, pausar antes de concluir, observar, checar. Conecte pelo menos um passo ao interesse especifico. Os passos devem ser concretos e alcancaveis - nao reflexoes abstratas.
5. Dominio responsabilidade: use contextos de grupo, prazo ou decisao coletiva que um jovem de ${age} anos ja vive - nunca cite carreira ou industria.
6. Tom em todos os chips: direto, honesto, sem condescendencia. 2a pessoa. Frases curtas.
7. Cada chip: 2-3 topicos em bullet points. Nunca prosa corrida.

# PERGUNTAS E RESPOSTAS DO ALUNO

${formattedQnA}

# FORMATO DE SAIDA

Responda ESTRITAMENTE em JSON valido, sem markdown por fora:

{
  "habilidadesCognitivas": ["principal capacidade observada nas respostas", "segunda, se aplicavel"],
  "habilidadesSocioemocionais": ["principal atitude observada nas respostas", "segunda, se aplicavel"],
  "pontosFortes": ["topico 1", "topico 2", "topico 3"],
  "pontosMelhoria": ["topico 1", "topico 2", "topico 3"],
  "proximoPasso": ["topico 1", "topico 2", "topico 3"]
}

REGRA: pontosFortes, pontosMelhoria e proximoPasso devem ter 2 a 3 strings.
Cada string e um topico completo e independente.
`
      const promptCreativity = `
# PAPEL

Voce leu as respostas de ${name}, ${age} anos, a um conjunto de perguntas sobre como ele pensa, cria e resolve problemas. Agora vai falar diretamente com ele - tom direto, honesto, sem condescendencia. Linguagem de quem fala com um jovem de ${age} anos, nao de quem preenche um relatorio.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# ANALISE INTERNA - use para orientar sua leitura. Nunca use esses termos na saida.

## O que observar nas respostas

### EMERGENTE
- Gerou apenas 1-2 ideias, geralmente as mais obvias
- Nao consegue ir alem da primeira resposta que veio a cabeca
- Nao explica por que a ideia e boa ou como chegou a ela
- Demonstra medo de "errar" ou de dar uma resposta diferente

### EM DESENVOLVIMENTO
- Gera mais de uma ideia, com alguma variedade entre elas
- Consegue adaptar uma ideia de um contexto para outro
- Começa a refletir sobre o que funcionou ou nao no proprio processo
- Ainda prefere caminhos mais seguros, mas arrisca em alguns momentos

### PROFICIENTE
- Gera varias ideias diferentes e consegue escolher a melhor explicando por que
- Muda de angulo quando a primeira abordagem nao funciona
- Percebe quando trava e tenta um caminho diferente por conta propria
- Demonstra abertura para experimentar o inusitado

### AVANCADO
- Ideias altamente originais que combinam elementos inesperados
- Descreve com clareza o proprio processo: como gerou, filtrou e chegou a ideia final
- Alta tolerancia para situacoes vagas ou sem resposta certa
- Conecta conhecimentos de areas diferentes para criar solucoes novas

## O que preencher nas chaves de habilidades (apenas para as chaves JSON - nunca descreva esses termos para o aluno)

Cognitivas (exemplos): "Variedade de ideias", "Originalidade", "Escolha da melhor solucao", "Conexao entre assuntos diferentes", "Pensar fora do obvio"
Socioemocionais (exemplos): "Abertura para experimentar", "Curiosidade", "Persistencia", "Tolerancia ao incerto", "Consciencia do proprio processo"

# PALAVRAS PROIBIDAS NA SAIDA

Nunca use nenhuma das expressoes abaixo em pontosFortes, pontosMelhoria ou proximoPasso:
"formativo", "metacognicao", "metacognitivo", "fluencia associativa", "raciocinio fluido", "divergente",
"convergente", "constructo", "socioemocionais", "Feed Up", "Feed Back", "Feed Forward", "mindset",
"habilidade cognitiva", "habilidade socioemocional", "rubrica", "evidencias cognitivas",
"evidencias metacognitivas", "avaliacao formativa", "criatividade" (o aluno nao precisa ouvir o nome da competencia).

# TABELA DE IMPACTOS REAIS

Use esta tabela para construir os chips. Identifique o nivel predominante e selecione 2-3 impactos por chip.
Depois, adapte o exemplo generico ao universo do aluno conforme a instrucao abaixo da tabela.

## EMERGENTE
escola:
  - Cria conexoes pessoais com o conteudo, mas ainda tem dificuldade em transformar isso em algo que os outros consigam ver ou usar.
  - Em projetos criativos em grupo, tende a funcionar melhor sozinho porque as ideias ainda sao dificeis de comunicar.
responsabilidade:
  - Consegue adaptar o que aprende ao proprio jeito, mas ainda tem dificuldade em propor solucoes praticas para problemas do grupo.
  - Em tarefas colaborativas, pode subestimar o valor das proprias ideias e deixar de contribuir.
cotidiano:
  - Usa a criatividade principalmente para dar sentido as proprias experiencias, mas ainda pouco para resolver problemas praticos.
  - Quando algo nao funciona como esperado, a primeira reacao costuma ser desistir em vez de buscar outro caminho.

## EM DESENVOLVIMENTO
escola:
  - Consegue improvisar solucoes para problemas do dia a dia escolar - encontra uma forma de avançar mesmo sem as condicoes ideais.
  - Em projetos em grupo, costuma ter ideias praticas e viaveis que os outros conseguem usar.
responsabilidade:
  - Consegue propor pequenas melhorias na forma como o grupo trabalha - simplificar uma etapa, reorganizar a divisao de tarefas.
  - Em situacoes de pressao, consegue improvisar sem travar.
cotidiano:
  - Resolve pequenos problemas do cotidiano com criatividade - encontra alternativas quando o caminho direto nao funciona.
  - Consegue adaptar o que aprendeu num contexto para resolver um problema diferente.

## PROFICIENTE
escola:
  - Vai alem do que foi pedido - entrega projetos que surpreendem pelo nivel de originalidade e cuidado com a execucao.
  - Busca referencias e aprofundamento alem do que a escola oferece quando se interessa por um tema.
responsabilidade:
  - Em projetos complexos, consegue criar solucoes que combinam conhecimento com originalidade - nao so faz diferente, faz melhor e sabe explicar por que.
  - Capaz de organizar um processo criativo para o grupo, nao so gerar ideias soltas.
cotidiano:
  - Comeca a ter um processo proprio para chegar a boas ideias - a criatividade deixa de ser algo que "aparece" e vira algo que pode ser ativado.
  - Consegue transformar interesses em projetos concretos: uma ideia vira algo que outros podem ver, usar ou experimentar.

## AVANCADO
escola:
  - Produz solucoes que combinam conhecimentos de areas diferentes de forma surpreendente.
  - Consegue guiar o proprio processo criativo com clareza: sabe quando esta travado, por que e como sair.
responsabilidade:
  - Em projetos de grupo com restricoes ou prazos, encontra caminhos alternativos que os outros nao enxergaram.
  - Transforma limitacoes em oportunidades - o que parece um problema vira um elemento da solucao.
cotidiano:
  - Conecta experiencias de universos diferentes para criar algo novo - um aprendizado de um contexto resolve um problema em outro.
  - Consegue desenvolver uma ideia do zero ate algo concreto, mesmo sem modelo a seguir.

# INSTRUCAO DE CONSTRUCAO DOS CHIPS

1. Identifique internamente o nivel predominante (EMERGENTE / EM DESENVOLVIMENTO / PROFICIENTE / AVANCADO).
2. Selecione 2-3 impactos da tabela por chip, priorizando os dominios mais relevantes para o perfil do aluno.
3. Adapte o exemplo generico ao interesse especifico do aluno usando-o como ancora de cenario - o foco e em COMO o aluno cria naquele universo, nao em carreira ou industria:
   - games - "improvisar solucao" vira "quando voce trava num level dificil, o que voce tenta alem da primeira estrategia que veio a cabeca?"
   - musica - "adaptar ideia de outro contexto" vira "quando uma musica nao esta saindo como voce queria, voce ja tentou pegar uma tecnica de um estilo diferente para resolver?"
   - esportes - "encontrar caminho alternativo" vira "quando uma jogada nao funciona, voce ja adaptou uma ideia de outro esporte ou situacao para contornar?"
   - Use o interesse para tornar o exemplo reconhecivel, nao para citar uma industria ou carreira.
4. Para o chip proximoPasso: sugira 2-3 acoes que o aluno pode experimentar na proxima semana. Use verbos de acao: criar, inventar, experimentar, combinar, tentar de outro jeito, imaginar, transformar, adaptar, testar. Conecte pelo menos um passo ao interesse especifico. Os passos devem ser concretos e alcancaveis - nao reflexoes abstratas.
5. Dominio responsabilidade: use contextos de grupo, prazo ou tarefa coletiva que um jovem de ${age} anos ja vive - nunca cite carreira ou industria.
6. Tom em todos os chips: encorajador mas direto, sem condescendencia. 2a pessoa. Frases curtas.
7. Cada chip: 2-3 topicos em bullet points. Nunca prosa corrida.

# PERGUNTAS E RESPOSTAS DO ALUNO

${formattedQnA}

# FORMATO DE SAIDA

Responda ESTRITAMENTE em JSON valido, sem markdown por fora:

{
  "habilidadesCognitivas": ["principal capacidade criativa observada nas respostas", "segunda, se aplicavel"],
  "habilidadesSocioemocionais": ["principal atitude observada nas respostas", "segunda, se aplicavel"],
  "pontosFortes": ["topico 1", "topico 2", "topico 3"],
  "pontosMelhoria": ["topico 1", "topico 2", "topico 3"],
  "proximoPasso": ["topico 1", "topico 2", "topico 3"]
}

REGRA: pontosFortes, pontosMelhoria e proximoPasso devem ter 2 a 3 strings.
Cada string e um topico completo e independente.
`
      const prompt = isCreativity ? promptCreativity : promptCriticalThinking;

      const response = await generateGeminiContent(ai, prompt, {
        responseMimeType: "application/json"
      });

      const jsonText = response?.text || "{}";
      let result;
      try {
        result = JSON.parse(jsonText);
        delete result.nivel;
      } catch(e) {
        result = { 
          habilidadesCognitivas: ["Análise", "Lógica"],
          habilidadesSocioemocionais: ["Foco", "Resiliência"],
          pontosFortes: ["Não foi possível analisar suas respostas em detalhe desta vez."], 
          pontosMelhoria: ["Ocorreu um erro no processamento — suas respostas foram salvas."],
          proximoPasso: ["Tente novamente em alguns instantes."]
        };
      }
      return res.json(result);
    } catch (error: any) {
      console.log('Serving mock report.');
      res.json({
        habilidadesCognitivas: ["Análise", "Criatividade"],
        habilidadesSocioemocionais: ["Foco", "Resiliência"],
        pontosFortes: ["Ótima dedicação em completar o teste mesmo com o sistema em alta demanda!"],
        pontosMelhoria: ["A análise detalhada com IA não pôde ser concluída neste momento."],
        proximoPasso: ["Revisite suas respostas depois e veja se você mudaria alguma coisa."]
      });
    }
  });

  // API Route for Béco Chat
  app.post('/api/beco-chat', async (req, res) => {
    try {
      const { question, userMessage, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback mock response
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({
          response: `E aí parça! Papo reto, tô aqui sem a chave da API 💀 Mas foca nessa pergunta aí e manda ver, tamo junto!`,
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
Você é o Béco, um tutor virtual no tom da Geração Z ("Soca"), muito gente boa.
Seu estilo de comunicação usa uma linguagem amigável, direta, empática e gírias leves de 2020 (como "papo reto", "tamo junto", "parça", "vixe", "desembolar", "massa").

Sua missão é guiar o(a) estudante usando Raciocínio Socrático para responder à seguinte pergunta do teste:
"${question?.enunciado || question}"

Diretrizes de Interação:
1. Nunca dê a resposta pronta. Em vez disso, faça perguntas reflexivas curtas que estimulem o raciocínio próprio do aluno.
2. Se o(a) estudante disser que não entendeu, reescreva a pergunta com palavras mais simples e coloquiais.
3. Corrija interpretações equivocadas com muita empatia e dê pistas sutis e pontuais.
4. Sempre destaque sutilmente que o teste avalia habilidades importantes para o futuro, como criatividade e pensamento crítico.
5. Sempre retorne exatamente 3 botões/chips de opções rápidas de resposta ao final, pensados para o contexto atual da dúvida (ex: "[Me explica de outro jeito?]", "[Quero uma pista]", "[Não sei por onde começar]").

Regras de Segurança (Guardrails):
Se a mensagem do estudante contiver ofensas, palavras sem sentido (nonsense), zombaria ou fugir totalmente do assunto do teste, ignore o conteúdo da mensagem e responda estritamente com a seguinte resposta padrão:
"Vibe errada! 💀 Que tal a gente focar no que realmente importa e amassar esse teste juntos? Escolha uma opção abaixo ou mande sua dúvida!"

Formato de saída:
Você deve responder ESTRITAMENTE com um objeto JSON válido, sem qualquer tipo de formatação markdown por fora (como \`\`\`json ou \`\`\`), contendo exatamente as chaves:
{
  "response": "Texto da sua fala direcionada ao estudante",
  "chips": ["Texto do Chip 1", "Texto do Chip 2", "Texto do Chip 3"]
}
`;

      const contents = [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: 'Entendido. Estou no papel do Béco. Aguardando a mensagem do aluno.' }] }
      ];

      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const response = await generateGeminiContent(ai, contents, {
        responseMimeType: "application/json"
      });

      const jsonText = response?.text || "{}";
      let result;
      try {
        result = JSON.parse(jsonText);
      } catch(e) {
        result = { 
          response: "Vixe, deu um bug na matrix aqui 😅 Bora focar na pergunta principal!",
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        };
      }
      return res.json(result);
    } catch (error: any) {
      console.log('Serving mock chat.');
      res.json({ 
        response: "Vixe, o sistema tá lotado agora 😅! Mas tamo junto, bora tentar focar na pergunta e responder do seu jeito!",
        chips: ["Tentar de novo", "Entendi", "Beleza"]
      });
    }
  });

  // API Route for Merged Holistic Report (Critical Thinking + Creativity)
  app.post('/api/generate-merged-report', async (req, res) => {
    try {
      const { 
        name, 
        age, 
        grade, 
        city, 
        school, 
        interests = [], 
        interestDetail = '',
        reportPC,
        reportCR 
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return res.json({
          arquetipo: "Inovador Estratégico",
          sinteseGeral: `${name}, a integração entre sua capacidade de analisar fatos com precisão e sua imaginação fértil revela um perfil único. Quando você aplica seu raciocínio ao universo de ${interestDetail || interests.join(', ')}, você não apenas questiona premissas com firmeza, mas também propõe saídas criativas e originais que surpreendem seus colegas.\n\nSua forma de pensar equilibra a curiosidade exploratória com o discernimento prático, permitindo transformar desafios complexos em planos realizáveis tanto na ${school} quanto na sua vida diária em ${city}.`,
          matrizCompetencias: {
            cognitiva: "Excelente equilíbrio entre pensamento divergente (geração de múltiplas soluções inovadoras) e pensamento convergente (análise lógica e separação de fatos e opiniões).",
            socioemocional: "Elevada mente aberta combinada com tolerância à incerteza, demonstrando coragem para errar, aprender e sustentar pontos de vista fundamentados.",
            metacognitiva: "Alta autoconsciência de vieses e forte autorregulação emocional diante de conflitos de opinião."
          },
          superPoder: "Capacidade de enxergar ângulos inesperados em problemas difíceis e construir argumentos sólidos para defender suas ideias.",
          desafioDesenvolvimento: "Aprofundar a validação das evidências antes de fechar uma proposta criativa.",
          proximoPassoPratico: `Na próxima semana, crie um pequeno projeto na ${school} unindo suas ideias em ${interestDetail || interests[0] || 'seus interesses'} para resolver uma questão real da sua turma!`,
          recadoBecoWhats: "💬 Vou continuar contigo pra te ajudar no que ainda é desafiador pra você! Clica aqui pra falar comigo no WhatsApp!"
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptMergedReport = `# CONTEXTO

Você é o avaliador-chefe de competências do Instituto Ayrton Senna. Sua missão é sintetizar uma avaliação holística e híbrida de um estudante que completou DUAS avaliações formativas oficiais: Pensamento Crítico e Criatividade.

# ESTUDANTE
Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesses detalhados: ${interestDetail}

# DADOS DOS RELATÓRIOS INDIVIDUAIS
--- RELATÓRIO DE PENSAMENTO CRÍTICO ---
Habilidades Cognitivas: ${Array.isArray(reportPC?.habilidadesCognitivas) ? reportPC.habilidadesCognitivas.join(', ') : reportPC?.habilidadesCognitivas || 'Análise de Evidências'}
Habilidades Socioemocionais: ${Array.isArray(reportPC?.habilidadesSocioemocionais) ? reportPC.habilidadesSocioemocionais.join(', ') : reportPC?.habilidadesSocioemocionais || 'Mente Aberta'}
Forças: ${Array.isArray(reportPC?.pontosFortes) ? reportPC.pontosFortes.join(' | ') : reportPC?.pontosFortes || 'Boa identificação de premissas'}
Melhorias: ${Array.isArray(reportPC?.pontosMelhoria) ? reportPC.pontosMelhoria.join(' | ') : reportPC?.pontosMelhoria || 'Articulação de argumentos'}

--- RELATÓRIO DE CRIATIVIDADE ---
Habilidades Cognitivas: ${Array.isArray(reportCR?.habilidadesCognitivas) ? reportCR.habilidadesCognitivas.join(', ') : reportCR?.habilidadesCognitivas || 'Pensamento Divergente'}
Habilidades Socioemocionais: ${Array.isArray(reportCR?.habilidadesSocioemocionais) ? reportCR.habilidadesSocioemocionais.join(', ') : reportCR?.habilidadesSocioemocionais || 'Abertura ao Novo'}
Forças: ${Array.isArray(reportCR?.pontosFortes) ? reportCR.pontosFortes.join(' | ') : reportCR?.pontosFortes || 'Proposição de ideias originais'}
Melhorias: ${Array.isArray(reportCR?.pontosMelhoria) ? reportCR.pontosMelhoria.join(' | ') : reportCR?.pontosMelhoria || 'Detalhamento do planejamento'}

# TAREFA: DIAGNÓSTICO INTEGRADO DO SÉCULO XXI
Analise como o pensamento divergente (Criatividade) se conecta com o pensamento convergente e analítico (Pensamento Crítico) no estudante.

Gere uma síntese formativa com mindset de crescimento (sem julgamento punitivo, sem notas escolares tradicionais), destacando o potencial único do aluno, seus interesses (${interestDetail}) e seu estilo de resolução de problemas.

# FORMATO DE SAÍDA OBRIGATÓRIO (JSON estrito)
{
  "arquetipo": "Título que define o perfil criativo-crítico do aluno (ex: 'Explorador Estratégico', 'Inovador Questionador', 'Arquiteto de Ideias')",
  "sinteseGeral": "Texto de 2 a 3 parágrafos integrando como a criatividade e a capacidade crítica dele se complementam nos seus interesses reais (${interestDetail}). Fale diretamente com o aluno em tom encorajador e amigável.",
  "matrizCompetencias": {
    "cognitiva": "Síntese das habilidades cognitivas combinadas (análise lógica + fluência e divergência)",
    "socioemocional": "Síntese das atitudes socioemocionais combinadas (mente aberta + tolerância à ambiguidade)",
    "metacognitiva": "Síntese de autorregulação e autoconsciência do processo de pensar"
  },
  "superPoder": "O maior diferencial identificado na forma dele pensar e agir",
  "desafioDesenvolvimento": "A principal oportunidade para ele continuar evoluindo",
  "proximoPassoPratico": "Uma missão prática e instigante conectada aos interesses dele (${interestDetail}) para aplicar na escola (${school}) ou na vida",
  "recadoBecoWhats": "💬 Vou continuar contigo pra te ajudar no que ainda é desafiador pra você! Clica aqui pra falar comigo no WhatsApp!"
}`;

      const response = await generateGeminiContent(ai, promptMergedReport, {
        responseMimeType: "application/json"
      });

      const jsonText = response?.text || "{}";
      const result = JSON.parse(jsonText);
      return res.json(result);
    } catch (error: any) {
      console.log('Error generating merged report:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatório integrado.' });
    }
  });

  // Memory store for continuous WhatsApp student conversations
  interface StudentWhatsMemory {
    studentName?: string;
    school?: string;
    grade?: string;
    city?: string;
    interests?: string;
    interestDetail?: string;
    arquetipo?: string;
    superPoder?: string;
    desafioDesenvolvimento?: string;
    summaryMemory?: string;
    history: Array<{ role: 'user' | 'model'; content: string }>;
  }

  const whatsAppMemoryStore = new Map<string, StudentWhatsMemory>();

  // Armazenamento em memória de pedidos de recuperação de acesso
  interface AccessRecoveryRequest {
    id: string;
    studentName: string;
    studentClass: string;
    teacherPhone: string;
    status: 'waiting' | 'approved' | 'rejected' | 'expired';
    createdAt: number;
  }
  const activeAccessRequests = new Map<string, AccessRecoveryRequest>();
  const RECOVERY_REQUEST_TTL_MS = 10 * 60 * 1000;

  // Marca uma solicitação como expirada e avisa o professor por WhatsApp que ela não aceita mais respostas
  const expireRecoveryRequest = async (request: AccessRecoveryRequest) => {
    request.status = 'expired';
    activeAccessRequests.set(request.id, request);

    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';
    if (!evolutionUrl || !evolutionKey) return;

    try {
      await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
        body: JSON.stringify({
          number: request.teacherPhone,
          text: `⏰ *Solicitação Expirada*\n\nA solicitação de acesso de *${request.studentName}* (turma *${request.studentClass}*) expirou após 10 minutos sem resposta e não aceita mais aprovação ou recusa.`,
          delay: 500
        })
      });
    } catch (err) {
      console.warn('[Recuperação de Acesso] Falha ao notificar expiração:', err);
    }
  };

  // Varre periodicamente os pedidos pendentes e expira os que passaram de 10 minutos sem resposta
  setInterval(() => {
    for (const request of activeAccessRequests.values()) {
      if (request.status === 'waiting' && Date.now() - request.createdAt > RECOVERY_REQUEST_TTL_MS) {
        expireRecoveryRequest(request);
      }
    }
  }, 30000);

  // Estrutura do Log de Senha Perdida para persistência do Painel do Professor
  interface LostPasswordLog {
    id: string;
    studentName: string;
    studentClass: string;
    teacherPhone: string;
    status: 'APROVADO' | 'REPROVADO';
    timestamp: number;
  }
  const logDeSenhaPerdida: LostPasswordLog[] = [];

  // Rota para expor os logs de senha perdida para o painel do professor
  app.get('/api/logs/senha-perdida', (req, res) => {
    return res.json(logDeSenhaPerdida);
  });

  // API Route para o chat da IA de orientação (Prof. Cláudio)
  app.post('/api/ai/guidance', async (req, res) => {
    try {
      const { message, role, history = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const mentorPrompt = `Você é o Prof. Cláudio, um mentor simpático e especialista em psicologia escolar e desenvolvimento socioemocional do Instituto Ayrton Senna. 
Sua missão é guiar educadores (professores) na interpretação dos relatórios de competências socioemocionais (Autogestão, Engajamento com os outros, Amabilidade, Resiliência Emocional e Abertura ao Novo).

Quando o educador ou gestor lhe fizer perguntas sobre os dados, ajude de forma humana, pedagógica e precisa:
1. Explique o significado prático e psicológico das competências socioemocionais mencionadas de forma acessível.
2. Dê sugestões de intervenções escolares totalmente voltadas para a BNCC (Base Nacional Comum Curricular), mapeando especificamente a uma ou mais das 10 Competências Gerais da BNCC:
   - Competência Geral 1 – Conhecimento
   - Competência Geral 2 – Pensamento Científico, Crítico e Criativo
   - Competência Geral 3 – Repertório Cultural
   - Competência Geral 4 – Comunicação
   - Competência Geral 5 – Cultura Digital
   - Competência Geral 6 – Trabalho e Projeto de Vida
   - Competência Geral 7 – Argumentação
   - Competência Geral 8 – Autoconhecimento e Autocuidado
   - Competência Geral 9 – Empatia e Cooperação
   - Competência Geral 10 – Responsabilidade e Cidadania
3. Dê UMA informação por vez, em no máximo 2-3 frases curtas e diretas. Nunca despeje várias explicações, exemplos e sugestões numa única resposta — isso confunde o(a) educador(a). Termine com uma pergunta simples ou uma proposta objetiva (ex: "Quer que eu detalhe uma sugestão de atividade?") para deixar a pessoa guiar o próximo passo da conversa. Nunca use metáforas.
4. Quando a mensagem trouxer dados de várias turmas ou escolas de uma vez (pedido de visão geral), ainda assim comece por UM destaque comparativo (o ponto mais forte ou mais crítico em comum) e pergunte se a pessoa quer aprofundar, em vez de listar tudo de uma vez.
5. Se o educador ou gestor tiver uma dúvida técnica sobre o funcionamento da plataforma (não relacionada à interpretação pedagógica dos dados), responda na medida do possível com base no que você sabe, de forma igualmente breve. Se não souber a resposta, oriente a pessoa a entrar em contato com o suporte do Instituto Ayrton Senna pelo e-mail suporte@institutoayrtonsenna.org.br.`;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback simples sem chave
        return res.json({
          text: `Olá! Sou o Prof. Cláudio. Repare em qual competência está com a nota mais baixa — é o melhor ponto de partida. Quer que eu sugira uma intervenção prática pra isso? (Nota: Chave GEMINI_API_KEY não configurada no .env.local)`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const contents = [
        { role: 'user', parts: [{ text: mentorPrompt }] },
        { role: 'model', parts: [{ text: 'Entendido! Serei o Prof. Cláudio, mentor acolhedor e especialista do IAS para apoiar educadores e gestores.' }] }
      ];

      for (const turn of history) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.content }]
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await generateGeminiContent(ai, contents);
      return res.json({ text: response.text || 'Desculpe, tive um pequeno problema para processar sua pergunta. Como posso ajudar?' });

    } catch (err: any) {
      console.error('[Prof. Cláudio AI Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao consultar o mentor de IA.' });
    }
  });

  // API Route para exportar relatório para o WhatsApp do professor
  app.post('/api/ai/export', async (req, res) => {
    try {
      const { number, text } = req.body;
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionKey = process.env.EVOLUTION_API_KEY || 'apikey';
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'instancia_teste';

      if (!number || !text) {
        return res.status(400).json({ error: 'Parâmetros ausentes.' });
      }

      // Normaliza o número para o formato correto
      const formattedNumber = `${formatWhatsAppNumber(number)}@s.whatsapp.net`;

      // Dispara a mensagem para a Evolution API
      const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'apikey': evolutionKey 
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: text,
          delay: 500
        })
      });

      if (evoRes.ok) {
        return res.json({ success: true });
      } else {
        const errText = await evoRes.text();
        console.warn('[Evolution API Export Error]:', errText);
        return res.status(500).json({ error: 'Erro ao enviar a mensagem via Evolution API.' });
      }

    } catch (err: any) {
      console.error('[Export Route Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro interno na rota de exportação.' });
    }
  });

  // Estrutura e Banco de Dados de Usuários em Memória para Hidratação e Reset de Senha Reais
  interface UserProfile {
    code: string;
    name: string;
    school: string;
    institutionalEmail: string;
    personalEmail: string;
    personalWhatsapp: string;
    securityQuestion: string;
    securityAnswer: string;
    password: string;
    isFirstAccess: boolean;
    role: 'professor' | 'gestor';
  }

  const userRegistry = new Map<string, UserProfile>([
    [
      'Professor',
      {
        code: 'Professor',
        name: 'Fernanda Ribeiro',
        school: 'C.E.I. Ayrton Senna',
        institutionalEmail: 'professor.senna@escola.ias.org.br',
        personalEmail: '',
        personalWhatsapp: '',
        securityQuestion: '',
        securityAnswer: '',
        password: '1234',
        isFirstAccess: true,
        role: 'professor'
      }
    ],
    [
      'Gestor',
      {
        code: 'Gestor',
        name: 'Marcelo Andrade',
        school: 'Diretoria Regional IAS',
        institutionalEmail: 'gestor.senna@escola.ias.org.br',
        personalEmail: '',
        personalWhatsapp: '',
        securityQuestion: '',
        securityAnswer: '',
        password: '1234',
        isFirstAccess: true,
        role: 'gestor'
      }
    ]
  ]);

  // Endpoint de login do portal para validar professor/gestor
  app.post('/api/auth/login', (req, res) => {
    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ error: 'Parâmetros de login ausentes.' });
    }

    const user = userRegistry.get(code);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Código ou senha incorretos.' });
    }

    return res.json({
      success: true,
      code: user.code,
      name: user.name,
      school: user.school,
      institutionalEmail: user.institutionalEmail,
      isFirstAccess: user.isFirstAccess,
      role: user.role
    });
  });

  // Endpoint de hidratação de primeiro acesso
  app.post('/api/auth/hydrate', (req, res) => {
    const { code, personalEmail, personalWhatsapp, securityQuestion, securityAnswer } = req.body;
    if (!code || !personalEmail || !personalWhatsapp || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'Campos de hidratação obrigatórios ausentes.' });
    }

    const user = userRegistry.get(code);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    user.personalEmail = personalEmail;
    user.personalWhatsapp = formatWhatsAppNumber(personalWhatsapp);
    user.securityQuestion = securityQuestion;
    user.securityAnswer = securityAnswer;
    user.isFirstAccess = false;

    console.log(`[Cadastro Hidratado] Usuário: ${code}. E-mail: ${personalEmail}, WhatsApp: ${personalWhatsapp}`);
    return res.json({ success: true });
  });

  // Endpoint para recuperar os canais ativos de reset do usuário
  app.post('/api/auth/recovery-options', (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Código ausente.' });
    }

    const user = userRegistry.get(code);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const hasEmail = !!user.personalEmail;
    const hasWhatsapp = !!user.personalWhatsapp;
    const hasQuestion = !!user.securityQuestion;

    if (!hasEmail && !hasWhatsapp && !hasQuestion) {
      return res.json({ error: 'support_only' });
    }

    return res.json({
      success: true,
      email: user.personalEmail || null,
      whatsapp: user.personalWhatsapp || null,
      question: user.securityQuestion || null
    });
  });

  // Endpoint para enviar/validar o reset de fato
  app.post('/api/auth/recovery-send', async (req, res) => {
    try {
      const { code, method, answer } = req.body;
      if (!code || !method) {
        return res.status(400).json({ error: 'Parâmetros de reset ausentes.' });
      }

      const user = userRegistry.get(code);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (method === 'question') {
        if (!answer || answer.toLowerCase().trim() !== user.securityAnswer.toLowerCase().trim()) {
          return res.json({ success: false, error: 'Resposta de segurança incorreta.' });
        }
        return res.json({ success: true, password: user.password });
      }

      if (method === 'email') {
        if (!user.personalEmail) {
          return res.status(400).json({ error: 'E-mail não configurado.' });
        }

        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
        const smtpPort = Number(process.env.SMTP_PORT) || 587;

        let previewUrl: string | boolean | null = null;

        if (smtpUser && smtpPass) {
          try {
            const transporter = createEmailTransporter(smtpUser, smtpPass, smtpHost, smtpPort);

            const info = await transporter.sendMail({
              from: '"Portal Socioemocional IAS" <suporte@institutoayrtonsenna.org.br>',
              to: user.personalEmail,
              subject: '🔑 Recuperação de Acesso - Portal IAS',
              text: `Olá ${user.name},\n\nRecebemos uma solicitação de redefinição de acesso para sua conta.\n\nSuas credenciais são:\n- Código: ${user.code}\n- Senha: ${user.password}\n\nSe você não solicitou isso, ignore este e-mail.`,
              html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                  <h2 style="color: #1e293b;">Chave de Acesso Recuperada</h2>
                  <p>Olá <strong>${user.name}</strong>,</p>
                  <p>Conforme solicitado, enviamos suas credenciais do Portal Socioemocional:</p>
                  <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; border: 1px solid #e2e8f0; margin: 15px 0;">
                    <strong>Código de Acesso:</strong> <code>${user.code}</code><br/>
                    <strong>Senha:</strong> <code>${user.password}</code>
                  </div>
                  <p style="font-size: 12px; color: #64748b;">Instituto Ayrton Senna</p>
                </div>
              `
            });

            previewUrl = nodemailer.getTestMessageUrl(info) || null;
          } catch (mailErr: any) {
            console.error('[Recovery Email] Falha ao enviar via SMTP:', mailErr);
            return res.status(502).json({ error: 'Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes ou contate o suporte.' });
          }
        } else {
          console.log(`[Recovery Email] Credenciais enviadas para ${user.personalEmail}: Código: ${user.code}, Senha: ${user.password}`);
        }

        return res.json({ success: true, previewUrl: previewUrl || null });
      }

      if (method === 'whatsapp') {
        if (!user.personalWhatsapp) {
          return res.status(400).json({ error: 'WhatsApp não configurado.' });
        }

        const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const evolutionKey = process.env.EVOLUTION_API_KEY || 'apikey';
        const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'instancia_teste';

        const formattedNumber = `${formatWhatsAppNumber(user.personalWhatsapp)}@s.whatsapp.net`;

        const messageText = `🔑 *Recuperação de Acesso - Portal IAS*\n\nOlá *${user.name}*,\n\nSuas credenciais são:\n- *Código de Acesso:* ${user.code}\n- *Senha:* ${user.password}\n\nGuarde essas credenciais com segurança.`;

        try {
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
            body: JSON.stringify({
              number: formattedNumber,
              text: messageText,
              delay: 500
            })
          });

          if (!evoRes.ok) {
            const errText = await evoRes.text();
            console.error('[Evolution API Password Recovery Error]:', errText);
            return res.status(502).json({ error: 'Não foi possível enviar as credenciais via WhatsApp. Tente novamente em instantes ou contate o suporte.' });
          }
        } catch (evoErr) {
          console.error('[Evolution API Password Recovery Dispatch Error]:', evoErr);
          return res.status(502).json({ error: 'Não foi possível enviar as credenciais via WhatsApp. Tente novamente em instantes ou contate o suporte.' });
        }

        console.log(`[Recovery WhatsApp] Credenciais enviadas para ${user.personalWhatsapp}: Código: ${user.code}, Senha: ${user.password}`);
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Método inválido.' });

    } catch (err: any) {
      console.error('[Recovery Send Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao redefinir acesso.' });
    }
  });

  // Helper para construir o Relatório HTML Dinâmico baseado no Design System do IAS (JSON da usuária)
  function buildHtmlReport(
    markdownText: string,
    metadata?: { studentName?: string; className?: string; role?: string }
  ) {
    const colors = {
      primary: '#071131',
      azul: '#0E477A',
      azulDestaque: '#015192',
      verde: '#259E52',
      amarelo: '#F5A800',
      textMain: '#071131',
      textSec: '#526173',
      borda: '#E4EAF0',
      bgSec: '#F6F8FB'
    };

    const paragraphs = markdownText.split('\n\n').filter(p => p.trim());
    
    // Identifica e limpa metadados caso a IA tenha gerado no texto
    const cleanedParagraphs = paragraphs.map(p => {
      return p
        .replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${colors.primary};">$1</strong>`)
        .replace(/\*(.*?)\*/g, `<strong>$1</strong>`)
        .replace(/_(.*?)_/g, `<em>$1</em>`)
        .replace(/`(.*?)_/g, `<code style="background-color: ${colors.bgSec}; padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>`);
    });

    const studentName = metadata?.studentName || '';
    const className = metadata?.className || '';
    const isGestor = metadata?.role === 'gestor';

    // Seção Header
    const headerHtml = `
      <div style="background-color: ${colors.primary}; padding: 35px; color: #FFFFFF; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; border-bottom: 4px solid ${colors.amarelo};">
        <span style="font-size: 11px; font-weight: 700; color: ${colors.amarelo}; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 10px;">Instituto Ayrton Senna</span>
        <h1 style="font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2;">Relatório Socioemocional</h1>
        <p style="font-size: 14px; font-weight: 600; color: #8fa0dd; margin: 6px 0 0 0;">Análise Pedagógica & Intervenções BNCC</p>
        
        <table style="width: 100%; margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.15); font-size: 13px; color: #FFFFFF;">
          <tr>
            ${studentName ? `
              <td style="padding-right: 20px; vertical-align: top;">
                <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Estudante</span>
                <strong>${studentName}</strong>
              </td>
            ` : ''}
            <td style="padding-right: 20px; vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Turma/Contexto</span>
              <strong>${className || 'Todas as Turmas'}</strong>
            </td>
            <td style="padding-right: 20px; vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Destinatário</span>
              <strong>${isGestor ? 'Gestor Escolar' : 'Educador(a)'}</strong>
            </td>
            <td style="vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Período</span>
              <strong>2026.2 (Avaliação Semestral)</strong>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Resumo Executivo Card ("Em 30 segundos") - Primeiro parágrafo
    const summaryText = cleanedParagraphs[0] || 'Relatório socioemocional estruturado a partir da árvore de resultados.';
    
    // Montagem dos parágrafos subsequentes em cards funcionais
    let bodyParagraphsHtml = '';
    cleanedParagraphs.slice(1).forEach((cleanP) => {
      const lower = cleanP.toLowerCase();
      
      const isAcao = lower.includes('ação') || lower.includes('intervenção') || lower.includes('sugestão pedagógica') || lower.includes('passos') || lower.includes('1.') || lower.includes('2.');
      const isBncc = lower.includes('bncc') || lower.includes('competência geral') || lower.includes('gerais');

      if (isAcao) {
        bodyParagraphsHtml += `
          <div style="background-color: ${colors.bgSec}; border: 1px solid ${colors.borda}; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 700; color: ${colors.azul}; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="margin-right: 8px;">🎯</span> Uma ação para começar (Recomendação Prioritária)
            </h3>
            <div style="font-size: 14px; color: ${colors.textSec}; line-height: 1.6; white-space: pre-line;">
              ${cleanP}
            </div>
          </div>
        `;
      } else if (isBncc) {
        bodyParagraphsHtml += `
          <div style="border: 1px solid ${colors.borda}; padding: 24px; border-radius: 16px; margin-bottom: 24px; border-left: 4px solid ${colors.verde}; background-color: #FFFFFF;">
            <h3 style="font-size: 16px; font-weight: 700; color: ${colors.verde}; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="margin-right: 8px;">🌿</span> Conexões com as Competências Gerais da BNCC
            </h3>
            <div style="font-size: 14px; color: ${colors.textSec}; line-height: 1.6; white-space: pre-line;">
              ${cleanP}
            </div>
          </div>
        `;
      } else {
        bodyParagraphsHtml += `
          <div style="border: 1px solid ${colors.borda}; padding: 24px; border-radius: 16px; margin-bottom: 24px; background-color: #FFFFFF;">
            <h3 style="font-size: 16px; font-weight: 700; color: ${colors.primary}; margin-top: 0; margin-bottom: 12px;">
              📖 O que isso pode significar na prática?
            </h3>
            <div style="font-size: 14px; color: ${colors.textSec}; line-height: 1.6; white-space: pre-line;">
              ${cleanP}
            </div>
          </div>
        `;
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Socioemocional - Instituto Ayrton Senna</title>
        <!-- A11y Injection -->\n          <link rel="stylesheet" href="/a11y/accessibility.css" />\n          <script src="/a11y/accessibility.js"></script>\n        </head>
      <body style="background-color: ${colors.bgSec}; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <div style="max-width: 960px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid ${colors.borda}; overflow: hidden; box-shadow: 0 4px 20px rgba(7, 17, 49, 0.04);">
          
          <!-- Cabeçalho Institucional -->
          ${headerHtml}
          
          <!-- Conteúdo -->
          <div style="padding: 35px;">
            
            <!-- Resumo Executivo Destaque -->
            <div style="background-color: #f0f7ff; border: 1px solid #d0e4ff; border-left: 5px solid ${colors.azulDestaque}; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="font-size: 13px; font-weight: 700; color: ${colors.azulDestaque}; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Em 30 segundos</h2>
              <p style="font-size: 15px; color: ${colors.textMain}; line-height: 1.6; margin: 0; font-weight: 600;">
                ${summaryText}
              </p>
            </div>
            
            <!-- Outras Seções Formatadas -->
            ${bodyParagraphsHtml}
            
          </div>
          
          <!-- Rodapé do Relatório -->
          <div style="background-color: ${colors.primary}; padding: 24px 35px; color: #FFFFFF; text-align: center; font-size: 12px; border-top: 4px solid ${colors.amarelo};">
            <p style="margin: 0 0 8px 0; color: #8fa0dd; font-weight: 600;">
              Este relatório apoia a reflexão pedagógica e deve ser interpretado em conjunto com outras evidências e com o contexto do estudante.
            </p>
            <p style="margin: 0 0 12px 0; color: #8fa0dd; opacity: 0.85;">
              Relatório exportado do portal socioemocional a pedido do educador.
            </p>
            <p style="margin: 0; color: #ffffff; font-weight: 700;">
              © 2026 Instituto Ayrton Senna. Todos os direitos reservados.
            </p>
          </div>
          
        </div>
        
      </body>
      </html>
    `;
  }

  // API Route para exportar relatório por E-mail de verdade (SMTP real ou Ethereal de Teste)
  app.post('/api/ai/export-email', async (req, res) => {
    try {
      const { email, text, metadata } = req.body;
      if (!email || !text) {
        return res.status(400).json({ error: 'Parâmetros ausentes.' });
      }

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
      const smtpPort = Number(process.env.SMTP_PORT) || 587;

      let transporter;

      if (smtpUser && smtpPass) {
        // Usa credenciais reais configuradas pelo usuário no .env.local
        transporter = createEmailTransporter(smtpUser, smtpPass, smtpHost, smtpPort);
      } else {
        // Gera uma conta de teste Ethereal descartável em tempo de execução
        throw new Error('Ethereal desativado (502 Timeout)');
      }

      // Envia o e-mail de fato com o layout contemporâneo estruturado
      const htmlBody = buildHtmlReport(text, metadata);

      const info = await transporter.sendMail({
        from: '"Prof. Cláudio - Mentor IAS" <suporte@institutoayrtonsenna.org.br>',
        to: email,
        subject: '📊 Relatório Socioemocional & Recomendações BNCC',
        text: text,
        html: htmlBody
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[E-mail Enviado] Preview URL: ${previewUrl || 'Enviado via SMTP real'}`);

      return res.json({ 
        success: true, 
        previewUrl: previewUrl || null 
      });

    } catch (err: any) {
      console.error('[E-mail Route Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao processar envio do e-mail.' });
    }
  });

  // 1. Endpoint para criar a solicitação de acesso e disparar WhatsApp
  app.post('/api/auth-recovery/request', async (req, res) => {
    try {
      const { name, studentClass, phoneNumber } = req.body;
      if (!name || !studentClass || !phoneNumber) {
        return res.status(400).json({ error: 'Parâmetros ausentes.' });
      }

      const reqId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const formattedPhone = formatWhatsAppNumber(phoneNumber);

      // Registra a solicitação com o telefone do professor
      activeAccessRequests.set(reqId, {
        id: reqId,
        studentName: name,
        studentClass: studentClass,
        teacherPhone: formattedPhone,
        status: 'waiting',
        createdAt: Date.now()
      });

      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      const messageText = `🔔 *Solicitação de Acesso - Portal IAS*\n\nOlá Educador(a), o estudante *${name}* da turma *${studentClass}* esqueceu seu código de acesso e está solicitando autorização para entrar no portal.\n\n⚠️ *Por medida de segurança para evitar cliques acidentais*, responda a esta mensagem digitando uma das palavras abaixo:\n\n👉 Digite *APROVAR* para autorizar a entrada do estudante.\n👉 Digite *RECUSAR* para negar a entrada e direcioná-lo à secretaria.\n\n_Esta solicitação expirará automaticamente se não for respondida em até 10 minutos._`;

      console.log(`[Recuperação de Acesso] Novo pedido registrado ID: ${reqId} para ${name}. Disparando para o WhatsApp: ${formattedPhone}`);

      let methodUsed = 'console_only';

      if (evolutionUrl && evolutionKey) {
        try {
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: messageText,
              delay: 1000
            })
          });

          if (evoRes.ok) {
            methodUsed = 'evolution_api_text';
            console.log(`[Recuperação de Acesso] Mensagem de texto enviada com sucesso via Evolution API.`);
          } else {
            const errData = await evoRes.text();
            console.warn('[Recuperação de Acesso] Falha no envio do sendText:', evoRes.status, errData);
          }
        } catch (evoErr) {
          console.warn('[Recuperação de Acesso] Falha ao tentar contato com Evolution API:', evoErr);
        }
      }



      return res.json({ success: true, id: reqId, method: methodUsed });
    } catch (err: any) {
      console.error('[Recuperação de Acesso] Erro geral:', err);
      return res.status(500).json({ error: err.message || 'Erro ao registrar solicitação' });
    }
  });

  // 2. Endpoint para verificar o status do pedido (polling do frontend)
  app.get('/api/auth-recovery/status/:id', async (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    if (!request) {
      return res.json({ status: 'rejected', reason: 'expired_or_not_found' });
    }

    // Expira em 10 minutos
    if (request.status === 'waiting' && Date.now() - request.createdAt > RECOVERY_REQUEST_TTL_MS) {
      await expireRecoveryRequest(request);
    }

    if (request.status === 'expired') {
      return res.json({ status: 'rejected', reason: 'expired' });
    }

    return res.json({ status: request.status });
  });

  // 3. Endpoint de aprovação (clicado no WhatsApp pelo professor)
  app.get('/api/auth-recovery/approve/:id', (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    
    if (!request) {
      return res.send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F4F5F8; color:#0B1226;">
            <h2>⚠️ Solicitação não encontrada ou já expirada.</h2>
            <p>O limite de tempo de 10 minutos para autorizar o acesso expirou.</p>
          </body>
        </html>
      `);
    }

    request.status = 'approved';
    activeAccessRequests.set(id, request);

    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acesso Autorizado - IAS</title>
        <style>
          body { font-family: sans-serif; background-color: #F4F5F8; color: #0B1226; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: white; padding: 30px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); text-align: center; max-width: 400px; border: 1px solid #E2E8F0; }
          .badge { display: inline-block; background: #E6F4EA; color: #137333; padding: 6px 16px; border-radius: 50px; font-size: 12.5px; font-weight: bold; margin-bottom: 20px; }
          h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px 0; }
          p { font-size: 14.5px; color: #5B6472; line-height: 1.5; margin: 0 0 20px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Acesso Autorizado ✓</div>
          <h1>Entrada Concedida!</h1>
          <p>O acesso para o estudante <strong>${request.studentName}</strong> (turma <strong>${request.studentClass}</strong>) foi liberado com sucesso.</p>
          <p>A tela do aluno será atualizada automaticamente em instantes.</p>
        </div>
      </body>
      </html>
    `);
  });

  // 4. Endpoint de recusa (clicado no WhatsApp pelo professor)
  app.get('/api/auth-recovery/reject/:id', (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);

    if (!request) {
      return res.send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F4F5F8; color:#0B1226;">
            <h2>⚠️ Solicitação não encontrada ou já expirada.</h2>
          </body>
        </html>
      `);
    }

    request.status = 'rejected';
    activeAccessRequests.set(id, request);

    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acesso Recusado - IAS</title>
        <style>
          body { font-family: sans-serif; background-color: #F4F5F8; color: #0B1226; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: white; padding: 30px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); text-align: center; max-width: 400px; border: 1px solid #E2E8F0; }
          .badge { display: inline-block; background: #FCE8E6; color: #C5221F; padding: 6px 16px; border-radius: 50px; font-size: 12.5px; font-weight: bold; margin-bottom: 20px; }
          h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px 0; }
          p { font-size: 14.5px; color: #5B6472; line-height: 1.5; margin: 0 0 20px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Acesso Negado ✗</div>
          <h1>Pedido Recusado</h1>
          <p>O pedido de acesso para o estudante <strong>${request.studentName}</strong> foi recusado.</p>
          <p>O aluno recebeu a instrução de procurar a secretaria para regularizar seu cadastro.</p>
        </div>
      </body>
      </html>
    `);
  });

  // API Route to Trigger Evolution API WhatsApp Message / Link & Initialize Profile
  app.post('/api/send-whatsapp-invite', async (req, res) => {
    try {
      const { 
        phoneNumber, 
        name, 
        school, 
        grade, 
        city, 
        interests, 
        interestDetail, 
        arquetipo, 
        superPoder, 
        desafioDesenvolvimento 
      } = req.body;
      
      const formattedPhone = formatWhatsAppNumber(phoneNumber);

      // Initialize / Update Student WhatsApp Profile & Memory
      const existing = whatsAppMemoryStore.get(formattedPhone) || { history: [] };
      whatsAppMemoryStore.set(formattedPhone, {
        ...existing,
        studentName: name || existing.studentName || 'Estudante',
        school: school || existing.school,
        grade: grade || existing.grade,
        city: city || existing.city,
        interests: Array.isArray(interests) ? interests.join(', ') : (interests || existing.interests),
        interestDetail: interestDetail || existing.interestDetail,
        arquetipo: arquetipo || existing.arquetipo || 'Inovador Estratégico',
        superPoder: superPoder || existing.superPoder,
        desafioDesenvolvimento: desafioDesenvolvimento || existing.desafioDesenvolvimento,
      });
      
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      const defaultMessage = `Oi, ${name || 'parceiro'}! Aqui é o Béco do Instituto Ayrton Senna! 🚀\n\nVi aqui que seu perfil no laboratório foi *${arquetipo || 'Inovador Estratégico'}*! 🏆\n\n💬 Vou continuar contigo por aqui pra te ajudar no que ainda é desafiador pra você! Sempre que tiver uma dúvida, desafio escolar ou quiser trocar uma ideia, é só me mandar uma mensagem aqui!`;

      // If Evolution API credentials are provided, attempt dispatch via HTTP
      if (evolutionUrl && evolutionKey) {
        try {
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: defaultMessage,
              delay: 1200
            })
          });

          if (evoRes.ok) {
            return res.json({ success: true, method: 'evolution_api', phone: formattedPhone });
          } else {
            const errData = await evoRes.text();
            console.warn('Evolution API response non-ok:', evoRes.status, errData);
          }
        } catch (evoErr) {
          console.warn('Evolution API local dispatch warning:', evoErr);
        }
      }

      // Fallback: direct WhatsApp Web / app wa.me link
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(defaultMessage)}`;
      return res.json({ success: true, method: 'wa_link', url: waUrl, phone: formattedPhone });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao processar convite do WhatsApp' });
    }
  });

  // Evolution API Webhook endpoint for continuous student conversations
  app.post('/api/evolution-webhook', async (req, res) => {
    // Acknowledge webhook immediately so Evolution API doesn't retry
    res.status(200).json({ received: true });

    try {
      const body = req.body;
      console.log('Incoming Evolution Webhook event:', body?.event);

      const data = body.data || body;
      const messageList = Array.isArray(data) ? data : [data];

      for (const item of messageList) {
        // Ignore messages sent by the bot itself
        if (item.key?.fromMe) continue;

        const remoteJid = item.key?.remoteJid || '';
        const rawNumber = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        if (!rawNumber) continue;

        const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const evolutionKey = process.env.EVOLUTION_API_KEY || 'BecoIAS2026';
        const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

        const messageObj = item.message || {};
        
        // Guardrail: ONLY accept text messages. Reject audio, video, photos, stickers, docs
        const isMedia = messageObj.imageMessage || 
                        messageObj.videoMessage || 
                        messageObj.audioMessage || 
                        messageObj.stickerMessage || 
                        messageObj.documentMessage || 
                        messageObj.documentWithCaptionMessage;

        if (isMedia) {
          await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
            body: JSON.stringify({
              number: rawNumber,
              text: "Opa! Por enquanto eu só consigo ler mensagens de texto por aqui 📝 Manda sua dúvida ou ideia em texto que a gente desenrola!",
              delay: 1000
            })
          });
          continue;
        }

        // Extract user text from standard or extended fields
        const userText = messageObj.conversation || 
                         messageObj.extendedTextMessage?.text || 
                         messageObj.editedMessage?.message?.protocolMessage?.editedMessage?.conversation ||
                         messageObj.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text ||
                         '';

        if (!userText || !userText.trim()) continue;

        const normalizedText = userText.trim().toUpperCase();

        if (normalizedText === 'APROVAR' || normalizedText === 'RECUSAR') {
          const isApprove = normalizedText === 'APROVAR';
          
          // Busca o pedido pendente do professor mais recente em activeAccessRequests
          let foundRequest: any = null;
          for (const [id, reqObj] of activeAccessRequests.entries()) {
            if (reqObj.teacherPhone === rawNumber && reqObj.status === 'waiting') {
              if (!foundRequest || reqObj.createdAt > foundRequest.createdAt) {
                foundRequest = reqObj;
              }
            }
          }

          // Não aceita mais respostas se a solicitação encontrada já passou dos 10 minutos
          if (foundRequest && Date.now() - foundRequest.createdAt > RECOVERY_REQUEST_TTL_MS) {
            await expireRecoveryRequest(foundRequest);
            foundRequest = null;
          }

            if (foundRequest) {
            const statusText = isApprove ? 'APROVADO' : 'REPROVADO';
            foundRequest.status = isApprove ? 'approved' : 'rejected';
            activeAccessRequests.set(foundRequest.id, foundRequest);
            console.log(`[Recuperação de Acesso Webhook] Resposta por texto processada: ${normalizedText} para ID: ${foundRequest.id}`);

            logTelemetry('whatsapp', 'password_recovery_action', { action: statusText, student: foundRequest.studentName });

            // Registra no log de senha perdida para o painel do professor
            logDeSenhaPerdida.push({
              id: foundRequest.id,
              studentName: foundRequest.studentName,
              studentClass: foundRequest.studentClass,
              teacherPhone: foundRequest.teacherPhone,
              status: statusText,
              timestamp: Date.now()
            });

            // 1. Envia a confirmação direta
            const responseText = isApprove 
              ? `✅ *Acesso Confirmado!*\n\nO acesso do estudante *${foundRequest.studentName}* (turma *${foundRequest.studentClass}*) foi liberado com sucesso no portal.`
              : `❌ *Acesso Recusado!*\n\nO acesso do estudante *${foundRequest.studentName}* foi bloqueado. Ele foi instruído a procurar a secretaria escolar.`;

            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: responseText,
                delay: 500
              })
            });

            // 2. Envia a mensagem de log formatada em seguida
            const logMessage = `📋 *Registro de Log - Recuperação de Senha*\n- Estudante: ${foundRequest.studentName}\n- Turma: ${foundRequest.studentClass}\n- Status: ${statusText}`;

            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: logMessage,
                delay: 1500 // 1.5 segundos de atraso para enviar depois
              })
            });
          } else {
            console.log(`[Recuperação de Acesso Webhook] Nenhuma solicitação pendente encontrada para o professor: ${rawNumber}`);
            
            // Caso ele digite APROVAR/RECUSAR mas não tenha pedido ativo
            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: `Olá! Não encontrei nenhuma solicitação de acesso pendente para este número no momento.`,
                delay: 500
              })
            });
          }
          continue; // Pula o processamento da IA do Béco
        }

        console.log(`[WhatsApp Béco] Message from ${rawNumber} (${item.pushName || 'Estudante'}): "${userText}"`);

        // Retrieve or initialize student memory
        let mem = whatsAppMemoryStore.get(rawNumber);
        if (!mem) {
          mem = {
            studentName: item.pushName || 'Estudante',
            arquetipo: 'Inovador Estratégico',
            superPoder: 'Pensamento crítico e imaginação criativa',
            desafioDesenvolvimento: 'Aprofundar argumentos e fundamentar ideias',
            history: []
          };
          whatsAppMemoryStore.set(rawNumber, mem);
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
            body: JSON.stringify({
              number: rawNumber,
              text: `E aí ${mem.studentName}! Recebi sua mensagem: "${userText}". Tô pronto pra te ajudar nos seus desafios!`,
              delay: 1000
            })
          });
          continue;
        }

        const ai = new GoogleGenAI({ apiKey });

        // Intelligent Token / Memory Compression:
        // When history reaches 10+ messages, summarize older turns to keep token count compact & preserve memory
        if (mem.history.length >= 10) {
          try {
            const oldTurns = mem.history.slice(0, -4);
            const summaryPrompt = `Você é o sistema de síntese de memória do Béco (Instituto Ayrton Senna).
Sintetize em 2 a 3 frases essenciais os pontos conversados, desafios superados, dúvidas e tópicos discutidos com o(a) aluno(a) ${mem.studentName || ''}:
${oldTurns.map(m => `${m.role}: ${m.content}`).join('\n')}`;

            const summaryRes = await generateGeminiContent(ai, summaryPrompt);

            mem.summaryMemory = (mem.summaryMemory ? mem.summaryMemory + '\n' : '') + (summaryRes.text || '');
            // Keep only the most recent 4 turns in active history
            mem.history = mem.history.slice(-4);
          } catch (sumErr) {
            console.warn('Memory compaction error:', sumErr);
          }
        }

        // Build system prompt for Béco WhatsApp Persona
        const systemInstruction = `# PERSONA & IDENTIDADE
Você é o **Béco**, o mentor e parceiro inteligente do Instituto Ayrton Senna (IAS).
Você está conversando diretamente com o estudante no WhatsApp dele de forma contínua, amigável e acolhedora.

# CONTEXTO DO ESTUDANTE
- Nome: ${mem.studentName || 'Estudante'}
- Escola: ${mem.school || 'Não especificada'} | Ano: ${mem.grade || 'Ensino Médio/Fundamental'} | Cidade: ${mem.city || 'Brasil'}
- Interesses: ${mem.interests || 'Gerais'} (${mem.interestDetail || ''})
- Perfil IAS: ${mem.arquetipo || 'Inovador Estratégico'}
- Superpoder: ${mem.superPoder || 'Curiosidade e imaginação ativa'}
- Desafio de Evolução: ${mem.desafioDesenvolvimento || 'Articular argumentos e estruturar ideias'}
${mem.summaryMemory ? `- Memória executiva das conversas anteriores: ${mem.summaryMemory}` : ''}

# DIRETRIZES DE COMUNICAÇÃO NO WHATSAPP
1. **Linguagem Natural de WhatsApp**:
   - Use tom jovem brasileiro, acolhedor e próximo (você é um parceiro de jornada, não um professor formal).
   - Use emojis de forma orgânica (⚡, 💡, 🚀, 👀, 👊, 🧠).
   - Respostas curtas e dinâmicas (1 a 3 frases, no máximo 2 pequenos parágrafos). NUNCA mande textão ou explicações acadêmicas longas.

2. **Raciocínio Socrático & Mentoria Formativa**:
   - Se o aluno pedir ajuda com uma tarefa, dúvida ou dever de casa, nunca dê a resposta pronta.
   - Faça perguntas reflexivas que estimulem o raciocínio próprio e a curiosidade do aluno.
   - Conecte as dúvidas com os interesses e o superpoder dele sempre que fizer sentido.

3. **Cultura de Mindset de Crescimento**:
   - Valorize o esforço, a tentativa, a curiosidade e o processo de aprender com erros.

4. **Segurança e Foco**:
   - Mantenha foco em aprendizado, pensamento crítico, criatividade, projetos da escola e desenvolvimento pessoal.`;

        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: 'Entendido! Estou no papel do Béco no WhatsApp. Respostas curtas, acolhedoras e socráticas.' }] }
        ];

        for (const turn of mem.history) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.content }]
          });
        }

        contents.push({
          role: 'user',
          parts: [{ text: userText }]
        });

        const response = await generateGeminiContent(ai, contents);

        const replyText = response.text || `Tô aqui contigo, ${mem.studentName}! O que acha da gente pensar nisso por outro ângulo? 💡`;

        // Save turn to history
        mem.history.push({ role: 'user', content: userText });
        mem.history.push({ role: 'model', content: replyText });
        whatsAppMemoryStore.set(rawNumber, mem);

        logTelemetry('whatsapp', 'beco_interaction', { 
          studentName: mem.studentName,
          userText
        });

        console.log(`[WhatsApp Béco] Replying to ${rawNumber}: "${replyText}"`);

        // Send reply back via Evolution API
        await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
          body: JSON.stringify({
            number: rawNumber,
            text: replyText,
            delay: 1200
          })
        });
      }

    } catch (whErr) {
      console.error('Webhook processing error:', whErr);
    }
  });

  // Rotas estáticas exclusivas para cada portal (aponta para as pastas dist compiladas de cada projeto original)
  const sennaLoginDist = path.join(process.cwd(), 'platforms_dist', 'SennaLogin');
  const sennaTesteDist = path.join(process.cwd(), 'platforms_dist', 'Senna');
  const autoavaliacaoDist = path.join(process.cwd(), 'platforms_dist', 'autoavaliacao');
  const hackathonDist = path.join(process.cwd(), 'platforms_dist', 'hackathon');

  app.use('/login', express.static(sennaLoginDist));
  app.use('/teste', express.static(sennaTesteDist));
  app.use('/autoavaliacao', express.static(autoavaliacaoDist));
  app.use('/hackathon', express.static(hackathonDist));
  app.use('/beco-intro.mp4', express.static(path.join(hackathonDist, 'beco-intro.mp4')));
  app.use('/beco-intro.mp4.mp4', express.static(path.join(hackathonDist, 'beco-intro.mp4.mp4')));

  // Fallbacks do roteador para SPA
  app.get('/login/*', (req, res) => {
    res.sendFile(path.join(sennaLoginDist, 'index.html'));
  });
  app.get('/teste/*', (req, res) => {
    res.sendFile(path.join(sennaTesteDist, 'index.html'));
  });
  app.get('/autoavaliacao/*', (req, res) => {
    res.sendFile(path.join(autoavaliacaoDist, 'index.html'));
  });
  app.get('/hackathon/*', (req, res) => {
    res.sendFile(path.join(hackathonDist, 'index.html'));
  });

  // Landing Page do Hub Central
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Instituto Ayrton Senna - Portal de Competências</title>
        <!-- A11y Injection -->
        <link rel="stylesheet" href="/a11y/accessibility.css" />
        <script src="/a11y/accessibility.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Manrope', sans-serif;
            background-color: #F4F5F8;
            color: #0B1226;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
            overflow-y: auto;
          }
          .hero-title {
            font-size: 28px;
            font-weight: 900;
            color: #071131;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
          }
          .main-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 16px;
            padding: 20px 40px 40px 40px;
            box-sizing: border-box;
          }
          .card {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            text-decoration: none;
            color: inherit;
          }
          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.06);
            border-color: #FDC300;
          }
          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            flex-shrink: 0;
          }
          .credentials-chip {
            font-size: 10px;
            font-weight: 800;
            color: #0E477A;
            background: #EFF6FF;
            border: 1px solid #DBEAFE;
            border-radius: 8px;
            padding: 5px 10px;
            margin-bottom: 14px;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          h3 {
            font-size: 15px;
            font-weight: 800;
            color: #071131;
          }
          .instruction {
            font-size: 11px;
            color: #7C879C;
            font-weight: 600;
            margin-top: 2px;
          }
          .card-body {
            flex: 1;
            margin-bottom: 16px;
          }
          .section-title {
            font-size: 10.5px;
            font-weight: 900;
            color: #0E477A;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .pain-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .pain-item {
            font-size: 11.5px;
            line-height: 1.45;
            color: #334155;
          }
          .pain-badge {
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-frictional { background: #fee2e2; color: #991b1b; }
          .badge-auth { background: #fef3c7; color: #92400e; }
          .badge-connect { background: #dcfce7; color: #166534; }
          .badge-engagement { background: #f3e8ff; color: #6b21a8; }
          .badge-action { background: #e0f2fe; color: #075985; }

          .card-footer {
            flex-shrink: 0;
            padding-top: 14px;
            border-top: 1px solid #F1F5F9;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-access {
            font-size: 12.5px;
            font-weight: 800;
            color: #0E477A;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: color 0.15s ease;
          }
          .card:hover .btn-access {
            color: #FBB800;
          }

          .welcome-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(4, 14, 43, 0.78);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
          }
          .welcome-card {
            background: white;
            border-radius: 28px;
            max-width: 960px;
            width: 100%;
            padding: 36px 42px;
            box-shadow: 0 35px 80px -15px rgba(0, 0, 0, 0.4);
            margin: auto;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .welcome-title {
            font-size: 26px;
            font-weight: 900;
            color: #071131;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
          }
          .welcome-subtitle {
            font-size: 14px;
            color: #5B6472;
            font-weight: 500;
            margin-bottom: 20px;
            line-height: 1.5;
          }
          .welcome-layout-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 36px;
            align-items: stretch;
          }
          .welcome-info-col {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .welcome-info-col p {
            font-size: 15.5px;
            color: #0F172A;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .welcome-info-col ol {
            margin: 0 0 16px 22px;
            font-size: 15px;
            color: #1E293B;
            line-height: 1.65;
          }
          .welcome-info-col ol > li {
            margin-bottom: 8px;
          }
          .welcome-pillars-bullets {
            margin: 6px 0 4px 22px;
            list-style-type: disc;
          }
          .welcome-pillars-bullets li {
            font-size: 14.5px;
            color: #334155;
            margin-bottom: 4px;
            font-weight: 600;
          }
          .welcome-important {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-left: 4px solid #FBB800;
            border-radius: 0 12px 12px 0;
            padding: 10px 14px;
            margin-top: 14px;
            margin-bottom: 4px;
          }
          .welcome-important p {
            margin-bottom: 3px !important;
            color: #7C4A03 !important;
            font-size: 13px !important;
            line-height: 1.45 !important;
          }
          .welcome-important p:last-child {
            margin-bottom: 0 !important;
            font-weight: 700;
          }
          .welcome-signature {
            font-size: 14.5px;
            color: #475569;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #E2E8F0;
          }
          .welcome-signature strong {
            display: block;
            color: #071131;
            font-size: 15.5px;
            font-weight: 800;
            margin-top: 2px;
          }
          
          /* Coluna Direita (Credenciais + Form) */
          .welcome-action-col {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 20px;
            padding: 24px;
          }
          .welcome-credentials-box {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 14px 16px;
            margin-bottom: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          }
          .welcome-credentials-header {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #071131;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 10px;
          }
          .welcome-credentials-chips {
            display: flex;
            gap: 6px;
            margin-bottom: 10px;
          }
          .user-role-chip {
            flex: 1;
            text-align: center;
            background: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            padding: 6px 4px;
            font-size: 12px;
            font-weight: 800;
            color: #0B1226;
          }
          .credential-pwd-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 8px;
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 700;
            color: #92400E;
            width: 100%;
            justify-content: center;
          }
          .credential-pwd-chip strong {
            font-family: monospace;
            background: #FEF3C7;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 13px;
          }
          
          .welcome-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 12px;
            padding-top: 14px;
            border-top: 1px solid #E2E8F0;
          }
          .welcome-field label {
            display: block;
            font-size: 11px;
            font-weight: 800;
            color: #5B6472;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .welcome-field input {
            width: 100%;
            height: 42px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1.5px solid #CBD5E1;
            font-size: 13.5px;
            font-family: 'Manrope', sans-serif;
            color: #0B1226;
            background: white;
            outline: none;
            transition: border-color 0.15s ease;
          }
          .welcome-field input:focus {
            border-color: #FBB800;
          }
          .welcome-error {
            display: none;
            font-size: 11.5px;
            font-weight: 700;
            color: #DC2626;
            margin-top: -2px;
          }
          .welcome-submit-btn {
            margin-top: 4px;
            height: 48px;
            border: none;
            border-radius: 999px;
            background: linear-gradient(135deg, #FDC300, #FBB800);
            color: #071131;
            font-size: 14.5px;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 8px 20px -4px rgba(253,195,0,0.45);
            transition: transform 0.15s, filter 0.15s;
          }
          .welcome-submit-btn:hover {
            filter: brightness(1.04);
            transform: scale(1.01);
          }
          @media (max-width: 820px) {
            .welcome-layout-grid {
              grid-template-columns: 1fr;
              gap: 20px;
            }
          }
          @media (max-width: 760px) {
            .welcome-card {
              padding: 28px 24px;
            }
            .welcome-layout-grid {
              grid-template-columns: 1fr;
              gap: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="welcome-overlay" id="welcome-overlay">
          <div class="welcome-card">
            <h1 class="welcome-title">Olá, avaliador(a)!</h1>
            <p class="welcome-subtitle">Seja bem-vindo ao Portal IAS. Nosso time pensou na melhor experiência de uso para você acessar os protótipos.</p>

            <div class="welcome-layout-grid">
              <!-- Coluna da Esquerda: O que você precisa saber & Pilares -->
              <div class="welcome-info-col">
                <div>
                  <p><strong>O que você precisa saber:</strong></p>
                  <ol>
                    <li>Todas as 8 dores do edital foram resolvidas;</li>
                    <li>Desenvolvemos 5 protótipos para essas dores. Em cada um, apresentamos nome, dor e solução;</li>
                    <li>Clique em <strong>"Acessar protótipo"</strong> para navegar em cada um deles;</li>
                    <li>Todos os protótipos seguem os 3 pilares fundamentais:
                      <ul class="welcome-pillars-bullets">
                        <li>Intencionalidade pedagógica</li>
                        <li>IA contextualizada</li>
                        <li>Personalização</li>
                      </ul>
                    </li>
                  </ol>

                  <div class="welcome-important">
                    <p><strong>Importante:</strong> para que você possa testar as soluções, é fundamental informar aqui um e-mail e WhatsApp válidos.</p>
                    <p>Não se preocupe. Assim que você fechar essa página, os dados serão apagados.</p>
                  </div>
                </div>

                <div class="welcome-signature">
                  Boa jornada!
                  <strong>Time Cris Miura</strong>
                </div>
              </div>

              <!-- Coluna da Direita: Credenciais Organizadas em Chips + Form de Entrada -->
              <div class="welcome-action-col">
                <div class="welcome-credentials-box">
                  <div class="welcome-credentials-header">
                    <span>🔐</span> Credenciais do protótipo de login
                  </div>
                  <div class="welcome-credentials-chips">
                    <div class="user-role-chip">Estudante</div>
                    <div class="user-role-chip">Professor</div>
                    <div class="user-role-chip">Gestor</div>
                  </div>
                  <div class="credential-pwd-chip">
                    <span>🔑 Senha para todos:</span> <strong>1234</strong>
                  </div>
                </div>

                <form class="welcome-form" id="welcome-form">
                  <div class="welcome-field">
                    <label for="welcome-email">Seu E-mail</label>
                    <input type="email" id="welcome-email" placeholder="seuemail@exemplo.com" required />
                  </div>
                  <div class="welcome-field">
                    <label for="welcome-whatsapp">Seu WhatsApp</label>
                    <input type="tel" id="welcome-whatsapp" placeholder="(11) 91234-5678" required />
                  </div>
                  <div class="welcome-error" id="welcome-error">Informe um e-mail e um WhatsApp válidos para continuar.</div>
                  <button type="submit" class="welcome-submit-btn">Acessar Protótipos →</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div style="padding: 30px 40px 10px 40px;">
          <h1 class="hero-title">Navegue abaixo pelos protótipos</h1>
        </div>
        </div>

        <div class="main-grid">
          <!-- CARD 1: Logins & Dashboards -->
          <a href="/login/" class="card">
            <div class="card-header">
              <div>
                <h3>Logins e relatórios</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Credenciais: Estudante, Professor e Gestor</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-frictional">Cadastro Friccional</span><br>
                  <strong>Solução proposta:</strong> Coletamos mais dados do(a) professor(a) para que ele tenha mais canais para recuperar sua senha.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Gestão de Credenciais</span><br>
                  <strong>Solução proposta:</strong> O estudante que esquecer seu login ou sua senha poderá pedir acesso por WhatsApp ao responsável na escola e acessar instantaneamente após aprovação.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Autenticação de Professores</span><br>
                  <strong>Solução proposta:</strong> Acesso garantido por fluxo real de recuperação via e-mail real, WhatsApp (usar API oficial Meta) ou perguntas-chaves baseadas no cadastro.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avaliação à Ação</span><br>
                  <strong>Solução proposta:</strong> O prof. Cláudio (bot de IA) sugere planos de ação pedagógicos práticos e curtos baseados na BNCC para facilitar o cruzamento do professor entre relatório recebido e instrução do material socioemocional usado na escola.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar protótipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 2: Senna Teste -->
          <a href="/teste/" class="card">
            <div class="card-header">
              <div>
                <h3>Senna</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Credenciais: Estudante</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Engajamento de Jovens</span><br>
                  <strong>Solução proposta:</strong> Jornada guiada pelo mentor Béco com marcos inspirados no universo dos estudantes. Monitora desatenção (Fast-Click) e sugere exercícios de desaceleração e respiração, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Dados na Gaveta</span><br>
                  <strong>Solução proposta:</strong> Devolutiva imediata que traduz os resultados socioemocionais do estudante em perfis que fazem parte do universo dele e que pode ser exportado.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avaliação à Ação</span><br>
                  <strong>Solução proposta:</strong> Béco (mentor de IA) para acompanhá-lo no WhatsApp nas dúvidas surgidas posteriormente ao teste, utilizando raciocínio socrático e com bloqueios mandatórios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar protótipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 3: Autoavaliação -->
          <a href="/autoavaliacao/" class="card">
            <div class="card-header">
              <div>
                <h3>Autoavaliação socioemocional</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Credenciais: Estudante</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Engajamento de Jovens</span><br>
                  <strong>Solução proposta:</strong> Jornada guiada pelo mentor Béco com marcos inspirados no universo dos estudantes. Monitora desatenção (Fast-Click) e sugere exercícios de desaceleração e respiração, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Dados na Gaveta</span><br>
                  <strong>Solução proposta:</strong> Devolutiva imediata que traduz os resultados socioemocionais do estudante em perfis que fazem parte do universo dele.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avaliação à Ação</span><br>
                  <strong>Solução proposta:</strong> Béco (mentor de IA) para acompanhá-lo no WhatsApp nas dúvidas surgidas posteriormente ao teste, utilizando raciocínio socrático e com bloqueios mandatórios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar protótipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 4: Criatividade & Crítico -->
          <a href="/hackathon/" class="card">
            <div class="card-header">
              <div>
                <h3>Criatividade e pensamento crítico</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Credenciais: Estudante</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Engajamento de Jovens</span><br>
                  <strong>Solução proposta:</strong> Personalização com IA: a inteligência artificial gera enunciados dinâmicos baseados nos hobbies e interesses do aluno.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Dados na Gaveta</span><br>
                  <strong>Solução proposta:</strong> Devolutiva imediata que traduz os resultados socioemocionais do estudante em perfis que fazem parte do universo dele e que pode ser exportado
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avaliação à Ação</span><br>
                  <strong>Solução proposta:</strong> Béco (mentor de IA) para acompanhá-lo no WhatsApp nas dúvidas surgidas posteriormente ao teste, utilizando raciocínio socrático, e para criar planos de desenvolvimento. Inclui bloqueios mandatórios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar protótipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 5: App IAS Offline -->
          <div class="card" style="cursor: pointer;" onclick="document.getElementById('modal-offline').style.display = 'flex'">
            <div class="card-header">
              <div>
                <h3 style="font-size: 14px;">App IAS offline first</h3>
              </div>
            </div>
            <div class="card-body">

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-connect">Falta de Conectividade</span><br>
                  <strong>Solução proposta:</strong> Executável desktop de 15MB que roda testes, inclusive usando inteligência artificial, <em>100% desconectado localmente</em>.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Sincronização Ativa</span><br>
                  <strong>Solução proposta:</strong> O app salva localmente sem perder dados e envia avaliações silenciosamente assim que o laboratório conectar-se por 1 minuto.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar descrição &rarr;</span>
            </div>
          </div>
        </div>

        <!-- Modal Overlay -->
        <div id="modal-offline" style="display: none; position: fixed; inset: 0; z-index: 1000; background: rgba(11, 18, 38, 0.8); backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;">
          <div style="background: white; border-radius: 24px; padding: 40px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <button onclick="document.getElementById('modal-offline').style.display = 'none'" style="position: absolute; top: 24px; right: 24px; background: #F1F5F9; border: none; width: 36px; height: 36px; border-radius: 18px; font-weight: bold; cursor: pointer; color: #475569; font-size: 16px;">X</button>

            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 24px;">
              <div>
                <h2 style="font-size: 24px; font-weight: 900; color: #071131; margin: 0;">Aplicativo IAS Offline-First</h2>
                <span style="font-size: 13.5px; color: #5B6472; font-weight: 600;">Proposta arquitetural para ambientes de baixa ou nenhuma conectividade</span>
              </div>
            </div>

            <div style="background: #F8FAFC; border-left: 4px solid #FBB800; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #0E477A; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Como funciona na prática</h4>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                O IAS fornece um programa leve que pode ser baixado em um pen-drive e instalado nos computadores do laboratório escolar. Esse "aplicativo" tem a exata mesma aparência dos testes na internet e hospeda o robô de inteligência artificial em seu interior. Os estudantes fazem a avaliação com os computadores totalmente offline, e o aplicativo salva tudo no disco da máquina de forma segura. Quando a máquina capta algum pulso mínimo de internet, o aplicativo envia as provas silenciosamente para os servidores centrais do IAS.
              </p>
            </div>

            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; border-radius: 0 12px 12px 0;">
              <h4 style="font-size: 14px; font-weight: 800; color: #166534; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Detalhamento técnico</h4>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 10px;">
                <li><strong>Stack Desktop:</strong> O portal é transpilado via framework <strong>Tauri</strong>. Ao utilizar Rust e o WebView nativo do SO, criamos binários de execução (app) incrivelmente leves (cerca de 15 a 20MB) que carregam instantaneamente e consomem o mínimo de RAM nas máquinas defasadas das escolas públicas.</li>
                <li><strong>Banco de Dados Local-First:</strong> Utiliza-se um banco de dados embutido no disco local, como o <strong>SQLite</strong> ou <strong>RxDB</strong>. O RxDB possui mecanismos ativos que sincronizam assincronamente os JSONs armazenados com um banco na nuvem (PostgreSQL) sem gerar conflitos.</li>
                <li><strong>IA Offline Quantizada (SLM):</strong> Para manter os chats generativos com os alunos adaptados às dores de engajamento sem estourar chamadas de API, o binário empacota um <strong>Small Language Model (ex: Llama-3-8B ou Phi-3-Mini)</strong> em formato <code>.gguf</code> quantizado em 4-bit. Utilizando a engine <strong>llama.cpp</strong> injetada no Tauri, a inferência roda diretamente na CPU dos computadores escolares (dispensando placas de vídeo) exigindo não mais do que 1.8GB a 3.8GB de RAM local, provendo dinamicidade offline.</li>
              </ul>
            </div>
          </div>
        </div>
        <script>
          // Tela 0: bloqueia o scroll até o avaliador informar e-mail/WhatsApp.
          // Nenhum dado é enviado ao servidor — some da memória ao fechar a página.
          document.body.style.overflow = 'hidden';
          document.getElementById('welcome-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var email = document.getElementById('welcome-email').value.trim();
            var whatsapp = document.getElementById('welcome-whatsapp').value.trim();
            var errorEl = document.getElementById('welcome-error');

            var emailValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
            var digits = whatsapp.replace(/\\D/g, '');
            var whatsappValid = digits.length >= 10 && digits.length <= 13;

            if (!emailValid || !whatsappValid) {
              errorEl.style.display = 'block';
              return;
            }
            errorEl.style.display = 'none';
            try {
              sessionStorage.setItem('ias_evaluator_email', email);
              sessionStorage.setItem('ias_evaluator_whatsapp', digits);
            } catch (err) {}
            document.getElementById('welcome-overlay').style.display = 'none';
            document.body.style.overflow = '';
          });

          document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
              const url = card.getAttribute('href') || 'modal-offline';
              const titleNode = card.querySelector('h3');
              const title = titleNode ? titleNode.innerText : 'Desconhecido';
              
              fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  origem: 'hub_landing',
                  acao: 'clique_card',
                  detalhes: { destino: url, titulo: title }
                }),
                keepalive: true
              }).catch(err => console.error(err));
            });
          });
        </script>
      </body>
      </html>
    `);
  });

    // ==========================================
  // INCLUSÃO E ACESSIBILIDADE (A11Y)
  // ==========================================

  app.use('/a11y', express.static(path.join(process.cwd(), 'public', 'a11y')));
  app.use('/audio', express.static(path.join(process.cwd(), 'public', 'audio')));
  app.use('/sandbox', express.static(path.join(process.cwd(), 'public', 'sandbox')));

  app.get('/sandbox-live', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'sandbox', 'live-test.html'));
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Registra automaticamente o webhook da aplicação na Evolution API local
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

    if (evolutionUrl && evolutionKey) {
      try {
        console.log(`[Auto-Config Webhook] Verificando se a instância "${evolutionInstance}" existe...`);
        
        const checkRes = await fetch(`${evolutionUrl}/instance/connectionState/${evolutionInstance}`, {
          headers: { 'apikey': evolutionKey }
        });

        if (checkRes.status === 404) {
          console.log(`[Auto-Config Webhook] Instância "${evolutionInstance}" não encontrada. Criando automaticamente...`);
          const createRes = await fetch(`${evolutionUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey
            },
            body: JSON.stringify({
              instanceName: evolutionInstance,
              token: evolutionKey,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS"
            })
          });

          if (createRes.ok) {
            console.log(`[Auto-Config Webhook] Instância "${evolutionInstance}" criada com sucesso.`);
            await new Promise(r => setTimeout(r, 1500)); // Pequeno delay de inicialização
          } else {
            const errText = await createRes.text();
            console.warn(`[Auto-Config Webhook] Erro ao criar instância:`, createRes.status, errText);
          }
        } else {
          console.log(`[Auto-Config Webhook] Instância "${evolutionInstance}" já ativa ou existente.`);
        }

        console.log(`[Auto-Config Webhook] Registrando webhook na Evolution API...`);
        const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : (process.env.PUBLIC_URL || `http://localhost:${PORT}`);
        const webhookRes = await fetch(`${evolutionUrl}/webhook/set/${evolutionInstance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: `${publicUrl}/api/evolution-webhook`,
              byEvents: false,
              base64: false,
              events: [
                "SEND_MESSAGE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE"
              ]
            }
          })
        });

        if (webhookRes.ok) {
          console.log(`[Auto-Config Webhook] Webhook cadastrado com sucesso na Evolution API.`);
        } else {
          const errText = await webhookRes.text();
          console.warn(`[Auto-Config Webhook] Falha ao cadastrar webhook:`, webhookRes.status, errText);
        }
      } catch (err) {
        console.warn(`[Auto-Config Webhook] Erro ao conectar para configurar webhook:`, err);
      }
    }
  });
}

startServer();

