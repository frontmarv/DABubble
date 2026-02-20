export class Message {
    id?: string;
    senderId: string;
    text: string;
    createdAt: any;
    reactions: { [emoji: string]: string[] };

    constructor(obj?: any) {
        this.id = obj?.id;
        this.senderId = obj?.senderId || '';
        this.text = obj?.text || '';
        this.createdAt = obj?.createdAt || null;
        this.reactions = obj?.reactions || {};
    }

    public toJSON() {
        return {
            senderId: this.senderId,
            text: this.text,
            createdAt: this.createdAt,
            reactions: this.reactions
        };
    }
}