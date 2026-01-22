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

import { CoreDelegateDisplayHandler, CoreDelegateToDisplay } from '@classes/delegate';
import { CoreSortedDelegate } from '@classes/delegate-sorted';
import { makeSingleton } from '@singletons';

/**
 * Interface that all settings handlers must implement.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CoreSettingsHandler extends CoreDelegateDisplayHandler<CoreSettingsHandlerToDisplay> {}

/**
 * Main data returned by the handler.
 */
type CoreSettingsHandlerBaseData = {
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
};

type CoreSettingsToggleHandlerData = CoreSettingsHandlerBaseData & {
    /**
     * Toggle checked.
     */
    toggleChecked?: boolean;

    /**
     * Method for emit events to the handler.
     */
    toggle(checked: boolean): void;
};

type CoreSettingsPageHandlerData = CoreSettingsHandlerBaseData & {
    /**
     * Name of the page to load for the handler.
     */
    page: string;

    /**
     * Params list of the page to load for the handler.
     */
    params?: Params;
};

/**
 * Data needed to render a setting handler. It's returned by the handler.
 */
export type CoreSettingsHandlerData = CoreSettingsPageHandlerData | CoreSettingsToggleHandlerData;

/**
 * Data returned by the delegate for each handler.
 */
export type CoreSettingsHandlerToDisplay = CoreDelegateToDisplay & CoreSettingsHandlerData;

/**
 * Data returned by the delegate for each handler to be displayed in pages.
 */
export type CoreSettingsPageHandlerToDisplay = CoreDelegateToDisplay & CoreSettingsPageHandlerData;

/**
 * Service to interact with addons to be shown in app settings. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({ providedIn: 'root' })
export class CoreSettingsDelegateService extends CoreSortedDelegate<CoreSettingsHandlerToDisplay, CoreSettingsHandler> {
}
export const CoreSettingsDelegate = makeSingleton(CoreSettingsDelegateService);
