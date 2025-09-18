// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { TestingBehatDomUtils, TestingBehatDomUtilsService } from './behat-dom';
import { TestingBehatBlocking } from './behat-blocking';
import { CoreCustomURLSchemes, CoreCustomURLSchemesProvider } from '@services/urlschemes';
import { CoreConfig } from '@services/config';
import { EnvironmentConfig } from '@/types/config';
import { LocalNotifications, makeSingleton, NgZone, ToastController } from '@singletons';
import { CoreNetwork, CoreNetworkService } from '@services/network';
import { CorePushNotifications, CorePushNotificationsProvider } from '@features/pushnotifications/services/pushnotifications';
import { CoreCronDelegate, CoreCronDelegateService } from '@services/cron';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { Injectable } from '@angular/core';
import { CoreSites, CoreSitesProvider } from '@services/sites';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';
import { CoreSwipeNavigationDirective } from '@directives/swipe-navigation';
import { Swiper } from 'swiper';
import { LocalNotificationsMock } from '@features/emulator/services/local-notifications';
import { GetClosureArgs } from '@/core/utils/types';
import { CoreIframeComponent } from '@components/iframe/iframe';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Behat runtime servive with public API.
 */
@Injectable({ providedIn: 'root' })
export class TestingBehatRuntimeService {

    protected initialized = false;
    protected openedUrls: {
        args: GetClosureArgs<Window['open']>;
        contents?: string;
    }[] = [];

    get cronDelegate(): CoreCronDelegateService {
        return CoreCronDelegate.instance;
    }

    get customUrlSchemes(): CoreCustomURLSchemesProvider {
        return CoreCustomURLSchemes.instance;
    }

    get network(): CoreNetworkService {
        return CoreNetwork.instance;
    }

    get pushNotifications(): CorePushNotificationsProvider {
        return CorePushNotifications.instance;
    }

    get sites(): CoreSitesProvider {
        return CoreSites.instance;
    }

    get navigator(): CoreNavigatorService {
        return CoreNavigator.instance;
    }

    get domUtils(): TestingBehatDomUtilsService {
        return TestingBehatDomUtils.instance;
    }

    /**
     * Init behat functions and set options like skipping onboarding.
     *
     * @param options Options to set on the app.
     */
    init(options: TestingBehatInitOptions = {}): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        TestingBehatBlocking.init();

        if (options.configOverrides) {
            // Set the cookie so it's maintained between reloads.
            document.cookie = `MoodleAppConfig=${JSON.stringify(options.configOverrides)}`;
            CoreConfig.patchEnvironment(options.configOverrides, { patchDefault: true });
        }

        // Spy on window.open.
        const originalOpen = window.open.bind(window);
        window.open = (...args) => {
            this.openedUrls.push({ args });

            return originalOpen(...args);
        };

