# BipCheck: painel do motorista (React)

Mostra em tempo real quem embarcou na van. Feito só para testes: roda no notebook e abre no celular pela rede Wi-Fi, sem hospedagem.

## Como rodar

1. Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova).
2. Dentro da pasta `app/`, copie `.env.example` para `.env.local` e preencha a URL do projeto e a chave **pública** (Supabase > Project Settings > API). Nunca coloque a `service_role` aqui.
3. Rode:

   ```
   cd app
   npm install
   npm run dev -- --host
   ```

4. No notebook, abra `http://localhost:5173`.
5. No celular (no mesmo Wi-Fi do notebook), abra o endereço que aparece em `Network`, por exemplo `http://192.168.0.10:5173`. No Windows, se o celular não abrir, permita o Node no firewall quando ele perguntar.

Entre com o e-mail e a senha do usuário dono da van (Supabase > Authentication > Users).

## O que tem na tela

- **Login** com o usuário do dono (Supabase Auth).
- **Escolha da van**: com uma van só, vai direto para o painel.
- **Painel**: contador de quem embarcou hoje, lista de alunos da van com o horário do embarque, histórico dos últimos toques e indicador "ao vivo" do Realtime. Quando um cartão é lido, o aluno fica em destaque e toca um bip (toque em "Ativar som do bip" uma vez, porque o navegador só libera som depois de um toque na tela).

O primeiro toque do dia conta como embarque; toques repetidos aparecem só no histórico.

## Arquivos

- `src/supabase.js`: cliente do Supabase (lê o `.env.local`).
- `src/App.jsx`: decide qual tela mostrar (login, escolher van ou painel).
- `src/Login.jsx`, `src/EscolherVan.jsx`, `src/Painel.jsx`: as telas.
- `src/som.js`: bip gerado pelo navegador.
