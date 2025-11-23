import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, set, remove } from 'firebase/database';
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
    statusRef = ref(db, 'systemStatus/mentorOnline');

    // Monitoramento de Auth
    // Se não houver usuário logado, loga como Anônimo automaticamente (Aluno)
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
  
  loginAdmin: async (email: string, pass: string) => {
    if (isFirebaseConfigured() && auth) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      throw new Error("Firebase não configurado.");
    }
  },

  logoutAdmin: async () => {
    if (isFirebaseConfigured() && auth) {
      await signOut(auth);
      // O onAuthStateChanged vai rodar e logar como anônimo automaticamente
    }
  },

  subscribeToAuth: (callback: (user: User | null) => void) => {
    if (isFirebaseConfigured() && auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  },

  // --- TICKETS ---

  // Inscrever para receber atualizações em tempo real
  subscribe: (callback: (tickets: Ticket[]) => void, onError?: (error: Error) => void) => {
    if (isFirebaseConfigured() && ticketsRef) {
      // MODO ONLINE: Escuta o Firebase
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
      // MODO OFFLINE: Lê do LocalStorage
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

  // Adicionar novo ticket
  addTicket: async (ticket: Ticket): Promise<string | null> => {
    if (isFirebaseConfigured() && ticketsRef) {
      // MODO ONLINE
      try {
        const newTicketRef = push(ticketsRef);
        const newId = newTicketRef.key;
        if (newId) {
           await set(newTicketRef, { ...ticket, id: newId });
           return newId;
        }
      } catch (error) {
        console.error("Erro ao adicionar ticket:", error);
        throw error; // Repassa o erro para a UI tratar
      }
      return null;
    } else {
      // MODO OFFLINE
      const saved = localStorage.getItem('muzeira-tickets');
      const currentTickets = saved ? JSON.parse(saved) : [];
      const newTickets = [ticket, ...currentTickets];
      localStorage.setItem('muzeira-tickets', JSON.stringify(newTickets));
      window.dispatchEvent(new Event('local-storage-update'));
      return ticket.id;
    }
  },

  // Atualizar ticket existente
  updateTicket: async (id: string, updates: Partial<Ticket>) => {
    if (isFirebaseConfigured() && db) {
      // MODO ONLINE
      try {
        const ticketRef = ref(db, `tickets/${id}`);
        await update(ticketRef, updates);
      } catch (error) {
        console.error("Erro ao atualizar ticket:", error);
        throw error;
      }
    } else {
      // MODO OFFLINE
      const saved = localStorage.getItem('muzeira-tickets');
      if (saved) {
        const tickets = JSON.parse(saved) as Ticket[];
        const newTickets = tickets.map(t => t.id === id ? { ...t, ...updates } : t);
        localStorage.setItem('muzeira-tickets', JSON.stringify(newTickets));
        window.dispatchEvent(new Event('local-storage-update'));
      }
    }
  },

  // --- MENTOR STATUS (ONLINE/OFFLINE BUTTON) ---

  subscribeToMentorStatus: (callback: (isOnline: boolean) => void) => {
    if (isFirebaseConfigured() && statusRef) {
      const unsubscribe = onValue(statusRef, (snapshot) => {
        const val = snapshot.val();
        callback(!!val); // converte para boolean
      });
      return unsubscribe;
    } else {
      // Offline fallback
      const loadStatus = () => {
        const saved = localStorage.getItem('muzeira-mentor-status');
        callback(saved === 'true');
      };
      loadStatus();
      return () => {};
    }
  },

  setMentorStatus: async (isOnline: boolean) => {
    if (isFirebaseConfigured() && statusRef) {
      try {
        await set(statusRef, isOnline);
      } catch (error) {
        console.error("Erro ao definir status do mentor:", error);
        throw error;
      }
    } else {
      localStorage.setItem('muzeira-mentor-status', String(isOnline));
      window.dispatchEvent(new Event('local-status-update'));
    }
  }
};