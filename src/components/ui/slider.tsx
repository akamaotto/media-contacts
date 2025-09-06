'use client';

import React from 'react';

export interface SliderProps {
  value: [number];
  onValueChange?: (values: [number]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

// Minimal Slider component backed by a native range input.
// Matches the common shadcn-like API used in the app (value as [number], onValueChange returns number[]).
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
}: SliderProps) {
  const current = Array.isArray(value) && value.length > 0 ? value[0] : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    onValueChange?.([v]);
  };

  return (
    <input
      type="range"
      className={className}
      min={min}
      max={max}
      step={step}
      value={current}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}

export default Slider;
