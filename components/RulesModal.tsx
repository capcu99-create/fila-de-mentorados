
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
        // Permite escrever se:
        // 1. É um novo ticket (!data.exists)
        // 2. O usuário é o dono (createdBy == auth.uid)
        // 3. O usuário é Admin (@mentor.com)
        ".write": "auth != null && (!data.exists() || data.child('createdBy').val() === auth.uid || (auth.token.email != null && auth.token.email.matches(/.*@mentor.com/)))"
      }
    },
    "systemStatus": {
      ".read": true,
      ".write": "auth != null && auth.token.email.matches(/.*@mentor.com/)"
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
            Corrigir Permissões do Firebase
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2">
          <p className="text-slate-300 text-sm">
            O erro <strong>PERMISSION_DENIED</strong> ocorre porque o banco de dados está bloqueando as edições.
            Para consertar, vá no <strong>Firebase Console &gt; Realtime Database &gt; Regras</strong> e cole o código abaixo:
          </p>

          <div className="relative">
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-green-400 text-xs font-mono overflow-x-auto">
              {rules}
            </pre>
            <button 
              onClick={() => navigator.clipboard.writeText(rules)}
              className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded transition-colors border border-slate-600"
            >
              Copiar
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
             <p className="text-amber-200 text-xs">
               <strong>Nota:</strong> Essas regras permitem que qualquer um leia a fila, mas apenas o <strong>Dono do Ticket</strong> ou o <strong>Mentor (@mentor.com)</strong> possam alterar os dados.
             </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Entendi, vou atualizar
          </button>
        </div>
      </div>
    </div>
  );
};
