-- Super Admin-only atomic plan/status updates. Never expose businesses.UPDATE to owners.
-- Both tables and the audit event update in the same database transaction.
create or replace function public.admin_update_tenant_account(
  p_business_id uuid,
  p_plan_code text,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_sub public.subscriptions%rowtype;
  v_business public.businesses%rowtype;
  v_new_status public.subscription_status;
  v_business_status text;
  v_trial_start timestamptz;
  v_trial_end timestamptz;
  v_paid_start timestamptz;
  v_paid_end timestamptz;
  v_next_due timestamptz;
  v_frozen_at timestamptz;
  v_admin_trial boolean;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Only WashPilot Super Admin can change business accounts' using errcode='42501';
  end if;

  if p_business_id is null or p_plan_code not in ('basic','premium')
     or p_status not in ('Active','Trial','Past Due','Pending Verification','Suspended','Cancelled') then
    raise exception 'Invalid business plan or account status';
  end if;

  select * into v_sub from public.subscriptions where business_id=p_business_id for update;
  if not found then raise exception 'Subscription record not found'; end if;
  select * into v_business from public.businesses where id=p_business_id for update;
  if not found then raise exception 'Business account not found'; end if;

  if exists (
    select 1 from public.payment_reactivation_requests r
    where r.business_id=p_business_id and r.status='pending'
  ) then
    raise exception 'A subscription payment is pending. Review or reject it from Billing & Revenue before changing this account';
  end if;

  v_trial_start:=v_sub.trial_starts_at;
  v_trial_end:=v_sub.trial_ends_at;
  v_paid_start:=v_sub.current_period_starts_at;
  v_paid_end:=v_sub.current_period_ends_at;
  v_next_due:=v_sub.next_due_at;
  v_frozen_at:=v_sub.frozen_at;
  v_admin_trial:=v_sub.admin_trial_enabled;

  if p_status='Active' then
    v_new_status:='active';
    v_business_status:='active';
    v_frozen_at:=null;
    if p_plan_code='basic' then
      -- Switching to the Free plan never starts a charge or opens Premium.
      v_paid_start:=null;v_paid_end:=null;v_next_due:=null;v_admin_trial:=false;
    elsif v_sub.plan_code<>'premium' or v_sub.current_period_ends_at is null
          or v_sub.current_period_ends_at<=v_now then
      raise exception 'Premium activation requires a verified, unexpired paid period. Approve the payment in Billing & Revenue or choose Trial';
    end if;

  elsif p_status='Trial' then
    if p_plan_code<>'premium' then
      raise exception 'A 7-day trial must use the Premium plan';
    end if;
    if v_sub.plan_code='premium' and v_sub.status='active'
       and v_sub.current_period_ends_at>v_now then
      raise exception 'This business already has a paid Premium period';
    end if;
    v_new_status:='trialing';v_business_status:='active';
    v_trial_start:=v_now;v_trial_end:=v_now+interval '7 days';
    v_paid_start:=null;v_paid_end:=null;v_next_due:=v_trial_end;
    v_frozen_at:=null;v_admin_trial:=true;

  elsif p_status='Suspended' or p_status='Cancelled' then
    if p_plan_code='premium' and v_sub.plan_code<>'premium' then
      raise exception 'Premium cannot be activated without an approved payment or trial';
    end if;
    v_new_status:=case when p_status='Suspended' then 'suspended' else 'cancelled' end;
    v_business_status:=case when p_status='Suspended' then 'suspended' else 'closed' end;
    v_frozen_at:=v_now;
    if p_plan_code='basic' then
      v_paid_start:=null;v_paid_end:=null;v_next_due:=null;v_admin_trial:=false;
    end if;

  elsif p_status='Past Due' then
    if p_plan_code<>'premium' or v_sub.plan_code<>'premium' then
      raise exception 'Past Due only applies to an existing Premium subscription';
    end if;
    v_new_status:='expired';v_business_status:='frozen';v_frozen_at:=v_now;
    -- Existing expiry cron preserves frozen accounts with admin_trial_enabled.
    v_admin_trial:=true;

  elsif p_status='Pending Verification' then
    -- This is a payment-controlled state; a manual selection must never
    -- grant Premium before a payment has been verified.
    raise exception 'Pending Verification is managed by the payment workflow. Review requests in Billing & Revenue';
  end if;

  update public.subscriptions
  set plan_code=p_plan_code,status=v_new_status,
      trial_starts_at=v_trial_start,trial_ends_at=v_trial_end,
      current_period_starts_at=v_paid_start,current_period_ends_at=v_paid_end,
      next_due_at=v_next_due,frozen_at=v_frozen_at,
      admin_trial_enabled=v_admin_trial,updated_at=v_now
  where id=v_sub.id;

  update public.businesses
  set status=v_business_status,updated_at=v_now
  where id=p_business_id;

  insert into public.subscription_audit_log(
    business_id,subscription_id,actor_user_id,event_type,old_status,new_status,details
  ) values (
    p_business_id,v_sub.id,auth.uid(),'admin_tenant_account_updated',
    v_sub.status::text,v_new_status::text,
    jsonb_build_object(
      'old_plan',v_sub.plan_code,'new_plan',p_plan_code,
      'old_business_status',v_business.status,
      'new_business_status',v_business_status,
      'selected_status',p_status,
      'trial_ends_at',v_trial_end,
      'current_period_ends_at',v_paid_end
    )
  );

  return jsonb_build_object(
    'business_id',p_business_id,
    'plan_code',p_plan_code,
    'subscription_status',v_new_status::text,
    'business_status',v_business_status
  );
end;
$function$;

revoke all on function public.admin_update_tenant_account(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_update_tenant_account(uuid,text,text)
  to authenticated;
