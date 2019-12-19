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
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Interface that all settings handlers must implement.
 */
export interface CoreSettingsHandler extends CoreDelegateHandler {
    /**
     * The highest priority is displayed first.
     */
    priority: number;

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data.
     */
    getDisplayData(): CoreSettingsHandlerData;
}

/**
 * Data needed to render a setting handler. It's returned by the handler.
 */
export interface CoreSettingsHandlerData {
    /**
     * Name of the page to load for the handler.
     */
    page: string;

    /**
     * Params list of the page to load for the handler.
     */
    params?: any;

    /**
     * Title to display for the handler.
     */
    title: string;

    /**
     * Name of the icon to display for the handler.
     */
    icon?: string; // Name of the icon to display in the menu.

    /**
     * Class to add to the displayed handler.
     */
    class?: string;
}

/**
 * Service to interact with addons to be shown in app settings. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable()
export class CoreSettingsDelegate extends CoreDelegate {

    protected siteHandlers: CoreSettingsHandlerData[] = []; // Handlers to return.

    constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected eventsProvider: CoreEventsProvider, protected utils: CoreUtilsProvider) {
        super('CoreSettingsDelegate', loggerProvider, sitesProvider, eventsProvider);

        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearSiteHandlers.bind(this));
    }

    /**
     * Clear current site handlers. Reserved for core use.
     */
    clearSiteHandlers(): void {
        this.siteHandlers = [];
    }

    /**
     * Get the handlers for the current site.
     */
    getHandlers(): CoreSettingsHandlerData[] {
        return this.siteHandlers;
    }

    /**
     * Update handlers Data.
     */
    updateData(): void {
        const handlersData: any[] = [];

        for (const name in this.enabledHandlers) {
            const handler = <CoreSettingsHandler> this.enabledHandlers[name],
                data = handler.getDisplayData();

            handlersData.push({
                data: data,
                priority: handler.priority
            });
        }

        // Sort them by priority.
        handlersData.sort((a, b) => {
            return b.priority - a.priority;
        });

        // Return only the display data.
        this.siteHandlers = handlersData.map((item) => {
            return item.data;
        });
    }
}
