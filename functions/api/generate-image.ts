import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      
      const genAI = new GoogleGenerativeAI(context.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const imagen = genAI.getGenerativeModel({ model: model });

      // Note: As of early 2026, the Gemini SDK handles image generation 
      // via the generateContent or a dedicated image generation method 
      // depending on the specific API version.
      const result = await imagen.generateContent(prompt);
      const response = await result.response;
      
      // Imagen typically returns an image in the candidate parts
      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.fileData);
      
      if (imagePart?.inlineData) {
        const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        return new Response(JSON.stringify({ url }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Fallback for different API response formats
      const url = (response as any).imageUrl || (response as any).url;
      if (!url) throw new Error('No image returned from Gemini');

      return new Response(JSON.stringify({ url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: `Gemini Error: ${error.message}` }), {
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
