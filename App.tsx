import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { RequestForm } from './components/RequestForm';
import { TicketCard } from './components/TicketCard';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './components/LandingPage';
import { Ticket, TicketStatus, UserRole } from './types';
import { queueService } from './services/queueService';

// ============================================================================
// 📸 ÁREA DA FOTO
// Cole o link da sua foto abaixo.
// ============================================================================
const MUZEIRA_PHOTO_URL = "https://i.imgur.com/h32KOQd.jpeg"; 

const App: React.FC = () => {
  // UI State
  const [hasEntered, setHasEntered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // App State
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isSystemOnline, setIsSystemOnline] = useState(false);
  const [mentorAvailable, setMentorAvailable] = useState(false);
  
  // Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initial Load & Subscription
  useEffect(() => {
    // Verifica se o firebase está configurado
    setIsSystemOnline(queueService.isSystemOnline());

    // Monitora Auth Real do Firebase
    const unsubscribeAuth = queueService.subscribeToAuth((user) => {
      if (user && !user.isAnonymous) {
        // Se tem usuário e NÃO é anônimo, é o Mentor (Admin)
        setIsAdminAuthenticated(true);
        setRole(UserRole.MENTOR);
      } else {
        // Se é anônimo ou null, é aluno
        setIsAdminAuthenticated(false);
        if (role === UserRole.MENTOR) {
          setRole(UserRole.STUDENT);
        }
      }
    });

    // Inscreve nos Tickets
    const unsubscribeTickets = queueService.subscribe(
      (updatedTickets) => {
        setTickets(updatedTickets);
        setErrorMessage(null);
      },
      (error) => {
        console.error("App: Erro ao carregar tickets", error);
        if (error.message.includes("permission_denied")) {
          setErrorMessage("ACESSO NEGADO: Você precisa estar logado ou as regras do banco bloqueiam a leitura.");
        } else {
          setErrorMessage(`Erro de conexão: ${error.message}`);
        }
      }
    );

    // Inscreve no Status do Mentor
    const unsubscribeStatus = queueService.subscribeToMentorStatus((status) => {
      setMentorAvailable(status);
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
         const saved = localStorage.getItem('muzeira-mentor-status');
         setMentorAvailable(saved === 'true');
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
  }, [role]);

  const handleEnterSystem = () => {
    setHasEntered(true);
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
      if (error.message.includes("PERMISSION_DENIED")) {
        alert("Erro de Permissão: O banco de dados não permitiu criar o ticket. Verifique as Regras do Firebase.");
      } else {
        alert("Erro ao criar ticket: " + error.message);
      }
    }
  }, []);

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    try {
      await queueService.updateTicket(id, { status });
    } catch (error: any) {
      alert("Erro ao atualizar status (apenas Admin pode fazer isso): " + error.message);
    }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      await queueService.updateTicket(id, updates);
    } catch (error: any) {
      alert("Erro ao editar ticket: " + error.message);
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
      // O estado será atualizado automaticamente pelo listener unsubscribeAuth
    } catch (e) {
      console.error("Erro ao sair", e);
    }
  };

  const toggleMentorAvailability = async () => {
    try {
      await queueService.setMentorStatus(!mentorAvailable);
    } catch (error: any) {
       alert("Erro ao mudar status: " + error.message);
    }
  };

  if (!hasEntered) {
    return <LandingPage onEnter={handleEnterSystem} avatarUrl={MUZEIRA_PHOTO_URL} />;
  }

  const pendingTickets = tickets.filter(t => t.status === TicketStatus.PENDING);
  const historyTickets = tickets.filter(t => t.status !== TicketStatus.PENDING);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 pb-20 animate-[fadeIn_0.5s_ease-out]">
      {errorMessage && (
        <div className="bg-red-600 text-white text-center px-4 py-3 font-bold text-sm sticky top-0 z-[60]">
          ⚠️ {errorMessage}
        </div>
      )}
      
      <Header 
        role={role} 
        isAuthenticated={isAdminAuthenticated}
        onToggleRole={handleToggleRole} 
        isOnline={mentorAvailable}
        avatarUrl={MUZEIRA_PHOTO_URL}
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
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-8 bg-amber-500 rounded-full inline-block"></span>
                  Painel do Mentor
                </h2>
                
                <button 
                  onClick={toggleMentorAvailability}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border mb-2 ${
                    mentorAvailable 
                      ? 'bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20' 
                      : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {mentorAvailable ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      ONLINE
                    </>
                  ) : (
                    <>
                      <span className="h-3 w-3 bg-slate-500 rounded-full"></span>
                      OFFLINE
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-sm">Fila Atual</span>
                  <div className="text-3xl font-bold text-indigo-400">{pendingTickets.length}</div>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                   <span className="text-slate-400 text-sm">Atendidos Hoje</span>
                   <div className="text-3xl font-bold text-green-400">
                     {historyTickets.filter(t => t.status === TicketStatus.RESOLVED).length}
                   </div>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full mt-2 py-2 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
              >
                Sair (Logout)
              </button>
            </div>
          )}

          <div className="hidden lg:block bg-indigo-900/20 rounded-2xl p-6 border border-indigo-500/20">
             <h3 className="text-indigo-300 font-semibold mb-2">Dica do Muzeira</h3>
             <p className="text-indigo-200/70 text-sm">
               Verifique as regras de segurança no Console do Firebase se tiver problemas de permissão.
             </p>
          </div>
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
                  {mentorAvailable 
                    ? "O mentor está Online! Aproveite para tirar sua dúvida." 
                    : "O mentor está Offline, mas você pode entrar na fila mesmo assim."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    role={role}
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