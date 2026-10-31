// Modelo dos segredos do leitor.
// Copie este arquivo para "secrets.h" (mesma pasta) e troque pelos valores reais.
// O secrets.h está no .gitignore e nunca deve ser commitado.
#pragma once

constexpr const char* WIFI_SSID = "NOME_DA_REDE";      // rede 2,4 GHz
constexpr const char* WIFI_PASSWORD = "SENHA_DA_REDE";
constexpr const char* FUNCTION_URL = "https://SEU_PROJETO.supabase.co/functions/v1/register-boarding";
// Token do leitor: aparece uma única vez no app, ao cadastrar o leitor ou trocar o token
constexpr const char* DEVICE_TOKEN = "TOKEN_DO_LEITOR";
