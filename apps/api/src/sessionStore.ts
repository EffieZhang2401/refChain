import { randomUUID } from 'crypto';

const sessions = new Map<string, string>();

export function createSession(userId: string) {
  const token = `sess_${randomUUID()}`;
  sessions.set(token, userId);
  return token;
}

export function getUserIdByToken(token: string) {
  return sessions.get(token);
}
