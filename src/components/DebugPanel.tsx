import React, { useEffect, useState } from 'react';
import { DebugLog, Panelist } from '@/types';
import { MessageSquareCode, User, UserCheck, MessageSquare, AlertCircle, Info, FileText, Settings2, Brain, Clock, DollarSign } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { clsx } from 'clsx';

interface DebugPanelProps {
  logs: DebugLog[];
  panelists?: Panelist[];
  onPanelistClick?: (panelist: Panelist) => void;
}

// Simple image component - cropping is now done at image generation time in useChat.ts
const AutoCroppedImage: React.FC<{ 
  src: string; 
  alt?: string; 
  className?: string;
}> = ({ src, alt, className }) => {
  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" />;
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ logs, panelists, onPanelistClick }) => {
  const { scrollRef, handleScroll, scrollToBottom } = useAutoScroll<HTMLDivElement>();
  const [mode, setMode] = useState<'info' | 'prompt'>('info');

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom, mode]);

  const discoveredProfiles = React.useMemo(() => {
    // If panelists are provided via props, use them primarily
    const profiles: Record<string, { avatarUrl?: string; description?: string; color?: string; id?: string; communicationStyle?: string }> = {};
    
    try {
      if (panelists && Array.isArray(panelists)) {
        panelists.forEach(p => {
          if (p && p.firstName) {
            profiles[p.firstName] = {
              avatarUrl: p.avatarUrl,
              description: p.shortDescription,
              color: p.color,
              id: p.id,
              communicationStyle: p.communicationStyle
            };
          }
        });
      }

      // Only use logs to fill in missing data - panelists prop has the authoritative (cropped) avatarUrl
      if (logs && Array.isArray(logs)) {
        logs.forEach(log => {
          if (!log) return;
          // 1. Collect from Panelist Generation
          if (log.endpoint?.toLowerCase().includes('assembly') && log.response?.panelists && Array.isArray(log.response.panelists)) {
            log.response.panelists.forEach((p: any) => {
              if (p && p.firstName && !profiles[p.firstName]) {
                profiles[p.firstName] = { 
                  description: p.shortDescription || p.description,
                  color: p.color
                };
              }
            });
          }
          // 2. Skip avatar logs - we use the cropped avatarUrl from panelists prop
          // 3. Collect from Agent/Moderator Responses (only description/color, not avatarUrl)
          const resp = log.response;
          const name = resp?.name || log.payload?.firstName || log.payload?.name;
          if (name && typeof name === 'string' && !profiles[name]) {
            profiles[name] = {
              description: resp?.role,
              color: resp?.color
            };
          }
        });
      }
    } catch (err) {
      console.error("Error computing discoveredProfiles:", err);
    }
    return profiles;
  }, [logs, panelists]);

  const getColorHex = (tailwindClass?: string) => {
    if (!tailwindClass) return '#94a3b8'; // slate-400
    const colorMap: Record<string, string> = {
      'bg-red-50': '#f87171', // red-400
      'bg-orange-50': '#fb923c', // orange-400
      'bg-amber-50': '#fbbf24', // amber-400
      'bg-yellow-50': '#facc15', // yellow-400
      'bg-lime-50': '#a3e635', // lime-400
      'bg-green-50': '#4ade80', // green-400
      'bg-emerald-50': '#34d399', // emerald-400
      'bg-teal-50': '#2dd4bf', // teal-400
      'bg-cyan-50': '#22d3ee', // cyan-400
      'bg-sky-50': '#38bdf8', // sky-400
      'bg-blue-50': '#60a5fa', // blue-400
      'bg-indigo-50': '#818cf8', // indigo-400
      'bg-violet-50': '#a78bfa', // violet-400
      'bg-purple-50': '#c084fc', // purple-400
      'bg-fuchsia-50': '#e879f9', // fuchsia-400
      'bg-pink-50': '#f472b6', // pink-400
      'bg-rose-50': '#fb7185', // rose-400
    };
    return colorMap[tailwindClass] || '#94a3b8';
  };

  const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="p-10">
        {children}
      </div>
    </div>
  );

  const InfoSection = ({ label, value, last = false }: { label: string; value: string; last?: boolean }) => (
    <div className={last ? "" : "mb-10"}>
      <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
        {label}
      </h5>
      <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
        {value}
      </p>
    </div>
  );

  const CardHeader = ({ name, description, avatarUrl, color, onAvatarClick }: { name: string; description: string; avatarUrl?: string; color?: string; onAvatarClick?: () => void }) => {
    return (
      <div className="flex items-center gap-6 mb-10">
        <div 
          className={clsx(
            "w-24 h-24 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0 bg-slate-50 dark:bg-slate-800 flex items-center justify-center",
            onAvatarClick && "cursor-pointer hover:border-primary/50 transition-all"
          )}
          style={!avatarUrl ? { backgroundColor: `${getColorHex(color)}20` } : {}}
          onClick={onAvatarClick}
        >
          {avatarUrl ? (
            <AutoCroppedImage src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12" style={{ color: getColorHex(color) }} />
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
            {name}
          </h4>
          <div className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
            {description}
          </div>
        </div>
      </div>
    );
  };

  const renderResponse = (log: DebugLog) => {
    try {
      if (!log) return null;
      const { response, endpoint = '' } = log;
      if (!response || typeof response !== 'object' || Array.isArray(response)) return null;

      const endpointLower = endpoint.toLowerCase();

      // 1. Panelist Personality Response
      if (endpointLower.includes('personality')) {
        const agentName = response.firstName || log.payload?.firstName || 'Agent';
        const profile = discoveredProfiles[agentName] || {};
        
        return (
          <div className="mt-4">
            <Card>
              <CardHeader 
                name={agentName} 
                description={response.shortDescription || profile?.description || 'Profile Developing'} 
                avatarUrl={response.avatarUrl || profile?.avatarUrl} 
                color={profile?.color}
              />
              <InfoSection 
                label="Communication Style" 
                value={response.communicationStyle || profile?.communicationStyle || "Determining style..."} 
              />
              <InfoSection 
                label="Physical Description" 
                value={response.physicalDescription || "Imagining appearance..."} 
              />
              <InfoSection 
                label="Personality Profile" 
                value={response.fullPersonality || "Developing personality..."} 
                last
              />
            </Card>
          </div>
        );
      }

      // 2. Moderator Speaker Selection
      if (endpointLower.includes('speaker selection') && response.reasoning) {
        const reasoning = (response.reasoning && typeof response.reasoning === 'object') ? response.reasoning : {};
        const chosen = typeof response.chosen === 'string' ? response.chosen : '';
        const allowedNames = Array.isArray(response.allowedNames) ? response.allowedNames : null;

        // Collect all participants to show cards for - ONLY those the moderator actually reasoned about
        const participantEntries: any[] = [];
        
        Object.keys(reasoning).forEach(name => {
          // If we have allowedNames (from debug log), filter out anyone not in that list
          if (allowedNames && !allowedNames.some((an: string) => an.toLowerCase() === name.toLowerCase())) {
            return;
          }

          const panelist = (panelists || []).find(p => p && p.firstName.toLowerCase() === name.toLowerCase());
          if (panelist) {
            participantEntries.push({
              id: panelist.id,
              name: panelist.firstName,
              avatarUrl: panelist.avatarUrl,
              color: panelist.color,
              isUser: false
            });
          } else {
            // Check if this is likely the user (not a known agent)
            participantEntries.push({
              id: `user-${name}`,
              name: name,
              avatarUrl: undefined,
              color: undefined,
              isUser: true
            });
          }
        });

        // Sort by panelists first, then user, to keep UI consistent
        participantEntries.sort((a, b) => {
          if (a.isUser !== b.isUser) return a.isUser ? 1 : -1;
          return 0;
        });

        return (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {participantEntries.map(p => {
                const isChosen = chosen.toLowerCase() === p.name?.toLowerCase();
                return (
                  <div 
                    key={p.id}
                    className={clsx(
                      "bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all",
                      isChosen ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10" : "border-slate-100 dark:border-slate-800 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                        {p.avatarUrl ? (
                          <AutoCroppedImage src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800" style={{ backgroundColor: p.color ? `${getColorHex(p.color)}20` : undefined }}>
                            <User className="w-5 h-5" style={{ color: p.color ? getColorHex(p.color) : '#94a3b8' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate dark:text-slate-200">{p.name}</div>
                        {isChosen && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <UserCheck size={10} /> Selected
                          </div>
                        )}
                      </div>
                    </div>
                    {reasoning[p.name] && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic border-t border-slate-50 dark:border-slate-800 pt-2 mt-2">
                        "{String(reasoning[p.name])}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // 3. Agent Response (Thoughts + Summary)
      if (response.publicComment && (response.thoughts || endpointLower.includes('response')) && !response.reasoning) {
        const agentName = response.name || 
          (log.payload && typeof log.payload === 'object' ? (log.payload.firstName || log.payload.name) : null) || 
          'Agent Response';
        const profile = discoveredProfiles[agentName] || {};
        
        const handleClick = () => {
          if (onPanelistClick) {
            // Find full panelist object if possible
            const fullPanelist = panelists?.find(p => p && (p.firstName === agentName || p.id === profile?.id));
            if (fullPanelist) {
              onPanelistClick(fullPanelist);
            }
          }
        };

        return (
          <div className="space-y-4 mt-4">
            <Card>
              <CardHeader 
                name={agentName} 
                description={response.role || profile?.description || 'Action & Reflection'} 
                avatarUrl={response.avatarUrl || profile?.avatarUrl} 
                color={profile?.color}
                onAvatarClick={onPanelistClick ? handleClick : undefined}
              />

              {profile?.communicationStyle && (
                <InfoSection 
                  label="Communication Style" 
                  value={profile.communicationStyle} 
                />
              )}

              {response.thoughts && typeof response.thoughts === 'string' && (
                <InfoSection 
                  label="Internal Reasoning" 
                  value={response.thoughts} 
                />
              )}
              
              {response.publicComment && typeof response.publicComment === 'string' && (
                <InfoSection 
                  label="Public Response" 
                  value={response.publicComment} 
                  last
                />
              )}
            </Card>
          </div>
        );
      }

      // 4. Moderator / User Auto Response
      const moderatorContent = response.userResponse || response.publicComment;
      if (moderatorContent && (endpointLower.includes('moderator') || endpointLower.includes('suggested user response')) && !response.reasoning) {
        const isUserAuto = endpointLower.includes('suggested user response');
        const profile = discoveredProfiles[isUserAuto ? 'Assistant' : 'Moderator'] || {};
        return (
          <div className="mt-4">
            <Card>
              <CardHeader 
                name={isUserAuto ? "Suggested Response" : "Moderator"} 
                description={profile?.description || (isUserAuto ? "User Perspective" : "Synthesis & Conclusion")} 
                avatarUrl={response.avatarUrl || profile?.avatarUrl} 
              />

              <InfoSection 
                label={isUserAuto ? "Suggested Content" : "Moderator Synthesis"} 
                value={typeof moderatorContent === 'string' ? moderatorContent : String(moderatorContent)} 
                last
              />
            </Card>
          </div>
        );
      }
      // 5. Avatar / Image Response fallback
      if (endpointLower.includes('avatar') && response.url) {
        return (
          <div className="mt-4 flex justify-center">
            <div className="w-48 h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <img src={response.url} alt="Generated Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        );
      }

      const safeResponse = JSON.parse(JSON.stringify(response, (key, value) => {
        if (typeof value === 'string' && value.length > 5000) {
          return value.substring(0, 5000) + `... [truncated ${value.length} chars]`;
        }
        return value;
      }));

      return (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 mt-2">
          <pre className="text-xs font-mono text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(safeResponse, null, 2)}
          </pre>
        </div>
      );
    } catch (err: any) {
      console.error("Error rendering response in DebugPanel:", err);
      return <div className="text-red-500 p-4 border border-red-200 rounded-xl">Error rendering this entry.</div>;
    }
  };

  const renderPromptMode = () => {
    // Show in chronological order (Oldest -> Newest) so "first made" is on top
    const groupedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {groupedLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 italic space-y-4 text-center py-20">
            <FileText size={64} className="text-slate-300 animate-pulse" />
            <p className="text-lg">No API activity yet. Start a discussion to see raw prompts.</p>
          </div>
        )}

        {groupedLogs.map((log) => (
          <div key={log.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
            {/* Header */}
            <div className="bg-slate-50/50 dark:bg-slate-800/50 px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-2 h-2 rounded-full",
                  log.type === 'error' ? "bg-red-500" : 
                  log.type === 'response' ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wide">{log.endpoint}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {log.model && (
                  <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                    <Brain size={10} />
                    {log.model}
                  </div>
                )}
                {log.duration && (
                  <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                    <Clock size={10} />
                    {log.duration}ms
                  </div>
                )}
                {log.cost !== undefined && log.cost > 0 && (
                  <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md">
                    <DollarSign size={10} />
                    ${log.cost.toFixed(4)}
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Prompt Sent */}
              <div>
                <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Prompt Sent
                </h5>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {log.payload?.prompt || (log.payload ? JSON.stringify(log.payload, null, 2) : 'No prompt data')}
                  </pre>
                </div>
              </div>

              {/* Response Returned */}
              {log.type !== 'request' && (
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      log.type === 'error' ? "bg-red-400" : "bg-emerald-400"
                    )} />
                    {log.type === 'error' ? 'Error Returned' : 'Response Returned'}
                  </h5>
                  <div className={clsx(
                    "rounded-2xl p-6 border",
                    log.type === 'error' 
                      ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300" 
                      : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  )}>
                    {log.endpoint?.toLowerCase().includes('avatar') && log.response?.url ? (
                      <div className="flex justify-center py-2">
                        <div className="w-64 h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                          <img src={log.response.url} alt="Raw API Response" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    ) : (
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {log.response?.raw || (typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2))}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden border-l border-slate-200 dark:border-slate-800 transition-colors">
      <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <MessageSquareCode size={20} className="text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-lg tracking-tight">Agent Console</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {Object.entries(discoveredProfiles)
              .filter(([name]) => name !== 'Moderator')
              .map(([name, profile]) => (
                <div 
                  key={name} 
                  className={clsx(
                    "w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm transition-all duration-500",
                    onPanelistClick && profile.id && "cursor-pointer hover:border-primary/50"
                  )}
                  title={name}
                  onClick={() => {
                    if (onPanelistClick) {
                      const fullPanelist = panelists?.find(p => p.id === profile.id || p.firstName === name);
                      if (fullPanelist) onPanelistClick(fullPanelist);
                    }
                  }}
                >
                  {profile.avatarUrl ? (
                    <AutoCroppedImage src={profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800" style={{ backgroundColor: profile.color ? `${getColorHex(profile.color)}20` : undefined }}>
                      <User className="w-5 h-5" style={{ color: getColorHex(profile.color) }} />
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div 
            onClick={() => setMode(prev => prev === 'info' ? 'prompt' : 'info')}
            title={`Switch to ${mode === 'info' ? 'Prompt' : 'Info'} Mode`}
            className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
              mode === 'info' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-500"
            )}>
              <Info size={18} />
            </div>
            <div className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
              mode === 'prompt' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-500"
            )}>
              <FileText size={18} />
            </div>
          </div>
        </div>
      </div>

      {mode === 'prompt' ? renderPromptMode() : (
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6"
        >
        {(!logs || logs.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 italic space-y-4 text-center py-20">
            <MessageSquareCode size={64} className="text-slate-300 animate-pulse" />
            <p className="text-lg">System idle. Start a discussion to see agent activity.</p>
          </div>
        )}

        {/* Conversation Logs - Oldest First */}
        {logs && Array.isArray(logs) && [...logs].sort((a, b) => a.timestamp - b.timestamp).map((log) => {
          if (!log) return null;
          const endpoint = log.endpoint || '';
          
          // Skip requests and non-card endpoints as per cleanup request
          if (log.type === 'request') return null;
          if (endpoint.includes('Panelist Assembly') || endpoint.includes('Avatar') || endpoint.includes('Banned Speech')) return null;

          return (
            <div key={log.id} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              {/* Main Entry Container */}
              <div className="space-y-6">
                <div className="relative">
                  <div className="pl-0 space-y-8">
                    {/* Response Display */}
                    {log.response && renderResponse(log)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
