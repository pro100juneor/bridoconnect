-- 048: соц-логин (Apple/Google) — онбординг новых соц-пользователей.
-- Соц-вход обходит форму регистрации (выбор роли + согласие 18+/Условия), поэтому:
--  * профиль соц-пользователя создаётся с onboarding_completed_at = NULL → клиент
--    гонит его на экран /welcome (выбор роли + согласие);
--  * email/пароль-регистрация помечает онбординг завершённым сразу (согласие уже
--    собрано в форме) — через метаданные signUp;
--  * существующие пользователи бэкфилятся как завершённые, чтобы их не выбросило на гейт.

-- 1) Колонки согласия/онбординга.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists age_confirmed boolean not null default false,
  add column if not exists terms_accepted_at timestamptz;

-- 2) Бэкфилл существующих: они уже прошли регистрацию через форму.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at),
    terms_accepted_at       = coalesce(terms_accepted_at, created_at),
    age_confirmed           = true
where onboarding_completed_at is null;

-- 3) handle_new_user: заполняем онбординг из метаданных.
--    role — по-прежнему только sponsor/recipient (admin назначается вручную, см. 037).
--    Соц-вход метаданных согласия не передаёт → поля остаются NULL/false → гейт /welcome.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, onboarding_completed_at, age_confirmed, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Користувач'),
    case
      when new.raw_user_meta_data->>'role' in ('sponsor', 'recipient')
        then new.raw_user_meta_data->>'role'
      else 'sponsor'
    end,
    case when (new.raw_user_meta_data->>'terms_accepted') = 'true' then now() else null end,
    coalesce((new.raw_user_meta_data->>'age_confirmed') = 'true', false),
    case when (new.raw_user_meta_data->>'terms_accepted') = 'true' then now() else null end
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4) RPC для экрана /welcome: соц-пользователь один раз выбирает роль и принимает
--    условия. SECURITY DEFINER — т.к. profiles.role защищён от клиентского UPDATE
--    (см. 037). Идемпотентно: обновляет только пока онбординг не завершён, поэтому
--    роль нельзя переписать повторно этим путём.
create or replace function public.complete_social_onboarding(
  p_role text,
  p_age_confirmed boolean,
  p_terms_accepted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_role not in ('sponsor', 'recipient') then
    raise exception 'invalid role';
  end if;
  if not p_age_confirmed or not p_terms_accepted then
    raise exception 'consent required';
  end if;

  update public.profiles
  set role = p_role,
      age_confirmed = true,
      terms_accepted_at = coalesce(terms_accepted_at, now()),
      onboarding_completed_at = now()
  where id = auth.uid()
    and onboarding_completed_at is null;
end;
$$;

revoke all on function public.complete_social_onboarding(text, boolean, boolean) from public;
grant execute on function public.complete_social_onboarding(text, boolean, boolean) to authenticated;
