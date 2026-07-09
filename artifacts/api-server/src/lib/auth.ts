import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { type Request, type Response, type NextFunction } from "express";

// Simple in-memory token store: token -> username (non-expiring for this internal system)
const tokenStore = new Map<string, string>();

export function generateToken(username: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  tokenStore.set(token, username);
  return token;
}

export function validateToken(token: string): string | null {
  return tokenStore.get(token) ?? null;
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<{ username: string; role: string; deskId: number | null; deskNumber: number | null; sector: string | null } | null> {
  // Use pgcrypto crypt() to verify hashed password stored in DB
  // Parameterized via Drizzle sql`` tag — no string interpolation, no injection risk
  const result = await db.execute(
    sql`
      SELECT username, role, desk_id, desk_number, sector
      FROM users
      WHERE username = ${username}
        AND password_hash = crypt(${password}, password_hash)
      LIMIT 1
    `
  );

  const user = ((result as unknown) as { rows: any[] }).rows[0] as { username: string; role: string; desk_id: number | null; desk_number: number | null; sector: string | null } | undefined;

  if (!user) return null;

  return {
    username: user.username,
    role: user.role,
    deskId: user.desk_id,
    deskNumber: user.desk_number,
    sector: user.sector,
  };
}

export async function getUserByUsername(
  username: string
): Promise<{ username: string; role: string; deskId: number | null; deskNumber: number | null; sector: string | null } | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) return null;

  return {
    username: user.username,
    role: user.role,
    deskId: user.deskId,
    deskNumber: user.deskNumber,
    sector: user.sector,
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
    role: string;
    deskId: number | null;
    deskNumber: number | null;
    sector: string | null;
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const username = validateToken(token);
  if (!username) {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }

  // Fetch user info from token store + DB async — but since middleware must be sync,
  // use a deferred approach: attach username and let route handlers fetch full user if needed.
  // For simplicity, store full user info in tokenStore as well.
  req.user = tokenUserStore.get(token);
  if (!req.user) {
    res.status(401).json({ error: "Sessão inválida" });
    return;
  }

  next();
}

// Extended token store that also holds user data
export const tokenUserStore = new Map<
  string,
  { username: string; role: string; deskId: number | null; deskNumber: number | null; sector: string | null }
>();

export function generateTokenForUser(user: {
  username: string;
  role: string;
  deskId: number | null;
  deskNumber: number | null;
  sector: string | null;
}): string {
  const token = crypto.randomBytes(32).toString("hex");
  tokenStore.set(token, user.username);
  tokenUserStore.set(token, user);
  return token;
}
