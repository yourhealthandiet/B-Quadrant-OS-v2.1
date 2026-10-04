export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.MOONSHOT_API_KEY;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!apiKey) {
    console.error("Missing MOONSHOT_API_KEY environment variable.");
    // Requirement: Friendly error message
    return res.status(500).json({ text: "AI service currently unavailable. Please check network or API key." });
  }

  try {
    // Calling Moonshot/Kimi via NVIDIA Integration Endpoint
    // Model identifier: moonshot-ai/moonshot-v1-8k
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "moonshot-ai/moonshot-v1-8k", 
        messages: [
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.3,
        top_p: 1,
        max_tokens: 1024,
        stream: false
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Moonshot API Error (${response.status}):`, errText);
        throw new Error(`Provider API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract text from standard OpenAI-compatible response format
    const text = data.choices?.[0]?.message?.content || "No response generated.";
    
    return res.status(200).json({ text });

  } catch (error) {
    console.error("Backend Generation Error:", error);
    // Requirement: Friendly error message
    return res.status(500).json({ 
        text: "AI service currently unavailable. Please check network or API key." 
    });
  }
}