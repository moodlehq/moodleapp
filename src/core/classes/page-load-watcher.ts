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

import { CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@static/promise-utils';
import { Subscription } from 'rxjs';
import type { AsyncDirective } from '../types/async-directive';
import { PageLoadsManager } from './page-loads-manager';
import { CorePromisedValue } from './promised-value';
import { WSObservable } from './sites/authenticated-site';
import { CoreWait } from '@static/wait';

/**
 * Class to watch requests from a page load (including requests from page sub-components).
 */
export class PageLoadWatcher {

    protected hasChanges = false;
    protected ongoingRequests = 0;
    protected components = new Set<AsyncDirective>();
    protected loadedTimeout?: number;
    protected hasChangesPromises: Promise<boolean>[] = [];

    constructor(
        protected loadsManager: PageLoadsManager,
        protected updateInBackground: boolean,
    ) { }

    /**
     * Whether this load watcher can update data in background.
     *
     * @returns Whether this load watcher can update data in background.
     */
    canUpdateInBackground(): boolean {
        return this.updateInBackground;
    }

    /**
     * Whether this load watcher had meaningful changes received in background.
     *
     * @returns Whether this load watcher had meaningful changes received in background.
     */
    hasMeaningfulChanges(): boolean {
        return this.hasChanges;
    }

    /**
     * Set has meaningful changes to true.
     */
    markMeaningfulChanges(): void {
        this.hasChanges = true;
    }

    /**
     * Watch a component, waiting for it to be ready.
     *
     * @param component Component instance.
     */
    async watchComponent(component: AsyncDirective): Promise<void> {
        this.components.add(component);
        clearTimeout(this.loadedTimeout);

        try {
            await component.ready();
        } finally {
            this.components.delete(component);
            this.checkHasLoaded();
        }
    }

    /**
     * Get the reading strategy to use.
     *
     * @returns Reading strategy to use.
     */
    getReadingStrategy(): CoreSitesReadingStrategy | undefined {
        return this.updateInBackground ? CoreSitesReadingStrategy.STALE_WHILE_REVALIDATE : undefined;
    }

    /**
     * Watch a WS request, handling the different values it can return, calling the hasMeaningfulChanges callback if needed to
     * detect if there are new meaningful changes in the page load, and completing the page load when all requests have
     * finished and all components are ready.
     *
     * @param observable Observable of the request.
     * @param hasMeaningfulChanges Callback to check if there are meaningful changes if data was updated in background.
     * @returns First value of the observable.
     */
    watchRequest<T>(
        observable: WSObservable<T>,
        hasMeaningfulChanges?: (previousValue: T, newValue: T) => Promise<boolean>,
    ): Promise<T> {
        const promisedValue = new CorePromisedValue<T>();
        let subscription: Subscription | null = null;
        let firstValue: T | undefined;
        this.ongoingRequests++;
        clearTimeout(this.loadedTimeout);

        const complete = async () => {
            this.ongoingRequests--;
            this.checkHasLoaded();

            // Subscription variable might not be set because the observable completed immediately. Wait for next tick.
            await CoreWait.nextTick();
            subscription?.unsubscribe();
        };

        subscription = observable.subscribe({
            next: value => {
                if (!firstValue) {
                    firstValue = value;
                    promisedValue.resolve(value);

                    return;
                }

                // Second value, it means data was updated in background. Compare data.
                if (!hasMeaningfulChanges) {
                    return;
                }

                this.hasChangesPromises.push(CorePromiseUtils.ignoreErrors(hasMeaningfulChanges(firstValue, value), false));
            },
            error: (error) => {
                promisedValue.reject(error);
                complete();
            },
            complete: () => complete(),
        });

        return promisedValue;
    }

    /**
     * Check if the load has finished.
     */
    protected checkHasLoaded(): void {
        if (this.ongoingRequests !== 0 || this.components.size !== 0) {
            // Load not finished.
            return;
        }

        // It seems load has finished. Wait to make sure no new component has been rendered and started loading.
        // If a new component or a new request starts the timeout will be cancelled, no need to double check it.
        clearTimeout(this.loadedTimeout);
        this.loadedTimeout = window.setTimeout(async () => {
            // Loading finished. Calculate has changes.
            const values = await Promise.all(this.hasChangesPromises);
            this.hasChanges = this.hasChanges || values.includes(true);

            this.loadsManager.onPageLoaded(this);
        }, 100);
    }

}
