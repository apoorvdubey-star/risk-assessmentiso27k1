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

    const systemPrompt = `You are an ISO 27001:2022 information security risk assessment expert. Given an asset and optional threat context, generate MULTIPLE realistic risk scenarios (3-5). Each scenario should have unique threat, vulnerability, risk scenario, consequence, and a synthesized risk name. Be specific to the industry and asset type.`;

    const userPrompt = `For an organization in the "${industry || 'General'}" industry:

Asset: "${assetName}" (Type: ${assetType}, Department: ${department})
${threat ? `Initial threat context: "${threat}"` : 'Generate diverse threats for this asset.'}

Generate 3-5 distinct risk scenarios. For each, provide:
- threat: specific threat
- vulnerability: specific weakness exploited
- riskScenario: brief scenario description
- consequence: business impact
- riskName: a concise 3-6 word risk name summarizing the scenario
- suggestedLikelihood: 1-5
- suggestedImpact: 1-5`;

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
            name: "multi_risk_suggestions",
            description: "Return multiple risk assessment scenarios for the given asset",
            parameters: {
              type: "object",
              properties: {
                scenarios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      threat: { type: "string" },
                      vulnerability: { type: "string" },
                      riskScenario: { type: "string" },
                      consequence: { type: "string" },
                      riskName: { type: "string", description: "Concise 3-6 word risk name" },
                      suggestedLikelihood: { type: "number" },
                      suggestedImpact: { type: "number" },
                    },
                    required: ["threat", "vulnerability", "riskScenario", "consequence", "riskName", "suggestedLikelihood", "suggestedImpact"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["scenarios"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "multi_risk_suggestions" } },
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

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-risk-multi-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
