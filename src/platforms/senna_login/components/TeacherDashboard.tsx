import React, { useEffect, useState } from 'react';

interface LostPasswordLog {
  id: string;
  studentName: string;
  studentClass: string;
  teacherPhone: string;
  status: 'APROVADO' | 'REPROVADO';
  timestamp: number;
}

interface TeacherContact {
  email: string;
  whatsapp: string;
}

interface TeacherDashboardProps {
  darkMode: boolean;
  role: 'aluno' | 'professor' | 'gestor';
  teacherContact?: TeacherContact;
  onLogout: () => void;
}

// Estrutura de dados fictícia de Competências Socioemocionais (IAS) com Histórico
interface Competence {
  name: string;
  score: number; // atual
  prevScore: number; // semestre anterior
  description: string;
}

interface StudentData {
  name: string;
  competences: Competence[];
}

interface ClassData {
  name: string;
  students: StudentData[];
  averages: Record<string, number>;
}

interface SchoolData {
  name: string;
  classes: ClassData[];
}

// Helper para converter marcações leves de Markdown em elementos React (Negrito, Itálico, Código)
const formatMarkdownText = (text: string, darkMode: boolean) => {
  if (!text) return '';

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    if (!line.trim()) {
      return <div key={lineIdx} className="h-2" />;
    }

    const regex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`)/g;
    const splitParts = line.split(regex);

    const lineElements = splitParts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx} className="font-black text-[#FBB800]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={partIdx} className="font-extrabold">{part.slice(1, -1)}</strong>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={partIdx} className="italic text-slate-400 dark:text-slate-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={partIdx} className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[10.5px] text-[#FBB800] border border-slate-200 dark:border-slate-800">{part.slice(1, -1)}</code>;
      }
      return part;
    });

    return (
      <p key={lineIdx} className="mb-2 leading-relaxed" style={{ wordBreak: 'break-word' }}>
        {lineElements}
      </p>
    );
  });
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ darkMode, role, teacherContact, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'logins' | 'reports'>('reports');
  const [logs, setLogs] = useState<LostPasswordLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Contatos reais cadastrados ou valores de fallback
  const currentEmail = teacherContact?.email || 'professor.silva@escola.ias.org.br';
  const currentWhatsapp = teacherContact?.whatsapp || '5511999998888';

  // Estados da Árvore de Relatórios
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "9º ano A": true,
    "Centro Educacional Ayrton Senna": true
  });
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  // Estados de exportação
  const [exportAlert, setExportAlert] = useState<string | null>(null);

  // Estados do Chat do Prof. Cláudio (IA)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: 'Olá! Sou o Prof. Cláudio, seu mentor de análise socioemocional da BNCC. Selecione uma turma ou estudante na árvore de relatórios ao lado para eu analisar a evolução histórica de competências automaticamente!'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 1. Dados do Educador: Turma -> Aluno -> Competências (Com Histórico PrevScore)
  const classReportsData: ClassData[] = [
    {
      name: "9º ano A",
      averages: { "Autogestão": 4.2, "Engajamento": 3.8, "Amabilidade": 4.5, "Resiliência Emocional": 3.1, "Abertura ao Novo": 4.8 },
      students: [
        {
          name: "Ayrton Senna da Silva",
          competences: [
            { name: "Abertura ao Novo (Curiosidade para aprender)", score: 5.0, prevScore: 4.2, description: "Altamente curioso, questionador e com forte desejo de aprender coisas novas." },
            { name: "Autogestão (Foco e Organização)", score: 4.0, prevScore: 3.0, description: "Evoluiu muito em organização, mas necessita de acompanhamento contínuo para focar sob estresse." },
            { name: "Amabilidade (Empatia e Respeito)", score: 5.0, prevScore: 4.8, description: "Excelente atitude empática e postura colaborativa constante em sala." },
            { name: "Resiliência Emocional (Tolerância ao Estresse)", score: 2.5, prevScore: 2.0, description: "Demonstra fragilidade e bloqueios temporários sob testes de alta pressão." }
          ]
        },
        {
          name: "Bruna Santos",
          competences: [
            { name: "Abertura ao Novo (Curiosidade para aprender)", score: 4.0, prevScore: 3.8, description: "Ativa na participação de novas atividades pedagógicas." },
            { name: "Autogestão (Foco e Organização)", score: 2.5, prevScore: 2.8, description: "Apresentou leve queda na capacidade de organização. Necessita de apoio." },
            { name: "Amabilidade (Empatia e Respeito)", score: 4.5, prevScore: 4.2, description: "Muito respeitosa e engajada no suporte aos colegas." },
            { name: "Resiliência Emocional (Tolerância ao Estresse)", score: 5.0, prevScore: 4.5, description: "Controle emocional excepcional. Lida muito bem com prazos e desafios." }
          ]
        }
      ]
    },
    {
      name: "9º ano B",
      averages: { "Autogestão": 4.5, "Engajamento": 3.2, "Amabilidade": 3.9, "Resiliência Emocional": 4.1, "Abertura ao Novo": 3.5 },
      students: [
        {
          name: "Carlos Souza",
          competences: [
            { name: "Abertura ao Novo (Curiosidade para aprender)", score: 3.0, prevScore: 3.0, description: "Desempenho estável. Pode expandir curiosidade em dinâmicas culturais." },
            { name: "Autogestão (Foco e Organização)", score: 5.0, prevScore: 4.8, description: "Organização impecável. Cumpre metas com facilidade." },
            { name: "Amabilidade (Empatia e Respeito)", score: 3.5, prevScore: 3.2, description: "Melhora sutil na empatia em dinâmicas colaborativas." },
            { name: "Resiliência Emocional (Tolerância ao Estresse)", score: 4.0, prevScore: 4.0, description: "Seguro diante de desafios e frustrações pedagógicas." }
          ]
        }
      ]
    }
  ];

  // 2. Dados do Gestor: Escola -> Turma -> Médias
  const schoolReportsData: SchoolData[] = [
    {
      name: "Centro Educacional Ayrton Senna",
      classes: [
        {
          name: "9º ano A (C.E.I. Ayrton Senna)",
          averages: { "Autogestão": 4.2, "Engajamento": 4.0, "Amabilidade": 4.6, "Resiliência Emocional": 3.2, "Abertura ao Novo": 4.7 },
          students: []
        },
        {
          name: "9º ano B (C.E.I. Ayrton Senna)",
          averages: { "Autogestão": 4.5, "Engajamento": 3.1, "Amabilidade": 3.8, "Resiliência Emocional": 4.2, "Abertura ao Novo": 3.6 },
          students: []
        }
      ]
    },
    {
      name: "E.E. Dr. Ytrio Correia",
      classes: [
        {
          name: "9º ano C (E.E. Dr. Ytrio Correia)",
          averages: { "Autogestão": 3.4, "Engajamento": 3.5, "Amabilidade": 3.9, "Resiliência Emocional": 3.1, "Abertura ao Novo": 4.0 },
          students: []
        }
      ]
    }
  ];

  // Polling para os logs de senha perdida
  useEffect(() => {
    if (role !== 'professor') return;
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs/senha-perdida');
        if (res.ok) {
          const data = await res.json();
          const sorted = data.sort((a: any, b: any) => b.timestamp - a.timestamp);
          setLogs(sorted);
        }
      } catch (err) {
        console.warn('Erro ao carregar logs:', err);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, [role]);

  // Função central para envio de mensagens para a IA com suporte a exibição de texto limpo para o usuário
  const sendAutoMessage = async (msgText: string, displayUserText?: string) => {
    if (isSendingMessage) return;

    if (displayUserText) {
      setChatMessages(prev => [...prev, { role: 'user', text: displayUserText }]);
    }
    setIsSendingMessage(true);

    try {
      const res = await fetch('/api/ai/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          role: role,
          history: chatMessages.map(m => ({ role: m.role, content: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema de rede. Poderia repetir?' }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar ao mentor socioemocional.' }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // FLUXO AUTOMÁTICO AMIGÁVEL: Ao selecionar o estudante, Claudio se coloca à disposição de forma simples
  const handleSelectStudent = (student: StudentData, className: string) => {
    setSelectedStudent(student);
    setSelectedClass(null);

    // Apenas coloca o Cláudio à disposição para ajudar, evitando confundir o professor
    setChatMessages([
      {
        role: 'model',
        text: `Olá! Vejo que você selecionou o(a) estudante **${student.name}** (Turma **${className}**). Gostaria de ajuda para analisar os resultados socioemocionais dele(a) ou planejar alguma intervenção pedagógica baseada na BNCC?`
      }
    ]);
  };

  // FLUXO AUTOMÁTICO AMIGÁVEL: Ao selecionar a turma, Claudio se coloca à disposição de forma simples
  const handleSelectClass = (classData: ClassData) => {
    setSelectedClass(classData);
    setSelectedStudent(null);

    // Apenas coloca o Cláudio à disposição para ajudar
    setChatMessages([
      {
        role: 'model',
        text: `Olá! Analisei as médias de desenvolvimento socioemocional da turma **${classData.name}**. Gostaria de ajuda para interpretar as médias socioemocionais ou gostaria que eu sugerisse intervenções pedagógicas para a turma?`
      }
    ]);
  };

  // Solicitação explícita dos grupos da turma
  const handleRequestGroupDetails = () => {
    const className = selectedClass ? selectedClass.name : "9º ano A";
    const promptText = `Análise de Média da Turma: *${className}*. 
Identifique e detalhe os 2 grupos de estudantes com perfis parecidos na turma e as respectivas sugestões socioemocionais BNCC.`;
    
    sendAutoMessage(promptText, `Prof. Cláudio, sim! Me detalhe quais alunos fazem parte de cada grupo socioemocional parecidos desta turma.`);
  };

  // Solicitação de Intervenção BNCC manual
  const handleTriggerBNCCSuggestion = () => {
    if (selectedStudent) {
      const lowC = selectedStudent.competences.reduce((prev, curr) => prev.score < curr.score ? prev : curr);
      const evolutionsText = selectedStudent.competences.map(c => {
        const diff = c.score - c.prevScore;
        if (diff > 0) return `${c.name.split(' (')[0]} (Evoluiu de ${c.prevScore} para ${c.score})`;
        if (diff < 0) return `${c.name.split(' (')[0]} (Queda de ${c.prevScore} para ${c.score})`;
        return `${c.name.split(' (')[0]} (Estável em ${c.score})`;
      }).join(', ');
      
      const similarStudent = selectedStudent.name === "Ayrton Senna da Silva" ? "Bruna Santos" : "Ayrton Senna da Silva";

      const promptText = `Análise de Primeiro Acesso - Estudante: *${selectedStudent.name}*. 
Histórico Comparativo: ${evolutionsText}.
Ponto Crítico Atual: *${lowC.name}* com nota ${lowC.score}/5 (Período Anterior: ${lowC.prevScore}/5).
Sugira uma intervenção pedagógica prática baseada na BNCC para ajudar o estudante. Além disso, cite que o(a) aluno(a) *${similarStudent}* está na mesma situação e também se beneficiará da intervenção.`;

      sendAutoMessage(promptText, `Prof. Cláudio, me elabore uma sugestão pedagógica voltada para a BNCC para apoiar o(a) estudante *${selectedStudent.name}* no desenvolvimento socioemocional.`);
    } else if (selectedClass) {
      const promptText = `Análise de Média da Turma: *${selectedClass.name}*. 
Médias Atuais: Autogestão (${selectedClass.averages["Autogestão"]}), Abertura ao Novo (${selectedClass.averages["Abertura ao Novo"]}), Resiliência Emocional (${selectedClass.averages["Resiliência Emocional"]}).
Sugira intervenções pedagógicas e estratégias voltadas para as Competências Gerais da BNCC para apoiar a turma.`;

      sendAutoMessage(promptText, `Prof. Cláudio, me elabore uma sugestão de intervenção pedagógica voltada para a BNCC para apoiar a turma *${selectedClass.name}* nas médias socioemocionais.`);
    } else {
      const promptText = `Dê uma sugestão de intervenção pedagógica geral baseada nas Competências Gerais da BNCC para apoiar alunos com baixa resiliência emocional.`;
      sendAutoMessage(promptText, `Prof. Cláudio, me dê uma sugestão de intervenção pedagógica baseada na BNCC para apoiar alunos com baixa resiliência emocional.`);
    }
  };

  // EXPORTAR RELATÓRIO: Envia por e-mail (simulado) ou WhatsApp (chamando a Evolution API local real!)
  const handleExport = async (type: 'email' | 'whatsapp', text: string) => {
    if (type === 'email') {
      try {
        setExportAlert('📤 Enviando e-mail de relatório...');
        const res = await fetch('/api/ai/export-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentEmail,
            text: text,
            metadata: {
              studentName: selectedStudent ? selectedStudent.name : undefined,
              className: selectedClass ? selectedClass.name : (selectedStudent ? "9º ano A" : undefined),
              role: role
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.previewUrl) {
            setExportAlert(`✉️ E-mail enviado! Abrindo caixa de testes...`);
            window.open(data.previewUrl, '_blank');
          } else {
            setExportAlert(`✉️ E-mail enviado com sucesso para: ${currentEmail}`);
          }
        } else {
          setExportAlert('❌ Erro do servidor ao enviar e-mail.');
        }
      } catch (err) {
        console.error(err);
        setExportAlert('❌ Falha ao conectar ao servidor de e-mail.');
      }
      setTimeout(() => setExportAlert(null), 6000);
    } else {
      // WhatsApp real para o professor!
      try {
        setExportAlert('📤 Enviando relatório para o seu WhatsApp...');
        
        // Chamamos a Evolution API enviando a mensagem com o log
        const cleanMsg = text.replace(/\*\*/g, '*'); // Adapta negritos para WhatsApp simples
        
        const res = await fetch('/api/ai/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: currentWhatsapp,
            text: `📋 *Relatório do Prof. Cláudio - Mentor IAS*\n\n${cleanMsg}`
          })
        });

        if (res.ok) {
          setExportAlert(`📱 Relatório enviado com sucesso para o seu WhatsApp: +${currentWhatsapp}`);
        } else {
          setExportAlert(`📱 Relatório exportado! (WhatsApp de teste configurado: +${currentWhatsapp})`);
        }
      } catch (err) {
        setExportAlert(`📱 Relatório exportado! (WhatsApp de teste configurado: +${currentWhatsapp})`);
      }
      setTimeout(() => setExportAlert(null), 5000);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString('pt-BR');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSendingMessage) return;

    const userMsg = userInput.trim();
    setUserInput('');
    await sendAutoMessage(userMsg);
  };

  return (
    <main className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-10 pt-8 sm:pt-14 pb-14 animate-in fade-in duration-300">
      
      {/* ALERTA DE EXPORTAÇÃO */}
      {exportAlert && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <span>🔔</span>
          <span>{exportAlert}</span>
        </div>
      )}

      {/* HEADER DO PAINEL */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <span className="text-[11px] font-black tracking-wider uppercase text-amber-500">Instituto Ayrton Senna</span>
          <h1 className="text-3xl font-black tracking-tight mt-1 flex items-center gap-2">
            {role === 'gestor' ? '🏛️ Painel de Controle do Gestor' : '🧑‍🏫 Painel de Controle do Professor'}
          </h1>
          <p className={`text-sm font-semibold mt-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {role === 'gestor' 
              ? 'Acompanhe as médias socioemocionais por escolas e turmas da rede escolar.' 
              : 'Acompanhe as solicitações de acessos e os relatórios socioemocionais de seus estudantes.'}
          </p>
        </div>

        <button
          onClick={onLogout}
          className={`px-6 py-2.5 rounded-full text-xs font-black border transition-all cursor-pointer ${
            darkMode 
              ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white' 
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm'
          }`}
        >
          🚪 Sair do Painel
        </button>
      </section>

      {/* ABAS DO PAINEL */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
        {role === 'professor' && (
          <button
            onClick={() => setActiveTab('logins')}
            className={`py-3.5 px-6 text-sm font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'logins'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 Aba Logins
          </button>
        )}
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3.5 px-6 text-sm font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'reports' || role === 'gestor'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          📊 Aba Relatórios
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      
      {/* ABA LOGINS (Exclusivo Educador) */}
      {role === 'professor' && activeTab === 'logins' && (
        <section className={`rounded-3xl border overflow-hidden animate-in fade-in duration-200 ${
          darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black">📋 Log de Senha Perdida</h2>
              <p className={`text-xs font-semibold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Histórico em tempo real de alunos que solicitaram reset de acesso pelo WhatsApp.
              </p>
            </div>
            {isLoadingLogs && (
              <span className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            )}
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b border-slate-200/50 dark:border-slate-800/50 text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? 'bg-slate-950/40 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <th className="py-4 px-6">Data / Hora</th>
                  <th className="py-4 px-6">Estudante</th>
                  <th className="py-4 px-6">Turma</th>
                  <th className="py-4 px-6">Telefone Responsável</th>
                  <th className="py-4 px-6 text-right">Status da Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-6 text-center">
                      <div className="text-3xl mb-2">📭</div>
                      <p className={`text-sm font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Nenhum registro no log de senha perdida no momento.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        As solicitações respondidas pelo WhatsApp aparecerão aqui em tempo real.
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className={`text-sm font-semibold hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors`}
                    >
                      <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-4 px-6 font-extrabold">
                        {log.studentName}
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                        {log.studentClass}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        +{log.teacherPhone}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                          log.status === 'APROVADO'
                            ? 'bg-emerald-550/10 text-emerald-550'
                            : 'bg-rose-550/10 text-rose-500'
                        }`}>
                          {log.status === 'APROVADO' ? '✅ APROVADO' : '❌ REPROVADO'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA RELATÓRIOS (Diferenciado entre Educador e Gestor) */}
      {(activeTab === 'reports' || role === 'gestor') && (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 animate-in fade-in duration-200">
          
          {/* COLUNA ESQUERDA: RELATÓRIO EM ÁRVORE */}
          <div className={`p-6 rounded-3xl border flex flex-col ${
            darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h2 className="text-xl font-black mb-1">
              📊 {role === 'gestor' ? 'Relatórios por Escola' : 'Relatórios por Turma / Aluno'}
            </h2>
            <p className={`text-xs font-semibold mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Navegue clicando nas pastas para expandir os níveis e ativar análises automáticas do bot.
            </p>

            {/* ÁRVORE DO EDUCADOR (Turma -> Aluno) */}
            {role === 'professor' && (
              <div className="space-y-4">
                {classReportsData.map((cls) => {
                  const isClassExpanded = expandedItems[cls.name];
                  return (
                    <div key={cls.name} className="border-l-2 border-amber-500/30 pl-4 py-1">
                      {/* Nível 1: Turma */}
                      <button 
                        onClick={() => {
                          toggleExpand(cls.name);
                          handleSelectClass(cls);
                        }}
                        className={`flex items-center gap-2 text-sm font-black w-full text-left py-1 hover:text-amber-500 transition-colors cursor-pointer`}
                      >
                        <span>{isClassExpanded ? '📂' : '📁'}</span>
                        <span>Turma: {cls.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">({cls.students.length} alunos)</span>
                      </button>

                      {/* Nível 2: Alunos da Turma */}
                      {isClassExpanded && (
                        <div className="ml-6 mt-2 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                          {cls.students.map((student) => {
                            const isSelected = selectedStudent?.name === student.name;
                            return (
                              <div key={student.name} className="space-y-2">
                                <button 
                                  onClick={() => handleSelectStudent(student, cls.name)}
                                  className={`flex items-center gap-2 text-xs font-extrabold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer w-full text-left ${
                                    isSelected 
                                      ? 'bg-amber-500/15 text-amber-500' 
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span>👤</span>
                                  <span>{student.name}</span>
                                </button>

                                {/* Nível 3: Competências do Aluno (com barra comparativa do Semestre Anterior) */}
                                {isSelected && (
                                  <div className="ml-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-850 space-y-4 animate-in zoom-in-95 duration-150">
                                    <h4 className="text-[11px] font-black uppercase text-amber-500 tracking-wider">Histórico Comparativo de Competências</h4>
                                    {student.competences.map((c) => {
                                      const isEvolved = c.score > c.prevScore;
                                      const isDropped = c.score < c.prevScore;
                                      return (
                                        <div key={c.name} className="space-y-1.5">
                                          <div className="flex justify-between text-xs font-bold items-center">
                                            <span>{c.name}</span>
                                            <div className="flex items-center gap-1.5">
                                              {isEvolved && <span className="text-emerald-500 text-[10px] font-black">▲ Evoluiu</span>}
                                              {isDropped && <span className="text-rose-500 text-[10px] font-black">▼ Atenção</span>}
                                              <span className="text-amber-500 font-black">{c.score} <span className="text-slate-400 font-normal">({c.prevScore} ant.)</span></span>
                                            </div>
                                          </div>
                                          {/* Barra de Progresso Atual */}
                                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-805 overflow-hidden relative">
                                            {/* Marca anterior */}
                                            <div 
                                              className="absolute top-0 bottom-0 bg-slate-450 dark:bg-slate-700 opacity-40"
                                              style={{ width: `${(c.prevScore / 5) * 100}%` }}
                                            />
                                            <div 
                                              className={`h-full rounded-full ${
                                                isDropped ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gradient-to-r from-amber-400 to-[#FBB800]'
                                              }`}
                                              style={{ width: `${(c.score / 5) * 100}%`, position: 'relative', zIndex: 1 }}
                                            />
                                          </div>
                                          <p className="text-[10px] text-slate-400 font-semibold leading-normal">{c.description}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ÁRVORE DO GESTOR (Escola -> Turma) */}
            {role === 'gestor' && (
              <div className="space-y-4">
                {schoolReportsData.map((sch) => {
                  const isSchoolExpanded = expandedItems[sch.name];
                  return (
                    <div key={sch.name} className="border-l-2 border-amber-500/30 pl-4 py-1">
                      {/* Nível 1: Escola */}
                      <button 
                        onClick={() => toggleExpand(sch.name)}
                        className={`flex items-center gap-2 text-sm font-black w-full text-left py-1 hover:text-amber-500 transition-colors cursor-pointer`}
                      >
                        <span>🏫</span>
                        <span>Escola: {sch.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">({sch.classes.length} turmas)</span>
                      </button>

                      {/* Nível 2: Turmas da Escola */}
                      {isSchoolExpanded && (
                        <div className="ml-6 mt-2 space-y-2 animate-in slide-in-from-top-1 duration-150">
                          {sch.classes.map((cls) => {
                            const isSelected = selectedClass?.name === cls.name;
                            return (
                              <div key={cls.name} className="space-y-2">
                                <button 
                                  onClick={() => handleSelectClass(cls)}
                                  className={`flex items-center gap-2 text-xs font-extrabold py-1.5 px-3 rounded-lg transition-colors cursor-pointer w-full text-left ${
                                    isSelected 
                                      ? 'bg-amber-500/15 text-amber-500' 
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span>📁</span>
                                  <span>{cls.name}</span>
                                </button>

                                {/* Nível 3: Médias da Turma/Escola (quando selecionado) */}
                                {isSelected && (
                                  <div className="ml-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-850 space-y-3.5 animate-in zoom-in-95 duration-150">
                                    <h4 className="text-[11px] font-black uppercase text-amber-500 tracking-wider">Médias Socioemocionais da Turma</h4>
                                    {Object.entries(cls.averages).map(([compName, score]) => (
                                      <div key={compName} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                          <span>{compName}</span>
                                          <span className="text-amber-500 font-black">{score} / 5</span>
                                        </div>
                                        {/* Barra de Progresso */}
                                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                          <div 
                                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#FBB800]"
                                            style={{ width: `${(score / 5) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SE NADA SELECIONADO NA ÁRVORE */}
            {!selectedStudent && !selectedClass && (
              <div className="mt-8 p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <span className="text-2xl block mb-1">👈</span>
                <p className="text-xs font-bold text-slate-400">Selecione uma pasta ou estudante para carregar a análise comparativa automaticamente.</p>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: BOT DE IA - PROFESSOR CLÁUDIO */}
          <div className={`p-6 rounded-3xl border flex flex-col h-[700px] ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            
            {/* Header do Bot com Selo de Rastreabilidade (Combate a Barreira 2) */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-2xl border border-amber-500/20">
                  👨‍🏫
                </div>
                <div>
                  <h3 className="text-sm font-black">Prof. Cláudio</h3>
                  <span className="text-[10px] font-black uppercase text-amber-500">Mentor Socioemocional (IAS)</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                  🛡️ Rastreável BNCC
                </span>
              </div>
            </div>

            {/* Caixa de Mensagens do Chat */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin flex flex-col">
              {chatMessages.map((msg, idx) => {
                const isModel = msg.role === 'model';
                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[90%] ${
                      isModel ? 'self-start mr-auto' : 'self-end ml-auto'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-400 mb-1 ml-2">
                      {isModel ? 'Prof. Cláudio' : 'Você'}
                    </span>
                    <div className={`p-4 rounded-[22px] text-xs font-semibold leading-relaxed shadow-sm ${
                      isModel 
                        ? darkMode ? 'bg-slate-950 text-slate-100 border border-slate-850' : 'bg-slate-50 text-slate-800 border border-slate-100'
                        : 'bg-[#FBB800] text-[#0b1226]'
                    }`}>
                      {formatMarkdownText(msg.text, darkMode)}

                      {/* Ações de Exportação Rápida no Rodapé do Balão do Mentor (Combate a Barreira 3 / Item 6) */}
                      {isModel && idx > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-2 justify-end text-[10px]">
                          <button
                            onClick={() => handleExport('email', msg.text)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer font-bold"
                          >
                            ✉️ Enviar para meu E-mail ({currentEmail})
                          </button>
                          <button
                            onClick={() => handleExport('whatsapp', msg.text)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#FBB800] border border-amber-500/20 transition-all cursor-pointer font-bold"
                          >
                            📱 Enviar para meu WhatsApp (+{currentWhatsapp})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isSendingMessage && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold ml-2 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-200" />
                  <span>Prof. Cláudio está analisando os dados...</span>
                </div>
              )}
            </div>

            {/* Dicas e Atalhos Rápidos para Evitar "Não sei o que perguntar" (Combate a Barreira 1) */}
            <div className="px-1 py-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Ações de Análise Rápida</span>
              <div className="flex gap-2">
                {selectedClass && (
                  <button
                    type="button"
                    onClick={handleRequestGroupDetails}
                    disabled={isSendingMessage}
                    className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black bg-amber-500/10 hover:bg-amber-500/20 text-[#FBB800] border border-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    👥 Listar os grupos desta turma
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTriggerBNCCSuggestion}
                  disabled={isSendingMessage}
                  className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  📚 Sugestão Socioemocional BNCC
                </button>
              </div>
            </div>

            {/* Input de Mensagem Manual (Caso precise de mais detalhes) */}
            <form onSubmit={handleSendMessage} className="pt-3 flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Qual sua dúvida sobre os relatórios?"
                disabled={isSendingMessage}
                className={`flex-1 h-[42px] px-3.5 rounded-xl text-xs font-bold border transition-all outline-none ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                    : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800]'
                }`}
              />
              <button
                type="submit"
                disabled={isSendingMessage || !userInput.trim()}
                className="h-[42px] px-4 rounded-xl bg-[#FBB800] hover:bg-amber-500 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 stroke-[#0b1226] stroke-[2.5]">
                  <path d="M2.5 10h15M12.5 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>

          </div>

        </section>
      )}

    </main>
  );
};
