import { inject, Injectable, signal, computed } from '@angular/core';
import { Chat } from '../models/chat.class';
import { User } from '../models/user.class';
import { FirebaseService } from './firebase.service';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp, 
  writeBatch, 
  runTransaction, 
  Unsubscribe 
} from '@angular/fire/firestore';
import { Message } from '../models/message.class';
import { editOldMessageService } from './editOldMessage-service';
import { ThreadStateService } from './thread-state.service';

type ChatMode = 'dm' | 'channel';
interface ActiveConversation { mode: ChatMode; id: string; }

/**
 * Service handling real-time messaging, direct message room creation,
 * and reaction management for both channels and private chats.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private firebaseService = inject(FirebaseService);
  editOldMessageSerivce = inject(editOldMessageService);
  threadService = inject(ThreadStateService);

  /** Signal containing the current active chat context (mode and ID). */
  activeConversation = signal<ActiveConversation | null>(null);
  /** Signal containing the list of messages for the active conversation. */
  messages = signal<Message[]>([]);
  /** Local cache for user objects to avoid redundant database lookups. */
  users = signal<Record<string, User>>({});
  /** Signal holding the chat partner's user object in DM mode. */
  otherUser = signal<User | null>(null);

  private chat = new Chat();
  private unsubMessages: Unsubscribe | null = null;

  /**
   * Computed path used to reference the correct Firestore collection 
   * based on the active conversation mode.
   */
  readonly basePath = computed<string | null>(() => {
    const conv = this.activeConversation();
    if (!conv) return null;
    return conv.mode === 'dm' ? `chats/${conv.id}` : `channels/${conv.id}`;
  });

  /** Simple computed check to see if a conversation is selected. */
  readonly chatIsActive = computed<boolean>(() => this.activeConversation() !== null);

  /**
   * Opens a direct message room. Initializes user data, builds the chat ID,
   * ensures the document exists, and activates the message listener.
   * @param user - The target user object for the DM.
   */
  async openChatRoom(user: any): Promise<void> {
    this.firebaseService.setSelectedChannel('');
    this.editOldMessageSerivce.clearEditMessage();
    await this.loadOtherUser(user);
    const chatId = this.buildChatId();
    if (!chatId) return;
    if (!this.chatExists(chatId)) await this.createChatDocument(chatId);
    this.activate({ mode: 'dm', id: chatId });
  }

  /**
   * Switches the chat context to a channel.
   * @param channelId - Unique ID of the channel.
   */
  openChannel(channelId: string): void {
    this.otherUser.set(null);
    this.activate({ mode: 'channel', id: channelId });
  }

  /**
   * Validates and commits a new message to the current active path.
   * @param text - Message content string.
   */
  async sendMessage(text: string): Promise<void> {
    const path = this.basePath();
    const uid = this.firebaseService.currentUser()?.uid;
    if (!path || !uid || !text.trim()) return;
    await this.commitMessage(path, uid, text.trim());
  }

  /**
   * Toggles an emoji reaction on a message using a Firestore Transaction 
   * to ensure atomic updates for multi-user interactions.
   * @param messageId - ID of the message to react to.
   * @param emoji - The emoji character or key.
   * @param typeOfChat - Context indicator ('thread' or main chat).
   */
  async toggleReaction(messageId: string, emoji: string | number | symbol, typeOfChat: string): Promise<void> {
    const path = typeOfChat === 'thread'
      ? this.threadService.completeDBPathOfThread()
      : this.basePath();
    const userId = this.firebaseService.currentUser()?.uid;
    if (!path || !userId || !messageId || !emoji) return;
    
    const subCollection = typeOfChat === 'thread' ? 'threads' : 'messages';
    const messageRef = doc(this.firebaseService.firestore, path, subCollection, messageId);
    
    await runTransaction(this.firebaseService.firestore, async (tx) => {
      const snap = await tx.get(messageRef);
      if (!snap.exists()) return;
      tx.update(messageRef, {
        reactions: this.calculateNewReactions(snap.data(), emoji, userId)
      });
    });
  }

  /**
   * Cleans up the active message subscription.
   */
  destroy(): void {
    this.unsubMessages?.();
    this.unsubMessages = null;
  }

  /**
   * Sets the active conversation signal and triggers the message subscription.
   */
  private activate(conv: ActiveConversation): void {
    this.activeConversation.set(conv);
    this.subscribeToMessages();
  }

  /**
   * Subscribes to the Firestore 'messages' subcollection for the active path.
   * Sorts messages by creation timestamp.
   */
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

  /**
   * Processes the message snapshot, maps to Message classes, and 
   * identifies sender UIDs missing from the local cache.
   */
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

  /**
   * Commits a message using writeBatch. Updates both the message 
   * collection and the parent document (lastMessage preview).
   */
  private async commitMessage(path: string, uid: string, text: string): Promise<void> {
    const batch = writeBatch(this.firebaseService.firestore);
    const messageRef = doc(collection(this.firebaseService.firestore, path, 'messages'));
    const parentRef = doc(this.firebaseService.firestore, path);

    batch.set(messageRef, { senderId: uid, text, createdAt: serverTimestamp(), reactions: {} });
    batch.update(parentRef, { lastMessage: text, lastMessageAt: serverTimestamp() });
    await batch.commit();
  }

  /**
   * Pure logic to add or remove a userId from an emoji's reaction list.
   * @returns {Record<string, string[]>} The updated reactions object.
   */
  private calculateNewReactions(msgData: any, emoji: string | number | symbol, userId: string): Record<string, string[]> {
    const emojiKey = String(emoji);
    const reactions: Record<string, string[]> = { ...(msgData.reactions ?? {}) };
    const current: string[] = reactions[emojiKey] ?? [];

    if (current.includes(userId)) {
      const updated = current.filter((id) => id !== userId);
      if (updated.length === 0) { 
        const { [emojiKey]: _, ...rest } = reactions; 
        return rest; 
      }
      reactions[emojiKey] = updated;
    } else {
      reactions[emojiKey] = [...current, userId];
    }
    return reactions;
  }

  /** Fetches specific user data for the DM chat partner. */
  private async loadOtherUser(user: any): Promise<void> {
    const userData = await this.firebaseService.getSingleUser(user.uid);
    this.otherUser.set(userData);
  }

  /**
   * Generates a sorted, deterministic ID for private chats based on both UIDs.
   */
  private buildChatId(): string {
    const other = this.otherUser();
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (!other || !currentUid) return '';
    const id = [currentUid, other.uid].sort().join('_');
    this.chat.id = id;
    return id;
  }

  /** Checks if a chat document already exists in the local cache. */
  private chatExists(id: string): boolean {
    return !!this.firebaseService.chats.find((c) => c.id === id);
  }

  /** Creates a new 'chat' document in Firestore for a DM room. */
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

  /**
   * Iterates through missing UIDs, fetches user data, and updates local cache signal.
   */
  private async loadMissingUsers(uids: Set<string>): Promise<void> {
    for (const uid of uids) {
      const user = await this.firebaseService.getSingleUser(uid);
      if (user) this.users.update((cache) => ({ ...cache, [uid]: user }));
    }
  }

  /**
   * Updates the text of an existing message (edit mode).
   * @param text - New message content.
   * @param typeOfChat - Context of the message ('thread' or main).
   */
  async updateOldMessage(text: string, typeOfChat: string): Promise<void> {
    const messageId = this.editOldMessageSerivce.currentMessageId();
    const cleanText = text.trim();
    if (!messageId || !cleanText) return;
    const path = typeOfChat === 'thread' ? this.threadService.completeDBPathOfThread() : this.basePath();
    if (!path) return;
    
    const subCollection = typeOfChat === 'thread' ? 'threads' : 'messages';
    const messageRef = doc(this.firebaseService.firestore, path, subCollection, messageId);
    try {
      await updateDoc(messageRef, { text: cleanText });
      this.editOldMessageSerivce.clearEditMessage();
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }
}