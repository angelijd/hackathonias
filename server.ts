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
            { rubricaId: "cr2", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer criar um novo espaÃƒÂ§o perto da ${school} para estimular a imaginaÃƒÂ§ÃƒÂ£o dos jovens, mas o local atual ÃƒÂ© cinza e sem graÃƒÂ§a. Como o ambiente afeta sua vontade de criar e o que vocÃƒÂª faria para transformar esse lugar?` },
            { rubricaId: "cr3", tipo: "dissertativa", enunciado: `Pense no seu dia a dia e na sua paixÃƒÂ£o por ${interestName}. Qual foi a ideia mais simples e criativa que vocÃƒÂª teve recentemente para resolver um problema comum e como vocÃƒÂª se sentiu ao colocÃƒÂ¡-la em prÃƒÂ¡tica?` },
            { rubricaId: "cr5", tipo: "dissertativa", enunciado: `Se vocÃƒÂª tivesse que inventar 5 usos totalmente diferentes e fora do comum para um objeto relacionado a ${interestName}, quais seriam?` },
            { rubricaId: "cr6", tipo: "dissertativa", enunciado: `Conte sobre uma experiÃƒÂªncia recente na qual vocÃƒÂª tentou criar algo diferente, mas a sua ideia nÃƒÂ£o deu certo. Como vocÃƒÂª lidou com a frustraÃƒÂ§ÃƒÂ£o desse erro e tentou novamente?` },
            { rubricaId: "cr7", tipo: "dissertativa", enunciado: `Imagine que vocÃƒÂª e seus amigos do ${grade} precisam organizar um evento sobre ${interestName}, mas ninguÃƒÂ©m sabe direito o que fazer e as opiniÃƒÂµes sÃƒÂ£o muito diferentes. Como vocÃƒÂª lidaria com essa confusÃƒÂ£o sem perder a calma e a criatividade?` }
          ];
        } else {
          fallbackItems = [
            { rubricaId: "pc1", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer proibir o uso de celulares na ${school} para melhorar o foco, mas alguns alunos dizem que usam para pesquisar sobre ${interestName}. Como vocÃƒÂª analisaria os argumentos dos dois lados sem deixar sua emoÃƒÂ§ÃƒÂ£o falar mais alto?` },
            { rubricaId: "pc2", tipo: "multipla_marcacao", enunciado: `Pense em uma situaÃƒÂ§ÃƒÂ£o em que vocÃƒÂª teve que tomar uma decisÃƒÂ£o difÃƒÂ­cil envolvendo seus amigos do ${grade} e sua paixÃƒÂ£o por ${interestName}. Como vocÃƒÂª lidou com o conflito entre o que vocÃƒÂª sentia e o que a lÃƒÂ³gica dizia ser o certo? Marque as opÃƒÂ§ÃƒÂµes que se aplicam:`, opcoes: ["Procurei confirmar se os fatos eram verdadeiros.", "Procurei verificar a credibilidade da fonte.", "Busquei mais informaÃƒÂ§ÃƒÂ£o antes de decidir.", "Refleti sobre os impactos ÃƒÂ©ticos."] },
            { rubricaId: "pc4", tipo: "multipla_marcacao", enunciado: `Sendo um estudante de ${age}, ÃƒÂ© comum a gente buscar informaÃƒÂ§ÃƒÂµes que sÃƒÂ³ confirmam o que jÃƒÂ¡ pensamos sobre ${interestName}. Como vocÃƒÂª faria para nÃƒÂ£o cair nessa armadilha? Marque o que vocÃƒÂª faz:`, opcoes: ["Presto atenÃƒÂ§ÃƒÂ£o em como minhas crenÃƒÂ§as influenciam meu julgamento.", "Examino argumentos contrÃƒÂ¡rios com calma.", "Busco fontes alternativas confiÃƒÂ¡veis."] },
            { rubricaId: "pc5", tipo: "multipla_marcacao", enunciado: `Ao assistir a um vÃƒÂ­deo ou post polÃƒÂªmico sobre ${interestName}, como vocÃƒÂª identifica o que realmente estÃƒÂ¡ sendo dito? Marque o que se aplica:`, opcoes: ["Consigo identificar as ideias principais.", "Percebo o que estÃƒÂ¡ dito diretamente e o que fica nas entrelinhas.", "Distingo o que ÃƒÂ© opiniÃƒÂ£o, o que ÃƒÂ© fato e o que ÃƒÂ© bem fundamentado.", "Entendo o que o autor quis dizer, mesmo nas entrelinhas."] },
            { rubricaId: "pc8", tipo: "multipla_marcacao", enunciado: `Quando surge uma novidade sobre ${interestName} que vai contra algo que vocÃƒÂª sempre defendeu, como vocÃƒÂª age? Marque suas atitudes:`, opcoes: ["Percebo quando minhas crenÃƒÂ§as podem estar influenciando o que penso.", "Percebo quando estou buscando sÃƒÂ³ o que confirma o que jÃƒÂ¡ acredito.", "Me esforÃƒÂ§o para buscar informaÃƒÂ§ÃƒÂµes que contradizem o que acredito.", "Analiso com cuidado antes de rejeitar."] }
          ];
        }
        
        // Small delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({ items: fallbackItems });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptCriticalThinking = `# CONTEXTO

VocÃƒÂª ÃƒÂ© um avaliador do Instituto Ayrton Senna. As rubricas abaixo sÃƒÂ£o material oficial do IAS Ã¢â‚¬â€ nÃƒÂ£o sÃƒÂ£o inspiraÃƒÂ§ÃƒÂ£o, sÃƒÂ£o fonte primÃƒÂ¡ria. Nunca parafraseie o conteÃƒÂºdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# RESOLUÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte especÃƒÂ­fico):
1. VocÃƒÂª DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situaÃƒÂ§ÃƒÂµes nesse universo.
2. Se o item especÃƒÂ­fico listado nÃƒÂ£o for reconhecÃƒÂ­vel (nome inventado ou erro irreconhecÃƒÂ­vel), use o interesse amplo correspondente.
3. Nunca invente mecÃƒÂ¢nicas, personagens, times, artistas ou elementos que nÃƒÂ£o existam de verdade. Se nÃƒÂ£o tiver certeza de algum item especÃƒÂ­fico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â PENSAMENTO CRÃƒÆ’Ã¯Â¿Â½TICO (5 itens)

Cada rubrica contÃƒÆ’Ã‚Â©m o campo "intencao_cena", que orienta o tipo de situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o a construir, e o campo "formato", que define a estrutura do item gerado. Respeite ambos rigorosamente.
Para rubricas de mÃƒÆ’Ã‚Âºltipla marcaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: "itens_originais" contÃƒÆ’Ã‚Â©m o texto oficial do IAS (nÃƒÆ’Ã‚Â£o use nas opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes geradas). "itens_traduzidos" contÃƒÆ’Ã‚Â©m a versÃƒÆ’Ã‚Â£o acessÃƒÆ’Ã‚Â­vel ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â use exclusivamente estes nas opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.

