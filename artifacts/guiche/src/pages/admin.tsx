import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type Sector = "protocolo" | "divida_ativa";
type AdminDesk = { id: number; deskNumber: number; name: string; sector: Sector; status: string; username: string | null };
type Settings = { reminderMinutes: number };

const emptyDesk = { deskNumber: "", name: "", sector: "protocolo" as Sector, username: "", password: "" };

export default function AdminPage() {
  const client = useQueryClient();
  const desks = useQuery({ queryKey: ["admin-desks"], queryFn: () => apiRequest<AdminDesk[]>("/admin/desks") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiRequest<Settings>("/settings") });
  const [minutes, setMinutes] = React.useState("10");
  const [form, setForm] = React.useState(emptyDesk);
  const [formError, setFormError] = React.useState("");
  const [password, setPassword] = React.useState({ current: "", next: "", confirmation: "" });
  const [passwordError, setPasswordError] = React.useState("");
  const [sectorDrafts, setSectorDrafts] = React.useState<Record<number, Sector>>({});

  React.useEffect(() => { if (settings.data) setMinutes(String(settings.data.reminderMinutes)); }, [settings.data]);
  React.useEffect(() => {
    if (desks.data) setSectorDrafts(Object.fromEntries(desks.data.map(desk => [desk.id, desk.sector])));
  }, [desks.data]);

  const refreshDesks = () => {
    client.invalidateQueries({ queryKey: ["admin-desks"] });
    client.invalidateQueries({ queryKey: ["/api/desks"] });
  };

  const saveSettings = useMutation({
    mutationFn: () => apiRequest<Settings>("/admin/settings", { method: "PUT", body: JSON.stringify({ reminderMinutes: Number(minutes) }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["settings"] }),
  });

  const createDesk = useMutation({
    mutationFn: () => apiRequest("/admin/desks", { method: "POST", body: JSON.stringify({ ...form, deskNumber: Number(form.deskNumber) }) }),
    onSuccess: () => { setForm(emptyDesk); setFormError(""); refreshDesks(); },
  });

  const deleteDesk = useMutation({ mutationFn: (id: number) => apiRequest(`/admin/desks/${id}`, { method: "DELETE" }), onSuccess: refreshDesks });
  const updateSector = useMutation({
    mutationFn: ({ id, sector }: { id: number; sector: Sector }) => apiRequest(`/admin/desks/${id}`, { method: "PUT", body: JSON.stringify({ sector }) }),
    onSuccess: refreshDesks,
  });

  const changePassword = useMutation({
    mutationFn: () => apiRequest("/admin/password", { method: "PUT", body: JSON.stringify({ currentPassword: password.current, newPassword: password.next }) }),
    onSuccess: () => { setPassword({ current: "", next: "", confirmation: "" }); setPasswordError(""); },
  });

  const submitDesk = () => {
    if (!Number.isInteger(Number(form.deskNumber)) || Number(form.deskNumber) <= 0) return setFormError("Informe um número de mesa válido.");
    if (!form.name.trim()) return setFormError("Informe o nome da mesa.");
    if (form.username.trim().length < 3) return setFormError("O usuário deve ter pelo menos 3 caracteres.");
    if (form.password.length < 5) return setFormError("A senha da mesa deve ter pelo menos 5 caracteres.");
    setFormError("");
    createDesk.mutate();
  };

  const submitPassword = () => {
    if (!password.current) return setPasswordError("Informe a senha atual.");
    if (password.next.length < 8) return setPasswordError("A nova senha deve ter pelo menos 8 caracteres.");
    if (password.next !== password.confirmation) return setPasswordError("A confirmação não corresponde à nova senha.");
    setPasswordError("");
    changePassword.mutate();
  };

  return <div className="space-y-8">
    <div><h2 className="text-3xl font-black text-[#012c61]">Administração</h2><p className="text-gray-600">Mesas, acessos e lembretes do sistema.</p></div>

    <div className="grid lg:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border p-6 shadow-sm">
        <h3 className="text-xl font-black mb-4">Tempo do lembrete</h3>
        <div className="flex items-end gap-3"><div className="flex-1"><Label htmlFor="minutes">Minutos (1 a 240)</Label><Input id="minutes" type="number" min="1" max="240" value={minutes} onChange={e => setMinutes(e.target.value)} /></div><Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>Salvar</Button></div>
        {saveSettings.isSuccess && <p className="text-green-700 font-bold mt-3">Configuração salva.</p>}
        {saveSettings.error && <p className="text-red-700 font-bold mt-3">{saveSettings.error.message}</p>}
      </section>

      <section className="bg-white rounded-2xl border p-6 shadow-sm">
        <h3 className="text-xl font-black mb-4">Alterar minha senha</h3>
        <div className="grid gap-3"><div><Label>Senha atual</Label><Input type="password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} /></div><div className="grid sm:grid-cols-2 gap-3"><div><Label>Nova senha</Label><Input type="password" value={password.next} onChange={e => setPassword({ ...password, next: e.target.value })} /></div><div><Label>Confirmar nova senha</Label><Input type="password" value={password.confirmation} onChange={e => setPassword({ ...password, confirmation: e.target.value })} /></div></div><Button onClick={submitPassword} disabled={changePassword.isPending}>Alterar senha</Button></div>
        {(passwordError || changePassword.error) && <p className="text-red-700 font-bold mt-3">{passwordError || changePassword.error?.message}</p>}
        {changePassword.isSuccess && <p className="text-green-700 font-bold mt-3">Senha alterada com sucesso.</p>}
      </section>
    </div>

    <section className="bg-white rounded-2xl border p-6 shadow-sm">
      <h3 className="text-xl font-black mb-4">Criar mesa e perfil</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><Label>Número</Label><Input type="number" min="1" value={form.deskNumber} onChange={e => setForm({ ...form, deskNumber: e.target.value })} /></div>
        <div><Label>Nome</Label><Input placeholder="Mesa 3" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Setor</Label><select className="w-full h-12 border rounded-md px-3" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value as Sector })}><option value="protocolo">Protocolo Geral</option><option value="divida_ativa">Dívida Ativa</option></select></div>
        <div><Label>Usuário</Label><Input placeholder="mesa3" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
        <div><Label>Senha inicial (mín. 5)</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={submitDesk} disabled={createDesk.isPending}>Criar mesa</Button></div>
      </div>
      {(formError || createDesk.error) && <p className="text-red-700 font-bold mt-3">{formError || createDesk.error?.message}</p>}
      {createDesk.isSuccess && <p className="text-green-700 font-bold mt-3">Mesa e usuário criados com sucesso.</p>}
    </section>

    <section className="bg-white rounded-2xl border overflow-hidden shadow-sm">
      <div className="p-6"><h3 className="text-xl font-black">Mesas cadastradas</h3></div>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100"><tr><th className="p-4">Mesa</th><th className="p-4">Setor</th><th className="p-4">Usuário</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody>
        {desks.data?.map(desk => <tr key={desk.id} className="border-t"><td className="p-4 font-bold">{desk.name} (#{desk.deskNumber})</td><td className="p-4"><div className="flex gap-2"><select className="h-9 border rounded-md px-2" value={sectorDrafts[desk.id] ?? desk.sector} onChange={e => setSectorDrafts({ ...sectorDrafts, [desk.id]: e.target.value as Sector })}><option value="protocolo">Protocolo Geral</option><option value="divida_ativa">Dívida Ativa</option></select><Button size="sm" variant="secondary" disabled={(sectorDrafts[desk.id] ?? desk.sector) === desk.sector || updateSector.isPending} onClick={() => updateSector.mutate({ id: desk.id, sector: sectorDrafts[desk.id] ?? desk.sector })}>Salvar</Button></div></td><td className="p-4">{desk.username}</td><td className="p-4">{desk.status === "free" ? "Livre" : "Ocupada"}</td><td className="p-4 text-right"><Button variant="destructive" size="sm" onClick={() => window.confirm(`Excluir ${desk.name} e seu usuário?`) && deleteDesk.mutate(desk.id)}>Excluir</Button></td></tr>)}
      </tbody></table></div>
      {updateSector.error && <p className="text-red-700 font-bold p-4">{updateSector.error.message}</p>}
    </section>
  </div>;
}
