import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { topic, count, prompt, model, communicationStyles } = await context.request.json() as any;

  const systemPrompt = prompt
    .replace(/\{\{topic\}\}/g, () => topic)
    .replace(/\{\{count\}\}/g, () => count)
    .replace(/\{\{communicationStyles\}\}/g, () => communicationStyles || 'Any professional style');

  // Handle Gemini models
  if (model && model.startsWith('gemini-')) {
    try {
      const genAI = new GoogleGenerativeAI(context.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const gemini = genAI.getGenerativeModel({ model: model });
      
      const result = await gemini.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      });
      const content = result.response.text();
      
      let raw = content || '{}';
      try {
        // Prettify the JSON if possible
        raw = JSON.stringify(JSON.parse(raw), null, 2);
      } catch (e) {
        // Keep original if not valid JSON
      }
      
      return new Response(JSON.stringify({ raw }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: `Gemini Error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const openai = new OpenAI({
    apiKey: context.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a professional panel curator. You always respond with a JSON object.' },
        { role: 'user', content: systemPrompt }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;

    let raw = content || '{}';
    try {
      // Prettify the JSON if possible
      raw = JSON.stringify(JSON.parse(raw), null, 2);
    } catch (e) {
      // Keep original if not valid JSON
    }

    return new Response(JSON.stringify({ 
      raw
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
