import { Timestamp } from "firebase/firestore";

export class Message {
    id?: string;
    senderId: string;
    text: string;
    createdAt: Timestamp;
    reactions: { [emoji: string]: string[] };
    lastReplyAt: Timestamp;
    replyCount: number;


    constructor(obj?: any) {
        this.id = obj?.id;
        this.senderId = obj?.senderId || '';
        this.text = obj?.text || '';
        this.createdAt = obj?.createdAt || null;
        this.reactions = obj?.reactions || {};
        this.lastReplyAt = obj?.lastReplyAt || null
        this.replyCount = obj?.replyCount || 0;
    }

    public toJSON() {
        return {
            senderId: this.senderId,
            text: this.text,
            createdAt: this.createdAt,
            reactions: this.reactions,
            lastReplyAt: this.lastReplyAt,
            replyCount: this.replyCount
        };
    }
}