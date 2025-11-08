import path from 'path';
import { promises as fs } from 'fs';
import type { DatabaseSchema } from './types';

const DATA_FILE = path.resolve(__dirname, '../db.json');

async function readFile(): Promise<DatabaseSchema> {
  const contents = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(contents) as DatabaseSchema;
}

export async function getDashboard() {
  const db = await readFile();
  return db.dashboard;
}
