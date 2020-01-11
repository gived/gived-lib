import { h } from "./h";

interface GivedOpts {
    campaignId: string;
    defaultGiveAmount?: number;
    enableCampaignManager?: boolean;
    domain?: string;
}

export default class Gived {
    private campaignManagerEl?: HTMLElement;
    private overlayEl?: HTMLElement;
    private campaignId: string;
    private defaultGiveAmount?: number;
    private enableCampaignManager: boolean;
    private domain = 'app.gived.org';
    private protocol = 'https';
    public user?: GivedUser;
    constructor(opts: GivedOpts) {
        this.campaignId = opts.campaignId; // TODO: use this to fill campaign manager
        this.defaultGiveAmount = opts.defaultGiveAmount;
        this.enableCampaignManager = !!opts.enableCampaignManager;
        if (opts.domain) {
            this.domain = opts.domain;
            this.protocol = 'http';
        }

        this.insertCSS();

        if (this.enableCampaignManager) {
            this.insertCampaignManager();
        }

        window.addEventListener('message', (msg) => {
            if (msg.data === 'gived-done') {
                this.hideGived();
            }
        }, false);
    }

    private insertCSS() {
        const givedCssLink = document.createElement('link');
        givedCssLink.rel = 'stylesheet';
        givedCssLink.href = 'https://gived.org/gived.css';
        document.head.appendChild(givedCssLink);
    }

    private insertCampaignManager() {
        const self = this;
        const givedFloat = h('div.gived-float', {
            style: 'display:none;'
        }, [
            h('div.gived-float-cont', {

            }, [
                h(`strong`, {}, ['Want to support this site?']),
                h('br'),
                h('br'),
                h('a.gived-float-donate', {
                    href: '#',
                    onclick() {
                        if (typeof self.defaultGiveAmount === 'number') {
                            self.showGived(self.defaultGiveAmount, 'Supporter');
                        }
                    }
                }, ['Donate Now']),
            ]),
            h('div.gived-float-button', {}, [
                h('div', {}, ['🤝'])
            ])
        ]);

        this.campaignManagerEl = document.body.appendChild(givedFloat);;
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
                        src: `${this.protocol}://${self.domain}/#/loading`
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
        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/#/loading`);
    }

    public showCampaignManager() {
        if (this.campaignManagerEl) {
            this.campaignManagerEl.classList.add('show');
        }
    }

    async showGived(amount: number, tier: string) {
        const overlayEl = this.getOverlayEl();
        const iframeEl = overlayEl.querySelector('iframe')!;

        iframeEl.setAttribute('src', `${this.protocol}://${this.domain}/#/give?campaignId=${this.campaignId}&amount=${amount}&tier=${tier}`);
        overlayEl.classList.add('show');
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
