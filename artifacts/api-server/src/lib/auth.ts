import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { type Request, type Response, type NextFunction } from "express";

export type AuthenticatedUser = {
  username: string;
  role: string;
  deskId: number | null;
  deskNumber: number | null;
  sector: string | null;
};

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET deve possuir pelo menos 32 caracteres");
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret!).update(payload).digest("base64url");
}

export function generateTokenForUser(user: AuthenticatedUser): string {
  const payload = encode(JSON.stringify({ sub: user.username, exp: Date.now() + 365 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload)}`;
}

function validateToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string; exp?: number };
    return value.sub && value.exp && value.exp > Date.now() ? value.sub : null;
  } catch {
    return null;
  }
}

export async function verifyCredentials(username: string, password: string): Promise<AuthenticatedUser | null> {
  const result = await db.execute(sql`
    SELECT username, role, desk_id, desk_number, sector FROM users
    WHERE username = ${username} AND password_hash = crypt(${password}, password_hash) LIMIT 1
  `);
  const user = (result as unknown as { rows: any[] }).rows[0];
  return user ? { username: user.username, role: user.role, deskId: user.desk_id, deskNumber: user.desk_number, sector: user.sector } : null;
}

export async function getUserByUsername(username: string): Promise<AuthenticatedUser | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  return user ? { username: user.username, role: user.role, deskId: user.deskId, deskNumber: user.deskNumber, sector: user.sector } : null;
}

export interface AuthenticatedRequest extends Request { user?: AuthenticatedUser; }

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const username = header?.startsWith("Bearer ") ? validateToken(header.slice(7)) : null;
  if (!username) { res.status(401).json({ error: "Token invalido ou expirado" }); return; }
  const user = await getUserByUsername(username);
  if (!user) { res.status(401).json({ error: "Sessao invalida" }); return; }
  req.user = user;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Acesso exclusivo do administrador" }); return; }
  next();
}
