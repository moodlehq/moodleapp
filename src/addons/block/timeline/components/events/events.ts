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
import { CoreCourse } from '@features/course/services/course';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { AddonCalendarEvent } from '@addons/calendar/services/calendar';
import { CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { AddonBlockTimeline } from '../../services/timeline';

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
    @Input() course?: CoreEnrolledCourseDataWithOptions; // Whether to show the course name.
    @Input() from = 0; // Number of days from today to offset the events.
    @Input() to?: number; // Number of days from today to limit the events to. If not defined, no limit.
    @Input() overdue = false; // If filtering overdue events or not.
    @Input() canLoadMore = false; // Whether more events can be loaded.
    @Output() loadMore = new EventEmitter(); // Notify that more events should be loaded.

    showCourse = false; // Whether to show the course name.
    empty = true;
    loadingMore = false;
    filteredEvents: AddonBlockTimelineEventFilteredEvent[] = [];

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: {[name: string]: SimpleChange}): Promise<void> {
        this.showCourse = !this.course;

        if (changes.events || changes.from || changes.to) {
            if (this.events) {
                const filteredEvents = await this.filterEventsByTime();
                this.empty = !filteredEvents || filteredEvents.length <= 0;

                const eventsByDay: Record<number, AddonBlockTimelineEvent[]> = {};
                filteredEvents.forEach((event) => {
                    const dayTimestamp = CoreTimeUtils.getMidnightForTimestamp(event.timesort);

                    if (eventsByDay[dayTimestamp]) {
                        eventsByDay[dayTimestamp].push(event);
                    } else {
                        eventsByDay[dayTimestamp] = [event];
                    }
                });

                this.filteredEvents =  Object.keys(eventsByDay).map((key) => {
                    const dayTimestamp = parseInt(key);

                    return {
                        dayTimestamp,
                        events: eventsByDay[dayTimestamp],
                    };
                });
                this.loadingMore = false;
            } else {
                this.empty = true;
            }
        }
    }

    /**
     * Filter the events by time.
     *
     * @return Filtered events.
     */
    protected async filterEventsByTime(): Promise<AddonBlockTimelineEvent[]> {
        const start = AddonBlockTimeline.getDayStart(this.from);
        const end = this.to !== undefined
            ? AddonBlockTimeline.getDayStart(this.to)
            : undefined;

        const now = CoreTimeUtils.timestamp();
        const midnight = AddonBlockTimeline.getDayStart();

        return await Promise.all(this.events.filter((event) => {
            if (start > event.timesort || (end && event.timesort >= end)) {
                return false;
            }

            // Already calculated on 4.0 onwards but this will be live.
            event.overdue = event.timesort < now;

            if (event.eventtype === 'open' || event.eventtype === 'opensubmission') {
                const dayTimestamp = CoreTimeUtils.getMidnightForTimestamp(event.timesort);

                return dayTimestamp > midnight;
            }

            // When filtering by overdue, we fetch all events due today, in case any have elapsed already and are overdue.
            // This means if filtering by overdue, some events fetched might not be required (eg if due later today).
            return (!this.overdue || event.overdue);
        }).map(async (event) => {
            event.iconUrl = await CoreCourse.getModuleIconSrc(event.icon.component);
            event.modulename = event.modulename || event.icon.component;
            event.iconTitle = CoreCourse.translateModuleName(event.modulename);

            return event;
        }));
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
     * @param event Click event.
     * @param url Url of the action.
     */
    async action(event: Event, url: string): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        // Fix URL format.
        url = CoreTextUtils.decodeHTMLEntities(url);

        const modal = await CoreDomUtils.showModalLoading();

        try {
            const treated = await CoreContentLinksHelper.handleLink(url);
            if (!treated) {
                return CoreSites.getRequiredCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
            }
        } finally {
            modal.dismiss();
        }
    }

}

type AddonBlockTimelineEvent = Omit<AddonCalendarEvent, 'eventtype'> & {
    eventtype: string;
    iconUrl?: string;
    iconTitle?: string;
};

type AddonBlockTimelineEventFilteredEvent = {
    events: AddonBlockTimelineEvent[];
    dayTimestamp: number;
};
