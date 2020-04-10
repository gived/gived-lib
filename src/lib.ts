import { h } from "./h";
import jwtDecode from 'jwt-decode';
import wretch from 'wretch';

interface GivedOpts {
    campaignId: string;
    defaultGiveAmount?: number;
    enableCampaignManager?: boolean;
    domain?: string;
    campaignNameOverride?: string;
    cdn?: string;
    api?: string;
    targetEl?: HTMLElement;
}

const TODAY = new Date();
TODAY.setHours(0);
TODAY.setMinutes(0);

const TWO_WEEKS_AGO = new Date();
TWO_WEEKS_AGO.setDate(TWO_WEEKS_AGO.getDate() - 14);

export default class Gived {
    private campaignManagerEl?: HTMLElement;
    private overlayEl?: HTMLElement;
    private campaignId: string;
    private enableCampaignManager: boolean;
    private domain = 'app.gived.org';
    private protocol = 'https';
    private cdn = 'https://cdn.gived.org';
    private api = `https://api.gived.org`;
    private campaignNameOverride?: string;
    private visits: number[] = [];
    private hiddenAt?: number;
    private gaveAt?: number;
    private apiWretch: any;
    private insertTargetEl: Element;

    public user?: GivedUser;
    constructor(opts: GivedOpts) {
        this.campaignId = opts.campaignId;
        this.enableCampaignManager = opts.enableCampaignManager ?? false;
        this.campaignNameOverride = opts.campaignNameOverride;
        this.cdn = opts.cdn || this.cdn;
        this.api = opts.api || this.api;
        this.apiWretch = function wretchWrapper() {
            return wretch().url(this.api).auth(`Bearer ${localStorage.__gived_jwt}`);
        }
        if (opts.domain) {
            this.domain = opts.domain;
            this.protocol = 'http';
        }
        if (opts.targetEl) {
            this.insertTargetEl = opts.targetEl;
        } else if (document.body && document.body.nodeName === 'BODY') {
            this.insertTargetEl = document.body;
        } else {
            this.insertTargetEl = document.querySelector('html');
        }

        this.insertCSS();

        window.addEventListener('message', (msg) => {
            if (msg.data && msg.data.startsWith) {
                const isGived = msg.data.startsWith('gived-');
                if (isGived) {
                    const [_, action, target] = msg.data.split('-');
                    if (target === 'campaign') {
                        if (action === 'grow') {
                            this.campaignManagerEl?.classList.add('grow');
                        } else if (action === 'done') {
                            localStorage.givenAt = JSON.stringify(new Date());
                            this.closeCampaignManager();
                        }
                    } else if (target === 'give') {
                        if (action === 'done') {
                            this.hideGived();
                        }
                    }
                }
            }
        }, false);

        this.initCampaignManager();

    }

    private async initCampaignManager() {
        if (window.location.href.includes('showMoneyPls=true')) {
            this.showCampaignManager();
        } else if (this.enableCampaignManager) {
            try {
                this.visits = JSON.parse(localStorage.getItem('__gived_visits') || '[]');
                if (localStorage.hiddenAt) {
                    this.hiddenAt = JSON.parse(localStorage.hiddenAt);
                }
                if (localStorage.gaveAt) {
                    this.gaveAt = JSON.parse(localStorage.gaveAt);
                }
            } catch (err) {
                localStorage.removeItem('__gived_visits');
                console.error(`Failed to get local storage`, err);
            }
            this.visits.push(Date.now());
            this.visits = this.visits.filter(visit => visit > TWO_WEEKS_AGO.valueOf());
            try {
                localStorage.setItem('__gived_visits', JSON.stringify(this.visits));
            } catch (err) {
                console.error(`Failed to set local storage`, err);
            }

            const visitsToday = this.visits.filter(visit => visit > TODAY.valueOf());
            if (
                this.enableCampaignManager &&
                visitsToday.length >= 3 &&
                (!this.hiddenAt || this.hiddenAt < TWO_WEEKS_AGO.valueOf()) &&
                (!this.gaveAt || this.gaveAt < TWO_WEEKS_AGO.valueOf())
            ) {
                const { campaign } = await this.getCampaignData();
                if (campaign.moneyPlsEnabled) {
                    console.info(`Will show MoneyPls`);
                    this.insertCampaignManager();
                    setTimeout(() => {
                        this.showCampaignManager();
                    }, 1000 * 5);
                } else {
                    console.info(`MoneyPls is not published. Enable in dashboard`);
                }
            }
        }
    }

    private getCampaignData() {
        return fetch(`${this.api}/campaign/${this.campaignId}.json`).then(r => r.json());
        // return fetch(`http://localhost:12180/campaign/${this.campaignId}.json`).then(r => r.json());
    }

