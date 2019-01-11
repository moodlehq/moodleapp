// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Input, Output, OnChanges, EventEmitter, SimpleChange, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import * as moment from 'moment';

/**
 * Directive to render a list of events in course overview.
 */
@Component({
    selector: 'addon-block-timeline-events',
    templateUrl: 'addon-block-timeline-events.html'
})
export class AddonBlockTimelineEventsComponent implements OnChanges {
    @Input() events = []; // The events to render.
    @Input() showCourse?: boolean | string; // Whether to show the course name.
    @Input() from: number; // Number of days from today to offset the events.
    @Input() to?: number; // Number of days from today to limit the events to. If not defined, no limit.
    @Input() canLoadMore?: boolean; // Whether more events can be loaded.
    @Output() loadMore: EventEmitter<void>; // Notify that more events should be loaded.

    empty: boolean;
    loadingMore: boolean;
    filteredEvents = [];

    constructor(@Optional() private navCtrl: NavController, private utils: CoreUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private domUtils: CoreDomUtilsProvider,
            private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.loadMore = new EventEmitter();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        this.showCourse = this.utils.isTrueOrOne(this.showCourse);

        if (changes.events || changes.from || changes.to) {
            if (this.events && this.events.length > 0) {
                const filteredEvents = this.filterEventsByTime(this.from, this.to);
                this.empty = !filteredEvents || filteredEvents.length <= 0;

                const eventsByDay = {};
                filteredEvents.forEach((event) => {
                    const dayTimestamp = this.timeUtils.getMidnightForTimestamp(event.timesort);
                    if (eventsByDay[dayTimestamp]) {
                        eventsByDay[dayTimestamp].push(event);
                    } else {
                        eventsByDay[dayTimestamp] = [event];
                    }
                });

                const todaysMidnight = this.timeUtils.getMidnightForTimestamp();
                this.filteredEvents = [];
                Object.keys(eventsByDay).forEach((key) => {
                    const dayTimestamp = parseInt(key);
                    this.filteredEvents.push({
                        color: dayTimestamp < todaysMidnight ? 'danger' : 'light',
                        dayTimestamp: dayTimestamp,
                        events: eventsByDay[dayTimestamp]
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
     * @param {number} start Number of days to start getting events from today. E.g. -1 will get events from yesterday.
     * @param {number} [end] Number of days after the start.
     * @return {any[]} Filtered events.
     */
    protected filterEventsByTime(start: number, end?: number): any[] {
        start = moment().add(start, 'days').startOf('day').unix();
        end = typeof end != 'undefined' ? moment().add(end, 'days').startOf('day').unix() : end;

        return this.events.filter((event) => {
            if (end) {
                return start <= event.timesort && event.timesort < end;
            }

            return start <= event.timesort;
        }).map((event) => {
            event.iconUrl = this.courseProvider.getModuleIconSrc(event.icon.component);

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
     * @param {Event} e     Click event.
     * @param {string} url  Url of the action.
     */
    action(e: Event, url: string): void {
        e.preventDefault();
        e.stopPropagation();

        // Fix URL format.
        url = this.textUtils.decodeHTMLEntities(url);

        const modal = this.domUtils.showModalLoading();
        this.contentLinksHelper.handleLink(url, undefined, this.navCtrl).then((treated) => {
            if (!treated) {
                return this.sitesProvider.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
            }
        }).finally(() => {
            modal.dismiss();
        });
    }
}
