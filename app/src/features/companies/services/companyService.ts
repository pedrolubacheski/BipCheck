import { supabase } from '@/lib/supabase.ts';
import { throwIfError } from '@/shared/errors.ts';
import type { Member, MemberRole, Membership } from '../types.ts';

type MembershipRow = { role: MemberRole; companies: { id: string; name: string } | null };

export function toMembership(row: MembershipRow): Membership | null {
  if (!row.companies) return null;
  return { companyId: row.companies.id, companyName: row.companies.name, role: row.role };
}

export async function listMyMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select('role, companies(id, name)')
    .eq('user_id', userId);
  throwIfError(error);
  return (data ?? []).map(toMembership).filter((m): m is Membership => m !== null);
}

export async function createCompany(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_company', { p_name: name });
  throwIfError(error);
  return data!;
}

export async function listMembers(companyId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select('id, user_id, email, role')
    .eq('company_id', companyId)
    .order('email');
  throwIfError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
  }));
}

export async function addMember(companyId: string, email: string, role: MemberRole): Promise<void> {
  const { error } = await supabase.rpc('add_company_member', {
    p_company_id: companyId,
    p_email: email,
    p_role: role,
  });
  throwIfError(error);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('company_members').delete().eq('id', memberId);
  throwIfError(error);
}
