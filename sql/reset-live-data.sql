truncate table public.event_logs restart identity;
truncate table public.feedback_votes;
truncate table public.purchase_intent;
truncate table public.leads;

-- Таблицу admin_users не очищаем, чтобы не потерять доступ в админку.
