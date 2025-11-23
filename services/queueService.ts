
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '../firebaseConfig';
import { Ticket } from '../types';

// ==========================================
// 🤖 CONFIGURAÇÃO DO TELEGRAM
// ==========================================
const TELEGRAM_CONFIG = {
  BOT_TOKEN: "8440630367:AAHGybcYl-vWbGC6WfzyM3qjdZyoNKDuphY",
};

// Função interna para buscar IDs salvos no Firebase e enviar mensagem
const sendTelegramNotification = async (ticket: Ticket) => {
  if (!TELEGRAM_CONFIG.BOT_TOKEN || !isFirebaseConfigured() || !db) return;

  try {
    // Busca os IDs cadastrados no Firebase
    const snapshot = await get(ref(db, 'systemStatus/telegramIds'));
    if (!snapshot.exists()) {
      console.warn("Nenhum mentor conectou o Telegram ainda.");
      return;
    }

    const idsMap = snapshot.val();
    const chatIds = Object.keys(idsMap);

    const message = `
🚨 *NOVA MENTORIA NA FILA!* 🚨

👤 *Aluno:* ${ticket.studentName}
📝 *Assunto:* ${ticket.reason}
⏰ *Horário:* ${ticket.availability}

_Corre lá pra atender!_ 🚀
    `.trim();

    // Envia para todos os IDs encontrados
    for (const chatId of chatIds) {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      } catch (error) {
        console.error(`Erro ao enviar Telegram para ${chatId}:`, error);
      }
    }
  } catch (error) {
    console.error("Erro no fluxo de notificação Telegram:", error);
  }
};


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
    statusRef = ref(db, 'systemStatus/mentors');

    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((error) => console.error("Erro auth anônima:", error));
      }
    });
  } catch (e) {
    console.error("Erro ao conectar Firebase:", e);
  }
}

// --- INTERFACE DO SERVIÇO ---

export const queueService = {
  isSystemOnline: () => isFirebaseConfigured(),

  // --- TELEGRAM SETUP ---
  
  connectTelegram: async (): Promise<string> => {
    if (!TELEGRAM_CONFIG.BOT_TOKEN) throw new Error("Token não configurado.");

    // 1. Busca as últimas mensagens enviadas para o bot
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/getUpdates`);
    const data = await response.json();

    if (!data.ok) throw new Error("Falha ao conectar com Telegram API");

    const updates = data.result;
    if (!updates || updates.length === 0) {
      throw new Error("Não encontrei sua mensagem. Mande um 'Oi' para o bot e tente novamente!");
    }

    // Pega a última mensagem
    const lastUpdate = updates[updates.length - 1];
    const chatId = lastUpdate.message?.chat?.id;
    const firstName = lastUpdate.message?.from?.first_name;

    if (!chatId) throw new Error("ID de chat inválido.");

    // Salva no Firebase para persistência
    if (isFirebaseConfigured() && db) {
      await update(ref(db, `systemStatus/telegramIds`), {
        [chatId]: { 
          name: firstName || 'Mentor', 
          connectedAt: Date.now() 
        }
      });
      return firstName || 'Mentor';
    } else {
      throw new Error("Banco de dados offline.");
    }
  },

  // --- AUTHENTICATION ---
  
  loginAdmin: async (username: string, pass: string) => {
    if (isFirebaseConfigured() && auth) {
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
        onError
      );
      return unsubscribe;
    } else {
      const saved = localStorage.getItem('muzeira-tickets');
      if (saved) callback(JSON.parse(saved));
      return () => {};
    }
  },

  addTicket: async (ticket: Ticket): Promise<string | null> => {
    if (isFirebaseConfigured() && ticketsRef) {
      const newTicketRef = push(ticketsRef);
      const newId = newTicketRef.key;
      const ticketWithAuth = { ...ticket, id: newId, createdBy: auth?.currentUser?.uid || 'anonymous' };
      
      if (newId) {
         await set(newTicketRef, ticketWithAuth);
         // Dispara notificação sem esperar (fire and forget)
         sendTelegramNotification(ticket).catch(console.error);
         return newId;
      }
      return null;
    } else {
      // Fallback LocalStorage
      const saved = localStorage.getItem('muzeira-tickets');
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(ticket);
      localStorage.setItem('muzeira-tickets', JSON.stringify(list));
      window.dispatchEvent(new Event('local-storage-update'));
      return ticket.id;
    }
  },

  updateTicket: async (id: string, updates: Partial<Ticket>) => {
    if (isFirebaseConfigured() && db) {
      await update(ref(db, `tickets/${id}`), updates);
    } else {
      const saved = localStorage.getItem('muzeira-tickets');
      if (saved) {
        const list = JSON.parse(saved).map((t: Ticket) => t.id === id ? { ...t, ...updates } : t);
        localStorage.setItem('muzeira-tickets', JSON.stringify(list));
        window.dispatchEvent(new Event('local-storage-update'));
      }
    }
  },

  clearHistory: async () => {
    if (isFirebaseConfigured() && ticketsRef && db) {
      const snapshot = await get(ticketsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const updates: any = {};
        Object.keys(data).forEach((key) => {
          if (data[key].status !== 'PENDING') updates[`tickets/${key}`] = null;
        });
        await update(ref(db), updates);
      }
    } else {
       // Local Storage Clear logic...
       const saved = localStorage.getItem('muzeira-tickets');
       if (saved) {
          const list = JSON.parse(saved).filter((t: Ticket) => t.status === 'PENDING');
          localStorage.setItem('muzeira-tickets', JSON.stringify(list));
          window.dispatchEvent(new Event('local-storage-update'));
       }
    }
  },

  // --- MENTOR STATUS ---

  subscribeToMentorStatus: (callback: (statuses: { muzeira: boolean, kayo: boolean }) => void) => {
    if (isFirebaseConfigured() && statusRef) {
      return onValue(statusRef, (snapshot) => {
        const val = snapshot.val();
        callback(val ? { muzeira: !!val.muzeira, kayo: !!val.kayo } : { muzeira: false, kayo: false });
      });
    }
    return () => {};
  },

  setMentorStatus: async (mentorId: 'muzeira' | 'kayo', isOnline: boolean) => {
    if (isFirebaseConfigured() && db) {
      await update(ref(db, 'systemStatus/mentors'), { [mentorId]: isOnline });
    }
  }
};
