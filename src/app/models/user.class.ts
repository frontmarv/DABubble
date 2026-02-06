export class User {
    firstName: string;
    lastName: string;
    email: string;
    birthDate: number;
    avatar: string;

    constructor(obj?: any) {
        this.firstName = obj ? obj.firstName : '';
        this.lastName = obj ? obj.lastName : '';
        this.email = obj ? obj.email : '';
        this.birthDate = obj ? obj.birthDate : '';
        this.avatar = obj ? obj.avatar : 'profile-pics.svg';
    }

    public toJSON() {
        return {
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            birthDate: this.birthDate,
            avatar: this.avatar
        };
    }
}
