import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") ?? "noreply@yourdomain.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });
  }

  try {
    const { tasks, memberEmails, projectName } = await req.json();

    // Group at-risk/blocked tasks by member
    const byMember: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!byMember[t.member]) byMember[t.member] = [];
      byMember[t.member].push(t);
    }

    const results = [];
    for (const [member, memberTasks] of Object.entries(byMember)) {
      const email = memberEmails[member];
      if (!email) continue;

      const taskList = memberTasks.map((t: any) =>
        `• <b>${t.title}</b> — ${t.division}<br>&nbsp;&nbsp;Status: <b style="color:${t.status==="Blocked"?"#dc2626":"#d97706"}">${t.status}</b> · Progress: ${t.progress}%${t.blocker ? `<br>&nbsp;&nbsp;Blocker: ${t.blocker}` : ""}`
      ).join("<br><br>");

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#312e81;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">📋 Task Reminder — ${projectName}</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <p style="color:#374151">Hi <b>${member}</b>,</p>
            <p style="color:#374151">The following tasks assigned to you need your attention:</p>
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0;color:#374151;line-height:1.8">
              ${taskList}
            </div>
            <p style="color:#6b7280;font-size:13px">Please update your task status as soon as possible.</p>
          </div>
        </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: `[${projectName}] Task Reminder — Action Required`, html }),
      });

      results.push({ member, email, ok: res.ok });
    }

    return new Response(JSON.stringify({ sent: results }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
