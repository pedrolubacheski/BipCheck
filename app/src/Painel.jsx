import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { ativarSom, bip, somAtivo } from './som'

const FUSO = 'America/Sao_Paulo'

// 00:00 de hoje no horário de Brasília (UTC-3), no formato que o banco entende
function inicioDeHoje() {
  const dia = new Date().toLocaleDateString('en-CA', { timeZone: FUSO }) // AAAA-MM-DD
  return `${dia}T00:00:00-03:00`
}

const hora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function Painel({ van, aoTrocarVan }) {
  const [alunos, setAlunos] = useState([]) // alunos com cartão nesta van
  const [embarques, setEmbarques] = useState([]) // toques de hoje, mais recente primeiro
  const [conexao, setConexao] = useState('conectando')
  const [destaque, setDestaque] = useState(null) // aluno que acabou de embarcar
  const [som, setSom] = useState(somAtivo())
  const [erro, setErro] = useState('')

  const carregarEmbarques = useCallback(async () => {
    const { data, error } = await supabase
      .from('embarques')
      .select('id, aluno_id, cartao_uid, embarcou_em')
      .eq('van_id', van.id)
      .gte('embarcou_em', inicioDeHoje())
      .order('embarcou_em', { ascending: false })
    if (error) setErro('Não foi possível carregar os embarques.')
    else setEmbarques(data)
  }, [van.id])

  // Alunos da van (vêm pelos cartões cadastrados nela)
  useEffect(() => {
    supabase
      .from('cartoes')
      .select('aluno_id, alunos(nome, cidade)')
      .eq('van_id', van.id)
      .then(({ data, error }) => {
        if (error) return setErro('Não foi possível carregar os alunos.')
        const porId = new Map()
        for (const c of data) porId.set(c.aluno_id, { id: c.aluno_id, ...c.alunos })
        setAlunos([...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome)))
      })
  }, [van.id])

  // Tempo real: cada INSERT em embarques desta van chega aqui (a RLS filtra pelo dono)
  useEffect(() => {
    let timer
    const canal = supabase
      .channel(`embarques-${van.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'embarques', filter: `van_id=eq.${van.id}` },
        ({ new: novo }) => {
          setEmbarques((atual) => (atual.some((e) => e.id === novo.id) ? atual : [novo, ...atual]))
          setDestaque(novo.aluno_id)
          clearTimeout(timer)
          timer = setTimeout(() => setDestaque(null), 4000)
          bip()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConexao('ao vivo')
          carregarEmbarques() // recarrega para não perder nada que chegou enquanto estava desconectado
        } else if (status !== 'CLOSED') {
          setConexao('desconectado')
        }
      })
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(canal)
    }
  }, [van.id, carregarEmbarques])

  // Toques repetidos: o primeiro toque do dia é o embarque, os outros ficam só no histórico
  const primeiroToque = useMemo(() => {
    const m = new Map()
    for (const e of embarques) m.set(e.aluno_id, e) // a lista vem do mais novo pro mais antigo
    return m
  }, [embarques])

  const nomeDe = (id) => alunos.find((a) => a.id === id)?.nome ?? 'Aluno'
  const embarcados = alunos.filter((a) => primeiroToque.has(a.id))
  const faltam = alunos.filter((a) => !primeiroToque.has(a.id))
  const ordenados = [
    ...embarcados.sort((a, b) => primeiroToque.get(b.id).embarcou_em.localeCompare(primeiroToque.get(a.id).embarcou_em)),
    ...faltam,
  ]

  return (
    <main className="painel">
      <header className="topo">
        <div>
          <h1 className="marca">BipCheck</h1>
          <button className="link" onClick={aoTrocarVan}>{van.nome} ▾</button>
        </div>
        <span className={`status ${conexao === 'ao vivo' ? 'on' : 'off'}`}>● {conexao}</span>
      </header>

      {erro && <p className="erro">{erro}</p>}

      <section className="contador">
        <strong>{embarcados.length}</strong>
        <span>de {alunos.length} alunos embarcaram hoje</span>
      </section>

      {!som && (
        <button
          className="secundario"
          onClick={() => {
            ativarSom()
            setSom(true)
          }}
        >
          🔔 Ativar som do bip
        </button>
      )}

      <ul className="alunos">
        {ordenados.map((a) => {
          const toque = primeiroToque.get(a.id)
          return (
            <li key={a.id} className={`${toque ? 'embarcou' : ''} ${destaque === a.id ? 'novo' : ''}`}>
              <div>
                <span className="nome">{a.nome}</span>
                {a.cidade && <span className="cidade">{a.cidade}</span>}
              </div>
              <span className="situacao">{toque ? `✓ ${hora(toque.embarcou_em)}` : 'ainda não'}</span>
            </li>
          )
        })}
      </ul>

      <section>
        <h2>Últimos toques</h2>
        {embarques.length === 0 && <p className="sub">Nenhum toque hoje.</p>}
        <ul className="historico">
          {embarques.slice(0, 15).map((e) => (
            <li key={e.id}>
              <span>{hora(e.embarcou_em)}</span>
              <span>{nomeDe(e.aluno_id)}</span>
              <code>{e.cartao_uid}</code>
            </li>
          ))}
        </ul>
      </section>

      <button className="secundario" onClick={() => supabase.auth.signOut()}>Sair</button>
    </main>
  )
}
