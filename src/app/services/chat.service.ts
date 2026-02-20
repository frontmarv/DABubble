import { inject, Injectable, signal } from "@angular/core";
import { Chat } from "../models/chat.class";
import { User } from "../models/user.class";
import { FirebaseService } from "./firebase.service";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "@angular/fire/firestore"

@Injectable({
    providedIn: 'root'
})

export class ChatService {
    chatIsActive = signal(false);
    firebaseService = inject(FirebaseService);
    chat = new Chat;
    user = new User;
    otherUser = signal<User | null>(null);
    currentUserId = signal<User | null>(null);
    messages = signal<any[]>([]); 

    async openChatRoom(user: any) {
        await this.getOtherUserData(user);
        if (this.isChatAvailable(this.createChatId())) {
            this.loadMessages();
        }
        else {
            this.createChat()
        }
        this.chatIsActive.set(true);
    }

    isChatAvailable(id: string) {
        const chat = this.firebaseService.chats.find((c) => c.id === id);
        if (chat) {
            return true
        }
        return false
    }

    createChatId() {
        const otherUserRef = this.otherUser();
        const currentUserId = this.firebaseService.currentUser()?.uid;
        if (!otherUserRef || !currentUserId) return '';
        const sortedIds = [currentUserId, otherUserRef.uid].sort();

        this.chat.id = sortedIds.join('_')
        return this.chat.id
    }

    loadMessages() {
         const chatId = this.chat.id;
        if (!chatId) return;
        const messagesRef = collection(this.firebaseService.firestore, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        onSnapshot(q, (snapshot) => {
            const msgs: any[] = [];
            snapshot.forEach(doc => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            this.messages.set(msgs);
        });
    }

    async createChat() {
        const chatId = this.createChatId();
        const currentUserId = this.firebaseService.currentUser()?.uid;
        const otherUser = this.otherUser();

        if (!chatId || !currentUserId || !otherUser) return;

        const chat = new Chat();
        chat.id = chatId;
        chat.participants = [currentUserId, otherUser.uid];
        chat.createdAt = new Date();
        chat.lastMessage = '';

        await this.firebaseService.addChat(chat);
    }

    async getOtherUserData(user: any) {
        const otherUserInfo = await this.firebaseService.getSingleUser(user.uid);
        this.otherUser.set(otherUserInfo);
        console.log(this.otherUser);
    }


    async sendMessage(text: string) {
        const chatId = this.chat.id;
        const currentUserId = this.firebaseService.currentUser()?.uid;
        if (!chatId || !currentUserId || !text.trim()) return;
        const batch = writeBatch(this.firebaseService.firestore);
        const chatRef = doc(this.firebaseService.firestore, 'chats', chatId);
        const messageRef = doc(
            collection(this.firebaseService.firestore, 'chats', chatId, 'messages')
        );

        batch.set(messageRef, {
            senderId: currentUserId,
            text: text,
            createdAt: serverTimestamp(),
            reactions: {}
        });

        batch.update(chatRef, {
            lastMessage: text,
            lastMessageAt: serverTimestamp()
        });

        await batch.commit();
    }
}