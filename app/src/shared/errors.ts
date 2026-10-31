// Erros dos services e a mensagem amigável que a tela mostra (nunca o erro técnico cru)

export class ServiceError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

type PostgrestLikeError = { message: string; code?: string };

// Converte o { error } do Supabase em exceção (padrão dos services)
export function throwIfError(error: PostgrestLikeError | null): void {
  if (error) throw new ServiceError(error.message, error.code);
}

const messagesByCode: Record<string, string> = {
  '42501': 'Você não tem permissão para fazer isso.',
  '23505': 'Já existe um cadastro com esses dados.',
  '23514': 'Algum campo está com um valor inválido.',
  P0002: 'Nenhuma conta encontrada com esse e-mail. A pessoa precisa criar a conta antes.',
  invalid_credentials: 'E-mail ou senha incorretos.',
};

type ValidationError = Error & { issues: { message: string }[] };

function isValidationError(error: unknown): error is ValidationError {
  if (!(error instanceof Error) || error.name !== 'ZodError') return false;
  const issues: unknown = (error as Partial<ValidationError>).issues;
  return Array.isArray(issues) && issues.length > 0;
}

export function toUserMessage(error: unknown): string {
  // Validações do app já têm mensagem em português escrita para o usuário
  // (checagem pelo nome para não carregar a biblioteca zod em todas as telas)
  if (isValidationError(error)) return error.issues[0]!.message;
  if (error instanceof ServiceError && error.code && messagesByCode[error.code]) {
    return messagesByCode[error.code]!;
  }
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  }
  return 'Algo deu errado. Tente de novo.';
}
