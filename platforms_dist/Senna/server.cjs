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
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var envLocalPath = import_path.default.resolve(process.cwd(), ".env.local");
if (import_fs.default.existsSync(envLocalPath)) {
  import_dotenv.default.config({ path: envLocalPath });
} else {
  import_dotenv.default.config();
}
async function generateGeminiContent(ai, contents, config = {}) {
  const models = ["gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.6-flash"];
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
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3001;
  app.use(import_express.default.json());
  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { name, age, grade, city, school, interests, interestDetail = "", testType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const isCreativity = testType === "creativity";
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

# RESOLU\xC3\u2021\xC3\u0192O DE INTERESSE DETALHADO

Quando o campo "Interesse detalhado" estiver preenchido (ex: nome de jogo, instrumento, esporte espec\xEDfico):
1. Voc\xEA DEVE usar o interesse do aluno ao longo das 5 perguntas do teste, contextualizando as situa\xE7\xF5es nesse universo.
2. Se o item espec\xEDfico listado n\xE3o for reconhec\xEDvel (nome inventado ou erro irreconhec\xEDvel), use o interesse amplo correspondente.
3. Nunca invente mec\xE2nicas, personagens, times, artistas ou elementos que n\xE3o existam de verdade. Se n\xE3o tiver certeza de algum item espec\xEDfico, use o interesse amplo correspondente.

# BANCO FIXO DE RUBRICAS \xE2\u20AC\u201D PENSAMENTO CR\xC3\uFFFDTICO (5 itens)

Cada rubrica cont\xC3\xA9m o campo "intencao_cena", que orienta o tipo de situa\xC3\xA7\xC3\xA3o a construir, e o campo "formato", que define a estrutura do item gerado. Respeite ambos rigorosamente.
Para rubricas de m\xC3\xBAltipla marca\xC3\xA7\xC3\xA3o: "itens_originais" cont\xC3\xA9m o texto oficial do IAS (n\xC3\xA3o use nas op\xC3\xA7\xC3\xB5es geradas). "itens_traduzidos" cont\xC3\xA9m a vers\xC3\xA3o acess\xC3\xADvel \xE2\u20AC\u201D use exclusivamente estes nas op\xC3\xA7\xC3\xB5es.

[
  {
    "id": "pc1",
    "formato": "dissertativa",
    "habilidade": "Conhecimento espec\xC3\xADfico do tema",
    "intencao_cena": "Crie um momento em que o aluno se depara com uma afirma\xC3\xA7\xC3\xA3o ou debate sobre algo diretamente ligado ao seu interesse espec\xC3\xADfico, e algu\xC3\xA9m pede a opini\xC3\xA3o dele ou ele precisa tomar uma posi\xC3\xA7\xC3\xA3o.",
    "niveis": [
      "N\xC3\xA3o tenho conhecimento algum sobre o tema.",
      "Conhe\xC3\xA7o um pouco o tema, mas n\xC3\xA3o o suficiente para refletir muito sobre ele.",
      "Conhe\xC3\xA7o o tema, consigo refletir sobre ele e imaginar diferentes pontos de vista.",
      "Conhe\xC3\xA7o bem o tema, consigo refletir sobre ele quando necess\xC3\xA1rio."
    ]
  },
  {
    "id": "pc2",
    "formato": "multipla_marcacao",
    "habilidade": "Conhecimento espec\xC3\xADfico do pensamento cr\xC3\xADtico",
    "intencao_cena": "Crie um momento em que o aluno recebe uma informa\xC3\xA7\xC3\xA3o sobre seu interesse que pode ser verdadeira ou falsa \xE2\u20AC\u201D e precisa decidir se confia nela.",
    "itens_originais": [
      "Conhe\xC3\xA7o os princ\xC3\xADpios cient\xC3\xADficos para infer\xC3\xAAncia causal.",
      "Conhe\xC3\xA7o l\xC3\xB3gica categ\xC3\xB3rica.",
      "Sei o que \xC3\xA9 uma premissa.",
      "Sei o que \xC3\xA9 um argumento.",
      "Conhe\xC3\xA7o alguns tipos de fal\xC3\xA1cia (l\xC3\xB3gica).",
      "Conhe\xC3\xA7o algumas t\xC3\xA9cnicas de convencimento (ret\xC3\xB3rica).",
      "Conhe\xC3\xA7o princ\xC3\xADpios b\xC3\xA1sicos da \xC3\xA9tica em uma sociedade democr\xC3\xA1tica.",
      "Tenho conhecimento b\xC3\xA1sico para interpretar tabelas e gr\xC3\xA1ficos.",
      "Tenho conhecimento b\xC3\xA1sico para interpretar dados estat\xC3\xADsticos e probabilidades."
    ],
    "itens_traduzidos": [
      "Sei entender por que uma coisa causa a outra.",
      "Sei raciocinar com grupos e categorias.",
      "Sei o que \xC3\xA9 a ideia base que sustenta uma opini\xC3\xA3o.",
      "Sei identificar as raz\xC3\xB5es usadas para defender uma opini\xC3\xA3o.",
      "Consigo reconhecer erros de racioc\xC3\xADnio que parecem verdadeiros mas n\xC3\xA3o s\xC3\xA3o.",
      "Conhe\xC3\xA7o alguns jeitos que as pessoas usam para convencer os outros.",
      "Entendo princ\xC3\xADpios b\xC3\xA1sicos do que \xC3\xA9 justo para todos numa sociedade.",
      "Consigo ler e entender tabelas e gr\xC3\xA1ficos.",
      "Consigo entender dados e probabilidades b\xC3\xA1sicas."
    ]
  },
  {
    "id": "pc4",
    "formato": "multipla_marcacao",
    "habilidade": "Avalia\xC3\xA7\xC3\xA3o das premissas, argumenta\xC3\xA7\xC3\xA3o e conclus\xC3\xB5es (parte 1)",
    "intencao_cena": "Crie uma situa\xC3\xA7\xC3\xA3o em que o aluno encontra uma afirma\xC3\xA7\xC3\xA3o sobre seu interesse que parece verdadeira mas pode n\xC3\xA3o ser \xE2\u20AC\u201D e precisa decidir como verificar.",
    "itens_originais": [
      "Procuro confirmar, a partir de fontes externas confi\xC3\xA1veis, se os fatos s\xC3\xA3o verdadeiros.",
      "Procuro verificar a credibilidade da fonte de uma informa\xC3\xA7\xC3\xA3o/opini\xC3\xA3o.",
      "Busco mais informa\xC3\xA7\xC3\xA3o se achar necess\xC3\xA1rio.",
      "Procuro aplicar an\xC3\xA1lise l\xC3\xB3gica para detectar erros na argumenta\xC3\xA7\xC3\xA3o.",
      "Consigo identificar fal\xC3\xA1cias e t\xC3\xA9cnicas de convencimento.",
      "Procuro pensar se existem explica\xC3\xA7\xC3\xB5es alternativas para os mesmos dados.",
      "Consigo examinar a adequa\xC3\xA7\xC3\xA3o dos argumentos declarando causa-efeito.",
      "Reflito sobre as quest\xC3\xB5es \xC3\xA9ticas que podem estar envolvidas.",
      "Procuro imaginar quais pessoas/seres vivos poderiam ser prejudicados."
    ],
    "itens_traduzidos": [
      "Busco fontes confi\xC3\xA1veis para confirmar se o que li ou ouvi \xC3\xA9 verdade.",
      "Verifico se quem disse algo \xC3\xA9 de fato confi\xC3\xA1vel.",
      "Procuro mais informa\xC3\xA7\xC3\xB5es quando acho que preciso.",
      "Verifico se as raz\xC3\xB5es apresentadas realmente fazem sentido.",
      "Percebo quando algu\xC3\xA9m usa erros de racioc\xC3\xADnio ou truques para convencer.",
      "Penso se os mesmos dados poderiam ter outra explica\xC3\xA7\xC3\xA3o.",
      "Avalio se a rela\xC3\xA7\xC3\xA3o de causa e efeito nos argumentos faz sentido.",
      "Penso se h\xC3\xA1 quest\xC3\xB5es de certo e errado envolvidas.",
      "Penso em quem poderia ser prejudicado pela situa\xC3\xA7\xC3\xA3o."
    ]
  },
  {
    "id": "pc5",
    "formato": "multipla_marcacao",
    "habilidade": "Interpreta\xC3\xA7\xC3\xA3o/decodifica\xC3\xA7\xC3\xA3o das ideias centrais",
    "intencao_cena": "Crie um momento em que o aluno assiste, l\xC3\xAA ou ouve algo sobre seu interesse \xE2\u20AC\u201D um v\xC3\xADdeo, post, artigo ou coment\xC3\xA1rio \xE2\u20AC\u201D e precisa entender o que realmente est\xC3\xA1 sendo dito.",
    "itens_originais": [
      "Consigo identificar as ideias/os conceitos principais.",
      "Consigo identificar as premissas principais, expl\xC3\xADcitas e impl\xC3\xADcitas.",
      "Consigo reconhecer diferen\xC3\xA7as entre opini\xC3\xB5es, argumentos fundamentados e fatos.",
      "Compreendo a inten\xC3\xA7\xC3\xA3o expl\xC3\xADcita ou impl\xC3\xADcita do texto/\xC3\xA1udio/v\xC3\xADdeo em um contexto comunicativo."
    ],
    "itens_traduzidos": [
      "Consigo identificar as ideias principais do que li ou assisti.",
      "Percebo o que est\xC3\xA1 dito diretamente e o que fica nas entrelinhas.",
      "Distingo o que \xC3\xA9 opini\xC3\xA3o, o que \xC3\xA9 fato e o que \xC3\xA9 uma opini\xC3\xA3o bem fundamentada.",
      "Entendo o que o autor quis dizer, mesmo quando n\xC3\xA3o est\xC3\xA1 totalmente expl\xC3\xADcito."
    ]
  },
  {
    "id": "pc8",
    "formato": "multipla_marcacao",
    "habilidade": "Monitoramento da influ\xC3\xAAncia de cren\xC3\xA7as e vieses",
    "intencao_cena": "Crie um momento em que o aluno encontra uma informa\xC3\xA7\xC3\xA3o sobre seu interesse que confirma \xE2\u20AC\u201D ou contraria \xE2\u20AC\u201D algo que ele sempre acreditou ser verdade.",
    "itens_originais": [
      "Procuro prestar aten\xC3\xA7\xC3\xA3o em como minhas cren\xC3\xA7as influenciam meu julgamento.",
      "Procuro prestar aten\xC3\xA7\xC3\xA3o se meus julgamentos t\xC3\xAAm vi\xC3\xA9s confirmat\xC3\xB3rio.",
      "Procuro prestar aten\xC3\xA7\xC3\xA3o se estou buscando evid\xC3\xAAncias que contradizem uma ideia em que acredito.",
      "Examino argumentos com mais calma quando as conclus\xC3\xB5es s\xC3\xA3o f\xC3\xA1ceis de aceitar porque se afinam aos meus valores.",
      "Examino argumentos com mais calma quando as conclus\xC3\xB5es s\xC3\xA3o dif\xC3\xADceis de aceitar porque entram em conflito com meus valores."
    ],
    "itens_traduzidos": [
      "Percebo quando minhas cren\xC3\xA7as podem estar influenciando o que penso.",
      "Percebo quando estou buscando s\xC3\xB3 o que confirma o que j\xC3\xA1 acredito.",
      "Me esfor\xC3\xA7o para buscar tamb\xC3\xA9m informa\xC3\xA7\xC3\xB5es que contradizem o que acredito.",
      "Analiso com mais cuidado quando uma conclus\xC3\xA3o \xC3\xA9 f\xC3\xA1cil de aceitar porque combina com o que j\xC3\xA1 penso.",
      "Analiso com mais cuidado quando uma conclus\xC3\xA3o \xC3\xA9 dif\xC3\xADcil de aceitar porque vai contra o que acredito."
    ]
  }
]

# TAREFA \xE2\u20AC\u201D ESTRUTURA OBRIGAT\xC3\u201CRIAS POR FORMATO

## Para itens com formato "dissertativa" (pc1):
1. CENA (1\xE2\u20AC\u201C2 frases): Situe o aluno num momento concreto e espec\xC3\xADfico dentro do universo do seu interesse, com uma tens\xC3\xA3o natural que se encaixa na "intencao_cena" da rubrica. Use 2\xC2\xAA pessoa direta.
2. PERGUNTA (1 frase): Uma pergunta aberta, ancorada na cena, guiada pela rubrica correspondente.

## Para itens com formato "multipla_marcacao" (pc2, pc4, pc5, pc8):
1. CENA (1\xE2\u20AC\u201C2 frases): Situe o aluno num momento concreto dentro do universo do seu interesse, conforme a "intencao_cena" da rubrica. Use 2\xC2\xAA pessoa direta.
2. PERGUNTA de marca\xC3\xA7\xC3\xA3o (1 frase): "Marque o que voc\xC3\xAA costuma fazer nessa situa\xC3\xA7\xC3\xA3o:" ou varia\xC3\xA7\xC3\xA3o natural.
3. OP\xC3\u2021\xC3\u2022ES: Selecione 4\xE2\u20AC\u201C5 itens de "itens_traduzidos" da rubrica correspondente. Use o texto de "itens_traduzidos" exatamente como est\xC3\xA1 \xE2\u20AC\u201D nunca os "itens_originais".

# REGRAS DE SELE\xC3\u2021\xC3\u0192O DE OP\xC3\u2021\xC3\u2022ES (apenas para multipla_marcacao)

Ao selecionar 4\xE2\u20AC\u201C5 itens de "itens_traduzidos" de uma rubrica:
1. Inclua ao menos 1 comportamento mais simples (geralmente os primeiros da lista) e 1 mais complexo (geralmente os \xC3\xBAltimos).
2. Escolha os itens que se conectam mais naturalmente ao cen\xC3\xA1rio narrado na CENA.
3. Evite dois itens que descrevam comportamentos muito parecidos entre si \xE2\u20AC\u201D maximize a variedade.
4. Para rubricas com 4 itens traduzidos (pc5, pc8), inclua todos \xE2\u20AC\u201D n\xC3\xA3o h\xC3\xA1 necessidade de cortar.
5. Nunca altere, misture ou crie op\xC3\xA7\xC3\xB5es fora de "itens_traduzidos".

# REGRAS DE PERSONALIZA\xC3\u2021\xC3\u0192O

1. O interesse ancora o cen\xC3\xA1rio de forma concreta: use o nome do jogo, esporte, instrumento ou atividade espec\xC3\xADfica \xE2\u20AC\u201D n\xC3\xA3o o interesse amplo ("games", "m\xC3\xBAsica") quando o interesse detalhado estiver dispon\xC3\xADvel.
2. Use 1\xE2\u20AC\u201C2 termos que algu\xC3\xA9m que vive esse interesse reconheceria (ex: "ranked", "build", "acorde", "t\xC3\xA1tica"). Se estiver usando o interesse amplo (fallback), use termos gen\xC3\xA9ricos do dom\xC3\xADnio.
3. O dilema da cena deve ser algo que realmente acontece naquele universo \xE2\u20AC\u201D n\xC3\xA3o drama inventado.
4. Nunca comece com "J\xC3\xA1 que voc\xC3\xAA gosta de..." ou "Pensando nos seus interesses..." \xE2\u20AC\u201D coloque o aluno direto na cena.
5. As consequ\xC3\xAAncias e a aposta devem ser realistas para a idade e o cotidiano do aluno.
6. Use obrigatoriamente pelo menos 1 dado concreto do aluno (nome OU cidade OU escola OU interesse) por item, nunca mais de 2.

# REGRAS OBRIGAT\xC3\u201CRIAS

1. Sempre fale diretamente com o aluno usando "voc\xC3\xAA". Use o nome apenas como vocativo de abertura (ex: "[Nome], ..."). Nunca narre o aluno como personagem em 3\xC2\xAA pessoa ("Ayrton foi", "Ayrton percebeu").
2. Linguagem simples, frases curtas, tom amig\xC3\xA1vel.
3. Nunca inclua competi\xC3\xA7\xC3\xA3o, ranking ou compara\xC3\xA7\xC3\xA3o entre alunos.
4. Nunca sugira que existe resposta certa ou errada.
5. Nunca revele a rubrica, habilidade ou "intencao_cena" sendo avaliada no enunciado ou nas op\xC3\xA7\xC3\xB5es.
6. Nunca inclua teoria, jarg\xC3\xA3o pedag\xC3\xB3gico ou metalinguagem no enunciado.
7. Para m\xC3\xBAltipla marca\xC3\xA7\xC3\xA3o: use exclusivamente "itens_traduzidos". Nunca use "itens_originais" nas op\xC3\xA7\xC3\xB5es geradas.

# FORMATO DE SA\xC3\uFFFDDA

Responda ESTRITAMENTE em JSON v\xC3\xA1lido, sem markdown por fora, seguindo exatamente este formato:

{
  "items": [
    { "rubricaId": "pc1", "tipo": "dissertativa", "enunciado": "texto da cena + pergunta" },
    { "rubricaId": "pc2", "tipo": "multipla_marcacao", "enunciado": "texto da cena + pergunta de marca\xC3\xA7\xC3\xA3o", "opcoes": ["op\xC3\xA7\xC3\xA3o traduzida A", "op\xC3\xA7\xC3\xA3o traduzida B", "op\xC3\xA7\xC3\xA3o traduzida C", "op\xC3\xA7\xC3\xA3o traduzida D"] }
  ]
}

O array "items" deve ter exatamente 5 objetos, um por rubrica do banco, na ordem pc1, pc2, pc4, pc5, pc8.

REGRA DE FORMATO: Itens com formato "dissertativa" n\xC3\xA3o podem ter o campo "opcoes". Itens com formato "multipla_marcacao" devem ter o campo "opcoes" com exatamente 4 ou 5 strings. Qualquer viola\xC3\xA7\xC3\xA3o torna a resposta inv\xC3\xA1lida.`;
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
        { rubricaId: "m1", tipo: "dissertativa", enunciado: `1. ${name}, pensando nos seus interesses, como voc\xC3\xAA resolveria um desafio comum no seu dia a dia?` },
        { rubricaId: "m2", tipo: "multipla_marcacao", enunciado: `2. Descreva um momento em que voc\xC3\xAA precisou mudar de ideia. Marque o que se aplica:`, opcoes: ["Foi dif\xC3\xADcil", "Foi f\xC3\xA1cil", "N\xC3\xA3o mudei"] },
        { rubricaId: "m3", tipo: "dissertativa", enunciado: `3. O que voc\xC3\xAA faria em uma situa\xC3\xA7\xC3\xA3o em que n\xC3\xA3o existe uma resposta certa clara?` },
        { rubricaId: "m4", tipo: "multipla_marcacao", enunciado: `4. Qual \xC3\xA9 a sua forma favorita de exercitar a criatividade?`, opcoes: ["Desenhando", "Escrevendo", "Conversando"] },
        { rubricaId: "m5", tipo: "dissertativa", enunciado: `5. Conte como voc\xC3\xAA lidou com a frustra\xC3\xA7\xC3\xA3o ao tentar aprender algo novo recentemente.` }
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
            habilidadesSocioemocionais: ["Abertura ao Novo", "Autorregula\xC3\xA7\xC3\xA3o"],
            pontosFortes: [
              'Voc\xC3\xAA prop\xC3\xB4s ideias variadas e pouco \xC3\xB3bvias \xE2\u20AC\u201D isso mostra que j\xC3\xA1 ultrapassa o "primeiro caminho" que vem \xC3\xA0 cabe\xC3\xA7a.',
              "Demonstrou conseguir enxergar o mesmo problema de \xC3\xA2ngulos diferentes."
            ],
            pontosMelhoria: [
              "Em algumas situa\xC3\xA7\xC3\xB5es, ainda faltou escolher a melhor ideia e explicar por que ela \xC3\xA9 a mais forte.",
              "Registrar as hip\xC3\xB3teses antes de avan\xC3\xA7ar para a solu\xC3\xA7\xC3\xA3o ajuda a perceber quando voc\xC3\xAA est\xC3\xA1 repetindo um padr\xC3\xA3o."
            ],
            proximoPasso: [
              "Na pr\xC3\xB3xima vez que tiver um problema, liste pelo menos 3 caminhos antes de escolher um \xE2\u20AC\u201D e escreva por que descartou os outros.",
              "Tente unir duas ideias que parecem opostas para criar uma solu\xC3\xA7\xC3\xA3o que ningu\xC3\xA9m teria pensado sozinho."
            ]
          });
        } else {
          return res.json({
            habilidadesCognitivas: ["Avalia\xC3\xA7\xC3\xA3o de Evid\xC3\xAAncias", "An\xC3\xA1lise"],
            habilidadesSocioemocionais: ["Mente Aberta", "Autorregula\xC3\xA7\xC3\xA3o"],
            pontosFortes: [
              `${name}, voc\xC3\xAA identificou bem as premissas dos dois lados sem tomar partido de cara \xE2\u20AC\u201D isso \xC3\xA9 o come\xC3\xA7o do pensamento cr\xC3\xADtico de verdade.`,
              "Conseguiu separar o que \xC3\xA9 fato do que \xC3\xA9 opini\xC3\xA3o em boa parte das situa\xC3\xA7\xC3\xB5es."
            ],
            pontosMelhoria: [
              "O desafio agora \xC3\xA9 explicar com mais clareza como as evid\xC3\xAAncias que voc\xC3\xAA escolheu sustentam a sua conclus\xC3\xA3o.",
              "Em algumas respostas, a conclus\xC3\xA3o apareceu antes das raz\xC3\xB5es \xE2\u20AC\u201D o que enfraquece o argumento."
            ],
            proximoPasso: [
              "Na pr\xC3\xB3xima vez que precisar defender um ponto de vista, tente montar o argumento assim: raz\xC3\xA3o 1 \xE2\u2020\u2019 raz\xC3\xA3o 2 \xE2\u2020\u2019 conclus\xC3\xA3o.",
              "Antes de fechar uma opini\xC3\xA3o, pergunte a si mesmo: qual seria o melhor contra-argumento? Voc\xC3\xAA consegue rebat\xC3\xAA-lo?"
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
          habilidadesCognitivas: ["An\xC3\xA1lise", "L\xC3\xB3gica"],
          habilidadesSocioemocionais: ["Foco", "Resili\xC3\xAAncia"],
          pontosFortes: ["N\xC3\xA3o foi poss\xC3\xADvel analisar suas respostas em detalhe desta vez."],
          pontosMelhoria: ["Ocorreu um erro no processamento \xE2\u20AC\u201D suas respostas foram salvas."],
          proximoPasso: ["Tente novamente em alguns instantes."]
        };
      }
      return res.json(result);
    } catch (error) {
      console.log("Serving mock report.");
      res.json({
        habilidadesCognitivas: ["An\xC3\xA1lise", "Criatividade"],
        habilidadesSocioemocionais: ["Foco", "Resili\xC3\xAAncia"],
        pontosFortes: ["\xC3\u201Ctima dedica\xC3\xA7\xC3\xA3o em completar o teste mesmo com o sistema em alta demanda!"],
        pontosMelhoria: ["A an\xC3\xA1lise detalhada com IA n\xC3\xA3o p\xC3\xB4de ser conclu\xC3\xADda neste momento."],
        proximoPasso: ["Revisite suas respostas depois e veja se voc\xC3\xAA mudaria alguma coisa."]
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
          response: `E a\xC3\xAD par\xC3\xA7a! Papo reto, t\xC3\xB4 aqui sem a chave da API \xF0\u0178\u2019\u20AC Mas foca nessa pergunta a\xC3\xAD e manda ver, tamo junto!`,
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `
Voc\xC3\xAA \xC3\xA9 o B\xC3\xA9co, um tutor virtual no tom da Gera\xC3\xA7\xC3\xA3o Z ("Soca"), muito gente boa.
Seu estilo de comunica\xC3\xA7\xC3\xA3o usa uma linguagem amig\xC3\xA1vel, direta, emp\xC3\xA1tica e g\xC3\xADrias leves de 2020 (como "papo reto", "tamo junto", "par\xC3\xA7a", "vixe", "desembolar", "massa").

Sua miss\xC3\xA3o \xC3\xA9 guiar o(a) estudante usando Racioc\xC3\xADnio Socr\xC3\xA1tico para responder \xC3\xA0 seguinte pergunta do teste:
"${question?.enunciado || question}"

Diretrizes de Intera\xC3\xA7\xC3\xA3o:
1. Nunca d\xC3\xAA a resposta pronta. Em vez disso, fa\xC3\xA7a perguntas reflexivas curtas que estimulem o racioc\xC3\xADnio pr\xC3\xB3prio do aluno.
2. Se o(a) estudante disser que n\xC3\xA3o entendeu, reescreva a pergunta com palavras mais simples e coloquiais.
3. Corrija interpreta\xC3\xA7\xC3\xB5es equivocadas com muita empatia e d\xC3\xAA pistas sutis e pontuais.
4. Sempre destaque sutilmente que o teste avalia habilidades importantes para o futuro, como criatividade e pensamento cr\xC3\xADtico.
5. Sempre retorne exatamente 3 bot\xC3\xB5es/chips de op\xC3\xA7\xC3\xB5es r\xC3\xA1pidas de resposta ao final, pensados para o contexto atual da d\xC3\xBAvida (ex: "[Me explica de outro jeito?]", "[Quero uma pista]", "[N\xC3\xA3o sei por onde come\xC3\xA7ar]").

Regras de Seguran\xC3\xA7a (Guardrails):
Se a mensagem do estudante contiver ofensas, palavras sem sentido (nonsense), zombaria ou fugir totalmente do assunto do teste, ignore o conte\xC3\xBAdo da mensagem e responda estritamente com a seguinte resposta padr\xC3\xA3o:
"Vibe errada! \xF0\u0178\u2019\u20AC Que tal a gente focar no que realmente importa e amassar esse teste juntos? Escolha uma op\xC3\xA7\xC3\xA3o abaixo ou mande sua d\xC3\xBAvida!"

Formato de sa\xC3\xADda:
Voc\xC3\xAA deve responder ESTRITAMENTE com um objeto JSON v\xC3\xA1lido, sem qualquer tipo de formata\xC3\xA7\xC3\xA3o markdown por fora (como \`\`\`json ou \`\`\`), contendo exatamente as chaves:
{
  "response": "Texto da sua fala direcionada ao estudante",
  "chips": ["Texto do Chip 1", "Texto do Chip 2", "Texto do Chip 3"]
}
`;
      const contents = [
        { role: "user", parts: [{ text: prompt }] },
        { role: "model", parts: [{ text: "Entendido. Estou no papel do B\xC3\xA9co. Aguardando a mensagem do aluno." }] }
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
          response: "Vixe, deu um bug na matrix aqui \xF0\u0178\u02DC\u2026 Bora focar na pergunta principal!",
          chips: ["Me explica de outro jeito?", "Quero uma pista", "Por que isso importa?"]
        };
      }
      return res.json(result);
    } catch (error) {
      console.log("Serving mock chat.");
      res.json({
        response: "Vixe, o sistema t\xC3\xA1 lotado agora \xF0\u0178\u02DC\u2026! Mas tamo junto, bora tentar focar na pergunta e responder do seu jeito!",
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
          arquetipo: "Inovador Estrat\xC3\xA9gico",
          sinteseGeral: `${name}, a integra\xC3\xA7\xC3\xA3o entre sua capacidade de analisar fatos com precis\xC3\xA3o e sua imagina\xC3\xA7\xC3\xA3o f\xC3\xA9rtil revela um perfil \xC3\xBAnico. Quando voc\xC3\xAA aplica seu racioc\xC3\xADnio ao universo de ${interestDetail || interests.join(", ")}, voc\xC3\xAA n\xC3\xA3o apenas questiona premissas com firmeza, mas tamb\xC3\xA9m prop\xC3\xB5e sa\xC3\xADdas criativas e originais que surpreendem seus colegas.

Sua forma de pensar equilibra a curiosidade explorat\xC3\xB3ria com o discernimento pr\xC3\xA1tico, permitindo transformar desafios complexos em planos realiz\xC3\xA1veis tanto na ${school} quanto na sua vida di\xC3\xA1ria em ${city}.`,
          matrizCompetencias: {
            cognitiva: "Excelente equil\xC3\xADbrio entre pensamento divergente (gera\xC3\xA7\xC3\xA3o de m\xC3\xBAltiplas solu\xC3\xA7\xC3\xB5es inovadoras) e pensamento convergente (an\xC3\xA1lise l\xC3\xB3gica e separa\xC3\xA7\xC3\xA3o de fatos e opini\xC3\xB5es).",
            socioemocional: "Elevada mente aberta combinada com toler\xC3\xA2ncia \xC3\xA0 incerteza, demonstrando coragem para errar, aprender e sustentar pontos de vista fundamentados.",
            metacognitiva: "Alta autoconsci\xC3\xAAncia de vieses e forte autorregula\xC3\xA7\xC3\xA3o emocional diante de conflitos de opini\xC3\xA3o."
          },
          superPoder: "Capacidade de enxergar \xC3\xA2ngulos inesperados em problemas dif\xC3\xADceis e construir argumentos s\xC3\xB3lidos para defender suas ideias.",
          desafioDesenvolvimento: "Aprofundar a valida\xC3\xA7\xC3\xA3o das evid\xC3\xAAncias antes de fechar uma proposta criativa.",
          proximoPassoPratico: `Na pr\xC3\xB3xima semana, crie um pequeno projeto na ${school} unindo suas ideias em ${interestDetail || interests[0] || "seus interesses"} para resolver uma quest\xC3\xA3o real da sua turma!`,
          recadoBecoWhats: "\xF0\u0178\u2019\xAC Vou continuar contigo pra te ajudar no que ainda \xC3\xA9 desafiador pra voc\xC3\xAA! Clica aqui pra falar comigo no WhatsApp!"
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const promptMergedReport = `# CONTEXTO

Voc\xC3\xAA \xC3\xA9 o avaliador-chefe de compet\xC3\xAAncias do Instituto Ayrton Senna. Sua miss\xC3\xA3o \xC3\xA9 sintetizar uma avalia\xC3\xA7\xC3\xA3o hol\xC3\xADstica e h\xC3\xADbrida de um estudante que completou DUAS avalia\xC3\xA7\xC3\xB5es formativas oficiais: Pensamento Cr\xC3\xADtico e Criatividade.

# ESTUDANTE
Nome: ${name} | Idade: ${age} | Ano: ${grade} | Escola: ${school} | Cidade: ${city}
Interesses: ${interests.join(", ")}
Interesses detalhados: ${interestDetail}

# DADOS DOS RELAT\xC3\u201CRIOS INDIVIDUAIS
--- RELAT\xC3\u201CRIO DE PENSAMENTO CR\xC3\uFFFDTICO ---
Habilidades Cognitivas: ${Array.isArray(reportPC?.habilidadesCognitivas) ? reportPC.habilidadesCognitivas.join(", ") : reportPC?.habilidadesCognitivas || "An\xC3\xA1lise de Evid\xC3\xAAncias"}
Habilidades Socioemocionais: ${Array.isArray(reportPC?.habilidadesSocioemocionais) ? reportPC.habilidadesSocioemocionais.join(", ") : reportPC?.habilidadesSocioemocionais || "Mente Aberta"}
For\xC3\xA7as: ${Array.isArray(reportPC?.pontosFortes) ? reportPC.pontosFortes.join(" | ") : reportPC?.pontosFortes || "Boa identifica\xC3\xA7\xC3\xA3o de premissas"}
Melhorias: ${Array.isArray(reportPC?.pontosMelhoria) ? reportPC.pontosMelhoria.join(" | ") : reportPC?.pontosMelhoria || "Articula\xC3\xA7\xC3\xA3o de argumentos"}

--- RELAT\xC3\u201CRIO DE CRIATIVIDADE ---
Habilidades Cognitivas: ${Array.isArray(reportCR?.habilidadesCognitivas) ? reportCR.habilidadesCognitivas.join(", ") : reportCR?.habilidadesCognitivas || "Pensamento Divergente"}
Habilidades Socioemocionais: ${Array.isArray(reportCR?.habilidadesSocioemocionais) ? reportCR.habilidadesSocioemocionais.join(", ") : reportCR?.habilidadesSocioemocionais || "Abertura ao Novo"}
For\xC3\xA7as: ${Array.isArray(reportCR?.pontosFortes) ? reportCR.pontosFortes.join(" | ") : reportCR?.pontosFortes || "Proposi\xC3\xA7\xC3\xA3o de ideias originais"}
Melhorias: ${Array.isArray(reportCR?.pontosMelhoria) ? reportCR.pontosMelhoria.join(" | ") : reportCR?.pontosMelhoria || "Detalhamento do planejamento"}

# TAREFA: DIAGN\xC3\u201CSTICO INTEGRADO DO S\xC3\u2030CULO XXI
Analise como o pensamento divergente (Criatividade) se conecta com o pensamento convergente e anal\xC3\xADtico (Pensamento Cr\xC3\xADtico) no estudante.

Gere uma s\xC3\xADntese formativa com mindset de crescimento (sem julgamento punitivo, sem notas escolares tradicionais), destacando o potencial \xC3\xBAnico do aluno, seus interesses (${interestDetail}) e seu estilo de resolu\xC3\xA7\xC3\xA3o de problemas.

# FORMATO DE SA\xC3\uFFFDDA OBRIGAT\xC3\u201CRIO (JSON estrito)
{
  "arquetipo": "T\xC3\xADtulo que define o perfil criativo-cr\xC3\xADtico do aluno (ex: 'Explorador Estrat\xC3\xA9gico', 'Inovador Questionador', 'Arquiteto de Ideias')",
  "sinteseGeral": "Texto de 2 a 3 par\xC3\xA1grafos integrando como a criatividade e a capacidade cr\xC3\xADtica dele se complementam nos seus interesses reais (${interestDetail}). Fale diretamente com o aluno em tom encorajador e amig\xC3\xA1vel.",
  "matrizCompetencias": {
    "cognitiva": "S\xC3\xADntese das habilidades cognitivas combinadas (an\xC3\xA1lise l\xC3\xB3gica + flu\xC3\xAAncia e diverg\xC3\xAAncia)",
    "socioemocional": "S\xC3\xADntese das atitudes socioemocionais combinadas (mente aberta + toler\xC3\xA2ncia \xC3\xA0 ambiguidade)",
    "metacognitiva": "S\xC3\xADntese de autorregula\xC3\xA7\xC3\xA3o e autoconsci\xC3\xAAncia do processo de pensar"
  },
  "superPoder": "O maior diferencial identificado na forma dele pensar e agir",
  "desafioDesenvolvimento": "A principal oportunidade para ele continuar evoluindo",
  "proximoPassoPratico": "Uma miss\xC3\xA3o pr\xC3\xA1tica e instigante conectada aos interesses dele (${interestDetail}) para aplicar na escola (${school}) ou na vida",
  "recadoBecoWhats": "\xF0\u0178\u2019\xAC Vou continuar contigo pra te ajudar no que ainda \xC3\xA9 desafiador pra voc\xC3\xAA! Clica aqui pra falar comigo no WhatsApp!"
}`;
      const response = await generateGeminiContent(ai, promptMergedReport, {
        responseMimeType: "application/json"
      });
      const jsonText = response?.text || "{}";
      const result = JSON.parse(jsonText);
      return res.json(result);
    } catch (error) {
      console.log("Error generating merged report:", error);
      return res.status(500).json({ error: "Erro ao gerar relat\xC3\xB3rio integrado." });
    }
  });
  const whatsAppMemoryStore = /* @__PURE__ */ new Map();
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
      const cleanPhone = (phoneNumber || "").replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const existing = whatsAppMemoryStore.get(formattedPhone) || { history: [] };
      whatsAppMemoryStore.set(formattedPhone, {
        ...existing,
        studentName: name || existing.studentName || "Estudante",
        school: school || existing.school,
        grade: grade || existing.grade,
        city: city || existing.city,
        interests: Array.isArray(interests) ? interests.join(", ") : interests || existing.interests,
        interestDetail: interestDetail || existing.interestDetail,
        arquetipo: arquetipo || existing.arquetipo || "Inovador Estrat\xC3\xA9gico",
        superPoder: superPoder || existing.superPoder,
        desafioDesenvolvimento: desafioDesenvolvimento || existing.desafioDesenvolvimento
      });
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const evolutionKey = process.env.EVOLUTION_API_KEY;
      const evolutionInstance = process.env.EVOLUTION_INSTANCE || "beco_bot";
      const defaultMessage = `Oi, ${name || "parceiro"}! Aqui \xC3\xA9 o B\xC3\xA9co do Instituto Ayrton Senna! \xF0\u0178\u0161\u20AC

Vi aqui que seu perfil no laborat\xC3\xB3rio foi *${arquetipo || "Inovador Estrat\xC3\xA9gico"}*! \xF0\u0178\uFFFD\u2020

\xF0\u0178\u2019\xAC Vou continuar contigo por aqui pra te ajudar no que ainda \xC3\xA9 desafiador pra voc\xC3\xAA! Sempre que tiver uma d\xC3\xBAvida, desafio escolar ou quiser trocar uma ideia, \xC3\xA9 s\xC3\xB3 me mandar uma mensagem aqui!`;
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
              text: "Opa! Por enquanto eu s\xC3\xB3 consigo ler mensagens de texto por aqui \xF0\u0178\u201C\uFFFD Manda sua d\xC3\xBAvida ou ideia em texto que a gente desenrola!",
              delay: 1e3
            })
          });
          continue;
        }
        const userText = messageObj.conversation || messageObj.extendedTextMessage?.text || messageObj.editedMessage?.message?.protocolMessage?.editedMessage?.conversation || messageObj.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text || "";
        if (!userText || !userText.trim()) continue;
        console.log(`[WhatsApp B\xC3\xA9co] Message from ${rawNumber} (${item.pushName || "Estudante"}): "${userText}"`);
        let mem = whatsAppMemoryStore.get(rawNumber);
        if (!mem) {
          mem = {
            studentName: item.pushName || "Estudante",
            arquetipo: "Inovador Estrat\xC3\xA9gico",
            superPoder: "Pensamento cr\xC3\xADtico e imagina\xC3\xA7\xC3\xA3o criativa",
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
              text: `E a\xC3\xAD ${mem.studentName}! Recebi sua mensagem: "${userText}". T\xC3\xB4 pronto pra te ajudar nos seus desafios!`,
              delay: 1e3
            })
          });
          continue;
        }
        const ai = new import_genai.GoogleGenAI({ apiKey });
        if (mem.history.length >= 10) {
          try {
            const oldTurns = mem.history.slice(0, -4);
            const summaryPrompt = `Voc\xC3\xAA \xC3\xA9 o sistema de s\xC3\xADntese de mem\xC3\xB3ria do B\xC3\xA9co (Instituto Ayrton Senna).
Sintetize em 2 a 3 frases essenciais os pontos conversados, desafios superados, d\xC3\xBAvidas e t\xC3\xB3picos discutidos com o(a) aluno(a) ${mem.studentName || ""}:
${oldTurns.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
            const summaryRes = await generateGeminiContent(ai, summaryPrompt);
            mem.summaryMemory = (mem.summaryMemory ? mem.summaryMemory + "\n" : "") + (summaryRes.text || "");
            mem.history = mem.history.slice(-4);
          } catch (sumErr) {
            console.warn("Memory compaction error:", sumErr);
          }
        }
        const systemInstruction = `# PERSONA & IDENTIDADE
Voc\xC3\xAA \xC3\xA9 o **B\xC3\xA9co**, o mentor e parceiro inteligente do Instituto Ayrton Senna (IAS).
Voc\xC3\xAA est\xC3\xA1 conversando diretamente com o estudante no WhatsApp dele de forma cont\xC3\xADnua, amig\xC3\xA1vel e acolhedora.

# CONTEXTO DO ESTUDANTE
- Nome: ${mem.studentName || "Estudante"}
- Escola: ${mem.school || "N\xC3\xA3o especificada"} | Ano: ${mem.grade || "Ensino M\xC3\xA9dio/Fundamental"} | Cidade: ${mem.city || "Brasil"}
- Interesses: ${mem.interests || "Gerais"} (${mem.interestDetail || ""})
- Arqu\xC3\xA9tipo IAS: ${mem.arquetipo || "Inovador Estrat\xC3\xA9gico"}
- Superpoder: ${mem.superPoder || "Curiosidade e imagina\xC3\xA7\xC3\xA3o ativa"}
- Desafio de Evolu\xC3\xA7\xC3\xA3o: ${mem.desafioDesenvolvimento || "Articular argumentos e estruturar ideias"}
${mem.summaryMemory ? `- Mem\xC3\xB3ria executiva das conversas anteriores: ${mem.summaryMemory}` : ""}

# DIRETRIZES DE COMUNICA\xC3\u2021\xC3\u0192O NO WHATSAPP
1. **Linguagem Natural de WhatsApp**:
   - Use tom jovem brasileiro, acolhedor e pr\xC3\xB3ximo (voc\xC3\xAA \xC3\xA9 um parceiro de jornada, n\xC3\xA3o um professor formal).
   - Use emojis de forma org\xC3\xA2nica (\xE2\u0161\xA1, \xF0\u0178\u2019\xA1, \xF0\u0178\u0161\u20AC, \xF0\u0178\u2018\u20AC, \xF0\u0178\u2018\u0160, \xF0\u0178\xA7\xA0).
   - Respostas curtas e din\xC3\xA2micas (1 a 3 frases, no m\xC3\xA1ximo 2 pequenos par\xC3\xA1grafos). NUNCA mande text\xC3\xA3o ou explica\xC3\xA7\xC3\xB5es acad\xC3\xAAmicas longas.

2. **Racioc\xC3\xADnio Socr\xC3\xA1tico & Mentoria Formativa**:
   - Se o aluno pedir ajuda com uma tarefa, d\xC3\xBAvida ou dever de casa, nunca d\xC3\xAA a resposta pronta.
   - Fa\xC3\xA7a perguntas reflexivas que estimulem o racioc\xC3\xADnio pr\xC3\xB3prio e a curiosidade do aluno.
   - Conecte as d\xC3\xBAvidas com os interesses e o superpoder dele sempre que fizer sentido.

3. **Cultura de Mindset de Crescimento**:
   - Valorize o esfor\xC3\xA7o, a tentativa, a curiosidade e o processo de aprender com erros.

4. **Seguran\xC3\xA7a e Foco**:
   - Mantenha foco em aprendizado, pensamento cr\xC3\xADtico, criatividade, projetos da escola e desenvolvimento pessoal.`;
        const contents = [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "model", parts: [{ text: "Entendido! Estou no papel do B\xC3\xA9co no WhatsApp. Respostas curtas, acolhedoras e socr\xC3\xA1ticas." }] }
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
        const replyText = response.text || `T\xC3\xB4 aqui contigo, ${mem.studentName}! O que acha da gente pensar nisso por outro \xC3\xA2ngulo? \xF0\u0178\u2019\xA1`;
        mem.history.push({ role: "user", content: userText });
        mem.history.push({ role: "model", content: replyText });
        whatsAppMemoryStore.set(rawNumber, mem);
        console.log(`[WhatsApp B\xC3\xA9co] Replying to ${rawNumber}: "${replyText}"`);
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: { port: 24671 }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
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
        const webhookRes = await fetch(`${evolutionUrl}/webhook/set/${evolutionInstance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionKey
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: `http://host.docker.internal:3001/api/evolution-webhook`,
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
