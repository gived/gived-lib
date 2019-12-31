interface User {
    name: string,
    phoneNumber: string,
    email?: string,
}

class GivedUser {
    private _user?: User;
    constructor() {
        this.init();
    }
    async init() {
        this._user = await this.getUser();
    }
    async getUser() {
        return {
            name: 'Joe Reeve',
            phoneNumber: '+447480833086',
            email: 'joe@hackthepress.org',
        };
    }
    async getData() {
        return {};
    }
    async setData() {
        return {};
    }
}