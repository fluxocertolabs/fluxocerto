# Feature Specification: Today's estimated balance

- **Feature Branch**: `026-estimate-today-balance`
- **Created**: 2025-12-29
- **Status**: Draft
- **Input**: User description: "Today the Dashboard uses the balance from the last update as the base and does not apply movements (recurring and single-shot) that happened since then. We need to show today's estimated balance (base + incomes - expenses over the interval), respecting scenarios (Optimistic/“Otimista” and Pessimistic/“Pessimista”), clearly signal when it is an estimate, and provide an easy path to “Atualizar Saldos”. Historical snapshots remain frozen."

## Clarifications

### Session 2025-12-29

- Q: Which timezone defines “today” (and all date comparisons) for computing today's estimated balance? → A: Household/app timezone (`America/Sao_Paulo`).
- Q: When the displayed balance is estimated, how should the projection chart + summary align with the new “today's estimated balance”? → A: Rebase: the projection starts from today's estimated balance (and then applies future movements starting tomorrow).
- Q: When should we show the “Estimado” label: whenever there is at least 1 included movement in the interval (even if the net is 0), or only when the final value changes? → A: Show “Estimado” **for the active scenario** if there is ≥1 **included** movement since the last update (even if net = 0).
- Q: For the “last balance update” base, should we keep treating it as a date (no time) and apply the already-defined rule (start exclusive)? → A: Yes: base is date-only; events on the same date are excluded (start exclusive).
- Q: If there are movements in the interval but they are excluded by the scenario rules (e.g., only “provável”/“incerta” incomes), should we still mark the value as “Estimado” in Pessimista? → A: No. The estimate marker is scenario-specific: it appears only when the **active scenario** includes ≥1 movement.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See today's estimated balance (Priority: P1)

As a user, when I open the Dashboard days after I last updated my balances, I want to see **today's estimated balance** that accounts for income and expenses that already happened since the last update, so I don't get a false sense of safety and I can see risky days more accurately.

**Why this priority**: Fixes a critical misunderstanding: the value shown can hide real risk in the current period.

**Independent Test**: Can be tested by creating a minimal dataset with a “last update” date and a few incomes/expenses in the interval until today, then verifying the displayed value and the “estimated” marker.

**Acceptance Scenarios**:

1. **Given** the user updated balances on day 10 with total balance = 100, **When** there are expenses (recurring + single-shot) on day 12 totaling 50 and incomes (recurring + single-shot) on day 17 totaling 20 and the user opens the app on day 20, **Then** the Dashboard shows today's estimated balance = 70 (100 - 50 + 20).
2. **Given** there is at least one income marked as “provável”/“incerta” (probable/uncertain) in the interval since the last update, **When** the user views today's estimated balance, **Then** today's value may differ between scenarios (Optimistic/“Otimista” vs Pessimistic/“Pessimista”) and the Dashboard experience stays coherent with the selected scenario.
3. **Given** the displayed balance was adjusted by movements since the last update, **When** the Dashboard shows the value, **Then** it is unmistakably marked as **estimated** (e.g. “Estimado” / “Saldo estimado”), shows the base (e.g. “Baseado na última atualização em DD/MM”), and offers a direct path to **Atualizar Saldos**.

---

### User Story 2 - Don't show “estimated” when nothing changed (Priority: P2)

As a user, when there were no relevant movements since the last update, I want to keep seeing the same updated balance without visual noise, so I don't lose trust in the app due to unnecessary warnings.

**Why this priority**: Avoids false alerts and reduces visual fatigue; keeps the app “quiet” when everything is consistent.

**Independent Test**: Can be tested with a recent “last update” and no events in the interval until today.

**Acceptance Scenarios**:

1. **Given** there is a last balance update and there are no incomes/expenses/card obligations in the interval until today, **When** the user opens the Dashboard, **Then** the displayed balance equals the last updated balance and there is no highlighted “estimated” marker.

---

### User Story 3 - Updating balances and editing events updates the value automatically (Priority: P3)

As a user, if the displayed balance is estimated, I want to quickly resolve it by updating balances; and I want retroactive changes (adding/editing) to past incomes/expenses to recompute today's estimated balance without extra work.

