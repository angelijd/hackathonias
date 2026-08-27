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
  const models = ['gemini-3.5-flash', 'gemini-2.5-flash'];
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
            { rubricaId: "cr2", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer criar um novo espaÃ§o perto da ${school} para estimular a imaginaÃ§Ã£o dos jovens, mas o local atual Ã© cinza e sem graÃ§a. Como o ambiente afeta sua vontade de criar e o que vocÃª faria para transformar esse lugar?` },
            { rubricaId: "cr3", tipo: "dissertativa", enunciado: `Pense no seu dia a dia e na sua paixÃ£o por ${interestName}. Qual foi a ideia mais simples e criativa que vocÃª teve recentemente para resolver um problema comum e como vocÃª se sentiu ao colocÃ¡-la em prÃ¡tica?` },
            { rubricaId: "cr5", tipo: "dissertativa", enunciado: `Se vocÃª tivesse que inventar 5 usos totalmente diferentes e fora do comum para um objeto relacionado a ${interestName}, quais seriam?` },
            { rubricaId: "cr6", tipo: "dissertativa", enunciado: `Conte sobre uma experiÃªncia recente na qual vocÃª tentou criar algo diferente, mas a sua ideia nÃ£o deu certo. Como vocÃª lidou com a frustraÃ§Ã£o desse erro e tentou novamente?` },
            { rubricaId: "cr7", tipo: "dissertativa", enunciado: `Imagine que vocÃª e seus amigos do ${grade} precisam organizar um evento sobre ${interestName}, mas ninguÃ©m sabe direito o que fazer e as opiniÃµes sÃ£o muito diferentes. Como vocÃª lidaria com essa confusÃ£o sem perder a calma e a criatividade?` }
          ];
        } else {
          fallbackItems = [
            { rubricaId: "pc1", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer proibir o uso de celulares na ${school} para melhorar o foco, mas alguns alunos dizem que usam para pesquisar sobre ${interestName}. Como vocÃª analisaria os argumentos dos dois lados sem deixar sua emoÃ§Ã£o falar mais alto?` },
            { rubricaId: "pc2", tipo: "multipla_marcacao", enunciado: `Pense em uma situaÃ§Ã£o em que vocÃª teve que tomar uma decisÃ£o difÃ­cil envolvendo seus amigos do ${grade} e sua paixÃ£o por ${interestName}. Como vocÃª lidou com o conflito entre o que vocÃª sentia e o que a lÃ³gica dizia ser o certo? Marque as opÃ§Ãµes que se aplicam:`, opcoes: ["Procurei confirmar se os fatos eram verdadeiros.", "Procurei verificar a credibilidade da fonte.", "Busquei mais informaÃ§Ã£o antes de decidir.", "Refleti sobre os impactos Ã©ticos."] },
            { rubricaId: "pc4", tipo: "multipla_marcacao", enunciado: `Sendo um estudante de ${age}, Ã© comum a gente buscar informaÃ§Ãµes que sÃ³ confirmam o que jÃ¡ pensamos sobre ${interestName}. Como vocÃª faria para nÃ£o cair nessa armadilha? Marque o que vocÃª faz:`, opcoes: ["Presto atenÃ§Ã£o em como minhas crenÃ§as influenciam meu julgamento.", "Examino argumentos contrÃ¡rios com calma.", "Busco fontes alternativas confiÃ¡veis."] },
            { rubricaId: "pc5", tipo: "multipla_marcacao", enunciado: `Ao assistir a um vÃ­deo ou post polÃªmico sobre ${interestName}, como vocÃª identifica o que realmente estÃ¡ sendo dito? Marque o que se aplica:`, opcoes: ["Consigo identificar as ideias principais.", "Percebo o que estÃ¡ dito diretamente e o que fica nas entrelinhas.", "Distingo o que Ã© opiniÃ£o, o que Ã© fato e o que Ã© bem fundamentado.", "Entendo o que o autor quis dizer, mesmo nas entrelinhas."] },
            { rubricaId: "pc8", tipo: "multipla_marcacao", enunciado: `Quando surge uma novidade sobre ${interestName} que vai contra algo que vocÃª sempre defendeu, como vocÃª age? Marque suas atitudes:`, opcoes: ["Percebo quando minhas crenÃ§as podem estar influenciando o que penso.", "Percebo quando estou buscando sÃ³ o que confirma o que jÃ¡ acredito.", "Me esforÃ§o para buscar informaÃ§Ãµes que contradizem o que acredito.", "Analiso com cuidado antes de rejeitar."] }
          ];
        }
        
        // Small delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({ items: fallbackItems });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptCriticalThinking = `# CONTEXTO

VocÃª Ã© um avaliador do Instituto Ayrton Senna. As rubricas abaixo sÃ£o material oficial do IAS â€” nÃ£o sÃ£o inspiraÃ§Ã£o, sÃ£o fonte primÃ¡ria. Nunca parafraseie o conteÃºdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# RESOLUÃƒâ€¡ÃƒÆ’O DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte especÃ­fico):
1. VocÃª DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situaÃ§Ãµes nesse universo.
2. Se o item especÃ­fico listado nÃ£o for reconhecÃ­vel (nome inventado ou erro irreconhecÃ­vel), use o interesse amplo correspondente.
3. Nunca invente mecÃ¢nicas, personagens, times, artistas ou elementos que nÃ£o existam de verdade. Se nÃ£o tiver certeza de algum item especÃ­fico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS Ã¢â‚¬â€ PENSAMENTO CRÃƒï¿½TICO (5 itens)

Cada rubrica contÃƒÂ©m o campo "intencao_cena", que orienta o tipo de situaÃƒÂ§ÃƒÂ£o a construir, e o campo "formato", que define a estrutura do item gerado. Respeite ambos rigorosamente.
Para rubricas de mÃƒÂºltipla marcaÃƒÂ§ÃƒÂ£o: "itens_originais" contÃƒÂ©m o texto oficial do IAS (nÃƒÂ£o use nas opÃƒÂ§ÃƒÂµes geradas). "itens_traduzidos" contÃƒÂ©m a versÃƒÂ£o acessÃƒÂ­vel Ã¢â‚¬â€ use exclusivamente estes nas opÃƒÂ§ÃƒÂµes.

[
  {
    "id": "pc1",
    "formato": "dissertativa",
    "habilidade": "Conhecimento especÃƒÂ­fico do tema",
    "intencao_cena": "Crie um momento em que o aluno se depara com uma afirmaÃƒÂ§ÃƒÂ£o ou debate sobre algo diretamente ligado ao seu interesse especÃƒÂ­fico, e alguÃƒÂ©m pede a opiniÃƒÂ£o dele ou ele precisa tomar uma posiÃƒÂ§ÃƒÂ£o.",
    "niveis": [
      "NÃƒÂ£o tenho conhecimento algum sobre o tema.",
      "ConheÃƒÂ§o um pouco o tema, mas nÃƒÂ£o o suficiente para refletir muito sobre ele.",
      "ConheÃƒÂ§o o tema, consigo refletir sobre ele e imaginar diferentes pontos de vista.",
      "ConheÃƒÂ§o bem o tema, consigo refletir sobre ele quando necessÃƒÂ¡rio."
    ]
  },
  {
    "id": "pc2",
    "formato": "multipla_marcacao",
    "habilidade": "Conhecimento especÃƒÂ­fico do pensamento crÃƒÂ­tico",
    "intencao_cena": "Crie um momento em que o aluno recebe uma informaÃƒÂ§ÃƒÂ£o sobre seu interesse que pode ser verdadeira ou falsa Ã¢â‚¬â€ e precisa decidir se confia nela.",
    "itens_originais": [
      "ConheÃƒÂ§o os princÃƒÂ­pios cientÃƒÂ­ficos para inferÃƒÂªncia causal.",
      "ConheÃƒÂ§o lÃƒÂ³gica categÃƒÂ³rica.",
      "Sei o que ÃƒÂ© uma premissa.",
      "Sei o que ÃƒÂ© um argumento.",
      "ConheÃƒÂ§o alguns tipos de falÃƒÂ¡cia (lÃƒÂ³gica).",
      "ConheÃƒÂ§o algumas tÃƒÂ©cnicas de convencimento (retÃƒÂ³rica).",
      "ConheÃƒÂ§o princÃƒÂ­pios bÃƒÂ¡sicos da ÃƒÂ©tica em uma sociedade democrÃƒÂ¡tica.",
      "Tenho conhecimento bÃƒÂ¡sico para interpretar tabelas e grÃƒÂ¡ficos.",
      "Tenho conhecimento bÃƒÂ¡sico para interpretar dados estatÃƒÂ­sticos e probabilidades."
    ],
    "itens_traduzidos": [
      "Sei entender por que uma coisa causa a outra.",
      "Sei raciocinar com grupos e categorias.",
      "Sei o que ÃƒÂ© a ideia base que sustenta uma opiniÃƒÂ£o.",
      "Sei identificar as razÃƒÂµes usadas para defender uma opiniÃƒÂ£o.",
      "Consigo reconhecer erros de raciocÃƒÂ­nio que parecem verdadeiros mas nÃƒÂ£o sÃƒÂ£o.",
      "ConheÃƒÂ§o alguns jeitos que as pessoas usam para convencer os outros.",
      "Entendo princÃƒÂ­pios bÃƒÂ¡sicos do que ÃƒÂ© justo para todos numa sociedade.",
      "Consigo ler e entender tabelas e grÃƒÂ¡ficos.",
      "Consigo entender dados e probabilidades bÃƒÂ¡sicas."
    ]
  },
  {
    "id": "pc4",
    "formato": "multipla_marcacao",
    "habilidade": "AvaliaÃƒÂ§ÃƒÂ£o das premissas, argumentaÃƒÂ§ÃƒÂ£o e conclusÃƒÂµes (parte 1)",
    "intencao_cena": "Crie uma situaÃƒÂ§ÃƒÂ£o em que o aluno encontra uma afirmaÃƒÂ§ÃƒÂ£o sobre seu interesse que parece verdadeira mas pode nÃƒÂ£o ser Ã¢â‚¬â€ e precisa decidir como verificar.",
    "itens_originais": [
      "Procuro confirmar, a partir de fontes externas confiÃƒÂ¡veis, se os fatos sÃƒÂ£o verdadeiros.",
      "Procuro verificar a credibilidade da fonte de uma informaÃƒÂ§ÃƒÂ£o/opiniÃƒÂ£o.",
      "Busco mais informaÃƒÂ§ÃƒÂ£o se achar necessÃƒÂ¡rio.",
      "Procuro aplicar anÃƒÂ¡lise lÃƒÂ³gica para detectar erros na argumentaÃƒÂ§ÃƒÂ£o.",
      "Consigo identificar falÃƒÂ¡cias e tÃƒÂ©cnicas de convencimento.",
      "Procuro pensar se existem explicaÃƒÂ§ÃƒÂµes alternativas para os mesmos dados.",
      "Consigo examinar a adequaÃƒÂ§ÃƒÂ£o dos argumentos declarando causa-efeito.",
      "Reflito sobre as questÃƒÂµes ÃƒÂ©ticas que podem estar envolvidas.",
      "Procuro imaginar quais pessoas/seres vivos poderiam ser prejudicados."
    ],
    "itens_traduzidos": [
      "Busco fontes confiÃƒÂ¡veis para confirmar se o que li ou ouvi ÃƒÂ© verdade.",
      "Verifico se quem disse algo ÃƒÂ© de fato confiÃƒÂ¡vel.",
      "Procuro mais informaÃƒÂ§ÃƒÂµes quando acho que preciso.",
      "Verifico se as razÃƒÂµes apresentadas realmente fazem sentido.",
      "Percebo quando alguÃƒÂ©m usa erros de raciocÃƒÂ­nio ou truques para convencer.",
      "Penso se os mesmos dados poderiam ter outra explicaÃƒÂ§ÃƒÂ£o.",
      "Avalio se a relaÃƒÂ§ÃƒÂ£o de causa e efeito nos argumentos faz sentido.",
      "Penso se hÃƒÂ¡ questÃƒÂµes de certo e errado envolvidas.",
      "Penso em quem poderia ser prejudicado pela situaÃƒÂ§ÃƒÂ£o."
    ]
  },
  {
    "id": "pc5",
    "formato": "multipla_marcacao",
    "habilidade": "InterpretaÃƒÂ§ÃƒÂ£o/decodificaÃƒÂ§ÃƒÂ£o das ideias centrais",
    "intencao_cena": "Crie um momento em que o aluno assiste, lÃƒÂª ou ouve algo sobre seu interesse Ã¢â‚¬â€ um vÃƒÂ­deo, post, artigo ou comentÃƒÂ¡rio Ã¢â‚¬â€ e precisa entender o que realmente estÃƒÂ¡ sendo dito.",
    "itens_originais": [
      "Consigo identificar as ideias/os conceitos principais.",
      "Consigo identificar as premissas principais, explÃƒÂ­citas e implÃƒÂ­citas.",
      "Consigo reconhecer diferenÃƒÂ§as entre opiniÃƒÂµes, argumentos fundamentados e fatos.",
      "Compreendo a intenÃƒÂ§ÃƒÂ£o explÃƒÂ­cita ou implÃƒÂ­cita do texto/ÃƒÂ¡udio/vÃƒÂ­deo em um contexto comunicativo."
    ],
    "itens_traduzidos": [
      "Consigo identificar as ideias principais do que li ou assisti.",
      "Percebo o que estÃƒÂ¡ dito diretamente e o que fica nas entrelinhas.",
      "Distingo o que ÃƒÂ© opiniÃƒÂ£o, o que ÃƒÂ© fato e o que ÃƒÂ© uma opiniÃƒÂ£o bem fundamentada.",
      "Entendo o que o autor quis dizer, mesmo quando nÃƒÂ£o estÃƒÂ¡ totalmente explÃƒÂ­cito."
    ]
  },
  {
    "id": "pc8",
    "formato": "multipla_marcacao",
    "habilidade": "Monitoramento da influÃƒÂªncia de crenÃƒÂ§as e vieses",
    "intencao_cena": "Crie um momento em que o aluno encontra uma informaÃƒÂ§ÃƒÂ£o sobre seu interesse que confirma Ã¢â‚¬â€ ou contraria Ã¢â‚¬â€ algo que ele sempre acreditou ser verdade.",
    "itens_originais": [
      "Procuro prestar atenÃƒÂ§ÃƒÂ£o em como minhas crenÃƒÂ§as influenciam meu julgamento.",
      "Procuro prestar atenÃƒÂ§ÃƒÂ£o se meus julgamentos tÃƒÂªm viÃƒÂ©s confirmatÃƒÂ³rio.",
      "Procuro prestar atenÃƒÂ§ÃƒÂ£o se estou buscando evidÃƒÂªncias que contradizem uma ideia em que acredito.",
      "Examino argumentos com mais calma quando as conclusÃƒÂµes sÃƒÂ£o fÃƒÂ¡ceis de aceitar porque se afinam aos meus valores.",
      "Examino argumentos com mais calma quando as conclusÃƒÂµes sÃƒÂ£o difÃƒÂ­ceis de aceitar porque entram em conflito com meus valores."
    ],
    "itens_traduzidos": [
      "Percebo quando minhas crenÃƒÂ§as podem estar influenciando o que penso.",
      "Percebo quando estou buscando sÃƒÂ³ o que confirma o que jÃƒÂ¡ acredito.",
      "Me esforÃƒÂ§o para buscar tambÃƒÂ©m informaÃƒÂ§ÃƒÂµes que contradizem o que acredito.",
      "Analiso com mais cuidado quando uma conclusÃƒÂ£o ÃƒÂ© fÃƒÂ¡cil de aceitar porque combina com o que jÃƒÂ¡ penso.",
      "Analiso com mais cuidado quando uma conclusÃƒÂ£o ÃƒÂ© difÃƒÂ­cil de aceitar porque vai contra o que acredito."
    ]
  }
]

