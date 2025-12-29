# Feature Specification: Saldo estimado de hoje

**Feature Branch**: `001-estimate-today-balance`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: User description: "Hoje o Dashboard usa o saldo informado na última atualização como base e não aplica movimentações (fixas e single-shot) que aconteceram desde então. Precisamos exibir o saldo esperado para hoje (base + receitas - despesas no intervalo), respeitando cenários (otimista/pessimista), sinalizar claramente quando for uma estimativa e oferecer caminho fácil para Atualizar Saldos. Snapshots históricos seguem congelados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver saldo esperado de hoje (Priority: P1)

Como pessoa usuária, ao abrir o Dashboard dias depois de ter atualizado meus saldos, eu quero ver um **saldo esperado para hoje** que considere receitas e despesas que já aconteceram desde a última atualização, para evitar uma falsa sensação de segurança e enxergar dias de perigo com mais precisão.

**Why this priority**: Corrige um erro de compreensão crítica: o valor exibido pode mascarar risco real do período atual.

**Independent Test**: Pode ser testado criando um conjunto mínimo com “última atualização” e algumas receitas/despesas no intervalo até hoje e verificando o valor exibido e a marcação de “estimado”.

**Acceptance Scenarios**:

1. **Given** que o usuário atualizou saldos no dia 10 com saldo total = 100, **When** existem despesas (fixas + single-shot) no dia 12 totalizando 50 e receitas (fixas + single-shot) no dia 17 totalizando 20 e o usuário abre o app no dia 20, **Then** o Dashboard exibe saldo esperado de hoje = 70 (100 - 50 + 20).
2. **Given** que existe ao menos uma receita “provável/incerta” no intervalo desde a última atualização, **When** o usuário visualiza o saldo esperado de hoje, **Then** o saldo de hoje pode divergir entre os cenários (otimista vs pessimista) e a experiência do Dashboard mantém a coerência com o cenário selecionado.
3. **Given** que o saldo exibido foi ajustado por movimentações desde a última atualização, **When** o Dashboard mostra o valor, **Then** o valor é marcado de forma inequívoca como **estimado** e informa a base (“Baseado na última atualização em DD/MM”) com um caminho direto para **Atualizar Saldos**.

---

### User Story 2 - Não mostrar “estimado” quando não houve mudanças (Priority: P2)

Como pessoa usuária, quando não houve nenhuma movimentação relevante desde a última atualização, eu quero continuar vendo o mesmo saldo atualizado sem ruído visual, para não perder confiança no app com avisos desnecessários.

**Why this priority**: Evita alertas falsos e reduz fadiga visual; mantém o app “quieto” quando está tudo coerente.

**Independent Test**: Pode ser testado com “última atualização” recente e nenhum evento no intervalo até hoje.

**Acceptance Scenarios**:

1. **Given** que existe uma última atualização de saldos e não há receitas/despesas/obrigações no intervalo até hoje, **When** o usuário abre o Dashboard, **Then** o saldo exibido é igual ao último saldo atualizado e não há marcação destacada de “estimado”.

---

### User Story 3 - Atualizar saldos e editar eventos ajusta o valor automaticamente (Priority: P3)

Como pessoa usuária, se o saldo exibido estiver estimado, eu quero resolver isso rapidamente atualizando os saldos; e eu quero que mudanças retroativas (adição/edição) de receitas/despesas passadas recalcularem o saldo esperado sem esforço.

**Why this priority**: Fecha o ciclo de confiança: o usuário vê a estimativa e tem um “conserto” claro e imediato.

**Independent Test**: Pode ser testado (a) forçando um saldo estimado e completando o fluxo de Atualizar Saldos e (b) adicionando/alterando um evento no intervalo e verificando novo valor ao retornar ao Dashboard.

**Acceptance Scenarios**:

1. **Given** que o Dashboard está exibindo saldo marcado como estimado, **When** o usuário conclui **Atualizar Saldos**, **Then** o saldo passa a refletir o valor informado na atualização e a marcação de estimativa deixa de ser exibida.
2. **Given** que o usuário adiciona/edita uma receita/despesa single-shot com data dentro do intervalo desde a última atualização, **When** ele retorna ao Dashboard, **Then** o saldo esperado de hoje é recalculado e exibido com base nos dados mais recentes.

---

### Edge Cases

- Usuário nunca atualizou saldos: o Dashboard deve orientar “comece atualizando os saldos” (sem inventar um saldo de hoje).
- Movimentações no mesmo dia da última atualização: como não há horário, definir uma regra consistente de inclusão/exclusão (ver requisitos).
- Múltiplas contas checking com datas de atualização diferentes: transparência sobre a base e cálculo “best effort” por conta (ver requisitos).
- Eventos futuros não afetam o saldo de hoje; apenas a projeção futura.
- Intervalos longos desde a última atualização: cálculo deve continuar correto e a UI deve manter clareza do que é estimado.
- Saldo esperado negativo: continua funcionando e reflete risco/dias de perigo.
- Pagamentos/obrigações de cartão com vencimento no intervalo: devem impactar o saldo de hoje quando aplicável (consistente com a projeção).
- Snapshots históricos: continuam exibindo dados congelados e marcados como históricos; não recalculam “saldo de hoje”.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST calcular um **saldo esperado para hoje** a partir do **último saldo atualizado** (base) aplicando todas as movimentações com data no intervalo desde a base até hoje.
- **FR-002**: O saldo esperado para hoje MUST considerar **receitas** no intervalo como acréscimos e **despesas/obrigações** no intervalo como decréscimos, usando as mesmas definições de “receita” e “despesa” já existentes no app (incluindo fixas/recorrentes e single-shot).
- **FR-003**: O cálculo MUST respeitar os cenários existentes:
  - **Otimista**: inclui receitas garantidas + prováveis + incertas.
  - **Pessimista**: inclui apenas receitas garantidas.
  - Despesas/obrigações entram em ambos.
