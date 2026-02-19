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
    currentUserId = "christianklemm";

    async openChatRoom(user: any) {
        await this.getOtherUserData(user);
        if (this.firebaseService.isChatAvailable(this.createChatId())) {
            this.loadMessages();
        }
        else {
            this.createChat()
        }
        this.chatIsActive.set(true);
    }

    createChatId() {
        const other = this.otherUser();
        if (!other) return '';
        this.chat.id = this.currentUserId + other.uid
        return this.chat.id
    }

    loadMessages() {
        console.log("Nachrichten werden gerendert");

    }

    createChat() {

    }

    async getOtherUserData(user: any) {
        const otherUserInfo = await this.firebaseService.getSingleUser(user.uid);
        this.otherUser.set(otherUserInfo);
        console.log(this.otherUser);

    }
}