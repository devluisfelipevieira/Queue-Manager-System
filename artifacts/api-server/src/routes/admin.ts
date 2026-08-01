import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, desksTable, settingsTable, usersTable } from "@workspace/db";
import { authenticate, requireAdmin, verifyCredentials, type AuthenticatedRequest } from "../lib/auth";
import { broadcastDesksReset } from "../lib/wsManager";

const router: IRouter = Router();
const adminOnly = [authenticate as any, requireAdmin as any];
const allowedSectors = ["protocolo", "divida_ativa"] as const;

const createDeskSchema = z.object({
  deskNumber: z.number().int().positive().max(999),
  name: z.string().trim().min(1).max(50),
  sector: z.enum(allowedSectors),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(5).max(100),
});

const settingsSchema = z.object({ reminderMinutes: z.number().int().min(1).max(240) });
const updateDeskSchema = z.object({ sector: z.enum(allowedSectors) });
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

function validationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = String(issue?.path[0] ?? "campo");
  const labels: Record<string, string> = {
    deskNumber: "Número da mesa",
    name: "Nome",
    sector: "Setor",
    username: "Usuário",
    password: "Senha",
  };
  if (field === "password") return "A senha da mesa deve ter pelo menos 5 caracteres";
  return `${labels[field] ?? field}: valor inválido`;
}

router.get("/settings", authenticate as any, async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  res.json(settings ?? { id: 1, reminderMinutes: 10, updatedAt: new Date() });
});

router.get("/admin/desks", ...adminOnly, async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT d.id, d.desk_number AS "deskNumber", d.name, d.sector, d.status,
           d.updated_at AS "updatedAt", u.username
    FROM desks d LEFT JOIN users u ON u.desk_id = d.id AND u.role = 'mesa'
    ORDER BY d.desk_number
  `);
  res.json((rows as unknown as { rows: unknown[] }).rows);
});

router.post("/admin/desks", ...adminOnly, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = createDeskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: validationMessage(parsed.error), details: parsed.error.flatten() }); return; }
  try {
    const result = await db.transaction(async (tx) => {
      const [desk] = await tx.insert(desksTable).values({
        deskNumber: parsed.data.deskNumber, name: parsed.data.name,
        sector: parsed.data.sector, status: "free",
      }).returning();
      await tx.execute(sql`
        INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
        VALUES (${parsed.data.username}, crypt(${parsed.data.password}, gen_salt('bf', 10)), 'mesa',
                ${desk.id}, ${desk.deskNumber}, ${desk.sector})
      `);
      return desk;
    });
    const desks = await db.select().from(desksTable).orderBy(asc(desksTable.deskNumber));
    broadcastDesksReset(desks);
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "23505") { res.status(409).json({ error: "Numero da mesa ou usuario ja existe" }); return; }
    throw error;
  }
});

router.delete("/admin/desks/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "ID invalido" }); return; }
  const deleted = await db.transaction(async (tx) => {
    await tx.delete(usersTable).where(eq(usersTable.deskId, id));
    return tx.delete(desksTable).where(eq(desksTable.id, id)).returning();
  });
  if (!deleted.length) { res.status(404).json({ error: "Mesa nao encontrada" }); return; }
  const desks = await db.select().from(desksTable).orderBy(asc(desksTable.deskNumber));
  broadcastDesksReset(desks);
  res.status(204).send();
});

router.put("/admin/desks/:id", ...adminOnly, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const parsed = updateDeskSchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) { res.status(400).json({ error: "Mesa ou setor inválido" }); return; }
  const [desk] = await db.transaction(async (tx) => {
    const updated = await tx.update(desksTable).set({ sector: parsed.data.sector, updatedAt: new Date() }).where(eq(desksTable.id, id)).returning();
    if (updated.length) await tx.update(usersTable).set({ sector: parsed.data.sector }).where(eq(usersTable.deskId, id));
    return updated;
  });
  if (!desk) { res.status(404).json({ error: "Mesa não encontrada" }); return; }
  broadcastDesksReset(await db.select().from(desksTable).orderBy(asc(desksTable.deskNumber)));
  res.json(desk);
});

router.put("/admin/settings", ...adminOnly, async (req, res): Promise<void> => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "O tempo deve estar entre 1 e 240 minutos" }); return; }
  const [settings] = await db.insert(settingsTable).values({ id: 1, reminderMinutes: parsed.data.reminderMinutes })
    .onConflictDoUpdate({ target: settingsTable.id, set: { reminderMinutes: parsed.data.reminderMinutes, updatedAt: new Date() } })
    .returning();
  res.json(settings);
});

router.put("/admin/password", ...adminOnly, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A nova senha deve ter pelo menos 8 caracteres" }); return; }
  const verified = await verifyCredentials(req.user!.username, parsed.data.currentPassword);
  if (!verified) { res.status(400).json({ error: "Senha atual incorreta" }); return; }
  await db.execute(sql`UPDATE users SET password_hash = crypt(${parsed.data.newPassword}, gen_salt('bf', 10)) WHERE username = ${req.user!.username}`);
  res.status(204).send();
});

export default router;