**Why this priority**: Closes the trust loop: the user sees the estimate and has a clear, immediate “fix”.

**Independent Test**: Can be tested by (a) forcing an estimated balance and completing the “Atualizar Saldos” flow and (b) adding/editing an event in the interval and verifying the new value when returning to the Dashboard.

**Acceptance Scenarios**:

1. **Given** the Dashboard is showing a balance marked as estimated, **When** the user completes **Atualizar Saldos**, **Then** the balance reflects the value entered in that update and the estimate marker is no longer shown.
2. **Given** the user adds/edits a single-shot income/expense dated within the interval since the last update, **When** they return to the Dashboard, **Then** today's estimated balance is recomputed and displayed based on the latest data.

---

### Edge Cases

- User has never updated balances: the Dashboard should guide the user to update balances (e.g., show “Atualize seus saldos”), without inventing a balance for today.
- Movements on the same date as the last update: since the last update is **date-only** and the interval is start-exclusive, events on the same date are **excluded** from the computation.
- Multiple checking accounts with different update dates: transparency about the base (show a date range) and a deterministic “safe base” computation rule (see requirements).
- Future events do not affect today's balance; only the forward projection.
- Long intervals since the last update: computation must remain correct and the UI must stay clear about what is estimated.
- Negative estimated balance: still works and reflects risk/danger days.
- Card payments/obligations with due dates in the interval: should impact today's balance when applicable (consistent with the projection).
- Historical snapshots: remain frozen and marked as historical; do not recompute “today's balance”.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST compute **today's estimated balance** starting from the **last updated balance** (base), applying all movements dated in the interval from the base to today.
- **FR-002**: Today's estimated balance MUST treat **income** in the interval as additions and **expenses/obligations** in the interval as subtractions, using the same “income” and “expense” definitions already used in the app (including recurring and single-shot).
- **FR-003**: The computation MUST respect the existing scenarios:
  - **Optimistic ("Otimista")**: includes guaranteed + “provável” + “incerta” incomes.
  - **Pessimistic ("Pessimista")**: includes only guaranteed incomes.
  - Expenses/obligations are included in both.
- **FR-004**: The Dashboard MUST ensure coherence between the **displayed balance** and the **projection** (chart + summary): the projection period must **start** from **today's estimated balance** (rebase) and consider only movements **after today** (starting tomorrow), avoiding the old “stuck on the previous balance” behavior and avoiding **double counting** of events already applied to today's balance.
- **FR-005**: When the displayed value is an **estimate** (i.e., for the **active scenario**, there is ≥1 movement included by FR-002/FR-003 since the last update, even if the final value equals the base), the UI MUST clearly signal (pt-BR) that it is estimated (e.g. “Estimado” / “Saldo estimado”) and MUST explain the base (e.g. “Baseado na última atualização em DD/MM”).
- **FR-006**: When the displayed value is estimated, the UI MUST offer a simple path to fix it (e.g. clicking the indicator takes the user to **Atualizar Saldos**).
- **FR-007**: If there are no relevant movements in the interval (for the active scenario), the Dashboard MUST show the same value as the last updated balance and MUST avoid a highlighted “estimated” marker. Movements that exist but are excluded by the scenario (e.g., only “provável”/“incerta” incomes in Pessimista) MUST NOT trigger the estimate marker for that scenario.
- **FR-008**: After the user completes **Atualizar Saldos**, the Dashboard MUST reflect the balance entered in that update and MUST remove the estimate signal (when applicable).
- **FR-009**: If the Dashboard has **no reliable base** for computation (e.g., the user has never updated balances, or any checking account lacks a `balance_updated_at`), the Dashboard MUST show a clear state (pt-BR) indicating there is no base for computation, MUST offer access to **Atualizar Saldos**, and MUST NOT show an estimated value.
  - Suggested copy (pt-BR):
    - Title: “Atualize seus saldos”
    - Body: “Para calcular o saldo de hoje, atualize os saldos das suas contas.”
    - CTA: “Atualizar Saldos”
