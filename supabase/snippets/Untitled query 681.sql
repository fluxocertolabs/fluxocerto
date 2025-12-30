with my_group as (
  select group_id
  from profiles
  where email = 'dev@local'
  limit 1
)
insert into projects (name, amount, type, date, certainty, frequency, payment_schedule, is_active, group_id)
select
  'Teste saldo estimado - receita certa',
  50000,               -- R$ 100,00
  'single_shot',
  (current_date - 3),
  'probable',
  null, null, null,
  group_id
from my_group;