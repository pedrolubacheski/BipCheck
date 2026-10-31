type Card = {
  id: string;
  uid: string;
  active: boolean;
};

export type Student = {
  id: string;
  name: string;
  city: string | null;
  cards: Card[];
};

// Cartão encostado num leitor da empresa sem estar cadastrado (vem da auditoria)
export type UnknownCard = {
  uid: string;
  lastSeenAt: string;
};
