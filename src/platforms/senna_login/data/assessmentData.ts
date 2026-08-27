import { Question } from '../types';

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    category: 'Pensamento Crítico',
    title: 'Análise de Cenário: Mobilidade e Sustentabilidade',
    scenario: 'Uma cidade média observou aumento de 40% no tráfego urbano nos últimos 3 anos. O comitê propôs 4 estratégias sem aumentar impostos municipais. Qual decisão equilibra pensamento crítico, viabilidade econômica e impacto sustentável?',
    options: [
      {
        id: 'a',
        text: 'Implementar rodízio de veículos com base no final da placa apenas nos horários de pico.',
        aiFeedback: 'Solução clássica de mitigação rápida, porém pode incentivar a compra de segundos veículos mais antigos e poluentes.'
      },
      {
        id: 'b',
        text: 'Reestruturar rotas de micro-ônibus inteligentes conectadas a ciclovias e incentivar caronas corporativas com faixas exclusivas.',
        aiFeedback: 'Excelente pensamento sistêmico! Integra modais existentes, estimula compartilhamento e reduz gargalos estruturais com baixo custo.'
      },
      {
        id: 'c',
        text: 'Subsidiar totalmente o transporte público cortando verbas de manutenção de vias asfaltadas.',
        aiFeedback: 'Pode gerar deterioração acelerada da infraestrutura geral e colapso na segurança viária a médio prazo.'
      },
      {
        id: 'd',
        text: 'Proibir novos cadastros de motoristas de aplicativo no perímetro central.',
        aiFeedback: 'Trata o sintoma ao invés da causa raiz e pode restringir a mobilidade de milhares de cidadãos sem alternativa rápida.'
      }
    ]
  },
  {
    id: 2,
    type: 'open-ended',
    category: 'Criatividade',
    title: 'Pensamento Divergente: Solução para Resíduos em Escolas',
    scenario: 'Imagine que você foi desafiado a criar um projeto inovador para transformar 100% dos resíduos orgânicos e plásticos de uma escola pública em recursos úteis para a própria comunidade escolar. Descreva sua ideia e como envolveria os estudantes.',
    placeholder: 'Explique sua ideia inovadora, as etapas práticas e como a inteligência coletiva dos alunos seria aplicada...'
  },
  {
    id: 3,
    type: 'multiple-choice',
    category: 'Resolução de Problemas',
    title: 'Tomada de Decisão sob Incerteza',
    scenario: 'Sua equipe desenvolveu um protótipo com alta taxa de inovação, mas os primeiros testes com usuários apontaram 3 falhas de usabilidade não previstas. O lançamento está previsto para daqui a 5 dias. Qual é a melhor abordagem crítica?',
    options: [
      {
        id: 'a',
        text: 'Lançar conforme o cronograma e corrigir as falhas nas versões seguintes sem avisar os primeiros usuários.',
        aiFeedback: 'Pode comprometer a reputação inicial e a confiança dos adotantes pioneiros do projeto.'
      },
      {
        id: 'b',
        text: 'Classificar as falhas por severidade, ajustar imediatamente a falha crítica em 48h e lançar em formato beta transparente.',
        aiFeedback: 'Abordagem ágil e madura: prioriza experiência central, gerencia expectativas e aprende rápido com o feedback real.'
      },
      {
        id: 'c',
        text: 'Cancelar todo o projeto e começar do zero com uma nova tecnologia.',
        aiFeedback: 'Desperdiça o aprendizado acumulado diante de ajustes que podem ser resolvidos de forma iterativa.'
      }
    ]
  }
];
