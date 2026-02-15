
export interface LoreMessage {
  id: string;
  text: string;
  timestamp: string;
}

export enum MenuState {
  MAIN = 'MAIN',
  NEW_GAME = 'NEW_GAME',
  CONTINUE = 'CONTINUE',
  OPTIONS = 'OPTIONS'
}
