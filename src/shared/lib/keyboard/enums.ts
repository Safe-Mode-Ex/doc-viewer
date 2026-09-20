export const Key = {
  ENTER: 'Enter',
  ESC: 'Escape',
  SPACE: ' ',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
} as const;

export type Key = (typeof Key)[keyof typeof Key];
