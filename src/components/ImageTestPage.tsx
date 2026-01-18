import React, { useState, useEffect } from 'react';

const getModelPrice = (id: string) => {
  const prices: Record<string, string> = {
    'dall-e-2': '$0.02',
    'dall-e-3': '$0.04',
    'gpt-image-1.5': '$0.05',
    'imagen-3-fast': '$0.02',
    'imagen-4-standard': '$0.04',
    'imagen-4-ultra': '$0.06',
  };
  return prices[id] || '';
};

const formatModelName = (id: string) => {
  const prefix = (id.startsWith('gemini-') || id.startsWith('imagen-')) ? 'Google' : 'OpenAI';
  return `${prefix}: ${id}`;
};

const ImageModelOption: React.FC<{ id: string; current: string; onSelect: (id: string) => void }> = ({ id, current, onSelect }) => {
  const price = getModelPrice(id);
  const isSelected = id === current;
  return (
    <div 
      onClick={() => onSelect(id)}
      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-base-300 dark:hover:bg-slate-700 transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300'}`}
    >
      <span>{formatModelName(id)}</span>
      <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{price}</span>
    </div>
  );
};

export const ImageTestPage: React.FC = () => {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('imagen-4-standard');
  const [prompt, setPrompt] = useState('A cute robot waving hello');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then((data: any) => {
        if (data.imageModels) setModels(data.imageModels);
      })
      .catch(console.error);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setRawResponse(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel }),
      });
      const data: any = await res.json();
      setRawResponse(JSON.stringify(data, null, 2));
      
      if (data.error) {
        setError(data.error);
      } else if (data.url) {
        setImageUrl(data.url);
      } else {
        setError('No image URL in response');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const defaultModels = ['imagen-4-standard', 'imagen-4-ultra', 'imagen-3-fast', 'dall-e-3', 'dall-e-2'];
  const availableModels = models.length > 0 ? models : defaultModels;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-8 transition-colors">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100">Image Generation Test</h1>
        
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 space-y-4 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model</label>
            <div className="dropdown w-full">
              <div tabIndex={0} role="button" className="select select-bordered w-full flex items-center justify-between px-4 font-normal h-[3rem] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                <span>{formatModelName(selectedModel)}</span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-mono ml-auto mr-4">{getModelPrice(selectedModel)}</span>
              </div>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-0 shadow bg-base-100 dark:bg-slate-800 rounded-box w-full mt-1 max-h-60 overflow-y-auto block border border-base-300 dark:border-slate-700">
                {availableModels.map(m => (
                  <li key={m}>
                    <ImageModelOption id={m} current={selectedModel} onSelect={(id) => {
                      setSelectedModel(id);
                      (document.activeElement as HTMLElement)?.blur();
                    }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="textarea textarea-bordered w-full h-32 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="Enter your image prompt..."
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="btn btn-primary w-full"
          >
            {loading ? 'Generating...' : 'Generate Image'}
          </button>

          {error && (
            <div className="alert alert-error">
              <span className="font-mono text-sm break-all">{error}</span>
            </div>
          )}

          {imageUrl && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Generated Image:</p>
              <img 
                src={imageUrl} 
                alt="Generated" 
                className="w-full rounded-lg shadow-md"
              />
            </div>
          )}

          {rawResponse && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Raw Response:</p>
              <pre className="bg-slate-800 dark:bg-black text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-64">
                {rawResponse}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <a href="#" onClick={() => { window.location.hash = ''; window.location.reload(); }} className="text-primary hover:underline cursor-pointer">← Back to main app</a>
        </div>
      </div>
    </div>
  );
};
