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

import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CorePlatform } from '@services/platform';

/**
 * Static class with helper functions to wait.
 */
export class CoreWait {

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Wait until the next tick.
     *
     * @returns Promise resolved when tick has been done.
     */
    static async nextTick(): Promise<void> {
        return CoreWait.wait(0);
    }

    /**
     * Wait until several next ticks.
     *
     * @param numTicks Number of ticks to wait.
     */
    static async nextTicks(numTicks = 0): Promise<void> {
        for (let i = 0; i < numTicks; i++) {
            await CoreWait.wait(0);
        }
    }

    /**
     * Wait some time.
     *
     * @param milliseconds Number of milliseconds to wait.
     * @returns Promise resolved after the time has passed.
     */
    static wait(milliseconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    /**
     * Wait until a given condition is met.
     *
     * @param condition Condition.
     * @returns Cancellable promise.
     */
    static waitFor(condition: () => boolean): CoreCancellablePromise<void>;
    static waitFor(condition: () => boolean, options: CoreWaitOptions): CoreCancellablePromise<void>;
    static waitFor(condition: () => boolean, interval: number): CoreCancellablePromise<void>;
    static waitFor(condition: () => boolean, optionsOrInterval: CoreWaitOptions | number = {}): CoreCancellablePromise<void> {
        const options = typeof optionsOrInterval === 'number' ? { interval: optionsOrInterval } : optionsOrInterval;

        if (condition()) {
            return CoreCancellablePromise.resolve();
        }

        const startTime = Date.now();
        let intervalId: number | undefined;

        return new CoreCancellablePromise<void>(
            async (resolve) => {
                intervalId = window.setInterval(() => {
                    if (!condition() && (!options.timeout || (Date.now() - startTime < options.timeout))) {
                        return;
                    }

                    resolve();
                    window.clearInterval(intervalId);
                }, options.interval ?? 50);
            },
            () => window.clearInterval(intervalId),
        );
    }

    /**
     * In iOS the resize event is triggered before the window size changes. Wait for the size to change.
     * Use of this function is discouraged. Please use CoreDom.onWindowResize to check window resize event.
     *
     * @param windowWidth Initial window width.
     * @param windowHeight Initial window height.
     * @param retries Number of retries done.
     * @returns Promise resolved when done.
     */
    static async waitForResizeDone(windowWidth?: number, windowHeight?: number, retries = 0): Promise<void> {
        if (!CorePlatform.isIOS()) {
            return; // Only wait in iOS.
        }

        windowWidth = windowWidth || window.innerWidth;
        windowHeight = windowHeight || window.innerHeight;

        if (windowWidth !== window.innerWidth || windowHeight !== window.innerHeight || retries >= 10) {
            // Window size changed or max number of retries reached, stop.
            return;
        }

        // Wait a bit and try again.
        await CoreWait.wait(50);

        return CoreWait.waitForResizeDone(windowWidth, windowHeight, retries+1);
    }

    /**
     * Wait for images to load.
     *
     * @param element The element to search in.
     * @returns Promise resolved with a boolean: whether there was any image to load.
     */
    static waitForImages(element: HTMLElement): CoreCancellablePromise<boolean> {
        const imgs = Array.from(element.querySelectorAll('img'));

        if (imgs.length === 0) {
            return CoreCancellablePromise.resolve(false);
        }

        let completedImages = 0;
        let waitedForImages = false;
        const listeners: WeakMap<Element, () => unknown> = new WeakMap();
        const imageCompleted = (resolve: (result: boolean) => void) => {
            completedImages++;

            if (completedImages === imgs.length) {
                resolve(waitedForImages);
            }
        };

        return new CoreCancellablePromise<boolean>(
            resolve => {
                for (const img of imgs) {
                    if (!img || img.complete) {
                        imageCompleted(resolve);

                        continue;
                    }

                    waitedForImages = true;

                    // Wait for image to load or fail.
                    const imgCompleted = (): void => {
                        img.removeEventListener('load', imgCompleted);
                        img.removeEventListener('error', imgCompleted);

                        imageCompleted(resolve);
                    };

                    img.addEventListener('load', imgCompleted);
                    img.addEventListener('error', imgCompleted);

                    listeners.set(img, imgCompleted);
                }
            },
            () => {
                imgs.forEach(img => {
                    const listener = listeners.get(img);

                    if (!listener) {
                        return;
                    }

                    img.removeEventListener('load', listener);
                    img.removeEventListener('error', listener);
                });
            },
        );
    }

}

/**
 * Options for waiting.
 */
export type CoreWaitOptions = {
    interval?: number;
    timeout?: number;
};
