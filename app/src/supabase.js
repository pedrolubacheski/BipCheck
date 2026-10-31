import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !chave) {
  throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no app/.env.local')
}

// Só a chave pública fica no navegador: quem protege os dados é a RLS do banco.
export const supabase = createClient(url, chave)
