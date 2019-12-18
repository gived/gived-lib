import { h } from "./h";

interface GivedOpts {
    campaignId: string;
    defaultGiveAmount: number;
    enableCampaignManager?: boolean;
}

export default class Gived {
    private campaignManagerEl?: HTMLElement;
    private overlayEl?: HTMLElement;
    private campaignId: string;
    private defaultGiveAmount: number;
    private enableCampaignManager: boolean;
    constructor(opts: GivedOpts) {
        this.campaignId = opts.campaignId; // TODO: use this to fill campaign manager
        this.defaultGiveAmount = opts.defaultGiveAmount;
        this.enableCampaignManager = !!opts.enableCampaignManager;

        this.insertCSS();

        if (this.enableCampaignManager) {
            this.insertCampaignManager();
        }
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
                        self.showGived(self.defaultGiveAmount, 'Supporter');
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
                onclick(){
                    self.hideGived();
                }
            }, [
                h('div.gived-overlay-center', {}, [
                    h('iframe', {
                        src: `https://app.gived.org/#/loading`
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
        iframeEl.setAttribute('src', `https://app.gived.org/#/loading`);
    }

    public showCampaignManager() {
        if (this.campaignManagerEl) {
            this.campaignManagerEl.classList.add('show');
        }
    }

    async showGived(amount: number, tier: string) {
        const overlayEl = this.getOverlayEl();
        const iframeEl = overlayEl.querySelector('iframe')!;

        iframeEl.setAttribute('src', `https://app.gived.org/#/give?campaignId=${this.campaignId}&amount=${amount}&tier=${tier}`);
        overlayEl.classList.add('show');
    }

    async getUserData() {
        throw new Error(`NOT IMPLEMENTED`);
    }
}


(function () {
    // Find everything with data-gived-amount and add handlers
    // Auto configure campaign manager
})();
