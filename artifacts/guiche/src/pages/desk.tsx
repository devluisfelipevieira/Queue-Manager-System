import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetDesks, useFreeDesk, useOccupyDesk, AuthResponse } from "@workspace/api-client-react";
import { useDesksWs } from "../hooks/use-desks-ws";
import { Button } from "../components/ui/button";
import { apiRequest } from "../lib/api";

export default function DeskPage({ user }: { user: AuthResponse }) {
  const [, setLocation] = useLocation();
  const deskId = Number(useParams().id);
  React.useEffect(() => {
    if (user.deskId !== deskId && user.role !== "recepcao") {
      setLocation(user.deskId ? `/mesa/${user.deskId}` : "/recepcao");
    }
  }, [user.deskId, deskId, user.role, setLocation]);

  const { data: desks, isLoading } = useGetDesks();
  const freeDeskMutation = useFreeDesk();
  const occupyDeskMutation = useOccupyDesk();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiRequest<{ reminderMinutes: number }>("/settings") });
  const [now, setNow] = React.useState(Date.now());
  const [snoozedUntil, setSnoozedUntil] = React.useState(0);
  useDesksWs();

  const desk = desks?.find(d => d.id === deskId);
  const isFree = desk?.status !== "occupied";
  const reminderMinutes = settings?.reminderMinutes ?? 10;
  const occupiedMs = !desk || isFree ? 0 : Math.max(0, now - new Date(desk.updatedAt).getTime());
  const reminderDue = !isFree && occupiedMs >= reminderMinutes * 60_000 && now >= snoozedUntil;

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!window.guicheDesktop || !desk) return;
    window.guicheDesktop.setReminder(isFree ? null : { deskId, deskName: desk.name, occupiedAt: desk.updatedAt, reminderMinutes });
  }, [deskId, desk, isFree, reminderMinutes]);

  React.useEffect(() => {
    if (!window.guicheDesktop) return;
    return window.guicheDesktop.onReminderAction(action => {
      if (action === "free") freeDeskMutation.mutate({ id: deskId });
      else setSnoozedUntil(Date.now() + 5 * 60_000);
    });
  }, [deskId, freeDeskMutation]);

  if (isLoading || !desks) return <div className="flex items-center justify-center min-h-[50vh]"><div className="text-lg font-bold text-gray-500 animate-pulse">Carregando painel do servidor...</div></div>;
  if (!desk) return <div className="text-center mt-20 text-xl font-bold text-gray-700">Guichê não encontrado no sistema.</div>;

  const elapsed = `${String(Math.floor(occupiedMs / 60_000)).padStart(2, "0")}:${String(Math.floor(occupiedMs / 1000) % 60).padStart(2, "0")}`;
  return <div className="max-w-3xl mx-auto mt-6 sm:mt-12">
    {!isFree && <div className={`mb-5 rounded-xl border-2 p-4 flex flex-wrap items-center justify-between gap-3 ${reminderDue ? "bg-red-100 border-red-600 text-red-950 animate-pulse" : "bg-amber-50 border-amber-300 text-amber-950"}`}>
      <div><p className="font-black">Atendimento em andamento</p><p className="font-bold">Mesa ocupada há {elapsed} · lembrete em {reminderMinutes} min</p></div>
      {reminderDue && <div className="flex gap-2"><Button variant="destructive" onClick={() => freeDeskMutation.mutate({ id: deskId })}>LIBERAR</Button><Button variant="outline" onClick={() => setSnoozedUntil(Date.now() + 5 * 60_000)}>ADIAR 5 MIN</Button></div>}
    </div>}
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden text-center flex flex-col">
      <div className={`py-10 border-b-4 transition-colors duration-500 ${isFree ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}>
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black tracking-widest uppercase mb-6 shadow-sm border ${isFree ? "bg-green-100 text-green-900 border-green-200" : "bg-red-100 text-red-900 border-red-200"}`}><div className={`w-3 h-3 rounded-full ${isFree ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />{isFree ? "STATUS: LIVRE" : "STATUS: OCUPADO"}</div>
        <h2 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight mb-4">{desk.name}</h2>
        <p className="text-gray-600 font-bold text-xl tracking-wide uppercase">SETOR: {desk.sector === "protocolo" ? "PROTOCOLO GERAL" : "DÍVIDA ATIVA"}</p>
      </div>
      <div className="p-8 sm:p-12 grid gap-6 md:grid-cols-2 bg-gray-50 flex-1">
        <Button size="lg" variant="success" className="h-24 sm:h-32 text-2xl font-black shadow-lg disabled:opacity-40" disabled={isFree || freeDeskMutation.isPending} onClick={() => freeDeskMutation.mutate({ id: deskId })}>LIBERAR MESA</Button>
        <Button size="lg" variant="destructive" className="h-24 sm:h-32 text-2xl font-black shadow-lg disabled:opacity-40" disabled={!isFree || occupyDeskMutation.isPending} onClick={() => occupyDeskMutation.mutate({ id: deskId })}>OCUPAR MESA</Button>
      </div>
      <div className="bg-gray-100 py-5 text-sm text-gray-500 font-bold tracking-wide border-t border-gray-200">ÚLTIMA ATUALIZAÇÃO: {new Date(desk.updatedAt).toLocaleTimeString("pt-BR")}</div>
    </div>
  </div>;
}
