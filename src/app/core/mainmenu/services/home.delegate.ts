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
import { Params } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';

import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreEvents } from '@singletons/events';

/**
 * Interface that all main menu handlers must implement.
 */
export interface CoreHomeHandler extends CoreDelegateHandler {
    /**
     * The highest priority is displayed first.
     */
    priority?: number;

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data.
     */
    getDisplayData(): CoreHomeHandlerData;
}

/**
 * Data needed to render a main menu handler. It's returned by the handler.
 */
export interface CoreHomeHandlerData {
    /**
     * Name of the page to load for the handler.
     */
    page: string;

    /**
     * Title to display for the handler.
     */
    title: string;

    /**
     * Class to add to the displayed handler.
     */
    class?: string;

    /**
     * If true, the badge number is being loaded. Only used if showBadge is true.
     */
    loading?: boolean;

    /**
     * Params to pass to the page.
     */
    pageParams?: Params;

    /**
     * If the handler has badge to show or not.
     */
    showBadge?: boolean;

    /**
     * Text to display on the badge. Only used if showBadge is true.
     */
    badge?: string;

    /**
     * Name of the icon to display for the handler.
     */
    icon?: string; // Name of the icon to display in the tab.
}

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreHomeHandlerToDisplay extends CoreHomeHandlerData {
    /**
     * Name of the handler.
     */
    name?: string;

    /**
     * Priority of the handler.
     */
    priority?: number;

    /**
     * Priority to select handler.
     */
    selectPriority?: number;
}

/**
 * Service to interact with plugins to be shown in the main menu. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({
    providedIn: 'root',
})
export class CoreHomeDelegate extends CoreDelegate {

    protected loaded = false;
    protected siteHandlers: Subject<CoreHomeHandlerToDisplay[]> = new BehaviorSubject<CoreHomeHandlerToDisplay[]>([]);
    protected featurePrefix = 'CoreHomeDelegate_';

    constructor() {
        super('CoreHomeDelegate', true);

        CoreEvents.on(CoreEvents.LOGOUT, this.clearSiteHandlers.bind(this));
    }

    /**
     * Check if handlers are loaded.
     *
     * @return True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Clear current site handlers. Reserved for core use.
     */
    protected clearSiteHandlers(): void {
        this.loaded = false;
        this.siteHandlers.next([]);
    }

    /**
     * Get the handlers for the current site.
     *
     * @return An observable that will receive the handlers.
     */
    getHandlers(): Subject<CoreHomeHandlerToDisplay[]> {
        return this.siteHandlers;
    }

    /**
     * Update handlers Data.
     */
    updateData(): void {
        const displayData: CoreHomeHandlerToDisplay[] = [];

        for (const name in this.enabledHandlers) {
            const handler = <CoreHomeHandler> this.enabledHandlers[name];
            const data = <CoreHomeHandlerToDisplay> handler.getDisplayData();

            data.name = name;
            data.priority = handler.priority;

            displayData.push(data);
        }

        // Sort them by priority.
        displayData.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        this.loaded = true;
        this.siteHandlers.next(displayData);
    }

}
