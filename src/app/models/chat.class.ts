export class Chat {
    id: string;
    participants: string[];
    createdAt: any;
    lastMessage: string;

    constructor(obj?: any) {
        this.id = obj?.id || '';
        this.participants = obj?.participants || [];
        this.createdAt = obj?.createdAt || null;
        this.lastMessage = obj?.lastMessage || '';
    }

    public toJSON() {
        return {
            id: this.id,
            participants: this.participants,
            createdAt: this.createdAt,
            lastMessage: this.lastMessage
        };
    }
}