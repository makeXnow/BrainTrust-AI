import OpenAI from 'openai';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { prompt, model } = await context.request.json() as any;

  // Handle Gemini/Imagen models
  if (model && model.startsWith('imagen-')) {
    try {
      if (!context.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
      }
      
      const apiKey = context.env.GOOGLE_GENERATIVE_AI_API_KEY;
      
      // Map friendly model names to actual API model names (from ListModels API)
      const modelMapping: Record<string, string> = {
        'imagen-4-standard': 'imagen-4.0-generate-001',
        'imagen-4-ultra': 'imagen-4.0-ultra-generate-001',
        'imagen-3-fast': 'imagen-4.0-fast-generate-001',
      };
      
      const apiModel = modelMapping[model] || 'imagen-4.0-generate-001';
      
      // Use direct REST API call to Imagen endpoint
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:predict?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
          }
        }),
      });
      
      const data: any = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `API error: ${response.status}`);
      }
      
      // Extract base64 image from response
      const imageData = data.predictions?.[0]?.bytesBase64Encoded;
      if (imageData) {
        const url = `data:image/png;base64,${imageData}`;
        return new Response(JSON.stringify({ url }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('No image returned from Imagen API');
    } catch (error: any) {
      return new Response(JSON.stringify({ error: `Imagen Error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Existing OpenAI logic
  const openai = new OpenAI({
    apiKey: context.env.OPENAI_API_KEY,
  });

  try {
    const params: any = {
      model: model || 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: (model === 'dall-e-2') ? '256x256' : '1024x1024',
    };

    if (model && (model.startsWith('gpt-image') || model.startsWith('dall-e-3'))) {
      params.quality = 'hd'; // Use highest quality for latest models
      params.style = 'vivid';   // Use vivid for that website look
    }

    const response = await openai.images.generate(params);
    const url = response.data?.[0]?.url;
    if (!url) throw new Error('No image URL returned');

    return new Response(JSON.stringify({ 
      url
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
