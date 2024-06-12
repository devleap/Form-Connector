/* eslint-disable prettier/prettier */
'use strict';

(() => {
    // Helper functions
    const getCookie = (name) => {
        const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
        const cookie = cookies.find((cookie) => cookie.startsWith(`${name}=`));
        return cookie ? cookie.split('=')[1] : null;
    };

    const fetchSiteInfo = async(token) => {
        const url = 'https://api-staging.candidleap.com/v1/site/info';
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error getting site info:', error);
            throw error;
        }
    };

    const initiateCheckout = async(plan, period, token) => {
        const url = 'https://api-staging.candidleap.com/v1/payment/checkout';
        const requestOptions = {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plan, period }),
            redirect: 'follow',
        };

        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error initiating checkout:', error);
            return null;
        }
    };

    const truncateLink = (link, maxLength = 50) =>
        link.length <= maxLength ? link : `${link.substring(0, maxLength)}...`;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    // Main function
    const main = async() => {
        console.log('Script loaded');

        // Query all the necessary DOM elements
        const elements = {
            checkoutUrl: '#',
            buyButtons: document.querySelectorAll('[data-button="buy-install"]'),
            siteInfoHeader: document.querySelector('[data-element="site-info-header"]'),
            siteName: document.querySelectorAll('[data-element="site-name"]'),
            dropdownBtnPlan: document.querySelector('[data-dropdown-btn="plan"]'),
            dropdownPlan: document.querySelector('[data-dropdown="plan"]'),
            dropdownPrice: document.querySelectorAll('[data-dropdown-price]'),
            dropdownSubsBtn: document.querySelectorAll('[data-dropdown-subs]'),
            modal: document.querySelector('[data-element="modal"]'),
            closeButton: document.querySelector('[data-element="modal-close-button"]'),
            checkoutLinkButton: document.querySelector('[data-element="open-chekout-link-button"]'),
            stripeLink: document.querySelector('[data-element="stripe-link"]'),
            copyButton: document.querySelector('[data-element="copy-button"]'),
            freeButton: document.querySelector('[data-button-type="free-install"]'),
            yearlyButton: document.querySelector('[data-button-type="yearly"]'),
            lifetimeButton: document.querySelector('[data-button-type="lifetime"]'),
            jwtToken: getCookie('jwt_token'),
            modalPrices: document.querySelectorAll('[data-modal-price]'),
            modalPlan: document.querySelector('[data-modal="plan"]'),
            navbarDropdownBtn: document.querySelector('[data-dropdown-btn="subscription-info"]'),
            navbarBtn: document.querySelector('[data-navbar-btn="install"]'),
        };

        const newSVG = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.2207 15.2065L13.5679 20.4446L23.7763 10.4446" class="hover-svg-new" stroke="black" stroke-width="2"/>
  </svg>`;

        // Hide all dropdown prices initially
        elements.dropdownPrice.forEach((price) => price.classList.add('hide'));
        elements.dropdownSubsBtn.forEach((subs) => subs.classList.add('hide'));

        // Event listeners
        if (elements.closeButton) {
            elements.closeButton.addEventListener('click', () => elements.modal.classList.add('hide'));
        }

        if (elements.checkoutLinkButton) {
            elements.checkoutLinkButton.addEventListener('click', () =>
                window.open(elements.checkoutUrl)
            );
        }

        if (elements.copyButton) {
            elements.copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(elements.checkoutUrl);
                const originalContent = elements.copyButton.innerHTML;
                elements.copyButton.innerHTML = `<div><div class="pricing-modal_button-icon is-2 w-embed">${newSVG}</div></div><div>link copied</div>`;
                setTimeout(() => { elements.copyButton.innerHTML = originalContent }, 3000);
            });
        }

        if (elements.jwtToken) {
            // If token exists, fetch site info and handle buy button clicks
            elements.siteInfoHeader.classList.remove('hide');
            elements.navbarDropdownBtn.classList.remove('hide');
            elements.navbarBtn.classList.add('hide');

            // Fetch site info and update DOM
            const siteInfo = await fetchSiteInfo(elements.jwtToken);
            const paymentPlanPurchased = siteInfo.data.paymentInfo.planPeriod;
            const subscriptionExpiryDate = formatDate(siteInfo.data.paymentInfo.subscriptionEndDate);

            if (elements.siteName) {
                elements.siteName.forEach((name) => { name.textContent = siteInfo.data.displayName });
            }

            if (paymentPlanPurchased === 'free') {
                elements.dropdownBtnPlan.textContent = 'No Plan';
                elements.dropdownPlan.textContent = 'Staging (free)';
            } else {
                elements.dropdownBtnPlan.textContent = `${paymentPlanPurchased} Plan`;
                elements.dropdownPlan.textContent = paymentPlanPurchased;
                document
                    .querySelectorAll(`[data-dropdown-price="${paymentPlanPurchased}"]`)
                    .forEach((el) => {
                        el.classList.remove('hide');
                    });
            }
            document
                .querySelector(`[data-dropdown-subs="${paymentPlanPurchased}"]`)
                .classList.remove('hide');

            elements.buyButtons.forEach((button) => {
                const buttonText = button.querySelector('[data-btn="text"]');
                const planType = button.getAttribute('plan-type');
                const planPeriod = button.getAttribute('plan-period');
                const successInfoDiv = button
                    .closest('[data-button-type]')
                    .parentElement.querySelector('[data-div="success-info"]');
                const successInfoSubscriptionEndDate = document.querySelectorAll(
                    '[data-date="subscription-end"]'
                );

                if (planType === 'free' && paymentPlanPurchased === 'free') {
                    elements.freeButton.classList.add('hide');
                    successInfoDiv.classList.remove('hide');
                }

                if (planPeriod === 'yearly') {
                    buttonText.innerHTML = 'upgrade to yearly';
                    if (paymentPlanPurchased === 'yearly') {
                        successInfoSubscriptionEndDate.forEach((el) => {
                            el.textContent = subscriptionExpiryDate;
                        });
                        elements.yearlyButton.classList.add('hide');
                        successInfoDiv.classList.remove('hide');
                    }
                }

                if (planPeriod === 'lifetime') {
                    buttonText.innerHTML = 'upgrade to lifetime';
                    if (paymentPlanPurchased === 'lifetime') {
                        elements.lifetimeButton.classList.add('hide');
                        successInfoDiv.classList.remove('hide');
                    }
                }

                button.addEventListener('click', async() => {
                    elements.modalPrices.forEach((price) => price.classList.add('hide'));
                    if (planType && planPeriod) {
                        const checkoutInfo = await initiateCheckout(planType, planPeriod, elements.jwtToken);
                        console.log({ checkoutInfo });
                        elements.siteName.forEach((name) => { name.textContent = siteInfo.data.displayName });
                        elements.modalPlan.textContent = `${planPeriod} Plan`;
                        document.querySelector(`[data-modal-price="${planPeriod}"]`).classList.remove('hide');
                        elements.checkoutUrl = checkoutInfo.data.redirectUrl;
                        elements.stripeLink.innerText = truncateLink(elements.checkoutUrl);
                        elements.modal.classList.remove('hide');
                    } else {
                        console.error('Attributes "plan-type" and "plan-period" are missing on the button.');
                    }
                });
            });
        } else {
            // If no token, handle buy button clicks to redirect to the app installation
            elements.buyButtons.forEach((button) => {
                const buttonText = button.querySelector('[data-btn="text"]');
                buttonText.innerHTML = 'Install App';
                button.addEventListener('click', () => {
                    window.location.href = 'https://api-staging.candidleap.com/auth/webflow';
                });
            });
        }
    };

    // Ensure Webflow array exists on the window object
    window.Webflow = [];
    window.Webflow.push(main);
})();