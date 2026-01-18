import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { topic, firstName, shortDescription, color, communicationStyle, communicationStyleDescription, wordMin, wordMax, styleIntro, prompt, model } = await context.request.json() as any;

  const systemPrompt = prompt
    .replace(/\{\{topic\}\}/g, () => topic)
    .replace(/\{\{firstName\}\}/g, () => firstName)
    .replace(/\{\{description\}\}/g, () => shortDescription)
    .replace(/\{\{shortDescription\}\}/g, () => shortDescription)
    .replace(/\{\{communicationStyle\}\}/g, () => communicationStyle || 'Professional')
    .replace(/\{\{communicationStyleDescription\}\}/g, () => communicationStyleDescription || '')
    .replace(/\{\{wordMin\}\}/g, () => String(wordMin || 10))
    .replace(/\{\{wordMax\}\}/g, () => String(wordMax || 50))
    .replace(/\{\{styleIntro\}\}/g, () => styleIntro || '{{firstName}} here.')
    .replace(/\{\{color\}\}/g, () => color || 'professional');

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
    
    const extractFirstJsonObject = (str: string) => {
      const firstBrace = str.indexOf('{');
      if (firstBrace === -1) return str;
      let depth = 0;
      for (let i = firstBrace; i < str.length; i++) {
        if (str[i] === '{') depth++;
        else if (str[i] === '}') {
          depth--;
          if (depth === 0) return str.substring(firstBrace, i + 1);
        }
      }
      return str.substring(firstBrace);
    };

    let raw = content || '{}';
    try {
      // Prettify the JSON if possible
      raw = JSON.stringify(JSON.parse(raw), null, 2);
    } catch (e) {
      try {
        const extracted = extractFirstJsonObject(raw);
        raw = JSON.stringify(JSON.parse(extracted), null, 2);
      } catch (e2) {
        // Keep original if still not valid JSON
      }
    }

      return new Response(JSON.stringify({ 
        raw
      }), {
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
        { role: 'system', content: 'You are a creative character designer. You always respond with a JSON object.' },
        { role: 'user', content: systemPrompt }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;

    const extractFirstJsonObject = (str: string) => {
      const firstBrace = str.indexOf('{');
      if (firstBrace === -1) return str;
      let depth = 0;
      for (let i = firstBrace; i < str.length; i++) {
        if (str[i] === '{') depth++;
        else if (str[i] === '}') {
          depth--;
          if (depth === 0) return str.substring(firstBrace, i + 1);
        }
      }
      return str.substring(firstBrace);
    };

    let raw = content || '{}';
    try {
      // Prettify the JSON if possible
      raw = JSON.stringify(JSON.parse(raw), null, 2);
    } catch (e) {
      try {
        const extracted = extractFirstJsonObject(raw);
        raw = JSON.stringify(JSON.parse(extracted), null, 2);
      } catch (e2) {
        // Keep original if still not valid JSON
      }
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
