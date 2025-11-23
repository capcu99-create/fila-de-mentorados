
import React from 'react';
import { UserRole } from '../types';

interface HeaderProps {
  role: UserRole;
  isAuthenticated: boolean;
  onToggleRole: () => void;
  onBack: () => void;
  isOnline?: boolean;
  avatarUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({ role, isAuthenticated, onToggleRole, onBack, isOnline = false, avatarUrl }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          
          <button 
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium border border-transparent hover:border-slate-700"
            title="Voltar ao Início"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
                  <img 
                    src={avatarUrl} 
                    alt="Perfil" 
                    className="w-full h-full object-cover rounded-full border-2 border-slate-900"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-500/30">
                  <img 
                    src="https://i.imgur.com/h32KOQd.jpeg" 
                    alt="Logo Muzeira" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {isOnline && avatarUrl && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" title="Online"></span>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Mentoria do Muzeira</h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Fila de Atendimento</p>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleRole}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            role === UserRole.MENTOR
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          {role === UserRole.MENTOR ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Painel Mentor
            </>
          ) : (
            <>
              {isAuthenticated ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
              Sou Mentor
            </>
          )}
        </button>
      </div>
    </header>
  );
};
