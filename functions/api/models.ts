import OpenAI from 'openai';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is missing. Please add it to your Cloudflare Pages environment variables.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({
    apiKey: context.env.OPENAI_API_KEY,
  });

  try {
    // Parallel fetch from OpenAI and Google
    const [openaiResponse, geminiResponse] = await Promise.allSettled([
      openai.models.list(),
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${context.env.GOOGLE_GENERATIVE_AI_API_KEY}`)
        .then(res => res.json() as Promise<{models: any[]}>)
    ]);

    let allModels: any[] = [];
    if (openaiResponse.status === 'fulfilled') {
      allModels = openaiResponse.value.data;
    }

    let geminiModels: string[] = [];
    if (geminiResponse.status === 'fulfilled' && geminiResponse.value.models) {
      geminiModels = geminiResponse.value.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
    } else {
      // Fallback Gemini models if fetch fails
      geminiModels = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
      ];
    }

    const models = [
      ...allModels
        .filter(model => model.id.startsWith('gpt-') || model.id.startsWith('o1-') || model.id.startsWith('o3-'))
        .map(model => model.id),
      ...geminiModels
    ].sort((a, b) => {
        // Put GPT-5, latest O-series, and Gemini 2.0+ models at the top
        const isLatest = (s: string) => 
          s.includes('gpt-5') || 
          s.includes('gemini-2') || 
          s.includes('o1') || 
          s.includes('o3');
        if (isLatest(a) && !isLatest(b)) return -1;
        if (!isLatest(a) && isLatest(b)) return 1;
        return a.localeCompare(b);
      });
    
    const imageModels = [
      ...allModels
        .filter(model => model.id.startsWith('dall-e-') || model.id.startsWith('gpt-image-'))
        .map(model => model.id),
      'imagen-4.0-ultra-generate-001',
      'imagen-4.0-generate-001',
      'imagen-3.0-generate-002',
      'imagen-3.0-generate-001',
      'imagen-2.0-generate-001'
    ].sort((a, b) => {
        // Put gpt-image and newest imagen models at the top
        const isLatest = (s: string) => s.includes('gpt-image') || s.includes('imagen-4') || s.includes('imagen-3');
        if (isLatest(a) && !isLatest(b)) return -1;
        if (!isLatest(a) && isLatest(b)) return 1;
        return a.localeCompare(b);
      });

    return new Response(JSON.stringify({ models, imageModels }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
