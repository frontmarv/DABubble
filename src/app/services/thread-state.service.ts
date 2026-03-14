import { Injectable, inject, signal } from '@angular/core';
import { collection, getCountFromServer, increment, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch, Unsubscribe } from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import { Message } from '../models/message.class';
import { User } from '../models/user.class';

@Injectable({ providedIn: 'root' })
export class ThreadStateService {
  private firebaseService = inject(FirebaseService);

  isThreadVisible = signal(false);
  parentMessage = signal<Message | null>(null);
  parentContextName = signal<string>('');
  threadMessages = signal<Message[]>([]);
  users = signal<Record<string, User>>({});
  completeDBPathOfThread = signal<string>('');
  private parentMsgPath = signal<string | null>(null);
  private unsubThread: Unsubscribe | null = null;
  private unsubParent: Unsubscribe | null = null;

  getThreadAnswersAndTime() { }

  async doesThreadAlreadyExist(message: Message, basePath: string | null): Promise<{ exists: boolean, count: number }> {
    const msgPath = `${basePath}/messages/${message.id}`;
    const threadsRef = collection(this.firebaseService.firestore, `${msgPath}/threads`);

    try {
      const snapshot = await getCountFromServer(threadsRef);
      const count = snapshot.data().count;
      return {
        exists: count > 0,
        count: count
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Thread-Anzahl:', error);
      return { exists: false, count: 0 };
    }
  }

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

  async sendThreadReply(text: string): Promise<void> {
    const msgPath = this.parentMsgPath();
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (!msgPath || !currentUid || !text.trim()) return;
    await this.commitReply(msgPath, currentUid, text.trim());
  }

  destroy(): void {
    this.unsubThread?.();
    this.unsubThread = null;
    this.unsubParent?.();
    this.unsubParent = null;
  }

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

  private setThreadContext(message: Message, msgPath: string, contextName: string): void {
    this.parentMsgPath.set(msgPath);
    this.parentMessage.set(message);
    this.parentContextName.set(contextName);
  }

  private async commitReply(msgPath: string, uid: string, text: string): Promise<void> {
    const batch = writeBatch(this.firebaseService.firestore);
    const parentRef = doc(this.firebaseService.firestore, msgPath);
    const replyRef = doc(collection(this.firebaseService.firestore, msgPath, 'threads'));
    batch.set(replyRef, {
      senderId: uid,
      text,
      createdAt: serverTimestamp(),
      reactions: {}
    });
    batch.update(parentRef, {
      lastReplyAt: serverTimestamp(),
      replyCount: increment(1)
    });
    await batch.commit();
  }

  private subscribeToThreadMessages(msgPath: string): void {
    this.unsubThread?.();
    this.threadMessages.set([]);
    const q = query(
      collection(this.firebaseService.firestore, msgPath, 'threads'),
      orderBy('createdAt', 'asc')
    );

    this.unsubThread = onSnapshot(q, (snapshot) => this.handleThreadSnapshot(snapshot));
  }

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

  private async loadMissingUsers(uids: Set<string>): Promise<void> {
    for (const uid of uids) {
      const user = await this.firebaseService.getSingleUser(uid);
      if (user) this.users.update((cache) => ({ ...cache, [uid]: user }));
    }
  }
}