        // Reduce iframes timeout to speed up tests.
        CoreIframeComponent.loadingTimeout = 1000;
    }

    /**
     * Get coverage data.
     *
     * @returns Coverage data.
     */
    getCoverage(): string | null {
        if (!('__coverage__' in window)) {
            return null;
        }

        return JSON.stringify(window.__coverage__);
    }

    /**
     * Check whether the service has been initialized or not.
     *
     * @returns Whether the service has been initialized or not.
     */
    hasInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Run an operation inside the angular zone and return result.
     *
     * @param operation Operation callback.
     * @param blocking Whether the operation is blocking or not.
     * @param locatorToFind If set, when this locator is found the operation is considered finished. This is useful for
     *                      operations that might expect user input before finishing, like a confirm modal.
     * @returns OK if successful, or ERROR: followed by message.
     */
    async runInZone(
        operation: () => unknown,
        blocking: boolean = false,
        locatorToFind?: TestingBehatElementLocator,
    ): Promise<string> {
        const blockKey = blocking && TestingBehatBlocking.block();
        let interval: number | undefined;

        try {
            await new Promise<void>((resolve, reject) => {
                Promise.resolve(NgZone.run(operation)).then(resolve).catch(reject);

                if (locatorToFind) {
                    interval = window.setInterval(() => {
                        if (TestingBehatDomUtils.findElementBasedOnText(locatorToFind, { onlyClickable: false })) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 500);
                }
            });

            return 'OK';
        } catch (error) {
            return `ERROR: ${error.message}`;
        } finally {
            blockKey && TestingBehatBlocking.unblock(blockKey);
            window.clearInterval(interval);
        }
    }

    /**
     * Wait all controlled components to be rendered.
     *
     * @returns Promise resolved when all components have been rendered.
     */
    async waitLoadingToFinish(): Promise<void> {
        await NgZone.run(async () => {
            const coreLoadingsPromises: Promise<unknown>[] =
            Array.from(document.body.querySelectorAll<HTMLElement>('core-loading'))
                .filter((element) => CoreDom.isElementVisible(element))
                .map(element => CoreDirectivesRegistry.waitDirectiveReady(element, CoreLoadingComponent));

            const ionLoadingsPromises: Promise<unknown>[] =
            Array.from(document.body.querySelectorAll<HTMLIonLoadingElement>('ion-loading'))
                .filter((element) => CoreDom.isElementVisible(element))
                .map(element => element.onDidDismiss());

            const promises = coreLoadingsPromises.concat(ionLoadingsPromises);

            await Promise.all(promises);

            // Wait for ion-spinner to be removed from the DOM after loadings because loadings can contain spinners.
            const ionSpinnerPromises: Promise<unknown>[] =
            Array.from(document.body.querySelectorAll<HTMLIonSpinnerElement>('ion-spinner'))
                .filter((element) => CoreDom.isElementVisible(element))
                .map((element) =>
                    // Wait to the spinner to be removed from the DOM.
                    new Promise<void>((resolve) => {
                        const parentElement = element.parentElement;

                        if (!parentElement) {
                            resolve();

                            return;
                        }

                        const observer = new MutationObserver(() => {
                            if (!parentElement.contains(element)) {
                                observer.disconnect();
                                resolve();
                            }
                        });

                        observer.observe(parentElement, { childList: true });
                }));

            await Promise.all(ionSpinnerPromises);
        });
    }

    /**
     * Function to find and click an app standard button.
     *
     * @param button Type of button to press.
     * @returns OK if successful, or ERROR: followed by message.
     */
    async pressStandard(button: string): Promise<string> {
        this.log(`Action - Click standard button: ${button}`);

        // @deprecated usage, use goBack instead.
        if (button === 'back') {
            const success = await this.goBack();
            if (success) {
                return 'OK';
            } else {
                return 'ERROR: Back button not found';
            }
        }

        // Find button
        let foundButton: HTMLElement | undefined;
        const options: TestingBehatFindOptions = {
            onlyClickable: true,
        };

        switch (button) {
            case 'more menu':
                foundButton = TestingBehatDomUtils.findElementBasedOnText({
                    text: 'More',
                    selector: 'ion-tab-button',
                }, options);
                break;
            case 'user menu' :
                foundButton = TestingBehatDomUtils.findElementBasedOnText({ text: 'User account' }, options);
                break;
            case 'page menu':
                foundButton = TestingBehatDomUtils.findElementBasedOnText({ text: 'Display options' }, options);
                break;
            default:
                return 'ERROR: Unsupported standard button type';
        }

        if (!foundButton) {
            return `ERROR: Button '${button}' not found`;
        }

        // Click button
        await TestingBehatDomUtils.pressElement(foundButton);

        // Block Behat for at least 500ms, WS calls or DOM changes might not begin immediately.
        TestingBehatBlocking.wait(500);

        return 'OK';
    }

    /**
     * Function to go back the maximum number of times possible.
     *
     * @returns OK if successful, or ERROR: followed by message.
     */
    async goBackToRoot(): Promise<string> {
        this.log('Action - Go back to root');

        let success = true;

        do {
            success = await this.goBack();

            await TestingBehatBlocking.waitForPending();
        } while (success);

        return 'OK';
    }

    /**
     * Function to go back many times in the app.
     *
     * @param times How many times to go back.
     * @returns OK if successful, or ERROR: followed by message.
     */
    async goBackTimes(times = 1): Promise<string> {
        this.log(`Action - Go back ${times} times`);

        for (let i = 0; i < times; i++) {
            const success = await this.goBack();

            if (!success) {
                return 'ERROR: Back button not found';
            }

            await TestingBehatBlocking.waitForPending();
        }

        return 'OK';
    }

    /**
     * Function to go back in the app.
     *
     * @returns Whether the action is successful or not.
     */
    protected async goBack(): Promise<boolean> {
        const options: TestingBehatFindOptions = {
            onlyClickable: true,
            containerName: '',
        };

        const foundButton = TestingBehatDomUtils.findElementBasedOnText({
            text: 'Back',
            selector: 'ion-back-button',
        }, options);

        if (!foundButton) {
            return false;
        }

        // Click button
        await TestingBehatDomUtils.pressElement(foundButton);

        // Block Behat for at least 500ms, WS calls or DOM changes might not begin immediately.
        TestingBehatBlocking.wait(500);

        return true;
    }

    /**
     * When there is a popup, clicks on the backdrop.
     *
     * @returns OK if successful, or ERROR: followed by message
     */
    closePopup(): string {
        this.log('Action - Close popup');

        const backdrops = [
            ...Array
                .from(document.body.querySelectorAll('ion-popover, ion-modal'))
                .map(popover => popover.shadowRoot?.querySelector('ion-backdrop'))
                .filter(backdrop => !!backdrop),
            ...Array
                .from(document.body.querySelectorAll('ion-backdrop'))
                .filter(backdrop => !!backdrop.offsetParent),
        ];

        if (!backdrops.length) {
            return 'ERROR: Could not find backdrop';
        }

        if (backdrops.length > 1) {
            return `ERROR: Found too many backdrops (${backdrops.length})`;
        }

        backdrops[0]?.click();

        // Mark busy until the click finishes processing.
        TestingBehatBlocking.delay();

        return 'OK';
    }

    /**
     * Function to find an arbitrary element based on its text or aria label.
     *
     * @param locator Element locator.
     * @param options Search options.
     * @returns OK if successful, or ERROR: followed by message
     */
    find(locator: TestingBehatElementLocator, options: Partial<TestingBehatFindOptions> = {}): string {
        this.log('Action - Find', { locator, ...options });

        try {
            const element = TestingBehatDomUtils.findElementBasedOnText(locator, {
                onlyClickable: false,
                ...options,
            });

            if (!element) {
                return 'ERROR: No element matches locator to find.';
            }

            this.log('Action - Found', { locator, element, ...options });

            return 'OK';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Scroll an element into view.
     *
     * @param locator Element locator.
     * @returns OK if successful, or ERROR: followed by message
     */
    scrollTo(locator: TestingBehatElementLocator): string {
        this.log('Action - scrollTo', { locator });

        try {
            let element = TestingBehatDomUtils.findElementBasedOnText(locator, { onlyClickable: false });

            if (!element) {
                return 'ERROR: No element matches element to scroll to.';
            }

            element = element.closest('ion-item') ?? element.closest('button') ?? element;

            element.scrollIntoView();

            this.log('Action - Scrolled to', { locator, element });

            return 'OK';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Check whether the given url has been opened in the app.
     *
     * @param urlPattern Url pattern.
     * @param contents Url contents.
     * @param times How many times it should have been opened.
     * @returns OK if successful, or ERROR: followed by message
     */
    async hasOpenedUrl(urlPattern: string, contents: string, times: number): Promise<string> {
        const urlRegExp = new RegExp(urlPattern);
        const urlMatches = await Promise.all(this.openedUrls.map(async (openedUrl) => {
            const renderedUrl = openedUrl.args[0]?.toString() ?? '';

            if (!urlRegExp.test(renderedUrl)) {
                return false;
            }

            if (contents && !('contents' in openedUrl)) {
                const response = await fetch(renderedUrl);

                openedUrl.contents = await response.text();
            }

            if (contents && contents !== openedUrl.contents) {
                return false;
            }

            return true;
        }));

        if (urlMatches.filter(matches => !!matches).length === times) {
            return 'OK';
        }

        return times === 1
            ? `ERROR: Url matching '${urlPattern}' with '${contents}' contents has not been opened once`
            : `ERROR: Url matching '${urlPattern}' with '${contents}' contents has not been opened ${times} times`;
    }

    /**
     * Load more items form an active list with infinite loader.
     *
     * @returns OK if successful, or ERROR: followed by message
     */
    async loadMoreItems(): Promise<string> {
        this.log('Action - loadMoreItems');

        try {
            const infiniteLoading = Array
                .from(document.body.querySelectorAll<HTMLElement>('core-infinite-loading'))
                .find(element => !element.closest('.ion-page-hidden'));

            if (!infiniteLoading) {
                return 'ERROR: There isn\'t an infinite loader in the current page.';
            }

            const initialOffset = infiniteLoading.offsetTop;
            const isLoading = () => !!infiniteLoading.querySelector('ion-spinner[aria-label]');
            const isCompleted = () => !isLoading() && !infiniteLoading.querySelector('ion-button');
            const hasMoved = () => infiniteLoading.offsetTop !== initialOffset;

            if (isCompleted()) {
                return 'ERROR: All items are already loaded.';
            }

            infiniteLoading.scrollIntoView({ behavior: 'smooth' });

            // Wait 100ms
            await new Promise(resolve => setTimeout(resolve, 100));

            if (isLoading() || isCompleted() || hasMoved()) {
                return 'OK';
            }

            infiniteLoading.querySelector<HTMLElement>('ion-button')?.click();

            // Wait 100ms
            await new Promise(resolve => setTimeout(resolve, 100));

            return (isLoading() || isCompleted() || hasMoved()) ? 'OK' : 'ERROR: Couldn\'t load more items.';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Check whether an item is selected or not.
     *
     * @param locator Element locator.
     * @returns YES or NO if successful, or ERROR: followed by message
     */
    isSelected(locator: TestingBehatElementLocator): string {
        this.log('Action - Is Selected', locator);

        try {
            const element = TestingBehatDomUtils.findElementBasedOnText(locator, { onlyClickable: false });

            if (!element) {
                return 'ERROR: No element matches locator to find.';
            }

            return TestingBehatDomUtils.isElementSelected(element) ? 'YES' : 'NO';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Function to press arbitrary item based on its text or Aria label.
     *
     * @param locator Element locator.
     * @returns OK if successful, or ERROR: followed by message
     */
    async press(locator: TestingBehatElementLocator): Promise<string>;
    async press(text: string, nearText?: string): Promise<string>;
    async press(locatorOrText: TestingBehatElementLocator | string, nearText?: string): Promise<string> {
        const locator = typeof locatorOrText === 'string' ? { text: locatorOrText } : locatorOrText;

        if (nearText) {
            locator.near = { text: nearText };
        }

        this.log('Action - Press', locator);

        try {
            const found = TestingBehatDomUtils.findElementBasedOnText(locator, { onlyClickable: true });

            if (!found) {
                return 'ERROR: No element matches locator to press.';
            }

            await TestingBehatDomUtils.pressElement(found);

            // Block Behat for at least 500ms, WS calls or DOM changes might not begin immediately.
            TestingBehatBlocking.wait(500);

            return 'OK';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Get a file input id, adding it if necessary.
     *
     * @param locator Input locator.
     * @returns Input id if successful, or ERROR: followed by message
     */
    async getFileInputId(locator: TestingBehatElementLocator): Promise<string> {
        this.log('Action - Upload File', { locator });

        try {
            const inputOrContainer = TestingBehatDomUtils.findElementBasedOnText(locator);

            if (!inputOrContainer) {
                return 'ERROR: No element matches input locator.';
            }

            const input = inputOrContainer.matches('input[type="file"]')
                ? inputOrContainer
                : inputOrContainer.querySelector('input[type="file"]');

            if (!input) {
                return 'ERROR: Input element does not contain a file input.';
            }

            if (!input.hasAttribute('id')) {
                input.setAttribute('id', `file-${Date.now()}`);
            }

            return input.getAttribute('id') ?? '';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Trigger a pull to refresh gesture in the current page.
     *
     * @returns OK if successful, or ERROR: followed by message
     */
    async pullToRefresh(): Promise<string> {
        this.log('Action - pullToRefresh');

        try {
            const ionRefresher = this.getElement('ion-refresher');

            if (!ionRefresher) {
                return 'ERROR: It\'s not possible to pull to refresh the current page.';
            }

            ionRefresher.dispatchEvent(new CustomEvent('ionRefresh'));

            return 'OK';
        } catch (error) {
            return `ERROR: ${error.message}`;
        }
    }

    /**
     * Gets the currently displayed page header.
     *
     * @returns OK: followed by header text if successful, or ERROR: followed by message.
     */
    getHeader(): string {
        this.log('Action - Get header');

        const getBySelector = (selector: string ) =>  Array.from(document.body.querySelectorAll<HTMLElement>(selector))
            .filter((title) => TestingBehatDomUtils.isElementVisible(title, document.body))
            .map((title) => title.innerText.trim())
            .filter((title) => title.length > 0);

        let titles = getBySelector('.ion-page:not(.ion-page-hidden) > ion-header h1');

        // Collapsed title, get the floating title.
        if (titles.length === 0) {
            titles = getBySelector('.ion-page:not(.ion-page-hidden) h1.collapsible-header-floating-title');
        }

        if (titles.length > 1) {
            return `ERROR: Too many possible titles (${titles.length}).`;
        }

        if (!titles.length) {
            return 'ERROR: No title found.';
        }

        return `OK: ${titles[0]}`;
    }

    /**
     * Sets the text of a field to the specified value.
     *
     * This currently matches fields only based on the placeholder attribute.
     *
     * @param field Field name
     * @param value New value
     * @returns OK or ERROR: followed by message
     */
    async setField(field: string, value: string): Promise<string> {
        this.log(`Action - Set field ${field} to: ${value}`);

        const input = TestingBehatDomUtils.findField(field);

        if (!input) {
            return 'ERROR: No element matches field to set.';
        }

        if (input instanceof HTMLSelectElement) {
            const options = Array.from(input.querySelectorAll('option'));

            value = options.find(option => option.value === value)?.value
                ?? options.find(option => option.text === value)?.value
                ?? options.find(option => option.text.includes(value))?.value
                ?? value;
        } else if (input.tagName === 'ION-SELECT') {
            const options = Array.from(input.querySelectorAll('ion-select-option'));

            value = options.find(option => option.value?.toString() === value)?.textContent?.trim()
                ?? options.find(option => option.textContent?.trim() === value)?.textContent?.trim()
                ?? options.find(option => option.textContent?.includes(value))?.textContent?.trim()
                ?? value;
        }

        try {
            await TestingBehatDomUtils.setInputValue(input, value);

            return 'OK';
        } catch (error) {
            return `ERROR: ${error.message ?? 'Unknown error'}`;
        }
    }

    /**
     * Sets the text of a field to the specified value.
     *
     * This currently matches fields only based on the placeholder attribute.
     *
     * @param field Field name
     * @param value New value
     * @returns OK or ERROR: followed by message
     */
    async fieldMatches(field: string, value: string): Promise<string> {
        this.log(`Action - Field ${field} matches value: ${value}`);

        const found = TestingBehatDomUtils.findField(field);

        if (!found) {
            return 'ERROR: No element matches field to set.';
        }

        const foundValue = this.getFieldValue(found);
        if (value !== foundValue) {
            return `ERROR: Expecting value "${value}", found "${foundValue}" instead.`;
        }

        return 'OK';
    }

    /**
     * Get the value of a certain field.
     *
     * @param element Field to get the value.
     * @returns Value.
     */
    protected getFieldValue(element: HTMLElement | HTMLInputElement): string {
        if (element.tagName === 'ION-DATETIME-BUTTON' && element.shadowRoot) {
            return Array.from(element.shadowRoot.querySelectorAll('button')).map(button => button.innerText).join(' ');
        }

        if (element.tagName === 'ION-DATETIME') {
            const value = 'value' in element ? element.value : element.innerText;

            // Remove seconds from the value to ensure stability on tests. It could be improved using DayJS parsing if needed.
            // Count the number of ":".
            const colonCount = value.split(':').length;
            if (colonCount > 2) {
                return value.substring(0, value.lastIndexOf(':'));
            }

            return value;
        }

        return 'value' in element ? element.value : element.innerText;
    }

    /**
     * Get element instance.
     *
     * @param selector Element selector.
     * @param referenceLocator The locator to the reference element to start looking for. If not specified, document body.
     * @returns Element instance.
     */
    private getElement<T = Element>(selector: string, referenceLocator?: TestingBehatElementLocator): T | null {
        let startingElement: HTMLElement | undefined = document.body;
        let queryPrefix = '';

        if (referenceLocator) {
            startingElement = TestingBehatDomUtils.findElementBasedOnText(referenceLocator, {
                onlyClickable: false,
            });

            if (!startingElement) {
                return null;
            }
        } else {
            // Searching the whole DOM, search only in visible pages.
            queryPrefix = '.ion-page:not(.ion-page-hidden) ';
        }

        return Array.from(startingElement.querySelectorAll(`${queryPrefix}${selector}`)).pop() as T
            ?? startingElement.closest(selector) as T;
    }

    /**
     * Logs information from this Behat runtime JavaScript, including the time and the 'BEHAT'
     * keyword so we can easily filter for it if needed.
     */
    log(...args: unknown[]): void {
        const now = new Date();
        const nowFormatted = String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0') + '.' +
                String(now.getMilliseconds()).padStart(2, '0');

        console.log(`BEHAT: ${nowFormatted}`, ...args); // eslint-disable-line no-console
    }

    /**
     * Flush pending notifications.
     */
    flushNotifications(): void {
        (LocalNotifications as unknown as LocalNotificationsMock).flush();
    }

    /**
     * Check a notification is present.
     *
     * @param title Title of the notification
     * @returns YES or NO: depending on the result.
     */
    async notificationIsPresentWithText(title: string): Promise<string> {
        const notifications = await LocalNotifications.getAllTriggered();

        const notification = notifications.find((notification) => notification.title?.includes(title));

        if (!notification) {
            return 'NO';
        }

        if (!notification.id) {
            // Cannot check but has been triggered.
            return 'YES';
        }

        return (await LocalNotifications.isPresent(notification.id)) ? 'YES' : 'NO';
    }

    /**
     * Check a notification is scheduled.
     *
     * @param title Title of the notification
     * @param date Scheduled notification date.
     * @returns YES or NO: depending on the result.
     */
    async notificationIsScheduledWithText(title: string, date?: number): Promise<string> {
        const notifications = await LocalNotifications.getAllScheduled();

        const notification = notifications.find(
            (notification) => notification.title?.includes(title) && (!date || notification.trigger?.at?.getTime() === date),
        );

        return notification ? 'YES' : 'NO';
    }

    /**
     * Close notification.
     *
     * @param title Title of the notification
     * @returns OK or ERROR
     */
    async closeNotification(title: string): Promise<string> {
        const notifications = await LocalNotifications.getAllTriggered();

        const notification = notifications.find((notification) => notification.title?.includes(title));

        if (!notification || !notification.id) {
            return `ERROR: Notification with title ${title} cannot be closed`;
        }

        await LocalNotifications.clear(notification.id);

        return 'OK';
    }

    /**
     * Swipe in the app.
     *
     * @param direction Left or right.
     * @param locator Element locator to swipe. If not specified, swipe in the first ion-content found.
     * @returns OK if successful, or ERROR: followed by message
     */
    swipe(direction: string, locator?: TestingBehatElementLocator): string {
        this.log('Action - Swipe', { direction, locator });

        if (locator) {
            // Locator specified, try to find swiper-container first.
            const swiperContainer = this.getElement<{ swiper: Swiper }>('swiper-container', locator);

            if (swiperContainer) {
                direction === 'left' ? swiperContainer.swiper.slideNext() : swiperContainer.swiper.slidePrev();

                return 'OK';
            }
        }

        // No locator specified or swiper-container not found, search swipe navigation now.
        const ionContent = this.getElement<{ swipeNavigation: CoreSwipeNavigationDirective }>(
            'ion-content.uses-swipe-navigation',
            locator,
        );

        if (!ionContent) {
            return 'ERROR: Element to swipe not found.';
        }

        direction === 'left' ? ionContent.swipeNavigation.swipeLeft() : ionContent.swipeNavigation.swipeRight();

        return 'OK';
    }

    /**
     * Wait for toast to be dismissed in the app.
     *
     * @returns Promise resolved when toast has been dismissed.
     */
    async waitToastDismiss(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(ToastController.dismiss());
    }

}

export const TestingBehatRuntime = makeSingleton(TestingBehatRuntimeService);

export type BehatTestsWindow = Window & {
    M?: { // eslint-disable-line @typescript-eslint/naming-convention
        util?: {
            pending_js?: string[]; // eslint-disable-line @typescript-eslint/naming-convention
        };
    };
};

export type TestingBehatFindOptions = {
    containerName?: string;
    onlyClickable?: boolean;
};

export type TestingBehatElementLocator = {
    text: string | string[];
    within?: TestingBehatElementLocator;
    near?: TestingBehatElementLocator;
    selector?: string;
};

export type TestingBehatInitOptions = {
    configOverrides?: Partial<EnvironmentConfig>;
};
