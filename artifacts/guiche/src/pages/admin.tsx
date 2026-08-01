import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type AdminDesk = { id: number; deskNumber: number; name: string; sector: string; status: string; username: string | null };
type Settings = { reminderMinutes: number };

export default function AdminPage() {
  const client = useQueryClient();
  const desks = useQuery({ queryKey: ["admin-desks"], queryFn: () => apiRequest<AdminDesk[]>("/admin/desks") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiRequest<Settings>("/settings") });
  const [minutes, setMinutes] = React.useState("10");
  const [form, setForm] = React.useState({ deskNumber: "", name: "", sector: "protocolo", username: "", password: "" });
  React.useEffect(() => { if (settings.data) setMinutes(String(settings.data.reminderMinutes)); }, [settings.data]);

  const saveSettings = useMutation({ mutationFn: () => apiRequest<Settings>("/admin/settings", { method: "PUT", body: JSON.stringify({ reminderMinutes: Number(minutes) }) }), onSuccess: () => client.invalidateQueries({ queryKey: ["settings"] }) });
  const createDesk = useMutation({ mutationFn: () => apiRequest("/admin/desks", { method: "POST", body: JSON.stringify({ ...form, deskNumber: Number(form.deskNumber) }) }), onSuccess: () => { setForm({ deskNumber: "", name: "", sector: "protocolo", username: "", password: "" }); client.invalidateQueries({ queryKey: ["admin-desks"] }); } });
  const deleteDesk = useMutation({ mutationFn: (id: number) => apiRequest(`/admin/desks/${id}`, { method: "DELETE" }), onSuccess: () => client.invalidateQueries({ queryKey: ["admin-desks"] }) });

  return <div className="space-y-8">
    <div><h2 className="text-3xl font-black">Administração</h2><p className="text-gray-600">Mesas, acessos e lembretes do sistema.</p></div>
    <section className="bg-white rounded-2xl border p-6 shadow-sm"><h3 className="text-xl font-black mb-4">Tempo do lembrete</h3><div className="flex flex-wrap items-end gap-3 max-w-md"><div className="flex-1"><Label htmlFor="minutes">Minutos (1 a 240)</Label><Input id="minutes" type="number" min="1" max="240" value={minutes} onChange={e => setMinutes(e.target.value)} /></div><Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>Salvar</Button></div>{saveSettings.isSuccess && <p className="text-green-700 font-bold mt-3">Configuração salva.</p>}{saveSettings.error && <p className="text-red-700 font-bold mt-3">{saveSettings.error.message}</p>}</section>
    <section className="bg-white rounded-2xl border p-6 shadow-sm"><h3 className="text-xl font-black mb-4">Criar mesa e perfil</h3><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div><Label>Número</Label><Input type="number" value={form.deskNumber} onChange={e => setForm({ ...form, deskNumber: e.target.value })} /></div><div><Label>Nome</Label><Input placeholder="Mesa 8" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Setor</Label><select className="w-full h-10 border rounded-md px-3" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}><option value="protocolo">Protocolo Geral</option><option value="divida_ativa">Dívida Ativa</option></select></div><div><Label>Usuário</Label><Input placeholder="mesa8" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div><div><Label>Senha inicial</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div><div className="flex items-end"><Button className="w-full" onClick={() => createDesk.mutate()} disabled={createDesk.isPending}>Criar mesa</Button></div>
    </div>{createDesk.error && <p className="text-red-700 font-bold mt-3">{createDesk.error.message}</p>}</section>
    <section className="bg-white rounded-2xl border overflow-hidden shadow-sm"><div className="p-6"><h3 className="text-xl font-black">Mesas cadastradas</h3></div><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100"><tr><th className="p-4">Mesa</th><th className="p-4">Setor</th><th className="p-4">Usuário</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody>{desks.data?.map(d => <tr key={d.id} className="border-t"><td className="p-4 font-bold">{d.name} (#{d.deskNumber})</td><td className="p-4">{d.sector === "protocolo" ? "Protocolo Geral" : "Dívida Ativa"}</td><td className="p-4">{d.username}</td><td className="p-4">{d.status === "free" ? "Livre" : "Ocupada"}</td><td className="p-4 text-right"><Button variant="destructive" size="sm" onClick={() => window.confirm(`Excluir ${d.name} e seu usuário?`) && deleteDesk.mutate(d.id)}>Excluir</Button></td></tr>)}</tbody></table></div></section>
  </div>;
}
