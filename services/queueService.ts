
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update, get } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '../firebaseConfig';
import { Ticket } from '../types';

// ==========================================
// 🤖 CONFIGURAÇÃO DO TELEGRAM
// ==========================================
const TELEGRAM_CONFIG = {
  BOT_TOKEN: "8440630367:AAHGybcYl-vWbGC6WfzyM3qjdZyoNKDuphY",
};

// ==========================================
// 📧 LISTA DE E-MAILS PARA NOTIFICAÇÃO (PESSOAIS)
// ==========================================
const MENTOR_NOTIFICATION_EMAILS = [
  "muriloempresa2022@hotmail.com",
  "kayoprimo77@gmail.com"
];

// --- TELEGRAM NOTIFICATION ---
const sendTelegramNotification = async (ticket: Ticket) => {
  if (!TELEGRAM_CONFIG.BOT_TOKEN || !isFirebaseConfigured() || !db) return;

  try {
    const snapshot = await get(ref(db, 'systemStatus/telegramIds'));
    if (!snapshot.exists()) return;

    const idsMap = snapshot.val();
    const chatIds = Object.keys(idsMap);

    const message = `
🚨 *NOVA MENTORIA NA FILA!* 🚨

👤 *Aluno:* ${ticket.studentName}
📝 *Assunto:* ${ticket.reason}
⏰ *Horário:* ${ticket.availability}

_Corre lá pra atender!_ 🚀
    `.trim();

    for (const chatId of chatIds) {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;
        await fetch(url, { method: 'GET', mode: 'no-cors' });
      } catch (error) {
        console.error(`Erro telegram ${chatId}:`, error);
      }
    }
  } catch (error) {
    console.error("Erro geral Telegram:", error);
  }
};

