// Cliente único do Supabase. Só os services das features importam este arquivo.
// Usa apenas a chave pública: quem protege os dados é a RLS no banco.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em app/.env.local');
}

export const supabase = createClient<Database>(url, anonKey);
