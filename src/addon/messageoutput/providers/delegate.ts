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

/**
 * Interface that all message output handlers must implement.
 */
export interface AddonMessageOutputHandler extends CoreDelegateHandler {
    /**
     * The name of the processor. E.g. 'airnotifier'.
     */
    processorName: string;

    /**
     * Returns the data needed to render the handler.
     *
     * @param processor The processor object.
     * @return Data.
     */
    getDisplayData(processor: any): AddonMessageOutputHandlerData;
}

/**
 * Data needed to render a message output handler. It's returned by the handler.
 */
export interface AddonMessageOutputHandlerData {
    /**
     * Handler's priority.
     */
    priority: number;

    /**
     * Name of the page to load for the handler.
     */
    page: string;

    /**
     * Label to display for the handler.
     */
    label: string;

    /**
     * Name of the icon to display for the handler.
     */
    icon: string;

    /**
     * Params to pass to the page.
     */
    pageParams?: any;
}

/**
 * Delegate to register processors (message/output) to be used in places like notification preferences.
 */
 @Injectable()
 export class AddonMessageOutputDelegate extends CoreDelegate {

     protected handlerNameProperty = 'processorName';

     constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
             protected eventsProvider: CoreEventsProvider) {
         super('AddonMessageOutputDelegate', loggerProvider, sitesProvider, eventsProvider);
     }

    /**
     * Get the display data of the handler.
     *
     * @param processor The processor object.
     * @return Data.
     */
    getDisplayData(processor: any): AddonMessageOutputHandlerData {
        return this.executeFunctionOnEnabled(processor.name, 'getDisplayData', processor);
    }
}