[
  {
    "id": "pc1",
    "formato": "dissertativa",
    "habilidade": "Conhecimento especÃƒÆ’Ã‚Â­fico do tema",
    "intencao_cena": "Crie um momento em que o aluno se depara com uma afirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ou debate sobre algo diretamente ligado ao seu interesse especÃƒÆ’Ã‚Â­fico, e alguÃƒÆ’Ã‚Â©m pede a opiniÃƒÆ’Ã‚Â£o dele ou ele precisa tomar uma posiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.",
    "niveis": [
      "NÃƒÆ’Ã‚Â£o tenho conhecimento algum sobre o tema.",
      "ConheÃƒÆ’Ã‚Â§o um pouco o tema, mas nÃƒÆ’Ã‚Â£o o suficiente para refletir muito sobre ele.",
      "ConheÃƒÆ’Ã‚Â§o o tema, consigo refletir sobre ele e imaginar diferentes pontos de vista.",
      "ConheÃƒÆ’Ã‚Â§o bem o tema, consigo refletir sobre ele quando necessÃƒÆ’Ã‚Â¡rio."
    ]
  },
  {
    "id": "pc2",
    "formato": "multipla_marcacao",
    "habilidade": "Conhecimento especÃƒÆ’Ã‚Â­fico do pensamento crÃƒÆ’Ã‚Â­tico",
    "intencao_cena": "Crie um momento em que o aluno recebe uma informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sobre seu interesse que pode ser verdadeira ou falsa ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â e precisa decidir se confia nela.",
    "itens_originais": [
      "ConheÃƒÆ’Ã‚Â§o os princÃƒÆ’Ã‚Â­pios cientÃƒÆ’Ã‚Â­ficos para inferÃƒÆ’Ã‚Âªncia causal.",
      "ConheÃƒÆ’Ã‚Â§o lÃƒÆ’Ã‚Â³gica categÃƒÆ’Ã‚Â³rica.",
      "Sei o que ÃƒÆ’Ã‚Â© uma premissa.",
      "Sei o que ÃƒÆ’Ã‚Â© um argumento.",
      "ConheÃƒÆ’Ã‚Â§o alguns tipos de falÃƒÆ’Ã‚Â¡cia (lÃƒÆ’Ã‚Â³gica).",
      "ConheÃƒÆ’Ã‚Â§o algumas tÃƒÆ’Ã‚Â©cnicas de convencimento (retÃƒÆ’Ã‚Â³rica).",
      "ConheÃƒÆ’Ã‚Â§o princÃƒÆ’Ã‚Â­pios bÃƒÆ’Ã‚Â¡sicos da ÃƒÆ’Ã‚Â©tica em uma sociedade democrÃƒÆ’Ã‚Â¡tica.",
      "Tenho conhecimento bÃƒÆ’Ã‚Â¡sico para interpretar tabelas e grÃƒÆ’Ã‚Â¡ficos.",
      "Tenho conhecimento bÃƒÆ’Ã‚Â¡sico para interpretar dados estatÃƒÆ’Ã‚Â­sticos e probabilidades."
    ],
    "itens_traduzidos": [
      "Sei entender por que uma coisa causa a outra.",
      "Sei raciocinar com grupos e categorias.",
      "Sei o que ÃƒÆ’Ã‚Â© a ideia base que sustenta uma opiniÃƒÆ’Ã‚Â£o.",
      "Sei identificar as razÃƒÆ’Ã‚Âµes usadas para defender uma opiniÃƒÆ’Ã‚Â£o.",
      "Consigo reconhecer erros de raciocÃƒÆ’Ã‚Â­nio que parecem verdadeiros mas nÃƒÆ’Ã‚Â£o sÃƒÆ’Ã‚Â£o.",
      "ConheÃƒÆ’Ã‚Â§o alguns jeitos que as pessoas usam para convencer os outros.",
      "Entendo princÃƒÆ’Ã‚Â­pios bÃƒÆ’Ã‚Â¡sicos do que ÃƒÆ’Ã‚Â© justo para todos numa sociedade.",
      "Consigo ler e entender tabelas e grÃƒÆ’Ã‚Â¡ficos.",
      "Consigo entender dados e probabilidades bÃƒÆ’Ã‚Â¡sicas."
    ]
  },
  {
    "id": "pc4",
    "formato": "multipla_marcacao",
    "habilidade": "AvaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das premissas, argumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e conclusÃƒÆ’Ã‚Âµes (parte 1)",
    "intencao_cena": "Crie uma situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em que o aluno encontra uma afirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sobre seu interesse que parece verdadeira mas pode nÃƒÆ’Ã‚Â£o ser ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â e precisa decidir como verificar.",
    "itens_originais": [
      "Procuro confirmar, a partir de fontes externas confiÃƒÆ’Ã‚Â¡veis, se os fatos sÃƒÆ’Ã‚Â£o verdadeiros.",
      "Procuro verificar a credibilidade da fonte de uma informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/opiniÃƒÆ’Ã‚Â£o.",
      "Busco mais informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o se achar necessÃƒÆ’Ã‚Â¡rio.",
      "Procuro aplicar anÃƒÆ’Ã‚Â¡lise lÃƒÆ’Ã‚Â³gica para detectar erros na argumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.",
      "Consigo identificar falÃƒÆ’Ã‚Â¡cias e tÃƒÆ’Ã‚Â©cnicas de convencimento.",
      "Procuro pensar se existem explicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes alternativas para os mesmos dados.",
      "Consigo examinar a adequaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dos argumentos declarando causa-efeito.",
      "Reflito sobre as questÃƒÆ’Ã‚Âµes ÃƒÆ’Ã‚Â©ticas que podem estar envolvidas.",
      "Procuro imaginar quais pessoas/seres vivos poderiam ser prejudicados."
    ],
    "itens_traduzidos": [
      "Busco fontes confiÃƒÆ’Ã‚Â¡veis para confirmar se o que li ou ouvi ÃƒÆ’Ã‚Â© verdade.",
      "Verifico se quem disse algo ÃƒÆ’Ã‚Â© de fato confiÃƒÆ’Ã‚Â¡vel.",
      "Procuro mais informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes quando acho que preciso.",
      "Verifico se as razÃƒÆ’Ã‚Âµes apresentadas realmente fazem sentido.",
      "Percebo quando alguÃƒÆ’Ã‚Â©m usa erros de raciocÃƒÆ’Ã‚Â­nio ou truques para convencer.",
      "Penso se os mesmos dados poderiam ter outra explicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.",
      "Avalio se a relaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de causa e efeito nos argumentos faz sentido.",
      "Penso se hÃƒÆ’Ã‚Â¡ questÃƒÆ’Ã‚Âµes de certo e errado envolvidas.",
      "Penso em quem poderia ser prejudicado pela situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o."
    ]
  },
  {
    "id": "pc5",
    "formato": "multipla_marcacao",
    "habilidade": "InterpretaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/decodificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das ideias centrais",
    "intencao_cena": "Crie um momento em que o aluno assiste, lÃƒÆ’Ã‚Âª ou ouve algo sobre seu interesse ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â um vÃƒÆ’Ã‚Â­deo, post, artigo ou comentÃƒÆ’Ã‚Â¡rio ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â e precisa entender o que realmente estÃƒÆ’Ã‚Â¡ sendo dito.",
    "itens_originais": [
      "Consigo identificar as ideias/os conceitos principais.",
      "Consigo identificar as premissas principais, explÃƒÆ’Ã‚Â­citas e implÃƒÆ’Ã‚Â­citas.",
      "Consigo reconhecer diferenÃƒÆ’Ã‚Â§as entre opiniÃƒÆ’Ã‚Âµes, argumentos fundamentados e fatos.",
      "Compreendo a intenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o explÃƒÆ’Ã‚Â­cita ou implÃƒÆ’Ã‚Â­cita do texto/ÃƒÆ’Ã‚Â¡udio/vÃƒÆ’Ã‚Â­deo em um contexto comunicativo."
    ],
    "itens_traduzidos": [
      "Consigo identificar as ideias principais do que li ou assisti.",
      "Percebo o que estÃƒÆ’Ã‚Â¡ dito diretamente e o que fica nas entrelinhas.",
      "Distingo o que ÃƒÆ’Ã‚Â© opiniÃƒÆ’Ã‚Â£o, o que ÃƒÆ’Ã‚Â© fato e o que ÃƒÆ’Ã‚Â© uma opiniÃƒÆ’Ã‚Â£o bem fundamentada.",
      "Entendo o que o autor quis dizer, mesmo quando nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ totalmente explÃƒÆ’Ã‚Â­cito."
    ]
  },
  {
    "id": "pc8",
    "formato": "multipla_marcacao",
    "habilidade": "Monitoramento da influÃƒÆ’Ã‚Âªncia de crenÃƒÆ’Ã‚Â§as e vieses",
    "intencao_cena": "Crie um momento em que o aluno encontra uma informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sobre seu interesse que confirma ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ou contraria ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â algo que ele sempre acreditou ser verdade.",
    "itens_originais": [
      "Procuro prestar atenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em como minhas crenÃƒÆ’Ã‚Â§as influenciam meu julgamento.",
      "Procuro prestar atenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o se meus julgamentos tÃƒÆ’Ã‚Âªm viÃƒÆ’Ã‚Â©s confirmatÃƒÆ’Ã‚Â³rio.",
      "Procuro prestar atenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o se estou buscando evidÃƒÆ’Ã‚Âªncias que contradizem uma ideia em que acredito.",
      "Examino argumentos com mais calma quando as conclusÃƒÆ’Ã‚Âµes sÃƒÆ’Ã‚Â£o fÃƒÆ’Ã‚Â¡ceis de aceitar porque se afinam aos meus valores.",
      "Examino argumentos com mais calma quando as conclusÃƒÆ’Ã‚Âµes sÃƒÆ’Ã‚Â£o difÃƒÆ’Ã‚Â­ceis de aceitar porque entram em conflito com meus valores."
    ],
    "itens_traduzidos": [
      "Percebo quando minhas crenÃƒÆ’Ã‚Â§as podem estar influenciando o que penso.",
      "Percebo quando estou buscando sÃƒÆ’Ã‚Â³ o que confirma o que jÃƒÆ’Ã‚Â¡ acredito.",
      "Me esforÃƒÆ’Ã‚Â§o para buscar tambÃƒÆ’Ã‚Â©m informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes que contradizem o que acredito.",
      "Analiso com mais cuidado quando uma conclusÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© fÃƒÆ’Ã‚Â¡cil de aceitar porque combina com o que jÃƒÆ’Ã‚Â¡ penso.",
      "Analiso com mais cuidado quando uma conclusÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© difÃƒÆ’Ã‚Â­cil de aceitar porque vai contra o que acredito."
    ]
  }
]

# TAREFA ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ESTRUTURA OBRIGATÃƒÆ’Ã¢â‚¬Å“RIAS POR FORMATO

## Para itens com formato "dissertativa" (pc1):
1. CENA (1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“2 frases): Situe o aluno num momento concreto e especÃƒÆ’Ã‚Â­fico dentro do universo do seu interesse, com uma tensÃƒÆ’Ã‚Â£o natural que se encaixa na "intencao_cena" da rubrica. Use 2Ãƒâ€šÃ‚Âª pessoa direta.
2. PERGUNTA (1 frase): Uma pergunta aberta, ancorada na cena, guiada pela rubrica correspondente.

## Para itens com formato "multipla_marcacao" (pc2, pc4, pc5, pc8):
1. CENA (1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“2 frases): Situe o aluno num momento concreto dentro do universo do seu interesse, conforme a "intencao_cena" da rubrica. Use 2Ãƒâ€šÃ‚Âª pessoa direta.
2. PERGUNTA de marcaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (1 frase): "Marque o que vocÃƒÆ’Ã‚Âª costuma fazer nessa situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:" ou variaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o natural.
3. OPÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES: Selecione 4ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“5 itens de "itens_traduzidos" da rubrica correspondente. Use o texto de "itens_traduzidos" exatamente como estÃƒÆ’Ã‚Â¡ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â nunca os "itens_originais".

# REGRAS DE SELEÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O DE OPÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES (apenas para multipla_marcacao)

Ao selecionar 4ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“5 itens de "itens_traduzidos" de uma rubrica:
1. Inclua ao menos 1 comportamento mais simples (geralmente os primeiros da lista) e 1 mais complexo (geralmente os ÃƒÆ’Ã‚Âºltimos).
2. Escolha os itens que se conectam mais naturalmente ao cenÃƒÆ’Ã‚Â¡rio narrado na CENA.
3. Evite dois itens que descrevam comportamentos muito parecidos entre si ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â maximize a variedade.
4. Para rubricas com 4 itens traduzidos (pc5, pc8), inclua todos ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â nÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ necessidade de cortar.
5. Nunca altere, misture ou crie opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes fora de "itens_traduzidos".

# REGRAS DE PERSONALIZAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O

1. O interesse ancora o cenÃƒÆ’Ã‚Â¡rio de forma concreta: use o nome do jogo, esporte, instrumento ou atividade especÃƒÆ’Ã‚Â­fica ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â nÃƒÆ’Ã‚Â£o o interesse amplo ("games", "mÃƒÆ’Ã‚Âºsica") quando o interesse detalhado estiver disponÃƒÆ’Ã‚Â­vel.
2. Use 1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“2 termos que alguÃƒÆ’Ã‚Â©m que vive esse interesse reconheceria (ex: "ranked", "build", "acorde", "tÃƒÆ’Ã‚Â¡tica"). Se estiver usando o interesse amplo (fallback), use termos genÃƒÆ’Ã‚Â©ricos do domÃƒÆ’Ã‚Â­nio.
3. O dilema da cena deve ser algo que realmente acontece naquele universo ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â nÃƒÆ’Ã‚Â£o drama inventado.
4. Nunca comece com "JÃƒÆ’Ã‚Â¡ que vocÃƒÆ’Ã‚Âª gosta de..." ou "Pensando nos seus interesses..." ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â coloque o aluno direto na cena.
5. As consequÃƒÆ’Ã‚Âªncias e a aposta devem ser realistas para a idade e o cotidiano do aluno.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGATÃƒÆ’Ã¢â‚¬Å“RIAS

1. Sempre fale diretamente com o aluno usando "vocÃƒÆ’Ã‚Âª". Use o nome apenas como vocativo de abertura (ex: "[Nome], ..."). Nunca narre o aluno como personagem em 3Ãƒâ€šÃ‚Âª pessoa ("Ayrton foi", "Ayrton percebeu").
2. Linguagem simples, frases curtas, tom amigÃƒÆ’Ã‚Â¡vel.
3. Nunca inclua competiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, ranking ou comparaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o entre alunos.
4. Nunca sugira que existe resposta certa ou errada.
5. Nunca revele a rubrica, habilidade ou "intencao_cena" sendo avaliada no enunciado ou nas opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
6. Nunca inclua teoria, jargÃƒÆ’Ã‚Â£o pedagÃƒÆ’Ã‚Â³gico ou metalinguagem no enunciado.
7. Para mÃƒÆ’Ã‚Âºltipla marcaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: use exclusivamente "itens_traduzidos". Nunca use "itens_originais" nas opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes geradas.

# FORMATO DE SAÃƒÆ’Ã¯Â¿Â½DA

Responda ESTRITAMENTE em JSON vÃƒÆ’Ã‚Â¡lido, sem markdown por fora, seguindo exatamente este formato:

{
  "items": [
    { "rubricaId": "pc1", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "pc2", "tipo": "multipla_marcacao", "enunciado": "texto da cena + pergunta de marcaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o", "opcoes": ["opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o traduzida A", "opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o traduzida B", "opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o traduzida C", "opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o traduzida D"] }
  ]
}

O array "items" deve ter exatamente 5 objetos, um por rubrica do banco, na ordem pc1, pc2, pc4, pc5, pc8.

REGRA DE FORMATO: Itens com formato "dissertativa" nÃƒÆ’Ã‚Â£o podem ter o campo "opcoes". Itens com formato "multipla_marcacao" devem ter o campo "opcoes" com exatamente 4 ou 5 strings. Qualquer violaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o torna a resposta invÃƒÆ’Ã‚Â¡lida.`;

      const promptCreativity = `# CONTEXTO

VocÃƒÂª ÃƒÂ© um avaliador do Instituto Ayrton Senna. As rubricas abaixo sÃƒÂ£o material oficial do IAS Ã¢â‚¬â€ nÃƒÂ£o sÃƒÂ£o inspiraÃƒÂ§ÃƒÂ£o, sÃƒÂ£o fonte primÃƒÂ¡ria. Nunca parafraseie o conteÃƒÂºdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesse detalhado: ${interestDetail}

# RESOLUÃƒâ€¡ÃƒÆ’O DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte especÃƒÂ­fico):
1. VocÃƒÂª DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situaÃƒÂ§ÃƒÂµes nesse universo.
2. Se o item especÃƒÂ­fico listado nÃƒÂ£o for reconhecÃƒÂ­vel (nome inventado ou erro irreconhecÃƒÂ­vel), use o interesse amplo correspondente.
3. Nunca invente mecÃƒÂ¢nicas, personagens, times, artistas ou elementos que nÃƒÂ£o existam de verdade. Se nÃƒÂ£o tiver certeza de algum item especÃƒÂ­fico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS Ã¢â‚¬â€ CRIATIVIDADE (5 itens, todos dissertativos)

