import React from 'react';

interface AgentCountSelectorProps {
  value: number;
  onChange: (count: number) => void;
  disabled?: boolean;
}

export const AgentCountSelector: React.FC<AgentCountSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="form-control w-full max-w-xs">
      <label className="label">
        <span className="label-text">Number of Agents (2-8)</span>
      </label>
      <div className="join">
        {[2, 3, 4, 5, 6, 7, 8].map((count) => (
          <button
            key={count}
            className={`join-item btn btn-sm ${value === count ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange(count)}
            disabled={disabled}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
};
