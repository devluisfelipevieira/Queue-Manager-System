import React from 'react';
import { useGetDesksSummary, Desk } from '@workspace/api-client-react';
import { useDesksWs } from '../hooks/use-desks-ws';

export default function ReceptionPage() {
  const { data: summary, isLoading } = useGetDesksSummary();
  useDesksWs(); // listens to updates

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg font-bold text-gray-500 animate-pulse">Sincronizando com o servidor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold text-[#00315a] tracking-tight">Painel da Recepção</h2>
          <p className="text-gray-500 font-medium mt-1">Acompanhamento em tempo real do atendimento</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-green-50 px-4 py-2.5 rounded-lg border border-green-100 shadow-sm">
            <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-sm animate-pulse" />
            <span className="text-sm font-bold text-green-900 tracking-wide">LIVRES: {summary.totalFree}</span>
          </div>
          <div className="flex items-center gap-3 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100 shadow-sm">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm" />
            <span className="text-sm font-bold text-red-900 tracking-wide">OCUPADOS: {summary.totalOccupied}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <SectorPanel title="Protocolo Geral" desks={summary.protocolo} />
        <SectorPanel title="Dívida Ativa" desks={summary.divida_ativa} />
      </div>
    </div>
  );
}

function SectorPanel({ title, desks }: { title: string, desks: Desk[] }) {
  const allOccupied = desks.length > 0 && desks.every(d => d.status === 'occupied');

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="bg-[#f8fafc] px-6 py-5 border-b border-gray-200 flex justify-between items-center shadow-sm relative z-10">
        <h3 className="text-xl font-extrabold text-[#00315a] uppercase tracking-wide">{title}</h3>
        {allOccupied && (
          <span className="bg-red-100 text-red-800 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-200 shadow-sm">
            TODOS OCUPADOS
          </span>
        )}
      </div>
      <div className="p-6 grid gap-4 bg-gray-50/50 flex-1">
        {desks.map(desk => (
          <DeskCard key={desk.id} desk={desk} />
        ))}
        {desks.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-500 text-sm font-medium">Nenhum guichê cadastrado no setor.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeskCard({ desk }: { desk: Desk }) {
  const isFree = desk.status === 'free';
  return (
    <div className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-500 ${
      isFree 
        ? 'border-green-200 bg-green-50 shadow-sm' 
        : 'border-red-200 bg-red-50 opacity-90'
    }`}>
      <div>
        <h4 className="text-xl font-extrabold text-gray-900">{desk.name}</h4>
        <p className={`text-sm font-bold mt-1 ${isFree ? 'text-green-700' : 'text-red-700'}`}>
          GUICHÊ {desk.deskNumber.toString().padStart(2, '0')}
        </p>
      </div>
      
      <div className={`px-5 py-2.5 rounded-lg font-black text-sm tracking-widest shadow-md ${
        isFree ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {isFree ? 'LIVRE' : 'OCUPADO'}
      </div>
    </div>
  );
}
