export const POSE_FRAMES = {
  idle: ['idle_A', 'idle_B', 'idle_C', 'idle_D'],
  happy: ['happy_A', 'happy_B', 'happy_C', 'happy_D'],
  sad: ['sad_A', 'sad_B', 'sad_C', 'sad_D'],
  sleeping: ['sleep_A', 'sleep_B', 'sleep_C', 'sleep_D'],
  eating: ['eat_A', 'eat_B', 'eat_C', 'eat_D'],
  drinking: ['drink_A', 'drink_B', 'drink_C', 'drink_D'],
  playing: ['play_A', 'play_B', 'play_C', 'play_D'],
  toilet: ['toilet_A', 'toilet_B', 'toilet_C', 'toilet_D'],
  clean: ['clean_A', 'clean_B', 'clean_C', 'clean_D'],
};

const ACTIVE_SEQUENCE = [0, 1, 2, 3, 2, 1];
const IDLE_SEQUENCE = [1, 2, 3, 2, 1, 0];
const IDLE_HOLD_TICKS = 19;
const IDLE_PERIOD = IDLE_HOLD_TICKS + IDLE_SEQUENCE.length;

export function frameForMood(mood, animTick) {
  const frames = POSE_FRAMES[mood] || POSE_FRAMES.idle;
  const safeTick = Math.max(0, Math.trunc(animTick));

  if (mood === 'idle' || !POSE_FRAMES[mood]) {
    const phase = safeTick % IDLE_PERIOD;
    return phase < IDLE_HOLD_TICKS
      ? frames[0]
      : frames[IDLE_SEQUENCE[phase - IDLE_HOLD_TICKS]];
  }

  return frames[ACTIVE_SEQUENCE[safeTick % ACTIVE_SEQUENCE.length]];
}
