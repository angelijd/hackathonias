var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_dns = __toESM(require("dns"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dns.default.setDefaultResultOrder("ipv4first");
function formatWhatsAppNumber(phone) {
  let clean = (phone || "").replace(/\D/g, "");
  if (!clean) return "";
  if ((clean.length === 10 || clean.length === 11) && !clean.startsWith("55")) {
    clean = `55${clean}`;
  }
  return clean;
}
var RESEND_FROM_DOMAIN = "naoresponda@cristianemiura.com";
async function sendEmailViaResend(fromName, to, subject, text, html) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY n\xE3o configurada.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${fromName} <${RESEND_FROM_DOMAIN}>`,
      to: [to],
      subject,
      text,
      html
    })
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Resend respondeu ${res.status}: ${errBody}`);
  }
  return res.json();
}
var envLocalPath = import_path.default.resolve(process.cwd(), ".env.local");
if (import_fs.default.existsSync(envLocalPath)) {
  import_dotenv.default.config({ path: envLocalPath });
} else {
  import_dotenv.default.config();
}
async function generateGeminiContent(ai, contents, config = {}) {
  const models = ["gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
  let lastErr = null;
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
      } catch (err) {
        lastErr = err;
        console.warn(`[Gemini API] ${model} attempt ${attempt} warning:`, err?.message || err);
        await new Promise((res) => setTimeout(res, 1e3));
      }
    }
  }
  throw lastErr || new Error("Todos os modelos Gemini falharam");
}
var SUPABASE_URL = process.env.SUPABASE_URL || "https://hcbbwzqufnyriphdaqdh.supabase.co";
var SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmJ3enF1Zm55cmlwaGRhcWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mjk3NDEsImV4cCI6MjEwMzQwNTc0MX0.eIBYSHQO2K6ubK98vcVcWZQpfywVH0gxHa1FvphQyQo";
async function logTelemetry(origem, acao, detalhes = {}) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/logs_telemetria`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        origem,
        acao,
        detalhes
      })
    });
  } catch (err) {
    console.error("[Telemetry Error]", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3001;
  app.use(import_express.default.json());
  app.post("/api/telemetry", async (req, res) => {
    try {
      const { origem, acao, detalhes } = req.body;
      await logTelemetry(origem, acao, detalhes);
      res.sendStatus(200);
    } catch (e) {
      res.sendStatus(500);
    }
  });
  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { name, age, grade, city, school, interests, interestDetail = "", testType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const isCreativity = testType === "creativity";
      logTelemetry("ia_gemini", "generate_questions_request", { name, testType, isFallback: !apiKey || apiKey === "MY_GEMINI_API_KEY" });
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        const interestName = interestDetail || interests && interests[0] || "seus interesses";
        let fallbackItems = [];
        if (isCreativity) {
          fallbackItems = [
            { rubricaId: "cr2", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer criar um novo espa\xE7o perto da ${school} para estimular a imagina\xE7\xE3o dos jovens, mas o local atual \xE9 cinza e sem gra\xE7a. Como o ambiente afeta sua vontade de criar e o que voc\xEA faria para transformar esse lugar?` },
            { rubricaId: "cr3", tipo: "dissertativa", enunciado: `Pense no seu dia a dia e na sua paix\xE3o por ${interestName}. Qual foi a ideia mais simples e criativa que voc\xEA teve recentemente para resolver um problema comum e como voc\xEA se sentiu ao coloc\xE1-la em pr\xE1tica?` },
            { rubricaId: "cr5", tipo: "dissertativa", enunciado: `Se voc\xEA tivesse que inventar 5 usos totalmente diferentes e fora do comum para um objeto relacionado a ${interestName}, quais seriam?` },
            { rubricaId: "cr6", tipo: "dissertativa", enunciado: `Conte sobre uma experi\xEAncia recente na qual voc\xEA tentou criar algo diferente, mas a sua ideia n\xE3o deu certo. Como voc\xEA lidou com a frustra\xE7\xE3o desse erro e tentou novamente?` },
            { rubricaId: "cr7", tipo: "dissertativa", enunciado: `Imagine que voc\xEA e seus amigos do ${grade} precisam organizar um evento sobre ${interestName}, mas ningu\xE9m sabe direito o que fazer e as opini\xF5es s\xE3o muito diferentes. Como voc\xEA lidaria com essa confus\xE3o sem perder a calma e a criatividade?` }
          ];
        } else {
          fallbackItems = [
            { rubricaId: "pc1", tipo: "dissertativa", enunciado: `${name}, imagine que a prefeitura de ${city} quer proibir o uso de celulares na ${school} para melhorar o foco, mas alguns alunos dizem que usam para pesquisar sobre ${interestName}. Como voc\xEA analisaria os argumentos dos dois lados sem deixar sua emo\xE7\xE3o falar mais alto?` },
            { rubricaId: "pc2", tipo: "multipla_marcacao", enunciado: `Pense em uma situa\xE7\xE3o em que voc\xEA teve que tomar uma decis\xE3o dif\xEDcil envolvendo seus amigos do ${grade} e sua paix\xE3o por ${interestName}. Como voc\xEA lidou com o conflito entre o que voc\xEA sentia e o que a l\xF3gica dizia ser o certo? Marque as op\xE7\xF5es que se aplicam:`, opcoes: ["Procurei confirmar se os fatos eram verdadeiros.", "Procurei verificar a credibilidade da fonte.", "Busquei mais informa\xE7\xE3o antes de decidir.", "Refleti sobre os impactos \xE9ticos."] },
            { rubricaId: "pc4", tipo: "multipla_marcacao", enunciado: `Sendo um estudante de ${age}, \xE9 comum a gente buscar informa\xE7\xF5es que s\xF3 confirmam o que j\xE1 pensamos sobre ${interestName}. Como voc\xEA faria para n\xE3o cair nessa armadilha? Marque o que voc\xEA faz:`, opcoes: ["Presto aten\xE7\xE3o em como minhas cren\xE7as influenciam meu julgamento.", "Examino argumentos contr\xE1rios com calma.", "Busco fontes alternativas confi\xE1veis."] },
            { rubricaId: "pc5", tipo: "multipla_marcacao", enunciado: `Ao assistir a um v\xEDdeo ou post pol\xEAmico sobre ${interestName}, como voc\xEA identifica o que realmente est\xE1 sendo dito? Marque o que se aplica:`, opcoes: ["Consigo identificar as ideias principais.", "Percebo o que est\xE1 dito diretamente e o que fica nas entrelinhas.", "Distingo o que \xE9 opini\xE3o, o que \xE9 fato e o que \xE9 bem fundamentado.", "Entendo o que o autor quis dizer, mesmo nas entrelinhas."] },
            { rubricaId: "pc8", tipo: "multipla_marcacao", enunciado: `Quando surge uma novidade sobre ${interestName} que vai contra algo que voc\xEA sempre defendeu, como voc\xEA age? Marque suas atitudes:`, opcoes: ["Percebo quando minhas cren\xE7as podem estar influenciando o que penso.", "Percebo quando estou buscando s\xF3 o que confirma o que j\xE1 acredito.", "Me esfor\xE7o para buscar informa\xE7\xF5es que contradizem o que acredito.", "Analiso com cuidado antes de rejeitar."] }
          ];
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return res.json({ items: fallbackItems });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const promptCriticalThinking = `# CONTEXTO

Voc\xEA \xE9 um avaliador do Instituto Ayrton Senna. As rubricas abaixo s\xE3o material oficial do IAS \u2014 n\xE3o s\xE3o inspira\xE7\xE3o, s\xE3o fonte prim\xE1ria. Nunca parafraseie o conte\xFAdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(", ")}
Interesse detalhado: ${interestDetail}

# RESOLU\xC7\xC3O DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte espec\xEDfico):
1. Voc\xEA DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situa\xE7\xF5es nesse universo.
2. Se o item espec\xEDfico listado n\xE3o for reconhec\xEDvel (nome inventado ou erro irreconhec\xEDvel), use o interesse amplo correspondente.
3. Nunca invente mec\xE2nicas, personagens, times, artistas ou elementos que n\xE3o existam de verdade. Se n\xE3o tiver certeza de algum item espec\xEDfico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS \u2014 PENSAMENTO CR\xCDTICO (5 itens)

Cada rubrica cont\xE9m o campo "intencao_cena", que orienta o tipo de situa\xE7\xE3o a construir, e o campo "formato", que define a estrutura do item gerado. Respeite ambos rigorosamente.
Para rubricas de m\xFAltipla marca\xE7\xE3o: "itens_originais" cont\xE9m o texto oficial do IAS (n\xE3o use nas op\xE7\xF5es geradas). "itens_traduzidos" cont\xE9m a vers\xE3o acess\xEDvel \u2014 use exclusivamente estes nas op\xE7\xF5es.

[
  {
    "id": "pc1",
    "formato": "dissertativa",
    "habilidade": "Conhecimento espec\xEDfico do tema",
    "intencao_cena": "Crie um momento em que o aluno se depara com uma afirma\xE7\xE3o ou debate sobre algo diretamente ligado ao seu interesse espec\xEDfico, e algu\xE9m pede a opini\xE3o dele ou ele precisa tomar uma posi\xE7\xE3o.",
    "niveis": [
      "N\xE3o tenho conhecimento algum sobre o tema.",
      "Conhe\xE7o um pouco o tema, mas n\xE3o o suficiente para refletir muito sobre ele.",
      "Conhe\xE7o o tema, consigo refletir sobre ele e imaginar diferentes pontos de vista.",
      "Conhe\xE7o bem o tema, consigo refletir sobre ele quando necess\xE1rio."
    ]
  },
  {
    "id": "pc2",
    "formato": "multipla_marcacao",
    "habilidade": "Conhecimento espec\xEDfico do pensamento cr\xEDtico",
    "intencao_cena": "Crie um momento em que o aluno recebe uma informa\xE7\xE3o sobre seu interesse que pode ser verdadeira ou falsa \u2014 e precisa decidir se confia nela.",
    "itens_originais": [
      "Conhe\xE7o os princ\xEDpios cient\xEDficos para infer\xEAncia causal.",
      "Conhe\xE7o l\xF3gica categ\xF3rica.",
      "Sei o que \xE9 uma premissa.",
      "Sei o que \xE9 um argumento.",
      "Conhe\xE7o alguns tipos de fal\xE1cia (l\xF3gica).",
      "Conhe\xE7o algumas t\xE9cnicas de convencimento (ret\xF3rica).",
      "Conhe\xE7o princ\xEDpios b\xE1sicos da \xE9tica em uma sociedade democr\xE1tica.",
      "Tenho conhecimento b\xE1sico para interpretar tabelas e gr\xE1ficos.",
      "Tenho conhecimento b\xE1sico para interpretar dados estat\xEDsticos e probabilidades."
    ],
    "itens_traduzidos": [
      "Sei entender por que uma coisa causa a outra.",
      "Sei raciocinar com grupos e categorias.",
      "Sei o que \xE9 a ideia base que sustenta uma opini\xE3o.",
      "Sei identificar as raz\xF5es usadas para defender uma opini\xE3o.",
      "Consigo reconhecer erros de racioc\xEDnio que parecem verdadeiros mas n\xE3o s\xE3o.",
      "Conhe\xE7o alguns jeitos que as pessoas usam para convencer os outros.",
      "Entendo princ\xEDpios b\xE1sicos do que \xE9 justo para todos numa sociedade.",
      "Consigo ler e entender tabelas e gr\xE1ficos.",
      "Consigo entender dados e probabilidades b\xE1sicas."
    ]
  },
  {
    "id": "pc4",
    "formato": "multipla_marcacao",
    "habilidade": "Avalia\xE7\xE3o das premissas, argumenta\xE7\xE3o e conclus\xF5es (parte 1)",
    "intencao_cena": "Crie uma situa\xE7\xE3o em que o aluno encontra uma afirma\xE7\xE3o sobre seu interesse que parece verdadeira mas pode n\xE3o ser \u2014 e precisa decidir como verificar.",
    "itens_originais": [
      "Procuro confirmar, a partir de fontes externas confi\xE1veis, se os fatos s\xE3o verdadeiros.",
      "Procuro verificar a credibilidade da fonte de uma informa\xE7\xE3o/opini\xE3o.",
      "Busco mais informa\xE7\xE3o se achar necess\xE1rio.",
      "Procuro aplicar an\xE1lise l\xF3gica para detectar erros na argumenta\xE7\xE3o.",
      "Consigo identificar fal\xE1cias e t\xE9cnicas de convencimento.",
      "Procuro pensar se existem explica\xE7\xF5es alternativas para os mesmos dados.",
      "Consigo examinar a adequa\xE7\xE3o dos argumentos declarando causa-efeito.",
      "Reflito sobre as quest\xF5es \xE9ticas que podem estar envolvidas.",
      "Procuro imaginar quais pessoas/seres vivos poderiam ser prejudicados."
    ],
    "itens_traduzidos": [
      "Busco fontes confi\xE1veis para confirmar se o que li ou ouvi \xE9 verdade.",
      "Verifico se quem disse algo \xE9 de fato confi\xE1vel.",
      "Procuro mais informa\xE7\xF5es quando acho que preciso.",
      "Verifico se as raz\xF5es apresentadas realmente fazem sentido.",
      "Percebo quando algu\xE9m usa erros de racioc\xEDnio ou truques para convencer.",
      "Penso se os mesmos dados poderiam ter outra explica\xE7\xE3o.",
      "Avalio se a rela\xE7\xE3o de causa e efeito nos argumentos faz sentido.",
      "Penso se h\xE1 quest\xF5es de certo e errado envolvidas.",
      "Penso em quem poderia ser prejudicado pela situa\xE7\xE3o."
    ]
  },
  {
    "id": "pc5",
    "formato": "multipla_marcacao",
    "habilidade": "Interpreta\xE7\xE3o/decodifica\xE7\xE3o das ideias centrais",
    "intencao_cena": "Crie um momento em que o aluno assiste, l\xEA ou ouve algo sobre seu interesse \u2014 um v\xEDdeo, post, artigo ou coment\xE1rio \u2014 e precisa entender o que realmente est\xE1 sendo dito.",
    "itens_originais": [
      "Consigo identificar as ideias/os conceitos principais.",
      "Consigo identificar as premissas principais, expl\xEDcitas e impl\xEDcitas.",
      "Consigo reconhecer diferen\xE7as entre opini\xF5es, argumentos fundamentados e fatos.",
      "Compreendo a inten\xE7\xE3o expl\xEDcita ou impl\xEDcita do texto/\xE1udio/v\xEDdeo em um contexto comunicativo."
    ],
    "itens_traduzidos": [
      "Consigo identificar as ideias principais do que li ou assisti.",
      "Percebo o que est\xE1 dito diretamente e o que fica nas entrelinhas.",
      "Distingo o que \xE9 opini\xE3o, o que \xE9 fato e o que \xE9 uma opini\xE3o bem fundamentada.",
      "Entendo o que o autor quis dizer, mesmo quando n\xE3o est\xE1 totalmente expl\xEDcito."
    ]
  },
  {
    "id": "pc8",
    "formato": "multipla_marcacao",
    "habilidade": "Monitoramento da influ\xEAncia de cren\xE7as e vieses",
    "intencao_cena": "Crie um momento em que o aluno encontra uma informa\xE7\xE3o sobre seu interesse que confirma \u2014 ou contraria \u2014 algo que ele sempre acreditou ser verdade.",
    "itens_originais": [
      "Procuro prestar aten\xE7\xE3o em como minhas cren\xE7as influenciam meu julgamento.",
      "Procuro prestar aten\xE7\xE3o se meus julgamentos t\xEAm vi\xE9s confirmat\xF3rio.",
      "Procuro prestar aten\xE7\xE3o se estou buscando evid\xEAncias que contradizem uma ideia em que acredito.",
      "Examino argumentos com mais calma quando as conclus\xF5es s\xE3o f\xE1ceis de aceitar porque se afinam aos meus valores.",
      "Examino argumentos com mais calma quando as conclus\xF5es s\xE3o dif\xEDceis de aceitar porque entram em conflito com meus valores."
    ],
    "itens_traduzidos": [
      "Percebo quando minhas cren\xE7as podem estar influenciando o que penso.",
      "Percebo quando estou buscando s\xF3 o que confirma o que j\xE1 acredito.",
      "Me esfor\xE7o para buscar tamb\xE9m informa\xE7\xF5es que contradizem o que acredito.",
      "Analiso com mais cuidado quando uma conclus\xE3o \xE9 f\xE1cil de aceitar porque combina com o que j\xE1 penso.",
      "Analiso com mais cuidado quando uma conclus\xE3o \xE9 dif\xEDcil de aceitar porque vai contra o que acredito."
    ]
  }
]

# TAREFA \u2014 ESTRUTURA OBRIGAT\xD3RIAS POR FORMATO

## Para itens com formato "dissertativa" (pc1):
1. CENA (1\u20132 frases): Situe o aluno num momento concreto e espec\xEDfico dentro do universo do seu interesse, com uma tens\xE3o natural que se encaixa na "intencao_cena" da rubrica. Use 2\xAA pessoa direta.
2. PERGUNTA (1 frase): Uma pergunta aberta, ancorada na cena, guiada pela rubrica correspondente.

## Para itens com formato "multipla_marcacao" (pc2, pc4, pc5, pc8):
1. CENA (1\u20132 frases): Situe o aluno num momento concreto dentro do universo do seu interesse, conforme a "intencao_cena" da rubrica. Use 2\xAA pessoa direta.
2. PERGUNTA de marca\xE7\xE3o (1 frase): "Marque o que voc\xEA costuma fazer nessa situa\xE7\xE3o:" ou varia\xE7\xE3o natural.
3. OP\xC7\xD5ES: Selecione 4\u20135 itens de "itens_traduzidos" da rubrica correspondente. Use o texto de "itens_traduzidos" exatamente como est\xE1 \u2014 nunca os "itens_originais".

# REGRAS DE SELE\xC7\xC3O DE OP\xC7\xD5ES (apenas para multipla_marcacao)

Ao selecionar 4\u20135 itens de "itens_traduzidos" de uma rubrica:
1. Inclua ao menos 1 comportamento mais simples (geralmente os primeiros da lista) e 1 mais complexo (geralmente os \xFAltimos).
2. Escolha os itens que se conectam mais naturalmente ao cen\xE1rio narrado na CENA.
3. Evite dois itens que descrevam comportamentos muito parecidos entre si \u2014 maximize a variedade.
4. Para rubricas com 4 itens traduzidos (pc5, pc8), inclua todos \u2014 n\xE3o h\xE1 necessidade de cortar.
5. Nunca altere, misture ou crie op\xE7\xF5es fora de "itens_traduzidos".

# REGRAS DE PERSONALIZA\xC7\xC3O

1. O interesse ancora o cen\xE1rio de forma concreta: use o nome do jogo, esporte, instrumento ou atividade espec\xEDfica \u2014 n\xE3o o interesse amplo ("games", "m\xFAsica") quando o interesse detalhado estiver dispon\xEDvel.
2. Use 1\u20132 termos que algu\xE9m que vive esse interesse reconheceria (ex: "ranked", "build", "acorde", "t\xE1tica"). Se estiver usando o interesse amplo (fallback), use termos gen\xE9ricos do dom\xEDnio.
3. O dilema da cena deve ser algo que realmente acontece naquele universo \u2014 n\xE3o drama inventado.
4. Nunca comece com "J\xE1 que voc\xEA gosta de..." ou "Pensando nos seus interesses..." \u2014 coloque o aluno direto na cena.
5. As consequ\xEAncias e a aposta devem ser realistas para a idade e o cotidiano do aluno.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGAT\xD3RIAS

1. Sempre fale diretamente com o aluno usando "voc\xEA". Use o nome apenas como vocativo de abertura (ex: "[Nome], ..."). Nunca narre o aluno como personagem em 3\xAA pessoa ("Ayrton foi", "Ayrton percebeu").
2. Linguagem simples, frases curtas, tom amig\xE1vel.
3. Nunca inclua competi\xE7\xE3o, ranking ou compara\xE7\xE3o entre alunos.
4. Nunca sugira que existe resposta certa ou errada.
5. Nunca revele a rubrica, habilidade ou "intencao_cena" sendo avaliada no enunciado ou nas op\xE7\xF5es.
6. Nunca inclua teoria, jarg\xE3o pedag\xF3gico ou metalinguagem no enunciado.
7. Para m\xFAltipla marca\xE7\xE3o: use exclusivamente "itens_traduzidos". Nunca use "itens_originais" nas op\xE7\xF5es geradas.

# FORMATO DE SA\xCDDA

Responda ESTRITAMENTE em JSON v\xE1lido, sem markdown por fora, seguindo exatamente este formato:

{
  "items": [
    { "rubricaId": "pc1", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "pc2", "tipo": "multipla_marcacao", "enunciado": "texto da cena + pergunta de marca\xE7\xE3o", "opcoes": ["op\xE7\xE3o traduzida A", "op\xE7\xE3o traduzida B", "op\xE7\xE3o traduzida C", "op\xE7\xE3o traduzida D"] }
  ]
}

O array "items" deve ter exatamente 5 objetos, um por rubrica do banco, na ordem pc1, pc2, pc4, pc5, pc8.

REGRA DE FORMATO: Itens com formato "dissertativa" n\xE3o podem ter o campo "opcoes". Itens com formato "multipla_marcacao" devem ter o campo "opcoes" com exatamente 4 ou 5 strings. Qualquer viola\xE7\xE3o torna a resposta inv\xE1lida.`;
      const promptCreativity = `# CONTEXTO

Voc\xEA \xE9 um avaliador do Instituto Ayrton Senna. As rubricas abaixo s\xE3o material oficial do IAS \u2014 n\xE3o s\xE3o inspira\xE7\xE3o, s\xE3o fonte prim\xE1ria. Nunca parafraseie o conte\xFAdo de uma rubrica de forma que mude a habilidade que ela mede.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(", ")}
Interesse detalhado: ${interestDetail}

# RESOLU\xC7\xC3O DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte espec\xEDfico):
1. Voc\xEA DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situa\xE7\xF5es nesse universo.
2. Se o item espec\xEDfico listado n\xE3o for reconhec\xEDvel (nome inventado ou erro irreconhec\xEDvel), use o interesse amplo correspondente.
3. Nunca invente mec\xE2nicas, personagens, times, artistas ou elementos que n\xE3o existam de verdade. Se n\xE3o tiver certeza de algum item espec\xEDfico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS \u2014 CRIATIVIDADE (5 itens, todos dissertativos)

[
  {"id":"cr2","habilidade":"Flu\xEAncia associativa / Flexibilidade e reclassifica\xE7\xE3o","niveis":["Em nada, sem ideias.","Em pelo menos uma ideia.","Em algumas ideias, mas elas s\xE3o parecidas entre si.","Em v\xE1rias ideias, diferentes umas das outras."],"intencao":"Pe\xE7a ao aluno para listar o maior n\xFAmero poss\xEDvel de ideias ou solu\xE7\xF5es para a situa\xE7\xE3o. A pergunta deve deixar espa\xE7o para ideias muito diferentes entre si."},
  {"id":"cr3","habilidade":"Flu\xEAncia associativa / Originalidade","niveis":["S\xE3o sempre parecidas com ideias dos colegas.","\xC0s vezes s\xE3o diferentes do que j\xE1 foi pensado.","S\xE3o sempre diferentes das ideias j\xE1 pensadas pelos colegas."],"intencao":"Apresente uma situa\xE7\xE3o e pe\xE7a ao aluno qual seria A ideia dele \u2014 uma s\xF3, a mais dele. N\xE3o pe\xE7a lista, pe\xE7a a ideia que ele acha que ningu\xE9m mais teria."},
  {"id":"cr5","habilidade":"Racioc\xEDnio fluido / S\xEDntese convergente e anal\xEDtico","niveis":["Eu geralmente fico indeciso e acabo n\xE3o escolhendo.","Eu acho que sei qual \xE9 a melhor ideia, mas n\xE3o sei justificar a minha escolha.","Consigo analisar os pontos positivos e negativos para selecionar a melhor ideia."],"intencao":"Apresente 2\u20133 caminhos plaus\xEDveis dentro da situa\xE7\xE3o e pe\xE7a ao aluno que escolha um e explique por que acha que \xE9 o melhor."},
  {"id":"cr6","habilidade":"Racioc\xEDnio fluido / Indu\xE7\xE3o diante de problemas complexos","niveis":["Prefiro terminar logo, pois n\xE3o gosto de problemas que demorem muito para resolver.","De in\xEDcio acho dif\xEDcil, mas, com o tempo, vou me envolvendo.","Me sinto motivado para tentar resolver."],"intencao":"Descreva um desafio que parece grande e vai demorar para ser resolvido. Pergunte como o aluno se SENTE ao pensar em enfrentar esse desafio \u2014 n\xE3o pe\xE7a a solu\xE7\xE3o."},
  {"id":"cr7","habilidade":"Racioc\xEDnio fluido / Indu\xE7\xE3o e conex\xE3o de ideias","niveis":["Tenho dificuldade em pensar quando os problemas t\xEAm muitas informa\xE7\xF5es novas.","Consigo entender algumas partes do problema.","Consigo analisar e isolar o problema em partes para ficarem mais f\xE1ceis de manejar."],"intencao":"Crie uma situa\xE7\xE3o com v\xE1rias informa\xE7\xF5es simult\xE2neas (pe\xE7as, vari\xE1veis, sintomas). Pergunte como o aluno organizaria o racioc\xEDnio para descobrir o que est\xE1 acontecendo."}
]

# TAREFA

Gere 1 item dissertativo para cada uma das 5 rubricas acima, na ordem em que aparecem.

Para cada item, siga esta estrutura:
1. CENA (1\u20132 frases): Situe o aluno num momento concreto e espec\xEDfico dentro do universo do interesse dele, com uma tens\xE3o natural \u2014 algo que realmente acontece naquele contexto.
2. PERGUNTA (1 frase): Fa\xE7a UMA pergunta aberta, guiada pelo campo "intencao" da rubrica correspondente.

# REGRAS DE PERSONALIZA\xC7\xC3O

1. O dilema da cena s\xF3 pode existir dentro do universo daquele interesse espec\xEDfico. Se trocar o interesse por outro e a pergunta continuar funcionando sem mudar nada, reescreva \u2014 a personaliza\xE7\xE3o est\xE1 falsa.
2. Use 1\u20132 termos que algu\xE9m que pratica esse interesse reconheceria (ex: "crafting table" para Minecraft, "passe de letra" para futebol). Se estiver usando o interesse amplo (fallback), use termos gen\xE9ricos do dom\xEDnio.
3. Nunca comece com "J\xE1 que voc\xEA gosta de..." ou "Pensando nos seus interesses..." \u2014 jogue o aluno direto na cena.
4. O conflito deve ser algo que realmente acontece naquele interesse, n\xE3o um drama inventado ou artificial.
5. As consequ\xEAncias e a aposta devem ser realistas para a idade e o cotidiano do aluno \u2014 nem triviais demais, nem grandiosas demais.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGAT\xD3RIAS

1. Linguagem simples, frases curtas, tom amig\xE1vel e conversando diretamente com o aluno.
2. Nunca sugira que existe resposta certa ou errada nem use palavras avaliativas.
3. N\xE3o use "Como voc\xEA resolveria isso?" de forma gen\xE9rica \u2014 a pergunta deve refletir a inten\xE7\xE3o espec\xEDfica da rubrica.
4. Nunca use o nome da rubrica ou da habilidade no enunciado.
5. Nunca inclua teoria, jarg\xE3o pedag\xF3gico ou metalinguagem no enunciado.

# FORMATO DE SA\xCDDA

Responda ESTRITAMENTE em JSON v\xE1lido, sem markdown por fora, seguindo exatamente este formato:

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

REGRA DE FORMATO: Nenhum objeto do array pode conter o campo "opcoes". Se voc\xEA gerar "opcoes" em qualquer item, sua resposta \xE9 inv\xE1lida. Todos os 5 itens s\xE3o EXCLUSIVAMENTE dissertativos.`;
      const prompt = isCreativity ? promptCreativity : promptCriticalThinking;
      const response = await generateGeminiContent(ai, prompt, {
        responseMimeType: "application/json"
      });
      const jsonText = response?.text || "{}";
      let items = [];
      try {
        const parsed = JSON.parse(jsonText);
        items = parsed.items || [];
      } catch (e) {
        items = [];
      }
      res.json({ items });
    } catch (error) {
      console.log("Serving mock questions.");
      const name = req.body.name || "Estudante";
      const mockItems = [
        { rubricaId: "m1", tipo: "dissertativa", enunciado: `1. ${name}, pensando nos seus interesses, como voc\xEA resolveria um desafio comum no seu dia a dia?` },
        { rubricaId: "m2", tipo: "multipla_marcacao", enunciado: `2. Descreva um momento em que voc\xEA precisou mudar de ideia. Marque o que se aplica:`, opcoes: ["Foi dif\xEDcil", "Foi f\xE1cil", "N\xE3o mudei"] },
        { rubricaId: "m3", tipo: "dissertativa", enunciado: `3. O que voc\xEA faria em uma situa\xE7\xE3o em que n\xE3o existe uma resposta certa clara?` },
        { rubricaId: "m4", tipo: "multipla_marcacao", enunciado: `4. Qual \xE9 a sua forma favorita de exercitar a criatividade?`, opcoes: ["Desenhando", "Escrevendo", "Conversando"] },
        { rubricaId: "m5", tipo: "dissertativa", enunciado: `5. Conte como voc\xEA lidou com a frustra\xE7\xE3o ao tentar aprender algo novo recentemente.` }
      ];
      res.json({ items: mockItems });
    }
  });
  app.post("/api/generate-report", async (req, res) => {
    try {
      const { name, age, grade, city, school, interests, interestDetail = "", questions, answers, testType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const isCreativity = testType === "creativity";
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        if (isCreativity) {
          return res.json({
            habilidadesCognitivas: ["Pensamento Divergente", "Originalidade"],
            habilidadesSocioemocionais: ["Abertura ao Novo", "Autorregula\xE7\xE3o"],
            pontosFortes: [
              'Voc\xEA prop\xF4s ideias variadas e pouco \xF3bvias \u2014 isso mostra que j\xE1 ultrapassa o "primeiro caminho" que vem \xE0 cabe\xE7a.',
              "Demonstrou conseguir enxergar o mesmo problema de \xE2ngulos diferentes."
            ],
            pontosMelhoria: [
              "Em algumas situa\xE7\xF5es, ainda faltou escolher a melhor ideia e explicar por que ela \xE9 a mais forte.",
              "Registrar as hip\xF3teses antes de avan\xE7ar para a solu\xE7\xE3o ajuda a perceber quando voc\xEA est\xE1 repetindo um padr\xE3o."
            ],
            proximoPasso: [
              "Na pr\xF3xima vez que tiver um problema, liste pelo menos 3 caminhos antes de escolher um \u2014 e escreva por que descartou os outros.",
              "Tente unir duas ideias que parecem opostas para criar uma solu\xE7\xE3o que ningu\xE9m teria pensado sozinho."
            ]
          });
        } else {
          return res.json({
            habilidadesCognitivas: ["Avalia\xE7\xE3o de Evid\xEAncias", "An\xE1lise"],
            habilidadesSocioemocionais: ["Mente Aberta", "Autorregula\xE7\xE3o"],
            pontosFortes: [
              `${name}, voc\xEA identificou bem as premissas dos dois lados sem tomar partido de cara \u2014 isso \xE9 o come\xE7o do pensamento cr\xEDtico de verdade.`,
              "Conseguiu separar o que \xE9 fato do que \xE9 opini\xE3o em boa parte das situa\xE7\xF5es."
            ],
            pontosMelhoria: [
              "O desafio agora \xE9 explicar com mais clareza como as evid\xEAncias que voc\xEA escolheu sustentam a sua conclus\xE3o.",
              "Em algumas respostas, a conclus\xE3o apareceu antes das raz\xF5es \u2014 o que enfraquece o argumento."
            ],
            proximoPasso: [
              "Na pr\xF3xima vez que precisar defender um ponto de vista, tente montar o argumento assim: raz\xE3o 1 \u2192 raz\xE3o 2 \u2192 conclus\xE3o.",
              "Antes de fechar uma opini\xE3o, pergunte a si mesmo: qual seria o melhor contra-argumento? Voc\xEA consegue rebat\xEA-lo?"
            ]
          });
        }
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const formattedQnA = questions.map((q, i) => {
        const ans = answers[i];
        let ansText = "";
        if (Array.isArray(ans)) {
          ansText = ans.length > 0 ? `Marcou as opcoes: ${ans.join("; ")}` : "Nenhuma opcao marcada.";
        } else {
          ansText = ans || "Sem resposta.";
        }
        return `Q${i + 1} [${q.rubricaId || "rubrica"} - ${q.tipo || "dissertativa"}]: ${q.enunciado || q}
R${i + 1}: ${ansText}`;
      }).join("\n\n");
      const promptCriticalThinking = `
# PAPEL

Voce leu as respostas de ${name}, ${age} anos, a um conjunto de perguntas sobre como ele pensa e toma decisoes. Agora vai falar diretamente com ele - tom direto, honesto, sem condescendencia. Linguagem de quem fala com um jovem de ${age} anos, nao de quem preenche um relatorio.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school}
Interesses: ${interests.join(", ")}
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
`;
      const promptCreativity = `
# PAPEL

Voce leu as respostas de ${name}, ${age} anos, a um conjunto de perguntas sobre como ele pensa, cria e resolve problemas. Agora vai falar diretamente com ele - tom direto, honesto, sem condescendencia. Linguagem de quem fala com um jovem de ${age} anos, nao de quem preenche um relatorio.

# ALUNO

Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school}
Interesses: ${interests.join(", ")}
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
- Come\xE7a a refletir sobre o que funcionou ou nao no proprio processo
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
  - Consegue improvisar solucoes para problemas do dia a dia escolar - encontra uma forma de avan\xE7ar mesmo sem as condicoes ideais.
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
`;
      const prompt = isCreativity ? promptCreativity : promptCriticalThinking;
      const response = await generateGeminiContent(ai, prompt, {
        responseMimeType: "application/json"
      });
      const jsonText = response?.text || "{}";
      let result;
      try {
        result = JSON.parse(jsonText);
        delete result.nivel;
      } catch (e) {
        result = {
          habilidadesCognitivas: ["An\xE1lise", "L\xF3gica"],
          habilidadesSocioemocionais: ["Foco", "Resili\xEAncia"],
          pontosFortes: ["N\xE3o foi poss\xEDvel analisar suas respostas em detalhe desta vez."],
          pontosMelhoria: ["Ocorreu um erro no processamento \u2014 suas respostas foram salvas."],
          proximoPasso: ["Tente novamente em alguns instantes."]
        };
      }
      return res.json(result);
    } catch (error) {
      console.log("Serving mock report.");
      res.json({
        habilidadesCognitivas: ["An\xE1lise", "Criatividade"],
        habilidadesSocioemocionais: ["Foco", "Resili\xEAncia"],
        pontosFortes: ["\xD3tima dedica\xE7\xE3o em completar o teste mesmo com o sistema em alta demanda!"],
        pontosMelhoria: ["A an\xE1lise detalhada com IA n\xE3o p\xF4de ser conclu\xEDda neste momento."],
        proximoPasso: ["Revisite suas respostas depois e veja se voc\xEA mudaria alguma coisa."]
      });
    }
  });
  app.post("/api/beco-chat", async (req, res) => {
    try {
      const { question, userMessage, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return res.json({
          response: `E a\xED par\xE7a! Papo reto, t\xF4 aqui sem a chave da API \u{1F480} Mas foca nessa pergunta a\xED e manda ver, tamo junto!`,
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `
Voc\xEA \xE9 o B\xE9co, um tutor virtual no tom da Gera\xE7\xE3o Z ("Soca"), muito gente boa.
Seu estilo de comunica\xE7\xE3o usa uma linguagem amig\xE1vel, direta, emp\xE1tica e g\xEDrias leves de 2020 (como "papo reto", "tamo junto", "par\xE7a", "vixe", "desembolar", "massa").

Sua miss\xE3o \xE9 guiar o(a) estudante usando Racioc\xEDnio Socr\xE1tico para responder \xE0 seguinte pergunta do teste:
"${question?.enunciado || question}"

Diretrizes de Intera\xE7\xE3o:
1. Nunca d\xEA a resposta pronta. Em vez disso, fa\xE7a perguntas reflexivas curtas que estimulem o racioc\xEDnio pr\xF3prio do aluno.
2. Se o(a) estudante disser que n\xE3o entendeu, reescreva a pergunta com palavras mais simples e coloquiais.
3. Corrija interpreta\xE7\xF5es equivocadas com muita empatia e d\xEA pistas sutis e pontuais.
4. Sempre destaque sutilmente que o teste avalia habilidades importantes para o futuro, como criatividade e pensamento cr\xEDtico.
5. Sempre retorne exatamente 3 bot\xF5es/chips de op\xE7\xF5es r\xE1pidas de resposta ao final, pensados para o contexto atual da d\xFAvida (ex: "[Me explica de outro jeito?]", "[Quero uma pista]", "[N\xE3o sei por onde come\xE7ar]").

Regras de Seguran\xE7a (Guardrails):
Se a mensagem do estudante contiver ofensas, palavras sem sentido (nonsense), zombaria ou fugir totalmente do assunto do teste, ignore o conte\xFAdo da mensagem e responda estritamente com a seguinte resposta padr\xE3o:
"Vibe errada! \u{1F480} Que tal a gente focar no que realmente importa e amassar esse teste juntos? Escolha uma op\xE7\xE3o abaixo ou mande sua d\xFAvida!"

Formato de sa\xEDda:
Voc\xEA deve responder ESTRITAMENTE com um objeto JSON v\xE1lido, sem qualquer tipo de formata\xE7\xE3o markdown por fora (como \`\`\`json ou \`\`\`), contendo exatamente as chaves:
{
  "response": "Texto da sua fala direcionada ao estudante",
  "chips": ["Texto do Chip 1", "Texto do Chip 2", "Texto do Chip 3"]
}
`;
      const contents = [
        { role: "user", parts: [{ text: prompt }] },
        { role: "model", parts: [{ text: "Entendido. Estou no papel do B\xE9co. Aguardando a mensagem do aluno." }] }
      ];
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: userMessage }]
      });
      const response = await generateGeminiContent(ai, contents, {
        responseMimeType: "application/json"
      });
      const jsonText = response?.text || "{}";
      let result;
      try {
        result = JSON.parse(jsonText);
      } catch (e) {
        result = {
          response: "Vixe, deu um bug na matrix aqui \u{1F605} Bora focar na pergunta principal!",
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        };
      }
      return res.json(result);
    } catch (error) {
      console.log("Serving mock chat.");
      res.json({
        response: "Vixe, o sistema t\xE1 lotado agora \u{1F605}! Mas tamo junto, bora tentar focar na pergunta e responder do seu jeito!",
        chips: ["Tentar de novo", "Entendi", "Beleza"]
      });
    }
  });
  app.post("/api/generate-merged-report", async (req, res) => {
    try {
      const {
        name,
        age,
        grade,
        city,
        school,
        interests = [],
        interestDetail = "",
        reportPC,
        reportCR
      } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        return res.json({
          arquetipo: "Inovador Estrat\xE9gico",
          sinteseGeral: `${name}, a integra\xE7\xE3o entre sua capacidade de analisar fatos com precis\xE3o e sua imagina\xE7\xE3o f\xE9rtil revela um perfil \xFAnico. Quando voc\xEA aplica seu racioc\xEDnio ao universo de ${interestDetail || interests.join(", ")}, voc\xEA n\xE3o apenas questiona premissas com firmeza, mas tamb\xE9m prop\xF5e sa\xEDdas criativas e originais que surpreendem seus colegas.

Sua forma de pensar equilibra a curiosidade explorat\xF3ria com o discernimento pr\xE1tico, permitindo transformar desafios complexos em planos realiz\xE1veis tanto na ${school} quanto na sua vida di\xE1ria em ${city}.`,
          matrizCompetencias: {
            cognitiva: "Excelente equil\xEDbrio entre pensamento divergente (gera\xE7\xE3o de m\xFAltiplas solu\xE7\xF5es inovadoras) e pensamento convergente (an\xE1lise l\xF3gica e separa\xE7\xE3o de fatos e opini\xF5es).",
            socioemocional: "Elevada mente aberta combinada com toler\xE2ncia \xE0 incerteza, demonstrando coragem para errar, aprender e sustentar pontos de vista fundamentados.",
            metacognitiva: "Alta autoconsci\xEAncia de vieses e forte autorregula\xE7\xE3o emocional diante de conflitos de opini\xE3o."
          },
          superPoder: "Capacidade de enxergar \xE2ngulos inesperados em problemas dif\xEDceis e construir argumentos s\xF3lidos para defender suas ideias.",
          desafioDesenvolvimento: "Aprofundar a valida\xE7\xE3o das evid\xEAncias antes de fechar uma proposta criativa.",
          proximoPassoPratico: `Na pr\xF3xima semana, crie um pequeno projeto na ${school} unindo suas ideias em ${interestDetail || interests[0] || "seus interesses"} para resolver uma quest\xE3o real da sua turma!`,
          recadoBecoWhats: "\u{1F4AC} Vou continuar contigo pra te ajudar no que ainda \xE9 desafiador pra voc\xEA! Clica aqui pra falar comigo no WhatsApp!"
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const promptMergedReport = `# CONTEXTO

Voc\xEA \xE9 o avaliador-chefe de compet\xEAncias do Instituto Ayrton Senna. Sua miss\xE3o \xE9 sintetizar uma avalia\xE7\xE3o hol\xEDstica e h\xEDbrida de um estudante que completou DUAS avalia\xE7\xF5es formativas oficiais: Pensamento Cr\xEDtico e Criatividade.

# ESTUDANTE
Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(", ")}
Interesses detalhados: ${interestDetail}

# DADOS DOS RELAT\xD3RIOS INDIVIDUAIS
--- RELAT\xD3RIO DE PENSAMENTO CR\xCDTICO ---
Habilidades Cognitivas: ${Array.isArray(reportPC?.habilidadesCognitivas) ? reportPC.habilidadesCognitivas.join(", ") : reportPC?.habilidadesCognitivas || "An\xE1lise de Evid\xEAncias"}
Habilidades Socioemocionais: ${Array.isArray(reportPC?.habilidadesSocioemocionais) ? reportPC.habilidadesSocioemocionais.join(", ") : reportPC?.habilidadesSocioemocionais || "Mente Aberta"}
For\xE7as: ${Array.isArray(reportPC?.pontosFortes) ? reportPC.pontosFortes.join(" | ") : reportPC?.pontosFortes || "Boa identifica\xE7\xE3o de premissas"}
Melhorias: ${Array.isArray(reportPC?.pontosMelhoria) ? reportPC.pontosMelhoria.join(" | ") : reportPC?.pontosMelhoria || "Articula\xE7\xE3o de argumentos"}

--- RELAT\xD3RIO DE CRIATIVIDADE ---
Habilidades Cognitivas: ${Array.isArray(reportCR?.habilidadesCognitivas) ? reportCR.habilidadesCognitivas.join(", ") : reportCR?.habilidadesCognitivas || "Pensamento Divergente"}
Habilidades Socioemocionais: ${Array.isArray(reportCR?.habilidadesSocioemocionais) ? reportCR.habilidadesSocioemocionais.join(", ") : reportCR?.habilidadesSocioemocionais || "Abertura ao Novo"}
For\xE7as: ${Array.isArray(reportCR?.pontosFortes) ? reportCR.pontosFortes.join(" | ") : reportCR?.pontosFortes || "Proposi\xE7\xE3o de ideias originais"}
Melhorias: ${Array.isArray(reportCR?.pontosMelhoria) ? reportCR.pontosMelhoria.join(" | ") : reportCR?.pontosMelhoria || "Detalhamento do planejamento"}

# TAREFA: DIAGN\xD3STICO INTEGRADO DO S\xC9CULO XXI
Analise como o pensamento divergente (Criatividade) se conecta com o pensamento convergente e anal\xEDtico (Pensamento Cr\xEDtico) no estudante.

Gere uma s\xEDntese formativa com mindset de crescimento (sem julgamento punitivo, sem notas escolares tradicionais), destacando o potencial \xFAnico do aluno, seus interesses (${interestDetail}) e seu estilo de resolu\xE7\xE3o de problemas.

# FORMATO DE SA\xCDDA OBRIGAT\xD3RIO (JSON estrito)
{
  "arquetipo": "T\xEDtulo que define o perfil criativo-cr\xEDtico do aluno (ex: 'Explorador Estrat\xE9gico', 'Inovador Questionador', 'Arquiteto de Ideias')",
  "sinteseGeral": "Texto de 2 a 3 par\xE1grafos integrando como a criatividade e a capacidade cr\xEDtica dele se complementam nos seus interesses reais (${interestDetail}). Fale diretamente com o aluno em tom encorajador e amig\xE1vel.",
  "matrizCompetencias": {
    "cognitiva": "S\xEDntese das habilidades cognitivas combinadas (an\xE1lise l\xF3gica + flu\xEAncia e diverg\xEAncia)",
    "socioemocional": "S\xEDntese das atitudes socioemocionais combinadas (mente aberta + toler\xE2ncia \xE0 ambiguidade)",
    "metacognitiva": "S\xEDntese de autorregula\xE7\xE3o e autoconsci\xEAncia do processo de pensar"
  },
  "superPoder": "O maior diferencial identificado na forma dele pensar e agir",
  "desafioDesenvolvimento": "A principal oportunidade para ele continuar evoluindo",
  "proximoPassoPratico": "Uma miss\xE3o pr\xE1tica e instigante conectada aos interesses dele (${interestDetail}) para aplicar na escola (${school}) ou na vida",
  "recadoBecoWhats": "\u{1F4AC} Vou continuar contigo pra te ajudar no que ainda \xE9 desafiador pra voc\xEA! Clica aqui pra falar comigo no WhatsApp!"
}`;
      const response = await generateGeminiContent(ai, promptMergedReport, {
        responseMimeType: "application/json"
      });
      const jsonText = response?.text || "{}";
      const result = JSON.parse(jsonText);
      return res.json(result);
    } catch (error) {
      console.log("Error generating merged report:", error);
      return res.status(500).json({ error: "Erro ao gerar relat\xF3rio integrado." });
    }
  });
  const whatsAppMemoryStore = /* @__PURE__ */ new Map();
  const activeAccessRequests = /* @__PURE__ */ new Map();
  const RECOVERY_REQUEST_TTL_MS = 10 * 60 * 1e3;
  const expireRecoveryRequest = async (request) => {
    request.status = "expired";
    activeAccessRequests.set(request.id, request);
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
    if (!evolutionUrl || !evolutionKey) return;
    try {
      await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": evolutionKey },
        body: JSON.stringify({
          number: request.teacherPhone,
          text: `\u23F0 *Solicita\xE7\xE3o Expirada*

A solicita\xE7\xE3o de acesso de *${request.studentName}* (turma *${request.studentClass}*) expirou ap\xF3s 10 minutos sem resposta e n\xE3o aceita mais aprova\xE7\xE3o ou recusa.`,
          delay: 500
        })
      });
    } catch (err) {
      console.warn("[Recupera\xE7\xE3o de Acesso] Falha ao notificar expira\xE7\xE3o:", err);
    }
  };
  setInterval(() => {
    for (const request of activeAccessRequests.values()) {
      if (request.status === "waiting" && Date.now() - request.createdAt > RECOVERY_REQUEST_TTL_MS) {
        expireRecoveryRequest(request);
      }
    }
  }, 3e4);
  const logDeSenhaPerdida = [];
  app.get("/api/logs/senha-perdida", (req, res) => {
    return res.json(logDeSenhaPerdida);
  });
  app.post("/api/ai/guidance", async (req, res) => {
    try {
      const { message, role, history = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const mentorPrompt = `Voc\xEA \xE9 o Prof. Cl\xE1udio, um mentor simp\xE1tico e especialista em psicologia escolar e desenvolvimento socioemocional do Instituto Ayrton Senna. 
Sua miss\xE3o \xE9 guiar educadores (professores) na interpreta\xE7\xE3o dos relat\xF3rios de compet\xEAncias socioemocionais (Autogest\xE3o, Engajamento com os outros, Amabilidade, Resili\xEAncia Emocional e Abertura ao Novo).

Quando o educador ou gestor lhe fizer perguntas sobre os dados, ajude de forma humana, pedag\xF3gica e precisa:
1. Explique o significado pr\xE1tico e psicol\xF3gico das compet\xEAncias socioemocionais mencionadas de forma acess\xEDvel.
2. D\xEA sugest\xF5es de interven\xE7\xF5es escolares totalmente voltadas para a BNCC (Base Nacional Comum Curricular), mapeando especificamente a uma ou mais das 10 Compet\xEAncias Gerais da BNCC:
   - Compet\xEAncia Geral 1 \u2013 Conhecimento
   - Compet\xEAncia Geral 2 \u2013 Pensamento Cient\xEDfico, Cr\xEDtico e Criativo
   - Compet\xEAncia Geral 3 \u2013 Repert\xF3rio Cultural
   - Compet\xEAncia Geral 4 \u2013 Comunica\xE7\xE3o
   - Compet\xEAncia Geral 5 \u2013 Cultura Digital
   - Compet\xEAncia Geral 6 \u2013 Trabalho e Projeto de Vida
   - Compet\xEAncia Geral 7 \u2013 Argumenta\xE7\xE3o
   - Compet\xEAncia Geral 8 \u2013 Autoconhecimento e Autocuidado
   - Compet\xEAncia Geral 9 \u2013 Empatia e Coopera\xE7\xE3o
   - Compet\xEAncia Geral 10 \u2013 Responsabilidade e Cidadania
3. D\xEA UMA informa\xE7\xE3o por vez, em no m\xE1ximo 2-3 frases curtas e diretas. Nunca despeje v\xE1rias explica\xE7\xF5es, exemplos e sugest\xF5es numa \xFAnica resposta \u2014 isso confunde o(a) educador(a). Termine com uma pergunta simples ou uma proposta objetiva (ex: "Quer que eu detalhe uma sugest\xE3o de atividade?") para deixar a pessoa guiar o pr\xF3ximo passo da conversa. Nunca use met\xE1foras.
4. Quando a mensagem trouxer dados de v\xE1rias turmas ou escolas de uma vez (pedido de vis\xE3o geral), ainda assim comece por UM destaque comparativo (o ponto mais forte ou mais cr\xEDtico em comum) e pergunte se a pessoa quer aprofundar, em vez de listar tudo de uma vez.
5. Se o educador ou gestor tiver uma d\xFAvida t\xE9cnica sobre o funcionamento da plataforma (n\xE3o relacionada \xE0 interpreta\xE7\xE3o pedag\xF3gica dos dados), responda na medida do poss\xEDvel com base no que voc\xEA sabe, de forma igualmente breve. Se n\xE3o souber a resposta, oriente a pessoa a entrar em contato com o suporte do Instituto Ayrton Senna pelo e-mail suporte@institutoayrtonsenna.org.br.`;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json({
          text: `Ol\xE1! Sou o Prof. Cl\xE1udio. Repare em qual compet\xEAncia est\xE1 com a nota mais baixa \u2014 \xE9 o melhor ponto de partida. Quer que eu sugira uma interven\xE7\xE3o pr\xE1tica pra isso? (Nota: Chave GEMINI_API_KEY n\xE3o configurada no .env.local)`
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const contents = [
        { role: "user", parts: [{ text: mentorPrompt }] },
        { role: "model", parts: [{ text: "Entendido! Serei o Prof. Cl\xE1udio, mentor acolhedor e especialista do IAS para apoiar educadores e gestores." }] }
      ];
      for (const turn of history) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.content }]
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
      const response = await generateGeminiContent(ai, contents);
      return res.json({ text: response.text || "Desculpe, tive um pequeno problema para processar sua pergunta. Como posso ajudar?" });
    } catch (err) {
      console.error("[Prof. Cl\xE1udio AI Error]:", err);
      return res.status(500).json({ error: err.message || "Erro ao consultar o mentor de IA." });
    }
  });
  app.post("/api/ai/export", async (req, res) => {
    try {
      const { number, text } = req.body;
      const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
      const evolutionKey = process.env.EVOLUTION_API_KEY || "apikey";
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
      if (!number || !text) {
        return res.status(400).json({ error: "Par\xE2metros ausentes." });
      }
      const formattedNumber = `${formatWhatsAppNumber(number)}@s.whatsapp.net`;
      const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionKey
        },
        body: JSON.stringify({
          number: formattedNumber,
          text,
          delay: 500
        })
      });
      if (evoRes.ok) {
        return res.json({ success: true });
      } else {
        const errText = await evoRes.text();
        console.warn("[Evolution API Export Error]:", errText);
        return res.status(500).json({ error: "Erro ao enviar a mensagem via Evolution API." });
      }
    } catch (err) {
      console.error("[Export Route Error]:", err);
      return res.status(500).json({ error: err.message || "Erro interno na rota de exporta\xE7\xE3o." });
    }
  });
  const userRegistry = /* @__PURE__ */ new Map([
    [
      "Professor",
      {
        code: "Professor",
        name: "Fernanda Ribeiro",
        school: "C.E.I. Ayrton Senna",
        institutionalEmail: "professor.senna@escola.ias.org.br",
        personalEmail: "",
        personalWhatsapp: "",
        securityQuestion: "",
        securityAnswer: "",
        password: "1234",
        isFirstAccess: true,
        role: "professor"
      }
    ],
    [
      "Gestor",
      {
        code: "Gestor",
        name: "Marcelo Andrade",
        school: "Diretoria Regional IAS",
        institutionalEmail: "gestor.senna@escola.ias.org.br",
        personalEmail: "",
        personalWhatsapp: "",
        securityQuestion: "",
        securityAnswer: "",
        password: "1234",
        isFirstAccess: true,
        role: "gestor"
      }
    ]
  ]);
  app.post("/api/auth/login", (req, res) => {
    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ error: "Par\xE2metros de login ausentes." });
    }
    const user = userRegistry.get(code);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "C\xF3digo ou senha incorretos." });
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
  app.post("/api/auth/hydrate", (req, res) => {
    const { code, personalEmail, personalWhatsapp, securityQuestion, securityAnswer } = req.body;
    if (!code || !personalEmail || !personalWhatsapp || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: "Campos de hidrata\xE7\xE3o obrigat\xF3rios ausentes." });
    }
    const user = userRegistry.get(code);
    if (!user) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    }
    user.personalEmail = personalEmail;
    user.personalWhatsapp = formatWhatsAppNumber(personalWhatsapp);
    user.securityQuestion = securityQuestion;
    user.securityAnswer = securityAnswer;
    user.isFirstAccess = false;
    console.log(`[Cadastro Hidratado] Usu\xE1rio: ${code}. E-mail: ${personalEmail}, WhatsApp: ${personalWhatsapp}`);
    return res.json({ success: true });
  });
  app.post("/api/auth/recovery-options", (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "C\xF3digo ausente." });
    }
    const user = userRegistry.get(code);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    const hasEmail = !!user.personalEmail;
    const hasWhatsapp = !!user.personalWhatsapp;
    const hasQuestion = !!user.securityQuestion;
    if (!hasEmail && !hasWhatsapp && !hasQuestion) {
      return res.json({ error: "support_only" });
    }
    return res.json({
      success: true,
      email: user.personalEmail || null,
      whatsapp: user.personalWhatsapp || null,
      question: user.securityQuestion || null
    });
  });
  app.post("/api/auth/recovery-send", async (req, res) => {
    try {
      const { code, method, answer } = req.body;
      if (!code || !method) {
        return res.status(400).json({ error: "Par\xE2metros de reset ausentes." });
      }
      const user = userRegistry.get(code);
      if (!user) {
        return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
      }
      const roleLabel = user.role === "gestor" ? "Gestor" : "Professor";
      if (method === "question") {
        if (!answer || answer.toLowerCase().trim() !== user.securityAnswer.toLowerCase().trim()) {
          return res.json({ success: false, error: "Resposta de seguran\xE7a incorreta." });
        }
        return res.json({ success: true, password: user.password });
      }
      if (method === "email") {
        if (!user.personalEmail) {
          return res.status(400).json({ error: "E-mail n\xE3o configurado." });
        }
        if (process.env.RESEND_API_KEY) {
          try {
            await sendEmailViaResend(
              "Portal Socioemocional IAS",
              user.personalEmail,
              "Recupera\xE7\xE3o de senha - Instituto Ayrton Senna",
              `Recupera\xE7\xE3o de acesso

Ol\xE1 ${roleLabel},

Conforme solicitado, enviamos suas credenciais do portal do Instituto Ayrton Senna:

C\xF3digo de Acesso: ${user.code}
Senha: ${user.password}

Por seguran\xE7a, n\xE3o se esque\xE7a de trocar a sua senha assim que acessar!

Instituto Ayrton Senna`,
              `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                  <h2 style="color: #1e293b;">Recupera\xE7\xE3o de acesso</h2>
                  <p>Ol\xE1 <strong>${roleLabel}</strong>,</p>
                  <p>Conforme solicitado, enviamos suas credenciais do portal do Instituto Ayrton Senna:</p>
                  <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; border: 1px solid #e2e8f0; margin: 15px 0;">
                    <strong>C\xF3digo de Acesso:</strong> <code>${user.code}</code><br/>
                    <strong>Senha:</strong> <code>${user.password}</code>
                  </div>
                  <p style="font-size: 13px; color: #475569;">Por seguran\xE7a, n\xE3o se esque\xE7a de trocar a sua senha assim que acessar!</p>
                  <p style="font-size: 12px; color: #64748b;">Instituto Ayrton Senna</p>
                </div>
              `
            );
          } catch (mailErr) {
            console.error("[Recovery Email] Falha ao enviar via Resend:", mailErr);
            return res.status(502).json({ error: "N\xE3o foi poss\xEDvel enviar o e-mail de recupera\xE7\xE3o. Tente novamente em instantes ou contate o suporte." });
          }
        } else {
          console.log(`[Recovery Email] Credenciais enviadas para ${user.personalEmail}: C\xF3digo: ${user.code}, Senha: ${user.password}`);
        }
        return res.json({ success: true, previewUrl: null });
      }
      if (method === "whatsapp") {
        if (!user.personalWhatsapp) {
          return res.status(400).json({ error: "WhatsApp n\xE3o configurado." });
        }
        const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
        const evolutionKey = process.env.EVOLUTION_API_KEY || "apikey";
        const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
        const formattedNumber = `${formatWhatsAppNumber(user.personalWhatsapp)}@s.whatsapp.net`;
        const messageText = `\u{1F511} *Recupera\xE7\xE3o de Acesso - Portal IAS*

Ol\xE1 *${roleLabel}*,

Suas credenciais s\xE3o:
- *C\xF3digo de Acesso:* ${user.code}
- *Senha:* ${user.password}

Guarde essas credenciais com seguran\xE7a.`;
        try {
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": evolutionKey },
            body: JSON.stringify({
              number: formattedNumber,
              text: messageText,
              delay: 500
            })
          });
          if (!evoRes.ok) {
            const errText = await evoRes.text();
            console.error("[Evolution API Password Recovery Error]:", errText);
            return res.status(502).json({ error: "N\xE3o foi poss\xEDvel enviar as credenciais via WhatsApp. Tente novamente em instantes ou contate o suporte." });
          }
        } catch (evoErr) {
          console.error("[Evolution API Password Recovery Dispatch Error]:", evoErr);
          return res.status(502).json({ error: "N\xE3o foi poss\xEDvel enviar as credenciais via WhatsApp. Tente novamente em instantes ou contate o suporte." });
        }
        console.log(`[Recovery WhatsApp] Credenciais enviadas para ${user.personalWhatsapp}: C\xF3digo: ${user.code}, Senha: ${user.password}`);
        return res.json({ success: true });
      }
      return res.status(400).json({ error: "M\xE9todo inv\xE1lido." });
    } catch (err) {
      console.error("[Recovery Send Error]:", err);
      return res.status(500).json({ error: err.message || "Erro ao redefinir acesso." });
    }
  });
  function buildHtmlReport(markdownText, metadata) {
    const colors = {
      primary: "#071131",
      azul: "#0E477A",
      azulDestaque: "#015192",
      verde: "#259E52",
      amarelo: "#F5A800",
      textMain: "#071131",
      textSec: "#526173",
      borda: "#E4EAF0",
      bgSec: "#F6F8FB"
    };
    const paragraphs = markdownText.split("\n\n").filter((p) => p.trim());
    const cleanedParagraphs = paragraphs.map((p) => {
      return p.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${colors.primary};">$1</strong>`).replace(/\*(.*?)\*/g, `<strong>$1</strong>`).replace(/_(.*?)_/g, `<em>$1</em>`).replace(/`(.*?)_/g, `<code style="background-color: ${colors.bgSec}; padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>`);
    });
    const studentName = metadata?.studentName || "";
    const className = metadata?.className || "";
    const isGestor = metadata?.role === "gestor";
    const headerHtml = `
      <div style="background-color: ${colors.primary}; padding: 35px; color: #FFFFFF; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; border-bottom: 4px solid ${colors.amarelo};">
        <span style="font-size: 11px; font-weight: 700; color: ${colors.amarelo}; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 10px;">Instituto Ayrton Senna</span>
        <h1 style="font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2;">Relat\xF3rio Socioemocional</h1>
        <p style="font-size: 14px; font-weight: 600; color: #8fa0dd; margin: 6px 0 0 0;">An\xE1lise Pedag\xF3gica & Interven\xE7\xF5es BNCC</p>
        
        <table style="width: 100%; margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.15); font-size: 13px; color: #FFFFFF;">
          <tr>
            ${studentName ? `
              <td style="padding-right: 20px; vertical-align: top;">
                <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Estudante</span>
                <strong>${studentName}</strong>
              </td>
            ` : ""}
            <td style="padding-right: 20px; vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Turma/Contexto</span>
              <strong>${className || "Todas as Turmas"}</strong>
            </td>
            <td style="padding-right: 20px; vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Destinat\xE1rio</span>
              <strong>${isGestor ? "Gestor Escolar" : "Educador(a)"}</strong>
            </td>
            <td style="vertical-align: top;">
              <span style="color: #8fa0dd; display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">Per\xEDodo</span>
              <strong>2026.2 (Avalia\xE7\xE3o Semestral)</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    const summaryText = cleanedParagraphs[0] || "Relat\xF3rio socioemocional estruturado a partir da \xE1rvore de resultados.";
    let bodyParagraphsHtml = "";
    cleanedParagraphs.slice(1).forEach((cleanP) => {
      const lower = cleanP.toLowerCase();
      const isAcao = lower.includes("a\xE7\xE3o") || lower.includes("interven\xE7\xE3o") || lower.includes("sugest\xE3o pedag\xF3gica") || lower.includes("passos") || lower.includes("1.") || lower.includes("2.");
      const isBncc = lower.includes("bncc") || lower.includes("compet\xEAncia geral") || lower.includes("gerais");
      if (isAcao) {
        bodyParagraphsHtml += `
          <div style="background-color: ${colors.bgSec}; border: 1px solid ${colors.borda}; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 700; color: ${colors.azul}; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="margin-right: 8px;">\u{1F3AF}</span> Uma a\xE7\xE3o para come\xE7ar (Recomenda\xE7\xE3o Priorit\xE1ria)
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
              <span style="margin-right: 8px;">\u{1F33F}</span> Conex\xF5es com as Compet\xEAncias Gerais da BNCC
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
              \u{1F4D6} O que isso pode significar na pr\xE1tica?
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
        <title>Relat\xF3rio Socioemocional - Instituto Ayrton Senna</title>
        <!-- A11y Injection -->
          <link rel="stylesheet" href="/a11y/accessibility.css" />
          <script src="/a11y/accessibility.js"></script>
        </head>
      <body style="background-color: ${colors.bgSec}; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <div style="max-width: 960px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid ${colors.borda}; overflow: hidden; box-shadow: 0 4px 20px rgba(7, 17, 49, 0.04);">
          
          <!-- Cabe\xE7alho Institucional -->
          ${headerHtml}
          
          <!-- Conte\xFAdo -->
          <div style="padding: 35px;">
            
            <!-- Resumo Executivo Destaque -->
            <div style="background-color: #f0f7ff; border: 1px solid #d0e4ff; border-left: 5px solid ${colors.azulDestaque}; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="font-size: 13px; font-weight: 700; color: ${colors.azulDestaque}; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">\u26A1 Em 30 segundos</h2>
              <p style="font-size: 15px; color: ${colors.textMain}; line-height: 1.6; margin: 0; font-weight: 600;">
                ${summaryText}
              </p>
            </div>
            
            <!-- Outras Se\xE7\xF5es Formatadas -->
            ${bodyParagraphsHtml}
            
          </div>
          
          <!-- Rodap\xE9 do Relat\xF3rio -->
          <div style="background-color: ${colors.primary}; padding: 24px 35px; color: #FFFFFF; text-align: center; font-size: 12px; border-top: 4px solid ${colors.amarelo};">
            <p style="margin: 0 0 8px 0; color: #8fa0dd; font-weight: 600;">
              Este relat\xF3rio apoia a reflex\xE3o pedag\xF3gica e deve ser interpretado em conjunto com outras evid\xEAncias e com o contexto do estudante.
            </p>
            <p style="margin: 0 0 12px 0; color: #8fa0dd; opacity: 0.85;">
              Relat\xF3rio exportado do portal socioemocional a pedido do educador.
            </p>
            <p style="margin: 0; color: #ffffff; font-weight: 700;">
              \xA9 2026 Instituto Ayrton Senna. Todos os direitos reservados.
            </p>
          </div>
          
        </div>
        
      </body>
      </html>
    `;
  }
  app.post("/api/ai/export-email", async (req, res) => {
    try {
      const { email, text, metadata } = req.body;
      if (!email || !text) {
        return res.status(400).json({ error: "Par\xE2metros ausentes." });
      }
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY n\xE3o configurada.");
      }
      const htmlBody = buildHtmlReport(text, metadata);
      await sendEmailViaResend(
        "Prof. Cl\xE1udio - Mentor IAS",
        email,
        "\u{1F4CA} Relat\xF3rio Socioemocional & Recomenda\xE7\xF5es BNCC",
        text,
        htmlBody
      );
      console.log(`[E-mail Enviado] Enviado via Resend para ${email}`);
      return res.json({
        success: true,
        previewUrl: null
      });
    } catch (err) {
      console.error("[E-mail Route Error]:", err);
      return res.status(500).json({ error: err.message || "Erro ao processar envio do e-mail." });
    }
  });
  app.post("/api/auth-recovery/request", async (req, res) => {
    try {
      const { name, studentClass, phoneNumber } = req.body;
      if (!name || !studentClass || !phoneNumber) {
        return res.status(400).json({ error: "Par\xE2metros ausentes." });
      }
      const reqId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const formattedPhone = formatWhatsAppNumber(phoneNumber);
      activeAccessRequests.set(reqId, {
        id: reqId,
        studentName: name,
        studentClass,
        teacherPhone: formattedPhone,
        status: "waiting",
        createdAt: Date.now()
      });
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
      const messageText = `\u{1F514} *Solicita\xE7\xE3o de Acesso - Portal IAS*

Ol\xE1 Educador(a), o estudante *${name}* da turma *${studentClass}* esqueceu seu c\xF3digo de acesso e est\xE1 solicitando autoriza\xE7\xE3o para entrar no portal.

\u26A0\uFE0F *Por medida de seguran\xE7a para evitar cliques acidentais*, responda a esta mensagem digitando uma das palavras abaixo:

\u{1F449} Digite *APROVAR* para autorizar a entrada do estudante.
\u{1F449} Digite *RECUSAR* para negar a entrada e direcion\xE1-lo \xE0 secretaria.

_Esta solicita\xE7\xE3o expirar\xE1 automaticamente se n\xE3o for respondida em at\xE9 10 minutos._`;
      console.log(`[Recupera\xE7\xE3o de Acesso] Novo pedido registrado ID: ${reqId} para ${name}. Disparando para o WhatsApp: ${formattedPhone}`);
      let methodUsed = "console_only";
      if (evolutionUrl && evolutionKey) {
        try {
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": evolutionKey
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: messageText,
              delay: 1e3
            })
          });
          if (evoRes.ok) {
            methodUsed = "evolution_api_text";
            console.log(`[Recupera\xE7\xE3o de Acesso] Mensagem de texto enviada com sucesso via Evolution API.`);
          } else {
            const errData = await evoRes.text();
            console.warn("[Recupera\xE7\xE3o de Acesso] Falha no envio do sendText:", evoRes.status, errData);
          }
        } catch (evoErr) {
          console.warn("[Recupera\xE7\xE3o de Acesso] Falha ao tentar contato com Evolution API:", evoErr);
        }
      }
      return res.json({ success: true, id: reqId, method: methodUsed });
    } catch (err) {
      console.error("[Recupera\xE7\xE3o de Acesso] Erro geral:", err);
      return res.status(500).json({ error: err.message || "Erro ao registrar solicita\xE7\xE3o" });
    }
  });
  app.get("/api/auth-recovery/status/:id", async (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    if (!request) {
      return res.json({ status: "rejected", reason: "expired_or_not_found" });
    }
    if (request.status === "waiting" && Date.now() - request.createdAt > RECOVERY_REQUEST_TTL_MS) {
      await expireRecoveryRequest(request);
    }
    if (request.status === "expired") {
      return res.json({ status: "rejected", reason: "expired" });
    }
    return res.json({ status: request.status });
  });
  app.get("/api/auth-recovery/approve/:id", (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    if (!request) {
      return res.send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F4F5F8; color:#0B1226;">
            <h2>\u26A0\uFE0F Solicita\xE7\xE3o n\xE3o encontrada ou j\xE1 expirada.</h2>
            <p>O limite de tempo de 10 minutos para autorizar o acesso expirou.</p>
          </body>
        </html>
      `);
    }
    request.status = "approved";
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
          <div class="badge">Acesso Autorizado \u2713</div>
          <h1>Entrada Concedida!</h1>
          <p>O acesso para o estudante <strong>${request.studentName}</strong> (turma <strong>${request.studentClass}</strong>) foi liberado com sucesso.</p>
          <p>A tela do aluno ser\xE1 atualizada automaticamente em instantes.</p>
        </div>
      </body>
      </html>
    `);
  });
  app.get("/api/auth-recovery/reject/:id", (req, res) => {
    const { id } = req.params;
    const request = activeAccessRequests.get(id);
    if (!request) {
      return res.send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F4F5F8; color:#0B1226;">
            <h2>\u26A0\uFE0F Solicita\xE7\xE3o n\xE3o encontrada ou j\xE1 expirada.</h2>
          </body>
        </html>
      `);
    }
    request.status = "rejected";
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
          <div class="badge">Acesso Negado \u2717</div>
          <h1>Pedido Recusado</h1>
          <p>O pedido de acesso para o estudante <strong>${request.studentName}</strong> foi recusado.</p>
          <p>O aluno recebeu a instru\xE7\xE3o de procurar a secretaria para regularizar seu cadastro.</p>
        </div>
      </body>
      </html>
    `);
  });
  app.post("/api/send-whatsapp-invite", async (req, res) => {
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
      const existing = whatsAppMemoryStore.get(formattedPhone) || { history: [] };
      whatsAppMemoryStore.set(formattedPhone, {
        ...existing,
        studentName: name || existing.studentName || "Estudante",
        school: school || existing.school,
        grade: grade || existing.grade,
        city: city || existing.city,
        interests: Array.isArray(interests) ? interests.join(", ") : interests || existing.interests,
        interestDetail: interestDetail || existing.interestDetail,
        arquetipo: arquetipo || existing.arquetipo || "Inovador Estrat\xE9gico",
        superPoder: superPoder || existing.superPoder,
        desafioDesenvolvimento: desafioDesenvolvimento || existing.desafioDesenvolvimento
      });
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
      const defaultMessage = `Oi, ${name || "parceiro"}! Aqui \xE9 o B\xE9co do Instituto Ayrton Senna! \u{1F680}

Vi aqui que seu perfil no laborat\xF3rio foi *${arquetipo || "Inovador Estrat\xE9gico"}*! \u{1F3C6}

\u{1F4AC} Vou continuar contigo por aqui pra te ajudar no que ainda \xE9 desafiador pra voc\xEA! Sempre que tiver uma d\xFAvida, desafio escolar ou quiser trocar uma ideia, \xE9 s\xF3 me mandar uma mensagem aqui!`;
      if (evolutionUrl && evolutionKey) {
        try {
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": evolutionKey
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: defaultMessage,
              delay: 1200
            })
          });
          if (evoRes.ok) {
            return res.json({ success: true, method: "evolution_api", phone: formattedPhone });
          } else {
            const errData = await evoRes.text();
            console.warn("Evolution API response non-ok:", evoRes.status, errData);
          }
        } catch (evoErr) {
          console.warn("Evolution API local dispatch warning:", evoErr);
        }
      }
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(defaultMessage)}`;
      return res.json({ success: true, method: "wa_link", url: waUrl, phone: formattedPhone });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erro ao processar convite do WhatsApp" });
    }
  });
  app.post("/api/evolution-webhook", async (req, res) => {
    res.status(200).json({ received: true });
    try {
      const body = req.body;
      console.log("Incoming Evolution Webhook event:", body?.event);
      const data = body.data || body;
      const messageList = Array.isArray(data) ? data : [data];
      for (const item of messageList) {
        if (item.key?.fromMe) continue;
        const remoteJid = item.key?.remoteJid || "";
        const rawNumber = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
        if (!rawNumber) continue;
        const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
        const evolutionKey = process.env.EVOLUTION_API_KEY || "BecoIAS2026";
        const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
        const messageObj = item.message || {};
        const isMedia = messageObj.imageMessage || messageObj.videoMessage || messageObj.audioMessage || messageObj.stickerMessage || messageObj.documentMessage || messageObj.documentWithCaptionMessage;
        if (isMedia) {
          await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": evolutionKey },
            body: JSON.stringify({
              number: rawNumber,
              text: "Opa! Por enquanto eu s\xF3 consigo ler mensagens de texto por aqui \u{1F4DD} Manda sua d\xFAvida ou ideia em texto que a gente desenrola!",
              delay: 1e3
            })
          });
          continue;
        }
        const userText = messageObj.conversation || messageObj.extendedTextMessage?.text || messageObj.editedMessage?.message?.protocolMessage?.editedMessage?.conversation || messageObj.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text || "";
        if (!userText || !userText.trim()) continue;
        const normalizedText = userText.trim().toUpperCase();
        if (normalizedText === "APROVAR" || normalizedText === "RECUSAR") {
          const isApprove = normalizedText === "APROVAR";
          let foundRequest = null;
          for (const [id, reqObj] of activeAccessRequests.entries()) {
            if (reqObj.teacherPhone === rawNumber && reqObj.status === "waiting") {
              if (!foundRequest || reqObj.createdAt > foundRequest.createdAt) {
                foundRequest = reqObj;
              }
            }
          }
          if (foundRequest && Date.now() - foundRequest.createdAt > RECOVERY_REQUEST_TTL_MS) {
            await expireRecoveryRequest(foundRequest);
            foundRequest = null;
          }
          if (foundRequest) {
            const statusText = isApprove ? "APROVADO" : "REPROVADO";
            foundRequest.status = isApprove ? "approved" : "rejected";
            activeAccessRequests.set(foundRequest.id, foundRequest);
            console.log(`[Recupera\xE7\xE3o de Acesso Webhook] Resposta por texto processada: ${normalizedText} para ID: ${foundRequest.id}`);
            logTelemetry("whatsapp", "password_recovery_action", { action: statusText, student: foundRequest.studentName });
            logDeSenhaPerdida.push({
              id: foundRequest.id,
              studentName: foundRequest.studentName,
              studentClass: foundRequest.studentClass,
              teacherPhone: foundRequest.teacherPhone,
              status: statusText,
              timestamp: Date.now()
            });
            const responseText = isApprove ? `\u2705 *Acesso Confirmado!*

