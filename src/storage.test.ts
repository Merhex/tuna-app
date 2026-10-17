import { describe, expect, it } from 'vitest';
import { makeBackup, parseBackup } from './storage';

const backup = (extra: object) => JSON.stringify({ app: 'off-the-hook', schemaVersion: 1, ...extra });

describe('storage', () => {
  it('moves the quit date out of an old treasure (D44)', () => {
    const rates = [{ from: '2026-10-02T10:00:00.000Z', perWeek: 300 }];
    const data = parseBackup(backup({ treasure: { startDate: '2026-10-01', rates } }));
    expect(data.quitDate).toBe('2026-10-01');
    expect(data.treasure).toEqual({ rates });
  });

  it('has no quit date in an old backup without a treasure, so the app asks', () => {
    const data = parseBackup(backup({ treasure: null }));
    expect(data.quitDate).toBeNull();
    expect(data.treasure).toBeNull();
    expect(data.seabed).toEqual({ earned: {}, coralMonths: 0 });
  });

  it('keeps the quit date and the seabed through a backup and restore', () => {
    const data = parseBackup(backup({}));
    data.quitDate = '2026-09-20';
    data.seabed = { earned: { 'quit-day': { earnedAt: '2026-09-20T08:00:00.000Z', seen: true } }, coralMonths: 0 };
    const restored = parseBackup(makeBackup(data));
    expect(restored.quitDate).toBe('2026-09-20');
    expect(restored.seabed).toEqual(data.seabed);
  });

  it('keeps rounds of Net Packing and School Tracker through a backup, and loads older hooks without them untouched', () => {
    const old = {
      id: '1',
      startedAt: '2026-10-01T10:00:00.000Z',
      endedAt: '2026-10-01T10:05:00.000Z',
      before: 9,
      after: 5,
      cards: [],
      completed: [],
      rounds: 1,
      breaths: 12,
      result: 'passed' as const,
    };
    const data = parseBackup(backup({ hooks: [old] }));
    expect(data.hooks).toEqual([old]);
    const { rounds: _r, breaths: _b, ...plain } = old;
    data.hooks.push({ ...plain, id: '2', packs: 2, tracks: 1 });
    const restored = parseBackup(makeBackup(data));
    expect(restored.hooks[0]).toEqual(old);
    expect(restored.hooks[1]).toMatchObject({ packs: 2, tracks: 1 });
  });

  it('starts counting pets at zero for old backups, and keeps the count through a restore (D49)', () => {
    const data = parseBackup(backup({}));
    expect(data.pets).toBe(0);
    data.pets = 128;
    expect(parseBackup(makeBackup(data)).pets).toBe(128);
  });
});
