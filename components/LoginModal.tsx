
import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: string, pass: string) => boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(user, pass);
    if (success) {
      setUser('');
      setPass('');
      setError('');
      onClose();
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Acesso Restrito
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Usuário</label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Digite seu usuário"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/25 mt-2"
          >
            Entrar como Mentor
          </button>
        </form>
      </div>
    </div>
  );
};
