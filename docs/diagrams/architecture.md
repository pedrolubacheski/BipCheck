# Diagramas do BipCheck

Diagramas em [Mermaid](https://mermaid.js.org/): o GitHub mostra o desenho direto nesta página.

## Visão geral

```mermaid
flowchart LR
    card([Cartão RFID]) --> esp[ESP32 + RC522<br/>firmware]
    esp -- "HTTPS POST<br/>{device_token, uid}" --> fn[Edge Function<br/>register-boarding]
    fn -- "RPC register_boarding<br/>(service_role)" --> db[(Postgres<br/>Supabase)]
    db -- Realtime --> app[PWA<br/>motorista e dono]
    app -- "consultas e cadastros<br/>(chave pública + RLS)" --> db
```

## Um embarque, passo a passo

```mermaid
sequenceDiagram
    actor Aluno
    participant ESP as ESP32
    participant Fn as Edge Function
    participant DB as Banco (register_boarding)
    participant App as App do motorista

    Aluno->>ESP: encosta o cartão
    ESP-->>Aluno: bip curtinho (cartão lido)
    ESP->>Fn: POST {device_token, uid}
    Fn->>Fn: valida o corpo (Zod) e o limite por IP
    Fn->>DB: register_boarding(token, uid)
    DB->>DB: confere hash do token, limite do leitor, cartão e repetição
    DB-->>Fn: {status: registered}
    Fn-->>ESP: 200
    ESP-->>Aluno: bip longo (registrado)
    DB-->>App: Realtime: novo embarque da van
    App-->>App: mostra o aluno e toca o bip
```

## Um embarque sem rede (regra local do leitor)

```mermaid
sequenceDiagram
    actor Aluno
    participant ESP as ESP32
    participant Fn as Edge Function
    participant DB as Banco (register_boarding)

    Aluno->>ESP: encosta o cartão
    ESP-->>Aluno: bip curtinho (cartão lido)
    ESP->>ESP: sem Wi-Fi ou sem resposta: guarda UID + horário na flash
    ESP-->>Aluno: 2 bips longos (guardado)
    Note over ESP: a rede volta
    ESP->>Fn: POST {device_token, uid, read_at}
    Fn->>DB: register_boarding(token, uid, read_at)
    DB-->>Fn: {status: registered}
    Fn-->>ESP: 200
    ESP->>ESP: tira a leitura da fila
```

## Modelo de dados

```mermaid
erDiagram
    companies ||--o{ company_members : tem
    companies ||--o{ vans : tem
    companies ||--o{ students : tem
    companies ||--o{ devices : tem
    vans ||--o{ van_drivers : "tem motoristas"
    company_members ||--o{ van_drivers : dirige
    vans |o--o{ devices : "leitor instalado"
    students ||--o{ cards : tem
    vans ||--o{ boardings : registra
    students ||--o{ boardings : embarca

    companies {
        uuid id
        text name
    }
    company_members {
        uuid user_id
        text email
        member_role role "owner | driver"
    }
    vans {
        uuid id
        text name
    }
    devices {
        uuid id
        text name
        text token_hash "só o hash"
        timestamptz last_seen_at
    }
    students {
        uuid id
        text name
        text city
    }
    cards {
        uuid id
        text uid "hex maiúsculo"
        boolean active
    }
    boardings {
        bigint id
        timestamptz boarded_at "apagado após 3 meses"
    }
```

A tabela `audit_logs` fica fora do diagrama. Ela registra quem fez o quê, em qual registro, e é apagada após 30 dias.

## Firmware

```mermaid
flowchart TB
    subgraph core1 [Núcleo 1: loop]
        read[Lê cartão RC522] --> debounce{Mesmo cartão<br/>há menos de 3 s?}
        debounce -- não --> queue[(Fila de UIDs)]
        debounce -- sim --> ignore[ignora]
        results[(Fila de resultados)] --> buzzer[Toca o bip<br/>sem travar]
    end
    subgraph core0 [Núcleo 0: tarefa de rede]
        queue --> online{Tem Wi-Fi e o<br/>servidor respondeu?}
        online -- sim --> post[POST HTTPS<br/>certificado validado] --> results
        online -- não --> offline[(Fila offline<br/>na flash, até 50)] --> results
        offline -. rede voltou:<br/>reenvia com read_at .-> post
    end
```
