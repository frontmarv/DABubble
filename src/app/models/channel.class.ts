export class Channel {
    id: string;
    name: string;
    description: string;
    members: string[];
    creatorId: string;    
    creatorName: string;  
    createdAt: number;   

    constructor(obj?: any) {
        this.id = obj?.id || '';
        this.name = obj?.name || '';
        this.description = obj?.description || '';
        this.members = obj?.members || [];
        this.creatorId = obj?.creatorId || '';
        this.creatorName = obj?.creatorName || '';
        this.createdAt = obj?.createdAt || Date.now();
    }

    public toJSON() {
        return {
            name: this.name,
            description: this.description,
            members: this.members,
            creatorId: this.creatorId,
            creatorName: this.creatorName,
            createdAt: this.createdAt
        };
    }
}