import React from 'react';
import { DebugLog } from '@/types';
import { Cpu, UserCheck, MessageSquare, AlertCircle, Info, Settings2, Brain } from 'lucide-react';

interface DebugPanelProps {
  logs: DebugLog[];
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ logs }) => {
  const discoveredAvatars = React.useMemo(() => {
    const avatars: Record<string, string> = {};
    logs.forEach(log => {
      if (log.endpoint.toLowerCase().includes('panelists') && log.response?.panelists) {
        log.response.panelists.forEach((p: any) => {
          if (p.avatarUrl && p.firstName) avatars[p.firstName] = p.avatarUrl;
        });
      }
      if (log.endpoint.toLowerCase().includes('generating image') && log.response?.url) {
        const name = log.payload?.name || log.payload?.firstName;
        if (name) avatars[name] = log.response.url;
      }
      if (log.response?.avatarUrl && log.response?.name) {
        avatars[log.response.name] = log.response.avatarUrl;
      }
    });
    return avatars;
  }, [logs]);

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-indigo-100">
      <div className="p-10">
        {children}
      </div>
    </div>
  );

  const InfoSection = ({ label, value, last = false }: { label: string; value: string; last?: boolean }) => (
    <div className={last ? "" : "mb-10"}>
      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
        {label}
      </h5>
      <p className="text-slate-600 text-base leading-relaxed">
        {value}
      </p>
    </div>
  );

  const CardHeader = ({ name, description, avatarUrl }: { name: string; description: string; avatarUrl?: string }) => (
    <div className="flex items-center gap-6 mb-10">
      <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-100 shadow-sm flex-shrink-0 bg-slate-50 flex items-center justify-center">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <UserCheck className="w-12 h-12 text-slate-300" />
        )}
      </div>
      <div className="flex-1">
        <h4 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-1">
          {name}
        </h4>
        <div className="text-indigo-600 font-bold text-xs uppercase tracking-widest">
          {description}
        </div>
      </div>
    </div>
  );

  const renderPayload = (payload: any) => {
    if (!payload || typeof payload !== 'object') return null;

    const items = Object.entries(payload).filter(([key]) => !['prompt', 'history', 'url', 'model', 'imageModel', 'topic', 'count'].includes(key));
    if (items.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 px-1">
        {items.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 bg-slate-100/50 border border-slate-200 rounded-full px-3 py-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{key}:</span>
            <span className="text-[11px] text-slate-600 font-semibold">
              {typeof value === 'object' ? 'Object' : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const getLengthConstraint = (style: string) => {
    const s = style.toLowerCase();
    if (s.includes('punchy')) return "Max 15 words";
    if (s.includes('nuanced')) return "2 thoughtful sentences";
    if (s.includes('academic')) return "Max 3 sentences (formal)";
    if (s.includes('grumpy')) return "1 blunt sentence (max 12 words)";
    if (s.includes('vibrant')) return "2-3 sentences (metaphoric)";
    return "2 sentences max";
  };

  const renderResponse = (log: DebugLog) => {
    const { response, endpoint } = log;
    if (!response || typeof response !== 'object') return null;

    // 1. Panelists Generation Response
    if (endpoint.toLowerCase().includes('panelists') && (response.panelists || Array.isArray(response))) {
      const panelists = response.panelists || (Array.isArray(response) ? response : []);
      return (
        <div className="space-y-8 mt-4">
          {panelists.map((p: any, i: number) => (
            <Card key={i}>
                <CardHeader 
                  name={p.firstName || 'Expert'} 
                  description={p.description || 'Consultant'} 
                  avatarUrl={p.avatarUrl || (p.firstName ? discoveredAvatars[p.firstName] : undefined)} 
                />
                
                <InfoSection 
                  label="Communication Style" 
                  value={p.communicationStyle || 'Professional and balanced'} 
                />
                
                <InfoSection 
                  label="Typical Length" 
                  value={getLengthConstraint(p.communicationStyle || '')} 
                />

                <InfoSection 
                  label="Personality Profile" 
                  value={p.fullPersonality} 
                />

                <InfoSection 
                  label="Opening Statement" 
                  value={p.introMessage} 
                  last 
                />
            </Card>
          ))}
        </div>
      );
    }

    // 2. Agent Response (Thoughts + Summary)
    if (response.thoughts || response.summary) {
      const agentName = response.name || 'Agent Response';
      return (
        <div className="space-y-4 mt-4">
          <Card>
            <CardHeader 
              name={agentName} 
              description={response.role || 'Action & Reflection'} 
              avatarUrl={response.avatarUrl || discoveredAvatars[agentName]} 
            />

            {response.thoughts && (
              <InfoSection 
                label="Internal Reasoning" 
                value={response.thoughts} 
              />
            )}
            
            {response.summary && (
              <InfoSection 
                label="Public Response" 
                value={response.summary} 
                last
              />
            )}
          </Card>
        </div>
      );
    }

    // 3. Moderator Response
    if (response.summary && endpoint.toLowerCase().includes('moderator')) {
      return (
        <div className="mt-4">
          <Card>
            <CardHeader 
              name="Moderator" 
              description="Synthesis & Conclusion" 
              avatarUrl={response.avatarUrl || discoveredAvatars['Moderator']} 
            />

            <InfoSection 
              label="Moderator Synthesis" 
              value={response.summary} 
              last
            />
          </Card>
        </div>
      );
    }

    // 4. Image Generation Response
    if (endpoint.toLowerCase().includes('generating image') && (response.url || log.payload?.url)) {
      const imageUrl = response.url || log.payload?.url;
      return (
        <div className="mt-4">
          <div className="w-48 h-48 rounded-full overflow-hidden border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <img 
              src={imageUrl} 
              alt="Generated avatar" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>
      );
    }

    // Fallback: Default JSON
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2">
        <pre className="text-xs font-mono text-slate-500 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden border-l border-slate-200">
      <div className="p-4 bg-white flex items-center gap-3 border-b border-slate-200 shadow-sm z-10">
        <Cpu size={20} className="text-indigo-600" />
        <span className="font-bold text-lg tracking-tight">Agent Console</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 italic space-y-4 text-center py-20">
            <Cpu size={64} className="text-slate-300 animate-pulse" />
            <p className="text-lg">System idle. Start a discussion to see agent activity.</p>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Log Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  log.type === 'error' ? 'bg-red-500' : 
                  log.endpoint.includes('panelists') ? 'bg-indigo-500' : 
                  log.endpoint.includes('Moderator') ? 'bg-slate-400' :
                  'bg-emerald-500'
                }`} />
                <h3 className="font-bold text-sm tracking-wide text-slate-800 uppercase">
                  {log.endpoint}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                {log.model && <span className="hidden sm:inline">{log.model}</span>}
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Main Entry Container */}
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200/50" />
                <div className="pl-10 space-y-8">
                  {/* Context Pills */}
                  {renderPayload(log.payload)}

                  {/* Response Display */}
                  {log.response && renderResponse(log)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
