
import React, { useState, useEffect, useCallback } from 'react';
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
    email: 'muzeira@mentor.com', // Assumindo este email para o admin principal ou qualquer outro não-kayo
    photo: "https://i.imgur.com/h32KOQd.jpeg",
    canClearHistory: true
  },
  kayo: {
    id: 'kayo',
    name: 'Tocha 🔥', // Nome alterado de Kayo para Tocha
    email: 'kayo@mentor.com',
    photo: "https://i.imgur.com/garicye.jpeg", // Foto da Tocha atualizada
    canClearHistory: false
  }
};

const App: React.FC = () => {
  // UI State
  const [hasEntered, setHasEntered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // App State
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isSystemOnline, setIsSystemOnline] = useState(false);
  
  // Status dos Mentores
  const [mentorStatuses, setMentorStatuses] = useState({ muzeira: false, kayo: false });
  
  // Auth State & Current Identity
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Identifica qual perfil está logado (padrão Muzeira se for admin desconhecido)
  const loggedMentor = currentUserEmail === MENTORS.kayo.email 
    ? MENTORS.kayo 
    : MENTORS.muzeira;

  // Initial Load & Subscription
  useEffect(() => {
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
        if (errorMessage?.includes("ACESSO NEGADO")) {
           setErrorMessage(null);
        }
      },
      (error) => {
        console.error("App: Erro ao carregar tickets", error);
        if (error.message.includes("permission_denied") || error.message.includes("PERMISSION_DENIED")) {
          setErrorMessage("ACESSO NEGADO: Verifique as regras do banco.");
        } else {
          setErrorMessage(`Erro de conexão: ${error.message}`);
        }
      }
    );

    const unsubscribeStatus = queueService.subscribeToMentorStatus((statuses) => {
      setMentorStatuses(statuses);
    });

    // Listeners Offline
    const handleLocalUpdate = () => {
      if (!queueService.isSystemOnline()) {
         const saved = localStorage.getItem('muzeira-tickets');
         if (saved) setTickets(JSON.parse(saved));
      }
    };
    const handleLocalStatusUpdate = () => {
       if (!queueService.isSystemOnline()) {
         const m = localStorage.getItem('muzeira-status-muzeira') === 'true';
         const k = localStorage.getItem('muzeira-status-kayo') === 'true';
         setMentorStatuses({ muzeira: m, kayo: k });
       }
    };

    window.addEventListener('local-storage-update', handleLocalUpdate);
    window.addEventListener('local-status-update', handleLocalStatusUpdate);
    
    return () => {
      if (typeof unsubscribeTickets === 'function') unsubscribeTickets();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
      window.removeEventListener('local-storage-update', handleLocalUpdate);
      window.removeEventListener('local-status-update', handleLocalStatusUpdate);
    };
  }, [role, errorMessage]);

  const handleEnterSystem = () => {
    setHasEntered(true);
  };

  const handleBackToLanding = () => {
    setHasEntered(false);
  };

  const handleError = (error: any, context: string) => {
    console.error(`Erro em ${context}:`, error);
    const msg = error.message || error.toString();
    
    if (msg.includes("PERMISSION_DENIED") || msg.includes("permission_denied")) {
      setErrorMessage("ERRO DE PERMISSÃO: Ação bloqueada pelo servidor.");
    } else {
      alert(`Erro: ${msg}`);
    }
  };

  const handleCreateTicket = useCallback(async (name: string, reason: string, availability: string) => {
    try {
      const tempId = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

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
      handleError(error, "criar ticket");
    }
  }, []);

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    try {
      // Ao resolver, passamos quem resolveu
      const updates: Partial<Ticket> = { status };
      if (status === TicketStatus.RESOLVED || status === TicketStatus.DISCARDED) {
         updates.resolvedBy = loggedMentor.name;
      }
      await queueService.updateTicket(id, updates);
    } catch (error: any) {
      handleError(error, "mudar status");
    }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      await queueService.updateTicket(id, updates);
    } catch (error: any) {
      handleError(error, "atualizar ticket");
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

  const handleLogin = async (username: string, pass: string): Promise<boolean> => {
    try {
      await queueService.loginAdmin(username, pass);
      return true;
    } catch (e) {
      throw e;
    }
  };

  const handleLogout = async () => {
    try {
      await queueService.logoutAdmin();
    } catch (e) {
      console.error("Erro ao sair", e);
    }
  };

  const toggleCurrentMentorStatus = async () => {
    try {
      // Toggle status based on who is logged in
      const currentStatus = loggedMentor.id === 'kayo' ? mentorStatuses.kayo : mentorStatuses.muzeira;
      await queueService.setMentorStatus(loggedMentor.id as 'muzeira'|'kayo', !currentStatus);
    } catch (error: any) {
       handleError(error, "mudar status mentor");
    }
  };

  const handleClearHistory = async () => {
    if (!loggedMentor.canClearHistory) {
      alert("Você não tem permissão para limpar o histórico.");
      return;
    }
    const confirmed = window.confirm("ATENÇÃO: Isso apagará permanentemente todos os tickets Resolvidos e Descartados. Deseja continuar?");
    if (confirmed) {
      try {
        await queueService.clearHistory();
      } catch (error: any) {
        handleError(error, "limpar histórico");
      }
    }
  };

  if (!hasEntered) {
    return (
      <LandingPage 
        onEnter={handleEnterSystem} 
        mentors={[
          { ...MENTORS.muzeira, isOnline: mentorStatuses.muzeira },
          { ...MENTORS.kayo, isOnline: mentorStatuses.kayo }
        ]}
      />
    );
  }

  const pendingTickets = tickets.filter(t => t.status === TicketStatus.PENDING);
  const historyTickets = tickets.filter(t => t.status !== TicketStatus.PENDING);
  
  // Status atual do mentor logado
  const isCurrentMentorOnline = loggedMentor.id === 'kayo' ? mentorStatuses.kayo : mentorStatuses.muzeira;
  const isAnyMentorOnline = mentorStatuses.muzeira || mentorStatuses.kayo;

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 pb-20 animate-[fadeIn_0.5s_ease-out]">
      {errorMessage && (
        <div className="bg-red-600/90 backdrop-blur-md text-white px-4 py-3 font-bold text-sm sticky top-0 z-[60] flex justify-center items-center gap-2 shadow-lg animate-pulse">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </div>
      )}
      
      <Header 
        role={role} 
        isAuthenticated={isAdminAuthenticated}
        onToggleRole={handleToggleRole} 
        onBack={handleBackToLanding}
        isOnline={isAnyMentorOnline}
        avatarUrl={role === UserRole.MENTOR ? loggedMentor.photo : undefined} 
      />
      
      {!isSystemOnline && !errorMessage && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-center py-2 text-xs font-medium">
          ⚠️ Modo Local (Offline).
        </div>
      )}

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <main className="max-w-5xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {role === UserRole.STUDENT ? (
            <RequestForm onSubmit={handleCreateTicket} />
          ) : (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
              
              {/* Painel do Mentor Específico */}
              <div className="flex flex-col items-center pb-4 border-b border-slate-700">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-500 p-1 mb-3">
                  <img src={loggedMentor.photo} alt={loggedMentor.name} className="w-full h-full rounded-full object-cover" />
                </div>
                <h2 className="text-xl font-bold text-white">Olá, {loggedMentor.name}</h2>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{loggedMentor.id === 'kayo' ? 'Suporte Técnico' : 'Mentor Principal'}</span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase">Seu Status</h3>
                <button 
                  onClick={toggleCurrentMentorStatus}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border mb-2 ${
                    isCurrentMentorOnline 
                      ? 'bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20' 
                      : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {isCurrentMentorOnline ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      VOCÊ ESTÁ ONLINE
                    </>
                  ) : (
                    <>
                      <span className="h-3 w-3 bg-slate-500 rounded-full"></span>
                      VOCÊ ESTÁ OFFLINE
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-sm">Fila Atual</span>
                  <div className="text-3xl font-bold text-indigo-400">{pendingTickets.length}</div>
                </div>
                {/* Stats de atendimento pessoal */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                   <span className="text-slate-400 text-sm">Atendidos por Você</span>
                   <div className="text-3xl font-bold text-green-400">
                     {historyTickets.filter(t => t.resolvedBy === loggedMentor.name).length}
                   </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                {loggedMentor.canClearHistory && (
                  <button 
                    onClick={handleClearHistory}
                    disabled={historyTickets.length === 0}
                    className="w-full py-2 px-4 border border-slate-600/50 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpar Histórico
                  </button>
                )}

                <button 
                  onClick={handleLogout}
                  className="w-full py-2 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                >
                  Sair (Logout)
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
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </div>
                <h3 className="text-slate-300 font-medium">A fila está vazia!</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {isAnyMentorOnline 
                    ? "Temos mentores Online! Aproveite para tirar sua dúvida." 
                    : "Os mentores estão Offline, mas você pode entrar na fila mesmo assim."}
                </p>
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
    </div>
  );
};

export default App;
