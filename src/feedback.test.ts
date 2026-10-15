import { describe, expect, it } from 'vitest';
import { beatsToPattern } from './feedback';

describe('beatsToPattern', () => {
  it('turns beats into vibrate on/off durations', () => {
    // The hook drop: whoosh, splash, three bubbles.
    expect(beatsToPattern([[0, 25], [300, 45], [450, 12], [550, 12], [680, 12]])).toEqual([25, 275, 45, 105, 12, 88, 12, 118, 12]);
  });
  it('starts with a pause when the first beat is late', () => {
    expect(beatsToPattern([[120, 15]])).toEqual([0, 120, 15]);
  });
  it('sorts beats and never produces negative gaps', () => {
    expect(beatsToPattern([[50, 10], [0, 80]])).toEqual([80, 0, 10]);
  });
});
