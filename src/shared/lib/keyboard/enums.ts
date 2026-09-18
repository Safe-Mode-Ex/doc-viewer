export const Key = {
  ENTER: 'Enter',
  ESC: 'Escape',
} as const;

export type Key = (typeof Key)[keyof typeof Key];
