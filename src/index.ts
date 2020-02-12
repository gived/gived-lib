import { h } from "./h";

interface GivedOpts {
    campaignId: string;
    defaultGiveAmount?: number;
    enableCampaignManager?: boolean;
    domain?: string;
    campaignNameOverride?: string;
}

export default class Gived {
    private campaignManagerEl?: HTMLElement;
    private overlayEl?: HTMLElement;
    private campaignId: string;
    private enableCampaignManager: boolean;
    private domain = 'app.gived.org';
    private protocol = 'https';
    private campaignNameOverride?: string;
    public user?: GivedUser;
    constructor(opts: GivedOpts) {
        this.campaignId = opts.campaignId; // TODO: use this to fill campaign manager
        this.enableCampaignManager = !!opts.enableCampaignManager;
        this.campaignNameOverride = opts.campaignNameOverride;
        if (opts.domain) {
            this.domain = opts.domain;
            this.protocol = 'http';
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
                        this.campaignManagerEl?.remove();
                        this.insertCampaignManager();
                    }
                } else if (target === 'give') {
                    if (action === 'done') {
                        this.hideGived();
                    }
                }
            }
        }, false);
    }

    private insertCSS() {
        const givedCssLink = document.createElement('link');
        givedCssLink.rel = 'stylesheet';
        givedCssLink.href = `${this.protocol}://${this.domain}/gived.css` + '?' + Date.now();
        document.head.appendChild(givedCssLink);
    }

    private insertCampaignManager() {
        const givedFloat = h('div.gived-float', { style: 'display:none;' }, [
            h('iframe', { src: `${this.protocol}://${this.domain}/#/campaign/embed/${this.campaignId}?campaignNameOverride=${this.campaignNameOverride || ''}` }, [])
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
                        src: `${this.protocol}://${self.domain}/#loading`
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
        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/#loading`);

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

        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/#give/?campaignId=${this.campaignId}&amount=${amount}&tierName=${tier}`);
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
