import { h } from "./h";

interface GivedOpts {
    campaignId: string;
    defaultGiveAmount?: number;
    enableCampaignManager?: boolean;
    domain?: string;
    campaignNameOverride?: string;
    cdnOverride?: string;
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
    private campaignNameOverride?: string;
    private visits: number[] = [];
    private hiddenAt?: number;
    private gaveAt?: number;

    public user?: GivedUser;
    constructor(opts: GivedOpts) {
        this.campaignId = opts.campaignId;
        this.enableCampaignManager = opts.enableCampaignManager ?? true;
        this.campaignNameOverride = opts.campaignNameOverride;
        this.cdn = opts.cdnOverride || this.cdn;
        if (opts.domain) {
            this.domain = opts.domain;
            this.protocol = 'http';
        }
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

        this.insertCSS();

        if (this.enableCampaignManager) {
            this.insertCampaignManager();
        }

        window.addEventListener('message', (msg) => {
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
        }, false);

        const visitsToday = this.visits.filter(visit => visit > TODAY.valueOf());
        if (
            this.enableCampaignManager &&
            visitsToday.length >= 3 &&
            (!this.hiddenAt || this.hiddenAt < TWO_WEEKS_AGO.valueOf()) &&
            (!this.gaveAt || this.gaveAt < TWO_WEEKS_AGO.valueOf())
        ) {
            console.info(`Will show widget`);
            setTimeout(() => {
                this.showCampaignManager();
            }, 1000 * 5);
        }
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
            this.insertCampaignManager();
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
            h('iframe', { src: `${this.protocol}://${this.domain}/campaign/embed/${this.campaignId}?campaignNameOverride=${this.campaignNameOverride || ''}&recentVisits=${this.visits.length}` }, [])
        ]);

        this.campaignManagerEl = document.body.appendChild(givedFloat);
    }

    private getOverlayEl() {
        const self = this;
        if (this.overlayEl) {
            return this.overlayEl
        } else {
            const overlayEl = h('div.gived-overlay', {
                style: 'pointer-events: none;opacity: 0;',
                onclick() {
                    self.hideGived();
                }
            }, [
                h('div.gived-overlay-center', {}, [
                    h('iframe', {
                        src: `${this.protocol}://${self.domain}/loading`
                    })
                ])
            ]);

            this.overlayEl = document.body.appendChild(overlayEl);

            return this.overlayEl;
        }
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

    public showCampaignManager() {
        if (this.campaignManagerEl) {
            this.campaignManagerEl.classList.add('show');
        }
    }

    private onGivedHidden?: (() => void);

    async showGived(amount: number, tier: string) {
        const overlayEl = this.getOverlayEl();
        const iframeEl = overlayEl.querySelector('iframe')!;

        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/give/${this.campaignId}?amount=${amount}&tierName=${tier}`);
        overlayEl.classList.add('show');

        return new Promise((resolve) => {
            this.onGivedHidden = resolve;
        });
    }
}


(function () {
    setTimeout(() => {
        // Find everything with data-gived-amount and add handlers
        const campaignIdEl = document.querySelector('[data-gived-campaign-id]');
        if (campaignIdEl) {
            const campaignId = (campaignIdEl as HTMLElement).dataset.givedCampaignId!;
            const gived = new Gived({ campaignId });
            const buttons = Array.from(document.querySelectorAll(`[data-gived-amount]`)) as HTMLElement[];
            for (const button of buttons) {
                const amount = Number(button.dataset.givedAmount);
                const tier = button.dataset.givedTier;
                button.onclick = function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    gived.showGived(amount, tier || 'Supporter');
                };
            }
        }
    });
    // Auto configure campaign manager
})();
