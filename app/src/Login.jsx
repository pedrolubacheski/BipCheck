import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setEntrando(false)
  }

  return (
    <main className="tela-login">
      <form className="cartao" onSubmit={entrar}>
        <h1 className="marca">BipCheck</h1>
        <p className="sub">Embarques da van em tempo real</p>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
