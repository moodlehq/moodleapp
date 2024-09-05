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

import { Injectable } from '@angular/core';
import { CoreWait } from '@singletons/wait';
import { makeSingleton, NgZone, Router } from '@singletons';
import { BehatTestsWindow, TestingBehatRuntime } from './behat-runtime';
import {
    GuardsCheckEnd,
    GuardsCheckStart,
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationStart,
} from '@angular/router';
import { filter } from 'rxjs';
import { CoreNavigator } from '@services/navigator';

/**
 * Behat block JS manager.
 */
@Injectable({ providedIn: 'root' })
export class TestingBehatBlockingService {

    protected waitingBlocked = false;
    protected waitingGuardEnd = false;
    protected recentMutation = false;
    protected lastMutation = 0;
    protected initialized = false;
    protected keyIndex = 0;

    /**
     * Listen to mutations and override XML Requests.
     */
    init(): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.listenToMutations();
        this.xmlRequestOverride();

        const win = window as BehatTestsWindow;

        // Set up the M object - only pending_js is implemented.
        win.M = win.M ?? {};
        win.M.util = win.M.util ?? {};
        win.M.util.pending_js = win.M.util.pending_js ?? [];

        Router.events
            .pipe(filter(event =>
                event instanceof NavigationStart ||
                event instanceof NavigationEnd ||
                event instanceof NavigationError ||
                event instanceof NavigationCancel ||
                event instanceof GuardsCheckStart ||
                event instanceof GuardsCheckEnd))
            .subscribe(async (event) => {
                if (!('id' in event)) {
                    return;
                }

                const blockName = `navigation-${event.id}`;
                if (event instanceof NavigationStart) {
                    this.block(blockName);
                } else if (event instanceof GuardsCheckStart) {
                    // This event is triggered before the guards are checked, so we need to wait for the end.
                    this.waitingGuardEnd = CoreNavigator.currentRouteCanBlockLeave();

                    // No deactivation needed.
                    if (!this.waitingGuardEnd) {
                        return;
                    }

                    await CoreWait.wait(500);

                    if (this.waitingGuardEnd) {
                        // The guard is still running (this case can unexpetedly unblock the tests)
                        // or a user confirmation is shown. Unblock.
                        this.waitingGuardEnd = false;
                        this.unblock(blockName);
                    }
                } else if (event instanceof GuardsCheckEnd) {
                    // Guards check ended.
                    this.waitingGuardEnd = false;
                } else {
                    this.unblock(blockName);
                }
            });