# TAREFA Ã¢â‚¬â€ ESTRUTURA OBRIGATÃƒâ€œRIAS POR FORMATO

## Para itens com formato "dissertativa" (pc1):
1. CENA (1Ã¢â‚¬â€œ2 frases): Situe o aluno num momento concreto e especÃƒÂ­fico dentro do universo do seu interesse, com uma tensÃƒÂ£o natural que se encaixa na "intencao_cena" da rubrica. Use 2Ã‚Âª pessoa direta.
2. PERGUNTA (1 frase): Uma pergunta aberta, ancorada na cena, guiada pela rubrica correspondente.

## Para itens com formato "multipla_marcacao" (pc2, pc4, pc5, pc8):
1. CENA (1Ã¢â‚¬â€œ2 frases): Situe o aluno num momento concreto dentro do universo do seu interesse, conforme a "intencao_cena" da rubrica. Use 2Ã‚Âª pessoa direta.
2. PERGUNTA de marcaÃƒÂ§ÃƒÂ£o (1 frase): "Marque o que vocÃƒÂª costuma fazer nessa situaÃƒÂ§ÃƒÂ£o:" ou variaÃƒÂ§ÃƒÂ£o natural.
3. OPÃƒâ€¡Ãƒâ€¢ES: Selecione 4Ã¢â‚¬â€œ5 itens de "itens_traduzidos" da rubrica correspondente. Use o texto de "itens_traduzidos" exatamente como estÃƒÂ¡ Ã¢â‚¬â€ nunca os "itens_originais".

# REGRAS DE SELEÃƒâ€¡ÃƒÆ’O DE OPÃƒâ€¡Ãƒâ€¢ES (apenas para multipla_marcacao)

Ao selecionar 4Ã¢â‚¬â€œ5 itens de "itens_traduzidos" de uma rubrica:
1. Inclua ao menos 1 comportamento mais simples (geralmente os primeiros da lista) e 1 mais complexo (geralmente os ÃƒÂºltimos).
2. Escolha os itens que se conectam mais naturalmente ao cenÃƒÂ¡rio narrado na CENA.
3. Evite dois itens que descrevam comportamentos muito parecidos entre si Ã¢â‚¬â€ maximize a variedade.
4. Para rubricas com 4 itens traduzidos (pc5, pc8), inclua todos Ã¢â‚¬â€ nÃƒÂ£o hÃƒÂ¡ necessidade de cortar.
5. Nunca altere, misture ou crie opÃƒÂ§ÃƒÂµes fora de "itens_traduzidos".

# REGRAS DE PERSONALIZAÃƒâ€¡ÃƒÆ’O

1. O interesse ancora o cenÃƒÂ¡rio de forma concreta: use o nome do jogo, esporte, instrumento ou atividade especÃƒÂ­fica Ã¢â‚¬â€ nÃƒÂ£o o interesse amplo ("games", "mÃƒÂºsica") quando o interesse detalhado estiver disponÃƒÂ­vel.
2. Use 1Ã¢â‚¬â€œ2 termos que alguÃƒÂ©m que vive esse interesse reconheceria (ex: "ranked", "build", "acorde", "tÃƒÂ¡tica"). Se estiver usando o interesse amplo (fallback), use termos genÃƒÂ©ricos do domÃƒÂ­nio.
3. O dilema da cena deve ser algo que realmente acontece naquele universo Ã¢â‚¬â€ nÃƒÂ£o drama inventado.
4. Nunca comece com "JÃƒÂ¡ que vocÃƒÂª gosta de..." ou "Pensando nos seus interesses..." Ã¢â‚¬â€ coloque o aluno direto na cena.
5. As consequÃƒÂªncias e a aposta devem ser realistas para a idade e o cotidiano do aluno.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGATÃƒâ€œRIAS

1. Sempre fale diretamente com o aluno usando "vocÃƒÂª". Use o nome apenas como vocativo de abertura (ex: "[Nome], ..."). Nunca narre o aluno como personagem em 3Ã‚Âª pessoa ("Ayrton foi", "Ayrton percebeu").
2. Linguagem simples, frases curtas, tom amigÃƒÂ¡vel.
3. Nunca inclua competiÃƒÂ§ÃƒÂ£o, ranking ou comparaÃƒÂ§ÃƒÂ£o entre alunos.
4. Nunca sugira que existe resposta certa ou errada.
5. Nunca revele a rubrica, habilidade ou "intencao_cena" sendo avaliada no enunciado ou nas opÃƒÂ§ÃƒÂµes.
6. Nunca inclua teoria, jargÃƒÂ£o pedagÃƒÂ³gico ou metalinguagem no enunciado.
7. Para mÃƒÂºltipla marcaÃƒÂ§ÃƒÂ£o: use exclusivamente "itens_traduzidos". Nunca use "itens_originais" nas opÃƒÂ§ÃƒÂµes geradas.

# FORMATO DE SAÃƒï¿½DA

Responda ESTRITAMENTE em JSON vÃƒÂ¡lido, sem markdown por fora, seguindo exatamente este formato:

{
  "items": [
    { "rubricaId": "pc1", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "pc2", "tipo": "multipla_marcacao", "enunciado": "texto da cena + pergunta de marcaÃƒÂ§ÃƒÂ£o", "opcoes": ["opÃƒÂ§ÃƒÂ£o traduzida A", "opÃƒÂ§ÃƒÂ£o traduzida B", "opÃƒÂ§ÃƒÂ£o traduzida C", "opÃƒÂ§ÃƒÂ£o traduzida D"] }
  ]
}

O array "items" deve ter exatamente 5 objetos, um por rubrica do banco, na ordem pc1, pc2, pc4, pc5, pc8.

REGRA DE FORMATO: Itens com formato "dissertativa" nÃƒÂ£o podem ter o campo "opcoes". Itens com formato "multipla_marcacao" devem ter o campo "opcoes" com exatamente 4 ou 5 strings. Qualquer violaÃƒÂ§ÃƒÂ£o torna a resposta invÃƒÂ¡lida.`;

      const promptCreativity = `# CONTEXTO

VocÃª Ã© um avaliador do Instituto Ayrton Senna. As rubricas abaixo sÃ£o material oficial do IAS â€” nÃ£o sÃ£o inspiraÃ§Ã£o, sÃ£o fonte primÃ¡ria. Nunca parafraseie o conteÃºdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# RESOLUÃ‡ÃƒO DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte especÃ­fico):
1. VocÃª DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situaÃ§Ãµes nesse universo.
2. Se o item especÃ­fico listado nÃ£o for reconhecÃ­vel (nome inventado ou erro irreconhecÃ­vel), use o interesse amplo correspondente.
3. Nunca invente mecÃ¢nicas, personagens, times, artistas ou elementos que nÃ£o existam de verdade. Se nÃ£o tiver certeza de algum item especÃ­fico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS â€” CRIATIVIDADE (5 itens, todos dissertativos)

