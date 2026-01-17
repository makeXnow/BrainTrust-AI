import React, { useState, useEffect, useMemo } from 'react';
import { 
  Microscope, 
  Scale, 
  Telescope, 
  GraduationCap, 
  Stethoscope, 
  Hammer, 
  ChefHat, 
  BookOpen, 
  Trophy, 
  ConciergeBell, 
  Truck, 
  Bot 
} from 'lucide-react';

const originalIcons = [
  { component: Microscope, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { component: Scale, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { component: Telescope, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
  { component: GraduationCap, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  { component: Stethoscope, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
  { component: Hammer, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { component: ChefHat, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { component: BookOpen, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
  { component: Trophy, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  { component: ConciergeBell, color: 'text-zinc-500', bg: 'bg-zinc-100', border: 'border-zinc-200' },
  { component: Truck, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  { component: Bot, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200' },
];

export const AssemblingBrainTrust: React.FC = () => {
  // Shuffle icons once on initial render
  const shuffledIcons = useMemo(() => {
    return [...originalIcons].sort(() => Math.random() - 0.5);
  }, []);

  const [index, setIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Icon rotation logic 
  // Stays on each icon for 3000ms (30% less than previous 4400ms)
  useEffect(() => {
    if (shuffledIcons.length === 0) return;
    
    const interval = setInterval(() => {
      setIsExiting(true);
      
      // Snappy 300ms exit transition (Original speed)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % shuffledIcons.length);
        setIsExiting(false);
      }, 300); 
    }, 3000);

    return () => clearInterval(interval);
  }, [shuffledIcons.length]);

  if (shuffledIcons.length === 0) return null;
  
  const current = shuffledIcons[index] || shuffledIcons[0];
  if (!current) return null;
  
  const IconComponent = current.component;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 overflow-hidden animate-in fade-in duration-700">
      <div className="relative flex flex-col items-center">
        
        {/* Main Icon Container */}
        <div 
          className={`
            w-32 h-32 flex items-center justify-center rounded-3xl border-4 
            transition-all duration-500 ease-in-out
            ${current.bg} ${current.border}
            ${isExiting ? 'scale-75 opacity-0 -rotate-45' : 'scale-100 opacity-100 rotate-0'}
          `}
        >
          <div className={`transition-all duration-500 ${isExiting ? 'scale-0' : 'scale-110'}`}>
            <IconComponent 
              size={56} 
              className={`${current.color} animate-bounce-custom`} 
              strokeWidth={2.5}
            />
          </div>
          
          {/* Pulsing Ring Effect */}
          <div className={`absolute inset-0 rounded-3xl border-2 animate-ping opacity-20 ${current.border}`} />
        </div>

        {/* Loading Text */}
        <div className="mt-8 h-8 flex items-center justify-center">
          <p 
            className={`
              text-xl font-bold tracking-tight transition-colors duration-500 animate-pulse-custom
              ${current.color}
            `}
          >
            Assembling the BrainTrust
          </p>
        </div>

        {/* Dynamic Background Glow */}
        <div 
          className={`
            absolute -z-10 w-64 h-64 blur-[80px] rounded-full transition-colors duration-1000 opacity-40
            ${current.bg}
          `}
        />
      </div>

      <style>{`
        @keyframes bounce-custom {
          0%, 100% { transform: translateY(-8%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        @keyframes pulse-custom {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.98); }
        }
        /* Original fast animation speeds: bounce 0.8s, pulse 2s */
        .animate-bounce-custom {
          animation: bounce-custom 0.8s infinite;
        }
        .animate-pulse-custom {
          animation: pulse-custom 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