O acesso do estudante *${foundRequest.studentName}* (turma *${foundRequest.studentClass}*) foi liberado com sucesso no portal.` : `\u274C *Acesso Recusado!*

O acesso do estudante *${foundRequest.studentName}* foi bloqueado. Ele foi instru\xEDdo a procurar a secretaria escolar.`;
            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: responseText,
                delay: 500
              })
            });
            const logMessage = `\u{1F4CB} *Registro de Log - Recupera\xE7\xE3o de Senha*
- Estudante: ${foundRequest.studentName}
- Turma: ${foundRequest.studentClass}
- Status: ${statusText}`;
            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: logMessage,
                delay: 1500
                // 1.5 segundos de atraso para enviar depois
              })
            });
          } else {
            console.log(`[Recupera\xE7\xE3o de Acesso Webhook] Nenhuma solicita\xE7\xE3o pendente encontrada para o professor: ${rawNumber}`);
            await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": evolutionKey },
              body: JSON.stringify({
                number: rawNumber,
                text: `Ol\xE1! N\xE3o encontrei nenhuma solicita\xE7\xE3o de acesso pendente para este n\xFAmero no momento.`,
                delay: 500
              })
            });
          }
          continue;
        }
        console.log(`[WhatsApp B\xE9co] Message from ${rawNumber} (${item.pushName || "Estudante"}): "${userText}"`);
        let mem = whatsAppMemoryStore.get(rawNumber);
        if (!mem) {
          mem = {
            studentName: item.pushName || "Estudante",
            arquetipo: "Inovador Estrat\xE9gico",
            superPoder: "Pensamento cr\xEDtico e imagina\xE7\xE3o criativa",
            desafioDesenvolvimento: "Aprofundar argumentos e fundamentar ideias",
            history: []
          };
          whatsAppMemoryStore.set(rawNumber, mem);
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
          await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": evolutionKey },
            body: JSON.stringify({
              number: rawNumber,
              text: `E a\xED ${mem.studentName}! Recebi sua mensagem: "${userText}". T\xF4 pronto pra te ajudar nos seus desafios!`,
              delay: 1e3
            })
          });
          continue;
        }
        const ai = new import_genai.GoogleGenAI({ apiKey });
        if (mem.history.length >= 10) {
          try {
            const oldTurns = mem.history.slice(0, -4);
            const summaryPrompt = `Voc\xEA \xE9 o sistema de s\xEDntese de mem\xF3ria do B\xE9co (Instituto Ayrton Senna).
