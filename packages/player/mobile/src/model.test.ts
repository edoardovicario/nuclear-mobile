import { describe, it, expect } from 'vitest';
import { nextIndex, seekTime, toTrack, isTrack } from './model';
describe('mobile model', () => {
  it('advances and repeats only when requested', () => {
    expect(nextIndex(0, 2, false)).toBe(1);
    expect(nextIndex(1, 2, false)).toBeNull();
    expect(nextIndex(1, 2, true)).toBe(0);
    expect(nextIndex(0, 0, true)).toBeNull();
  });
  it('formats time safely', () => {
    expect(seekTime(65.9)).toBe('1:05');
    expect(seekTime(Infinity)).toBe('0:00');
  });
  it('maps Archive metadata to the original Nuclear track model', () => {
    const t = toTrack({id:'record/file.mp3',title:'Song',artist:'Artist',url:'https://archive.org/download/record/file.mp3',albumId:'record',albumTitle:'Album',license:'https://creativecommons.org/licenses/by/4.0/'});
    expect(t.source.provider).toBe('internet-archive');
    expect(isTrack(t)).toBe(true);
    expect(isTrack({...t, streamUrl:'javascript:alert(1)'})).toBe(false);
  });
});
