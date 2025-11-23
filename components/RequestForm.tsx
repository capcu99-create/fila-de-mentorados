import React, { useState } from 'react';

interface RequestFormProps {
  onSubmit: (name: string, reason: string, availability: string) => void;
}

const NICHO_HOT_TOPICS = [
  "Tráfego Pago (Facebook Ads)",
  "Tráfego Orgânico",
  "Validação de Criativos",
  "Copywriting / VSL",
  "Estrutura / Contingência",
  "Outros"
];

export const RequestForm: React.FC<RequestFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(NICHO_HOT_TOPICS[0]);
  const [details, setDetails] = useState('');
  const [availability, setAvailability] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && details && availability) {
      // Se for "Outros", mandamos apenas o texto. Se for categoria, colocamos a tag antes.
      const finalReason = category === "Outros" 
        ? details 
        : `[${category}] ${details}`;

      onSubmit(name, finalReason, availability);
      
      // Reset
      setName('');
      setDetails('');
      setAvailability('');
      setCategory(NICHO_HOT_TOPICS[0]);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-8 bg-indigo-500 rounded-full inline-block"></span>
        Entrar na Fila
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">
            Seu Nome / Nick
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="Ex: PlayerDoDigital"
            required
          />
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-400 mb-1">
              Qual o tema principal?
            </label>
            <div className="relative">
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                {NICHO_HOT_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-slate-400 mb-1">
              {category === "Outros" ? "Descreva sua solicitação" : "Detalhes da dúvida"}
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[100px]"
              placeholder={category === "Outros" 
                ? "Escreva aqui livremente sobre o que você precisa..." 
                : `Explique sua dificuldade com ${category.split(' ')[0]}...`}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-slate-400 mb-1">
            Horário Disponível
          </label>
          <input
            type="text"
            id="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="Ex: Agora, ou após as 19h..."
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/25 flex justify-center items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Solicitar Mentoria
        </button>
      </form>
    </div>
  );
};