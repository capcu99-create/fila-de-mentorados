
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
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);

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

  // Funções da Área Dev (Config Telegram)
  const handleDevSave = async () => {
    try {
       await queueService.registerTelegramId(devTelegramId, loggedMentor.name);
       alert("✅ ID Salvo com sucesso!");
    } catch (e: any) { alert(e.message) }
  };

  const handleDevTest = async () => {
    try {
      if(!devTelegramId) return alert("⚠️ Preencha o ID primeiro!");
      await queueService.sendTestNotification(devTelegramId);
      alert("🚀 Comando enviado!\n\nSe não chegar em 5 segundos:\n1. Você esqueceu de dar 'Oi' pro seu Bot.\n2. O ID está errado.");
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

      {/* RODAPÉ DE CONFIGURAÇÃO - VISÍVEL APENAS PARA MENTORES */}
      <footer className="mt-12 py-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur relative">
        {role === UserRole.MENTOR && showTelegramHelp && (
           <div className="absolute bottom-full left-0 w-full bg-slate-900 border-t border-indigo-500/30 p-4 shadow-2xl animate-in slide-in-from-bottom-5">
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                   <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                     <span className="bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                     Falar com o Bot
                   </h3>
                   <p className="text-slate-400 text-xs">Abra o seu Bot no Telegram e clique em <strong>Começar (Start)</strong> ou mande um "Oi".</p>
                </div>
                <div className="flex-1">
                   <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                     <span className="bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                     Pegar seu ID
                   </h3>
                   <p className="text-slate-400 text-xs">Mande uma mensagem para o bot <a href="https://t.me/userinfobot" target="_blank" className="text-white underline">@userinfobot</a>. Ele vai responder com um número.</p>
                </div>
                <div className="flex-1">
                   <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                     <span className="bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
                     Salvar e Testar
                   </h3>
                   <p className="text-slate-400 text-xs">Copie o número, cole no campo abaixo e clique em Salvar. Depois clique em Testar.</p>
                </div>
                <button onClick={() => setShowTelegramHelp(false)} className="text-slate-500 hover:text-white self-start">✖</button>
              </div>
           </div>
        )}

        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
           <div className="flex items-center gap-2">
             <span>&copy; 2024 Mentoria do Muzeira v1.1</span>
             <span className="hidden md:inline text-slate-700">|</span>
             <span className="hidden md:inline">Sistema de Filas</span>
           </div>
           
           {role === UserRole.MENTOR && (
             <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700 shadow-lg">
               <button 
                 onClick={() => setShowTelegramHelp(!showTelegramHelp)}
                 className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white w-6 h-6 rounded flex items-center justify-center transition-colors font-bold"
                 title="Como configurar?"
               >
                 ?
               </button>
               <span className="font-bold text-slate-300 hidden sm:inline">TELEGRAM:</span>
               <input 
                 type="text" 
                 placeholder="Seu Chat ID" 
                 className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 w-28 sm:w-32 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                 value={devTelegramId}
                 onChange={(e) => setDevTelegramId(e.target.value)}
               />
               <a href="https://t.me/userinfobot" target="_blank" className="text-[10px] text-indigo-400 hover:underline">(Pegar ID)</a>
               <button 
                 onClick={handleDevSave}
                 className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors font-medium"
               >
                 Salvar
               </button>
               <button 
                 onClick={handleDevTest}
                 className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium flex items-center gap-1"
               >
                 Testar
               </button>
             </div>
           )}
        </div>
      </footer>
    </div>
  );
};

export default App;
