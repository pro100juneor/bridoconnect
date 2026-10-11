-- 058_recipient_has_address.sql
-- P4.3: спонсору нужно знать, можно ли отправить подарок получателю — есть ли у того
-- адрес доставки, — НЕ видя самого адреса. Возвращаем только boolean (не PII).
create or replace function public.recipient_has_shipping_address(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shipping_addresses where user_id = p_user);
$$;

revoke all on function public.recipient_has_shipping_address(uuid) from public;
grant execute on function public.recipient_has_shipping_address(uuid) to authenticated;
