import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function EscolherVan({ aoEscolher }) {
  const [vans, setVans] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('vans')
      .select('id, nome')
      .order('nome')
      .then(({ data, error }) => {
        if (error) return setErro('Não foi possível carregar as vans.')
        // Com uma van só, vai direto para o painel
        if (data.length === 1) aoEscolher(data[0])
        else setVans(data)
      })
  }, [aoEscolher])

  if (erro) return <p className="centro erro">{erro}</p>
  if (!vans) return <p className="centro">Carregando vans…</p>

  return (
    <main className="tela-login">
      <div className="cartao">
        <h1 className="marca">Escolha a van</h1>
        {vans.length === 0 && <p className="sub">Nenhuma van cadastrada para este usuário.</p>}
        {vans.map((v) => (
          <button key={v.id} onClick={() => aoEscolher(v)}>{v.nome}</button>
        ))}
        <button className="secundario" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </main>
  )
}
