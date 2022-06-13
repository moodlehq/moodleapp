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

import { TestsBehatDomUtils } from './behat-dom';
import { TestsBehatBlocking } from './behat-blocking';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CoreLoginHelperProvider } from '@features/login/services/login-helper';
import { CoreConfig } from '@services/config';
import { EnvironmentConfig } from '@/types/config';
import { NgZone } from '@singletons';
import { CoreNetwork } from '@services/network';
import {
    CorePushNotifications,
    CorePushNotificationsNotificationBasicData,
} from '@features/pushnotifications/services/pushnotifications';
import { CoreCronDelegate } from '@services/cron';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreComponentsRegistry } from '@singletons/components-registry';
import { CoreDom } from '@singletons/dom';

/**
 * Behat runtime servive with public API.
 */
export class TestsBehatRuntime {

    /**
     * Init behat functions and set options like skipping onboarding.
     *
     * @param options Options to set on the app.
     */
    static init(options?: TestsBehatInitOptions): void {
        TestsBehatBlocking.init();

        (window as BehatTestsWindow).behat = {
            closePopup: TestsBehatRuntime.closePopup,
            find: TestsBehatRuntime.find,
            getAngularInstance: TestsBehatRuntime.getAngularInstance,
            getHeader: TestsBehatRuntime.getHeader,
            isSelected: TestsBehatRuntime.isSelected,
            loadMoreItems: TestsBehatRuntime.loadMoreItems,
            log: TestsBehatRuntime.log,
            press: TestsBehatRuntime.press,
            pressStandard: TestsBehatRuntime.pressStandard,
            scrollTo: TestsBehatRuntime.scrollTo,
            setField: TestsBehatRuntime.setField,
            handleCustomURL: TestsBehatRuntime.handleCustomURL,
            notificationClicked: TestsBehatRuntime.notificationClicked,
            forceSyncExecution: TestsBehatRuntime.forceSyncExecution,
            waitLoadingToFinish: TestsBehatRuntime.waitLoadingToFinish,
            network: CoreNetwork.instance,
        };

        if (!options) {
            return;
        }

        if (options.skipOnBoarding === true) {
            CoreConfig.set(CoreLoginHelperProvider.ONBOARDING_DONE, 1);
        }

        if (options.configOverrides) {
            // Set the cookie so it's maintained between reloads.
            document.cookie = 'MoodleAppConfig=' + JSON.stringify(options.configOverrides);
            CoreConfig.patchEnvironment(options.configOverrides);
        }
    }

    /**
     * Handles a custom URL.
     *
     * @param url Url to open.
     * @return OK if successful, or ERROR: followed by message.
     */
    static async handleCustomURL(url: string): Promise<string> {
        const blockKey = TestsBehatBlocking.block();

        try {
            await NgZone.run(async () => {
                await CoreCustomURLSchemes.handleCustomURL(url);
            });

            return 'OK';
        } catch (error) {
            return 'ERROR: ' + error.message;
        } finally {
            TestsBehatBlocking.unblock(blockKey);
        }
    }

    /**
     * Function called when a push notification is clicked. Redirect the user to the right state.
     *
     * @param data Notification data.
     * @return Promise resolved when done.
     */
    static async notificationClicked(data: CorePushNotificationsNotificationBasicData): Promise<void> {
        const blockKey = TestsBehatBlocking.block();

        try {
            await NgZone.run(async () => {
                await CorePushNotifications.notificationClicked(data);
            });
        } finally {
            TestsBehatBlocking.unblock(blockKey);
        }
    }

    /**
     * Force execution of synchronization cron tasks without waiting for the scheduled time.
     * Please notice that some tasks may not be executed depending on the network connection and sync settings.
     *
     * @return Promise resolved if all handlers are executed successfully, rejected otherwise.
     */
    static async forceSyncExecution(): Promise<void> {
        const blockKey = TestsBehatBlocking.block();

        try {
            await NgZone.run(async () => {
                await CoreCronDelegate.forceSyncExecution();
            });
        } finally {
            TestsBehatBlocking.unblock(blockKey);
        }
    }