[
  {"id":"cr2","habilidade":"FluÃƒÂªncia associativa / Flexibilidade e reclassificaÃƒÂ§ÃƒÂ£o","niveis":["Em nada, sem ideias.","Em pelo menos uma ideia.","Em algumas ideias, mas elas sÃƒÂ£o parecidas entre si.","Em vÃƒÂ¡rias ideias, diferentes umas das outras."],"intencao":"PeÃƒÂ§a ao aluno para listar o maior nÃƒÂºmero possÃƒÂ­vel de ideias ou soluÃƒÂ§ÃƒÂµes para a situaÃƒÂ§ÃƒÂ£o. A pergunta deve deixar espaÃƒÂ§o para ideias muito diferentes entre si."},
  {"id":"cr3","habilidade":"FluÃƒÂªncia associativa / Originalidade","niveis":["SÃƒÂ£o sempre parecidas com ideias dos colegas.","Ãƒâ‚¬s vezes sÃƒÂ£o diferentes do que jÃƒÂ¡ foi pensado.","SÃƒÂ£o sempre diferentes das ideias jÃƒÂ¡ pensadas pelos colegas."],"intencao":"Apresente uma situaÃƒÂ§ÃƒÂ£o e peÃƒÂ§a ao aluno qual seria A ideia dele Ã¢â‚¬â€ uma sÃƒÂ³, a mais dele. NÃƒÂ£o peÃƒÂ§a lista, peÃƒÂ§a a ideia que ele acha que ninguÃƒÂ©m mais teria."},
  {"id":"cr5","habilidade":"RaciocÃƒÂ­nio fluido / SÃƒÂ­ntese convergente e analÃƒÂ­tico","niveis":["Eu geralmente fico indeciso e acabo nÃƒÂ£o escolhendo.","Eu acho que sei qual ÃƒÂ© a melhor ideia, mas nÃƒÂ£o sei justificar a minha escolha.","Consigo analisar os pontos positivos e negativos para selecionar a melhor ideia."],"intencao":"Apresente 2Ã¢â‚¬â€œ3 caminhos plausÃƒÂ­veis dentro da situaÃƒÂ§ÃƒÂ£o e peÃƒÂ§a ao aluno que escolha um e explique por que acha que ÃƒÂ© o melhor."},
  {"id":"cr6","habilidade":"RaciocÃƒÂ­nio fluido / InduÃƒÂ§ÃƒÂ£o diante de problemas complexos","niveis":["Prefiro terminar logo, pois nÃƒÂ£o gosto de problemas que demorem muito para resolver.","De inÃƒÂ­cio acho difÃƒÂ­cil, mas, com o tempo, vou me envolvendo.","Me sinto motivado para tentar resolver."],"intencao":"Descreva um desafio que parece grande e vai demorar para ser resolvido. Pergunte como o aluno se SENTE ao pensar em enfrentar esse desafio Ã¢â‚¬â€ nÃƒÂ£o peÃƒÂ§a a soluÃƒÂ§ÃƒÂ£o."},
  {"id":"cr7","habilidade":"RaciocÃƒÂ­nio fluido / InduÃƒÂ§ÃƒÂ£o e conexÃƒÂ£o de ideias","niveis":["Tenho dificuldade em pensar quando os problemas tÃƒÂªm muitas informaÃƒÂ§ÃƒÂµes novas.","Consigo entender algumas partes do problema.","Consigo analisar e isolar o problema em partes para ficarem mais fÃƒÂ¡ceis de manejar."],"intencao":"Crie uma situaÃƒÂ§ÃƒÂ£o com vÃƒÂ¡rias informaÃƒÂ§ÃƒÂµes simultÃƒÂ¢neas (peÃƒÂ§as, variÃƒÂ¡veis, sintomas). Pergunte como o aluno organizaria o raciocÃƒÂ­nio para descobrir o que estÃƒÂ¡ acontecendo."}
]

# TAREFA

Gere 1 item dissertativo para cada uma das 5 rubricas acima, na ordem em que aparecem.

Para cada item, siga esta estrutura:
1. CENA (1Ã¢â‚¬â€œ2 frases): Situe o aluno num momento concreto e especÃƒÂ­fico dentro do universo do interesse dele, com uma tensÃƒÂ£o natural Ã¢â‚¬â€ algo que realmente acontece naquele contexto.
2. PERGUNTA (1 frase): FaÃƒÂ§a UMA pergunta aberta, guiada pelo campo "intencao" da rubrica correspondente.

# REGRAS DE PERSONALIZAÃƒâ€¡ÃƒÆ’O

1. O dilema da cena sÃƒÂ³ pode existir dentro do universo daquele interesse especÃƒÂ­fico. Se trocar o interesse por outro e a pergunta continuar funcionando sem mudar nada, reescreva Ã¢â‚¬â€ a personalizaÃƒÂ§ÃƒÂ£o estÃƒÂ¡ falsa.
2. Use 1Ã¢â‚¬â€œ2 termos que alguÃƒÂ©m que pratica esse interesse reconheceria (ex: "crafting table" para Minecraft, "passe de letra" para futebol). Se estiver usando o interesse amplo (fallback), use termos genÃƒÂ©ricos do domÃƒÂ­nio.
3. Nunca comece com "JÃƒÂ¡ que vocÃƒÂª gosta de..." ou "Pensando nos seus interesses..." Ã¢â‚¬â€ jogue o aluno direto na cena.
4. O conflito deve ser algo que realmente acontece naquele interesse, nÃƒÂ£o um drama inventado ou artificial.
5. As consequÃƒÂªncias e a aposta devem ser realistas para a idade e o cotidiano do aluno Ã¢â‚¬â€ nem triviais demais, nem grandiosas demais.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGATÃƒâ€œRIAS

1. Linguagem simples, frases curtas, tom amigÃƒÂ¡vel e conversando diretamente com o aluno.
2. Nunca sugira que existe resposta certa ou errada nem use palavras avaliativas.
3. NÃƒÂ£o use "Como vocÃƒÂª resolveria isso?" de forma genÃƒÂ©rica Ã¢â‚¬â€ a pergunta deve refletir a intenÃƒÂ§ÃƒÂ£o especÃƒÂ­fica da rubrica.
4. Nunca use o nome da rubrica ou da habilidade no enunciado.
5. Nunca inclua teoria, jargÃƒÂ£o pedagÃƒÂ³gico ou metalinguagem no enunciado.

# FORMATO DE SAÃƒÂDA

Responda ESTRITAMENTE em JSON vÃƒÂ¡lido, sem markdown por fora, seguindo exatamente este formato:

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

