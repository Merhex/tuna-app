import { describe, expect, it } from 'vitest';
import { wrap } from './postcard';

// Every character is 10 wide.
const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) as TextMetrics };

describe('postcard text', () => {
  it('wraps at the width', () => {
    expect(wrap(ctx, 'Greetings from the open sea!', 150)).toEqual(['Greetings from', 'the open sea!']);
  });

  it('never leaves a one-letter word at the end of a line', () => {
    const lines = wrap(ctx, 'Háček odplul s prázdnou.', 140);
    expect(lines).toEqual(['Háček odplul', 's prázdnou.']);
  });
});
