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

import { AddonCalendarEventToDisplay } from '@addons/calendar/services/calendar';
import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';

/**
 * Provides a collection of calendar events.
 */
export class AddonCalendarEventsSource extends CoreRoutedItemsManagerSource<AddonCalendarEventToDisplay> {

    readonly date: string;

    private events: AddonCalendarEventToDisplay[] = [];

    constructor(date: string) {
        super();

        this.date = date;
    }

    /**
     * Set events.
     *
     * @param events Events.
     */
    setEvents(events: AddonCalendarEventToDisplay[]): void {
        this.events = events;
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: AddonCalendarEventToDisplay[] }> {
        return { items: this.events.slice(0) };
    }

    /**
     * @inheritdoc
     */
    getItemPath(event: AddonCalendarEventToDisplay): string {
        return event.id.toString();
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        return { date: this.date };
    }

}
