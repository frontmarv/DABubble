export class Chat {
    id: string;
    currentUserId: string;
    otherUserId: string;

    constructor(obj?: any) {
        this.id = obj ? obj.id : '';
        this.currentUserId = obj ? obj.currentUserId : '';
        this.otherUserId = obj ? obj.otherUserId : '';
    }

    public toJSON() {
        return {
            currentUserId: this.currentUserId,
            otherUserId: this.otherUserId
        };
    }
}