
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { RequestForm } from './components/RequestForm';
import { TicketCard } from './components/TicketCard';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './components/LandingPage';
import { Ticket, TicketStatus, UserRole } from './types';
import { queueService } from './services/queueService';

// ============================================================================
// 👥 PERFIS DE MENTORES
// ============================================================================
const MENTORS = {
  muzeira: {
    id: 'muzeira',
    name: 'Muzeira',
    email: 'muzeira@mentor.com', 
    photo: "https://i.imgur.com/h32KOQd.jpeg",
    canClearHistory: true
  },
  kayo: {
    id: 'kayo',
    name: 'Tocha 🔥', 
    email: 'kayo@mentor.com',
    photo: "https://i.imgur.com/garicye.jpeg", 
    canClearHistory: false
  }
};

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const App: React.FC = () => {
  // UI State
  const [hasEntered, setHasEntered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // App State
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isSystemOnline, setIsSystemOnline] = useState(false);
  
  // Dev State
  const [devTelegramId, setDevTelegramId] = useState('');

  // Refs para controle de notificação
  const prevPendingCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Status dos Mentores
  const [mentorStatuses, setMentorStatuses] = useState({ muzeira: false, kayo: false });
  
  // Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Identifica qual perfil está logado
  const loggedMentor = currentUserEmail === MENTORS.kayo.email 
    ? MENTORS.kayo 
    : MENTORS.muzeira;

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    setIsSystemOnline(queueService.isSystemOnline());

    const unsubscribeAuth = queueService.subscribeToAuth((user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setCurrentUserEmail(user.email);
        
        if (!user.isAnonymous) {
          setIsAdminAuthenticated(true);
          setRole(UserRole.MENTOR);
        } else {
          setIsAdminAuthenticated(false);
          if (role === UserRole.MENTOR) {
            setRole(UserRole.STUDENT);
          }
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserEmail(null);
        setIsAdminAuthenticated(false);
      }
    });

    const unsubscribeTickets = queueService.subscribe(
      (updatedTickets) => {
        setTickets(updatedTickets);
        setErrorMessage(null);
      },
      (error) => {
        console.error("App: Erro ao carregar tickets", error);
        if (error.message.includes("permission_denied")) {
          setErrorMessage("ACESSO NEGADO: Verifique as regras do banco.");
        } else {
          setErrorMessage(`Erro de conexão: ${error.message}`);
        }
      }
    );

    const unsubscribeStatus = queueService.subscribeToMentorStatus((statuses) => {
      setMentorStatuses(statuses);
    });

    const handleLocalUpdate = () => {
      if (!queueService.isSystemOnline()) {
         const saved = localStorage.getItem('muzeira-tickets');
         if (saved) setTickets(JSON.parse(saved));
      }
    };
    window.addEventListener('local-storage-update', handleLocalUpdate);
    
    return () => {
      if (typeof unsubscribeTickets === 'function') unsubscribeTickets();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
      window.removeEventListener('local-storage-update', handleLocalUpdate);
    };
  }, [role]);

  // Efeito para Notificações
  useEffect(() => {
    const pendingCount = tickets.filter(t => t.status === TicketStatus.PENDING).length;

    if (hasEntered && pendingCount > prevPendingCountRef.current) {
      if (audioRef.current) audioRef.current.play().catch(() => {});
    }

    if (pendingCount > 0) {
      document.title = `(${pendingCount}) Nova Mentoria! 🔥`;
    } else {
      document.title = 'Mentoria do Muzeira';
    }

    prevPendingCountRef.current = pendingCount;
  }, [tickets, hasEntered]);

  const handleEnterSystem = () => {
    setHasEntered(true);
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        audioRef.current!.currentTime = 0;
      }).catch(() => {});
    }
  };

  const handleCreateTicket = useCallback(async (name: string, reason: string, availability: string) => {
    try {
      const tempId = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2);

      const newTicket: Ticket = {
        id: tempId, 
        studentName: name,
        reason,
        availability,
        status: TicketStatus.PENDING,
        createdAt: Date.now(),
      };

      await queueService.addTicket(newTicket);
    } catch (error: any) {
      alert(`Erro ao criar ticket: ${error.message}`);
    }
  }, []);

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    try {
      const updates: Partial<Ticket> = { status };
      if (status === TicketStatus.RESOLVED || status === TicketStatus.DISCARDED) {
         updates.resolvedBy = loggedMentor.name;
      }
      await queueService.updateTicket(id, updates);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      await queueService.updateTicket(id, updates);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleToggleRole = () => {
    if (role === UserRole.STUDENT) {
      if (isAdminAuthenticated) {
        setRole(UserRole.MENTOR);
      } else {
        setIsLoginModalOpen(true);
      }
    } else {
      setRole(UserRole.STUDENT);
    }
  };

  const handleConnectTelegram = async () => {
    const id = prompt("Digite seu ID do Telegram:\n\n1. Abra o bot @userinfobot no Telegram\n2. Copie o número (Id)\n3. Cole aqui:");
    
    if (id) {
      try {
        await queueService.registerTelegramId(id, loggedMentor.name);
        alert("ID salvo! Vamos fazer um teste...");
        await queueService.sendTestNotification(id);
        alert("Mensagem de teste enviada! Verifique seu Telegram.");
      } catch (e: any) {
        alert(`Erro: ${e.message}`);
      }
    }
  };

  // Funções da Área Dev
  const handleDevSave = async () => {
    try {
       await queueService.registerTelegramId(devTelegramId, "Dev Tester");
       alert("ID Salvo!");
    } catch (e: any) { alert(e.message) }
  };

  const handleDevTest = async () => {
    try {
      if(!devTelegramId) return alert("Preencha o ID primeiro!");
      await queueService.sendTestNotification(devTelegramId);
      alert("Comando enviado!\n\nSe não chegar:\n1. Verifique se mandou 'Oi' para o bot do sistema.\n2. Verifique se o ID está correto.");
    } catch (e: any) { alert(e.message) }
  };


  const mentorsList = [
    { ...MENTORS.muzeira, isOnline: mentorStatuses.muzeira },
    { ...MENTORS.kayo, isOnline: mentorStatuses.kayo }
  ];

  if (!hasEntered) {
    return <LandingPage onEnter={handleEnterSystem} mentors={mentorsList} />;
  }

  const pendingTickets = tickets.filter(t => t.status === TicketStatus.PENDING);
  const historyTickets = tickets.filter(t => t.status !== TicketStatus.PENDING);
  const isCurrentMentorOnline = loggedMentor.id === 'kayo' ? mentorStatuses.kayo : mentorStatuses.muzeira;

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 pb-20 animate-[fadeIn_0.5s_ease-out] flex flex-col">
      {errorMessage && (
        <div className="bg-red-600/90 backdrop-blur-md text-white px-4 py-3 font-bold text-sm sticky top-0 z-[60] flex justify-center items-center gap-2 shadow-lg animate-pulse">
          {errorMessage}
        </div>
      )}
      
      <Header 
        role={role} 
        isAuthenticated={isAdminAuthenticated}
        onToggleRole={handleToggleRole} 
        onBack={() => setHasEntered(false)}
        mentors={mentorsList}
        isOnline={isCurrentMentorOnline}
        avatarUrl={role === UserRole.MENTOR ? loggedMentor.photo : undefined} 
      />
      
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={(u, p) => queueService.loginAdmin(u, p).then(() => true)}
      />

      <main className="max-w-5xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        <div className="lg:col-span-1 space-y-6">
          {role === UserRole.STUDENT ? (
            <RequestForm onSubmit={handleCreateTicket} />
          ) : (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
              
              <div className="flex flex-col items-center pb-4 border-b border-slate-700">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-500 p-1 mb-3">
                  <img src={loggedMentor.photo} alt={loggedMentor.name} className="w-full h-full rounded-full object-cover" />
                </div>
                <h2 className="text-xl font-bold text-white">Olá, {loggedMentor.name}</h2>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{loggedMentor.id === 'kayo' ? 'Suporte Técnico' : 'Mentor Principal'}</span>
              </div>

              <div>
                <button 
                  onClick={() => queueService.setMentorStatus(loggedMentor.id as any, !isCurrentMentorOnline)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border mb-2 ${
                    isCurrentMentorOnline 
                      ? 'bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20' 
                      : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {isCurrentMentorOnline ? 'VOCÊ ESTÁ ONLINE' : 'VOCÊ ESTÁ OFFLINE'}
                </button>

                <button 
                  onClick={handleConnectTelegram}
                  className="w-full py-2 px-4 bg-[#229ED9]/10 border border-[#229ED9]/30 text-[#229ED9] hover:bg-[#229ED9]/20 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.7.15-.15 2.81-2.57 2.86-2.79.01-.03.01-.13-.05-.18-.06-.05-.16-.03-.23-.02-.1.02-1.63 1.03-4.6 3.03-.43.3-.82.44-1.17.43-.38-.01-1.12-.21-1.67-.38-.68-.21-1.22-.32-1.17-.67.02-.18.28-.36.75-.55 2.96-1.29 4.94-2.14 5.93-2.55 2.83-1.17 3.41-1.37 3.8-1.38.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                  </svg>
                  Configurar Telegram
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-sm">Fila Atual</span>
                  <div className="text-3xl font-bold text-indigo-400">{pendingTickets.length}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                {loggedMentor.canClearHistory && (
                  <button 
                    onClick={() => {
                       if(confirm("Apagar histórico?")) queueService.clearHistory().catch(console.error);
                    }}
                    disabled={historyTickets.length === 0}
                    className="w-full py-2 px-4 border border-slate-600/50 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg text-sm transition-colors"
                  >
                    Limpar Histórico
                  </button>
                )}

                <button 
                  onClick={() => queueService.logoutAdmin()}
                  className="w-full py-2 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
              <span>Fila de Espera</span>
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                {pendingTickets.length} na fila
              </span>
            </h2>
            
            {pendingTickets.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
                <h3 className="text-slate-300 font-medium">A fila está vazia!</h3>
                <p className="text-slate-500 text-sm mt-1">Aproveite para ser o primeiro.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    role={role}
                    currentUserId={currentUserId}
                    onStatusChange={handleStatusChange}
                    onUpdateTicket={handleUpdateTicket}
                  />
                ))}
              </div>
            )}
          </div>

          {historyTickets.length > 0 && (
            <div className="pt-8 border-t border-slate-800">
              <h2 className="text-lg font-bold text-slate-400 mb-4">Histórico Recente</h2>
              <div className="space-y-4 opacity-75">
                 {historyTickets.slice(0, 5).map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    role={role}
                    currentUserId={currentUserId}
                    onStatusChange={handleStatusChange}
                    onUpdateTicket={handleUpdateTicket}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RODAPÉ DE DESENVOLVEDOR (TESTE RÁPIDO) */}
      <footer className="mt-12 py-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
           <div>&copy; 2024 Mentoria do Muzeira - Sistema de Filas v1.1</div>
           
           <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700">
             <span className="font-bold text-indigo-400">DEV TELEGRAM:</span>
             <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:underline border border-indigo-500/30 px-1 rounded">
                (Pegar ID)
             </a>
             <input 
               type="text" 
               placeholder="Cole seu ID aqui" 
               className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 w-32 focus:outline-none focus:border-indigo-500"
               value={devTelegramId}
               onChange={(e) => setDevTelegramId(e.target.value)}
             />
             <button 
               onClick={handleDevSave}
               className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
               title="Salvar ID no Banco"
             >
               Salvar
             </button>
             <button 
               onClick={handleDevTest}
               className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
               title="Enviar mensagem de teste"
             >
               Testar
             </button>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
