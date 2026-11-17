// Supabase Edge Function: stuurt een Web Push bij elk nieuw team_messages-bericht.
// Wordt aangeroepen door een Database Webhook (INSERT op public.team_messages).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("WEBHOOK_SECRET");
    if (secret && req.headers.get("x-webhook-secret") !== secret) {
      return new Response("niet toegestaan", { status: 401 });
    }
    const payload = await req.json();
    const msg = payload.record;
    if (!msg || payload.type !== "INSERT") {
      return new Response("genegeerd", { status: 200 });
    }

    // Wie krijgt een melding?
    let recipientIds: string[] = [];
    if (msg.recipient_id) {
      recipientIds = [msg.recipient_id];
    } else {
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("team_id", msg.team_id);
      recipientIds = (members ?? []).map((m: { id: string }) => m.id);
    }
    recipientIds = recipientIds.filter((id) => id !== msg.user_id);
    if (recipientIds.length === 0) return new Response("geen ontvangers", { status: 200 });

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", recipientIds);

    const isPrivate = !!msg.recipient_id;
    const title = isPrivate
      ? `💌 Privébericht van ${msg.sender_name}`
      : msg.msg_type === "system"
      ? "🐾 Takkie & Siep"
      : `💬 ${msg.sender_name}`;
    const body = JSON.stringify({ title, body: msg.content, url: "./" });

    let sent = 0;
    await Promise.all((subs ?? []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err: any) {
        // Verlopen of ingetrokken abonnement opruimen
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("push mislukt", err.statusCode, err.body);
        }
      }
    }));

    return new Response(`verstuurd: ${sent}`, { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("fout", { status: 500 });
  }
});
