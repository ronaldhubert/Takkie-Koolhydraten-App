-- Web Push trigger: roept de Edge Function 'send-push' aan bij elk nieuw bericht.
-- (Vervanger voor "Database Webhooks", die in de nieuwe Supabase-omgeving niet meer in het menu staat.)
--
-- VOOR HET UITVOEREN:
--  1. Verzin een lang geheim wachtwoord en vervang hieronder VERVANG_DOOR_GEHEIM.
--  2. Zet exact hetzelfde geheim als secret WEBHOOK_SECRET bij Edge Functions -> Secrets.
--  3. Zet bij de functie send-push "Verify JWT" UIT (Edge Functions -> send-push -> Details/Settings).

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_push_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    perform net.http_post(
        url := 'https://pduetpbmgjrluvibtqys.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', 'VERVANG_DOOR_GEHEIM'
        ),
        body := jsonb_build_object('type', 'INSERT', 'record', to_jsonb(new))
    );
    return new;
exception when others then
    -- een mislukte push mag nooit het versturen van een bericht blokkeren
    return new;
end;
$$;

drop trigger if exists trg_notify_push_on_message on public.team_messages;
create trigger trg_notify_push_on_message
after insert on public.team_messages
for each row execute function public.notify_push_on_message();
