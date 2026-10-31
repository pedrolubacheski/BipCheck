// Testes de integração: services do app + Supabase local de verdade (só na CI, precisa de Docker).
// Variáveis: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.integration.test.{ts,tsx}'],
      // os testes de um arquivo compartilham o cliente logado: rodar em sequência
      fileParallelism: false,
      testTimeout: 20_000,
    },
  }),
);
