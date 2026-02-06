export class Channel {
    id: string;
    name: string;
    description: string;

    constructor(obj?: any) {
        this.id = obj ? obj.id : '';
        this.name = obj ? obj.name : '';
        this.description = obj ? obj.description : '';
    }

    public toJSON() {
        return {
            name: this.name,
            description: this.description
        };
    }
}