- **FR-010**: Historical snapshots MUST remain frozen: do not recompute today's balance, do not apply estimates, and remain clearly marked as historical.
- **FR-011**: Date rules MUST be explicit and consistent: the “last update” is treated as a **date (no time)**; the “since last update” interval considers dates **after** the update date (start exclusive) and includes **today** (end inclusive), using the `America/Sao_Paulo` timezone.
- **FR-012**: If the Dashboard total balance is composed of multiple checking accounts:
  - The system MUST derive the base date(s) from `balance_updated_at` for **all checking accounts** (date-only in `America/Sao_Paulo`).
  - The UI MUST clearly show the base used: a single date when all accounts share the same update date; otherwise a range “entre DD/MM e DD/MM”.
  - Because movements are not linked to specific checking accounts in the current data model, the computation MUST use the **earliest** checking-account base date as the **computation base** (to avoid missing movements), while still displaying the range for transparency.

### Non-Functional Requirements

- **NFR-001**: The estimate + rebased projection computation SHOULD complete in < 50ms for typical household datasets (≤100 entities; projection up to 90 days) without blocking UI rendering.
  - Measurement intent: time only the in-memory computation path (no network, no React render time) for a representative dataset.
  - Representative dataset definition (example, ≤100 entities): 10 accounts (≥3 checking), 25 fixed expenses, 10 single-shot expenses, 25 projects (incomes), 10 single-shot incomes (mix of guaranteed/probable/uncertain), 5 credit cards, 5 future statements; `projectionDays = 90`.
- **NFR-002**: The feature MUST NOT introduce additional network requests beyond the existing Supabase fetch/subscription pattern used to load finance data.
  - Clarification: do not add new Supabase table queries or realtime subscriptions for this feature beyond what the Dashboard already uses to load finance data.
- **NFR-003**: All new or modified logic MUST have automated test coverage: unit tests for pure computation and deterministic helpers, plus E2E and visual regression coverage for user-facing Dashboard behavior.
- **NFR-004**: New estimation/rebasing helpers MUST remain side-effect-free (no network calls, no store writes) and MUST NOT introduce circular dependencies in `src/lib/cashflow/*`.

### Assumptions

- The “today's balance” experience follows the same scenario model as the rest of the Dashboard: the displayed value stays consistent with the selected scenario (and may differ between scenarios when there are “provável”/“incerta” incomes in the interval).
- “Card payments/obligations” are treated as decrements on the day they impact cash, when that behavior already exists in the projection.

### Dependencies

- The computation uses only entities/data already present in the app (checking accounts, incomes, expenses, and card obligations) and the last balance update entered by the user.
- Does not depend on bank sync or automatic statement import.

### Out of Scope

- Bank synchronization / automatic statement import.
- “Smart”/ML models; the estimate is purely based on existing user-defined rules.
- Real transactional tracking beyond what already exists (e.g. per-transaction categorization).
- Changing historical snapshots behavior (they remain frozen).

### Key Entities *(include if feature involves data)*

- **Balance update ("Atualização de saldos")**: The moment the user enters balances and establishes a base (“last update”).
- **Checking account**: The account(s) that make up the balance shown on the Dashboard.
- **Recurring income (projection)**: Expected recurring income with a certainty level (guaranteed / “provável” / “incerta”).
- **Single-shot income**: One-off income with a specific date.
- **Fixed expense**: Recurring expense with a defined rule/date.
- **Single-shot expense**: One-off expense with a specific date.
- **Cards and obligations**: Commitments that impact cash on specific dates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the example scenario (base 100 on 10/.., expenses 50 on 12/.., income 20 on 17/.., open on 20/..), the Dashboard shows today's estimated balance = 70.
- **SC-002**: Whenever the displayed value is an estimate, the Dashboard shows a visible “Saldo estimado” (pt-BR) marker and explains the base (“Baseado na última atualização em DD/MM”).
- **SC-003**: When there are no relevant movements in the interval since the last update until today, the Dashboard shows the same value as the last updated balance and does not show a highlighted “estimated” marker.
- **SC-004**: When viewing a historical snapshot, editing current incomes/expenses does not change the snapshot and no “estimated” marker is shown in the historical context.

