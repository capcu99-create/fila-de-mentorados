
import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = `{
  "rules": {
    ".read": true,
    "tickets": {
      ".indexOn": ["createdAt"],
      "$ticketId": {
        // PERMISSÕES DE ESCRITA:
        // 1. Criar novo ticket: Qualquer usuário autenticado (!data.exists)
        // 2. Editar próprio ticket: Dono do ticket (createdBy == auth.uid)
        // 3. Mentores/Admins: Emails específicos liberados
        ".write": "auth != null && (!data.exists() || data.child('createdBy').val() === auth.uid || auth.token.email === 'muriloempresa2022@hotmail.com' || auth.token.email === 'kayoprimo77@gmail.com' || auth.token.email.matches(/.*@mentor.com/))"
      }
    },
    "systemStatus": {
      ".read": true,
      // Apenas mentores podem alterar status (Online/Offline) e configs
      ".write": "auth != null && (auth.token.email === 'muriloempresa2022@hotmail.com' || auth.token.email === 'kayoprimo77@gmail.com' || auth.token.email.matches(/.*@mentor.com/))"
    }
  }
}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            ⚠️ Acesso Negado: Atualize as Regras
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2">
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
             <p className="text-red-300 text-sm font-semibold">
               O Firebase está bloqueando as ações dos mentores (Hotmail/Gmail). Você precisa atualizar as regras de segurança.
             </p>
          </div>

          <p className="text-slate-300 text-sm">
            Copie o código abaixo e cole na aba <strong>Regras (Rules)</strong> do seu Realtime Database.
          </p>

          <div className="relative group">
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-green-400 text-xs font-mono overflow-x-auto shadow-inner">
              {rules}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(rules);
                alert("Código copiado! Cole no painel do Firebase.");
              }}
              className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded transition-colors border border-indigo-500 shadow-lg"
            >
              Copiar Código
            </button>
          </div>
          
          <div className="text-xs text-slate-400 space-y-1">
             <p>Passo a passo rápido:</p>
             <ol className="list-decimal ml-4 space-y-1">
               <li>Vá para <a href="https://console.firebase.google.com/" target="_blank" className="text-indigo-400 underline">console.firebase.google.com</a></li>
               <li>Entre no seu projeto e clique em <strong>Realtime Database</strong> no menu lateral.</li>
               <li>Clique na aba <strong>Regras (Rules)</strong> no topo.</li>
               <li>Apague tudo, cole o novo código e clique em <strong>Publicar</strong>.</li>
             </ol>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
