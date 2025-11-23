import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
  avatarUrl: string;
  isOnline: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, avatarUrl, isOnline }) => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        {/* Grid Tecnológico */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Glow Azul (Topo Esquerdo) */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
        
        {/* Glow Roxo (Base Direita) */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse delay-1000"></div>
      </div>

      {/* --- CONTEÚDO --- */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-3xl w-full animate-[fadeIn_1s_ease-out]">
        
        {/* Foto com Efeito Glassmorphism */}
        <div className="relative mb-10 group cursor-pointer" onClick={onEnter}>
          <div className={`absolute -inset-0.5 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 ${isOnline ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500' : 'bg-slate-700'}`}></div>
          <div className="relative w-40 h-40 rounded-full p-1 bg-[#0f172a] flex items-center justify-center overflow-hidden ring-1 ring-white/10 shadow-2xl">
             <img 
               src={avatarUrl} 
               alt="Muzeira" 
               className={`w-full h-full object-cover rounded-full transform transition-transform duration-500 group-hover:scale-105 ${!isOnline ? 'grayscale-[0.5]' : ''}`}
               onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://github.com/github.png';
               }}
             />
          </div>
          {/* Status Badge */}
          <div className="absolute bottom-1 right-1 flex h-6 w-6" title={isOnline ? "Mentor Online" : "Mentor Offline"}>
            {isOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-green-500 border-4 border-[#0f172a]"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-6 w-6 bg-slate-500 border-4 border-[#0f172a]"></span>
            )}
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2 mb-6">
          <h2 className="text-indigo-400 font-mono text-sm tracking-[0.2em] uppercase font-semibold">
            Fila de Atendimento
          </h2>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-lg">
            MENTORIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">MUZEIRA</span>
          </h1>
        </div>

        <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-lg leading-relaxed font-light">
          Domine a tecnologia e alavanque seus resultados no <strong>Nicho Hot</strong>. Entre na fila e aguarde sua vez para receber mentoria direta.
        </p>

        {/* Botão Principal */}
        <button
          onClick={onEnter}
          className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-cyan-200 to-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]"></div>
          <span className="relative z-10 flex items-center gap-2 group-hover:text-slate-900 transition-colors">
            ACESSAR O SISTEMA
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </button>

        {/* Footer Stats */}
        <div className="mt-16 flex justify-center text-center border-t border-slate-800/50 pt-8 w-full max-w-md">
           <div className="flex flex-col items-center">
             <p className={`text-2xl font-bold transition-colors duration-500 ${isOnline ? 'text-green-400' : 'text-slate-500'}`}>
               {isOnline ? 'ONLINE' : 'OFFLINE'}
             </p>
             <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Status do Mentor</p>
           </div>
        </div>

        <style>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
};