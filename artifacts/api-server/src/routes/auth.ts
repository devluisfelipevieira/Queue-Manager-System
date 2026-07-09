import { Router, type IRouter } from "express";
import { verifyCredentials, generateTokenForUser, authenticate, type AuthenticatedRequest } from "../lib/auth";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const { username, password } = parsed.data;
  const user = await verifyCredentials(username, password);

  if (!user) {
    res.status(401).json({ error: "Usuário ou senha inválidos" });
    return;
  }

  const token = generateTokenForUser(user);
  res.json({
    token,
    role: user.role,
    username: user.username,
    deskId: user.deskId,
    deskNumber: user.deskNumber,
    sector: user.sector,
  });
});

router.get("/auth/me", authenticate as any, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  res.json({
    token: req.headers.authorization?.slice(7) ?? "",
    role: user.role,
    username: user.username,
    deskId: user.deskId,
    deskNumber: user.deskNumber,
    sector: user.sector,
  });
});

export default router;
