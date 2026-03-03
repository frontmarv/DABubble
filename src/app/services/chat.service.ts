import { inject, Injectable, signal } from "@angular/core";
import { Chat } from "../models/chat.class";
import { User } from "../models/user.class";
import { FirebaseService } from "./firebase.service";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch, runTransaction } from "@angular/fire/firestore"
import { Message } from "../models/message.class";

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    // --- INJECTIONS & STATE ---
    firebaseService = inject(FirebaseService);
    
    chatIsActive = signal(false);
    otherUser = signal<User | null>(null);
    currentUserId = signal<User | null>(null);
    messages = signal<Message[]>([]);
    users = signal<Record<string, User>>({});

    chat = new Chat();
    user = new User();

    // --- CHAT ROOM MANAGEMENT ---

    async openChatRoom(user: any) {
        await this.getOtherUserData(user);
        
        if (this.isChatAvailable(this.createChatId())) {
            this.loadMessages();
        } else {
            await this.createChat();
        }
        
        this.chatIsActive.set(true);
    }

    isChatAvailable(id: string): boolean {
        return !!this.firebaseService.chats.find((c) => c.id === id);
    }

    createChatId(): string {
        const otherUser = this.otherUser();
        const currentUid = this.firebaseService.currentUser()?.uid;
        
        if (!otherUser || !currentUid) return '';
        
        this.chat.id = [currentUid, otherUser.uid].sort().join('_');
        return this.chat.id;
    }

    async createChat() {
        const chatId = this.createChatId();
        const currentUid = this.firebaseService.currentUser()?.uid;
        const otherUser = this.otherUser();
        
        if (!chatId || !currentUid || !otherUser) return;
        
        const newChat = this.buildNewChat(chatId, currentUid, otherUser.uid);
        await this.firebaseService.addChat(newChat);
    }

    private buildNewChat(chatId: string, currentUid: string, otherUid: string): Chat {
        const chat = new Chat();
        chat.id = chatId;
        chat.participants = [currentUid, otherUid];
        chat.createdAt = new Date();
        chat.lastMessage = '';
        return chat;
    }

    async getOtherUserData(user: any) {
        const otherUserInfo = await this.firebaseService.getSingleUser(user.uid);
        this.otherUser.set(otherUserInfo);
    }

    // --- MESSAGE LOADING ---

    loadMessages() {
        if (!this.chat.id) return;
        
        const messagesRef = collection(this.firebaseService.firestore, 'chats', this.chat.id, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        
        onSnapshot(q, (snapshot) => this.handleMessagesSnapshot(snapshot));
    }

    private handleMessagesSnapshot(snapshot: any) {
        const msgs: Message[] = [];
        const missingUserIds = new Set<string>();

        snapshot.forEach((docSnap: any) => {
            const message = new Message({ id: docSnap.id, ...docSnap.data() });
            msgs.push(message);
            this.checkForMissingUser(message.senderId, missingUserIds);
        });

        this.loadMissingUsers(missingUserIds);
        this.messages.set(msgs);
    }

    private checkForMissingUser(senderId: string, missingSet: Set<string>) {
        if (!this.users()[senderId]) {
            missingSet.add(senderId);
        }
    }

    async loadMissingUsers(userIdsToLoad: Set<string>) {
        for (const uid of userIdsToLoad) {
            const user = await this.firebaseService.getSingleUser(uid);
            if (user) {
                this.users.update(users => ({ ...users, [uid]: user }));
            }
        }
    }

    // --- MESSAGE SENDING ---

    async sendMessage(message: string) {
        const currentUid = this.firebaseService.currentUser()?.uid;
        if (!this.chat.id || !currentUid || !message.trim()) return;

        const batch = writeBatch(this.firebaseService.firestore);
        this.addMessageToBatch(batch, this.chat.id, currentUid, message);
        
        await batch.commit();
    }

    private addMessageToBatch(batch: any, chatId: string, currentUid: string, messageText: string) {
        const chatRef = doc(this.firebaseService.firestore, 'chats', chatId);
        const messageRef = doc(collection(this.firebaseService.firestore, 'chats', chatId, 'messages'));

        batch.set(messageRef, {
            senderId: currentUid,
            text: messageText,
            createdAt: serverTimestamp(),
            reactions: {}
        });

        batch.update(chatRef, {
            lastMessage: messageText,
            lastMessageAt: serverTimestamp()
        });
    }

    // --- REACTIONS ---

    async toggleReaction(messageId: string, emoji: string) {
        const userId = this.firebaseService.currentUser()?.uid;
        if (!this.chat.id || !userId || !messageId || !emoji) return;

        const msgRef = doc(this.firebaseService.firestore, 'chats', this.chat.id, 'messages', messageId);

        await runTransaction(this.firebaseService.firestore, async (tx) => {
            const snap = await tx.get(msgRef);
            if (!snap.exists()) return;

            const newReactions = this.calculateNewReactions(snap.data(), emoji, userId);
            tx.update(msgRef, { reactions: newReactions });
        });
    }

    private calculateNewReactions(msgData: any, emoji: string, userId: string): Record<string, string[]> {
        const reactions: Record<string, string[]> = msgData.reactions ?? {};
        const usersForEmoji = reactions[emoji] ?? [];
        
        if (usersForEmoji.includes(userId)) {
            return this.removeUserFromReaction(reactions, emoji, usersForEmoji, userId);
        } else {
            reactions[emoji] = [...usersForEmoji, userId];
            return reactions;
        }
    }

    private removeUserFromReaction(reactions: Record<string, string[]>, emoji: string, users: string[], userId: string) {
        const nextUsers = users.filter((id) => id !== userId);
        
        if (nextUsers.length === 0) {
            const { [emoji]: _, ...rest } = reactions; 
            return rest;
        } else {
            reactions[emoji] = nextUsers;
            return reactions;
        }
    }
}