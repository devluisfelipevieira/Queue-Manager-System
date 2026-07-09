import React from 'react';
import { useParams, useLocation } from "wouter";
import { useGetDesks, useFreeDesk, useOccupyDesk, AuthResponse } from '@workspace/api-client-react';
import { useDesksWs } from '../hooks/use-desks-ws';
import { Button } from '../components/ui/button';

export default function DeskPage({ user }: { user: AuthResponse }) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const deskId = Number(params.id);

  // Users can only view their own desk panel unless they are reception
  React.useEffect(() => {
    if (user.deskId !== deskId && user.role !== 'recepcao') {
      if (user.deskId) setLocation(`/mesa/${user.deskId}`);
      else setLocation(`/recepcao`);
    }
  }, [user.deskId, deskId, user.role, setLocation]);

  const { data: desks, isLoading } = useGetDesks();
  const freeDeskMutation = useFreeDesk();
  const occupyDeskMutation = useOccupyDesk();
  useDesksWs();

  if (isLoading || !desks) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg font-bold text-gray-500 animate-pulse">Carregando painel do servidor...</div>
      </div>
    );
  }

  const desk = desks.find(d => d.id === deskId);
  if (!desk) return <div className="text-center mt-20 text-xl font-bold text-gray-700">Guichê não encontrado no sistema.</div>;

  const isFree = desk.status === 'free';

  return (
    <div className="max-w-3xl mx-auto mt-6 sm:mt-12">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden text-center flex flex-col">
        <div className={`py-10 border-b-4 transition-colors duration-500 ${isFree ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black tracking-widest uppercase mb-6 shadow-sm border ${
            isFree ? 'bg-green-100 text-green-900 border-green-200' : 'bg-red-100 text-red-900 border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full ${isFree ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isFree ? 'STATUS: LIVRE' : 'STATUS: OCUPADO'}
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight mb-4">{desk.name}</h2>
          <p className="text-gray-600 font-bold text-xl tracking-wide uppercase">
            SETOR: {desk.sector === 'protocolo' ? 'PROTOCOLO GERAL' : 'DÍVIDA ATIVA'}
          </p>
        </div>

        <div className="p-8 sm:p-12 grid gap-6 md:grid-cols-2 bg-gray-50 flex-1">
          <Button 
            size="lg" 
            variant="success" 
            className="h-24 sm:h-32 text-2xl font-black shadow-lg hover:shadow-xl disabled:opacity-40 disabled:scale-100 active:scale-95 transition-all border-4 border-green-700/20"
            disabled={isFree || freeDeskMutation.isPending}
            onClick={() => freeDeskMutation.mutate({ id: deskId })}
          >
            LIBERAR MESA
          </Button>

          <Button 
            size="lg" 
            variant="destructive"
            className="h-24 sm:h-32 text-2xl font-black shadow-lg hover:shadow-xl disabled:opacity-40 disabled:scale-100 active:scale-95 transition-all border-4 border-red-700/20"
            disabled={!isFree || occupyDeskMutation.isPending}
            onClick={() => occupyDeskMutation.mutate({ id: deskId })}
          >
            OCUPAR MESA
          </Button>
        </div>
        <div className="bg-gray-100 py-5 text-sm text-gray-500 font-bold tracking-wide border-t border-gray-200">
          ÚLTIMA ATUALIZAÇÃO: {new Date(desk.updatedAt).toLocaleTimeString('pt-BR')}
        </div>
      </div>
    </div>
  );
}
