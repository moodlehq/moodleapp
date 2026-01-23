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

import { CoreNavigator } from '@services/navigator';
import { CoreModals } from '@services/overlays/modals';
import { Subject } from 'rxjs';
import { AsyncDirective } from './async-directive';
import { PageLoadWatcher } from './page-load-watcher';

/**
 * Class to manage requests in a page and its components.
 */
export class PageLoadsManager {

    onRefreshPage = new Subject<void>();

    protected initialPath?: string;
    protected currentLoadWatcher?: PageLoadWatcher;
    protected ongoingLoadWatchers = new Set<PageLoadWatcher>();

    /**
     * Start a page load, creating a new load watcher and watching the page.
     *
     * @param page Page instance.
     * @param staleWhileRevalidate Whether to use stale while revalidate strategy.
     * @returns Load watcher to use.
     */
    startPageLoad(page: AsyncDirective, staleWhileRevalidate: boolean): PageLoadWatcher {
        this.initialPath = this.initialPath ?? CoreNavigator.getCurrentPath();
        this.currentLoadWatcher = new PageLoadWatcher(this, staleWhileRevalidate);
        this.ongoingLoadWatchers.add(this.currentLoadWatcher);

        this.currentLoadWatcher.watchComponent(page);

        return this.currentLoadWatcher;
    }

    /**
     * Start a component load, adding it to currrent load watcher (if it exists) and watching the component.
     *
     * @param component Component instance.
     * @returns Load watcher to use.
     */
    startComponentLoad(component: AsyncDirective): PageLoadWatcher {
        // If a component is loading data without the page loading data, probably the component is reloading/refreshing.
        // In that case, create a load watcher instance but don't store it in currentLoadWatcher because it's not a page load.
        const loadWatcher = this.currentLoadWatcher ?? new PageLoadWatcher(this, false);

        loadWatcher.watchComponent(component);

        return loadWatcher;
    }

    /**
     * A load has finished, remove its watcher from ongoing watchers and notify if needed.
     *
     * @param loadWatcher Load watcher related to the load that finished.
     */
    onPageLoaded(loadWatcher: PageLoadWatcher): void {
        if (!this.ongoingLoadWatchers.has(loadWatcher)) {
            // Watcher not in list, it probably finished already.
            return;
        }

        this.removeLoadWatcher(loadWatcher);

        if (!loadWatcher.hasMeaningfulChanges()) {
            // No need to notify.
            return;
        }

        // Check if there is another ongoing load watcher using update in background.
        // If so, wait for the other one to finish before notifying to prevent being notified twice.
        const ongoingLoadWatcher = this.getAnotherOngoingUpdateInBackgroundWatcher(loadWatcher);
        if (ongoingLoadWatcher) {
            ongoingLoadWatcher.markMeaningfulChanges();

            return;
        }

        if (this.initialPath === CoreNavigator.getCurrentPath()) {
            // User hasn't changed page, notify them.
            this.notifyUser();
        } else {
            // User left the page, just update the data.
            this.onRefreshPage.next();
        }
    }

    /**
     * Get an ongoing load watcher that supports updating in background and is not the one passed as a parameter.
     *
     * @param loadWatcher Load watcher to ignore.
     * @returns Ongoing load watcher, undefined if none found.
     */
    protected getAnotherOngoingUpdateInBackgroundWatcher(loadWatcher: PageLoadWatcher): PageLoadWatcher | undefined {
        for (const ongoingLoadWatcher of this.ongoingLoadWatchers) {
            if (ongoingLoadWatcher.canUpdateInBackground() && loadWatcher !== ongoingLoadWatcher) {
                return ongoingLoadWatcher;
            }
        }
    }

    /**
     * Remove a load watcher from the list.
     *
     * @param loadWatcher Load watcher to remove.
     */
    protected removeLoadWatcher(loadWatcher: PageLoadWatcher): void {
        this.ongoingLoadWatchers.delete(loadWatcher);
        if (loadWatcher === this.currentLoadWatcher) {
            delete this.currentLoadWatcher;
        }
    }

    /**
     * Notify the user, asking him if he wants to update the data.
     */
    protected async notifyUser(): Promise<void> {
        const { CoreRefreshButtonModalComponent }
            = await import('@components/refresh-button-modal/refresh-button-modal');

        await CoreModals.openModal<boolean>({
            component: CoreRefreshButtonModalComponent,
            cssClass: 'core-modal-no-background core-modal-fullscreen',
            closeOnNavigate: true,
            showBackdrop: false,
        });

        this.onRefreshPage.next();
    }

}
