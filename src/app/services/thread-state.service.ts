import { Injectable, inject, signal } from '@angular/core';
import {
  collection, doc, onSnapshot, orderBy,
  query, serverTimestamp, writeBatch, Unsubscribe
} from '@angular/fire/firestore';
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

  private parentMsgPath = signal<string | null>(null);

  private unsubThread: Unsubscribe | null = null;
  
  openThread(message: Message, basePath: string, contextName: string): void {
    if (!message.id) return;

    const msgPath = `${basePath}/messages/${message.id}`;
    this.parentMsgPath.set(msgPath);
    this.parentMessage.set(message);
    this.parentContextName.set(contextName);

    this.subscribeToThreadMessages(msgPath);
    this.isThreadVisible = signal(true); 
    this.setVisible();
  }

  setVisible()  { this.isThreadVisible.set(true);  }
  setHidden()   { this.isThreadVisible.set(false); }

  async sendThreadReply(text: string): Promise<void> {
    const msgPath   = this.parentMsgPath();
    const currentUid = this.firebaseService.currentUser()?.uid;
    if (!msgPath || !currentUid || !text.trim()) return;

    const batch      = writeBatch(this.firebaseService.firestore);
    const parentRef  = doc(this.firebaseService.firestore, msgPath);
    const replyRef   = doc(collection(this.firebaseService.firestore, msgPath, 'threads'));

    batch.set(replyRef, {
      senderId:  currentUid,
      text:      text.trim(),
      createdAt: serverTimestamp(),
      reactions: {}
    });

    batch.update(parentRef, {
      lastReplyAt: serverTimestamp()
    });

    await batch.commit();
  }


  private subscribeToThreadMessages(msgPath: string): void {
    this.unsubThread?.();
    this.unsubThread = null;
    this.threadMessages.set([]);

    const threadsRef = collection(this.firebaseService.firestore, msgPath, 'threads');
    const q          = query(threadsRef, orderBy('createdAt', 'asc'));

    this.unsubThread = onSnapshot(q, (snapshot) => {
      const msgs: Message[]      = [];
      const missingUids          = new Set<string>();

      snapshot.forEach((docSnap) => {
        const msg = new Message({ id: docSnap.id, ...docSnap.data() });
        msgs.push(msg);
        if (!this.users()[msg.senderId]) missingUids.add(msg.senderId);
      });

      this.loadMissingUsers(missingUids);
      this.threadMessages.set(msgs);
    });
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
    this.unsubThread?.();
    this.unsubThread = null;
  }
}