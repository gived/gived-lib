import Gived from './lib';
(function () {
    if (typeof window !== 'undefined') {
        (window as any).Gived = Gived;
        console.log(`Loading Gived`);
        setTimeout(() => {
            // Find everything with data-gived-amount and add handlers
            const campaignIdEl = document.querySelector('[data-gived-campaign-id]');
            if (campaignIdEl) {
                const campaignId = (campaignIdEl as HTMLElement).dataset.givedCampaignId!;
                const gived = new Gived({ campaignId });
                const buttons = Array.from(document.querySelectorAll(`[data-gived-amount]`)) as HTMLElement[];
                for (const button of buttons) {
                    const isRecurring = button.dataset.givedRecurring!;
                    const amount = Number(button.dataset.givedAmount);
                    const tier = button.dataset.givedTier;
                    button.onclick = function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        gived.showGived(amount, tier || 'Supporter', isRecurring !== 'false');
                    };
                }
            }
        });
        // Auto configure campaign manager
    }
})();