    private insertCSS() {
        const givedCssLink = document.createElement('link');
        givedCssLink.rel = 'stylesheet';
        givedCssLink.href = `${this.cdn}/gived.css` + '?' + Date.now();
        document.head.appendChild(givedCssLink);
    }

    private closeCampaignManager() {
        this.campaignManagerEl?.classList.add('bounce-out');
        this.campaignManagerEl?.classList.remove('show');

        localStorage.setItem('hiddenAt', JSON.stringify(new Date()));

        setTimeout(() => {
            this.campaignManagerEl?.remove();
            this.campaignManagerEl = null;
            // this.insertCampaignManager();
        }, 1000);
    }

    private insertCampaignManager() {
        const givedFloat = h('div.gived-float', { style: 'display:none;' }, [
            h('div.close', {
                onclick: () => this.closeCampaignManager()
            }, [
                h('img', {
                    src: `${this.cdn}/keyboard_arrow_down.svg`
                }, [])
            ]),
            h('iframe', { src: `${this.protocol}://${this.domain}/moneypls/${this.campaignId}?campaignNameOverride=${this.campaignNameOverride || ''}&recentVisits=${this.visits.length}` }, [])
        ]);

        this.campaignManagerEl = this.insertTargetEl.appendChild(givedFloat);
    }

    private getOverlayEl(dismissable = true) {
        const self = this;
        if (this.overlayEl) {
            this.insertTargetEl.removeChild(this.overlayEl);
            delete this.overlayEl;
        }
        const overlayEl = h('div.gived-overlay', {
            style: 'pointer-events: none;opacity: 0;',
            onclick() {
                if (dismissable) {
                    self.hideGived();
                }
            }
        }, [
            h('div.gived-overlay-center', {}, [
                h('iframe', {
                    src: `${this.protocol}://${self.domain}/loading`
                })
            ])
        ]);

        this.overlayEl = this.insertTargetEl.appendChild(overlayEl);

        return this.overlayEl;
    }

    public hideGived() {
        const overlayEl = this.getOverlayEl();
        const iframeEl = overlayEl.querySelector('iframe')!;

        overlayEl.classList.remove('show');

        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/loading`);

        if (this.onGivedHidden) {
            this.onGivedHidden();
        }
    }

    public async login(dismissable = true) {
        const { campaign } = await this.getCampaignData();
        this.showUrl(`${this.protocol}://${this.domain}/signup/loginpls?scope=${this.campaignId}&scopeName=${campaign.name}`, dismissable);
        const scopeToken = await new Promise<string>((resolve, reject) => {
            window.addEventListener('message', (msg) => {
                if (msg.data?.type === 'gived-loginpls-token') {
                    resolve(msg.data.token);
                }
            });
        });
        if (scopeToken) {
            localStorage.__gived_jwt = scopeToken;
        }
        return await this.getUser(true);
    }

    public async getUser(invalidateCache = false) {
        if (localStorage.__gived_jwt) {
            if (invalidateCache) {
                const profile = await this.apiWretch().url(`/loginpls/user`).get().json();
                localStorage.__gived_profile = JSON.stringify(profile);
                return profile;
            } else {
                return JSON.parse(localStorage.__gived_profile);
            }
        } else {
            return null;
        }
    }

    public async getData(invalidateCache = false) {
        const user = await this.getUser(invalidateCache);
        return user.data;
    }

    public async setData(newData: any) {
        const profile = await this.apiWretch().url(`/loginpls/data`).post(newData).json();
        localStorage.__gived_profile = JSON.stringify(profile);
        return profile.data;
    }

    public showUrl(url: string, dismissable = true) {
        const overlayEl = this.getOverlayEl(dismissable);
        const iframeEl = overlayEl.querySelector('iframe')!;

        iframeEl.setAttribute('src', url);
        overlayEl.classList.add('show');

        return new Promise((resolve) => {
            this.onGivedHidden = resolve;
        });
    }

    public showCampaignManager() {
        if (this.campaignManagerEl) {
        } else {
            this.insertCampaignManager();
        }
        this.campaignManagerEl.classList.add('show');
    }

    private onGivedHidden?: (() => void);

    async showGived(amount: number, tier: string, recurring = true) {
        const overlayEl = this.getOverlayEl();
        const iframeEl = overlayEl.querySelector('iframe')!;

        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/give/${this.campaignId}?amount=${amount}&tierName=${tier}&recurring=${recurring}`);
        overlayEl.classList.add('show');

        return new Promise((resolve) => {
            this.onGivedHidden = resolve;
        });
    }
}
