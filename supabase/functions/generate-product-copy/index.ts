const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Método não permitido." }, 405);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey)
    return json({ error: "GEMINI_API_KEY não configurada no Supabase." }, 500);
  try {
    const { name, description, price } = await request.json();
    if (!name?.trim())
      return json({ error: "Informe o nome ou ingredientes do produto." }, 400);
    const prompt = `Você é redator de uma doceria brasileira. Crie um título curto e uma descrição apetitosa para este produto. Não invente ingredientes. Responda SOMENTE com JSON válido no formato {"title":"...","description":"..."}. Produto: ${name}. Descrição/ingredientes: ${description || "não informado"}. Preço: R$ ${price || "não informado"}.`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      },
    );
    const result = await response.json();
    if (!response.ok)
      return json(
        { error: result.error?.message || "Erro ao consultar o Gemini." },
        response.status,
      );
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ error: "O Gemini não retornou conteúdo." }, 502);
    return json(JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")));
  } catch (error) {
    console.error(error);
    return json({ error: "Não foi possível gerar o texto do produto." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