    /**
     * Wait all controlled components to be rendered.
     *
     * @return Promise resolved when all components have been rendered.
     */
    static async waitLoadingToFinish(): Promise<void> {
        const blockKey = TestsBehatBlocking.block();

        await NgZone.run(async () => {
            try {
                const elements = Array.from(document.body.querySelectorAll<HTMLElement>('core-loading'))
                    .filter((element) => CoreDom.isElementVisible(element));

                await Promise.all(elements.map(element =>
                    CoreComponentsRegistry.waitComponentReady(element, CoreLoadingComponent)));
            } finally {
                TestsBehatBlocking.unblock(blockKey);
            }
        });

    }

    /**
     * Function to find and click an app standard button.
     *
     * @param button Type of button to press.
     * @return OK if successful, or ERROR: followed by message.
     */
    static pressStandard(button: string): string {
        this.log('Action - Click standard button: ' + button);

        // Find button
        let foundButton: HTMLElement | undefined;

        switch (button) {
            case 'back':
                foundButton = TestsBehatDomUtils.findElementBasedOnText({ text: 'Back' });
                break;
            case 'main menu': // Deprecated name.
            case 'more menu':
                foundButton = TestsBehatDomUtils.findElementBasedOnText({
                    text: 'More',
                    selector: 'ion-tab-button',
                });
                break;
            case 'user menu' :
                foundButton = TestsBehatDomUtils.findElementBasedOnText({ text: 'User account' });
                break;
            case 'page menu':
                foundButton = TestsBehatDomUtils.findElementBasedOnText({ text: 'Display options' });
                break;
            default:
                return 'ERROR: Unsupported standard button type';
        }

        if (!foundButton) {
            return `ERROR: Button '${button}' not found`;
        }

        // Click button
        TestsBehatDomUtils.pressElement(foundButton);

        return 'OK';
    }

    /**
     * When there is a popup, clicks on the backdrop.
     *
     * @return OK if successful, or ERROR: followed by message
     */
    static closePopup(): string {
        this.log('Action - Close popup');

        let backdrops = Array.from(document.querySelectorAll('ion-backdrop'));
        backdrops = backdrops.filter((backdrop) => !!backdrop.offsetParent);

        if (!backdrops.length) {
            return 'ERROR: Could not find backdrop';
        }
        if (backdrops.length > 1) {
            return 'ERROR: Found too many backdrops ('+backdrops.length+')';
        }
        const backdrop = backdrops[0];
        backdrop.click();

        // Mark busy until the click finishes processing.
        TestsBehatBlocking.delay();

        return 'OK';
    }

    /**
     * Function to find an arbitrary element based on its text or aria label.
     *
     * @param locator Element locator.
     * @param containerName Whether to search only inside a specific container content.
     * @return OK if successful, or ERROR: followed by message
     */
    static find(locator: TestBehatElementLocator, containerName: string): string {
        this.log('Action - Find', { locator, containerName });

        try {
            const element = TestsBehatDomUtils.findElementBasedOnText(locator, containerName);

            if (!element) {
                return 'ERROR: No element matches locator to find.';
            }

            this.log('Action - Found', { locator, containerName, element });

            return 'OK';
        } catch (error) {
            return 'ERROR: ' + error.message;
        }
    }

    /**
     * Scroll an element into view.
     *
     * @param locator Element locator.
     * @return OK if successful, or ERROR: followed by message
     */
    static scrollTo(locator: TestBehatElementLocator): string {
        this.log('Action - scrollTo', { locator });

        try {
            let element = TestsBehatDomUtils.findElementBasedOnText(locator);

            if (!element) {
                return 'ERROR: No element matches element to scroll to.';
            }

            element = element.closest('ion-item') ?? element.closest('button') ?? element;

            element.scrollIntoView();

            this.log('Action - Scrolled to', { locator, element });

            return 'OK';
        } catch (error) {
            return 'ERROR: ' + error.message;
        }
    }

    /**
     * Load more items form an active list with infinite loader.
     *
     * @return OK if successful, or ERROR: followed by message
     */
    static async loadMoreItems(): Promise<string> {
        this.log('Action - loadMoreItems');

        try {
            const infiniteLoading = Array
                .from(document.querySelectorAll<HTMLElement>('core-infinite-loading'))
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
            return 'ERROR: ' + error.message;
        }
    }

