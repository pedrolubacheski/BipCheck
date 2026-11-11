// Testes da lógica pura do firmware, rodando no PC (pio test -e native), sem ESP32
#include <unity.h>

#include <string>

#include "beep_sequencer.h"
#include "card_debouncer.h"
#include "feedback.h"
#include "offline_queue.h"
#include "payload.h"
#include "timestamp.h"
#include "uid.h"

using namespace bipcheck;

void setUp() {}
void tearDown() {}

// ---------- UID ----------

void test_formata_uid_em_hexadecimal_maiusculo_com_dois_digitos_por_byte() {
  const uint8_t bytes[] = {0x0A, 0xB2, 0x00, 0xFF};
  TEST_ASSERT_EQUAL_STRING("0AB200FF", formatUid(bytes, sizeof(bytes)).c_str());
}

void test_formata_uid_de_7_bytes() {
  const uint8_t bytes[] = {0x04, 0x1A, 0x2B, 0x3C, 0x4D, 0x5E, 0x6F};
  TEST_ASSERT_EQUAL_STRING("041A2B3C4D5E6F", formatUid(bytes, sizeof(bytes)).c_str());
}

// ---------- Payload ----------

void test_monta_o_json_esperado_pela_funcao() {
  TEST_ASSERT_EQUAL_STRING("{\"device_token\":\"abc123\",\"uid\":\"A1B2C3D4\"}",
                           buildBoardingPayload("abc123", "A1B2C3D4").c_str());
}

void test_leitura_reenviada_leva_o_horario_em_que_o_cartao_foi_lido() {
  TEST_ASSERT_EQUAL_STRING(
      "{\"device_token\":\"abc123\",\"uid\":\"A1B2C3D4\",\"read_at\":\"2026-11-11T00:07:57Z\"}",
      buildBoardingPayload("abc123", "A1B2C3D4", 1794355677).c_str());
}

void test_leitura_feita_com_o_relogio_sem_ajuste_vai_sem_horario() {
  // 5 = cinco segundos depois de 1970: o ESP32 ligou e ainda não ajustou o relógio
  TEST_ASSERT_EQUAL_STRING("{\"device_token\":\"abc123\",\"uid\":\"A1B2C3D4\"}",
                           buildBoardingPayload("abc123", "A1B2C3D4", 5).c_str());
}

// ---------- Horário ----------

void test_formata_o_horario_em_iso_8601_utc() {
  TEST_ASSERT_EQUAL_STRING("2026-11-11T00:07:57Z", formatIsoUtc(1794355677).c_str());
}

void test_formata_o_dia_29_de_fevereiro_de_ano_bissexto() {
  TEST_ASSERT_EQUAL_STRING("2028-02-29T23:59:59Z", formatIsoUtc(1835481599).c_str());
}

void test_relogio_antes_de_2026_conta_como_nao_ajustado() {
  TEST_ASSERT_FALSE(isClockSet(0));
  TEST_ASSERT_FALSE(isClockSet(1767225599));
  TEST_ASSERT_TRUE(isClockSet(1767225600));
}

// ---------- Resultado do envio ----------

void test_http_200_e_entregue() {
  TEST_ASSERT_TRUE(classifySend(200) == SendOutcome::Delivered);
}

void test_sem_rede_servidor_fora_ou_limite_de_requisicoes_pede_nova_tentativa() {
  const int statuses[] = {-1, -11, 429, 500, 502, 503};
  for (int status : statuses) {
    TEST_ASSERT_TRUE(classifySend(status) == SendOutcome::Retry);
  }
}

void test_recusa_do_servidor_e_definitiva() {
  const int statuses[] = {400, 401, 404, 409, 422};
  for (int status : statuses) {
    TEST_ASSERT_TRUE(classifySend(status) == SendOutcome::Rejected);
  }
}

void test_leitura_entregue_da_um_bip_longo() {
  const BeepPattern beep = beepFor(feedbackForRead(SendOutcome::Delivered, false));
  TEST_ASSERT_EQUAL_UINT8(1, beep.count);
  TEST_ASSERT_EQUAL_UINT16(250, beep.onMs);
}

void test_leitura_guardada_sem_rede_da_dois_bips_longos() {
  const BeepPattern beep = beepFor(feedbackForRead(SendOutcome::Retry, true));
  TEST_ASSERT_EQUAL_UINT8(2, beep.count);
  TEST_ASSERT_EQUAL_UINT16(400, beep.onMs);
}

