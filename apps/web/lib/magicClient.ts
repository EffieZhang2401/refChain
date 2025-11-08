'use client';

import { Magic } from 'magic-sdk';

let magic: Magic | null = null;

export function getMagicClient() {
  if (magic) {
    return magic;
  }

  const publishableKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY is not configured');
  }

  magic = new Magic(publishableKey);
  return magic;
}
