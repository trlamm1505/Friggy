import React from 'react';
import * as CountUpPkg from 'react-countup';
import CountUpDefault from 'react-countup';

// Safely resolve the CountUp component from react-countup library across ESM/CJS bundlers
const resolveCountUpComponent = () => {
  const candidates = [
    CountUpDefault?.default?.default,
    CountUpDefault?.default,
    CountUpDefault,
    CountUpPkg?.default?.default,
    CountUpPkg?.default,
    CountUpPkg?.CountUp,
  ];

  for (const c of candidates) {
    if (!c) continue;
    // Check if it's a function (functional/class component) or a React element object (memo/forwardRef)
    if (typeof c === 'function' || (typeof c === 'object' && (c.$$typeof || typeof c.render === 'function'))) {
      return c;
    }
  }
  return null;
};

const CountUp = resolveCountUpComponent();

export const AnimatedCounter = ({
  end = 0,
  target,
  duration = 1.8,
  separator = '.',
  prefix = '',
  suffix = '',
  decimals = 0,
  delay = 0,
  className = '',
}) => {
  const finalValue = target !== undefined ? target : end;
  const numericEnd = typeof finalValue === 'number'
    ? finalValue
    : parseFloat(String(finalValue).replace(/[^0-9.-]+/g, '')) || 0;

  if (CountUp) {
    return (
      <CountUp
        start={0}
        end={numericEnd}
        duration={duration}
        separator={separator}
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
        delay={delay}
        className={className}
      />
    );
  }

  // Fallback rendering in case library is unavailable
  return (
    <span className={className}>
      {prefix}
      {numericEnd.toLocaleString('vi-VN')}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;