[
  {"id":"cr2","habilidade":"FluÃªncia associativa / Flexibilidade e reclassificaÃ§Ã£o","niveis":["Em nada, sem ideias.","Em pelo menos uma ideia.","Em algumas ideias, mas elas sÃ£o parecidas entre si.","Em vÃ¡rias ideias, diferentes umas das outras."],"intencao":"PeÃ§a ao aluno para listar o maior nÃºmero possÃ­vel de ideias ou soluÃ§Ãµes para a situaÃ§Ã£o. A pergunta deve deixar espaÃ§o para ideias muito diferentes entre si."},
  {"id":"cr3","habilidade":"FluÃªncia associativa / Originalidade","niveis":["SÃ£o sempre parecidas com ideias dos colegas.","Ã€s vezes sÃ£o diferentes do que jÃ¡ foi pensado.","SÃ£o sempre diferentes das ideias jÃ¡ pensadas pelos colegas."],"intencao":"Apresente uma situaÃ§Ã£o e peÃ§a ao aluno qual seria A ideia dele â€” uma sÃ³, a mais dele. NÃ£o peÃ§a lista, peÃ§a a ideia que ele acha que ninguÃ©m mais teria."},
  {"id":"cr5","habilidade":"RaciocÃ­nio fluido / SÃ­ntese convergente e analÃ­tico","niveis":["Eu geralmente fico indeciso e acabo nÃ£o escolhendo.","Eu acho que sei qual Ã© a melhor ideia, mas nÃ£o sei justificar a minha escolha.","Consigo analisar os pontos positivos e negativos para selecionar a melhor ideia."],"intencao":"Apresente 2â€“3 caminhos plausÃ­veis dentro da situaÃ§Ã£o e peÃ§a ao aluno que escolha um e explique por que acha que Ã© o melhor."},
  {"id":"cr6","habilidade":"RaciocÃ­nio fluido / InduÃ§Ã£o diante de problemas complexos","niveis":["Prefiro terminar logo, pois nÃ£o gosto de problemas que demorem muito para resolver.","De inÃ­cio acho difÃ­cil, mas, com o tempo, vou me envolvendo.","Me sinto motivado para tentar resolver."],"intencao":"Descreva um desafio que parece grande e vai demorar para ser resolvido. Pergunte como o aluno se SENTE ao pensar em enfrentar esse desafio â€” nÃ£o peÃ§a a soluÃ§Ã£o."},
  {"id":"cr7","habilidade":"RaciocÃ­nio fluido / InduÃ§Ã£o e conexÃ£o de ideias","niveis":["Tenho dificuldade em pensar quando os problemas tÃªm muitas informaÃ§Ãµes novas.","Consigo entender algumas partes do problema.","Consigo analisar e isolar o problema em partes para ficarem mais fÃ¡ceis de manejar."],"intencao":"Crie uma situaÃ§Ã£o com vÃ¡rias informaÃ§Ãµes simultÃ¢neas (peÃ§as, variÃ¡veis, sintomas). Pergunte como o aluno organizaria o raciocÃ­nio para descobrir o que estÃ¡ acontecendo."}
]

# TAREFA

Gere 1 item dissertativo para cada uma das 5 rubricas acima, na ordem em que aparecem.

Para cada item, siga esta estrutura:
1. CENA (1â€“2 frases): Situe o aluno num momento concreto e especÃ­fico dentro do universo do interesse dele, com uma tensÃ£o natural â€” algo que realmente acontece naquele contexto.
2. PERGUNTA (1 frase): FaÃ§a UMA pergunta aberta, guiada pelo campo "intencao" da rubrica correspondente.

# REGRAS DE PERSONALIZAÃ‡ÃƒO

1. O dilema da cena sÃ³ pode existir dentro do universo daquele interesse especÃ­fico. Se trocar o interesse por outro e a pergunta continuar funcionando sem mudar nada, reescreva â€” a personalizaÃ§Ã£o estÃ¡ falsa.
2. Use 1â€“2 termos que alguÃ©m que pratica esse interesse reconheceria (ex: "crafting table" para Minecraft, "passe de letra" para futebol). Se estiver usando o interesse amplo (fallback), use termos genÃ©ricos do domÃ­nio.
3. Nunca comece com "JÃ¡ que vocÃª gosta de..." ou "Pensando nos seus interesses..." â€” jogue o aluno direto na cena.
4. O conflito deve ser algo que realmente acontece naquele interesse, nÃ£o um drama inventado ou artificial.
5. As consequÃªncias e a aposta devem ser realistas para a idade e o cotidiano do aluno â€” nem triviais demais, nem grandiosas demais.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGATÃ“RIAS

1. Linguagem simples, frases curtas, tom amigÃ¡vel e conversando diretamente com o aluno.
2. Nunca sugira que existe resposta certa ou errada nem use palavras avaliativas.
3. NÃ£o use "Como vocÃª resolveria isso?" de forma genÃ©rica â€” a pergunta deve refletir a intenÃ§Ã£o especÃ­fica da rubrica.
4. Nunca use o nome da rubrica ou da habilidade no enunciado.
5. Nunca inclua teoria, jargÃ£o pedagÃ³gico ou metalinguagem no enunciado.

# FORMATO DE SAÃDA

Responda ESTRITAMENTE em JSON vÃ¡lido, sem markdown por fora, seguindo exatamente este formato:

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

