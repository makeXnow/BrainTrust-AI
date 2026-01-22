interface Env {
  BRAINTRUST_KV: KVNamespace;
  ADMIN_PASSWORD?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.BRAINTRUST_KV) {
      return new Response(JSON.stringify({ error: 'KV namespace BRAINTRUST_KV not bound.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const settings = await context.env.BRAINTRUST_KV.get('app_settings');
    if (!settings) {
      return new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(settings, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.BRAINTRUST_KV) {
      return new Response(JSON.stringify({ error: 'KV namespace BRAINTRUST_KV not bound.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const settings = await context.request.json();
    
    // Optional: add simple password check if needed, but for now we'll just save
    await context.env.BRAINTRUST_KV.put('app_settings', JSON.stringify(settings));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
