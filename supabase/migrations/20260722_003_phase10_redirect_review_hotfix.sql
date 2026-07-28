-- Phase 10 hotfix: redirect reviews must not dereference the target-only v_state record.
do $migration$
declare
  v_signature regprocedure := 'public.phase10_update_editorial_review(text,text,text,text,boolean,boolean,boolean,boolean,text,uuid)'::regprocedure;
  v_definition text;
  v_old text := 'target_version = case when v_review.editorial_target_id is not null then v_state.target_version else p_target_version end,';
  v_new text := 'target_version = case when v_review.editorial_target_id is not null
      then (select target_version from public.editorial_targets where id = v_review.editorial_target_id)
      else p_target_version end,';
begin
  select pg_get_functiondef(v_signature) into v_definition;
  if position(v_new in v_definition) > 0 then
    return;
  end if;
  if position(v_old in v_definition) = 0 then
    raise exception 'PHASE10_REVIEW_HOTFIX_BASELINE_MISMATCH';
  end if;
  execute replace(v_definition, v_old, v_new);
end;
$migration$;

notify pgrst, 'reload schema';
