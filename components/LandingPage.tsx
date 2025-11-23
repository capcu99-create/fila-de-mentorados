
import React from 'react';

interface MentorStatus {
  id: string;
  name: string;
  photo: string;
  isOnline: boolean;
}

interface LandingPageProps {
  onEnter: () => void;
  mentors: MentorStatus[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, mentors }) => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse delay-1000"></div>
      </div>

      {/* --- CONTEÚDO --- */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-4xl w-full animate-[fadeIn_1s_ease-out]">
        
        {/* Título */}
        <div className="space-y-2 mb-10">
          <h2 className="text-indigo-400 font-mono text-sm tracking-[0.2em] uppercase font-semibold">
            Fila de Atendimento
          </h2>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-lg">
            MENTORIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">MUZEIRA</span>
          </h1>
        </div>

        {/* Mentors Grid */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 mb-12 items-center justify-center">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="flex flex-col items-center group cursor-pointer" onClick={onEnter}>
              <div className="relative mb-4">
                 <div className={`absolute -inset-0.5 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 ${mentor.isOnline ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-slate-700'}`}></div>
                 <div className="relative w-32 h-32 rounded-full p-1 bg-[#0f172a] flex items-center justify-center overflow-hidden ring-1 ring-white/10 shadow-2xl">
                   <img 
                     src={mentor.photo} 
                     alt={mentor.name} 
                     className={`w-full h-full object-cover rounded-full transform transition-transform duration-500 group-hover:scale-105 ${!mentor.isOnline ? 'grayscale-[0.8]' : ''}`}
                   />
                 </div>
                 {/* Status Badge */}
                 <div className="absolute bottom-1 right-1 flex h-6 w-6" title={mentor.isOnline ? "Online" : "Offline"}>
                    {mentor.isOnline ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-6 w-6 bg-green-500 border-4 border-[#0f172a]"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-6 w-6 bg-slate-500 border-4 border-[#0f172a]"></span>
                    )}
                  </div>
              </div>
              <h3 className={`text-xl font-bold ${mentor.isOnline ? 'text-white' : 'text-slate-500'}`}>{mentor.name}</h3>
              <span className={`text-xs font-mono uppercase tracking-widest ${mentor.isOnline ? 'text-green-400' : 'text-slate-600'}`}>
                {mentor.isOnline ? 'Disponível' : 'Offline'}
              </span>
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-lg mb-10 max-w-lg leading-relaxed font-light">
           Entre na fila e aguarde sua vez para receber mentoria técnica e estratégica.
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
