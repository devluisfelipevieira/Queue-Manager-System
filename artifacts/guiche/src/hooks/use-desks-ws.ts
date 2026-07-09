import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDesksQueryKey, getGetDesksSummaryQueryKey, Desk, DesksSummary } from '@workspace/api-client-react';

export function useDesksWs() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: number;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'desk_updated') {
            queryClient.setQueryData(getGetDesksQueryKey(), (old: Desk[] | undefined) => {
              if (!old) return old;
              return old.map(d => d.id === data.desk.id ? data.desk : d);
            });
            
            queryClient.setQueryData(getGetDesksSummaryQueryKey(), (old: DesksSummary | undefined) => {
              if (!old) return old;
              const newProtocolo = old.protocolo.map(d => d.id === data.desk.id ? data.desk : d);
              const newDividaAtiva = old.divida_ativa.map(d => d.id === data.desk.id ? data.desk : d);
              const allDesks = [...newProtocolo, ...newDividaAtiva];
              const totalFree = allDesks.filter(d => d.status === 'free').length;
              const totalOccupied = allDesks.filter(d => d.status === 'occupied').length;
              return {
                 protocolo: newProtocolo,
                 divida_ativa: newDividaAtiva,
                 totalFree,
                 totalOccupied
              };
            });
          } else if (data.type === 'desks_reset') {
            queryClient.setQueryData(getGetDesksQueryKey(), data.desks);
            queryClient.invalidateQueries({ queryKey: getGetDesksSummaryQueryKey() });
          }
        } catch (err) {}
      };

      ws.onclose = () => {
        reconnectTimeout = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [queryClient]);
}
