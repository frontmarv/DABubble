export class Channel {
    id: string;
    name: string;
    description: string;
    members: string[];
    messages: Map<string, string>;

    constructor(obj?: any) {
        this.id = obj ? obj.id : '';
        this.name = obj ? obj.name : '';
        this.description = obj ? obj.description : '';
        this.members = obj ? obj.members : [];
        this.messages = obj ? obj.messages : new Map<string, string>();
    }

    public toJSON() {
        return {
            name: this.name,
            description: this.description
        };
    }
}