import { Injectable, signal, inject } from '@angular/core';
import { 
  collection, 
  getCountFromServer, 
  increment, 
  doc, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp, 
  writeBatch, 
  Unsubscribe 
} from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import { Message } from '../models/message.class';
import { User } from '../models/user.class';

/**
 * Service responsible for managing the state of message threads.
 * Handles visibility, parent message tracking, and real-time synchronization 
 * of thread replies.
 */
@Injectable({ providedIn: 'root' })
export class ThreadStateService {
  private firebaseService = inject(FirebaseService);

  /** Signal indicating whether the thread panel is currently visible in the UI. */
  isThreadVisible = signal(false);
  /** Signal holding the parent message that started the thread. */
  parentMessage = signal<Message | null>(null);
  /** Signal holding the name of the channel or chat where the thread originated. */
  parentContextName = signal<string>('');
  /** Signal containing the list of all reply messages within the active thread. */
  threadMessages = signal<Message[]>([]);
  /** Local cache for user objects involved in the current thread. */
  users = signal<Record<string, User>>({});
  /** Signal storing the full Firestore path to the current thread's parent message. */
  completeDBPathOfThread = signal<string>('');

  private parentMsgPath = signal<string | null>(null);
  private unsubThread: Unsubscribe | null = null;
  private unsubParent: Unsubscribe | null = null;

  /**
   * Checks if a specific message already has an associated thread in Firestore.
   * @param message - The potential parent message.
   * @param basePath - The base collection path (chats or channels).
   * @returns {Promise<{exists: boolean, count: number}>} Thread presence and reply count.
   */
  async doesThreadAlreadyExist(message: Message, basePath: string | null): Promise<{ exists: boolean, count: number }> {
    const msgPath = `${basePath}/messages/${message.id}`;
    const threadsRef = collection(this.firebaseService.firestore, `${msgPath}/threads`);

    try {
      const snapshot = await getCountFromServer(threadsRef);
      const count = snapshot.data().count;
      return { exists: count > 0, count: count };
    } catch (error) {
      console.error('Error fetching thread count:', error);
      return { exists: false, count: 0 };
    }
  }

  /**
   * Initializes and opens a thread. Sets up listeners for the parent message
   * and the sub-collection of thread replies.
   * @param message - The message acting as the thread root.
   * @param basePath - The Firestore path to the message's collection.
   * @param contextName - The display name of the origin context.
   */
  openThread(message: Message, basePath: string, contextName: string): void {
    if (!message.id) return;
    const msgPath = `${basePath}/messages/${message.id}`;
    this.setThreadContext(message, msgPath, contextName);
    this.subscribeToParentMessage(msgPath);
    this.subscribeToThreadMessages(msgPath);
    this.isThreadVisible.set(true);
    this.completeDBPathOfThread.set(msgPath);
  }

  setVisible(): void { this.isThreadVisible.set(true); }
  setHidden(): void { this.isThreadVisible.set(false); }

  /**
   * Validates and sends a reply message to the currently active thread.
   * @param text - The content of the reply.
   */
  async sendThreadReply(text: string): Promise<void> {
    const msgPath = this.parentMsgPath();
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (!msgPath || !currentUid || !text.trim()) return;
    await this.commitReply(msgPath, currentUid, text.trim());
  }

  /**
   * Cleans up all active Firestore listeners when the service or component is destroyed.
   */
  destroy(): void {
    this.unsubThread?.();
    this.unsubThread = null;
    this.unsubParent?.();
    this.unsubParent = null;
  }

  /**
   * Sets up a real-time listener for the parent message document to 
   * track metadata changes (like reaction updates or reply counts).
   */
  private subscribeToParentMessage(msgPath: string): void {
    this.unsubParent?.();
    const parentRef = doc(this.firebaseService.firestore, msgPath);
    this.unsubParent = onSnapshot(parentRef, (docSnap) => {
      if (docSnap.exists()) {
        const updatedMessage = { id: docSnap.id, ...docSnap.data() } as Message;
        this.parentMessage.set(updatedMessage);
      }
    });
  }

  /**
   * Internal helper to set signals for the current thread state.
   */
  private setThreadContext(message: Message, msgPath: string, contextName: string): void {
    this.parentMsgPath.set(msgPath);
    this.parentMessage.set(message);
    this.parentContextName.set(contextName);
  }

  /**
   * Uses a Firestore WriteBatch to atomically save the reply message 
   * and increment the reply counter on the parent document.
   */
  private async commitReply(msgPath: string, uid: string, text: string): Promise<void> {
    const batch = writeBatch(this.firebaseService.firestore);
    const parentRef = doc(this.firebaseService.firestore, msgPath);
    const replyRef = doc(collection(this.firebaseService.firestore, msgPath, 'threads'));
    
    batch.set(replyRef, {
      senderId: uid, text, createdAt: serverTimestamp(), reactions: {}
    });
    batch.update(parentRef, {
      lastReplyAt: serverTimestamp(),
      replyCount: increment(1)
    });
    await batch.commit();
  }

  /**
   * Sets up a real-time listener for the 'threads' sub-collection 
   * ordered by creation date.
   */
  private subscribeToThreadMessages(msgPath: string): void {
    this.unsubThread?.();
    this.threadMessages.set([]);
    const q = query(
      collection(this.firebaseService.firestore, msgPath, 'threads'),
      orderBy('createdAt', 'asc')
    );

    this.unsubThread = onSnapshot(q, (snapshot) => this.handleThreadSnapshot(snapshot));
  }

  /**
   * Processes the thread messages snapshot and identifies missing users for the local cache.
   */
  private handleThreadSnapshot(snapshot: any): void {
    const msgs: Message[] = [];
    const missingUids = new Set<string>();

    snapshot.forEach((docSnap: any) => {
      const msg = new Message({ id: docSnap.id, ...docSnap.data() });
      msgs.push(msg);
      if (!this.users()[msg.senderId]) missingUids.add(msg.senderId);
    });

    this.loadMissingUsers(missingUids);
    this.threadMessages.set(msgs);
  }

  /**
   * Fetches user data for UIDs that are not yet present in the local cache signal.
   */
  private async loadMissingUsers(uids: Set<string>): Promise<void> {
    for (const uid of uids) {
      const user = await this.firebaseService.getSingleUser(uid);
      if (user) {
        this.users.update((cache) => ({ ...cache, [uid]: user }));
      }
    }
  }
}