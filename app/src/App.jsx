import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import EscolherVan from './EscolherVan'
import Painel from './Painel'

export default function App() {
  const [sessao, setSessao] = useState(undefined) // undefined = ainda carregando
  const [van, setVan] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s)
      if (!s) setVan(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <p className="centro">Carregando…</p>
  if (!sessao) return <Login />
  if (!van) return <EscolherVan aoEscolher={setVan} />
  return <Painel van={van} aoTrocarVan={() => setVan(null)} />
}
