import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { panelist, history, topic, prompt, model, userName } = await context.request.json() as any;

  const systemPrompt = prompt
    .replace(/{{firstName}}/g, () => panelist.firstName)
    .replace(/{{description}}/g, () => panelist.description)
    .replace(/{{fullPersonality}}/g, () => panelist.fullPersonality)
    .replace(/{{communicationStyle}}/g, () => panelist.communicationStyle || 'Professional and balanced')
    .replace(/{{userName}}/g, () => userName || 'the user')
    .replace(/{{topic}}/g, () => topic)
    .replace(/{{history}}/g, () => history);

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
      
      return new Response(JSON.stringify({ 
        thoughts: data.thoughts || data.thinking || data.reasoning || "No thoughts recorded.",
        summary: data.summary || data.response || data.message || "No response generated.",
        raw: content 
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
        { role: 'system', content: systemPrompt }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const data = JSON.parse(content || '{}');

    return new Response(JSON.stringify({ 
      thoughts: data.thoughts || data.thinking || data.reasoning || "No thoughts recorded.",
      summary: data.summary || data.response || data.message || "No response generated.",
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
