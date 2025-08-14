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

import { Component, computed, input } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';
import { LMSBadgeStyle } from '@/core/constants';

/**
 * Component to display an action link or an overview action in an overview item.
 */
@Component({
    selector: 'core-course-overview-item-action',
    templateUrl: 'overview-item-action.html',
    styleUrl: 'overview-item-action.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseOverviewItemActionComponent {

    readonly courseId = input.required<number>();
    readonly activity = input.required<CoreCourseOverviewActivity>();
    readonly item = input.required<CoreCourseOverviewItem<ActionLinkItemData | OverviewActionItemData>>();

    readonly content = computed(() => {
        const parsedData = this.item().parsedData;

        return 'onlytext' in parsedData ? parsedData.onlytext : parsedData.content;
    });

    readonly badge = computed(() => {
        const parsedData = this.item().parsedData;

        return 'badge' in parsedData ? parsedData.badge : undefined;
    });

    readonly badgeColor = computed(() => {
        const badge = this.badge();
        if (!badge) {
            return;
        }

        switch (badge.style) {
            case LMSBadgeStyle.PRIMARY:
                return 'primary';
            case LMSBadgeStyle.SECONDARY:
                return 'secondary';
            case LMSBadgeStyle.SUCCESS:
                return 'success';
            case LMSBadgeStyle.DANGER:
                return 'danger';
            case LMSBadgeStyle.WARNING:
                return 'warning';
            case LMSBadgeStyle.INFO:
                return 'info';
        }
    });

}

type ActionLinkItemData = {
    content: string; // The rendered content of the action link. This can include advanced HTML like a badge.
    linkurl: string; // The URL of the action link.
    icondata?: PixIconData | null; // The icon data for the action link, if any.
    classes?: string | null; // A space-separated list of CSS classes to apply to the action link.
    contenttype?: string | null; // The type of the link content.
    contentjson?: string | null; // The data for the link content, if it is an exportable object.
};

type OverviewActionItemData = ActionLinkItemData & {
    onlytext: string; // The text of the action item without the badge's HTML.
    badge?: OverviewActionBadge | null;
};

type PixIconData = {
    pix?: string | null; // The pix icon. E.g. i/checkedcircle.
    component?: string | null; // The component the icon belongs to.
    extras: {
        name: string;
        value: string;
    }[];
};

type OverviewActionBadge = {
    value: string; // Value of the badge.
    title: string; // Title of the badge.
    style: string; // Style of the badge, e.g. 'primary'.
};
