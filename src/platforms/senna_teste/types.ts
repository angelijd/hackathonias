export interface FeatureItem {
  id: string;
  badgeClass: string;
  badgeBg: string;
  iconType: 'questions' | 'ai' | 'report';
  title: string;
  description: string;
}

export interface Question {
  id: number;
  type: 'multiple-choice' | 'open-ended';
  category: 'Pensamento Crítico' | 'Criatividade' | 'Resolução de Problemas';
  title: string;
  scenario: string;
  options?: {
    id: string;
    text: string;
    aiFeedback: string;
  }[];
  placeholder?: string;
}

export interface InterestOption {
  id: string;
  label: string;
  icon: string;
  questionPrompt?: string;
  placeholder?: string;
}

export interface ExpectationOption {
  id: string;
  label: string;
  icon: string;
}

export type ScreenStep = 'welcome' | 'preferences' | 'assessment';

export interface QuestionItem {
  rubricaId: string;
  tipo: 'dissertativa' | 'multipla_marcacao';
  enunciado: string;
  opcoes?: string[];
}

export type Answer = string | string[];

export interface ReportData {
  habilidadesCognitivas: string[];
  habilidadesSocioemocionais: string[];
  pontosFortes: string[];
  pontosMelhoria: string[];
  proximoPasso: string[];
}

export interface MergedReportData {
  arquetipo: string;
  sinteseGeral: string;
  matrizCompetencias: {
    cognitiva: string;
    socioemocional: string;
    metacognitiva: string;
  };
  superPoder: string;
  desafioDesenvolvimento: string;
  proximoPassoPratico: string;
  recadoBecoWhats: string;
}
