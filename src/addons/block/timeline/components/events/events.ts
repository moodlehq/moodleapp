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

import { Component, Input, Output, OnChanges, EventEmitter, SimpleChange } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourse } from '@features/course/services/course';
import moment from 'moment';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { AddonCalendarEvent } from '@addons/calendar/services/calendar';

/**
 * Directive to render a list of events in course overview.
 */
@Component({
    selector: 'addon-block-timeline-events',
    templateUrl: 'addon-block-timeline-events.html',
    styleUrls: ['events.scss'],
})
export class AddonBlockTimelineEventsComponent implements OnChanges {

    @Input() events: AddonBlockTimelineEvent[] = []; // The events to render.
    @Input() showCourse?: boolean | string; // Whether to show the course name.
    @Input() from = 0; // Number of days from today to offset the events.
    @Input() to?: number; // Number of days from today to limit the events to. If not defined, no limit.
    @Input() canLoadMore?: boolean; // Whether more events can be loaded.
    @Output() loadMore: EventEmitter<void>; // Notify that more events should be loaded.

    empty = true;
    loadingMore = false;
    filteredEvents: AddonBlockTimelineEventFilteredEvent[] = [];

    constructor() {
        this.loadMore = new EventEmitter();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        this.showCourse = CoreUtils.isTrueOrOne(this.showCourse);

        if (changes.events || changes.from || changes.to) {
            if (this.events && this.events.length > 0) {
                const filteredEvents = this.filterEventsByTime(this.from, this.to);
                this.empty = !filteredEvents || filteredEvents.length <= 0;

                const eventsByDay: Record<number, AddonCalendarEvent[]> = {};
                filteredEvents.forEach((event) => {
                    const dayTimestamp = CoreTimeUtils.getMidnightForTimestamp(event.timesort);
                    if (eventsByDay[dayTimestamp]) {
                        eventsByDay[dayTimestamp].push(event);
                    } else {
                        eventsByDay[dayTimestamp] = [event];
                    }
                });

                const todaysMidnight = CoreTimeUtils.getMidnightForTimestamp();
                this.filteredEvents = [];
                Object.keys(eventsByDay).forEach((key) => {
                    const dayTimestamp = parseInt(key);
                    this.filteredEvents.push({
                        color: dayTimestamp < todaysMidnight ? 'danger' : 'light',
                        dayTimestamp,
                        events: eventsByDay[dayTimestamp],
                    });
                });
            } else {
                this.empty = true;
            }
        }
    }

    /**
     * Filter the events by time.
     *
     * @param start Number of days to start getting events from today. E.g. -1 will get events from yesterday.
     * @param end Number of days after the start.
     * @return Filtered events.
     */
    protected filterEventsByTime(start: number, end?: number): AddonBlockTimelineEvent[] {
        start = moment().add(start, 'days').startOf('day').unix();
        end = typeof end != 'undefined' ? moment().add(end, 'days').startOf('day').unix() : end;

        return this.events.filter((event) => {
            if (end) {
                return start <= event.timesort && event.timesort < end;
            }

            return start <= event.timesort;
        }).map((event) => {
            event.iconUrl = CoreCourse.getModuleIconSrc(event.icon.component);
            event.iconTitle = event.modulename && CoreCourse.translateModuleName(event.modulename);

            return event;
        });
    }

    /**
     * Load more events clicked.
     */
    loadMoreEvents(): void {
        this.loadingMore = true;
        this.loadMore.emit();
    }

    /**
     * Action clicked.
     *
     * @param e Click event.
     * @param url Url of the action.
     */
    async action(e: Event, url: string): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        // Fix URL format.
        url = CoreTextUtils.decodeHTMLEntities(url);

        const modal = await CoreDomUtils.showModalLoading();

        try {
            const treated = await CoreContentLinksHelper.handleLink(url);
            if (!treated) {
                return CoreSites.getCurrentSite()?.openInBrowserWithAutoLoginIfSameSite(url);
            }
        } finally {
            modal.dismiss();
        }
    }

}

type AddonBlockTimelineEvent = AddonCalendarEvent & {
    iconUrl?: string;
    iconTitle?: string;
};

type AddonBlockTimelineEventFilteredEvent = {
    events: AddonBlockTimelineEvent[];
    dayTimestamp: number;
    color: string;
};