        TestingBehatRuntime.log('Initialized!');
    }

    /**
     * Get pending list on window M object.
     *
     * @returns List of pending JS blockers.
     */
    protected get pendingList(): string[] {
        const win = window as BehatTestsWindow;

        return win.M?.util?.pending_js || [];
    }

    /**
     * Set pending list on window M object.
     */
    protected set pendingList(values: string[]) {
        const win = window as BehatTestsWindow;

        if (!win.M?.util?.pending_js) {
            return;
        }

        win.M.util.pending_js = values;
    }

    /**
     * Adds a pending key to the array.
     *
     * @param key Key to add. It will be generated if none.
     * @returns Key name.
     */
    block(key = ''): string {
        // Add a special DELAY entry whenever another entry is added.
        if (this.pendingList.length === 0) {
            this.pendingList.push('DELAY');
        }
        if (!key) {
            key = 'generated-' + this.keyIndex;
            this.keyIndex++;
        }
        this.pendingList.push(key);

        TestingBehatRuntime.log('PENDING+: ' + this.pendingList);

        return key;
    }

    /**
     * Removes a pending key from the array. If this would clear the array, the actual clear only
     * takes effect after the queued events are finished.
     *
     * @param key Key to remove
     */
    async unblock(key: string): Promise<void> {
        // Remove the key immediately.
        this.pendingList = this.pendingList.filter((x) => x !== key);

        TestingBehatRuntime.log('PENDING-: ' + this.pendingList);

        // If the only thing left is DELAY, then remove that as well, later...
        if (this.pendingList.length === 1) {
            if (!document.hidden) {
                // When tab is not active, ticks should be slower and may do Behat to fail.
                // From Timers API:
                // https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
                // "This API does not guarantee that timers will run exactly on schedule.
                // Delays due to CPU load, other tasks, etc, are to be expected."
                await CoreWait.nextTicks(10);
            }

            // Check there isn't a spinner...
            await this.checkUIBlocked();

            // Only remove it if the pending array is STILL empty after all that.
            if (this.pendingList.length === 1) {
                this.pendingList = [];
                TestingBehatRuntime.log('PENDING-: ' + this.pendingList);
            }
        }
    }

    /**
     * Adds a pending key to the array, but removes it after some ticks.
     */
    async delay(): Promise<void> {
        const key = this.block('forced-delay');
        this.unblock(key);
    }

    /**
     * Adds a pending key to the array, and remove it after some time.
     *
     * @param milliseconds Number of milliseconds to wait before the key is removed.
     * @returns Promise resolved after the time has passed.
     */
    async wait(milliseconds: number): Promise<void> {
        const key = this.block();
        await CoreWait.wait(milliseconds);
        this.unblock(key);
    }

    /**
     * It would be really beautiful if you could detect CSS transitions and animations, that would
     * cover almost everything, but sadly there is no way to do this because the transitionstart
     * and animationcancel events are not implemented in Chrome, so we cannot detect either of
     * these reliably. Instead, we have to look for any DOM changes and do horrible polling. Most
     * of the animations are set to 500ms so we allow it to continue from 500ms after any DOM
     * change.
     */
    protected listenToMutations(): void {
        // Set listener using the mutation callback.
        const observer = new MutationObserver(() => {
            this.lastMutation = Date.now();

            if (!this.recentMutation) {
                this.recentMutation = true;
                this.block('dom-mutation');

                setTimeout(() => {
                    this.pollRecentMutation();
                }, 500);
            }

            // Also update the spinner presence if needed.
            this.checkUIBlocked();
        });

        observer.observe(document, { attributes: true, childList: true, subtree: true });
    }

    /**
     * Called from the mutation callback to remove the pending tag after 500ms if nothing else
     * gets mutated.
     *
     * This will be called after 500ms, then every 100ms until there have been no mutation events
     * for 500ms.
     */
    protected pollRecentMutation(): void {
        if (Date.now() - this.lastMutation > 500) {
            this.recentMutation = false;
            this.unblock('dom-mutation');

            return;
        }

        setTimeout(() => {
            this.pollRecentMutation();
        }, 100);
    }

    /**
     * Checks if a loading spinner is present and visible; if so, adds it to the pending array
     * (and if not, removes it).
     */
    protected async checkUIBlocked(): Promise<void> {
        await CoreWait.nextTick();

        const blockingElements = Array.from(
            document.querySelectorAll<HTMLElement>('div.core-loading-container, ion-loading'),
        );

        const isBlocked = blockingElements.some(element => {
            // @TODO Fix ion-loading present check with CoreDom.isElementVisible.
            // ion-loading never has offsetParent since position is fixed.
            // Using isElementVisible solve the problem but will block behats (like BBB).
            if (!element.offsetParent) {
                return false;
            }

            const slide = element.closest('swiper-slide');
            if (slide && !slide.classList.contains('swiper-slide-active')) {
                return false;
            }

            return true;
        });

        if (isBlocked) {
            if (!this.waitingBlocked) {
                this.block('blocked');
                this.waitingBlocked = true;
            }
        } else {
            if (this.waitingBlocked) {
                this.unblock('blocked');
                this.waitingBlocked = false;
            }
        }
    }

    /**
     * Override XMLHttpRequest to mark things pending while there is a request waiting.
     */
    protected xmlRequestOverride(): void {
        const realOpen = XMLHttpRequest.prototype.open;
        let requestIndex = 0;

        XMLHttpRequest.prototype.open = function(...args) {
            NgZone.run(() => {
                const index = requestIndex++;
                const key = 'httprequest-' + index;
                const isAsync = args[2] !== false;

                try {
                    // Add to the list of pending requests.
                    TestingBehatBlocking.block(key);

                    // Detect when it finishes and remove it from the list.
                    if (isAsync) {
                        this.addEventListener('loadend', () => {
                            TestingBehatBlocking.unblock(key);
                        });
                    } else {
                        const realSend = this.send;
                        this.send = (...args) => {
                            try {
                                return realSend.apply(this, args);
                            } finally {
                                TestingBehatBlocking.unblock(key);
                            }
                        };
                    }

                    return realOpen.apply(this, args);
                } catch (error) {
                    TestingBehatBlocking.unblock(key);
                    throw error;
                }
            });
        };
    }

    /**
     * Wait for pending list to be empty.
     */
    async waitForPending(): Promise<void> {
        await CoreWait.waitFor(() => this.pendingList.length === 0);
    }

}

export const TestingBehatBlocking = makeSingleton(TestingBehatBlockingService);
