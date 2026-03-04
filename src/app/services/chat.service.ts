import { inject, Injectable, signal, computed } from '@angular/core';
import { Chat } from '../models/chat.class';
import { User } from '../models/user.class';
import { FirebaseService } from './firebase.service';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  runTransaction,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Message } from '../models/message.class';

type ChatMode = 'dm' | 'channel';

interface ActiveConversation {
  mode: ChatMode;
  id: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  firebaseService = inject(FirebaseService);
  activeConversation = signal<ActiveConversation | null>(null);
  messages = signal<Message[]>([]);
  users = signal<Record<string, User>>({});
  otherUser = signal<User | null>(null);
  private unsubMessages: Unsubscribe | null = null;

  chat = new Chat();
  readonly basePath = computed<string | null>(() => {
    const conv = this.activeConversation();
    if (!conv) return null;

    return conv.mode === 'dm' ? `chats/${conv.id}` : `channels/${conv.id}`;
  });

  readonly chatIsActive = computed<boolean>(() => this.activeConversation() !== null);

  async openChatRoom(user: any): Promise<void> {
    await this.loadOtherUser(user);
    const chatId = this.buildChatId();
    if (!chatId) return;

    if (!this.chatExists(chatId)) {
      await this.createChatDocument(chatId);
    }

    this.activate({ mode: 'dm', id: chatId });
  }

  openChannel(channelId: string): void {
    this.otherUser.set(null);
    this.activate({ mode: 'channel', id: channelId });
  }

  private activate(conv: ActiveConversation): void {
    this.activeConversation.set(conv);
    this.subscribeToMessages();
  }

  private subscribeToMessages(): void {
    this.unsubMessages?.();
    this.unsubMessages = null;
    this.messages.set([]);

    const path = this.basePath();
    if (!path) return;

    const messagesRef = collection(this.firebaseService.firestore, path, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    this.unsubMessages = onSnapshot(q, (snapshot) => {
      this.handleMessagesSnapshot(snapshot);
    });
  }

  private handleMessagesSnapshot(snapshot: any): void {
    const msgs: Message[] = [];
    const missingUids = new Set<string>();

    snapshot.forEach((docSnap: any) => {
      const msg = new Message({ id: docSnap.id, ...docSnap.data() });
      msgs.push(msg);
      if (!this.users()[msg.senderId]) {
        missingUids.add(msg.senderId);
      }
    });

    this.loadMissingUsers(missingUids);
    this.messages.set(msgs);
  }

  async sendMessage(text: string): Promise<void> {
    const path = this.basePath();
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (!path || !currentUid || !text.trim()) return;

    const batch = writeBatch(this.firebaseService.firestore);

    const parentRef = doc(this.firebaseService.firestore, path);
    const messageRef = doc(collection(this.firebaseService.firestore, path, 'messages'));

    batch.set(messageRef, {
      senderId: currentUid,
      text: text.trim(),
      createdAt: serverTimestamp(),
      reactions: {},
    });

    batch.update(parentRef, {
      lastMessage: text.trim(),
      lastMessageAt: serverTimestamp(),
    });

    await batch.commit();
  }

  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const path = this.basePath();
    const userId = this.firebaseService.currentUser()?.uid;
    if (!path || !userId || !messageId || !emoji) return;

    const msgRef = doc(this.firebaseService.firestore, path, 'messages', messageId);

    await runTransaction(this.firebaseService.firestore, async (tx) => {
      const snap = await tx.get(msgRef);
      if (!snap.exists()) return;

      const newReactions = this.calculateNewReactions(snap.data(), emoji, userId);
      tx.update(msgRef, { reactions: newReactions });
    });
  }

  private calculateNewReactions(
    msgData: any,
    emoji: string,
    userId: string
  ): Record<string, string[]> {
    const reactions: Record<string, string[]> = { ...(msgData.reactions ?? {}) };
    const current: string[] = reactions[emoji] ?? [];

    if (current.includes(userId)) {
      const updated = current.filter((id) => id !== userId);
      if (updated.length === 0) {
        const { [emoji]: _, ...rest } = reactions;
        return rest;
      }
      reactions[emoji] = updated;
    } else {
      reactions[emoji] = [...current, userId];
    }

    return reactions;
  }

  private async loadOtherUser(user: any): Promise<void> {
    const userData = await this.firebaseService.getSingleUser(user.uid);
    this.otherUser.set(userData);
  }

  private buildChatId(): string {
    const other = this.otherUser();
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (!other || !currentUid) return '';

    const id = [currentUid, other.uid].sort().join('_');
    this.chat.id = id;
    return id;
  }

  private chatExists(id: string): boolean {
    return !!this.firebaseService.chats.find((c) => c.id === id);
  }

  private async createChatDocument(chatId: string): Promise<void> {
    const currentUid = this.firebaseService.currentUser()?.uid;
    const other = this.otherUser();
    if (!currentUid || !other) return;

    const newChat = new Chat({
      id: chatId,
      participants: [currentUid, other.uid],
      createdAt: new Date(),
      lastMessage: '',
    });

    await this.firebaseService.addChat(newChat);
  }

  private async loadMissingUsers(uids: Set<string>): Promise<void> {
    for (const uid of uids) {
      const user = await this.firebaseService.getSingleUser(uid);
      if (user) {
        this.users.update((cache) => ({ ...cache, [uid]: user }));
      }
    }
  }

  destroy(): void {
    this.unsubMessages?.();
    this.unsubMessages = null;
  }
}