    /**
     * Check whether an item is selected or not.
     *
     * @param locator Element locator.
     * @return YES or NO if successful, or ERROR: followed by message
     */
    static isSelected(locator: TestBehatElementLocator): string {
        this.log('Action - Is Selected', locator);

        try {
            const element = TestsBehatDomUtils.findElementBasedOnText(locator);

            return TestsBehatDomUtils.isElementSelected(element, document.body) ? 'YES' : 'NO';
        } catch (error) {
            return 'ERROR: ' + error.message;
        }
    }

    /**
     * Function to press arbitrary item based on its text or Aria label.
     *
     * @param locator Element locator.
     * @return OK if successful, or ERROR: followed by message
     */
    static press(locator: TestBehatElementLocator): string {
        this.log('Action - Press', locator);

        try {
            const found = TestsBehatDomUtils.findElementBasedOnText(locator);

            if (!found) {
                return 'ERROR: No element matches locator to press.';
            }

            TestsBehatDomUtils.pressElement(found);

            return 'OK';
        } catch (error) {
            return 'ERROR: ' + error.message;
        }
    }

    /**
     * Gets the currently displayed page header.
     *
     * @return OK: followed by header text if successful, or ERROR: followed by message.
     */
    static getHeader(): string {
        this.log('Action - Get header');

        let titles = Array.from(document.querySelectorAll<HTMLElement>('.ion-page:not(.ion-page-hidden) > ion-header h1'));
        titles = titles.filter((title) => TestsBehatDomUtils.isElementVisible(title, document.body));

        if (titles.length > 1) {
            return 'ERROR: Too many possible titles ('+titles.length+').';
        } else if (!titles.length) {
            return 'ERROR: No title found.';
        } else {
            const title = titles[0].innerText.trim();

            return 'OK:' + title;
        }
    }

    /**
     * Sets the text of a field to the specified value.
     *
     * This currently matches fields only based on the placeholder attribute.
     *
     * @param field Field name
     * @param value New value
     * @return OK or ERROR: followed by message
     */
    static setField(field: string, value: string): string {
        this.log('Action - Set field ' + field + ' to: ' + value);

        const found: HTMLElement | HTMLInputElement = TestsBehatDomUtils.findElementBasedOnText(
            { text: field, selector: 'input, textarea, [contenteditable="true"], ion-select' },
        );

        if (!found) {
            return 'ERROR: No element matches field to set.';
        }

        TestsBehatDomUtils.setElementValue(found, value);

        return 'OK';
    }

    /**
     * Get an Angular component instance.
     *
     * @param selector Element selector
     * @param className Constructor class name
     * @return Component instance
     */
    static getAngularInstance(selector: string, className: string): unknown {
        this.log('Action - Get Angular instance ' + selector + ', ' + className);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeElement = Array.from(document.querySelectorAll<any>(`.ion-page:not(.ion-page-hidden) ${selector}`)).pop();

        if (!activeElement || !activeElement.__ngContext__) {
            return null;
        }

        return activeElement.__ngContext__.find(node => node?.constructor?.name === className);
    }

    /**
     * Logs information from this Behat runtime JavaScript, including the time and the 'BEHAT'
     * keyword so we can easily filter for it if needed.
     */
    static log(...args: unknown[]): void {
        const now = new Date();
        const nowFormatted = String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0') + '.' +
                String(now.getMilliseconds()).padStart(2, '0');

        console.log('BEHAT: ' + nowFormatted, ...args); // eslint-disable-line no-console
    }

}

export type BehatTestsWindow = Window & {
    M?: { // eslint-disable-line @typescript-eslint/naming-convention
        util?: {
            pending_js?: string[]; // eslint-disable-line @typescript-eslint/naming-convention
        };
    };
    behatInit?: () => void;
    behat?: unknown;
};

export type TestBehatElementLocator = {
    text: string;
    within?: TestBehatElementLocator;
    near?: TestBehatElementLocator;
    selector?: string;
};

export type TestsBehatInitOptions = {
    skipOnBoarding?: boolean;
    configOverrides?: Partial<EnvironmentConfig>;
};