void test_sem_rede_e_com_a_fila_cheia_da_tres_bips_de_erro() {
  TEST_ASSERT_EQUAL_UINT8(3, beepFor(feedbackForRead(SendOutcome::Retry, false)).count);
}

void test_leitura_recusada_da_tres_bips_de_erro() {
  TEST_ASSERT_EQUAL_UINT8(3, beepFor(feedbackForRead(SendOutcome::Rejected, false)).count);
}

// ---------- Fila offline ----------

void test_fila_devolve_as_leituras_na_ordem_em_que_chegaram() {
  OfflineQueue queue(3);
  queue.push("A1B2C3D4", 1794355677);
  queue.push("FFFFFFFF", 1794355700);

  TEST_ASSERT_EQUAL_STRING("A1B2C3D4", queue.front().uid.c_str());
  TEST_ASSERT_EQUAL_UINT32(1794355677, queue.front().readAtEpoch);
  queue.pop();
  TEST_ASSERT_EQUAL_STRING("FFFFFFFF", queue.front().uid.c_str());
  queue.pop();
  TEST_ASSERT_TRUE(queue.empty());
}

void test_fila_cheia_recusa_a_leitura_nova_e_mantem_as_antigas() {
  OfflineQueue queue(2);
  queue.push("A1B2C3D4", 1);
  queue.push("FFFFFFFF", 2);

  TEST_ASSERT_FALSE(queue.push("0A0B0C0D", 3));
  TEST_ASSERT_EQUAL_UINT32(2, queue.size());
  TEST_ASSERT_EQUAL_STRING("A1B2C3D4", queue.front().uid.c_str());
}

void test_fila_recusa_uid_que_nao_e_hexadecimal() {
  OfflineQueue queue(2);
  TEST_ASSERT_FALSE(queue.push("", 1));
  TEST_ASSERT_FALSE(queue.push("A1\"}", 1));
  TEST_ASSERT_FALSE(queue.push("0123456789ABCDEF01234", 1));  // 21 caracteres
  TEST_ASSERT_TRUE(queue.empty());
}

void test_fila_gravada_e_carregada_de_novo_mantem_as_leituras() {
  OfflineQueue saved(5);
  saved.push("A1B2C3D4", 1794355677);
  saved.push("041A2B3C4D5E6F", 0);
  const std::vector<uint8_t> bytes = saved.serialize();

  OfflineQueue loaded(5);
  TEST_ASSERT_TRUE(loaded.deserialize(bytes.data(), bytes.size()));

  TEST_ASSERT_EQUAL_UINT32(2, loaded.size());
  TEST_ASSERT_EQUAL_STRING("A1B2C3D4", loaded.front().uid.c_str());
  TEST_ASSERT_EQUAL_UINT32(1794355677, loaded.front().readAtEpoch);
  loaded.pop();
  TEST_ASSERT_EQUAL_STRING("041A2B3C4D5E6F", loaded.front().uid.c_str());
  TEST_ASSERT_EQUAL_UINT32(0, loaded.front().readAtEpoch);
}

void test_dado_corrompido_na_flash_deixa_a_fila_vazia() {
  OfflineQueue source(5);
  source.push("A1B2C3D4", 1794355677);
  std::vector<uint8_t> bytes = source.serialize();
  bytes.pop_back();  // gravação interrompida no meio

  OfflineQueue queue(5);
  queue.push("FFFFFFFF", 1);

  TEST_ASSERT_FALSE(queue.deserialize(bytes.data(), bytes.size()));
  TEST_ASSERT_TRUE(queue.empty());
}

void test_nao_carrega_mais_leituras_do_que_a_capacidade() {
  OfflineQueue big(5);
  big.push("A1B2C3D4", 1);
  big.push("FFFFFFFF", 2);
  const std::vector<uint8_t> bytes = big.serialize();

  OfflineQueue small(1);
  TEST_ASSERT_FALSE(small.deserialize(bytes.data(), bytes.size()));
  TEST_ASSERT_TRUE(small.empty());
}

// ---------- Debounce ----------

void test_aceita_a_primeira_leitura() {
  CardDebouncer debouncer(3000);
  TEST_ASSERT_TRUE(debouncer.accept("A1B2C3D4", 1000));
}

void test_ignora_o_mesmo_cartao_dentro_da_janela() {
  CardDebouncer debouncer(3000);
  debouncer.accept("A1B2C3D4", 1000);
  TEST_ASSERT_FALSE(debouncer.accept("A1B2C3D4", 3999));
}

