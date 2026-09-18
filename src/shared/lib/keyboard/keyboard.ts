import { Key } from './enums';

export function isEnterKey(eventKey: string) {
  return eventKey === Key.ENTER;
}

export function isEscKey(eventKey: string) {
  return eventKey === Key.ESC;
}
