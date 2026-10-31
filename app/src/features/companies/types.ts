export type MemberRole = 'owner' | 'driver';

export type Membership = {
  companyId: string;
  companyName: string;
  role: MemberRole;
};

export type Member = {
  id: string;
  userId: string;
  email: string;
  role: MemberRole;
};

export const roleLabels: Record<MemberRole, string> = {
  owner: 'Dono',
  driver: 'Motorista',
};
