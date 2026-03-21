import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assetName, assetType, department, threat, industry } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an ISO 27001:2022 information security risk assessment expert. Given an asset and threat, generate realistic risk assessment fields. Be specific and practical, not generic. Keep each field to 1-2 sentences maximum.`;

    const userPrompt = `For an organization in the "${industry || 'General'}" industry:

Asset: "${assetName}" (Type: ${assetType}, Department: ${department})
Threat: "${threat}"

Generate the following risk assessment fields:
1. vulnerability - The specific weakness that the threat could exploit
2. consequence - The business impact if this risk materializes  
3. riskScenario - A brief scenario describing how the threat exploits the vulnerability
4. suggestedLikelihood - A number 1-5 (1=rare, 5=almost certain)
5. suggestedImpact - A number 1-5 (1=negligible, 5=catastrophic)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "risk_suggestion",
            description: "Return risk assessment suggestions for the given asset and threat",
            parameters: {
              type: "object",
              properties: {
                vulnerability: { type: "string", description: "The specific weakness the threat could exploit" },
                consequence: { type: "string", description: "The business impact if the risk materializes" },
                riskScenario: { type: "string", description: "Brief scenario of how the threat exploits the vulnerability" },
                suggestedLikelihood: { type: "number", description: "Likelihood 1-5" },
                suggestedImpact: { type: "number", description: "Impact 1-5" },
              },
              required: ["vulnerability", "consequence", "riskScenario", "suggestedLikelihood", "suggestedImpact"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "risk_suggestion" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const suggestion = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-risk-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
