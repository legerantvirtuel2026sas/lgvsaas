/**
 * Magasin de persistance locale de secours pour le mode développement autonome
 * Utilisé automatiquement lorsque le serveur PostgreSQL n'est pas joignable localement.
 */

import fs from 'fs';
import path from 'path';

export interface DevUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface DevSession {
  token: string;
  userId: string;
  expiresAt: string;
}

interface DevAuthData {
  users: DevUser[];
  sessions: DevSession[];
}

const DB_DIR = path.join(process.cwd(), '.local-db');
const DB_FILE = path.join(DB_DIR, 'auth.json');

function ensureDirExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function loadData(): DevAuthData {
  try {
    ensureDirExists();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw) as DevAuthData;
    }
  } catch {
    // En cas d'erreur de lecture
  }
  return { users: [], sessions: [] };
}

function saveData(data: DevAuthData): void {
  try {
    ensureDirExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erreur écriture .local-db/auth.json:', err);
  }
}

export const devAuthStore = {
  getUserByEmail(email: string): DevUser | null {
    const cleanEmail = email.toLowerCase().trim();
    const data = loadData();
    return data.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  },

  getUserById(id: string): DevUser | null {
    const data = loadData();
    return data.users.find((u) => u.id === id) || null;
  },

  createUser(input: { email: string; fullName: string; phone?: string; passwordHash: string }): DevUser {
    const data = loadData();
    const cleanEmail = input.email.toLowerCase().trim();

    const existing = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return existing;
    }

    const newUser: DevUser = {
      id: `usr_dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim(),
      passwordHash: input.passwordHash,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    saveData(data);
    return newUser;
  },

  createSession(userId: string, token: string, expiresAt: Date): DevSession {
    const data = loadData();
    // Nettoyer les anciennes sessions de cet utilisateur
    data.sessions = data.sessions.filter((s) => s.userId !== userId && new Date(s.expiresAt) > new Date());

    const newSession: DevSession = {
      token,
      userId,
      expiresAt: expiresAt.toISOString(),
    };

    data.sessions.push(newSession);
    saveData(data);
    return newSession;
  },

  getSession(token: string): { session: DevSession; user: DevUser } | null {
    if (!token) return null;
    const data = loadData();
    const session = data.sessions.find((s) => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt) <= new Date()) {
      // Expiré
      this.deleteSession(token);
      return null;
    }

    const user = data.users.find((u) => u.id === session.userId);
    if (!user) return null;

    return { session, user };
  },

  deleteSession(token: string): void {
    const data = loadData();
    data.sessions = data.sessions.filter((s) => s.token !== token);
    saveData(data);
  },
};
