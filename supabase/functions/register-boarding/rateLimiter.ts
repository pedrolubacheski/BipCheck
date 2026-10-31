// Limite de requisições por chave (IP) em janela fixa, em memória.
// É uma primeira barreira contra inundação: cada instância da função tem a sua memória.
// O limite por leitor (1 por segundo) é garantido no banco, em register_boarding.

export interface RateLimiter {
  allow(key: string): boolean;
}

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { startedAt: number; count: number }>();

  return {
    allow(key) {
      const current = now();

      // Limpa janelas vencidas para a memória não crescer sem limite
      if (windows.size > 10_000) {
        for (const [k, w] of windows) {
          if (current - w.startedAt >= options.windowMs) windows.delete(k);
        }
      }

      const window = windows.get(key);
      if (!window || current - window.startedAt >= options.windowMs) {
        windows.set(key, { startedAt: current, count: 1 });
        return true;
      }
      window.count += 1;
      return window.count <= options.limit;
    },
  };
}
