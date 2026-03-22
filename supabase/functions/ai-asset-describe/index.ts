import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assetName, assetType, industry } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an ISO 27001 information asset management expert. Generate a concise asset description for an information security asset register." },
          { role: "user", content: `For an organization in the "${industry || 'General'}" industry, describe this asset in 1-2 sentences for an ISMS asset register:\n\nAsset Name: "${assetName}"\nAsset Type: ${assetType}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "asset_description",
            description: "Return asset description and suggested data classification",
            parameters: {
              type: "object",
              properties: {
                description: { type: "string", description: "1-2 sentence asset description for ISMS register" },
                suggestedClassification: { type: "string", enum: ["Internal", "Confidential", "Restricted", "Public"], description: "Suggested data classification" },
              },
              required: ["description", "suggestedClassification"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "asset_description" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const suggestion = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(suggestion), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-asset-describe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
