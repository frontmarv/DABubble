import { inject, Injectable, signal, computed } from '@angular/core';
import { Chat } from '../models/chat.class';
import { User } from '../models/user.class';
import { FirebaseService } from './firebase.service';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch, runTransaction, Unsubscribe } from '@angular/fire/firestore';
import { Message } from '../models/message.class';

type ChatMode = 'dm' | 'channel';
interface ActiveConversation { mode: ChatMode; id: string; }

@Injectable({ providedIn: 'root' })
export class ChatService {
  private firebaseService = inject(FirebaseService);

  activeConversation = signal<ActiveConversation | null>(null);
  messages = signal<Message[]>([]);
  users = signal<Record<string, User>>({});
  otherUser = signal<User | null>(null);

  private chat = new Chat();
  private unsubMessages: Unsubscribe | null = null;

  readonly basePath = computed<string | null>(() => {
    const conv = this.activeConversation();
    if (!conv) return null;
    return conv.mode === 'dm' ? `chats/${conv.id}` : `channels/${conv.id}`;
  });

  readonly chatIsActive = computed<boolean>(() => this.activeConversation() !== null);

  async openChatRoom(user: any): Promise<void> {
    this.firebaseService.setSelectedChannel('');
    await this.loadOtherUser(user);
    const chatId = this.buildChatId();
    if (!chatId) return;
    if (!this.chatExists(chatId)) await this.createChatDocument(chatId);
    this.activate({ mode: 'dm', id: chatId });
  }

  openChannel(channelId: string): void {
    this.otherUser.set(null);
    this.activate({ mode: 'channel', id: channelId });
  }

  async sendMessage(text: string): Promise<void> {
    const path = this.basePath();
    const uid = this.firebaseService.currentUser()?.uid;
    if (!path || !uid || !text.trim()) return;
    await this.commitMessage(path, uid, text.trim());
  }

  async toggleReaction(messageId: string, emoji: string | number | symbol): Promise<void> {
    const path = this.basePath();
    const userId = this.firebaseService.currentUser()?.uid;
    if (!path || !userId || !messageId || !emoji) return;
    const msgRef = doc(this.firebaseService.firestore, path, 'messages', messageId);
    await runTransaction(this.firebaseService.firestore, async (tx) => {
      const snap = await tx.get(msgRef);
      if (!snap.exists()) return;
      tx.update(msgRef, { reactions: this.calculateNewReactions(snap.data(), emoji, userId) });
    });
  }

  destroy(): void {
    this.unsubMessages?.();
    this.unsubMessages = null;
  }

  private activate(conv: ActiveConversation): void {
    this.activeConversation.set(conv);
    this.subscribeToMessages();
  }

  private subscribeToMessages(): void {
    this.unsubMessages?.();
    this.messages.set([]);
    const path = this.basePath();
    if (!path) return;

    const q = query(
      collection(this.firebaseService.firestore, path, 'messages'),
      orderBy('createdAt', 'asc')
    );
    this.unsubMessages = onSnapshot(q, (snap) => this.handleMessagesSnapshot(snap));
  }

  private handleMessagesSnapshot(snapshot: any): void {
    const msgs: Message[] = [];
    const missingUids = new Set<string>();

    snapshot.forEach((docSnap: any) => {
      const msg = new Message({ id: docSnap.id, ...docSnap.data() });
      msgs.push(msg);
      if (!this.users()[msg.senderId]) missingUids.add(msg.senderId);
    });

    this.loadMissingUsers(missingUids);
    this.messages.set(msgs);
  }

  private async commitMessage(path: string, uid: string, text: string): Promise<void> {
    const batch = writeBatch(this.firebaseService.firestore);
    const messageRef = doc(collection(this.firebaseService.firestore, path, 'messages'));
    const parentRef = doc(this.firebaseService.firestore, path);

    batch.set(messageRef, { senderId: uid, text, createdAt: serverTimestamp(), reactions: {} });
    batch.update(parentRef, { lastMessage: text, lastMessageAt: serverTimestamp() });
    await batch.commit();
  }

private calculateNewReactions(msgData: any, emoji: string | number | symbol, userId: string): Record<string, string[]> {
    const emojiKey = String(emoji);
    const reactions: Record<string, string[]> = { ...(msgData.reactions ?? {}) };
    const current: string[] = reactions[emojiKey] ?? [];

    if (current.includes(userId)) {
      const updated = current.filter((id) => id !== userId);
      if (updated.length === 0) { const { [emojiKey]: _, ...rest } = reactions; return rest; }
      reactions[emojiKey] = updated;
    } else {
      reactions[emojiKey] = [...current, userId];
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
    await this.firebaseService.addChat(new Chat({
      id: chatId,
      participants: [currentUid, other.uid],
      createdAt: new Date(),
      lastMessage: '',
    }));
  }

  private async loadMissingUsers(uids: Set<string>): Promise<void> {
    for (const uid of uids) {
      const user = await this.firebaseService.getSingleUser(uid);
      if (user) this.users.update((cache) => ({ ...cache, [uid]: user }));
    }
  }
}