import test from 'node:test';
import assert from 'node:assert/strict';

import {
  POSE_FRAMES,
  frameForMood,
} from './petAnimation.js';

test('every mood has four concrete animation frames', () => {
  for (const [mood, frames] of Object.entries(POSE_FRAMES)) {
    assert.equal(frames.length, 4, mood);
    assert.equal(new Set(frames).size, 4, mood);
  }
});

test('active moods traverse four frames and return without a hard jump', () => {
  const sequence = Array.from({ length: 7 }, (_, tick) => frameForMood('happy', tick));

  assert.deepEqual(sequence, [
    'happy_A',
    'happy_B',
    'happy_C',
    'happy_D',
    'happy_C',
    'happy_B',
    'happy_A',
  ]);
});

test('idle stays open between short four-frame blinks', () => {
  const sequence = Array.from({ length: 25 }, (_, tick) => frameForMood('idle', tick));

  assert.deepEqual(sequence.slice(0, 19), Array(19).fill('idle_A'));
  assert.deepEqual(sequence.slice(19), [
    'idle_B',
    'idle_C',
    'idle_D',
    'idle_C',
    'idle_B',
    'idle_A',
  ]);
});

test('unknown moods fall back to idle', () => {
  assert.equal(frameForMood('unknown', 0), 'idle_A');
});
