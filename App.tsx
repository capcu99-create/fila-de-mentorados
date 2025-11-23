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
// Cole o link da sua foto abaixo (entre as aspas).
// Se estiver rodando local, pode ser um caminho relativo. Se online, use um link (Imgur, etc).
// ============================================================================
const MUZEIRA_PHOTO_URL = "https://i.imgur.com/h32KOQd.jpeg"; 
// 👆 TROQUE O LINK ACIMA PELO LINK DA SUA FOTO!

const App: React.FC = () => {
  // UI State
  const [hasEntered, setHasEntered] = useState(false);

  // App State
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isSystemOnline, setIsSystemOnline] = useState(false);
  const [mentorAvailable, setMentorAvailable] = useState(false); // O verdinho
  
  // Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initial Load & Subscription
  useEffect(() => {
    // Verifica se o firebase está configurado
    setIsSystemOnline(queueService.isSystemOnline());

    // Inscreve nos Tickets
    const unsubscribeTickets = queueService.subscribe((updatedTickets) => {
      setTickets(updatedTickets);
    });

    // Inscreve no Status do Mentor (O verdinho)
    const unsubscribeStatus = queueService.subscribeToMentorStatus((status) => {
      setMentorAvailable(status);
    });

    // Listeners para modo offline (Local Storage)
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
    
    // Persistence Auth
    const savedAuth = sessionStorage.getItem('muzeira-auth');
    if (savedAuth === 'true') {
      setIsAdminAuthenticated(true);
    }
    
    return () => {
      if (typeof unsubscribeTickets === 'function') unsubscribeTickets();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      window.removeEventListener('local-storage-update', handleLocalUpdate);
      window.removeEventListener('local-status-update', handleLocalStatusUpdate);
    };
  }, []);

  const handleEnterSystem = () => {
    setHasEntered(true);
  };

  const handleCreateTicket = useCallback(async (name: string, reason: string, availability: string) => {
    const tempId = crypto.randomUUID();
    const newTicket: Ticket = {
      id: tempId, 
      studentName: name,
      reason,
      availability,
      status: TicketStatus.PENDING,
      createdAt: Date.now(),
    };

    await queueService.addTicket(newTicket);
  }, []);

  const handleStatusChange = (id: string, status: TicketStatus) => {
    queueService.updateTicket(id, { status });
  };

  const handleUpdateTicket = (id: string, updates: Partial<Ticket>) => {
    queueService.updateTicket(id, updates);
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

  const handleLogin = (user: string, pass: string): boolean => {
    if (user.toLowerCase() === 'muzeira' && pass === 'Mumu@2025') {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('muzeira-auth', 'true');
      setRole(UserRole.MENTOR);
      return true;
    }
    return false;
  };

  // Toggle Status (Verdinho)
  const toggleMentorAvailability = () => {
    queueService.setMentorStatus(!mentorAvailable);
  };

  // 1. Renderizar Landing Page se ainda não entrou
  if (!hasEntered) {
    return <LandingPage onEnter={handleEnterSystem} avatarUrl={MUZEIRA_PHOTO_URL} />;
  }

  // 2. Renderizar Sistema Principal
  const pendingTickets = tickets.filter(t => t.status === TicketStatus.PENDING);
  const historyTickets = tickets.filter(t => t.status !== TicketStatus.PENDING);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 pb-20 animate-[fadeIn_0.5s_ease-out]">
      <Header 
        role={role} 
        isAuthenticated={isAdminAuthenticated}
        onToggleRole={handleToggleRole} 
        isOnline={mentorAvailable} // Agora controlado pelo botão do mentor
        avatarUrl={MUZEIRA_PHOTO_URL}
      />
      
      {!isSystemOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-center py-2 text-xs font-medium">
          ⚠️ Modo Local (Offline). Configure o <code>firebaseConfig.ts</code> para sincronizar dados.
        </div>
      )}

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <main className="max-w-5xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Formulário ou Painel */}
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
                
                {/* CONTROLE DE STATUS DO MENTOR */}
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
                      Você está ONLINE
                    </>
                  ) : (
                    <>
                      <span className="h-3 w-3 bg-slate-500 rounded-full"></span>
                      Você está OFFLINE
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Isso controla o indicador verde no topo da página.
                </p>
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
                onClick={() => {
                   setIsAdminAuthenticated(false);
                   sessionStorage.removeItem('muzeira-auth');
                   setRole(UserRole.STUDENT);
                }}
                className="w-full mt-2 py-2 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
              >
                Sair do Modo Admin
              </button>
            </div>
          )}

          <div className="hidden lg:block bg-indigo-900/20 rounded-2xl p-6 border border-indigo-500/20">
             <h3 className="text-indigo-300 font-semibold mb-2">Dica do Muzeira</h3>
             <p className="text-indigo-200/70 text-sm">
               Antes de entrar na fila, verifique se já não existe solução na documentação ou no Stack Overflow.
             </p>
          </div>
        </div>

        {/* Coluna Direita: Fila */}
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