void test_aceita_o_mesmo_cartao_depois_da_janela() {
  CardDebouncer debouncer(3000);
  debouncer.accept("A1B2C3D4", 1000);
  TEST_ASSERT_TRUE(debouncer.accept("A1B2C3D4", 4000));
}

void test_aceita_outro_cartao_na_hora() {
  CardDebouncer debouncer(3000);
  debouncer.accept("A1B2C3D4", 1000);
  TEST_ASSERT_TRUE(debouncer.accept("FFFFFFFF", 1001));
}

void test_continua_certo_quando_o_relogio_da_volta() {
  CardDebouncer debouncer(3000);
  debouncer.accept("A1B2C3D4", 0xFFFFFF00u);
  TEST_ASSERT_FALSE(debouncer.accept("A1B2C3D4", 100));  // passaram 356 ms
}

// ---------- Sequência de bips ----------

void test_tres_bips_alternam_ligado_e_desligado_e_terminam() {
  BeepSequencer beeper;
  beeper.start(BeepPattern{3, 100, 80}, 0);

  TEST_ASSERT_TRUE(beeper.isOn(0));
  TEST_ASSERT_TRUE(beeper.isOn(99));
  TEST_ASSERT_FALSE(beeper.isOn(100));
  TEST_ASSERT_TRUE(beeper.isOn(180));
  TEST_ASSERT_TRUE(beeper.isOn(360));
  TEST_ASSERT_FALSE(beeper.isOn(460));
  TEST_ASSERT_FALSE(beeper.isPlaying());
}

void test_padrao_novo_substitui_o_que_estava_tocando() {
  BeepSequencer beeper;
  beeper.start(BeepPattern{3, 100, 80}, 0);
  beeper.start(BeepPattern{1, 250, 0}, 120);

  TEST_ASSERT_TRUE(beeper.isOn(300));
  TEST_ASSERT_FALSE(beeper.isOn(370));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_formata_uid_em_hexadecimal_maiusculo_com_dois_digitos_por_byte);
  RUN_TEST(test_formata_uid_de_7_bytes);
  RUN_TEST(test_monta_o_json_esperado_pela_funcao);
  RUN_TEST(test_leitura_reenviada_leva_o_horario_em_que_o_cartao_foi_lido);
  RUN_TEST(test_leitura_feita_com_o_relogio_sem_ajuste_vai_sem_horario);
  RUN_TEST(test_formata_o_horario_em_iso_8601_utc);
  RUN_TEST(test_formata_o_dia_29_de_fevereiro_de_ano_bissexto);
  RUN_TEST(test_relogio_antes_de_2026_conta_como_nao_ajustado);
  RUN_TEST(test_http_200_e_entregue);
  RUN_TEST(test_sem_rede_servidor_fora_ou_limite_de_requisicoes_pede_nova_tentativa);
  RUN_TEST(test_recusa_do_servidor_e_definitiva);
  RUN_TEST(test_leitura_entregue_da_um_bip_longo);
  RUN_TEST(test_leitura_guardada_sem_rede_da_dois_bips_longos);
  RUN_TEST(test_sem_rede_e_com_a_fila_cheia_da_tres_bips_de_erro);
  RUN_TEST(test_leitura_recusada_da_tres_bips_de_erro);
  RUN_TEST(test_fila_devolve_as_leituras_na_ordem_em_que_chegaram);
  RUN_TEST(test_fila_cheia_recusa_a_leitura_nova_e_mantem_as_antigas);
  RUN_TEST(test_fila_recusa_uid_que_nao_e_hexadecimal);
  RUN_TEST(test_fila_gravada_e_carregada_de_novo_mantem_as_leituras);
  RUN_TEST(test_dado_corrompido_na_flash_deixa_a_fila_vazia);
  RUN_TEST(test_nao_carrega_mais_leituras_do_que_a_capacidade);
  RUN_TEST(test_aceita_a_primeira_leitura);
  RUN_TEST(test_ignora_o_mesmo_cartao_dentro_da_janela);
  RUN_TEST(test_aceita_o_mesmo_cartao_depois_da_janela);
  RUN_TEST(test_aceita_outro_cartao_na_hora);
  RUN_TEST(test_continua_certo_quando_o_relogio_da_volta);
  RUN_TEST(test_tres_bips_alternam_ligado_e_desligado_e_terminam);
  RUN_TEST(test_padrao_novo_substitui_o_que_estava_tocando);
  return UNITY_END();
}