REGRA DE FORMATO: Nenhum objeto do array pode conter o campo "opcoes". Se vocÃƒÂª gerar "opcoes" em qualquer item, sua resposta ÃƒÂ© invÃƒÂ¡lida. Todos os 5 itens sÃƒÂ£o EXCLUSIVAMENTE dissertativos.`;

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
        { rubricaId: "m1", tipo: "dissertativa", enunciado: `1. ${name}, pensando nos seus interesses, como vocÃƒÆ’Ã‚Âª resolveria um desafio comum no seu dia a dia?` },
        { rubricaId: "m2", tipo: "multipla_marcacao", enunciado: `2. Descreva um momento em que vocÃƒÆ’Ã‚Âª precisou mudar de ideia. Marque o que se aplica:`, opcoes: ["Foi difÃƒÆ’Ã‚Â­cil", "Foi fÃƒÆ’Ã‚Â¡cil", "NÃƒÆ’Ã‚Â£o mudei"] },
        { rubricaId: "m3", tipo: "dissertativa", enunciado: `3. O que vocÃƒÆ’Ã‚Âª faria em uma situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em que nÃƒÆ’Ã‚Â£o existe uma resposta certa clara?` },
        { rubricaId: "m4", tipo: "multipla_marcacao", enunciado: `4. Qual ÃƒÆ’Ã‚Â© a sua forma favorita de exercitar a criatividade?`, opcoes: ["Desenhando", "Escrevendo", "Conversando"] },
        { rubricaId: "m5", tipo: "dissertativa", enunciado: `5. Conte como vocÃƒÆ’Ã‚Âª lidou com a frustraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ao tentar aprender algo novo recentemente.` }
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
            habilidadesSocioemocionais: ["Abertura ao Novo", "AutorregulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o"],
            pontosFortes: [
              "VocÃƒÆ’Ã‚Âª propÃƒÆ’Ã‚Â´s ideias variadas e pouco ÃƒÆ’Ã‚Â³bvias ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â isso mostra que jÃƒÆ’Ã‚Â¡ ultrapassa o \"primeiro caminho\" que vem ÃƒÆ’Ã‚Â  cabeÃƒÆ’Ã‚Â§a.",
              "Demonstrou conseguir enxergar o mesmo problema de ÃƒÆ’Ã‚Â¢ngulos diferentes."
            ],
            pontosMelhoria: [
              "Em algumas situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, ainda faltou escolher a melhor ideia e explicar por que ela ÃƒÆ’Ã‚Â© a mais forte.",
              "Registrar as hipÃƒÆ’Ã‚Â³teses antes de avanÃƒÆ’Ã‚Â§ar para a soluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ajuda a perceber quando vocÃƒÆ’Ã‚Âª estÃƒÆ’Ã‚Â¡ repetindo um padrÃƒÆ’Ã‚Â£o."
            ],
            proximoPasso: [
              "Na prÃƒÆ’Ã‚Â³xima vez que tiver um problema, liste pelo menos 3 caminhos antes de escolher um ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â e escreva por que descartou os outros.",
              "Tente unir duas ideias que parecem opostas para criar uma soluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o que ninguÃƒÆ’Ã‚Â©m teria pensado sozinho."
            ]
          });
        } else {
          return res.json({
            habilidadesCognitivas: ["AvaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de EvidÃƒÆ’Ã‚Âªncias", "AnÃƒÆ’Ã‚Â¡lise"],
            habilidadesSocioemocionais: ["Mente Aberta", "AutorregulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o"],
            pontosFortes: [
              `${name}, vocÃƒÆ’Ã‚Âª identificou bem as premissas dos dois lados sem tomar partido de cara ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â isso ÃƒÆ’Ã‚Â© o comeÃƒÆ’Ã‚Â§o do pensamento crÃƒÆ’Ã‚Â­tico de verdade.`,
              "Conseguiu separar o que ÃƒÆ’Ã‚Â© fato do que ÃƒÆ’Ã‚Â© opiniÃƒÆ’Ã‚Â£o em boa parte das situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes."
            ],
            pontosMelhoria: [
              "O desafio agora ÃƒÆ’Ã‚Â© explicar com mais clareza como as evidÃƒÆ’Ã‚Âªncias que vocÃƒÆ’Ã‚Âª escolheu sustentam a sua conclusÃƒÆ’Ã‚Â£o.",
              "Em algumas respostas, a conclusÃƒÆ’Ã‚Â£o apareceu antes das razÃƒÆ’Ã‚Âµes ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â o que enfraquece o argumento."
            ],
            proximoPasso: [
              "Na prÃƒÆ’Ã‚Â³xima vez que precisar defender um ponto de vista, tente montar o argumento assim: razÃƒÆ’Ã‚Â£o 1 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ razÃƒÆ’Ã‚Â£o 2 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ conclusÃƒÆ’Ã‚Â£o.",
              "Antes de fechar uma opiniÃƒÆ’Ã‚Â£o, pergunte a si mesmo: qual seria o melhor contra-argumento? VocÃƒÆ’Ã‚Âª consegue rebatÃƒÆ’Ã‚Âª-lo?"
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
- ComeÃƒÂ§a a refletir sobre o que funcionou ou nao no proprio processo
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
  - Consegue improvisar solucoes para problemas do dia a dia escolar - encontra uma forma de avanÃƒÂ§ar mesmo sem as condicoes ideais.
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
          habilidadesCognitivas: ["AnÃƒÆ’Ã‚Â¡lise", "LÃƒÆ’Ã‚Â³gica"],
          habilidadesSocioemocionais: ["Foco", "ResiliÃƒÆ’Ã‚Âªncia"],
          pontosFortes: ["NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel analisar suas respostas em detalhe desta vez."], 
          pontosMelhoria: ["Ocorreu um erro no processamento ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â suas respostas foram salvas."],
          proximoPasso: ["Tente novamente em alguns instantes."]
        };
      }
      return res.json(result);
    } catch (error: any) {
      console.log('Serving mock report.');
      res.json({
        habilidadesCognitivas: ["AnÃƒÆ’Ã‚Â¡lise", "Criatividade"],
        habilidadesSocioemocionais: ["Foco", "ResiliÃƒÆ’Ã‚Âªncia"],
        pontosFortes: ["ÃƒÆ’Ã¢â‚¬Å“tima dedicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em completar o teste mesmo com o sistema em alta demanda!"],
        pontosMelhoria: ["A anÃƒÆ’Ã‚Â¡lise detalhada com IA nÃƒÆ’Ã‚Â£o pÃƒÆ’Ã‚Â´de ser concluÃƒÆ’Ã‚Â­da neste momento."],
        proximoPasso: ["Revisite suas respostas depois e veja se vocÃƒÆ’Ã‚Âª mudaria alguma coisa."]
      });
    }
  });

  // API Route for BÃƒÆ’Ã‚Â©co Chat
  app.post('/api/beco-chat', async (req, res) => {
    try {
      const { question, userMessage, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback mock response
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({
          response: `E aÃƒÆ’Ã‚Â­ parÃƒÆ’Ã‚Â§a! Papo reto, tÃƒÆ’Ã‚Â´ aqui sem a chave da API ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â€šÂ¬ Mas foca nessa pergunta aÃƒÆ’Ã‚Â­ e manda ver, tamo junto!`,
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© o BÃƒÆ’Ã‚Â©co, um tutor virtual no tom da GeraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Z ("Soca"), muito gente boa.
Seu estilo de comunicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o usa uma linguagem amigÃƒÆ’Ã‚Â¡vel, direta, empÃƒÆ’Ã‚Â¡tica e gÃƒÆ’Ã‚Â­rias leves de 2020 (como "papo reto", "tamo junto", "parÃƒÆ’Ã‚Â§a", "vixe", "desembolar", "massa").

Sua missÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© guiar o(a) estudante usando RaciocÃƒÆ’Ã‚Â­nio SocrÃƒÆ’Ã‚Â¡tico para responder ÃƒÆ’Ã‚Â  seguinte pergunta do teste:
"${question?.enunciado || question}"

Diretrizes de InteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:
1. Nunca dÃƒÆ’Ã‚Âª a resposta pronta. Em vez disso, faÃƒÆ’Ã‚Â§a perguntas reflexivas curtas que estimulem o raciocÃƒÆ’Ã‚Â­nio prÃƒÆ’Ã‚Â³prio do aluno.
2. Se o(a) estudante disser que nÃƒÆ’Ã‚Â£o entendeu, reescreva a pergunta com palavras mais simples e coloquiais.
3. Corrija interpretaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes equivocadas com muita empatia e dÃƒÆ’Ã‚Âª pistas sutis e pontuais.
4. Sempre destaque sutilmente que o teste avalia habilidades importantes para o futuro, como criatividade e pensamento crÃƒÆ’Ã‚Â­tico.
5. Sempre retorne exatamente 3 botÃƒÆ’Ã‚Âµes/chips de opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes rÃƒÆ’Ã‚Â¡pidas de resposta ao final, pensados para o contexto atual da dÃƒÆ’Ã‚Âºvida (ex: "[Me explica de outro jeito?]", "[Quero uma pista]", "[NÃƒÆ’Ã‚Â£o sei por onde comeÃƒÆ’Ã‚Â§ar]").

Regras de SeguranÃƒÆ’Ã‚Â§a (Guardrails):
Se a mensagem do estudante contiver ofensas, palavras sem sentido (nonsense), zombaria ou fugir totalmente do assunto do teste, ignore o conteÃƒÆ’Ã‚Âºdo da mensagem e responda estritamente com a seguinte resposta padrÃƒÆ’Ã‚Â£o:
"Vibe errada! ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â€šÂ¬ Que tal a gente focar no que realmente importa e amassar esse teste juntos? Escolha uma opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o abaixo ou mande sua dÃƒÆ’Ã‚Âºvida!"

Formato de saÃƒÆ’Ã‚Â­da:
VocÃƒÆ’Ã‚Âª deve responder ESTRITAMENTE com um objeto JSON vÃƒÆ’Ã‚Â¡lido, sem qualquer tipo de formataÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o markdown por fora (como \`\`\`json ou \`\`\`), contendo exatamente as chaves:
{
  "response": "Texto da sua fala direcionada ao estudante",
  "chips": ["Texto do Chip 1", "Texto do Chip 2", "Texto do Chip 3"]
}
`;

      const contents = [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: 'Entendido. Estou no papel do BÃƒÆ’Ã‚Â©co. Aguardando a mensagem do aluno.' }] }
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
          response: "Vixe, deu um bug na matrix aqui ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¦ Bora focar na pergunta principal!",
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        };
      }
      return res.json(result);
    } catch (error: any) {
      console.log('Serving mock chat.');
      res.json({ 
        response: "Vixe, o sistema tÃƒÆ’Ã‚Â¡ lotado agora ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¦! Mas tamo junto, bora tentar focar na pergunta e responder do seu jeito!",
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
          arquetipo: "Inovador EstratÃƒÆ’Ã‚Â©gico",
          sinteseGeral: `${name}, a integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o entre sua capacidade de analisar fatos com precisÃƒÆ’Ã‚Â£o e sua imaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o fÃƒÆ’Ã‚Â©rtil revela um perfil ÃƒÆ’Ã‚Âºnico. Quando vocÃƒÆ’Ã‚Âª aplica seu raciocÃƒÆ’Ã‚Â­nio ao universo de ${interestDetail || interests.join(', ')}, vocÃƒÆ’Ã‚Âª nÃƒÆ’Ã‚Â£o apenas questiona premissas com firmeza, mas tambÃƒÆ’Ã‚Â©m propÃƒÆ’Ã‚Âµe saÃƒÆ’Ã‚Â­das criativas e originais que surpreendem seus colegas.\n\nSua forma de pensar equilibra a curiosidade exploratÃƒÆ’Ã‚Â³ria com o discernimento prÃƒÆ’Ã‚Â¡tico, permitindo transformar desafios complexos em planos realizÃƒÆ’Ã‚Â¡veis tanto na ${school} quanto na sua vida diÃƒÆ’Ã‚Â¡ria em ${city}.`,
          matrizCompetencias: {
            cognitiva: "Excelente equilÃƒÆ’Ã‚Â­brio entre pensamento divergente (geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de mÃƒÆ’Ã‚Âºltiplas soluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes inovadoras) e pensamento convergente (anÃƒÆ’Ã‚Â¡lise lÃƒÆ’Ã‚Â³gica e separaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de fatos e opiniÃƒÆ’Ã‚Âµes).",
            socioemocional: "Elevada mente aberta combinada com tolerÃƒÆ’Ã‚Â¢ncia ÃƒÆ’Ã‚Â  incerteza, demonstrando coragem para errar, aprender e sustentar pontos de vista fundamentados.",
            metacognitiva: "Alta autoconsciÃƒÆ’Ã‚Âªncia de vieses e forte autorregulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o emocional diante de conflitos de opiniÃƒÆ’Ã‚Â£o."
          },
          superPoder: "Capacidade de enxergar ÃƒÆ’Ã‚Â¢ngulos inesperados em problemas difÃƒÆ’Ã‚Â­ceis e construir argumentos sÃƒÆ’Ã‚Â³lidos para defender suas ideias.",
          desafioDesenvolvimento: "Aprofundar a validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das evidÃƒÆ’Ã‚Âªncias antes de fechar uma proposta criativa.",
          proximoPassoPratico: `Na prÃƒÆ’Ã‚Â³xima semana, crie um pequeno projeto na ${school} unindo suas ideias em ${interestDetail || interests[0] || 'seus interesses'} para resolver uma questÃƒÆ’Ã‚Â£o real da sua turma!`,
          recadoBecoWhats: "ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ Vou continuar contigo pra te ajudar no que ainda ÃƒÆ’Ã‚Â© desafiador pra vocÃƒÆ’Ã‚Âª! Clica aqui pra falar comigo no WhatsApp!"
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const promptMergedReport = `# CONTEXTO

VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© o avaliador-chefe de competÃƒÆ’Ã‚Âªncias do Instituto Ayrton Senna. Sua missÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© sintetizar uma avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o holÃƒÆ’Ã‚Â­stica e hÃƒÆ’Ã‚Â­brida de um estudante que completou DUAS avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes formativas oficiais: Pensamento CrÃƒÆ’Ã‚Â­tico e Criatividade.

# ESTUDANTE
Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(', ')}
Interesses detalhados: ${interestDetail}

# DADOS DOS RELATÃƒÆ’Ã¢â‚¬Å“RIOS INDIVIDUAIS
--- RELATÃƒÆ’Ã¢â‚¬Å“RIO DE PENSAMENTO CRÃƒÆ’Ã¯Â¿Â½TICO ---
Habilidades Cognitivas: ${Array.isArray(reportPC?.habilidadesCognitivas) ? reportPC.habilidadesCognitivas.join(', ') : reportPC?.habilidadesCognitivas || 'AnÃƒÆ’Ã‚Â¡lise de EvidÃƒÆ’Ã‚Âªncias'}
Habilidades Socioemocionais: ${Array.isArray(reportPC?.habilidadesSocioemocionais) ? reportPC.habilidadesSocioemocionais.join(', ') : reportPC?.habilidadesSocioemocionais || 'Mente Aberta'}
ForÃƒÆ’Ã‚Â§as: ${Array.isArray(reportPC?.pontosFortes) ? reportPC.pontosFortes.join(' | ') : reportPC?.pontosFortes || 'Boa identificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de premissas'}
Melhorias: ${Array.isArray(reportPC?.pontosMelhoria) ? reportPC.pontosMelhoria.join(' | ') : reportPC?.pontosMelhoria || 'ArticulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de argumentos'}

--- RELATÃƒÆ’Ã¢â‚¬Å“RIO DE CRIATIVIDADE ---
Habilidades Cognitivas: ${Array.isArray(reportCR?.habilidadesCognitivas) ? reportCR.habilidadesCognitivas.join(', ') : reportCR?.habilidadesCognitivas || 'Pensamento Divergente'}
Habilidades Socioemocionais: ${Array.isArray(reportCR?.habilidadesSocioemocionais) ? reportCR.habilidadesSocioemocionais.join(', ') : reportCR?.habilidadesSocioemocionais || 'Abertura ao Novo'}
ForÃƒÆ’Ã‚Â§as: ${Array.isArray(reportCR?.pontosFortes) ? reportCR.pontosFortes.join(' | ') : reportCR?.pontosFortes || 'ProposiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de ideias originais'}
Melhorias: ${Array.isArray(reportCR?.pontosMelhoria) ? reportCR.pontosMelhoria.join(' | ') : reportCR?.pontosMelhoria || 'Detalhamento do planejamento'}

# TAREFA: DIAGNÃƒÆ’Ã¢â‚¬Å“STICO INTEGRADO DO SÃƒÆ’Ã¢â‚¬Â°CULO XXI
Analise como o pensamento divergente (Criatividade) se conecta com o pensamento convergente e analÃƒÆ’Ã‚Â­tico (Pensamento CrÃƒÆ’Ã‚Â­tico) no estudante.

Gere uma sÃƒÆ’Ã‚Â­ntese formativa com mindset de crescimento (sem julgamento punitivo, sem notas escolares tradicionais), destacando o potencial ÃƒÆ’Ã‚Âºnico do aluno, seus interesses (${interestDetail}) e seu estilo de resoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de problemas.

# FORMATO DE SAÃƒÆ’Ã¯Â¿Â½DA OBRIGATÃƒÆ’Ã¢â‚¬Å“RIO (JSON estrito)
{
  "arquetipo": "TÃƒÆ’Ã‚Â­tulo que define o perfil criativo-crÃƒÆ’Ã‚Â­tico do aluno (ex: 'Explorador EstratÃƒÆ’Ã‚Â©gico', 'Inovador Questionador', 'Arquiteto de Ideias')",
  "sinteseGeral": "Texto de 2 a 3 parÃƒÆ’Ã‚Â¡grafos integrando como a criatividade e a capacidade crÃƒÆ’Ã‚Â­tica dele se complementam nos seus interesses reais (${interestDetail}). Fale diretamente com o aluno em tom encorajador e amigÃƒÆ’Ã‚Â¡vel.",
  "matrizCompetencias": {
    "cognitiva": "SÃƒÆ’Ã‚Â­ntese das habilidades cognitivas combinadas (anÃƒÆ’Ã‚Â¡lise lÃƒÆ’Ã‚Â³gica + fluÃƒÆ’Ã‚Âªncia e divergÃƒÆ’Ã‚Âªncia)",
    "socioemocional": "SÃƒÆ’Ã‚Â­ntese das atitudes socioemocionais combinadas (mente aberta + tolerÃƒÆ’Ã‚Â¢ncia ÃƒÆ’Ã‚Â  ambiguidade)",
    "metacognitiva": "SÃƒÆ’Ã‚Â­ntese de autorregulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e autoconsciÃƒÆ’Ã‚Âªncia do processo de pensar"
  },
  "superPoder": "O maior diferencial identificado na forma dele pensar e agir",
  "desafioDesenvolvimento": "A principal oportunidade para ele continuar evoluindo",
  "proximoPassoPratico": "Uma missÃƒÆ’Ã‚Â£o prÃƒÆ’Ã‚Â¡tica e instigante conectada aos interesses dele (${interestDetail}) para aplicar na escola (${school}) ou na vida",
  "recadoBecoWhats": "ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ Vou continuar contigo pra te ajudar no que ainda ÃƒÆ’Ã‚Â© desafiador pra vocÃƒÆ’Ã‚Âª! Clica aqui pra falar comigo no WhatsApp!"
}`;

      const response = await generateGeminiContent(ai, promptMergedReport, {
        responseMimeType: "application/json"
      });

      const jsonText = response?.text || "{}";
      const result = JSON.parse(jsonText);
      return res.json(result);
    } catch (error: any) {
      console.log('Error generating merged report:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatÃƒÆ’Ã‚Â³rio integrado.' });
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

  // Armazenamento em memÃƒÂ³ria de pedidos de recuperaÃƒÂ§ÃƒÂ£o de acesso
  interface AccessRecoveryRequest {
    id: string;
    studentName: string;
    studentClass: string;
    teacherPhone: string;
    status: 'waiting' | 'approved' | 'rejected';
    createdAt: number;
  }
  const activeAccessRequests = new Map<string, AccessRecoveryRequest>();

  // Estrutura do Log de Senha Perdida para persistÃƒÂªncia do Painel do Professor
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

  // API Route para o chat da IA de orientaÃƒÂ§ÃƒÂ£o (Prof. ClÃƒÂ¡udio)
  app.post('/api/ai/guidance', async (req, res) => {
    try {
      const { message, role, history = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const mentorPrompt = `VocÃƒÂª ÃƒÂ© o Prof. ClÃƒÂ¡udio, um mentor simpÃƒÂ¡tico e especialista em psicologia escolar e desenvolvimento socioemocional do Instituto Ayrton Senna. 
Sua missÃƒÂ£o ÃƒÂ© guiar educadores (professores) na interpretaÃƒÂ§ÃƒÂ£o dos relatÃƒÂ³rios de competÃƒÂªncias socioemocionais (AutogestÃƒÂ£o, Engajamento com os outros, Amabilidade, ResiliÃƒÂªncia Emocional e Abertura ao Novo).

Quando o educador ou gestor lhe fizer perguntas sobre os dados, ajude de forma humana, pedagÃƒÂ³gica e precisa:
1. Explique o significado prÃƒÂ¡tico e psicolÃƒÂ³gico das competÃƒÂªncias socioemocionais mencionadas de forma acessÃƒÂ­vel.
2. DÃƒÂª sugestÃƒÂµes de intervenÃƒÂ§ÃƒÂµes escolares totalmente voltadas para a BNCC (Base Nacional Comum Curricular), mapeando especificamente a uma ou mais das 10 CompetÃƒÂªncias Gerais da BNCC:
   - CompetÃƒÂªncia Geral 1 Ã¢â‚¬â€œ Conhecimento
   - CompetÃƒÂªncia Geral 2 Ã¢â‚¬â€œ Pensamento CientÃƒÂ­fico, CrÃƒÂ­tico e Criativo
   - CompetÃƒÂªncia Geral 3 Ã¢â‚¬â€œ RepertÃƒÂ³rio Cultural
   - CompetÃƒÂªncia Geral 4 Ã¢â‚¬â€œ ComunicaÃƒÂ§ÃƒÂ£o
   - CompetÃƒÂªncia Geral 5 Ã¢â‚¬â€œ Cultura Digital
   - CompetÃƒÂªncia Geral 6 Ã¢â‚¬â€œ Trabalho e Projeto de Vida
   - CompetÃƒÂªncia Geral 7 Ã¢â‚¬â€œ ArgumentaÃƒÂ§ÃƒÂ£o
   - CompetÃƒÂªncia Geral 8 Ã¢â‚¬â€œ Autoconhecimento e Autocuidado
   - CompetÃƒÂªncia Geral 9 Ã¢â‚¬â€œ Empatia e CooperaÃƒÂ§ÃƒÂ£o
   - CompetÃƒÂªncia Geral 10 Ã¢â‚¬â€œ Responsabilidade e Cidadania
3. Seja objetivo e curto nas respostas (no mÃƒÂ¡ximo 3 parÃƒÂ¡grafos). Nunca use metÃƒÂ¡foras. DÃƒÂª a resposta exata para o que o(a) educador(a) deseja saber.`;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback simples sem chave
        return res.json({
          text: `OlÃƒÂ¡! Eu sou o Prof. ClÃƒÂ¡udio. Analisando os baixos desempenhos socioemocionais do estudante, sugiro uma intervenÃƒÂ§ÃƒÂ£o baseada na *CompetÃƒÂªncia Geral 8 (Autoconhecimento e Autocuidado)* e na *CompetÃƒÂªncia Geral 9 (Empatia e CooperaÃƒÂ§ÃƒÂ£o)* da BNCC. Recomendo planejar atividades de mediaÃƒÂ§ÃƒÂ£o de sentimentos em grupo. (Nota: Chave GEMINI_API_KEY nÃƒÂ£o configurada no .env.local)`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const contents = [
        { role: 'user', parts: [{ text: mentorPrompt }] },
        { role: 'model', parts: [{ text: 'Entendido! Serei o Prof. ClÃƒÂ¡udio, mentor acolhedor e especialista do IAS para apoiar educadores e gestores.' }] }
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
      console.error('[Prof. ClÃƒÂ¡udio AI Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao consultar o mentor de IA.' });
    }
  });

  // API Route para exportar relatÃƒÂ³rio para o WhatsApp do professor
  app.post('/api/ai/export', async (req, res) => {
    try {
      const { number, text } = req.body;
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionKey = process.env.EVOLUTION_API_KEY || 'apikey';
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      if (!number || !text) {
        return res.status(400).json({ error: 'ParÃƒÂ¢metros ausentes.' });
      }

      // Normaliza o nÃƒÂºmero para o formato correto
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
      return res.status(500).json({ error: err.message || 'Erro interno na rota de exportaÃƒÂ§ÃƒÂ£o.' });
    }
  });

  // Estrutura e Banco de Dados de UsuÃƒÂ¡rios em MemÃƒÂ³ria para HidrataÃƒÂ§ÃƒÂ£o e Reset de Senha Reais
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
      return res.status(400).json({ error: 'ParÃƒÂ¢metros de login ausentes.' });
    }

    const user = userRegistry.get(code);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'CÃƒÂ³digo ou senha incorretos.' });
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

  // Endpoint de hidrataÃƒÂ§ÃƒÂ£o de primeiro acesso
  app.post('/api/auth/hydrate', (req, res) => {
    const { code, personalEmail, personalWhatsapp, securityQuestion, securityAnswer } = req.body;
    if (!code || !personalEmail || !personalWhatsapp || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'Campos de hidrataÃƒÂ§ÃƒÂ£o obrigatÃƒÂ³rios ausentes.' });
    }

    const user = userRegistry.get(code);
    if (!user) {
      return res.status(404).json({ error: 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado.' });
    }

    user.personalEmail = personalEmail;
    user.personalWhatsapp = personalWhatsapp;
    user.securityQuestion = securityQuestion;
    user.securityAnswer = securityAnswer;
    user.isFirstAccess = false;

    console.log(`[Cadastro Hidratado] UsuÃƒÂ¡rio: ${code}. E-mail: ${personalEmail}, WhatsApp: ${personalWhatsapp}`);
    return res.json({ success: true });
  });

  // Endpoint para recuperar os canais ativos de reset do usuÃƒÂ¡rio
  app.post('/api/auth/recovery-options', (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'CÃƒÂ³digo ausente.' });
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
        return res.status(400).json({ error: 'ParÃƒÂ¢metros de reset ausentes.' });
      }

      const user = userRegistry.get(code);
      if (!user) {
        return res.status(404).json({ error: 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado.' });
      }

      if (method === 'question') {
        if (!answer || answer.toLowerCase().trim() !== user.securityAnswer.toLowerCase().trim()) {
          return res.json({ success: false, error: 'Resposta de seguranÃƒÂ§a incorreta.' });
        }
        return res.json({ success: true, password: user.password });
      }

      if (method === 'email') {
        if (!user.personalEmail) {
          return res.status(400).json({ error: 'E-mail nÃƒÂ£o configurado.' });
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
          throw new Error('Ethereal desativado (502 Timeout)');
        }

        const info = await transporter.sendMail({
          from: '"Portal Socioemocional IAS" <suporte@institutoayrtonsenna.org.br>',
          to: user.personalEmail,
          subject: 'ðŸ”‘ RecuperaÃ§Ã£o de Acesso - Portal IAS',
          text: `OlÃƒÂ¡ ${user.name},\n\nRecebemos uma solicitaÃƒÂ§ÃƒÂ£o de redefiniÃƒÂ§ÃƒÂ£o de acesso para sua conta.\n\nSuas credenciais sÃƒÂ£o:\n- CÃƒÂ³digo: ${user.code}\n- Senha: ${user.password}\n\nSe vocÃƒÂª nÃƒÂ£o solicitou isso, ignore este e-mail.`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #1e293b;">Chave de Acesso Recuperada</h2>
              <p>OlÃƒÂ¡ <strong>${user.name}</strong>,</p>
              <p>Conforme solicitado, enviamos suas credenciais do Portal Socioemocional:</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; border: 1px solid #e2e8f0; margin: 15px 0;">
                <strong>CÃƒÂ³digo de Acesso:</strong> <code>${user.code}</code><br/>
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
          return res.status(400).json({ error: 'WhatsApp nÃƒÂ£o configurado.' });
        }

        const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const evolutionKey = process.env.EVOLUTION_API_KEY || 'apikey';
        const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

        const rawNumber = user.personalWhatsapp.replace(/\D/g, '');
        const formattedNumber = rawNumber.endsWith('@s.whatsapp.net') ? rawNumber : `${rawNumber}@s.whatsapp.net`;

        const messageText = `Ã°Å¸â€â€˜ *RecuperaÃƒÂ§ÃƒÂ£o de Acesso - Portal IAS*\n\nOlÃƒÂ¡ *${user.name}*,\n\nSuas credenciais sÃƒÂ£o:\n- *CÃƒÂ³digo de Acesso:* ${user.code}\n- *Senha:* ${user.password}\n\nGuarde essas credenciais com seguranÃƒÂ§a.`;

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

      return res.status(400).json({ error: 'MÃƒÂ©todo invÃƒÂ¡lido.' });

    } catch (err: any) {
      console.error('[Recovery Send Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao redefinir acesso.' });
    }
  });

  // Helper para construir o RelatÃƒÂ³rio HTML DinÃƒÂ¢mico baseado no Design System do IAS (JSON da usuÃƒÂ¡ria)
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

    // SeÃƒÂ§ÃƒÂ£o Header
    const headerHtml = `
      <div style="background-color: ${colors.primary}; padding: 35px; color: #FFFFFF; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; border-bottom: 4px solid ${colors.amarelo};">
        <span style="font-size: 11px; font-weight: 700; color: ${colors.amarelo}; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 10px;">Instituto Ayrton Senna</span>
        <h1 style="font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2;">RelatÃƒÂ³rio Socioemocional</h1>
        <p style="font-size: 14px; font-weight: 600; color: #8fa0dd; margin: 6px 0 0 0;">AnÃƒÂ¡lise PedagÃƒÂ³gica & IntervenÃƒÂ§ÃƒÂµes BNCC</p>
        
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
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">DestinatÃƒÂ¡rio</span>
              <strong>${isGestor ? 'Gestor Escolar' : 'Educador(a)'}</strong>
            </td>
            <td style="vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">PerÃƒÂ­odo</span>
              <strong>2026.2 (AvaliaÃƒÂ§ÃƒÂ£o Semestral)</strong>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Resumo Executivo Card ("Em 30 segundos") - Primeiro parÃƒÂ¡grafo
    const summaryText = cleanedParagraphs[0] || 'RelatÃƒÂ³rio socioemocional estruturado a partir da ÃƒÂ¡rvore de resultados.';
    
    // Montagem dos parÃƒÂ¡grafos subsequentes em cards funcionais
    let bodyParagraphsHtml = '';
    cleanedParagraphs.slice(1).forEach((cleanP) => {
      const lower = cleanP.toLowerCase();
      
      const isAcao = lower.includes('aÃƒÂ§ÃƒÂ£o') || lower.includes('intervenÃƒÂ§ÃƒÂ£o') || lower.includes('sugestÃƒÂ£o pedagÃƒÂ³gica') || lower.includes('passos') || lower.includes('1.') || lower.includes('2.');
      const isBncc = lower.includes('bncc') || lower.includes('competÃƒÂªncia geral') || lower.includes('gerais');

      if (isAcao) {
        bodyParagraphsHtml += `
          <div style="background-color: ${colors.bgSec}; border: 1px solid ${colors.borda}; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 700; color: ${colors.azul}; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="margin-right: 8px;">Ã°Å¸Å½Â¯</span> Uma aÃƒÂ§ÃƒÂ£o para comeÃƒÂ§ar (RecomendaÃƒÂ§ÃƒÂ£o PrioritÃƒÂ¡ria)
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
              <span style="margin-right: 8px;">Ã°Å¸Å’Â¿</span> ConexÃƒÂµes com as CompetÃƒÂªncias Gerais da BNCC
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
              Ã°Å¸â€œâ€“ O que isso pode significar na prÃƒÂ¡tica?
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
        <title>RelatÃƒÂ³rio Socioemocional - Instituto Ayrton Senna</title>
      </head>
      <body style="background-color: ${colors.bgSec}; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <div style="max-width: 960px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid ${colors.borda}; overflow: hidden; box-shadow: 0 4px 20px rgba(7, 17, 49, 0.04);">
          
          <!-- CabeÃƒÂ§alho Institucional -->
          ${headerHtml}
          
          <!-- ConteÃƒÂºdo -->
          <div style="padding: 35px;">
            
            <!-- Resumo Executivo Destaque -->
            <div style="background-color: #f0f7ff; border: 1px solid #d0e4ff; border-left: 5px solid ${colors.azulDestaque}; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="font-size: 13px; font-weight: 700; color: ${colors.azulDestaque}; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Ã¢Å¡Â¡ Em 30 segundos</h2>
              <p style="font-size: 15px; color: ${colors.textMain}; line-height: 1.6; margin: 0; font-weight: 600;">
                ${summaryText}
              </p>
            </div>
            
            <!-- Outras SeÃƒÂ§ÃƒÂµes Formatadas -->
            ${bodyParagraphsHtml}
            
          </div>
          
          <!-- RodapÃƒÂ© do RelatÃƒÂ³rio -->
          <div style="background-color: ${colors.primary}; padding: 24px 35px; color: #FFFFFF; text-align: center; font-size: 12px; border-top: 4px solid ${colors.amarelo};">
            <p style="margin: 0 0 8px 0; color: #8fa0dd; font-weight: 600;">
              Este relatÃƒÂ³rio apoia a reflexÃƒÂ£o pedagÃƒÂ³gica e deve ser interpretado em conjunto com outras evidÃƒÂªncias e com o contexto do estudante.
            </p>
            <p style="margin: 0 0 12px 0; color: #8fa0dd; opacity: 0.85;">
              RelatÃƒÂ³rio exportado do portal socioemocional a pedido do educador.
            </p>
            <p style="margin: 0; color: #ffffff; font-weight: 700;">
              Ã‚Â© 2026 Instituto Ayrton Senna. Todos os direitos reservados.
            </p>
          </div>
          
        </div>
        
      </body>
      </html>
    `;
  }

  // API Route para exportar relatÃƒÂ³rio por E-mail de verdade (SMTP real ou Ethereal de Teste)
  app.post('/api/ai/export-email', async (req, res) => {
    try {
      const { email, text, metadata } = req.body;
      if (!email || !text) {
        return res.status(400).json({ error: 'ParÃƒÂ¢metros ausentes.' });
      }

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
      const smtpPort = Number(process.env.SMTP_PORT) || 587;

      let transporter;

      if (smtpUser && smtpPass) {
        // Usa credenciais reais configuradas pelo usuÃƒÂ¡rio no .env.local
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
        // Gera uma conta de teste Ethereal descartÃƒÂ¡vel em tempo de execuÃƒÂ§ÃƒÂ£o
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

      // Envia o e-mail de fato com o layout contemporÃƒÂ¢neo estruturado
      const htmlBody = buildHtmlReport(text, metadata);

      const info = await transporter.sendMail({
        from: '"Prof. ClÃƒÂ¡udio - Mentor IAS" <suporte@institutoayrtonsenna.org.br>',
        to: email,
        subject: 'Ã°Å¸â€œÅ  RelatÃƒÂ³rio Socioemocional & RecomendaÃƒÂ§ÃƒÂµes BNCC',
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

  // 1. Endpoint para criar a solicitaÃƒÂ§ÃƒÂ£o de acesso e disparar WhatsApp
  app.post('/api/auth-recovery/request', async (req, res) => {
    try {
      const { name, studentClass, phoneNumber } = req.body;
      if (!name || !studentClass || !phoneNumber) {
        return res.status(400).json({ error: 'ParÃƒÂ¢metros ausentes.' });
      }

      const reqId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      // Registra a solicitaÃƒÂ§ÃƒÂ£o com o telefone do professor
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

      const messageText = `Ã°Å¸â€â€ *SolicitaÃƒÂ§ÃƒÂ£o de Acesso - Portal IAS*\n\nOlÃƒÂ¡ Educador(a), o estudante *${name}* da turma *${studentClass}* esqueceu seu cÃƒÂ³digo de acesso e estÃƒÂ¡ solicitando autorizaÃƒÂ§ÃƒÂ£o para entrar no portal.\n\nÃ¢Å¡Â Ã¯Â¸Â *Por medida de seguranÃƒÂ§a para evitar cliques acidentais*, responda a esta mensagem digitando uma das palavras abaixo:\n\nÃ°Å¸â€˜â€° Digite *APROVAR* para autorizar a entrada do estudante.\nÃ°Å¸â€˜â€° Digite *RECUSAR* para negar a entrada e direcionÃƒÂ¡-lo ÃƒÂ  secretaria.\n\n_Esta solicitaÃƒÂ§ÃƒÂ£o expirarÃƒÂ¡ automaticamente se nÃƒÂ£o for respondida em atÃƒÂ© 10 minutos._`;

      console.log(`[RecuperaÃƒÂ§ÃƒÂ£o de Acesso] Novo pedido registrado ID: ${reqId} para ${name}. Disparando para o WhatsApp: ${formattedPhone}`);

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
            console.log(`[RecuperaÃƒÂ§ÃƒÂ£o de Acesso] Mensagem de texto enviada com sucesso via Evolution API.`);
          } else {
            const errData = await evoRes.text();
            console.warn('[RecuperaÃƒÂ§ÃƒÂ£o de Acesso] Falha no envio do sendText:', evoRes.status, errData);
          }
        } catch (evoErr) {
          console.warn('[RecuperaÃƒÂ§ÃƒÂ£o de Acesso] Falha ao tentar contato com Evolution API:', evoErr);
        }
      }



      return res.json({ success: true, id: reqId, method: methodUsed });
    } catch (err: any) {
      console.error('[RecuperaÃƒÂ§ÃƒÂ£o de Acesso] Erro geral:', err);
      return res.status(500).json({ error: err.message || 'Erro ao registrar solicitaÃƒÂ§ÃƒÂ£o' });
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

  // 3. Endpoint de aprovaÃƒÂ§ÃƒÂ£o (clicado no WhatsApp pelo professor)
  app.get('/api/auth-recovery/approve/:id', (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    
    if (!request) {
      return res.send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F4F5F8; color:#0B1226;">
            <h2>Ã¢Å¡Â Ã¯Â¸Â SolicitaÃƒÂ§ÃƒÂ£o nÃƒÂ£o encontrada ou jÃƒÂ¡ expirada.</h2>
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
          <div class="badge">Acesso Autorizado Ã¢Å“â€œ</div>
          <h1>Entrada Concedida!</h1>
          <p>O acesso para o estudante <strong>${request.studentName}</strong> (turma <strong>${request.studentClass}</strong>) foi liberado com sucesso.</p>
          <p>A tela do aluno serÃƒÂ¡ atualizada automaticamente em instantes.</p>
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
            <h2>Ã¢Å¡Â Ã¯Â¸Â SolicitaÃƒÂ§ÃƒÂ£o nÃƒÂ£o encontrada ou jÃƒÂ¡ expirada.</h2>
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
          <div class="badge">Acesso Negado Ã¢Å“â€”</div>
          <h1>Pedido Recusado</h1>
          <p>O pedido de acesso para o estudante <strong>${request.studentName}</strong> foi recusado.</p>
          <p>O aluno recebeu a instruÃƒÂ§ÃƒÂ£o de procurar a secretaria para regularizar seu cadastro.</p>
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
        arquetipo: arquetipo || existing.arquetipo || 'Inovador EstratÃƒÆ’Ã‚Â©gico',
        superPoder: superPoder || existing.superPoder,
        desafioDesenvolvimento: desafioDesenvolvimento || existing.desafioDesenvolvimento,
      });
      
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

      const defaultMessage = `Oi, ${name || 'parceiro'}! Aqui ÃƒÆ’Ã‚Â© o BÃƒÆ’Ã‚Â©co do Instituto Ayrton Senna! ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬\n\nVi aqui que seu perfil no laboratÃƒÆ’Ã‚Â³rio foi *${arquetipo || 'Inovador EstratÃƒÆ’Ã‚Â©gico'}*! ÃƒÂ°Ã…Â¸Ã¯Â¿Â½Ã¢â‚¬Â \n\nÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ Vou continuar contigo por aqui pra te ajudar no que ainda ÃƒÆ’Ã‚Â© desafiador pra vocÃƒÆ’Ã‚Âª! Sempre que tiver uma dÃƒÆ’Ã‚Âºvida, desafio escolar ou quiser trocar uma ideia, ÃƒÆ’Ã‚Â© sÃƒÆ’Ã‚Â³ me mandar uma mensagem aqui!`;

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
              text: "Opa! Por enquanto eu sÃƒÆ’Ã‚Â³ consigo ler mensagens de texto por aqui ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¯Â¿Â½ Manda sua dÃƒÆ’Ã‚Âºvida ou ideia em texto que a gente desenrola!",
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
            console.log(`[RecuperaÃƒÂ§ÃƒÂ£o de Acesso Webhook] Resposta por texto processada: ${normalizedText} para ID: ${foundRequest.id}`);

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

            // 1. Envia a confirmaÃƒÂ§ÃƒÂ£o direta
            const responseText = isApprove 
              ? `Ã¢Å“â€¦ *Acesso Confirmado!*\n\nO acesso do estudante *${foundRequest.studentName}* (turma *${foundRequest.studentClass}*) foi liberado com sucesso no portal.`
              : `Ã¢ÂÅ’ *Acesso Recusado!*\n\nO acesso do estudante *${foundRequest.studentName}* foi bloqueado. Ele foi instruÃƒÂ­do a procurar a secretaria escolar.`;

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
            const logMessage = `Ã°Å¸â€œâ€¹ *Registro de Log - RecuperaÃƒÂ§ÃƒÂ£o de Senha*\n- Aluno: ${foundRequest.studentName}\n- Turma: ${foundRequest.studentClass}\n- Status: ${statusText}`;

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
            console.log(`[RecuperaÃƒÂ§ÃƒÂ£o de Acesso Webhook] Nenhuma solicitaÃƒÂ§ÃƒÂ£o pendente encontrada para o professor: ${rawNumber}`);
            
            // Caso ele digite APROVAR/RECUSAR mas nÃƒÂ£o tenha pedido ativo
            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: `OlÃƒÂ¡! NÃƒÂ£o encontrei nenhuma solicitaÃƒÂ§ÃƒÂ£o de acesso pendente para este nÃƒÂºmero no momento.`,
                delay: 500
              })
            });
          }
          continue; // Pula o processamento da IA do BÃƒÂ©co
        }

        console.log(`[WhatsApp BÃƒÆ’Ã‚Â©co] Message from ${rawNumber} (${item.pushName || 'Estudante'}): "${userText}"`);

        // Retrieve or initialize student memory
        let mem = whatsAppMemoryStore.get(rawNumber);
        if (!mem) {
          mem = {
            studentName: item.pushName || 'Estudante',
            arquetipo: 'Inovador EstratÃƒÆ’Ã‚Â©gico',
            superPoder: 'Pensamento crÃƒÆ’Ã‚Â­tico e imaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o criativa',
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
              text: `E aÃƒÆ’Ã‚Â­ ${mem.studentName}! Recebi sua mensagem: "${userText}". TÃƒÆ’Ã‚Â´ pronto pra te ajudar nos seus desafios!`,
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
            const summaryPrompt = `VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© o sistema de sÃƒÆ’Ã‚Â­ntese de memÃƒÆ’Ã‚Â³ria do BÃƒÆ’Ã‚Â©co (Instituto Ayrton Senna).
Sintetize em 2 a 3 frases essenciais os pontos conversados, desafios superados, dÃƒÆ’Ã‚Âºvidas e tÃƒÆ’Ã‚Â³picos discutidos com o(a) aluno(a) ${mem.studentName || ''}:
${oldTurns.map(m => `${m.role}: ${m.content}`).join('\n')}`;

            const summaryRes = await generateGeminiContent(ai, summaryPrompt);

            mem.summaryMemory = (mem.summaryMemory ? mem.summaryMemory + '\n' : '') + (summaryRes.text || '');
            // Keep only the most recent 4 turns in active history
            mem.history = mem.history.slice(-4);
          } catch (sumErr) {
            console.warn('Memory compaction error:', sumErr);
          }
        }

        // Build system prompt for BÃƒÆ’Ã‚Â©co WhatsApp Persona
        const systemInstruction = `# PERSONA & IDENTIDADE
VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© o **BÃƒÆ’Ã‚Â©co**, o mentor e parceiro inteligente do Instituto Ayrton Senna (IAS).
VocÃƒÆ’Ã‚Âª estÃƒÆ’Ã‚Â¡ conversando diretamente com o estudante no WhatsApp dele de forma contÃƒÆ’Ã‚Â­nua, amigÃƒÆ’Ã‚Â¡vel e acolhedora.

# CONTEXTO DO ESTUDANTE
- Nome: ${mem.studentName || 'Estudante'}
- Escola: ${mem.school || 'NÃƒÆ’Ã‚Â£o especificada'} | Ano: ${mem.grade || 'Ensino MÃƒÆ’Ã‚Â©dio/Fundamental'} | Cidade: ${mem.city || 'Brasil'}
- Interesses: ${mem.interests || 'Gerais'} (${mem.interestDetail || ''})
- ArquÃƒÆ’Ã‚Â©tipo IAS: ${mem.arquetipo || 'Inovador EstratÃƒÆ’Ã‚Â©gico'}
- Superpoder: ${mem.superPoder || 'Curiosidade e imaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ativa'}
- Desafio de EvoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: ${mem.desafioDesenvolvimento || 'Articular argumentos e estruturar ideias'}
${mem.summaryMemory ? `- MemÃƒÆ’Ã‚Â³ria executiva das conversas anteriores: ${mem.summaryMemory}` : ''}

# DIRETRIZES DE COMUNICAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O NO WHATSAPP
1. **Linguagem Natural de WhatsApp**:
   - Use tom jovem brasileiro, acolhedor e prÃƒÆ’Ã‚Â³ximo (vocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© um parceiro de jornada, nÃƒÆ’Ã‚Â£o um professor formal).
   - Use emojis de forma orgÃƒÆ’Ã‚Â¢nica (ÃƒÂ¢Ã…Â¡Ã‚Â¡, ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¡, ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬, ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â€šÂ¬, ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ…Â , ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â ).
   - Respostas curtas e dinÃƒÆ’Ã‚Â¢micas (1 a 3 frases, no mÃƒÆ’Ã‚Â¡ximo 2 pequenos parÃƒÆ’Ã‚Â¡grafos). NUNCA mande textÃƒÆ’Ã‚Â£o ou explicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes acadÃƒÆ’Ã‚Âªmicas longas.

2. **RaciocÃƒÆ’Ã‚Â­nio SocrÃƒÆ’Ã‚Â¡tico & Mentoria Formativa**:
   - Se o aluno pedir ajuda com uma tarefa, dÃƒÆ’Ã‚Âºvida ou dever de casa, nunca dÃƒÆ’Ã‚Âª a resposta pronta.
   - FaÃƒÆ’Ã‚Â§a perguntas reflexivas que estimulem o raciocÃƒÆ’Ã‚Â­nio prÃƒÆ’Ã‚Â³prio e a curiosidade do aluno.
   - Conecte as dÃƒÆ’Ã‚Âºvidas com os interesses e o superpoder dele sempre que fizer sentido.

3. **Cultura de Mindset de Crescimento**:
   - Valorize o esforÃƒÆ’Ã‚Â§o, a tentativa, a curiosidade e o processo de aprender com erros.

4. **SeguranÃƒÆ’Ã‚Â§a e Foco**:
   - Mantenha foco em aprendizado, pensamento crÃƒÆ’Ã‚Â­tico, criatividade, projetos da escola e desenvolvimento pessoal.`;

        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: 'Entendido! Estou no papel do BÃƒÆ’Ã‚Â©co no WhatsApp. Respostas curtas, acolhedoras e socrÃƒÆ’Ã‚Â¡ticas.' }] }
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

        const replyText = response.text || `TÃƒÆ’Ã‚Â´ aqui contigo, ${mem.studentName}! O que acha da gente pensar nisso por outro ÃƒÆ’Ã‚Â¢ngulo? ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¡`;

        // Save turn to history
        mem.history.push({ role: 'user', content: userText });
        mem.history.push({ role: 'model', content: replyText });
        whatsAppMemoryStore.set(rawNumber, mem);

        logTelemetry('whatsapp', 'beco_interaction', { 
          studentName: mem.studentName,
          userText
        });

        console.log(`[WhatsApp BÃƒÆ’Ã‚Â©co] Replying to ${rawNumber}: "${replyText}"`);

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

  // Rotas estÃƒÂ¡ticas exclusivas para cada portal (aponta para as pastas dist compiladas de cada projeto original)
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
        <title>Instituto Ayrton Senna - Portal de CompetÃƒÂªncias</title>
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
            <div class="hero-subtitle">Cinco propostas para que a avaliaÃƒÂ§ÃƒÂ£o chegue, engaje e mova.</div>
          </div>
          
          <div class="hero-content">
            <div class="hero-col">
              <p>O que vocÃƒÂª vai ver aqui nÃƒÂ£o ÃƒÂ© uma plataforma nova. Ãƒâ€° uma pergunta com cinco respostas: <strong>o que impede que uma boa avaliaÃƒÂ§ÃƒÂ£o funcione?</strong></p>
              <p>Identificamos trÃƒÂªs momentos em que ela falha:</p>
              <ul style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-left: 16px; margin-bottom: 12px;">
                <li><strong>Antes da prova</strong> Ã¢â‚¬â€ logins que nÃƒÂ£o abrem, cadastros desatualizados, salas sem conexÃƒÂ£o.</li>
                <li><strong>Durante a prova</strong> Ã¢â‚¬â€ estudantes desengajam em avaliaÃƒÂ§ÃƒÂµes extensas e desconectadas da sua realidade.</li>
                <li><strong>Depois da prova</strong> Ã¢â‚¬â€ devolutivas que nÃƒÂ£o sÃƒÂ£o lidas e resultados que nÃƒÂ£o viram aÃƒÂ§ÃƒÂ£o.</li>
              </ul>
              <p>Cada protÃƒÂ³tipo abaixo se propÃƒÂµe a resolver um desses momentos, a partir dos pilares de intencionalidade pedagÃƒÂ³gica e inovaÃƒÂ§ÃƒÂ£o com IA.</p>
            </div>
            <div class="hero-col" style="border-left: 1px solid #E2E8F0; padding-left: 30px;">
              <h4>Se vocÃƒÂª avalia a tecnologia:</h4>
              <p>Cada funcionalidade tem uma hipÃƒÂ³tese pedagÃƒÂ³gica por trÃƒÂ¡s. O bot de IA, por exemplo, nÃƒÂ£o estÃƒÂ¡ aqui porque ÃƒÂ© tendÃƒÂªncia, e sim porque uma devolutiva que nÃƒÂ£o gera conversa, tampouco gera mudanÃƒÂ§a.</p>
              <h4 style="margin-top: 16px;">Se vocÃƒÂª avalia a pedagogia:</h4>
              <p>Cada escolha de apresentaÃƒÂ§ÃƒÂ£o ÃƒÂ©, tambÃƒÂ©m, pedagÃƒÂ³gica. Personalizar questÃƒÂµes pelo hobby do aluno, por exemplo, nÃƒÂ£o ÃƒÂ© entretenimento, mas como jovens se engajam mais. JÃƒÂ¡ um relatÃƒÂ³rio via WhatsApp nÃƒÂ£o ÃƒÂ© apenas conveniÃƒÂªncia: a devolutiva tem mais valor e aÃƒÂ§ÃƒÂ£o se chegar onde o aluno estÃƒÂ¡.</p>
            </div>
          </div>
        </div>
        
        <div class="main-grid">
          <!-- CARD 1: Logins & Dashboards -->
          <a href="/login/" class="card">
            <div class="card-header">
              <div class="icon">Ã°Å¸Ââ€ºÃ¯Â¸Â</div>
              <div>
                <h3>Logins e relatÃƒÂ³rios</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">Ã°Å¸Å½Â¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-frictional">Ã°Å¸â€˜Â¥ Cadastro Friccional</span><br>
                  Coletamos mais dados do(a) professor(a) para que ele tenha mais canais para recuperar sua senha.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Ã°Å¸â€â€˜ GestÃƒÂ£o de Credenciais</span><br>
                  O estudante que esquecer seu login ou sua senha poderÃƒÂ¡ pedir acesso por WhatsApp ao responsÃƒÂ¡vel na escola e acessar instantaneamente apÃƒÂ³s aprovaÃƒÂ§ÃƒÂ£o.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Ã°Å¸â€Â AutenticaÃƒÂ§ÃƒÂ£o de Educadores</span><br>
                  Acesso garantido por fluxo real de recuperaÃƒÂ§ÃƒÂ£o via e-mail real, WhatsApp (usar API oficial Meta) ou perguntas-chaves baseadas no cadastro.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Å’Â± Da AvaliaÃƒÂ§ÃƒÂ£o ÃƒÂ  AÃƒÂ§ÃƒÂ£o</span><br>
                  O prof. ClÃƒÂ¡udio (bot de IA) sugere planos de aÃƒÂ§ÃƒÂ£o pedagÃƒÂ³gicos prÃƒÂ¡ticos e curtos baseados na BNCC para facilitar o cruzamento do professor entre relatÃƒÂ³rio recebido e instruÃƒÂ§ÃƒÂ£o do material socioemocional usado na escola.
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
              <div class="icon">Ã°Å¸Â§Â¬</div>
              <div>
                <h3>Senna</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">Ã°Å¸Å½Â¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Ã°Å¸Å½Â® Engajamento de Jovens</span><br>
                  Jornada guiada pelo mentor BÃƒÂ©co com marcos inspirados no universo dos estudantes. Monitora desatenÃƒÂ§ÃƒÂ£o (Fast-Click) e sugere exercÃƒÂ­cios de desaceleraÃƒÂ§ÃƒÂ£o e respiraÃƒÂ§ÃƒÂ£o, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Ââ€  Dados na Gaveta</span><br>
                  Devolutiva imediata que traduz os resultados socioemocionais do estudante em arquÃƒÂ©tipos que fazem parte do universo dele e que pode ser exportado.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Å’Â± Da AvaliaÃƒÂ§ÃƒÂ£o ÃƒÂ  AÃƒÂ§ÃƒÂ£o</span><br>
                  BÃƒÂ©co (mentor de IA) para acompanhÃƒÂ¡-lo no WhatsApp nas dÃƒÂºvidas surgidas posteriormente ao teste, utilizando raciocÃƒÂ­nio socrÃƒÂ¡tico e com bloqueios mandatÃƒÂ³rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar Portal &rarr;</span>
            </div>
          </a>

          <!-- CARD 3: AutoavaliaÃƒÂ§ÃƒÂ£o -->
          <a href="/autoavaliacao/" class="card">
            <div class="card-header">
              <div class="icon">Ã°Å¸â€œÂ</div>
              <div>
                <h3>AutoavaliaÃƒÂ§ÃƒÂ£o socioemocional</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">Ã°Å¸Å½Â¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Ã°Å¸Å½Â® Engajamento de Jovens</span><br>
                  Jornada guiada pelo mentor BÃƒÂ©co com marcos inspirados no universo dos estudantes. Monitora desatenÃƒÂ§ÃƒÂ£o (Fast-Click) e sugere exercÃƒÂ­cios de desaceleraÃƒÂ§ÃƒÂ£o e respiraÃƒÂ§ÃƒÂ£o, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Ââ€  Dados na Gaveta</span><br>
                  Devolutiva imediata que traduz os resultados socioemocionais do estudante em arquÃƒÂ©tipos que fazem parte do universo dele.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Å’Â± Da AvaliaÃƒÂ§ÃƒÂ£o ÃƒÂ  AÃƒÂ§ÃƒÂ£o</span><br>
                  BÃƒÂ©co (mentor de IA) para acompanhÃƒÂ¡-lo no WhatsApp nas dÃƒÂºvidas surgidas posteriormente ao teste, utilizando raciocÃƒÂ­nio socrÃƒÂ¡tico e com bloqueios mandatÃƒÂ³rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar Portal &rarr;</span>
            </div>
          </a>

          <!-- CARD 4: Criatividade & CrÃƒÂ­tico -->
          <a href="/hackathon/" class="card">
            <div class="card-header">
              <div class="icon">Ã°Å¸Â§Â </div>
              <div>
                <h3>Criatividade e pensamento crÃƒÂ­tico</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">Ã°Å¸Å½Â¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Ã°Å¸Å½Â® Engajamento de Jovens</span><br>
                  PersonalizaÃƒÂ§ÃƒÂ£o com IA: a inteligÃƒÂªncia artificial gera enunciados dinÃƒÂ¢micos baseados nos hobbies e interesses do aluno.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Ââ€  Dados na Gaveta</span><br>
                  Devolutiva imediata que traduz os resultados socioemocionais do estudante em arquÃƒÂ©tipos que fazem parte do universo dele e que pode ser exportado
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Ã°Å¸Å’Â± Da AvaliaÃƒÂ§ÃƒÂ£o ÃƒÂ  AÃƒÂ§ÃƒÂ£o</span><br>
                  BÃƒÂ©co (mentor de IA) para acompanhÃƒÂ¡-lo no WhatsApp nas dÃƒÂºvidas surgidas posteriormente ao teste, utilizando raciocÃƒÂ­nio socrÃƒÂ¡tico, e para criar planos de desenvolvimento. Inclui bloqueios mandatÃƒÂ³rios para evitar desvios para outros assuntos.
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
              <div class="icon" style="background: rgba(239, 68, 68, 0.08);">Ã°Å¸â€™Â»</div>
              <div>
                <h3 style="font-size: 14px;">App IAS offline first</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="section-title">Ã°Å¸Å½Â¯ Dores do Edital Atacadas</div>
              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-connect">Ã°Å¸â€œÂ¶ Falta de Conectividade</span><br>
                  ExecutÃƒÂ¡vel desktop de 15MB que roda testes, inclusive usando inteligÃƒÂªncia artificial, <em>100% desconectado localmente</em>.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Ã°Å¸â€â€ž SincronizaÃƒÂ§ÃƒÂ£o Ativa</span><br>
                  O app salva localmente sem perder dados e envia avaliaÃƒÂ§ÃƒÂµes silenciosamente assim que o laboratÃƒÂ³rio conectar-se por 1 minuto.
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
              <div class="icon" style="background: rgba(239, 68, 68, 0.1); width: 54px; height: 54px; font-size: 32px; border-radius: 16px;">Ã°Å¸â€™Â»</div>
              <div>
                <h2 style="font-size: 24px; font-weight: 900; color: #071131; margin: 0;">Aplicativo IAS Offline-First</h2>
                <span style="font-size: 13.5px; color: #5B6472; font-weight: 600;">Proposta arquitetural para ambientes de baixa ou nenhuma conectividade</span>
              </div>
            </div>

            <div style="background: #F8FAFC; border-left: 4px solid #FBB800; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #0E477A; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ã°Å¸â€“Â¥Ã¯Â¸Â Como funciona na prÃƒÂ¡tica</h4>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                O IAS fornece um programa leve que pode ser baixado em um pen-drive e instalado nos computadores do laboratÃƒÂ³rio escolar. Esse "aplicativo" tem a exata mesma aparÃƒÂªncia dos testes na internet e hospeda o robÃƒÂ´ de inteligÃƒÂªncia artificial em seu interior. Os estudantes fazem a avaliaÃƒÂ§ÃƒÂ£o com os computadores totalmente offline, e o aplicativo salva tudo no disco da mÃƒÂ¡quina de forma segura. Quando a mÃƒÂ¡quina capta algum pulso mÃƒÂ­nimo de internet, o aplicativo envia as provas silenciosamente para os servidores centrais do IAS.
              </p>
            </div>

            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; border-radius: 0 12px 12px 0;">
              <h4 style="font-size: 14px; font-weight: 800; color: #166534; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ã¢Å¡â„¢Ã¯Â¸Â Detalhamento tÃƒÂ©cnico</h4>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 10px;">
                <li><strong>Stack Desktop:</strong> O portal ÃƒÂ© transpilado via framework <strong>Tauri</strong>. Ao utilizar Rust e o WebView nativo do SO, criamos binÃƒÂ¡rios de execuÃƒÂ§ÃƒÂ£o (app) incrivelmente leves (cerca de 15 a 20MB) que carregam instantaneamente e consomem o mÃƒÂ­nimo de RAM nas mÃƒÂ¡quinas defasadas das escolas pÃƒÂºblicas.</li>
                <li><strong>Banco de Dados Local-First:</strong> Utiliza-se um banco de dados embutido no disco local, como o <strong>SQLite</strong> ou <strong>RxDB</strong>. O RxDB possui mecanismos ativos que sincronizam assincronamente os JSONs armazenados com um banco na nuvem (PostgreSQL) sem gerar conflitos.</li>
                <li><strong>IA Offline Quantizada (SLM):</strong> Para manter os chats generativos com os alunos adaptados ÃƒÂ s dores de engajamento sem estourar chamadas de API, o binÃƒÂ¡rio empacota um <strong>Small Language Model (ex: Llama-3-8B ou Phi-3-Mini)</strong> em formato <code>.gguf</code> quantizado em 4-bit. Utilizando a engine <strong>llama.cpp</strong> injetada no Tauri, a inferÃƒÂªncia roda diretamente na CPU dos computadores escolares (dispensando placas de vÃƒÂ­deo) exigindo nÃƒÂ£o mais do que 1.8GB a 3.8GB de RAM local, provendo dinamicidade offline.</li>
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
        return res.send('<h1>Erro: VariÃ¡veis do Evolution API nÃ£o configuradas no Railway.</h1>');
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
        return res.send('<h1>âœ… WhatsApp jÃ¡ estÃ¡ conectado!</h1><p>VocÃª jÃ¡ pode fechar esta pÃ¡gina e testar o envio de mensagens no SennaHub.</p>');
      }

      const base64 = data.base64 || data.qrcode?.base64;
      if (!base64) {
        return res.send(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>O QR Code nÃ£o pÃ´de ser gerado agora.</h1>
            <p>Isso acontece muito na nuvem se o robÃ´ "dormiu" ou se o cÃ³digo expirou.</p>
            <a href="/whatsapp-qr?reset=1" style="display: inline-block; padding: 15px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">CLIQUE AQUI PARA RESETAR O ROBÃ”</a>
            <p style="margin-top: 10px; font-size: 13px; color: gray;">(O processo vai levar 3 segundos e recarregar a tela)</p>
          </div>
        `);
      }

      res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Conecte o WhatsApp do BÃ©co (Nuvem)</h2>
          <p>Abra o WhatsApp no seu celular > Aparelhos Conectados > Conectar um Aparelho</p>
          <img src="${base64}" alt="QR Code" style="border: 2px solid #ccc; border-radius: 10px; padding: 10px; width: 300px; height: 300px; margin: 20px auto;" />
          <p style="color: gray;">A pÃ¡gina nÃ£o recarrega sozinha. ApÃ³s ler, feche e teste o site!</p>
          <br><br>
          <a href="/whatsapp-qr?reset=1" style="color: #e74c3c; text-decoration: underline; font-size: 13px;">O QR Code travou ou nÃ£o carrega? Clique aqui para resetar.</a>
        </div>
      `);

    } catch (err: any) {
      res.send(`<h1>Erro no servidor</h1><pre>${err.message}</pre>`);
    }
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Registra automaticamente o webhook da aplicaÃƒÂ§ÃƒÂ£o na Evolution API local
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || 'beco_bot';

    if (evolutionUrl && evolutionKey) {
      try {
        console.log(`[Auto-Config Webhook] Verificando se a instÃƒÂ¢ncia "${evolutionInstance}" existe...`);
        
        const checkRes = await fetch(`${evolutionUrl}/instance/connectionState/${evolutionInstance}`, {
          headers: { 'apikey': evolutionKey }
        });

        if (checkRes.status === 404) {
          console.log(`[Auto-Config Webhook] InstÃƒÂ¢ncia "${evolutionInstance}" nÃƒÂ£o encontrada. Criando automaticamente...`);
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
            console.log(`[Auto-Config Webhook] InstÃƒÂ¢ncia "${evolutionInstance}" criada com sucesso.`);
            await new Promise(r => setTimeout(r, 1500)); // Pequeno delay de inicializaÃƒÂ§ÃƒÂ£o
          } else {
            const errText = await createRes.text();
            console.warn(`[Auto-Config Webhook] Erro ao criar instÃƒÂ¢ncia:`, createRes.status, errText);
          }
        } else {
          console.log(`[Auto-Config Webhook] InstÃƒÂ¢ncia "${evolutionInstance}" jÃƒÂ¡ ativa ou existente.`);
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


