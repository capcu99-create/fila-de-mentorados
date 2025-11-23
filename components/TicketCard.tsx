
import React, { useState } from 'react';
import { Ticket, TicketStatus, UserRole } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  role: UserRole;
  currentUserId?: string | null;
  onStatusChange: (id: string, status: TicketStatus) => void;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  role,
  currentUserId,
  onStatusChange,
  onUpdateTicket,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editAvailability, setEditAvailability] = useState(ticket.availability);

  const isPending = ticket.status === TicketStatus.PENDING;
  const isResolved = ticket.status === TicketStatus.RESOLVED;
  const isDiscarded = ticket.status === TicketStatus.DISCARDED;
  
  // Verifica se o usuário atual é o dono do ticket
  // Robust check: ensure strings exist and match
  const isOwner = !!(currentUserId && ticket.createdBy && ticket.createdBy === currentUserId);

  const handleSaveEdit = () => {
    onUpdateTicket(ticket.id, { availability: editAvailability });
    setIsEditing(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
      isResolved ? 'bg-slate-900/30 border-green-900/30 opacity-75' :
      isDiscarded ? 'bg-slate-900/30 border-slate-800 opacity-50 grayscale' :
      'bg-slate-800 border-slate-700 shadow-lg'
    }`}>
      {/* Status Stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        ticket.status === TicketStatus.PENDING ? 'bg-indigo-500' :
        ticket.status === TicketStatus.RESOLVED ? 'bg-green-500' :
        ticket.status === TicketStatus.DISCARDED ? 'bg-slate-600' :
        'bg-blue-500'
      }`}></div>

      <div className="p-5 pl-7">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {ticket.studentName}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
          
          {/* Botões do MENTOR */}
          {role === UserRole.MENTOR && isPending && (
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(ticket.id, TicketStatus.RESOLVED)}
                className="p-2 hover:bg-green-500/20 text-slate-400 hover:text-green-400 rounded-lg transition-colors"
                title="Marcar como Resolvido"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => onStatusChange(ticket.id, TicketStatus.DISCARDED)}
                className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                title="Descartar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Botões do ALUNO (Só aparece se for dono do ticket) */}
          {role === UserRole.STUDENT && isPending && isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-slate-400 hover:text-indigo-400 underline decoration-indigo-500/50"
              >
                {isEditing ? 'Cancelar Edição' : 'Editar'}
              </button>
              {!isEditing && (
                 <button
                 onClick={() => onStatusChange(ticket.id, TicketStatus.DISCARDED)}
                 className="text-xs text-slate-400 hover:text-red-400 underline decoration-red-500/50"
               >
                 Cancelar Pedido
               </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-slate-300 text-sm leading-relaxed">
            <span className="text-slate-500 font-medium text-xs uppercase block mb-0.5">Motivo</span>
            {ticket.reason}
          </p>
          
          <div className="pt-2 border-t border-slate-700/50 mt-2">
             <span className="text-slate-500 font-medium text-xs uppercase block mb-0.5">Disponibilidade</span>
             {isEditing ? (
               <div className="flex gap-2 mt-1">
                  <input 
                    type="text" 
                    value={editAvailability} 
                    onChange={(e) => setEditAvailability(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <button 
                    onClick={handleSaveEdit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded transition-colors"
                  >
                    Salvar
                  </button>
               </div>
             ) : (
               <p className="text-indigo-300 text-sm font-medium">
                 {ticket.availability}
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