// --- EMAIL NOTIFICATION (EMAILJS) ---
const sendEmailNotification = async (ticket: Ticket) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    // Busca configuração do EmailJS salva no banco
    const snapshot = await get(ref(db, 'systemStatus/emailConfig'));
    if (!snapshot.exists()) return;

    const config = snapshot.val();
    const { serviceId, templateId, publicKey } = config;

    if (!serviceId || !templateId || !publicKey) {
      console.log("EmailJS não configurado no painel.");
      return;
    }

    // Envia para cada mentor na lista de notificação (emails pessoais)
    for (const email of MENTOR_NOTIFICATION_EMAILS) {
      try {
        const payload = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: email, // Variável interna do EmailJS
            to_name: "Mentor",
            reply_to: ticket.studentName, 

            // --- ESTRATÉGIA "ENVIO TOTAL" (Blindagem contra erros de tradução) ---
            
            // 1. Variáveis para "De Nome" {{name}}
            name: ticket.studentName,
            Name: ticket.studentName,
            nome: ticket.studentName,
            
            // 2. Variáveis para Corpo "ALUNO" {{student_name}}
            student_name: ticket.studentName,
            studentName: ticket.studentName,
            nome_do_aluno: ticket.studentName,
            aluno: ticket.studentName,

            // 3. Variáveis para Assunto e Corpo {{message}} / {{mensagem}} / {{title}}
            title: ticket.reason,     // Para o Subject: Contact Us: {{title}}
            message: ticket.reason,   // Para o Header: Assunto:{{message}}
            mensagem: ticket.reason,  // Para o Corpo: ASSUNTO {{mensagem}}
            reason: ticket.reason,
            assunto: ticket.reason,

            // 4. Variáveis para Horário {{availability}} / {{disponibilidade}}
            availability: ticket.availability,
            disponibilidade: ticket.availability,
            horario: ticket.availability,
            
            // 5. Variáveis para Data {{date}} / {{data}}
            date: new Date().toLocaleString('pt-BR'),
            data: new Date().toLocaleString('pt-BR')
          }
        };

        // Debug para verificar o que está saindo (F12 no navegador)
        console.log("📨 Enviando EmailJS Payload:", payload.template_params);

        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`Email enviado para ${email}`);
      } catch (err) {
        console.error(`Erro envio email para ${email}`, err);
      }
    }

  } catch (error) {
    console.error("Erro na lógica de e-mail:", error);
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

  // --- CONFIGURAÇÕES ---
  
  registerTelegramId: async (chatId: string, name: string) => {
    if (!isFirebaseConfigured() || !db) throw new Error("Banco de dados offline.");
    const cleanId = chatId.trim().replace(/\s/g, '');
    if (!/^-?\d+$/.test(cleanId)) throw new Error("ID inválido.");

    await update(ref(db, `systemStatus/telegramIds/${cleanId}`), {
      name: name, 
      connectedAt: Date.now() 
    });
  },

  saveEmailConfig: async (config: { serviceId: string, templateId: string, publicKey: string }) => {
    if (!isFirebaseConfigured() || !db) throw new Error("Banco de dados offline.");
    await set(ref(db, 'systemStatus/emailConfig'), config);
  },

  sendTestNotification: async (chatId: string) => {
     const cleanId = chatId.trim();
     if (!cleanId) throw new Error("ID vazio.");
     const text = "✅ *TESTE DE NOTIFICAÇÃO*\n\nSe você recebeu isso, o sistema está funcionando!\n\n_Mentoria do Muzeira_";
     const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage?chat_id=${cleanId}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
     await fetch(url, { method: 'GET', mode: 'no-cors' });
  },

  sendTestEmail: async (config: { serviceId: string, templateId: string, publicKey: string }) => {
    const { serviceId, templateId, publicKey } = config;
    if (!serviceId || !templateId || !publicKey) throw new Error("Configuração incompleta.");

    let successCount = 0;
    const errors: string[] = [];

    // Envia para TODOS os mentores da lista
    for (const email of MENTOR_NOTIFICATION_EMAILS) {
        const payload = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: email,
            to_name: "Mentor (Teste)",
            reply_to: "Sistema de Teste",
            
            // --- ENVIO TOTAL TAMBÉM NO TESTE ---
            name: "Teste de Sistema",
            Name: "Teste de Sistema",
            nome: "Teste de Sistema",

            student_name: "Teste de Sistema",
            studentName: "Teste de Sistema",
            nome_do_aluno: "Teste de Sistema",
            aluno: "Teste de Sistema",

            title: "Teste de Funcionamento",
            message: "Este é um e-mail de verificação.",
            mensagem: "Este é um e-mail de verificação.",
            reason: "Teste",
            assunto: "Teste",

            availability: "Agora",
            disponibilidade: "Agora",
            horario: "Agora",
            
            date: new Date().toLocaleString('pt-BR'),
            data: new Date().toLocaleString('pt-BR')
          }
        };

        try {
          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`${response.status} ${response.statusText} - ${errorText} \n[Conf: ${serviceId} | ${templateId}]`);
          }
          
          successCount++;
        } catch (err: any) {
          console.error(`Erro ao enviar teste para ${email}:`, err);
          errors.push(`${email}: ${err.message}`);
        }
    }

    if (successCount === 0) {
      throw new Error(`Falha total no envio:\n${errors.join('\n')}`);
    }
  },

  // --- AUTHENTICATION ---
  
  loginAdmin: async (username: string, pass: string) => {
    if (isFirebaseConfigured() && auth) {
      let email = username;
      const userLower = username.toLowerCase();

      // Normaliza o input do usuário para os e-mails DE LOGIN (@mentor.com)
      if (!email.includes('@')) {
         if (userLower.includes('muzeira') || userLower.includes('murilo')) {
            email = 'muzeira@mentor.com';
         } else if (userLower.includes('kayo') || userLower.includes('tocha')) {
            email = 'kayo@mentor.com';
         } else {
            email = `${username}@mentor.com`;
         }
      }
      
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (error: any) {
        // Lógica de Auto-Registro: Se falhar o login, tenta criar a conta
        console.log("Login falhou, tentando criar conta...", error.code);
        
        const shouldCreate = 
            error.code === 'auth/user-not-found' || 
            error.code === 'auth/invalid-credential' || 
            error.code === 'auth/invalid-login-credentials' ||
            error.code === 'auth/wrong-password'; 

        if (shouldCreate) {
           try {
             await createUserWithEmailAndPassword(auth, email, pass);
           } catch (createError: any) {
             console.error("Erro ao criar usuário:", createError);
             if (createError.code === 'auth/email-already-in-use') {
                throw new Error("Senha incorreta.");
             }
             if (createError.code === 'auth/weak-password') {
                throw new Error("A senha precisa ter pelo menos 6 caracteres.");
             }
             throw new Error("Erro de acesso. Verifique suas credenciais.");
           }
        } else {
          throw error;
        }
      }

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
         
         // 🔥 DISPAROS DE NOTIFICAÇÃO (Telegram + Email)
         Promise.allSettled([
            sendTelegramNotification(ticket),
            sendEmailNotification(ticket)
         ]);

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
