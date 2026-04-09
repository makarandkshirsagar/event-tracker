import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { rows, projectName } = await req.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a senior event project manager for "${projectName}". Tasks:\n${rows}\n\nWrite a structured daily report:\n1. **Overall Project Health** (GREEN/AMBER/RED + 2 sentences)\n2. **Critical Issues** (blocked tasks + recommended actions)\n3. **Division Status** (each division: one emoji + one line)\n4. **Member Performance** (one line per member)\n5. **Top 5 Manager Action Items**\n\nBe concise and direct.`,
        }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Anthropic API error");

    const text = data.content?.map((b: any) => b.text || "").join("") || "No response.";
    return new Response(JSON.stringify({ text }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
