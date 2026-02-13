export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Message {
  messageId: string;
  userId: string;
  reactions: Reaction[];
}