- **FR-004**: O Dashboard MUST garantir coerência entre o **saldo exibido** e a **projeção** (gráfico + resumo): a projeção do período deve “começar” a partir do saldo esperado de hoje (ou explicitar a diferença em relação ao saldo base), evitando o comportamento de “ficar parado” no saldo antigo.
- **FR-005**: Quando o valor exibido for uma **estimativa**, a UI MUST sinalizar claramente (pt-BR) que é estimado (ex.: “Estimado” / “Saldo estimado”) e MUST explicar a base (ex.: “Baseado na última atualização em DD/MM”).
- **FR-006**: Quando o valor exibido for estimado, a UI MUST oferecer um caminho simples para corrigir (ex.: clique no indicador leva ao fluxo **Atualizar Saldos**).
- **FR-007**: Se não houver movimentações relevantes no intervalo (para o cenário em uso), o Dashboard MUST exibir o mesmo valor do último saldo atualizado e MUST evitar marcação destacada de “estimado”.
- **FR-008**: Após o usuário concluir **Atualizar Saldos**, o Dashboard MUST refletir o saldo informado nessa atualização e MUST remover a sinalização de estimativa (quando aplicável).
- **FR-009**: Se o usuário nunca atualizou saldos, o Dashboard MUST exibir um estado claro (pt-BR) indicando que não há base para cálculo e MUST oferecer acesso a **Atualizar Saldos**.
- **FR-010**: Snapshots históricos MUST permanecer congelados: não recalcular saldo de hoje, não aplicar estimativas e continuar claramente marcados como históricos.
- **FR-011**: Regra de datas MUST ser explícita e consistente: o intervalo de “desde a última atualização” considera datas **posteriores** à data da atualização (início exclusivo) e inclui **hoje** (fim inclusivo).
- **FR-012**: Se o saldo total do Dashboard for composto por múltiplas contas checking com datas de atualização diferentes, o sistema MUST (a) calcular o saldo esperado de hoje considerando a última atualização de cada conta e (b) exibir claramente as bases usadas (uma data única quando todas as contas têm a mesma data de atualização; caso contrário, um intervalo “entre DD/MM e DD/MM”).

### Assumptions

- A experiência de “saldo de hoje” segue o mesmo modelo de cenários do restante do Dashboard: o valor exibido é consistente com o cenário selecionado (e pode divergir entre cenários quando houver receitas prováveis/incertas no intervalo).
- “Pagamentos/obrigações de cartão” são tratados como decréscimos no saldo no dia em que afetam o caixa, quando esse comportamento já existe na projeção.

### Dependencies

- O cálculo usa apenas entidades/dados já existentes no app (contas checking, receitas, despesas e obrigações de cartão) e a última atualização de saldos informada pelo usuário.
- Não depende de sincronização bancária ou importação automática de extrato.

### Out of Scope

- Sincronização com banco / importação automática de extrato.
- Modelos “inteligentes”/ML; a estimativa é puramente baseada em definições existentes do usuário.
- Rastreamento transacional real além do que já existe (ex.: categorização por transação).
- Alterar o comportamento de snapshots históricos (continuam congelados).

### Key Entities *(include if feature involves data)*

- **Atualização de saldos**: Momento em que o usuário informa saldos e estabelece uma base (“última atualização”).
- **Conta (checking)**: Conta(s) que compõem o saldo exibido no Dashboard.
- **Receita recorrente (projeto)**: Receita esperada com recorrência e nível de certeza (garantida/provável/incerta).
- **Receita single-shot**: Receita pontual com data específica.
- **Despesa fixa**: Despesa recorrente com data/regra definida.
- **Despesa single-shot**: Despesa pontual com data específica.
- **Cartão e obrigações**: Compromissos que impactam o caixa em datas específicas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No cenário de exemplo (base 100 em 10/.., despesas 50 em 12/.., receitas 20 em 17/.., abrir em 20/..), o Dashboard exibe saldo esperado de hoje = 70.
- **SC-002**: Sempre que o valor exibido for uma estimativa, o Dashboard exibe uma marcação visível “Saldo estimado” (pt-BR) e informa a base (“Baseado na última atualização em DD/MM”).
- **SC-003**: Quando não há movimentações relevantes no intervalo desde a última atualização até hoje, o Dashboard exibe o mesmo valor do último saldo atualizado e não exibe marcação destacada de “estimado”.
- **SC-004**: Ao visualizar um snapshot histórico, editar receitas/despesas atuais não altera o snapshot e nenhuma marcação de “estimado” é exibida no contexto histórico.
