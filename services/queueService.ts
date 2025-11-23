
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '../firebaseConfig';
import { Ticket } from '../types';

// --- FIREBASE SETUP ---
let db: any = null;
let ticketsRef: any = null;
let statusRef: any = null;
let auth: any = null;

if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getDatabase(app);
    ticketsRef = ref(db, 'tickets');
    // Mudança para estrutura de objeto para suportar múltiplos mentores
    statusRef = ref(db, 'systemStatus/mentors');

    // Monitoramento de Auth
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log("Nenhum usuário detectado. Entrando como Anônimo...");
        signInAnonymously(auth).catch((error) => {
          console.error("Erro na autenticação anônima:", error);
        });
      } else {
        console.log(`Usuário conectado: ${user.email || 'Anônimo'} (${user.uid})`);
      }
    });

    console.log("Firebase conectado.");
  } catch (e) {
    console.error("Erro ao conectar Firebase:", e);
  }
}

// --- INTERFACE DO SERVIÇO ---

export const queueService = {
  isSystemOnline: () => isFirebaseConfigured(),

  // --- AUTHENTICATION ---
  
  loginAdmin: async (username: string, pass: string) => {
    if (isFirebaseConfigured() && auth) {
      // Se o usuário digitar só "muzeira" ou "kayo", completa com @mentor.com
      let email = username;
      if (!email.includes('@')) {
        email = `${username}@mentor.com`;
      }
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      throw new Error("Firebase não configurado.");
    }
  },

  logoutAdmin: async () => {
    if (isFirebaseConfigured() && auth) {
      await signOut(auth);
    }
  },

  subscribeToAuth: (callback: (user: User | null) => void) => {
    if (isFirebaseConfigured() && auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  },

  getCurrentUserId: (): string | null => {
    return auth?.currentUser?.uid || null;
  },

  getCurrentUserEmail: (): string | null => {
    return auth?.currentUser?.email || null;
  },

  // --- TICKETS ---

  subscribe: (callback: (tickets: Ticket[]) => void, onError?: (error: Error) => void) => {
    if (isFirebaseConfigured() && ticketsRef) {
      const unsubscribe = onValue(
        ticketsRef, 
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const ticketList = Object.keys(data).map(key => ({
              ...data[key],
              id: key 
            }));
            ticketList.sort((a, b) => b.createdAt - a.createdAt);
            callback(ticketList);
          } else {
            callback([]);
          }
        },
        (error) => {
          console.error("Erro de leitura no Firebase:", error);
          if (onError) onError(error);
        }
      );
      return unsubscribe;
    } else {
      const loadLocal = () => {
        const saved = localStorage.getItem('muzeira-tickets');
        if (saved) {
          try {
            callback(JSON.parse(saved));
          } catch (e) {
            callback([]);
          }
        } else {
          callback([]);
        }
      };
      
      loadLocal();
      return () => {};
    }
  },

  addTicket: async (ticket: Ticket): Promise<string | null> => {
    if (isFirebaseConfigured() && ticketsRef) {
      try {
        const newTicketRef = push(ticketsRef);
        const newId = newTicketRef.key;
        
        const ticketWithAuth = {
          ...ticket,
          id: newId,
          createdBy: auth?.currentUser?.uid || 'anonymous'
        };

        if (newId) {
           await set(newTicketRef, ticketWithAuth);
           return newId;
        }
      } catch (error) {
        console.error("Erro ao adicionar ticket:", error);
        throw error;
      }
      return null;
    } else {
      const saved = localStorage.getItem('muzeira-tickets');
      const currentTickets = saved ? JSON.parse(saved) : [];
      const newTickets = [ticket, ...currentTickets];
      localStorage.setItem('muzeira-tickets', JSON.stringify(newTickets));
      window.dispatchEvent(new Event('local-storage-update'));
      return ticket.id;
    }
  },

  updateTicket: async (id: string, updates: Partial<Ticket>) => {
    if (isFirebaseConfigured() && db) {
      try {
        const ticketRef = ref(db, `tickets/${id}`);
        await update(ticketRef, updates);
      } catch (error) {
        console.error("Erro ao atualizar ticket:", error);
        throw error;
      }
    } else {
      const saved = localStorage.getItem('muzeira-tickets');
      if (saved) {
        const tickets = JSON.parse(saved) as Ticket[];
        const newTickets = tickets.map(t => t.id === id ? { ...t, ...updates } : t);
        localStorage.setItem('muzeira-tickets', JSON.stringify(newTickets));
        window.dispatchEvent(new Event('local-storage-update'));
      }
    }
  },

  clearHistory: async () => {
    if (isFirebaseConfigured() && ticketsRef && db) {
      try {
        const snapshot = await get(ticketsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const updates: any = {};
          let count = 0;

          Object.keys(data).forEach((key) => {
            const ticket = data[key];
            if (ticket.status !== 'PENDING') {
              updates[`tickets/${key}`] = null;
              count++;
            }
          });

          if (count > 0) {
            await update(ref(db), updates);
          }
        }
      } catch (error) {
        console.error("Erro ao limpar histórico:", error);
        throw error;
      }
    } else {
      const saved = localStorage.getItem('muzeira-tickets');
      if (saved) {
        const tickets = JSON.parse(saved) as Ticket[];
        const newTickets = tickets.filter(t => t.status === 'PENDING');
        localStorage.setItem('muzeira-tickets', JSON.stringify(newTickets));
        window.dispatchEvent(new Event('local-storage-update'));
      }
    }
  },

  // --- MENTOR STATUS (MULTIPLOS MENTORES) ---

  subscribeToMentorStatus: (callback: (statuses: { muzeira: boolean, kayo: boolean }) => void) => {
    if (isFirebaseConfigured() && statusRef) {
      const unsubscribe = onValue(statusRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          callback({
            muzeira: !!val.muzeira,
            kayo: !!val.kayo
          });
        } else {
          callback({ muzeira: false, kayo: false });
        }
      });
      return unsubscribe;
    } else {
      const loadStatus = () => {
        const m = localStorage.getItem('muzeira-status-muzeira') === 'true';
        const k = localStorage.getItem('muzeira-status-kayo') === 'true';
        callback({ muzeira: m, kayo: k });
      };
      loadStatus();
      return () => {};
    }
  },

  setMentorStatus: async (mentorId: 'muzeira' | 'kayo', isOnline: boolean) => {
    if (isFirebaseConfigured() && db) {
      try {
        // Atualiza apenas o nó do mentor específico
        await update(ref(db, 'systemStatus/mentors'), {
          [mentorId]: isOnline
        });
      } catch (error) {
        console.error("Erro ao definir status do mentor:", error);
        throw error;
      }
    } else {
      localStorage.setItem(`muzeira-status-${mentorId}`, String(isOnline));
      window.dispatchEvent(new Event('local-status-update'));
    }
  }
};
