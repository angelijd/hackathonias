import { InterestOption, ExpectationOption } from '../types';

export const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'musica', label: 'Música', icon: '🎵', questionPrompt: 'Qual seu artista favorito?', placeholder: 'Ex: Anitta, Rock, Violão...' },
  { id: 'games', label: 'Games', icon: '🎮', questionPrompt: 'Qual seu jogo favorito?', placeholder: 'Ex: Minecraft, Valorant...' },
  { id: 'esportes', label: 'Esportes', icon: '⚽', questionPrompt: 'Qual seu esporte favorito?', placeholder: 'Ex: Futebol, Basquete, Flamengo...' },
  { id: 'filmes', label: 'Filmes', icon: '🎬', questionPrompt: 'Qual seu filme favorito?', placeholder: 'Ex: Homem-Aranha, Harry Potter...' },
  { id: 'series', label: 'Séries', icon: '📺', questionPrompt: 'Qual sua série favorita?', placeholder: 'Ex: Stranger Things, Wandinha...' },
  { id: 'animais', label: 'Animais', icon: '🐾', questionPrompt: 'Qual seu animal favorito?', placeholder: 'Ex: Cachorro, Gato, Coelho...' },
  { id: 'ler', label: 'Livros e HQs', icon: '📖', questionPrompt: 'Qual seu livro ou HQ favorito?', placeholder: 'Ex: Percy Jackson, Turma da Mônica...' },
  { id: 'influencers', label: 'Influencers', icon: '🌟', questionPrompt: 'Qual seu influencer favorito?', placeholder: 'Ex: Casimiro, Virginia...' },
  { id: 'danca', label: 'Dança', icon: '💃', questionPrompt: 'Qual sua dança favorita?', placeholder: 'Ex: Hip Hop, Ballet, K-pop...' },
  { id: 'colecionaveis', label: 'Colecionáveis', icon: '🏆', questionPrompt: 'O que você coleciona?', placeholder: 'Ex: Figurinhas, Cartas, Carrinhos...' },
  { id: 'animes', label: 'Animes', icon: '🥷', questionPrompt: 'Qual seu anime favorito?', placeholder: 'Ex: Naruto, One Piece...' },
];

export const EXPECTATION_OPTIONS: ExpectationOption[] = [
  { id: 'conhecer', label: 'Me conhecer melhor', icon: '💖' },
  { id: 'ideias', label: 'Desenvolver minhas ideias', icon: '💡' },
  { id: 'desafio', label: 'Ter um desafio diferente', icon: '🏔️' },
  { id: 'nao-sei', label: 'Não sei', icon: '❓' },
];
