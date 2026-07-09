import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, desksTable } from "@workspace/db";
import { FreeDeskParams, OccupyDeskParams } from "@workspace/api-zod";
import { authenticate, type AuthenticatedRequest } from "../lib/auth";
import { broadcastDeskUpdate } from "../lib/wsManager";

const router: IRouter = Router();

router.get("/desks", async (_req, res): Promise<void> => {
  const desks = await db
    .select()
    .from(desksTable)
    .orderBy(asc(desksTable.deskNumber));
  res.json(desks);
});

router.get("/desks/summary", async (_req, res): Promise<void> => {
  const desks = await db
    .select()
    .from(desksTable)
    .orderBy(asc(desksTable.deskNumber));

  const protocolo = desks.filter((d) => d.sector === "protocolo");
  const divida_ativa = desks.filter((d) => d.sector === "divida_ativa");
  const totalFree = desks.filter((d) => d.status === "free").length;
  const totalOccupied = desks.filter((d) => d.status === "occupied").length;

  res.json({ protocolo, divida_ativa, totalFree, totalOccupied });
});

router.post("/desks/:id/free", authenticate as any, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = FreeDeskParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;

  // Mesa users can only free their own desk; recepcao can free any
  if (user.role === "mesa" && user.deskId !== params.data.id) {
    res.status(403).json({ error: "Você só pode liberar sua própria mesa" });
    return;
  }

  const [desk] = await db
    .update(desksTable)
    .set({ status: "free", updatedAt: new Date() })
    .where(eq(desksTable.id, params.data.id))
    .returning();

  if (!desk) {
    res.status(404).json({ error: "Mesa não encontrada" });
    return;
  }

  broadcastDeskUpdate(desk);
  res.json(desk);
});

router.post("/desks/:id/occupy", authenticate as any, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = OccupyDeskParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;

  // Mesa users can only occupy their own desk
  if (user.role === "mesa" && user.deskId !== params.data.id) {
    res.status(403).json({ error: "Você só pode ocupar sua própria mesa" });
    return;
  }

  const [desk] = await db
    .update(desksTable)
    .set({ status: "occupied", updatedAt: new Date() })
    .where(eq(desksTable.id, params.data.id))
    .returning();

  if (!desk) {
    res.status(404).json({ error: "Mesa não encontrada" });
    return;
  }

  broadcastDeskUpdate(desk);
  res.json(desk);
});

export default router;
