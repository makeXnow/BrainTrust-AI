import OpenAI from 'openai';

interface Env {
  OPENAI_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const openai = new OpenAI({
    apiKey: context.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.models.list();
    const allModels = response.data;
    const models = [
      ...allModels
      .filter(model => model.id.startsWith('gpt-') || model.id.startsWith('o1-') || model.id.startsWith('o3-'))
      .map(model => model.id),
      'gemini-3-pro-preview',
      'gemini-3-pro-preview-instant'
    ].sort((a, b) => {
        // Put GPT-5 and Gemini models at the top
        const isLatest = (s: string) => s.includes('gpt-5') || s.includes('gemini-3');
        if (isLatest(a) && !isLatest(b)) return -1;
        if (!isLatest(a) && isLatest(b)) return 1;
        return a.localeCompare(b);
      });
    
    const imageModels = [
      ...allModels
        .filter(model => model.id.startsWith('dall-e-') || model.id.startsWith('gpt-image-'))
        .map(model => model.id),
      'imagen-4-standard',
      'imagen-4-ultra',
      'imagen-3-fast'
    ].sort((a, b) => {
        // Put gpt-image and imagen models at the top
        const isLatest = (s: string) => s.includes('gpt-image') || s.includes('imagen-4');
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
