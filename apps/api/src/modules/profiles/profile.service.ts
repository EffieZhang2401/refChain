import type { MagicUserMetadata } from '@magic-sdk/admin';
import { supabaseAdmin } from '../../lib/supabaseClient';
import { AppError } from '../../utils/appError';
import type { Profile } from '../../types/domain';

export async function getOrCreateProfileFromMagic(metadata: MagicUserMetadata): Promise<Profile> {
  if (!metadata.email) {
    throw new AppError('Magic user email is required', 400);
  }

  const normalizedEmail = metadata.email.toLowerCase();
  const wallet = metadata.publicAddress?.toLowerCase() ?? null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        email: normalizedEmail,
        wallet_address: wallet,
        magic_user_id: metadata.issuer ?? null,
        role: 'merchant_admin'
      },
      { onConflict: 'magic_user_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError('Failed to persist Magic profile', 500, error);
  }

  return data as Profile;
}

export async function getOrCreateProfileByEmail(email: string, walletAddress?: string | null, role: Profile['role'] = 'buyer') {
  const normalizedEmail = email.toLowerCase();
  const wallet = walletAddress ? walletAddress.toLowerCase() : null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        email: normalizedEmail,
        wallet_address: wallet,
        role
      },
      { onConflict: 'email' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError('Failed to create buyer profile', 500, error);
  }

  return data as Profile;
}
