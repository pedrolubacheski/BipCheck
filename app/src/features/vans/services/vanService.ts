import { supabase } from '@/lib/supabase.ts';
import { throwIfError } from '@/shared/errors.ts';
import type { Van, VanDriver } from '../types.ts';

export async function listVans(companyId: string): Promise<Van[]> {
  const { data, error } = await supabase
    .from('vans')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name');
  throwIfError(error);
  return data ?? [];
}

export async function createVan(companyId: string, name: string): Promise<void> {
  const { error } = await supabase.from('vans').insert({ company_id: companyId, name });
  throwIfError(error);
}

export async function deleteVan(vanId: string): Promise<void> {
  const { error } = await supabase.from('vans').delete().eq('id', vanId);
  throwIfError(error);
}

export async function listVanDrivers(companyId: string): Promise<VanDriver[]> {
  const { data, error } = await supabase
    .from('van_drivers')
    .select('id, van_id, user_id')
    .eq('company_id', companyId);
  throwIfError(error);
  return (data ?? []).map((row) => ({ id: row.id, vanId: row.van_id, userId: row.user_id }));
}

export async function assignDriver(
  companyId: string,
  vanId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('van_drivers')
    .insert({ company_id: companyId, van_id: vanId, user_id: userId });
  throwIfError(error);
}

export async function unassignDriver(vanDriverId: string): Promise<void> {
  const { error } = await supabase.from('van_drivers').delete().eq('id', vanDriverId);
  throwIfError(error);
}

// Vans que a pessoa pode acompanhar: o dono vê todas; o motorista, só as vinculadas a ele
export async function listVansForUser(
  companyId: string,
  userId: string,
  isOwner: boolean,
): Promise<Van[]> {
  const vans = await listVans(companyId);
  if (isOwner) return vans;
  const drivers = await listVanDrivers(companyId);
  const myVanIds = new Set(drivers.filter((d) => d.userId === userId).map((d) => d.vanId));
  return vans.filter((van) => myVanIds.has(van.id));
}
