export class User {
    uid: string; 
    firstName: string;
    lastName: string;
    email: string;
    birthDate: number;
    avatar: string;

    constructor(obj?: any) {
        this.uid = obj ? obj.uid : '';
        this.firstName = obj ? obj.firstName : '';
        this.lastName = obj ? obj.lastName : '';
        this.email = obj ? obj.email : '';
        this.birthDate = obj ? obj.birthDate : 0;
        this.avatar = obj && obj.avatar ? obj.avatar : 'profile-pic1.svg'; 
    }

    public toJSON() {
        return {
            uid: this.uid,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            birthDate: this.birthDate,
            avatar: this.avatar
        };
    }
}
