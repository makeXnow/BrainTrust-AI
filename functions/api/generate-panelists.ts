import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { topic, count, prompt, model } = await context.request.json() as any;

  const systemPrompt = prompt.replace(/{{topic}}/g, () => topic).replace(/{{count}}/g, () => count);

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
      const data = JSON.parse(content || '{}');
      
      let panelists = [];
      if (data.panelists && Array.isArray(data.panelists)) {
        panelists = data.panelists;
      } else if (Array.isArray(data)) {
        panelists = data;
      }
      
      return new Response(JSON.stringify({ panelists, raw: content }), {
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

    const data = JSON.parse(content || '{}');

    if (data.error && !data.panelists) {
      return new Response(JSON.stringify({ 
        error: `AI Error: ${data.error}`,
        raw: content 
      }), {
        status: 200, // Return 200 so the frontend can handle the error message gracefully
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let panelists = [];
    if (data.panelists && Array.isArray(data.panelists)) {
      panelists = data.panelists;
    } else if (Array.isArray(data)) {
      panelists = data;
    } else if (typeof data === 'object' && data !== null) {
      // Find any array in the object
      const possibleArray = Object.values(data).find(v => Array.isArray(v));
      if (possibleArray) {
        panelists = possibleArray as any[];
      } else {
        // Check if the object itself is a collection of panelist objects (e.g. {"0": {...}, "1": {...}})
        const values = Object.values(data);
        if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && ('firstName' in v || 'description' in v))) {
          panelists = values;
        }
      }
    }

    return new Response(JSON.stringify({ 
      panelists,
      raw: content 
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
