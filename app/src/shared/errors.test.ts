import { z } from 'zod';
import { ServiceError, throwIfError, toUserMessage } from './errors.ts';

describe('throwIfError', () => {
  it('não faz nada quando não há erro', () => {
    expect(() => throwIfError(null)).not.toThrow();
  });

  it('lança ServiceError com a mensagem e o código do Supabase', () => {
    expect(() => throwIfError({ message: 'violação', code: '42501' })).toThrow(
      expect.objectContaining({ name: 'ServiceError', code: '42501' }),
    );
  });
});

describe('toUserMessage', () => {
  it('traduz falta de permissão', () => {
    expect(toUserMessage(new ServiceError('rls', '42501'))).toBe(
      'Você não tem permissão para fazer isso.',
    );
  });

  it('traduz cadastro duplicado', () => {
    expect(toUserMessage(new ServiceError('duplicate key', '23505'))).toBe(
      'Já existe um cadastro com esses dados.',
    );
  });

  it('traduz falha de rede', () => {
    expect(toUserMessage(new TypeError('Failed to fetch'))).toBe(
      'Sem conexão com o servidor. Verifique a internet e tente de novo.',
    );
  });

  it('mostra a mensagem da validação do formulário', () => {
    const result = z.string().min(3, 'Nome muito curto.').safeParse('a');

    expect(toUserMessage(result.error)).toBe('Nome muito curto.');
  });

  it('nunca expõe o erro técnico desconhecido', () => {
    const message = toUserMessage(new ServiceError('relation "x" does not exist', 'XX000'));

    expect(message).toBe('Algo deu errado. Tente de novo.');
    expect(message).not.toContain('relation');
  });
});
