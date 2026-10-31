import { supabase } from '@/lib/supabase.ts';
import { ServiceError, throwIfError } from '@/shared/errors.ts';
import type { Device } from '../types.ts';

export async function listDevices(companyId: string): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('id, name, van_id, last_seen_at')
    .eq('company_id', companyId)
    .order('name');
  throwIfError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    vanId: row.van_id,
    lastSeenAt: row.last_seen_at,
  }));
}

// Devolve o token em texto puro: é a única vez que ele aparece
export async function createDevice(
  companyId: string,
  name: string,
  vanId: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .rpc('create_device', {
      p_company_id: companyId,
      p_name: name,
      ...(vanId ? { p_van_id: vanId } : {}),
    })
    .single();
  throwIfError(error);
  if (!data) throw new ServiceError('create_device não devolveu o token');
  return data.token;
}

export async function rotateDeviceToken(deviceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('rotate_device_token', { p_device_id: deviceId });
  throwIfError(error);
  return data!;
}

export async function assignDeviceToVan(deviceId: string, vanId: string | null): Promise<void> {
  const { error } = await supabase.from('devices').update({ van_id: vanId }).eq('id', deviceId);
  throwIfError(error);
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const { error } = await supabase.from('devices').delete().eq('id', deviceId);
  throwIfError(error);
}