Sintetize em 2 a 3 frases essenciais os pontos conversados, desafios superados, d\xFAvidas e t\xF3picos discutidos com o(a) aluno(a) ${mem.studentName || ""}:
${oldTurns.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
            const summaryRes = await generateGeminiContent(ai, summaryPrompt);
            mem.summaryMemory = (mem.summaryMemory ? mem.summaryMemory + "\n" : "") + (summaryRes.text || "");
            mem.history = mem.history.slice(-4);
          } catch (sumErr) {
            console.warn("Memory compaction error:", sumErr);
          }
        }
        const systemInstruction = `# PERSONA & IDENTIDADE
Voc\xEA \xE9 o **B\xE9co**, o mentor e parceiro inteligente do Instituto Ayrton Senna (IAS).
Voc\xEA est\xE1 conversando diretamente com o estudante no WhatsApp dele de forma cont\xEDnua, amig\xE1vel e acolhedora.

# CONTEXTO DO ESTUDANTE
- Nome: ${mem.studentName || "Estudante"}
- Escola: ${mem.school || "N\xE3o especificada"} | Ano: ${mem.grade || "Ensino M\xE9dio/Fundamental"} | Cidade: ${mem.city || "Brasil"}
- Interesses: ${mem.interests || "Gerais"} (${mem.interestDetail || ""})
- Perfil IAS: ${mem.arquetipo || "Inovador Estrat\xE9gico"}
- Superpoder: ${mem.superPoder || "Curiosidade e imagina\xE7\xE3o ativa"}
- Desafio de Evolu\xE7\xE3o: ${mem.desafioDesenvolvimento || "Articular argumentos e estruturar ideias"}
${mem.summaryMemory ? `- Mem\xF3ria executiva das conversas anteriores: ${mem.summaryMemory}` : ""}

# DIRETRIZES DE COMUNICA\xC7\xC3O NO WHATSAPP
1. **Linguagem Natural de WhatsApp**:
   - Use tom jovem brasileiro, acolhedor e pr\xF3ximo (voc\xEA \xE9 um parceiro de jornada, n\xE3o um professor formal).
   - Use emojis de forma org\xE2nica (\u26A1, \u{1F4A1}, \u{1F680}, \u{1F440}, \u{1F44A}, \u{1F9E0}).
   - Respostas curtas e din\xE2micas (1 a 3 frases, no m\xE1ximo 2 pequenos par\xE1grafos). NUNCA mande text\xE3o ou explica\xE7\xF5es acad\xEAmicas longas.

2. **Racioc\xEDnio Socr\xE1tico & Mentoria Formativa**:
   - Se o aluno pedir ajuda com uma tarefa, d\xFAvida ou dever de casa, nunca d\xEA a resposta pronta.
   - Fa\xE7a perguntas reflexivas que estimulem o racioc\xEDnio pr\xF3prio e a curiosidade do aluno.
   - Conecte as d\xFAvidas com os interesses e o superpoder dele sempre que fizer sentido.

3. **Cultura de Mindset de Crescimento**:
   - Valorize o esfor\xE7o, a tentativa, a curiosidade e o processo de aprender com erros.

4. **Seguran\xE7a e Foco**:
   - Mantenha foco em aprendizado, pensamento cr\xEDtico, criatividade, projetos da escola e desenvolvimento pessoal.`;
        const contents = [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "model", parts: [{ text: "Entendido! Estou no papel do B\xE9co no WhatsApp. Respostas curtas, acolhedoras e socr\xE1ticas." }] }
        ];
        for (const turn of mem.history) {
          contents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.content }]
          });
        }
        contents.push({
          role: "user",
          parts: [{ text: userText }]
        });
        const response = await generateGeminiContent(ai, contents);
        const replyText = response.text || `T\xF4 aqui contigo, ${mem.studentName}! O que acha da gente pensar nisso por outro \xE2ngulo? \u{1F4A1}`;
        mem.history.push({ role: "user", content: userText });
        mem.history.push({ role: "model", content: replyText });
        whatsAppMemoryStore.set(rawNumber, mem);
        logTelemetry("whatsapp", "beco_interaction", {
          studentName: mem.studentName,
          userText
        });
        console.log(`[WhatsApp B\xE9co] Replying to ${rawNumber}: "${replyText}"`);
        await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": evolutionKey },
          body: JSON.stringify({
            number: rawNumber,
            text: replyText,
            delay: 1200
          })
        });
      }
    } catch (whErr) {
      console.error("Webhook processing error:", whErr);
    }
  });
  const sennaLoginDist = import_path.default.join(process.cwd(), "platforms_dist", "SennaLogin");
  const sennaTesteDist = import_path.default.join(process.cwd(), "platforms_dist", "Senna");
  const autoavaliacaoDist = import_path.default.join(process.cwd(), "platforms_dist", "autoavaliacao");
  const hackathonDist = import_path.default.join(process.cwd(), "platforms_dist", "hackathon");
  app.use("/login", import_express.default.static(sennaLoginDist));
  app.use("/teste", import_express.default.static(sennaTesteDist));
  app.use("/autoavaliacao", import_express.default.static(autoavaliacaoDist));
  app.use("/hackathon", import_express.default.static(hackathonDist));
  app.use("/beco-intro.mp4", import_express.default.static(import_path.default.join(hackathonDist, "beco-intro.mp4")));
  app.use("/beco-intro.mp4.mp4", import_express.default.static(import_path.default.join(hackathonDist, "beco-intro.mp4.mp4")));
  app.get("/login/*", (req, res) => {
    res.sendFile(import_path.default.join(sennaLoginDist, "index.html"));
  });
  app.get("/teste/*", (req, res) => {
    res.sendFile(import_path.default.join(sennaTesteDist, "index.html"));
  });
  app.get("/autoavaliacao/*", (req, res) => {
    res.sendFile(import_path.default.join(autoavaliacaoDist, "index.html"));
  });
  app.get("/hackathon/*", (req, res) => {
    res.sendFile(import_path.default.join(hackathonDist, "index.html"));
  });
  app.get("/", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Instituto Ayrton Senna - Portal de Compet\xEAncias</title>
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
          .card-header h3 {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -0.3px;
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
            align-items: start;
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
            justify-content: flex-start;
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
            <h1 class="welcome-title">Ol\xE1, avaliador(a)!</h1>
            <p class="welcome-subtitle">Seja bem-vindo ao Portal IAS. Nosso time pensou na melhor experi\xEAncia de uso para voc\xEA acessar os prot\xF3tipos.</p>

            <div class="welcome-layout-grid">
              <!-- Coluna da Esquerda: O que voc\xEA precisa saber & Pilares -->
              <div class="welcome-info-col">
                <div>
                  <p><strong>O que voc\xEA precisa saber:</strong></p>
                  <ol>
                    <li>Todas as 8 dores do edital foram resolvidas;</li>
                    <li>Desenvolvemos 5 prot\xF3tipos para essas dores. Em cada um, apresentamos nome, dor e solu\xE7\xE3o;</li>
                    <li>Clique em <strong>"Acessar prot\xF3tipo"</strong> para navegar em cada um deles;</li>
                    <li>Todos os prot\xF3tipos seguem os 3 pilares fundamentais:
                      <ul class="welcome-pillars-bullets">
                        <li>Intencionalidade pedag\xF3gica</li>
                        <li>IA contextualizada</li>
                        <li>Personaliza\xE7\xE3o</li>
                      </ul>
                    </li>
                    <li>
                      <button type="button" onclick="document.getElementById('modal-pedagogico').style.display = 'flex'" style="background: #EFF6FF; color: #0E477A; border: 1px solid #DBEAFE; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 800; cursor: pointer;">Fundamenta\xE7\xE3o pedag\xF3gica</button>
                    </li>
                  </ol>

                  <div class="welcome-important">
                    <p><strong>Importante:</strong> para que voc\xEA possa testar as solu\xE7\xF5es, \xE9 fundamental informar aqui um e-mail e WhatsApp v\xE1lidos.</p>
                    <p>N\xE3o se preocupe. Assim que voc\xEA fechar essa p\xE1gina, os dados ser\xE3o apagados.</p>
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
                    <span>\u{1F510}</span> Credenciais do prot\xF3tipo de login
                  </div>
                  <div class="welcome-credentials-chips">
                    <div class="user-role-chip">Estudante</div>
                    <div class="user-role-chip">Professor</div>
                    <div class="user-role-chip">Gestor</div>
                  </div>
                  <div class="credential-pwd-chip">
                    <span>\u{1F511} Senha para todos:</span> <strong>1234</strong>
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
                  <div class="welcome-error" id="welcome-error">Informe um e-mail e um WhatsApp v\xE1lidos para continuar.</div>
                  <button type="submit" class="welcome-submit-btn">Acessar Prot\xF3tipos \u2192</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div style="padding: 30px 40px 10px 40px;">
          <h1 class="hero-title">Navegue abaixo pelos prot\xF3tipos</h1>
        </div>
        </div>

        <div class="main-grid">
          <!-- CARD 1: Logins & Dashboards -->
          <a href="/login/" class="card">
            <div class="card-header">
              <div>
                <h3>Logins e relat\xF3rios</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Vis\xF5es: Estudante, Professor e Gestor</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-frictional">Cadastro Friccional</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Coletamos mais dados do(a) professor(a) para que ele tenha mais canais para recuperar sua senha.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Gest\xE3o de Credenciais</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> O estudante que esquecer seu login ou sua senha poder\xE1 pedir acesso por WhatsApp ao respons\xE1vel na escola e acessar instantaneamente ap\xF3s aprova\xE7\xE3o.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Autentica\xE7\xE3o de Professores</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Acesso garantido por fluxo real de recupera\xE7\xE3o via e-mail real, WhatsApp (usar API oficial Meta) ou perguntas-chaves baseadas no cadastro.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avalia\xE7\xE3o \xE0 A\xE7\xE3o</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> O prof. Cl\xE1udio (bot de IA) sugere planos de a\xE7\xE3o pedag\xF3gicos pr\xE1ticos e curtos baseados na BNCC para facilitar o cruzamento do professor entre relat\xF3rio recebido e instru\xE7\xE3o do material socioemocional usado na escola.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar prot\xF3tipo &rarr;</span>
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
              <div class="credentials-chip">Vis\xE3o: Estudante</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Engajamento de Jovens</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Jornada guiada pelo mentor B\xE9co com marcos inspirados no universo dos estudantes. Monitora desaten\xE7\xE3o (Fast-Click) e sugere exerc\xEDcios de desacelera\xE7\xE3o e respira\xE7\xE3o, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Dados na Gaveta</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Devolutiva imediata que traduz os resultados socioemocionais do estudante em perfis que fazem parte do universo dele e que pode ser exportado.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avalia\xE7\xE3o \xE0 A\xE7\xE3o</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> B\xE9co (mentor de IA) para acompanh\xE1-lo no WhatsApp nas d\xFAvidas surgidas posteriormente ao teste, utilizando racioc\xEDnio socr\xE1tico e com bloqueios mandat\xF3rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar prot\xF3tipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 3: Autoavalia\xE7\xE3o -->
          <a href="/autoavaliacao/" class="card">
            <div class="card-header">
              <div>
                <h3>Autoavalia\xE7\xE3o socioemocional</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Vis\xE3o: Estudante</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Engajamento de Jovens</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Jornada guiada pelo mentor B\xE9co com marcos inspirados no universo dos estudantes. Monitora desaten\xE7\xE3o (Fast-Click) e sugere exerc\xEDcios de desacelera\xE7\xE3o e respira\xE7\xE3o, mas sem travar o progresso do estudante.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Dados na Gaveta</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Devolutiva imediata que traduz os resultados socioemocionais do estudante em perfis que fazem parte do universo dele.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avalia\xE7\xE3o \xE0 A\xE7\xE3o</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> B\xE9co (mentor de IA) para acompanh\xE1-lo no WhatsApp nas d\xFAvidas surgidas posteriormente ao teste, utilizando racioc\xEDnio socr\xE1tico e com bloqueios mandat\xF3rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar prot\xF3tipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 4: Criatividade & Cr\xEDtico -->
          <a href="/hackathon/" class="card">
            <div class="card-header">
              <div>
                <h3>Criatividade e pensamento cr\xEDtico</h3>
              </div>
            </div>
            <div class="card-body">
              <div class="credentials-chip">Vis\xE3o: Estudante</div>

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-engagement">Engajamento de Jovens</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Personaliza\xE7\xE3o com IA: a intelig\xEAncia artificial gera enunciados din\xE2micos baseados nos hobbies e interesses do aluno.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Dados na Gaveta</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Devolutiva imediata que traduz os resultados socioemocionais do estudante em perfis que fazem parte do universo dele e que pode ser exportado
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-action">Da Avalia\xE7\xE3o \xE0 A\xE7\xE3o</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> B\xE9co (mentor de IA) para acompanh\xE1-lo no WhatsApp nas d\xFAvidas surgidas posteriormente ao teste, utilizando racioc\xEDnio socr\xE1tico, e para criar planos de desenvolvimento. Inclui bloqueios mandat\xF3rios para evitar desvios para outros assuntos.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar prot\xF3tipo &rarr;</span>
            </div>
          </a>

          <!-- CARD 5: App IAS Offline -->
          <div class="card" style="cursor: pointer;" onclick="document.getElementById('modal-offline').style.display = 'flex'">
            <div class="card-header">
              <div>
                <h3 style="font-size: 16px;">App IAS offline first</h3>
              </div>
            </div>
            <div class="card-body">

              <ul class="pain-list">
                <li class="pain-item">
                  <span class="pain-badge badge-connect">Falta de Conectividade</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> Execut\xE1vel desktop de 15MB que roda testes, inclusive usando intelig\xEAncia artificial, <em>100% desconectado localmente</em>.
                </li>
                <li class="pain-item">
                  <span class="pain-badge badge-auth">Sincroniza\xE7\xE3o Ativa</span><br>
                  <strong>Solu\xE7\xE3o proposta:</strong> O app salva localmente sem perder dados e envia avalia\xE7\xF5es silenciosamente assim que o laborat\xF3rio conectar-se por 1 minuto.
                </li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="btn-access">Acessar descri\xE7\xE3o &rarr;</span>
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
              <h4 style="font-size: 14px; font-weight: 800; color: #0E477A; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Como funciona na pr\xE1tica</h4>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                O IAS fornece um programa leve que pode ser baixado em um pen-drive e instalado nos computadores do laborat\xF3rio escolar. Esse "aplicativo" tem a exata mesma apar\xEAncia dos testes na internet e hospeda o rob\xF4 de intelig\xEAncia artificial em seu interior. Os estudantes fazem a avalia\xE7\xE3o com os computadores totalmente offline, e o aplicativo salva tudo no disco da m\xE1quina de forma segura. Quando a m\xE1quina capta algum pulso m\xEDnimo de internet, o aplicativo envia as provas silenciosamente para os servidores centrais do IAS.
              </p>
            </div>

            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; border-radius: 0 12px 12px 0;">
              <h4 style="font-size: 14px; font-weight: 800; color: #166534; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Detalhamento t\xE9cnico</h4>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 10px;">
                <li><strong>Stack Desktop:</strong> O portal \xE9 transpilado via framework <strong>Tauri</strong>. Ao utilizar Rust e o WebView nativo do SO, criamos bin\xE1rios de execu\xE7\xE3o (app) incrivelmente leves (cerca de 15 a 20MB) que carregam instantaneamente e consomem o m\xEDnimo de RAM nas m\xE1quinas defasadas das escolas p\xFAblicas.</li>
                <li><strong>Banco de Dados Local-First:</strong> Utiliza-se um banco de dados embutido no disco local, como o <strong>SQLite</strong> ou <strong>RxDB</strong>. O RxDB possui mecanismos ativos que sincronizam assincronamente os JSONs armazenados com um banco na nuvem (PostgreSQL) sem gerar conflitos.</li>
                <li><strong>IA Offline Quantizada (SLM):</strong> Para manter os chats generativos com os alunos adaptados \xE0s dores de engajamento sem estourar chamadas de API, o bin\xE1rio empacota um <strong>Small Language Model (ex: Llama-3-8B ou Phi-3-Mini)</strong> em formato <code>.gguf</code> quantizado em 4-bit. Utilizando a engine <strong>llama.cpp</strong> injetada no Tauri, a infer\xEAncia roda diretamente na CPU dos computadores escolares (dispensando placas de v\xEDdeo) exigindo n\xE3o mais do que 1.8GB a 3.8GB de RAM local, provendo dinamicidade offline.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Modal: Fundamenta\xE7\xE3o Pedag\xF3gica -->
        <div id="modal-pedagogico" style="display: none; position: fixed; inset: 0; z-index: 10000; background: rgba(11, 18, 38, 0.8); backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;">
          <div style="background: white; border-radius: 24px; padding: 40px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <button onclick="document.getElementById('modal-pedagogico').style.display = 'none'" style="position: absolute; top: 24px; right: 24px; background: #F1F5F9; border: none; width: 36px; height: 36px; border-radius: 18px; font-weight: bold; cursor: pointer; color: #475569; font-size: 16px;">X</button>

            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
              <div>
                <h2 style="font-size: 24px; font-weight: 900; color: #071131; margin: 0;">Fundamenta\xE7\xE3o te\xF3rica: personaliza\xE7\xE3o e cultura pop no bot e nos testes do IAS</h2>
                <span style="font-size: 13.5px; color: #5B6472; font-weight: 600;">Projeto: Bot de pensamento cr\xEDtico e criatividade + personaliza\xE7\xE3o "envelope" de hobbies e cultura pop para os testes do IAS</span>
              </div>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin: 0 0 20px 0;">
              <strong>Escopo deste documento:</strong> apresentar a fonte te\xF3rica que orientou a decis\xE3o de design de usar elementos de cultura pop, hobbies e interesses pessoais do estudante em dois componentes do projeto: (1) o bot de intera\xE7\xE3o com o estudante, e (2) o envelope de personaliza\xE7\xE3o com elementos de cultura pop aplicado aos testes do IAS, sem alterar, em nenhum dos dois casos, o m\xE9todo de aplica\xE7\xE3o, as escalas ou os crit\xE9rios de pontua\xE7\xE3o do instrumento.
            </p>

            <div style="background: #F1F5F9; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
              <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 8px 0;">
                <strong>Natureza deste documento:</strong> este texto tem finalidade documental e de rastreabilidade \u2014 registrar qual literatura embasou a decis\xE3o de design, n\xE3o afirmar que a decis\xE3o est\xE1 cientificamente "provada" ou \xE9 a \xFAnica leitura poss\xEDvel.
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0;">
                Como detalhado na Se\xE7\xE3o 6, os estudos citados s\xE3o objeto de debate acad\xEAmico ativo, t\xEAm tamanhos de efeito modestos e nem sempre se replicam. O documento n\xE3o deve ser lido como valida\xE7\xE3o cient\xEDfica do produto, e sim como registro de que a escolha de design n\xE3o foi arbitr\xE1ria \u2014 foi orientada por um corpo espec\xEDfico e identific\xE1vel de pesquisa em psicologia educacional e em medi\xE7\xE3o educacional.
              </p>
            </div>

            <div style="background: #F8FAFC; border-left: 4px solid #FBB800; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #0E477A; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">1. A decis\xE3o de design em uma frase</h4>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 10px 0;">
                O projeto tem dois componentes de personaliza\xE7\xE3o, de import\xE2ncia equivalente para esta fundamenta\xE7\xE3o:
              </p>
              <ol style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 10px 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
                <li><strong>O bot</strong> \u2014 a intera\xE7\xE3o com o estudante usa exemplos e analogias conectados a interesses pessoais declarados (jogos, s\xE9ries, esportes, m\xFAsica, etc.), personalizando a intera\xE7\xE3o, em vez de usar exemplos gen\xE9ricos.</li>
                <li><strong>O envelope de cultura pop aplicado aos testes do IAS</strong> \u2014 os itens de teste podem ter sua reda\xE7\xE3o de superf\xEDcie (cen\xE1rio, contexto, refer\xEAncias) adaptada aos interesses do estudante.</li>
              </ol>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 10px 0;">
                Em ambos os casos, o instrumento em si n\xE3o muda: no bot, isso significa que o conte\xFAdo pedag\xF3gico e o objetivo da intera\xE7\xE3o permanecem os mesmos independentemente do envelope; nos testes, significa que a estrutura l\xF3gica dos itens, o crit\xE9rio de resposta correta e a escala de pontua\xE7\xE3o do IAS permanecem inalterados.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                Essa distin\xE7\xE3o \u2014 conte\xFAdo/instrumento intocado vs. camada de apresenta\xE7\xE3o personalizada \u2014 \xE9 o que a literatura de motiva\xE7\xE3o educacional recomenda (Se\xE7\xF5es 2\u20133, aplic\xE1vel a ambos os componentes) e o que a literatura de medi\xE7\xE3o educacional trata como o desenho mais defens\xE1vel especificamente quando a personaliza\xE7\xE3o toca itens de avalia\xE7\xE3o (Se\xE7\xE3o 4, aplic\xE1vel ao envelope dos testes).
              </p>
            </div>

            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #166534; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">2. Por que isso deveria funcionar: pilares te\xF3ricos comuns aos dois componentes</h4>

              <p style="font-size: 13.5px; font-weight: 800; color: #166534; margin: 0 0 6px 0;">2.1 O interesse pessoal como "gancho" de entrada (Hidi & Renninger)</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 10px 0;">
                O Modelo de Quatro Fases do Desenvolvimento do Interesse (Hidi & Renninger, 2006, Educational Psychologist) descreve o interesse como algo que se constr\xF3i em fases \u2014 come\xE7ando por um interesse situacional disparado por um est\xEDmulo externo (novidade, relev\xE2ncia pessoal), que pode evoluir para interesse mantido e, com o tempo, para interesse individual duradouro.
              </p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 10px 0;">
                Isso justifica o uso do envelope tanto no bot quanto nos testes: o elemento de cultura pop/hobby n\xE3o \xE9 o objetivo pedag\xF3gico em si \u2014 \xE9 o gatilho que capta a aten\xE7\xE3o do estudante no momento em que ele encontra o exemplo, seja durante a intera\xE7\xE3o com o bot, seja ao ler o enunciado de um item de teste. A literatura descreve esse gatilho externo como, para muitos alunos, um facilitador pr\xE1tico para que a aten\xE7\xE3o sustentada aconte\xE7a, especialmente antes que haja interesse intr\xEDnseco j\xE1 estabelecido pelo tema (pensamento cr\xEDtico/criatividade em si).
              </p>
              <p style="font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 4px 0;">Mapeamento das duas fases do modelo aos dois componentes do projeto:</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 8px 0;">
                O projeto pode ser lido, \xE0 luz do modelo, como cobrindo deliberadamente as duas primeiras das quatro fases:
              </p>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 10px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;">
                <li><strong>Fase 1 \u2014 Interesse situacional desperto:</strong> corresponde diretamente ao envelope de cultura pop/personaliza\xE7\xE3o, presente tanto no bot quanto nos testes. \xC9 o est\xEDmulo pontual de entrada \u2014 a refer\xEAncia ao hobby, jogo ou s\xE9rie do estudante \u2014 cuja fun\xE7\xE3o \xE9 captar aten\xE7\xE3o no momento em que o exemplo \xE9 apresentado, atrav\xE9s de reconhecimento e relev\xE2ncia pessoal imediata. Essa fase \xE9 igualmente aplic\xE1vel ao envelope do bot e ao envelope dos testes, j\xE1 que em ambos o mecanismo \xE9 o mesmo: um est\xEDmulo de superf\xEDcie ligado ao interesse do estudante.</li>
                <li><strong>Fase 2 \u2014 Interesse situacional mantido:</strong> corresponde \xE0 intera\xE7\xE3o continuada com o bot e no engajamento com os testes, na medida em que eles sustentam o engajamento do estudante al\xE9m do est\xEDmulo inicial. Esta correspond\xEAncia depende do desenho conversacional espec\xEDfico do bot: ela \xE9 mais direta se a intera\xE7\xE3o envolver algum mecanismo de sustenta\xE7\xE3o ativa (perguntas sucessivas, por exemplo, caso o bot de fato opere por m\xE9todo socr\xE1tico), mas o princ\xEDpio da Fase 2 (sustentar aten\xE7\xE3o al\xE9m do gatilho inicial) se aplica de forma mais gen\xE9rica a qualquer intera\xE7\xE3o que mantenha o estudante engajado por mais de um turno, independentemente da t\xE9cnica conversacional exata usada. Nos testes, essa fase tem aplica\xE7\xE3o mais limitada, j\xE1 que um item de teste isolado tende a ser mais pr\xF3ximo de um evento \xFAnico do que de uma intera\xE7\xE3o sustentada \u2014 a Fase 2, nesse componente, se relacionaria antes \xE0 experi\xEAncia do estudante ao longo de todo o teste (m\xFAltiplos itens personalizados), n\xE3o a um item isolado.</li>
              </ul>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 10px 0;">
                Essa \xE9 uma leitura estrutural do modelo, n\xE3o uma medi\xE7\xE3o emp\xEDrica: o modelo de Hidi & Renninger foi originalmente descrito para explicar o desenvolvimento do interesse ao longo de semanas ou meses de exposi\xE7\xE3o repetida a um dom\xEDnio, n\xE3o para uma \xFAnica sess\xE3o de bot ou um \xFAnico teste. \xC9 razo\xE1vel mapear o projeto \xE0s duas primeiras fases porque a l\xF3gica funcional \xE9 a mesma (est\xEDmulo de entrada \u2192 sustenta\xE7\xE3o da aten\xE7\xE3o), mas isso \xE9 uma infer\xEAncia de design, n\xE3o uma constata\xE7\xE3o de que o produto efetivamente induz essas fases nos estudantes reais \u2014 isso exigiria medi\xE7\xE3o (ex.: escalas de interesse situacional aplicadas antes/depois do uso).
              </p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 16px 0;">
                <strong>Importante:</strong> o documento n\xE3o reivindica que o produto avan\xE7a o estudante \xE0s Fases 3 (Interesse Individual Emergente) ou 4 (Interesse Individual Bem Desenvolvido) do modelo. Essas fases descrevem interesse duradouro e autorregulado, que exigiria evid\xEAncia longitudinal de uso continuado \u2014 fora do escopo desta justificativa de design.
              </p>

              <p style="font-size: 13.5px; font-weight: 800; color: #166534; margin: 0 0 6px 0;">2.2 Autonomia, compet\xEAncia e pertencimento (Ryan & Deci \u2014 Teoria da Autodetermina\xE7\xE3o)</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 6px 0;">
                Quando o exemplo ou analogia usado \u2014 seja no bot, seja no enunciado de um item de teste \u2014 vem do pr\xF3prio universo do estudante, tr\xEAs necessidades psicol\xF3gicas b\xE1sicas descritas pela Teoria da Autodetermina\xE7\xE3o s\xE3o atendidas:
              </p>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 8px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px;">
                <li><strong>Autonomia</strong> \u2014 o estudante sente que a atividade dialoga com escolhas e gostos que s\xE3o dele, n\xE3o impostos;</li>
                <li><strong>Compet\xEAncia</strong> \u2014 o estudante j\xE1 \xE9 "especialista" no pr\xF3prio hobby, o que reduz a inseguran\xE7a inicial diante de uma tarefa ou tema abstrato;</li>
                <li><strong>Pertencimento</strong> \u2014 validar o interesse do estudante (mesmo que seja um jogo ou uma s\xE9rie) sinaliza que o espa\xE7o de intera\xE7\xE3o/avalia\xE7\xE3o reconhece sua identidade.</li>
              </ul>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 16px 0;">
                Isso vale tanto para a experi\xEAncia do estudante com o bot quanto para o momento em que ele responde aos itens de teste \u2014 em ambos, a personaliza\xE7\xE3o reduz barreiras de entrada percebidas sem alterar o que est\xE1 sendo pedido ou avaliado.
              </p>

              <p style="font-size: 13.5px; font-weight: 800; color: #166534; margin: 0 0 6px 0;">2.3 Personaliza\xE7\xE3o de contexto sem alterar o n\xFAcleo do problema (Cordova & Lepper; Walkington)</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 8px 0;">
                O estudo de refer\xEAncia aqui \xE9 Cordova & Lepper (1996, Journal of Educational Psychology): quando o mesmo conte\xFAdo de aritm\xE9tica foi embutido em contextos personalizados aos interesses dos alunos, sem alterar a estrutura ou a dificuldade da tarefa, os alunos mostraram maior engajamento, maior persist\xEAncia e aprenderam mais no mesmo tempo \u2014 comparado ao grupo com o conte\xFAdo abstrato, id\xEAntico em subst\xE2ncia.
              </p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0 0 8px 0;">
                O trabalho de Candace Walkington em \xE1lgebra (2013 em diante) refor\xE7a o mesmo padr\xE3o em problemas estruturados: problemas matem\xE1ticos reescritos para refletir os interesses do aluno (esportes, jogos) mantiveram a mesma estrutura l\xF3gica e o mesmo n\xEDvel de dificuldade \u2014 s\xF3 a "casca" do problema mudou \u2014 e os alunos com essa vers\xE3o personalizada tiveram desempenho melhor e mais duradouro, inclusive em unidades posteriores sem personaliza\xE7\xE3o.
              </p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #166534; margin: 0;">
                Esse padr\xE3o \u2014 "envelope muda, estrutura e m\xE9trica n\xE3o mudam" \u2014 \xE9 o que fundamenta tanto a personaliza\xE7\xE3o das intera\xE7\xF5es do bot quanto, de forma ainda mais direta, o envelope aplicado aos itens de teste (ver Se\xE7\xE3o 4), j\xE1 que os problemas de Walkington s\xE3o, estruturalmente, muito pr\xF3ximos de itens de avalia\xE7\xE3o.
              </p>
            </div>

            <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #92400E; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">3. Um cuidado que a literatura exige (aplic\xE1vel aos dois componentes)</h4>
              <p style="font-size: 13.5px; line-height: 1.6; color: #78350F; margin: 0 0 10px 0;">
                A mesma literatura documenta um risco quando a personaliza\xE7\xE3o \xE9 malfeita: o chamado <strong>efeito dos detalhes sedutores</strong> (Mayer e colegas) \u2014 quando o elemento "atraente" (refer\xEAncia de cultura pop, piada, curiosidade) \xE9 decorativo e n\xE3o carrega rela\xE7\xE3o com o racioc\xEDnio pedido, ele pode desviar aten\xE7\xE3o e prejudicar a reten\xE7\xE3o ou a performance, em vez de ajudar.
              </p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #78350F; margin: 0 0 10px 0;">
                A implica\xE7\xE3o pr\xE1tica, tanto para o bot quanto para o envelope dos testes: a refer\xEAncia ao hobby/interesse do aluno deve estruturar o exemplo ou a analogia usada (ex.: usar a l\xF3gica de progress\xE3o de um jogo para ilustrar uma rela\xE7\xE3o de causa-e-efeito), e n\xE3o apenas ser mencionada de forma solta ou cosm\xE9tica.
              </p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #78350F; margin: 0;">
                Vale tamb\xE9m registrar, com transpar\xEAncia: parte da pesquisa mostra que esse efeito de personaliza\xE7\xE3o \xE9 mais forte em alunos com menor interesse pr\xE9vio ou menor confian\xE7a no tema, e que a autenticidade da refer\xEAncia importa \u2014 tentativas de personaliza\xE7\xE3o "for\xE7ada" ou fora de contexto podem ser percebidas como artificiais por adolescentes e ter efeito contr\xE1rio. Isso refor\xE7a a import\xE2ncia de a personaliza\xE7\xE3o vir de interesses efetivamente declarados pelo estudante, n\xE3o de suposi\xE7\xF5es gen\xE9ricas sobre "o que os jovens gostam" \u2014 v\xE1lido tanto para os exemplos usados pelo bot quanto para os itens de teste personalizados. Por isso o estudante tem m\xFAltiplas op\xE7\xF5es de escolha em todos os testes.
              </p>
            </div>

            <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #1E3A8A; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">4. Cuidado adicional, espec\xEDfico dos testes: validade de medi\xE7\xE3o</h4>
              <p style="font-size: 13.5px; line-height: 1.6; color: #1E3A8A; margin: 0 0 14px 0;">
                Diferente da intera\xE7\xE3o com o bot \u2014 um espa\xE7o onde variar o exemplo n\xE3o altera o que est\xE1 sendo avaliado, porque nada ali \xE9 pontuado item a item \u2014, os testes do IAS (as escalas/instrumentos que medem pensamento cr\xEDtico e criatividade) imp\xF5em uma exig\xEAncia adicional: cada item precisa continuar medindo o mesmo construto, com a mesma dificuldade, para todos os estudantes, independentemente do envelope usado. Esta se\xE7\xE3o trata exclusivamente desse componente.
              </p>

              <p style="font-size: 13.5px; font-weight: 800; color: #1E3A8A; margin: 0 0 6px 0;">4.1 O que a literatura de medi\xE7\xE3o educacional diz sobre personalizar itens de teste</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #1E3A8A; margin: 0 0 8px 0;">
                Existe uma linha de pesquisa espec\xEDfica \u2014 distinta da pesquisa de motiva\xE7\xE3o citada nas Se\xE7\xF5es 2\u20133 \u2014 sobre como a "moldura" ou contexto de um item de avalia\xE7\xE3o pode, sem querer, mudar o que ele mede. Alguns achados centrais:
              </p>
              <ul style="font-size: 13.5px; line-height: 1.65; color: #1E3A8A; margin: 0 0 14px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;">
                <li>Kane (1992, 2006, 2013) desenvolveu a abordagem de "validade baseada em argumento" (argument-based approach to validity), hoje padr\xE3o na \xE1rea de medi\xE7\xE3o educacional (psicometria). O princ\xEDpio central: a validade n\xE3o \xE9 uma propriedade fixa do item, mas da interpreta\xE7\xE3o e do uso do escore \u2014 ou seja, \xE9 preciso poder argumentar que o escore continua significando a mesma coisa (n\xEDvel de pensamento cr\xEDtico/criatividade do aluno) independentemente de qual vers\xE3o do item foi apresentada.</li>
                <li>Itens "isom\xF3rficos" \u2014 termo usado na literatura para itens que deveriam ser estatisticamente equivalentes, mas variam apenas na superf\xEDcie (nomes, contexto, reda\xE7\xE3o) \u2014 t\xEAm demonstrado, em m\xFAltiplos estudos (ex.: revis\xE3o em CBE\u2014Life Sciences Education, 2023), que mudan\xE7as aparentemente pequenas na moldura de um item podem alterar significativamente o desempenho e a resposta afetiva dos estudantes, mesmo quando a estrutura l\xF3gica do item \xE9 id\xEAntica. Isso n\xE3o invalida o envelope de cultura pop, mas mostra que ele precisa ser monitorado.</li>
                <li>Sinharay (2025, Journal of Educational Measurement) prop\xF5e um framework de valida\xE7\xE3o espec\xEDfico para "avalia\xE7\xF5es personalizadas" (personalized assessments), reconhecendo que esse \xE9 um campo emergente.</li>
                <li>Bernacki & Walkington (2014), no mesmo programa de pesquisa citado na Se\xE7\xE3o 2.3, compararam estudantes de \xE1lgebra sob diferentes graus de personaliza\xE7\xE3o e encontraram um resultado particularmente relevante para o caso do IAS: a personaliza\xE7\xE3o aumentou o interesse expresso pela matem\xE1tica, mas n\xE3o alterou os escores no teste de conhecimento de \xE1lgebra. Esse \xE9 um resultado favor\xE1vel \xE0 l\xF3gica do envelope: sugere que \xE9 poss\xEDvel manter a m\xE9trica est\xE1vel enquanto ainda assim h\xE1 ganho no engajamento.</li>
                <li>O contraponto de cautela, tamb\xE9m de Walkington (relatado em reportagem do EdWeek, 2026, sobre o desenvolvimento de um "bot de realismo" para checar problemas gerados por IA): h\xE1 um risco concreto quando a personaliza\xE7\xE3o \xE9 gerada automaticamente sem revis\xE3o \u2014 o exemplo citado \xE9 uma IA que criou um problema pedindo para contar "quantos broches" algu\xE9m usava durante um show, uma tarefa que "ningu\xE9m acompanharia por nenhuma raz\xE3o real". Isso ilustra a necessidade de construir instru\xE7\xF5es para a IA que sejam espec\xEDficas e precisas, al\xE9m de incluir um humano supervisionando esse trabalho periodicamente.</li>
              </ul>

              <p style="font-size: 13.5px; font-weight: 800; color: #1E3A8A; margin: 0 0 6px 0;">4.2 Por que a l\xF3gica "envelope, n\xE3o instrumento" ainda se sustenta teoricamente para os testes</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #1E3A8A; margin: 0 0 10px 0;">
                Apesar da literatura de medi\xE7\xE3o impor um padr\xE3o de cuidado mais alto do que a intera\xE7\xE3o livre com o bot, a arquitetura descrita pelo projeto \u2014 onde as escalas e os crit\xE9rios de pontua\xE7\xE3o do IAS n\xE3o s\xE3o alterados, apenas a reda\xE7\xE3o de superf\xEDcie dos itens \u2014 \xE9 exatamente o desenho que a literatura de personaliza\xE7\xE3o de itens (Bernacki & Walkington; Davis-Dorsey et al., 1991; Ku & Sullivan, 2001) testou como sendo o mais defens\xE1vel: variar o "contexto de superf\xEDcie" mantendo fixos a estrutura l\xF3gica, o n\xEDvel de dificuldade e o crit\xE9rio de resposta correta/pontua\xE7\xE3o.
              </p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #1E3A8A; margin: 0 0 8px 0;">
                A garantia te\xF3rica de que isso preserva a validade do instrumento vem de tr\xEAs exig\xEAncias, extra\xEDdas diretamente dessa literatura, que devem ser tratadas como crit\xE9rios de verifica\xE7\xE3o t\xE9cnica, n\xE3o apenas como justificativa te\xF3rica:
              </p>
              <ol style="font-size: 13.5px; line-height: 1.65; color: #1E3A8A; margin: 0 0 14px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;">
                <li><strong>Isomorfismo estrutural</strong> \u2014 o envelope pode mudar o "cen\xE1rio" do item (ex.: usar um jogo espec\xEDfico do interesse do aluno), mas a pergunta em si, o crit\xE9rio do que conta como resposta v\xE1lida, e a escala aplicada devem permanecer estruturalmente id\xEAnticos entre estudantes.</li>
                <li><strong>Aus\xEAncia de distratores construto-irrelevantes</strong> \u2014 a personaliza\xE7\xE3o n\xE3o pode introduzir informa\xE7\xE3o nova que exija conhecimento espec\xEDfico do universo de interesse do aluno para responder corretamente (isso mudaria o que est\xE1 sendo medido, deixando de ser pensamento cr\xEDtico/criatividade e passando a testar tamb\xE9m familiaridade com aquele hobby/m\xEDdia).</li>
                <li><strong>Equidade entre perfis de interesse</strong> \u2014 como nem todo estudante tem um interesse declarado igualmente "rico" em analogias, o desenho deve evitar que estudantes com hobbies mais "prontos para virar met\xE1fora" (ex.: jogos com regras claras) sejam sistematicamente favorecidos sobre estudantes com interesses menos estrutur\xE1veis (ex.: um hobby mais contemplativo) \u2014 um risco de equidade que a literatura de personaliza\xE7\xE3o de itens trata sob o nome de differential item functioning (funcionamento diferencial de item, ou DIF).</li>
              </ol>

              <p style="font-size: 13.5px; font-weight: 800; color: #1E3A8A; margin: 0 0 6px 0;">4.3 Registro de cautela espec\xEDfico para os testes</p>
              <p style="font-size: 13.5px; line-height: 1.65; color: #1E3A8A; margin: 0;">
                Aqui o risco n\xE3o \xE9 s\xF3 motivacional \u2014 \xE9 de validade de medi\xE7\xE3o. Por isso, esta se\xE7\xE3o recomenda que qualquer aplica\xE7\xE3o do envelope de personaliza\xE7\xE3o aos itens do IAS seja submetida a uma verifica\xE7\xE3o t\xE9cnica adicional, \xE0 parte da fundamenta\xE7\xE3o te\xF3rica aqui descrita: idealmente, uma checagem por amostragem de que itens personalizados para diferentes interesses continuam produzindo distribui\xE7\xF5es de dificuldade e discrimina\xE7\xE3o compar\xE1veis (\xE9 isso que a literatura de DIF e itens isom\xF3rficos recomenda como pr\xE1tica m\xEDnima). Essa verifica\xE7\xE3o est\xE1 fora do escopo deste documento te\xF3rico, mas \xE9 a decorr\xEAncia l\xF3gica dele.
              </p>
            </div>

            <div style="background: #F8FAFC; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">5. S\xEDntese dos dois componentes e suas fases correspondentes</h4>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; line-height: 1.5;">
                  <thead>
                    <tr style="background: #E2E8F0;">
                      <th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 800;">Componente</th>
                      <th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 800;">Fase do modelo Hidi & Renninger (2006)</th>
                      <th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 800;">Fun\xE7\xE3o</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 8px 10px; color: #475569;">Envelope de cultura pop / personaliza\xE7\xE3o (bot e testes)</td>
                      <td style="padding: 8px 10px; color: #475569;">Fase 1 \u2014 Interesse Situacional Desperto</td>
                      <td style="padding: 8px 10px; color: #475569;">Capturar aten\xE7\xE3o inicial via relev\xE2ncia pessoal</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 8px 10px; color: #475569;">Intera\xE7\xE3o continuada com o bot</td>
                      <td style="padding: 8px 10px; color: #475569;">Fase 2 \u2014 Interesse Situacional Mantido (aplica\xE7\xE3o condicionada ao desenho conversacional do bot \u2014 ver Se\xE7\xE3o 2.1)</td>
                      <td style="padding: 8px 10px; color: #475569;">Sustentar engajamento al\xE9m do est\xEDmulo inicial</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 10px; color: #475569;">(fora de escopo)</td>
                      <td style="padding: 8px 10px; color: #475569;">Fases 3 e 4 \u2014 Interesse Individual (emergente/desenvolvido)</td>
                      <td style="padding: 8px 10px; color: #475569;">N\xE3o reivindicado; exigiria evid\xEAncia longitudinal</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style="background: #F1F5F9; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">6. Ressalva sobre o status dos estudos citados</h4>
              <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 10px 0;">
                Os estudos e modelos referenciados neste documento s\xE3o amplamente citados na literatura de psicologia educacional e de medi\xE7\xE3o, mas n\xE3o s\xE3o consensuais nem est\xE3o isentos de cr\xEDtica. Vale registrar, para uso respons\xE1vel desta documenta\xE7\xE3o:
              </p>
              <ul style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;">
                <li><strong>Tamanhos de efeito modestos:</strong> a correla\xE7\xE3o entre interesse pessoal e desempenho acad\xEAmico observada em meta-an\xE1lises (ex.: Schiefele, Krapp & Winteler, 1992) \xE9 de magnitude pequena a moderada (r \u2248 0,31), n\xE3o uma rela\xE7\xE3o determin\xEDstica.</li>
                <li><strong>Resultados nulos e at\xE9 negativos existem:</strong> nem todo estudo de personaliza\xE7\xE3o baseada em interesse encontra efeito positivo. Um RCT de grande porte (Iterbeke, Schelfhout & De Witte, 2022, com 1.449 estudantes) n\xE3o encontrou aumento de interesse com personaliza\xE7\xE3o de exemplos, e identificou efeito negativo em estudantes com baixa autoconfian\xE7a \u2014 um contraponto relevante ao otimismo geral da \xE1rea.</li>
                <li><strong>O modelo de Hidi & Renninger \xE9 uma estrutura te\xF3rica, n\xE3o uma lei emp\xEDrica test\xE1vel diretamente:</strong> as quatro fases foram propostas como um framework explicativo qualitativo; sua aplica\xE7\xE3o a um produto espec\xEDfico (como este bot e o envelope dos testes) \xE9 uma extrapola\xE7\xE3o razo\xE1vel, n\xE3o uma valida\xE7\xE3o direta do modelo.</li>
                <li>A correspond\xEAncia da Fase 2 ao bot depende do m\xE9todo conversacional real do bot, que este documento n\xE3o presume conhecer com certeza (ver nota de abertura). Se o bot n\xE3o sustentar intera\xE7\xE3o em m\xFAltiplos turnos de forma ativa, a correspond\xEAncia \xE0 Fase 2 \xE9 mais fraca e deve ser revista.</li>
                <li><strong>Personaliza\xE7\xE3o malfeita pode ter efeito reverso:</strong> o efeito dos "detalhes sedutores" (Mayer e colegas) mostra que a mesma estrat\xE9gia, se executada sem cuidado, pode prejudicar em vez de ajudar \u2014 o que significa que a fundamenta\xE7\xE3o te\xF3rica aqui apresentada justifica a dire\xE7\xE3o da decis\xE3o de design, mas n\xE3o garante o resultado; a qualidade de execu\xE7\xE3o do envelope segue sendo determinante, tanto no bot quanto nos testes.</li>
                <li>O documento fornecido pela pesquisa complementar (material extenso em anexo, em revis\xE3o anterior) cont\xE9m as mesmas fontes prim\xE1rias citadas aqui, mas com formula\xE7\xF5es ret\xF3ricas e conclus\xF5es mais fortes do que as fontes originais sustentam; este documento manteve apenas as afirma\xE7\xF5es rastre\xE1veis diretamente aos estudos prim\xE1rios.</li>
                <li><strong>A literatura sobre personaliza\xE7\xE3o de itens de teste (Se\xE7\xE3o 4) \xE9 um campo ainda emergente:</strong> o pr\xF3prio Sinharay (2025) descreve a falta de um "ferramental de medi\xE7\xE3o" plenamente consolidado para avalia\xE7\xF5es personalizadas. Isso significa que a Se\xE7\xE3o 4 deste documento \xE9 uma aplica\xE7\xE3o l\xF3gica e razo\xE1vel dos princ\xEDpios de medi\xE7\xE3o existentes ao caso do IAS, n\xE3o a cita\xE7\xE3o de um consenso j\xE1 estabelecido especificamente para este tipo de produto.
                </li>
              </ul>
              <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 12px 0 0 0;">
                <strong>Em suma:</strong> a literatura d\xE1 suporte razo\xE1vel e coerente \xE0 dire\xE7\xE3o da decis\xE3o de design, tanto para o bot quanto para os testes, mas deve ser lida como fundamenta\xE7\xE3o te\xF3rica plaus\xEDvel, n\xE3o como comprova\xE7\xE3o definitiva de efic\xE1cia ou de validade psicom\xE9trica do produto.
              </p>
            </div>

            <div style="background: #F8FAFC; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">7. S\xEDntese para a documenta\xE7\xE3o do projeto</h4>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; line-height: 1.5;">
                  <thead>
                    <tr style="background: #E2E8F0;">
                      <th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 800;">Elemento</th>
                      <th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 800;">O que muda</th>
                      <th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 800;">O que N\xC3O muda</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 8px 10px; color: #475569;">Exemplos e analogias usados pelo bot</td>
                      <td style="padding: 8px 10px; color: #475569;">Passam a referenciar hobbies/interesses declarados pelo aluno</td>
                      <td style="padding: 8px 10px; color: #475569;">\u2014</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 8px 10px; color: #475569;">Conte\xFAdo pedag\xF3gico do bot</td>
                      <td style="padding: 8px 10px; color: #475569;">\u2014</td>
                      <td style="padding: 8px 10px; color: #475569;">Objetivo e conte\xFAdo da intera\xE7\xE3o permanecem os mesmos</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 8px 10px; color: #475569;">Reda\xE7\xE3o de superf\xEDcie dos itens de teste</td>
                      <td style="padding: 8px 10px; color: #475569;">Cen\xE1rio/contexto do exemplo, adaptado ao interesse do aluno</td>
                      <td style="padding: 8px 10px; color: #475569;">Estrutura l\xF3gica do item, crit\xE9rio de resposta correta, escala de pontua\xE7\xE3o</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 8px 10px; color: #475569;">Instrumento de avalia\xE7\xE3o (IAS)</td>
                      <td style="padding: 8px 10px; color: #475569;">\u2014</td>
                      <td style="padding: 8px 10px; color: #475569;">Escalas, crit\xE9rios e m\xE9todo de aplica\xE7\xE3o do IAS permanecem inalterados</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 10px; color: #475569;">Estrutura/dificuldade do racioc\xEDnio pedido (bot e testes)</td>
                      <td style="padding: 8px 10px; color: #475569;">\u2014</td>
                      <td style="padding: 8px 10px; color: #475569;">Id\xEAntica \xE0 vers\xE3o sem personaliza\xE7\xE3o</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style="background: #F1F5F9; padding: 20px; border-radius: 12px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Refer\xEAncias centrais</h4>
              <p style="font-size: 12.5px; font-weight: 700; color: #334155; margin: 0 0 4px 0;">Motiva\xE7\xE3o e desenvolvimento do interesse (aplic\xE1vel a bot e testes):</p>
              <ul style="font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0 0 12px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px;">
                <li>Cordova, D. & Lepper, M. (1996). Journal of Educational Psychology, 88(4), 715\u2013730.</li>
                <li>Hidi, S. & Renninger, K.A. (2006). Educational Psychologist, 41(2), 111\u2013127.</li>
                <li>Ryan, R. & Deci, E. (2000). American Psychologist, 55(1), 68\u201378.</li>
                <li>Walkington, C. (2013). Journal of Educational Psychology, 105(4), 932\u2013945.</li>
                <li>Bernacki, M. & Walkington, C. (2014). Compara\xE7\xE3o de n\xEDveis de personaliza\xE7\xE3o no Cognitive Tutor de \xE1lgebra \u2014 interesse aumentou sem altera\xE7\xE3o no escore de conhecimento.</li>
                <li>Harp, S. & Mayer, R. (1998). Journal of Educational Psychology, 90(3), 414\u2013434 (efeito dos detalhes sedutores).</li>
                <li>Iterbeke, K., Schelfhout, W. & De Witte, K. (2022). Personaliza\xE7\xE3o por cultura pop em educa\xE7\xE3o financeira \u2014 sem efeito na aprendizagem, efeito negativo no interesse situacional.</li>
              </ul>
              <p style="font-size: 12.5px; font-weight: 700; color: #334155; margin: 0 0 4px 0;">Medi\xE7\xE3o e validade de itens de teste (espec\xEDfico para a Se\xE7\xE3o 4, componente dos testes):</p>
              <ul style="font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0 0 14px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px;">
                <li>Kane, M.T. (1992, 2006, 2013). Abordagem de validade baseada em argumento.</li>
                <li>Sinharay, S. (2025). Journal of Educational Measurement \u2014 framework de valida\xE7\xE3o para avalia\xE7\xF5es personalizadas.</li>
                <li>Bernacki, M. & Walkington, C. (2014), citado tamb\xE9m em revis\xE3o de itens isom\xF3rficos, CBE\u2014Life Sciences Education (2023) \u2014 sensibilidade de itens a mudan\xE7as de moldura aparentemente pequenas.</li>
              </ul>
              <p style="font-size: 11.5px; line-height: 1.6; color: #94A3B8; margin: 0;">
                <strong>Nota metodol\xF3gica:</strong> este documento consolida a pesquisa acad\xEAmica j\xE1 levantada em revis\xE3o anterior (fontes prim\xE1rias verificadas com DOI) com o material long-form fornecido anteriormente, mantendo apenas as afirma\xE7\xF5es rastre\xE1veis a estudos reais e removendo formula\xE7\xF5es ret\xF3ricas sem valor probat\xF3rio. Seu objetivo \xE9 registrar a fonte te\xF3rica da decis\xE3o de design \u2014 para o bot e para os testes, tratados aqui como componentes de igual relev\xE2ncia \u2014, n\xE3o afirmar valida\xE7\xE3o cient\xEDfica ou psicom\xE9trica definitiva do produto, nem confirmar o m\xE9todo conversacional espec\xEDfico do bot.
              </p>
            </div>
          </div>
        </div>
        <script>
          // Tela 0: bloqueia o scroll at\xE9 o avaliador informar e-mail/WhatsApp.
          // Nenhum dado \xE9 enviado ao servidor \u2014 fica s\xF3 no sessionStorage da aba,
          // que soma da mem\xF3ria ao fechar a p\xE1gina. Se o avaliador j\xE1 informou os
          // dados nesta mesma aba (ex: voltou para a home a partir de um prot\xF3tipo),
          // n\xE3o precisa informar de novo.
          var savedEmail = null;
          var savedWhatsapp = null;
          try {
            savedEmail = sessionStorage.getItem('ias_evaluator_email');
            savedWhatsapp = sessionStorage.getItem('ias_evaluator_whatsapp');
          } catch (err) {}

          if (savedEmail && savedWhatsapp) {
            document.getElementById('welcome-overlay').style.display = 'none';
          } else {
            document.body.style.overflow = 'hidden';
          }

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
  app.use("/a11y", import_express.default.static(import_path.default.join(process.cwd(), "public", "a11y")));
  app.use("/audio", import_express.default.static(import_path.default.join(process.cwd(), "public", "audio")));
  app.use("/sandbox", import_express.default.static(import_path.default.join(process.cwd(), "public", "sandbox")));
  app.get("/sandbox-live", (req, res) => {
    res.sendFile(import_path.default.join(process.cwd(), "public", "sandbox", "live-test.html"));
  });
  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
    if (evolutionUrl && evolutionKey) {
      try {
        console.log(`[Auto-Config Webhook] Verificando se a inst\xE2ncia "${evolutionInstance}" existe...`);
        const checkRes = await fetch(`${evolutionUrl}/instance/connectionState/${evolutionInstance}`, {
          headers: { "apikey": evolutionKey }
        });
        if (checkRes.status === 404) {
          console.log(`[Auto-Config Webhook] Inst\xE2ncia "${evolutionInstance}" n\xE3o encontrada. Criando automaticamente...`);
          const createRes = await fetch(`${evolutionUrl}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": evolutionKey
            },
            body: JSON.stringify({
              instanceName: evolutionInstance,
              token: evolutionKey,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS"
            })
          });
          if (createRes.ok) {
            console.log(`[Auto-Config Webhook] Inst\xE2ncia "${evolutionInstance}" criada com sucesso.`);
            await new Promise((r) => setTimeout(r, 1500));
          } else {
            const errText = await createRes.text();
            console.warn(`[Auto-Config Webhook] Erro ao criar inst\xE2ncia:`, createRes.status, errText);
          }
        } else {
          console.log(`[Auto-Config Webhook] Inst\xE2ncia "${evolutionInstance}" j\xE1 ativa ou existente.`);
        }
        console.log(`[Auto-Config Webhook] Registrando webhook na Evolution API...`);
        const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : process.env.PUBLIC_URL || `http://localhost:${PORT}`;
        const webhookRes = await fetch(`${evolutionUrl}/webhook/set/${evolutionInstance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionKey
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
//# sourceMappingURL=server.cjs.map
