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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import * as moment from 'moment';

/**
 * Directive to render a list of events in course overview.
 */
@Component({
    selector: 'core-courses-overview-events',
    templateUrl: 'core-courses-overview-events.html'
})
export class CoreCoursesOverviewEventsComponent implements OnChanges {
    @Input() events: any[]; // The events to render.
    @Input() showCourse?: boolean | string; // Whether to show the course name.
    @Input() canLoadMore?: boolean; // Whether more events can be loaded.
    @Output() loadMore: EventEmitter<void>; // Notify that more events should be loaded.

    empty: boolean;
    loadingMore: boolean;
    recentlyOverdue: any[] = [];
    today: any[] = [];
    next7Days: any[] = [];
    next30Days: any[] = [];
    future: any[] = [];

    constructor(@Optional() private navCtrl: NavController, private utils: CoreUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private domUtils: CoreDomUtilsProvider,
            private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private contentLinksHelper: CoreContentLinksHelperProvider) {
        this.loadMore = new EventEmitter();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        this.showCourse = this.utils.isTrueOrOne(this.showCourse);

        if (changes.events) {
            this.updateEvents();
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
        start = moment().add(start, 'days').unix();
        end = typeof end != 'undefined' ? moment().add(end, 'days').unix() : end;

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
     * Update the events displayed.
     */
    protected updateEvents(): void {
        this.empty = !this.events || this.events.length <= 0;
        if (!this.empty) {
            this.recentlyOverdue = this.filterEventsByTime(-14, 0);
            this.today = this.filterEventsByTime(0, 1);
            this.next7Days = this.filterEventsByTime(1, 7);
            this.next30Days = this.filterEventsByTime(7, 30);
            this.future = this.filterEventsByTime(30);
        }
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
     * @param {Event} e Click event.
     * @param {string} url Url of the action.
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
