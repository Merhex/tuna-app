import { describe, expect, it } from 'vitest';
import { pickActivity, rememberPick, type Activity } from './activities';

describe('what a brutal hook starts with', () => {
  it('picks either at random', () => {
    expect(pickActivity([], () => 0.1)).toBe('dodge');
    expect(pickActivity([], () => 0.9)).toBe('breathe');
    expect(pickActivity(['dodge', 'breathe'], () => 0.1)).toBe('dodge');
  });

  it('never picks the same one three times in a row', () => {
    expect(pickActivity(['dodge', 'dodge'], () => 0.1)).toBe('breathe');
    expect(pickActivity(['breathe', 'breathe'], () => 0.9)).toBe('dodge');
    let recent: Activity[] = [];
    let run = 0;
    let last: Activity | null = null;
    for (let i = 0; i < 500; i++) {
      const a = pickActivity(recent);
      run = a === last ? run + 1 : 1;
      last = a;
      expect(run).toBeLessThan(3);
      recent = rememberPick(recent, a);
    }
  });

  it('keeps only the last two picks', () => {
    expect(rememberPick(['dodge', 'breathe'], 'dodge')).toEqual(['breathe', 'dodge']);
  });
});
