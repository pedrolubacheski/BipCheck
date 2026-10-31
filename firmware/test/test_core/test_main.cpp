// Testes da lógica pura do firmware, rodando no PC (pio test -e native), sem ESP32
#include <unity.h>

#include <string>

#include "beep_sequencer.h"
#include "card_debouncer.h"
#include "feedback.h"
#include "payload.h"
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

// ---------- Feedback ----------

void test_http_200_e_sucesso() {
  TEST_ASSERT_TRUE(feedbackForHttpStatus(200) == Feedback::Success);
}

void test_qualquer_outro_codigo_ou_falha_de_rede_e_erro() {
  const int statuses[] = {400, 401, 404, 409, 429, 500, -1};
  for (int status : statuses) {
    TEST_ASSERT_TRUE(feedbackForHttpStatus(status) == Feedback::Error);
  }
}

void test_sucesso_e_um_bip_longo_e_erro_sao_tres_curtos() {
  TEST_ASSERT_EQUAL_UINT8(1, beepFor(Feedback::Success).count);
  TEST_ASSERT_EQUAL_UINT16(250, beepFor(Feedback::Success).onMs);
  TEST_ASSERT_EQUAL_UINT8(3, beepFor(Feedback::Error).count);
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
  RUN_TEST(test_http_200_e_sucesso);
  RUN_TEST(test_qualquer_outro_codigo_ou_falha_de_rede_e_erro);
  RUN_TEST(test_sucesso_e_um_bip_longo_e_erro_sao_tres_curtos);
  RUN_TEST(test_aceita_a_primeira_leitura);
  RUN_TEST(test_ignora_o_mesmo_cartao_dentro_da_janela);
  RUN_TEST(test_aceita_o_mesmo_cartao_depois_da_janela);
  RUN_TEST(test_aceita_outro_cartao_na_hora);
  RUN_TEST(test_continua_certo_quando_o_relogio_da_volta);
  RUN_TEST(test_tres_bips_alternam_ligado_e_desligado_e_terminam);
  RUN_TEST(test_padrao_novo_substitui_o_que_estava_tocando);
  return UNITY_END();
}
