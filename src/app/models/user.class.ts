export class User {
    uid: string; 
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;

    constructor(obj?: any) {
        this.uid = obj ? obj.uid : '';
        this.firstName = obj ? obj.firstName : '';
        this.lastName = obj ? obj.lastName : '';
        this.email = obj ? obj.email : '';
        this.avatar = obj && obj.avatar ? obj.avatar : 'unkown-user.svg'; 
    }

    public toJSON() {
        return {
            uid: this.uid,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            avatar: this.avatar
        };
    }
}