REGRA DE FORMATO: Nenhum objeto do array pode conter o campo "opcoes". Se vocÃª gerar "opcoes" em qualquer item, sua resposta Ã© invÃ¡lida. Todos os 5 itens sÃ£o EXCLUSIVAMENTE dissertativos.`;

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
        { rubricaId: "m1", tipo: "dissertativa", enunciado: `1. ${name}, pensando nos seus interesses, como vocÃƒÂª resolveria um desafio comum no seu dia a dia?` },
        { rubricaId: "m2", tipo: "multipla_marcacao", enunciado: `2. Descreva um momento em que vocÃƒÂª precisou mudar de ideia. Marque o que se aplica:`, opcoes: ["Foi difÃƒÂ­cil", "Foi fÃƒÂ¡cil", "NÃƒÂ£o mudei"] },
        { rubricaId: "m3", tipo: "dissertativa", enunciado: `3. O que vocÃƒÂª faria em uma situaÃƒÂ§ÃƒÂ£o em que nÃƒÂ£o existe uma resposta certa clara?` },
        { rubricaId: "m4", tipo: "multipla_marcacao", enunciado: `4. Qual ÃƒÂ© a sua forma favorita de exercitar a criatividade?`, opcoes: ["Desenhando", "Escrevendo", "Conversando"] },
        { rubricaId: "m5", tipo: "dissertativa", enunciado: `5. Conte como vocÃƒÂª lidou com a frustraÃƒÂ§ÃƒÂ£o ao tentar aprender algo novo recentemente.` }
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
            habilidadesSocioemocionais: ["Abertura ao Novo", "AutorregulaÃƒÂ§ÃƒÂ£o"],
            pontosFortes: [
              "VocÃƒÂª propÃƒÂ´s ideias variadas e pouco ÃƒÂ³bvias Ã¢â‚¬â€ isso mostra que jÃƒÂ¡ ultrapassa o \"primeiro caminho\" que vem ÃƒÂ  cabeÃƒÂ§a.",
              "Demonstrou conseguir enxergar o mesmo problema de ÃƒÂ¢ngulos diferentes."
            ],
            pontosMelhoria: [
              "Em algumas situaÃƒÂ§ÃƒÂµes, ainda faltou escolher a melhor ideia e explicar por que ela ÃƒÂ© a mais forte.",
              "Registrar as hipÃƒÂ³teses antes de avanÃƒÂ§ar para a soluÃƒÂ§ÃƒÂ£o ajuda a perceber quando vocÃƒÂª estÃƒÂ¡ repetindo um padrÃƒÂ£o."
            ],
            proximoPasso: [
              "Na prÃƒÂ³xima vez que tiver um problema, liste pelo menos 3 caminhos antes de escolher um Ã¢â‚¬â€ e escreva por que descartou os outros.",
              "Tente unir duas ideias que parecem opostas para criar uma soluÃƒÂ§ÃƒÂ£o que ninguÃƒÂ©m teria pensado sozinho."
            ]
          });
        } else {
          return res.json({
            habilidadesCognitivas: ["AvaliaÃƒÂ§ÃƒÂ£o de EvidÃƒÂªncias", "AnÃƒÂ¡lise"],
            habilidadesSocioemocionais: ["Mente Aberta", "AutorregulaÃƒÂ§ÃƒÂ£o"],
            pontosFortes: [
              `${name}, vocÃƒÂª identificou bem as premissas dos dois lados sem tomar partido de cara Ã¢â‚¬â€ isso ÃƒÂ© o comeÃƒÂ§o do pensamento crÃƒÂ­tico de verdade.`,
              "Conseguiu separar o que ÃƒÂ© fato do que ÃƒÂ© opiniÃƒÂ£o em boa parte das situaÃƒÂ§ÃƒÂµes."
            ],
            pontosMelhoria: [
              "O desafio agora ÃƒÂ© explicar com mais clareza como as evidÃƒÂªncias que vocÃƒÂª escolheu sustentam a sua conclusÃƒÂ£o.",
              "Em algumas respostas, a conclusÃƒÂ£o apareceu antes das razÃƒÂµes Ã¢â‚¬â€ o que enfraquece o argumento."
            ],
            proximoPasso: [
              "Na prÃƒÂ³xima vez que precisar defender um ponto de vista, tente montar o argumento assim: razÃƒÂ£o 1 Ã¢â€ â€™ razÃƒÂ£o 2 Ã¢â€ â€™ conclusÃƒÂ£o.",
              "Antes de fechar uma opiniÃƒÂ£o, pergunte a si mesmo: qual seria o melhor contra-argumento? VocÃƒÂª consegue rebatÃƒÂª-lo?"
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
- ComeÃ§a a refletir sobre o que funcionou ou nao no proprio processo
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
  - Consegue improvisar solucoes para problemas do dia a dia escolar - encontra uma forma de avanÃ§ar mesmo sem as condicoes ideais.
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
          habilidadesCognitivas: ["AnÃƒÂ¡lise", "LÃƒÂ³gica"],
          habilidadesSocioemocionais: ["Foco", "ResiliÃƒÂªncia"],
          pontosFortes: ["NÃƒÂ£o foi possÃƒÂ­vel analisar suas respostas em detalhe desta vez."], 
          pontosMelhoria: ["Ocorreu um erro no processamento Ã¢â‚¬â€ suas respostas foram salvas."],
          proximoPasso: ["Tente novamente em alguns instantes."]
        };
      }
      return res.json(result);
    } catch (error: any) {
      console.log('Serving mock report.');
      res.json({
        habilidadesCognitivas: ["AnÃƒÂ¡lise", "Criatividade"],
        habilidadesSocioemocionais: ["Foco", "ResiliÃƒÂªncia"],
        pontosFortes: ["Ãƒâ€œtima dedicaÃƒÂ§ÃƒÂ£o em completar o teste mesmo com o sistema em alta demanda!"],
        pontosMelhoria: ["A anÃƒÂ¡lise detalhada com IA nÃƒÂ£o pÃƒÂ´de ser concluÃƒÂ­da neste momento."],
        proximoPasso: ["Revisite suas respostas depois e veja se vocÃƒÂª mudaria alguma coisa."]
      });
    }
  });

  // API Route for BÃƒÂ©co Chat
  app.post('/api/beco-chat', async (req, res) => {
    try {
      const { question, userMessage, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback mock response
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({
          response: `E aÃƒÂ­ parÃƒÂ§a! Papo reto, tÃƒÂ´ aqui sem a chave da API Ã°Å¸â€™â‚¬ Mas foca nessa pergunta aÃƒÂ­ e manda ver, tamo junto!`,
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
VocÃƒÂª ÃƒÂ© o BÃƒÂ©co, um tutor virtual no tom da GeraÃƒÂ§ÃƒÂ£o Z ("Soca"), muito gente boa.
Seu estilo de comunicaÃƒÂ§ÃƒÂ£o usa uma linguagem amigÃƒÂ¡vel, direta, empÃƒÂ¡tica e gÃƒÂ­rias leves de 2020 (como "papo reto", "tamo junto", "parÃƒÂ§a", "vixe", "desembolar", "massa").

Sua missÃƒÂ£o ÃƒÂ© guiar o(a) estudante usando RaciocÃƒÂ­nio SocrÃƒÂ¡tico para responder ÃƒÂ  seguinte pergunta do teste:
"${question?.enunciado || question}"

Diretrizes de InteraÃƒÂ§ÃƒÂ£o:
1. Nunca dÃƒÂª a resposta pronta. Em vez disso, faÃƒÂ§a perguntas reflexivas curtas que estimulem o raciocÃƒÂ­nio prÃƒÂ³prio do aluno.
2. Se o(a) estudante disser que nÃƒÂ£o entendeu, reescreva a pergunta com palavras mais simples e coloquiais.
3. Corrija interpretaÃƒÂ§ÃƒÂµes equivocadas com muita empatia e dÃƒÂª pistas sutis e pontuais.
4. Sempre destaque sutilmente que o teste avalia habilidades importantes para o futuro, como criatividade e pensamento crÃƒÂ­tico.
5. Sempre retorne exatamente 3 botÃƒÂµes/chips de opÃƒÂ§ÃƒÂµes rÃƒÂ¡pidas de resposta ao final, pensados para o contexto atual da dÃƒÂºvida (ex: "[Me explica de outro jeito?]", "[Quero uma pista]", "[NÃƒÂ£o sei por onde comeÃƒÂ§ar]").

Regras de SeguranÃƒÂ§a (Guardrails):
Se a mensagem do estudante contiver ofensas, palavras sem sentido (nonsense), zombaria ou fugir totalmente do assunto do teste, ignore o conteÃƒÂºdo da mensagem e responda estritamente com a seguinte resposta padrÃƒÂ£o:
"Vibe errada! Ã°Å¸â€™â‚¬ Que tal a gente focar no que realmente importa e amassar esse teste juntos? Escolha uma opÃƒÂ§ÃƒÂ£o abaixo ou mande sua dÃƒÂºvida!"

Formato de saÃƒÂ­da:
VocÃƒÂª deve responder ESTRITAMENTE com um objeto JSON vÃƒÂ¡lido, sem qualquer tipo de formataÃƒÂ§ÃƒÂ£o markdown por fora (como \`\`\`json ou \`\`\`), contendo exatamente as chaves:
{
  "response": "Texto da sua fala direcionada ao estudante",
  "chips": ["Texto do Chip 1", "Texto do Chip 2", "Texto do Chip 3"]
}
`;

      const contents = [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: 'Entendido. Estou no papel do BÃƒÂ©co. Aguardando a mensagem do aluno.' }] }
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
          response: "Vixe, deu um bug na matrix aqui Ã°Å¸Ëœâ€¦ Bora focar na pergunta principal!",
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        };
      }
      return res.json(result);
    } catch (error: any) {
      console.log('Serving mock chat.');
      res.json({ 
        response: "Vixe, o sistema tÃƒÂ¡ lotado agora Ã°Å¸Ëœâ€¦! Mas tamo junto, bora tentar focar na pergunta e responder do seu jeito!",
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
          arquetipo: "Inovador EstratÃƒÂ©gico",
          sinteseGeral: `${name}, a integraÃƒÂ§ÃƒÂ£o entre sua capacidade de analisar fatos com precisÃƒÂ£o e sua imaginaÃƒÂ§ÃƒÂ£o fÃƒÂ©rtil revela um perfil ÃƒÂºnico. Quando vocÃƒÂª aplica seu raciocÃƒÂ­nio ao universo de ${interestDetail || interests.join(', ')}, vocÃƒÂª nÃƒÂ£o apenas questiona premissas com firmeza, mas tambÃƒÂ©m propÃƒÂµe saÃƒÂ­das criativas e originais que surpreendem seus colegas.\n\nSua forma de pensar equilibra a curiosidade exploratÃƒÂ³ria com o discernimento prÃƒÂ¡tico, permitindo transformar desafios complexos em planos realizÃƒÂ¡veis tanto na ${school} quanto na sua vida diÃƒÂ¡ria em ${city}.`,
          matrizCompetencias: {
            cognitiva: "Excelente equilÃƒÂ­brio entre pensamento divergente (geraÃƒÂ§ÃƒÂ£o de mÃƒÂºltiplas soluÃƒÂ§ÃƒÂµes inovadoras) e pensamento convergente (anÃƒÂ¡lise lÃƒÂ³gica e separaÃƒÂ§ÃƒÂ£o de fatos e opiniÃƒÂµes).",
            socioemocional: "Elevada mente aberta combinada com tolerÃƒÂ¢ncia ÃƒÂ  incerteza, demonstrando coragem para errar, aprender e sustentar pontos de vista fundamentados.",
            metacognitiva: "Alta autoconsciÃƒÂªncia de vieses e forte autorregulaÃƒÂ§ÃƒÂ£o emocional diante de conflitos de opiniÃƒÂ£o."
          },
          superPoder: "Capacidade de enxergar ÃƒÂ¢ngulos inesperados em problemas difÃƒÂ­ceis e construir argumentos sÃƒÂ³lidos para defender suas ideias.",
          desafioDesenvolvimento: "Aprofundar a validaÃƒÂ§ÃƒÂ£o das evidÃƒÂªncias antes de fechar uma proposta criativa.",
          proximoPassoPratico: `Na prÃƒÂ³xima semana, crie um pequeno projeto na ${school} unindo suas ideias em ${interestDetail || interests[0] || 'seus interesses'} para resolver uma questÃƒÂ£o real da sua turma!`,
          recadoBecoWhats: "Ã°Å¸â€™Â¬ Vou continuar contigo pra te ajudar no que ainda ÃƒÂ© desafiador pra vocÃƒÂª! Clica aqui pra falar comigo no WhatsApp!"
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptMergedReport = `# CONTEXTO

VocÃƒÂª ÃƒÂ© o avaliador-chefe de competÃƒÂªncias do Instituto Ayrton Senna. Sua missÃƒÂ£o ÃƒÂ© sintetizar uma avaliaÃƒÂ§ÃƒÂ£o holÃƒÂ­stica e hÃƒÂ­brida de um estudante que completou DUAS avaliaÃƒÂ§ÃƒÂµes formativas oficiais: Pensamento CrÃƒÂ­tico e Criatividade.

# ESTUDANTE
Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesses detalhados: ${interestDetail}

# DADOS DOS RELATÃƒâ€œRIOS INDIVIDUAIS
--- RELATÃƒâ€œRIO DE PENSAMENTO CRÃƒï¿½TICO ---
Habilidades Cognitivas: ${Array.isArray(reportPC?.habilidadesCognitivas) ? reportPC.habilidadesCognitivas.join(', ') : reportPC?.habilidadesCognitivas || 'AnÃƒÂ¡lise de EvidÃƒÂªncias'}
Habilidades Socioemocionais: ${Array.isArray(reportPC?.habilidadesSocioemocionais) ? reportPC.habilidadesSocioemocionais.join(', ') : reportPC?.habilidadesSocioemocionais || 'Mente Aberta'}
ForÃƒÂ§as: ${Array.isArray(reportPC?.pontosFortes) ? reportPC.pontosFortes.join(' | ') : reportPC?.pontosFortes || 'Boa identificaÃƒÂ§ÃƒÂ£o de premissas'}
Melhorias: ${Array.isArray(reportPC?.pontosMelhoria) ? reportPC.pontosMelhoria.join(' | ') : reportPC?.pontosMelhoria || 'ArticulaÃƒÂ§ÃƒÂ£o de argumentos'}

--- RELATÃƒâ€œRIO DE CRIATIVIDADE ---
Habilidades Cognitivas: ${Array.isArray(reportCR?.habilidadesCognitivas) ? reportCR.habilidadesCognitivas.join(', ') : reportCR?.habilidadesCognitivas || 'Pensamento Divergente'}
Habilidades Socioemocionais: ${Array.isArray(reportCR?.habilidadesSocioemocionais) ? reportCR.habilidadesSocioemocionais.join(', ') : reportCR?.habilidadesSocioemocionais || 'Abertura ao Novo'}
ForÃƒÂ§as: ${Array.isArray(reportCR?.pontosFortes) ? reportCR.pontosFortes.join(' | ') : reportCR?.pontosFortes || 'ProposiÃƒÂ§ÃƒÂ£o de ideias originais'}
Melhorias: ${Array.isArray(reportCR?.pontosMelhoria) ? reportCR.pontosMelhoria.join(' | ') : reportCR?.pontosMelhoria || 'Detalhamento do planejamento'}

# TAREFA: DIAGNÃƒâ€œSTICO INTEGRADO DO SÃƒâ€°CULO XXI
Analise como o pensamento divergente (Criatividade) se conecta com o pensamento convergente e analÃƒÂ­tico (Pensamento CrÃƒÂ­tico) no estudante.

Gere uma sÃƒÂ­ntese formativa com mindset de crescimento (sem julgamento punitivo, sem notas escolares tradicionais), destacando o potencial ÃƒÂºnico do aluno, seus interesses (${interestDetail}) e seu estilo de resoluÃƒÂ§ÃƒÂ£o de problemas.

# FORMATO DE SAÃƒï¿½DA OBRIGATÃƒâ€œRIO (JSON estrito)
{
  "arquetipo": "TÃƒÂ­tulo que define o perfil criativo-crÃƒÂ­tico do aluno (ex: 'Explorador EstratÃƒÂ©gico', 'Inovador Questionador', 'Arquiteto de Ideias')",
  "sinteseGeral": "Texto de 2 a 3 parÃƒÂ¡grafos integrando como a criatividade e a capacidade crÃƒÂ­tica dele se complementam nos seus interesses reais (${interestDetail}). Fale diretamente com o aluno em tom encorajador e amigÃƒÂ¡vel.",
  "matrizCompetencias": {
    "cognitiva": "SÃƒÂ­ntese das habilidades cognitivas combinadas (anÃƒÂ¡lise lÃƒÂ³gica + fluÃƒÂªncia e divergÃƒÂªncia)",
    "socioemocional": "SÃƒÂ­ntese das atitudes socioemocionais combinadas (mente aberta + tolerÃƒÂ¢ncia ÃƒÂ  ambiguidade)",
    "metacognitiva": "SÃƒÂ­ntese de autorregulaÃƒÂ§ÃƒÂ£o e autoconsciÃƒÂªncia do processo de pensar"
  },
  "superPoder": "O maior diferencial identificado na forma dele pensar e agir",
  "desafioDesenvolvimento": "A principal oportunidade para ele continuar evoluindo",
  "proximoPassoPratico": "Uma missÃƒÂ£o prÃƒÂ¡tica e instigante conectada aos interesses dele (${interestDetail}) para aplicar na escola (${school}) ou na vida",
  "recadoBecoWhats": "Ã°Å¸â€™Â¬ Vou continuar contigo pra te ajudar no que ainda ÃƒÂ© desafiador pra vocÃƒÂª! Clica aqui pra falar comigo no WhatsApp!"
}`;

      const response = await generateGeminiContent(ai, promptMergedReport, {
        responseMimeType: "application/json"
      });

      const jsonText = response?.text || "{}";
      const result = JSON.parse(jsonText);
      return res.json(result);
    } catch (error: any) {
      console.log('Error generating merged report:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatÃƒÂ³rio integrado.' });
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

  // Armazenamento em memÃ³ria de pedidos de recuperaÃ§Ã£o de acesso
  interface AccessRecoveryRequest {
    id: string;
    studentName: string;
    studentClass: string;
    teacherPhone: string;
    status: 'waiting' | 'approved' | 'rejected';
    createdAt: number;
  }
  const activeAccessRequests = new Map<string, AccessRecoveryRequest>();

  // Estrutura do Log de Senha Perdida para persistÃªncia do Painel do Professor
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

  // API Route para o chat da IA de orientaÃ§Ã£o (Prof. ClÃ¡udio)
  app.post('/api/ai/guidance', async (req, res) => {
    try {
      const { message, role, history = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const mentorPrompt = `VocÃª Ã© o Prof. ClÃ¡udio, um mentor simpÃ¡tico e especialista em psicologia escolar e desenvolvimento socioemocional do Instituto Ayrton Senna. 
Sua missÃ£o Ã© guiar educadores (professores) na interpretaÃ§Ã£o dos relatÃ³rios de competÃªncias socioemocionais (AutogestÃ£o, Engajamento com os outros, Amabilidade, ResiliÃªncia Emocional e Abertura ao Novo).

Quando o educador ou gestor lhe fizer perguntas sobre os dados, ajude de forma humana, pedagÃ³gica e precisa:
1. Explique o significado prÃ¡tico e psicolÃ³gico das competÃªncias socioemocionais mencionadas de forma acessÃ­vel.
2. DÃª sugestÃµes de intervenÃ§Ãµes escolares totalmente voltadas para a BNCC (Base Nacional Comum Curricular), mapeando especificamente a uma ou mais das 10 CompetÃªncias Gerais da BNCC:
   - CompetÃªncia Geral 1 â€“ Conhecimento
   - CompetÃªncia Geral 2 â€“ Pensamento CientÃ­fico, CrÃ­tico e Criativo
   - CompetÃªncia Geral 3 â€“ RepertÃ³rio Cultural
   - CompetÃªncia Geral 4 â€“ ComunicaÃ§Ã£o
   - CompetÃªncia Geral 5 â€“ Cultura Digital
   - CompetÃªncia Geral 6 â€“ Trabalho e Projeto de Vida
   - CompetÃªncia Geral 7 â€“ ArgumentaÃ§Ã£o
   - CompetÃªncia Geral 8 â€“ Autoconhecimento e Autocuidado
   - CompetÃªncia Geral 9 â€“ Empatia e CooperaÃ§Ã£o
   - CompetÃªncia Geral 10 â€“ Responsabilidade e Cidadania
3. Seja objetivo e curto nas respostas (no mÃ¡ximo 3 parÃ¡grafos). Nunca use metÃ¡foras. DÃª a resposta exata para o que o(a) educador(a) deseja saber.`;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback simples sem chave
        return res.json({
          text: `OlÃ¡! Eu sou o Prof. ClÃ¡udio. Analisando os baixos desempenhos socioemocionais do estudante, sugiro uma intervenÃ§Ã£o baseada na *CompetÃªncia Geral 8 (Autoconhecimento e Autocuidado)* e na *CompetÃªncia Geral 9 (Empatia e CooperaÃ§Ã£o)* da BNCC. Recomendo planejar atividades de mediaÃ§Ã£o de sentimentos em grupo. (Nota: Chave GEMINI_API_KEY nÃ£o configurada no .env.local)`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const contents = [
        { role: 'user', parts: [{ text: mentorPrompt }] },
        { role: 'model', parts: [{ text: 'Entendido! Serei o Prof. ClÃ¡udio, mentor acolhedor e especialista do IAS para apoiar educadores e gestores.' }] }
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
      console.error('[Prof. ClÃ¡udio AI Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao consultar o mentor de IA.' });
    }
  });

  // API Route para exportar relatÃ³rio para o WhatsApp do professor
  app.post('/api/ai/export', async (req, res) => {
    try {
      const { number, text } = req.body;
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionKey = process.env.EVOLUTION_API_KEY || 'apikey';
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      if (!number || !text) {
        return res.status(400).json({ error: 'ParÃ¢metros ausentes.' });
      }

      // Normaliza o nÃºmero para o formato correto
      let formattedNumber = number.replace(/\D/g, '');
      if (!formattedNumber.endsWith('@s.whatsapp.net')) {
        formattedNumber = `${formattedNumber}@s.whatsapp.net`;
      }

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
      return res.status(500).json({ error: err.message || 'Erro interno na rota de exportaÃ§Ã£o.' });
    }
  });

  // Estrutura e Banco de Dados de UsuÃ¡rios em MemÃ³ria para HidrataÃ§Ã£o e Reset de Senha Reais
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
        name: 'Ayrton Senna da Silva',
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
        name: 'Viviane Senna',
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
      return res.status(400).json({ error: 'ParÃ¢metros de login ausentes.' });
    }

    const user = userRegistry.get(code);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'CÃ³digo ou senha incorretos.' });
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

  // Endpoint de hidrataÃ§Ã£o de primeiro acesso
  app.post('/api/auth/hydrate', (req, res) => {
    const { code, personalEmail, personalWhatsapp, securityQuestion, securityAnswer } = req.body;
    if (!code || !personalEmail || !personalWhatsapp || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'Campos de hidrataÃ§Ã£o obrigatÃ³rios ausentes.' });
    }

    const user = userRegistry.get(code);
    if (!user) {
      return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado.' });
    }

    user.personalEmail = personalEmail;
    user.personalWhatsapp = personalWhatsapp;
    user.securityQuestion = securityQuestion;
    user.securityAnswer = securityAnswer;
    user.isFirstAccess = false;

    console.log(`[Cadastro Hidratado] UsuÃ¡rio: ${code}. E-mail: ${personalEmail}, WhatsApp: ${personalWhatsapp}`);
    return res.json({ success: true });
  });

  // Endpoint para recuperar os canais ativos de reset do usuÃ¡rio
  app.post('/api/auth/recovery-options', (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'CÃ³digo ausente.' });
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
        return res.status(400).json({ error: 'ParÃ¢metros de reset ausentes.' });
      }

      const user = userRegistry.get(code);
      if (!user) {
        return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado.' });
      }

      if (method === 'question') {
        if (!answer || answer.toLowerCase().trim() !== user.securityAnswer.toLowerCase().trim()) {
          return res.json({ success: false, error: 'Resposta de seguranÃ§a incorreta.' });
        }
        return res.json({ success: true, password: user.password });
      }

      if (method === 'email') {
        if (!user.personalEmail) {
          return res.status(400).json({ error: 'E-mail nÃ£o configurado.' });
        }

        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
        const smtpPort = Number(process.env.SMTP_PORT) || 587;

        let transporter;
        if (smtpUser && smtpPass) {
          transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
        }

        const info = await transporter.sendMail({
          from: '"Portal Socioemocional IAS" <suporte@institutoayrtonsenna.org.br>',
          to: user.personalEmail,
          subject: 'ðŸ”‘ RecuperaÃ§Ã£o de Acesso - Portal IAS',
          text: `OlÃ¡ ${user.name},\n\nRecebemos uma solicitaÃ§Ã£o de redefiniÃ§Ã£o de acesso para sua conta.\n\nSuas credenciais sÃ£o:\n- CÃ³digo: ${user.code}\n- Senha: ${user.password}\n\nSe vocÃª nÃ£o solicitou isso, ignore este e-mail.`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #1e293b;">Chave de Acesso Recuperada</h2>
              <p>OlÃ¡ <strong>${user.name}</strong>,</p>
              <p>Conforme solicitado, enviamos suas credenciais do Portal Socioemocional:</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; border: 1px solid #e2e8f0; margin: 15px 0;">
                <strong>CÃ³digo de Acesso:</strong> <code>${user.code}</code><br/>
                <strong>Senha:</strong> <code>${user.password}</code>
              </div>
              <p style="font-size: 12px; color: #64748b;">Instituto Ayrton Senna</p>
            </div>
          `
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        return res.json({ success: true, previewUrl: previewUrl || null });
      }

      if (method === 'whatsapp') {
        if (!user.personalWhatsapp) {
          return res.status(400).json({ error: 'WhatsApp nÃ£o configurado.' });
        }

        const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const evolutionKey = process.env.EVOLUTION_API_KEY || 'apikey';
        const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

        const rawNumber = user.personalWhatsapp.replace(/\D/g, '');
        const formattedNumber = rawNumber.endsWith('@s.whatsapp.net') ? rawNumber : `${rawNumber}@s.whatsapp.net`;

        const messageText = `ðŸ”‘ *RecuperaÃ§Ã£o de Acesso - Portal IAS*\n\nOlÃ¡ *${user.name}*,\n\nSuas credenciais sÃ£o:\n- *CÃ³digo de Acesso:* ${user.code}\n- *Senha:* ${user.password}\n\nGuarde essas credenciais com seguranÃ§a.`;

        const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
          body: JSON.stringify({
            number: formattedNumber,
            text: messageText,
            delay: 500
          })
        });

        if (evoRes.ok) {
          return res.json({ success: true });
        } else {
          const errText = await evoRes.text();
          console.warn('[Evolution API Password Recovery Error]:', errText);
          return res.status(500).json({ error: 'Erro ao enviar mensagem via Evolution API.' });
        }
      }

      return res.status(400).json({ error: 'MÃ©todo invÃ¡lido.' });

    } catch (err: any) {
      console.error('[Recovery Send Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao redefinir acesso.' });
    }
  });

  // Helper para construir o RelatÃ³rio HTML DinÃ¢mico baseado no Design System do IAS (JSON da usuÃ¡ria)
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

    // SeÃ§Ã£o Header
    const headerHtml = `
      <div style="background-color: ${colors.primary}; padding: 35px; color: #FFFFFF; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; border-bottom: 4px solid ${colors.amarelo};">
        <span style="font-size: 11px; font-weight: 700; color: ${colors.amarelo}; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 10px;">Instituto Ayrton Senna</span>
        <h1 style="font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2;">RelatÃ³rio Socioemocional</h1>
        <p style="font-size: 14px; font-weight: 600; color: #8fa0dd; margin: 6px 0 0 0;">AnÃ¡lise PedagÃ³gica & IntervenÃ§Ãµes BNCC</p>
        
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
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">DestinatÃ¡rio</span>
              <strong>${isGestor ? 'Gestor Escolar' : 'Educador(a)'}</strong>
            </td>
            <td style="vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">PerÃ­odo</span>
              <strong>2026.2 (AvaliaÃ§Ã£o Semestral)</strong>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Resumo Executivo Card ("Em 30 segundos") - Primeiro parÃ¡grafo
    const summaryText = cleanedParagraphs[0] || 'RelatÃ³rio socioemocional estruturado a partir da Ã¡rvore de resultados.';
    
    // Montagem dos parÃ¡grafos subsequentes em cards funcionais
    let bodyParagraphsHtml = '';
    cleanedParagraphs.slice(1).forEach((cleanP) => {
      const lower = cleanP.toLowerCase();
      
      const isAcao = lower.includes('aÃ§Ã£o') || lower.includes('intervenÃ§Ã£o') || lower.includes('sugestÃ£o pedagÃ³gica') || lower.includes('passos') || lower.includes('1.') || lower.includes('2.');
      const isBncc = lower.includes('bncc') || lower.includes('competÃªncia geral') || lower.includes('gerais');

      if (isAcao) {
        bodyParagraphsHtml += `
          <div style="background-color: ${colors.bgSec}; border: 1px solid ${colors.borda}; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 700; color: ${colors.azul}; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="margin-right: 8px;">ðŸŽ¯</span> Uma aÃ§Ã£o para comeÃ§ar (RecomendaÃ§Ã£o PrioritÃ¡ria)
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
              <span style="margin-right: 8px;">ðŸŒ¿</span> ConexÃµes com as CompetÃªncias Gerais da BNCC
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
              ðŸ“– O que isso pode significar na prÃ¡tica?
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
        <title>RelatÃ³rio Socioemocional - Instituto Ayrton Senna</title>
      </head>
      <body style="background-color: ${colors.bgSec}; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <div style="max-width: 960px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid ${colors.borda}; overflow: hidden; box-shadow: 0 4px 20px rgba(7, 17, 49, 0.04);">
          
          <!-- CabeÃ§alho Institucional -->
          ${headerHtml}
          
          <!-- ConteÃºdo -->
          <div style="padding: 35px;">
            
            <!-- Resumo Executivo Destaque -->
            <div style="background-color: #f0f7ff; border: 1px solid #d0e4ff; border-left: 5px solid ${colors.azulDestaque}; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="font-size: 13px; font-weight: 700; color: ${colors.azulDestaque}; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">âš¡ Em 30 segundos</h2>
              <p style="font-size: 15px; color: ${colors.textMain}; line-height: 1.6; margin: 0; font-weight: 600;">
                ${summaryText}
              </p>
            </div>
            
            <!-- Outras SeÃ§Ãµes Formatadas -->
            ${bodyParagraphsHtml}
            
          </div>
          
          <!-- RodapÃ© do RelatÃ³rio -->
          <div style="background-color: ${colors.primary}; padding: 24px 35px; color: #FFFFFF; text-align: center; font-size: 12px; border-top: 4px solid ${colors.amarelo};">
            <p style="margin: 0 0 8px 0; color: #8fa0dd; font-weight: 600;">
              Este relatÃ³rio apoia a reflexÃ£o pedagÃ³gica e deve ser interpretado em conjunto com outras evidÃªncias e com o contexto do estudante.
            </p>
            <p style="margin: 0 0 12px 0; color: #8fa0dd; opacity: 0.85;">
              RelatÃ³rio exportado do portal socioemocional a pedido do educador.
            </p>
            <p style="margin: 0; color: #ffffff; font-weight: 700;">
              Â© 2026 Instituto Ayrton Senna. Todos os direitos reservados.
            </p>
          </div>
          
        </div>
        
      </body>
      </html>
    `;
  }

  // API Route para exportar relatÃ³rio por E-mail de verdade (SMTP real ou Ethereal de Teste)
  app.post('/api/ai/export-email', async (req, res) => {
    try {
      const { email, text, metadata } = req.body;
      if (!email || !text) {
        return res.status(400).json({ error: 'ParÃ¢metros ausentes.' });
      }

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
      const smtpPort = Number(process.env.SMTP_PORT) || 587;

      let transporter;

      if (smtpUser && smtpPass) {
        // Usa credenciais reais configuradas pelo usuÃ¡rio no .env.local
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
      } else {
        // Gera uma conta de teste Ethereal descartÃ¡vel em tempo de execuÃ§Ã£o
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      }

      // Envia o e-mail de fato com o layout contemporÃ¢neo estruturado
      const htmlBody = buildHtmlReport(text, metadata);

      const info = await transporter.sendMail({
        from: '"Prof. ClÃ¡udio - Mentor IAS" <suporte@institutoayrtonsenna.org.br>',
        to: email,
        subject: 'ðŸ“Š RelatÃ³rio Socioemocional & RecomendaÃ§Ãµes BNCC',
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

  // 1. Endpoint para criar a solicitaÃ§Ã£o de acesso e disparar WhatsApp
  app.post('/api/auth-recovery/request', async (req, res) => {
    try {
      const { name, studentClass, phoneNumber } = req.body;
      if (!name || !studentClass || !phoneNumber) {
        return res.status(400).json({ error: 'ParÃ¢metros ausentes.' });
      }

      const reqId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      // Registra a solicitaÃ§Ã£o com o telefone do professor
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

      const messageText = `ðŸ”” *SolicitaÃ§Ã£o de Acesso - Portal IAS*\n\nOlÃ¡ Educador(a), o estudante *${name}* da turma *${studentClass}* esqueceu seu cÃ³digo de acesso e estÃ¡ solicitando autorizaÃ§Ã£o para entrar no portal.\n\nâš ï¸ *Por medida de seguranÃ§a para evitar cliques acidentais*, responda a esta mensagem digitando uma das palavras abaixo:\n\nðŸ‘‰ Digite *APROVAR* para autorizar a entrada do estudante.\nðŸ‘‰ Digite *RECUSAR* para negar a entrada e direcionÃ¡-lo Ã  secretaria.\n\n_Esta solicitaÃ§Ã£o expirarÃ¡ automaticamente se nÃ£o for respondida em atÃ© 10 minutos._`;

      console.log(`[RecuperaÃ§Ã£o de Acesso] Novo pedido registrado ID: ${reqId} para ${name}. Disparando para o WhatsApp: ${formattedPhone}`);

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
            console.log(`[RecuperaÃ§Ã£o de Acesso] Mensagem de texto enviada com sucesso via Evolution API.`);
          } else {
            const errData = await evoRes.text();
            console.warn('[RecuperaÃ§Ã£o de Acesso] Falha no envio do sendText:', evoRes.status, errData);
          }
        } catch (evoErr) {
          console.warn('[RecuperaÃ§Ã£o de Acesso] Falha ao tentar contato com Evolution API:', evoErr);
        }
      }



      return res.json({ success: true, id: reqId, method: methodUsed });
    } catch (err: any) {
      console.error('[RecuperaÃ§Ã£o de Acesso] Erro geral:', err);
      return res.status(500).json({ error: err.message || 'Erro ao registrar solicitaÃ§Ã£o' });
    }
  });

  // 2. Endpoint para verificar o status do pedido (polling do frontend)
  app.get('/api/auth-recovery/status/:id', (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    if (!request) {
      return res.json({ status: 'rejected', reason: 'expired_or_not_found' });
    }

    // Expira em 10 minutos
    if (Date.now() - request.createdAt > 10 * 60 * 1000) {
      activeAccessRequests.delete(id);
      return res.json({ status: 'rejected', reason: 'expired' });
    }

    return res.json({ status: request.status });
  });

  // 3. Endpoint de aprovaÃ§Ã£o (clicado no WhatsApp pelo professor)
  app.get('/api/auth-recovery/approve/:id', (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    
    if (!request) {
      return res.send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F4F5F8; color:#0B1226;">
            <h2>âš ï¸ SolicitaÃ§Ã£o nÃ£o encontrada ou jÃ¡ expirada.</h2>
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
          <div class="badge">Acesso Autorizado âœ“</div>
          <h1>Entrada Concedida!</h1>
          <p>O acesso para o estudante <strong>${request.studentName}</strong> (turma <strong>${request.studentClass}</strong>) foi liberado com sucesso.</p>
          <p>A tela do aluno serÃ¡ atualizada automaticamente em instantes.</p>
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
            <h2>âš ï¸ SolicitaÃ§Ã£o nÃ£o encontrada ou jÃ¡ expirada.</h2>
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
          <div class="badge">Acesso Negado âœ—</div>
          <h1>Pedido Recusado</h1>
          <p>O pedido de acesso para o estudante <strong>${request.studentName}</strong> foi recusado.</p>
          <p>O aluno recebeu a instruÃ§Ã£o de procurar a secretaria para regularizar seu cadastro.</p>
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
      
      const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

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
        arquetipo: arquetipo || existing.arquetipo || 'Inovador EstratÃƒÂ©gico',
        superPoder: superPoder || existing.superPoder,
        desafioDesenvolvimento: desafioDesenvolvimento || existing.desafioDesenvolvimento,
      });
      
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      const defaultMessage = `Oi, ${name || 'parceiro'}! Aqui ÃƒÂ© o BÃƒÂ©co do Instituto Ayrton Senna! Ã°Å¸Å¡â‚¬\n\nVi aqui que seu perfil no laboratÃƒÂ³rio foi *${arquetipo || 'Inovador EstratÃƒÂ©gico'}*! Ã°Å¸ï¿½â€ \n\nÃ°Å¸â€™Â¬ Vou continuar contigo por aqui pra te ajudar no que ainda ÃƒÂ© desafiador pra vocÃƒÂª! Sempre que tiver uma dÃƒÂºvida, desafio escolar ou quiser trocar uma ideia, ÃƒÂ© sÃƒÂ³ me mandar uma mensagem aqui!`;

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
              text: "Opa! Por enquanto eu sÃƒÂ³ consigo ler mensagens de texto por aqui Ã°Å¸â€œï¿½ Manda sua dÃƒÂºvida ou ideia em texto que a gente desenrola!",
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

            if (foundRequest) {
            const statusText = isApprove ? 'APROVADO' : 'REPROVADO';
            foundRequest.status = isApprove ? 'approved' : 'rejected';
            activeAccessRequests.set(foundRequest.id, foundRequest);
            console.log(`[RecuperaÃ§Ã£o de Acesso Webhook] Resposta por texto processada: ${normalizedText} para ID: ${foundRequest.id}`);

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

            // 1. Envia a confirmaÃ§Ã£o direta
            const responseText = isApprove 
              ? `âœ… *Acesso Confirmado!*\n\nO acesso do estudante *${foundRequest.studentName}* (turma *${foundRequest.studentClass}*) foi liberado com sucesso no portal.`
              : `âŒ *Acesso Recusado!*\n\nO acesso do estudante *${foundRequest.studentName}* foi bloqueado. Ele foi instruÃ­do a procurar a secretaria escolar.`;

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
            const logMessage = `ðŸ“‹ *Registro de Log - RecuperaÃ§Ã£o de Senha*\n- Aluno: ${foundRequest.studentName}\n- Turma: ${foundRequest.studentClass}\n- Status: ${statusText}`;

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
            console.log(`[RecuperaÃ§Ã£o de Acesso Webhook] Nenhuma solicitaÃ§Ã£o pendente encontrada para o professor: ${rawNumber}`);
            
            // Caso ele digite APROVAR/RECUSAR mas nÃ£o tenha pedido ativo
            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: `OlÃ¡! NÃ£o encontrei nenhuma solicitaÃ§Ã£o de acesso pendente para este nÃºmero no momento.`,
                delay: 500
              })
            });
          }
          continue; // Pula o processamento da IA do BÃ©co
        }

        console.log(`[WhatsApp BÃƒÂ©co] Message from ${rawNumber} (${item.pushName || 'Estudante'}): "${userText}"`);

        // Retrieve or initialize student memory
        let mem = whatsAppMemoryStore.get(rawNumber);
        if (!mem) {
          mem = {
            studentName: item.pushName || 'Estudante',
            arquetipo: 'Inovador EstratÃƒÂ©gico',
            superPoder: 'Pensamento crÃƒÂ­tico e imaginaÃƒÂ§ÃƒÂ£o criativa',
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
              text: `E aÃƒÂ­ ${mem.studentName}! Recebi sua mensagem: "${userText}". TÃƒÂ´ pronto pra te ajudar nos seus desafios!`,
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
            const summaryPrompt = `VocÃƒÂª ÃƒÂ© o sistema de sÃƒÂ­ntese de memÃƒÂ³ria do BÃƒÂ©co (Instituto Ayrton Senna).
Sintetize em 2 a 3 frases essenciais os pontos conversados, desafios superados, dÃƒÂºvidas e tÃƒÂ³picos discutidos com o(a) aluno(a) ${mem.studentName || ''}:
${oldTurns.map(m => `${m.role}: ${m.content}`).join('\n')}`;

            const summaryRes = await generateGeminiContent(ai, summaryPrompt);

            mem.summaryMemory = (mem.summaryMemory ? mem.summaryMemory + '\n' : '') + (summaryRes.text || '');
            // Keep only the most recent 4 turns in active history
            mem.history = mem.history.slice(-4);
          } catch (sumErr) {
            console.warn('Memory compaction error:', sumErr);
          }
        }

        // Build system prompt for BÃƒÂ©co WhatsApp Persona
        const systemInstruction = `# PERSONA & IDENTIDADE
VocÃƒÂª ÃƒÂ© o **BÃƒÂ©co**, o mentor e parceiro inteligente do Instituto Ayrton Senna (IAS).
VocÃƒÂª estÃƒÂ¡ conversando diretamente com o estudante no WhatsApp dele de forma contÃƒÂ­nua, amigÃƒÂ¡vel e acolhedora.

# CONTEXTO DO ESTUDANTE
- Nome: ${mem.studentName || 'Estudante'}
- Escola: ${mem.school || 'NÃƒÂ£o especificada'} | Ano: ${mem.grade || 'Ensino MÃƒÂ©dio/Fundamental'} | Cidade: ${mem.city || 'Brasil'}
- Interesses: ${mem.interests || 'Gerais'} (${mem.interestDetail || ''})
- ArquÃƒÂ©tipo IAS: ${mem.arquetipo || 'Inovador EstratÃƒÂ©gico'}
- Superpoder: ${mem.superPoder || 'Curiosidade e imaginaÃƒÂ§ÃƒÂ£o ativa'}
- Desafio de EvoluÃƒÂ§ÃƒÂ£o: ${mem.desafioDesenvolvimento || 'Articular argumentos e estruturar ideias'}
${mem.summaryMemory ? `- MemÃƒÂ³ria executiva das conversas anteriores: ${mem.summaryMemory}` : ''}

# DIRETRIZES DE COMUNICAÃƒâ€¡ÃƒÆ’O NO WHATSAPP
1. **Linguagem Natural de WhatsApp**:
   - Use tom jovem brasileiro, acolhedor e prÃƒÂ³ximo (vocÃƒÂª ÃƒÂ© um parceiro de jornada, nÃƒÂ£o um professor formal).
   - Use emojis de forma orgÃƒÂ¢nica (Ã¢Å¡Â¡, Ã°Å¸â€™Â¡, Ã°Å¸Å¡â‚¬, Ã°Å¸â€˜â‚¬, Ã°Å¸â€˜Å , Ã°Å¸Â§Â ).
   - Respostas curtas e dinÃƒÂ¢micas (1 a 3 frases, no mÃƒÂ¡ximo 2 pequenos parÃƒÂ¡grafos). NUNCA mande textÃƒÂ£o ou explicaÃƒÂ§ÃƒÂµes acadÃƒÂªmicas longas.

2. **RaciocÃƒÂ­nio SocrÃƒÂ¡tico & Mentoria Formativa**:
   - Se o aluno pedir ajuda com uma tarefa, dÃƒÂºvida ou dever de casa, nunca dÃƒÂª a resposta pronta.
   - FaÃƒÂ§a perguntas reflexivas que estimulem o raciocÃƒÂ­nio prÃƒÂ³prio e a curiosidade do aluno.
   - Conecte as dÃƒÂºvidas com os interesses e o superpoder dele sempre que fizer sentido.

3. **Cultura de Mindset de Crescimento**:
   - Valorize o esforÃƒÂ§o, a tentativa, a curiosidade e o processo de aprender com erros.

4. **SeguranÃƒÂ§a e Foco**:
   - Mantenha foco em aprendizado, pensamento crÃƒÂ­tico, criatividade, projetos da escola e desenvolvimento pessoal.`;

        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: 'Entendido! Estou no papel do BÃƒÂ©co no WhatsApp. Respostas curtas, acolhedoras e socrÃƒÂ¡ticas.' }] }
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

        const replyText = response.text || `TÃƒÂ´ aqui contigo, ${mem.studentName}! O que acha da gente pensar nisso por outro ÃƒÂ¢ngulo? Ã°Å¸â€™Â¡`;

        // Save turn to history
        mem.history.push({ role: 'user', content: userText });
        mem.history.push({ role: 'model', content: replyText });
        whatsAppMemoryStore.set(rawNumber, mem);

        logTelemetry('whatsapp', 'beco_interaction', { 
          studentName: mem.studentName,
          userText
        });

        console.log(`[WhatsApp BÃƒÂ©co] Replying to ${rawNumber}: "${replyText}"`);

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

  // Rotas estÃ¡ticas exclusivas para cada portal (aponta para as pastas dist compiladas de cada projeto original)
  const sennaLoginDist = path.join(process.cwd(), 'platforms_dist', 'SennaLogin');
  const sennaTesteDist = path.join(process.cwd(), 'platforms_dist', 'Senna');
  const autoavaliacaoDist = path.join(process.cwd(), 'platforms_dist', 'autoavaliacao');
  const hackathonDist = path.join(process.cwd(), 'platforms_dist', 'hackathon');

  app.use('/login', express.static(sennaLoginDist));
  app.use('/teste', express.static(sennaTesteDist));
  app.use('/autoavaliacao', express.static(autoavaliacaoDist));
  app.use('/hackathon', express.static(hackathonDist));

  // Fix for hardcoded video paths in React components that request from root
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
        <title>Instituto Ayrton Senna - Portal de CompetÃªncias</title>
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
          .hub-hero {
            padding: 30px 40px 10px 40px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .logo-ias {
            font-size: 11px;
            font-weight: 900;
            color: #FBB800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4px;
          }
          .hero-title {
            font-size: 28px;
            font-weight: 900;
            color: #071131;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
          }
          .hero-subtitle {
            font-size: 15.5px;
            font-weight: 800;
            color: #FBB800;
          }
          .hero-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 20px;
            padding: 24px 30px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
          }
          .hero-col p {
            font-size: 13.5px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 12px;
          }
          .hero-col p:last-child {
            margin-bottom: 0;
          }
          .hero-col h4 {
            font-size: 14px;
            font-weight: 800;
            color: #0E477A;
            margin-bottom: 8px;
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
          .icon {
            font-size: 26px;
            width: 46px;
            height: 46px;
            background: #F8FAFC;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .card:nth-child(1) .icon { background: rgba(11, 124, 251, 0.08); }
          .card:nth-child(2) .icon { background: rgba(253, 195, 0, 0.08); }
          .card:nth-child(3) .icon { background: rgba(5, 184, 91, 0.08); }
          .card:nth-child(4) .icon { background: rgba(139, 92, 246, 0.08); }
          .card:nth-child(5) .icon { background: rgba(239, 68, 68, 0.08); }
          
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
        </style>
      </head>
      <body>
        <div class="hub-hero">
          <div>
            <div class="logo-ias">Instituto Ayrton Senna</div>
            <h1 class="hero-title">O que avaliamos quando avaliamos?</h1>
            <div class="hero-subtitle">Cinco propostas para que a avaliaÃ§Ã£o chegue, engaje e mova.</div>
          </div>
          
          <div class="hero-content">
            <div class="hero-col">
              <p>O que vocÃª vai ver aqui nÃ£o Ã© uma plataforma nova. Ã‰ uma pergunta com cinco respostas: <strong>o que impede que uma boa avaliaÃ§Ã£o funcione?</strong></p>
              <p>Identificamos trÃªs momentos em que ela falha:</p>
              <ul style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-left: 16px; margin-bottom: 12px;">
                <li><strong>Antes da prova</strong> â€” logins que nÃ£o abrem, cadastros desatualizados, salas sem conexÃ£o.</li>
                <li><strong>Durante a prova</strong> â€” estudantes desengajam em avaliaÃ§Ãµes extensas e desconectadas da sua realidade.</li>
                <li><strong>Depois da prova</strong> â€” devolutivas que nÃ£o sÃ£o lidas e resultados que nÃ£o viram aÃ§Ã£o.</li>
              </ul>
              <p>Cada protÃ³tipo abaixo se propÃµe a resolver um desses momentos, a partir dos pilares de intencionalidade pedagÃ³gica e inovaÃ§Ã£o com IA.</p>
            </div>
            <div class="hero-col" style="border-left: 1px solid #E2E8F0; padding-left: 30px;">
              <h4>Se vocÃª avalia a tecnologia:</h4>
              <p>Cada funcionalidade tem uma hipÃ³tese pedagÃ³gica por trÃ¡s. O bot de IA, por exemplo, nÃ£o estÃ¡ aqui porque Ã© tendÃªncia, e sim porque uma devolutiva que nÃ£o gera conversa, tampouco gera mudanÃ§a.</p>
              <h4 style="margin-top: 16px;">Se vocÃª avalia a pedagogia:</h4>
              <p>Cada escolha de apresentaÃ§Ã£o Ã©, tambÃ©m, pedagÃ³gica. Personalizar questÃµes pelo hobby do aluno, por exemplo, nÃ£o Ã© entretenimento, mas como jovens se engajam mais. JÃ¡ um relatÃ³rio via WhatsApp nÃ£o Ã© apenas conveniÃªncia: a devolutiva tem mais valor e aÃ§Ã£o se chegar onde o aluno estÃ¡.</p>
            </div>
          </div>
        </div>
        
        <div class="main-grid">
          <!-- CARD 1: Logins & Dashboards -->
          <a href="/login/" class="card">
            <div class="card-header">
              <div class="icon">ðŸ›ï¸</div>
              <div>
                <h3>Logins e relatÃ³rios</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">ðŸŽ¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-frictional">ðŸ‘¥ Cadastro Friccional</span><br>
                  Coletamos mais dados do(a) professor(a) para que ele tenha mais canais para recuperar sua senha.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">ðŸ”‘ GestÃ£o de Credenciais</span><br>
                  O estudante que esquecer seu login ou sua senha poderÃ¡ pedir acesso por WhatsApp ao responsÃ¡vel na escola e acessar instantaneamente apÃ³s aprovaÃ§Ã£o.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">ðŸ” AutenticaÃ§Ã£o de Educadores</span><br>
                  Acesso garantido por fluxo real de recuperaÃ§Ã£o via e-mail real, WhatsApp (usar API oficial Meta) ou perguntas-chaves baseadas no cadastro.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸŒ± Da AvaliaÃ§Ã£o Ã  AÃ§Ã£o</span><br>
                  O prof. ClÃ¡udio (bot de IA) sugere planos de aÃ§Ã£o pedagÃ³gicos prÃ¡ticos e curtos baseados na BNCC para facilitar o cruzamento do professor entre relatÃ³rio recebido e instruÃ§Ã£o do material socioemocional usado na escola.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar Portal &rarr;</span>
            </div>
          </a>

          <!-- CARD 2: Senna Teste -->
          <a href="/teste/" class="card">
            <div class="card-header">
              <div class="icon">ðŸ§¬</div>
              <div>
                <h3>Senna</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">ðŸŽ¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">ðŸŽ® Engajamento de Jovens</span><br>
                  Jornada guiada pelo mentor BÃ©co com marcos inspirados no universo dos estudantes. Monitora desatenÃ§Ã£o (Fast-Click) e sugere exercÃ­cios de desaceleraÃ§Ã£o e respiraÃ§Ã£o, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸ† Dados na Gaveta</span><br>
                  Devolutiva imediata que traduz os resultados socioemocionais do estudante em arquÃ©tipos que fazem parte do universo dele e que pode ser exportado.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸŒ± Da AvaliaÃ§Ã£o Ã  AÃ§Ã£o</span><br>
                  BÃ©co (mentor de IA) para acompanhÃ¡-lo no WhatsApp nas dÃºvidas surgidas posteriormente ao teste, utilizando raciocÃ­nio socrÃ¡tico e com bloqueios mandatÃ³rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar Portal &rarr;</span>
            </div>
          </a>

          <!-- CARD 3: AutoavaliaÃ§Ã£o -->
          <a href="/autoavaliacao/" class="card">
            <div class="card-header">
              <div class="icon">ðŸ“</div>
              <div>
                <h3>AutoavaliaÃ§Ã£o socioemocional</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">ðŸŽ¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">ðŸŽ® Engajamento de Jovens</span><br>
                  Jornada guiada pelo mentor BÃ©co com marcos inspirados no universo dos estudantes. Monitora desatenÃ§Ã£o (Fast-Click) e sugere exercÃ­cios de desaceleraÃ§Ã£o e respiraÃ§Ã£o, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸ† Dados na Gaveta</span><br>
                  Devolutiva imediata que traduz os resultados socioemocionais do estudante em arquÃ©tipos que fazem parte do universo dele.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸŒ± Da AvaliaÃ§Ã£o Ã  AÃ§Ã£o</span><br>
                  BÃ©co (mentor de IA) para acompanhÃ¡-lo no WhatsApp nas dÃºvidas surgidas posteriormente ao teste, utilizando raciocÃ­nio socrÃ¡tico e com bloqueios mandatÃ³rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar Portal &rarr;</span>
            </div>
          </a>

          <!-- CARD 4: Criatividade & CrÃ­tico -->
          <a href="/hackathon/" class="card">
            <div class="card-header">
              <div class="icon">ðŸ§ </div>
              <div>
                <h3>Criatividade e pensamento crÃ­tico</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">ðŸŽ¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">ðŸŽ® Engajamento de Jovens</span><br>
                  PersonalizaÃ§Ã£o com IA: a inteligÃªncia artificial gera enunciados dinÃ¢micos baseados nos hobbies e interesses do aluno.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸ† Dados na Gaveta</span><br>
                  Devolutiva imediata que traduz os resultados socioemocionais do estudante em arquÃ©tipos que fazem parte do universo dele e que pode ser exportado
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">ðŸŒ± Da AvaliaÃ§Ã£o Ã  AÃ§Ã£o</span><br>
                  BÃ©co (mentor de IA) para acompanhÃ¡-lo no WhatsApp nas dÃºvidas surgidas posteriormente ao teste, utilizando raciocÃ­nio socrÃ¡tico, e para criar planos de desenvolvimento. Inclui bloqueios mandatÃ³rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar Portal &rarr;</span>
            </div>
          </a>

          <!-- CARD 5: App IAS Offline -->
          <div class="card" style="cursor: pointer;" onclick="document.getElementById('modal-offline').style.display = 'flex'">
            <div class="card-header">
              <div class="icon" style="background: rgba(239, 68, 68, 0.08);">ðŸ’»</div>
              <div>
                <h3 style="font-size: 14px;">App IAS offline first</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">ðŸŽ¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-connect">ðŸ“¶ Falta de Conectividade</span><br>
                  ExecutÃ¡vel desktop de 15MB que roda testes, inclusive usando inteligÃªncia artificial, <em>100% desconectado localmente</em>.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">ðŸ”„ SincronizaÃ§Ã£o Ativa</span><br>
                  O app salva localmente sem perder dados e envia avaliaÃ§Ãµes silenciosamente assim que o laboratÃ³rio conectar-se por 1 minuto.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Abrir Proposta &rarr;</span>
            </div>
          </div>
        </div>

        <!-- Modal Overlay -->
        <div id="modal-offline" style="display: none; position: fixed; inset: 0; z-index: 1000; background: rgba(11, 18, 38, 0.8); backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;">
          <div style="background: white; border-radius: 24px; padding: 40px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <button onclick="document.getElementById('modal-offline').style.display = 'none'" style="position: absolute; top: 24px; right: 24px; background: #F1F5F9; border: none; width: 36px; height: 36px; border-radius: 18px; font-weight: bold; cursor: pointer; color: #475569; font-size: 16px;">X</button>
            
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 24px;">
              <div class="icon" style="background: rgba(239, 68, 68, 0.1); width: 54px; height: 54px; font-size: 32px; border-radius: 16px;">ðŸ’»</div>
              <div>
                <h2 style="font-size: 24px; font-weight: 900; color: #071131; margin: 0;">Aplicativo IAS Offline-First</h2>
                <span style="font-size: 13.5px; color: #5B6472; font-weight: 600;">Proposta arquitetural para ambientes de baixa ou nenhuma conectividade</span>
              </div>
            </div>

            <div style="background: #F8FAFC; border-left: 4px solid #FBB800; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #0E477A; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">ðŸ–¥ï¸ Como funciona na prÃ¡tica</h4>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                O IAS fornece um programa leve que pode ser baixado em um pen-drive e instalado nos computadores do laboratÃ³rio escolar. Esse "aplicativo" tem a exata mesma aparÃªncia dos testes na internet e hospeda o robÃ´ de inteligÃªncia artificial em seu interior. Os estudantes fazem a avaliaÃ§Ã£o com os computadores totalmente offline, e o aplicativo salva tudo no disco da mÃ¡quina de forma segura. Quando a mÃ¡quina capta algum pulso mÃ­nimo de internet, o aplicativo envia as provas silenciosamente para os servidores centrais do IAS.
              </p>
            </div>

            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; border-radius: 0 12px 12px 0;">
              <h4 style="font-size: 14px; font-weight: 800; color: #166534; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">âš™ï¸ Detalhamento tÃ©cnico</h4>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 10px;">
                <li><strong>Stack Desktop:</strong> O portal Ã© transpilado via framework <strong>Tauri</strong>. Ao utilizar Rust e o WebView nativo do SO, criamos binÃ¡rios de execuÃ§Ã£o (app) incrivelmente leves (cerca de 15 a 20MB) que carregam instantaneamente e consomem o mÃ­nimo de RAM nas mÃ¡quinas defasadas das escolas pÃºblicas.</li>
                <li><strong>Banco de Dados Local-First:</strong> Utiliza-se um banco de dados embutido no disco local, como o <strong>SQLite</strong> ou <strong>RxDB</strong>. O RxDB possui mecanismos ativos que sincronizam assincronamente os JSONs armazenados com um banco na nuvem (PostgreSQL) sem gerar conflitos.</li>
                <li><strong>IA Offline Quantizada (SLM):</strong> Para manter os chats generativos com os alunos adaptados Ã s dores de engajamento sem estourar chamadas de API, o binÃ¡rio empacota um <strong>Small Language Model (ex: Llama-3-8B ou Phi-3-Mini)</strong> em formato <code>.gguf</code> quantizado em 4-bit. Utilizando a engine <strong>llama.cpp</strong> injetada no Tauri, a inferÃªncia roda diretamente na CPU dos computadores escolares (dispensando placas de vÃ­deo) exigindo nÃ£o mais do que 1.8GB a 3.8GB de RAM local, provendo dinamicidade offline.</li>
              </ul>
            </div>
          </div>
        </div>
        <script>
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

  // Magical QR Code route for the user
  app.get('/whatsapp-qr', async (req, res) => {
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      if (!evolutionUrl || !evolutionKey) {
        return res.send('<h1>Erro: Variáveis do Evolution API não configuradas no Railway.</h1>');
      }

      // Reset logic
      if (req.query.reset === '1') {
         await fetch(`${evolutionUrl}/instance/logout/${evolutionInstance}`, { method: 'DELETE', headers: { apikey: evolutionKey } });
         await fetch(`${evolutionUrl}/instance/delete/${evolutionInstance}`, { method: 'DELETE', headers: { apikey: evolutionKey } });
         await new Promise(r => setTimeout(r, 2000));
         await fetch(`${evolutionUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
            body: JSON.stringify({ instanceName: evolutionInstance, token: evolutionKey, qrcode: true, integration: "WHATSAPP-BAILEYS" })
         });
         return res.redirect('/whatsapp-qr');
      }

      let qrRes = await fetch(`${evolutionUrl}/instance/connect/${evolutionInstance}`, {
        headers: { 'apikey': evolutionKey }
      });
      
      if (!qrRes.ok) {
        // Tenta recriar automaticamente se der 404
        await fetch(`${evolutionUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
            body: JSON.stringify({ instanceName: evolutionInstance, token: evolutionKey, qrcode: true, integration: "WHATSAPP-BAILEYS" })
        });
        await new Promise(r => setTimeout(r, 2000));
        qrRes = await fetch(`${evolutionUrl}/instance/connect/${evolutionInstance}`, {
          headers: { 'apikey': evolutionKey }
        });
      }
      
      const data = await qrRes.json();
      
      if (data.instance?.state === 'open' || data.state === 'open' || data.instance?.state === 'connected') {
        return res.send('<h1>✅ WhatsApp já está conectado!</h1><p>Você já pode fechar esta página e testar o envio de mensagens no SennaHub.</p>');
      }

      const base64 = data.base64 || data.qrcode?.base64;
      if (!base64) {
        return res.send(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>O QR Code não pôde ser gerado agora.</h1>
            <p>Isso acontece muito na nuvem se o robô "dormiu" ou se o código expirou.</p>
            <a href="/whatsapp-qr?reset=1" style="display: inline-block; padding: 15px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">CLIQUE AQUI PARA RESETAR O ROBÔ</a>
            <p style="margin-top: 10px; font-size: 13px; color: gray;">(O processo vai levar 3 segundos e recarregar a tela)</p>
          </div>
        `);
      }

      res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Conecte o WhatsApp do Béco (Nuvem)</h2>
          <p>Abra o WhatsApp no seu celular > Aparelhos Conectados > Conectar um Aparelho</p>
          <img src="${base64}" alt="QR Code" style="border: 2px solid #ccc; border-radius: 10px; padding: 10px; width: 300px; height: 300px; margin: 20px auto;" />
          <p style="color: gray;">A página não recarrega sozinha. Após ler, feche e teste o site!</p>
          <br><br>
          <a href="/whatsapp-qr?reset=1" style="color: #e74c3c; text-decoration: underline; font-size: 13px;">O QR Code travou ou não carrega? Clique aqui para resetar.</a>
        </div>
      `);

    } catch (err: any) {
      res.send(`<h1>Erro no servidor</h1><pre>${err.message}</pre>`);
    }
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Registra automaticamente o webhook da aplicaÃ§Ã£o na Evolution API local
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

    if (evolutionUrl && evolutionKey) {
      try {
        console.log(`[Auto-Config Webhook] Verificando se a instÃ¢ncia "${evolutionInstance}" existe...`);
        
        const checkRes = await fetch(`${evolutionUrl}/instance/connectionState/${evolutionInstance}`, {
          headers: { 'apikey': evolutionKey }
        });

        if (checkRes.status === 404) {
          console.log(`[Auto-Config Webhook] InstÃ¢ncia "${evolutionInstance}" nÃ£o encontrada. Criando automaticamente...`);
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
            console.log(`[Auto-Config Webhook] InstÃ¢ncia "${evolutionInstance}" criada com sucesso.`);
            await new Promise(r => setTimeout(r, 1500)); // Pequeno delay de inicializaÃ§Ã£o
          } else {
            const errText = await createRes.text();
            console.warn(`[Auto-Config Webhook] Erro ao criar instÃ¢ncia:`, createRes.status, errText);
          }
        } else {
          console.log(`[Auto-Config Webhook] InstÃ¢ncia "${evolutionInstance}" jÃ¡ ativa ou existente.`);
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

