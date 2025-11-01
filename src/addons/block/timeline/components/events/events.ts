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

import { Component, OnInit, input, output, signal } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreText } from '@singletons/text';
import { CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { AddonBlockTimelineDayEvents } from '@addons/block/timeline/classes/section';
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';

/**
 * Directive to render a list of events in course overview.
 */
@Component({
    selector: 'addon-block-timeline-events',
    templateUrl: 'addon-block-timeline-events.html',
    styleUrl: 'events.scss',
    imports: [
        CoreSharedModule,
    ],
    host: {
        '[attr.data-course-id]': 'course()?.id ?? null',
        '[attr.data-category-id]': 'course()?.categoryid ?? null',
    },
})
export class AddonBlockTimelineEventsComponent implements OnInit {

    readonly events = input.required<AddonBlockTimelineDayEvents[]>(); // The events to render.
    readonly course = input.required<CoreEnrolledCourseDataWithOptions>(); // The course the events belong to.
    readonly showInlineCourse = input(true, { transform: toBoolean }); // Whether to show the course name within event items.
    readonly canLoadMore = input(false, { transform: toBoolean }); // Whether more events can be loaded.
    readonly loadingMore = input(false, { transform: toBoolean }); // Whether loading is ongoing.
    readonly loadMore = output(); // Notify that more events should be loaded.

    readonly colorizeIcons = signal(false);

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // Only colorize icons on 4.0 to 4.3 sites.
        this.colorizeIcons.set(!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.4'));
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
        url = CoreText.decodeHTMLEntities(url);

        const modal = await CoreLoadings.show();

        try {
            await CoreContentLinksHelper.visitLink(url);
        } finally {
            modal.dismiss();
        }
    }

}
