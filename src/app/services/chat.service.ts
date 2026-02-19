import { inject, Injectable, signal } from "@angular/core";
import { Chat } from "../models/chat.class";
import { User } from "../models/user.class";
import { FirebaseService } from "./firebase.service";

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
        console.log("Nachrichten werden gerendert");

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

}