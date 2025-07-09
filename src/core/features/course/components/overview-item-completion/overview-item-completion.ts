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

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleWSCompletionData } from '@features/course/services/course';
import { CoreCourseModuleCompletionComponent } from '../module-completion/module-completion';
import { CoreCourseHelper, CoreCourseModuleCompletionData } from '@features/course/services/course-helper';
import { CoreCourseModuleCompletionTracking } from '@features/course/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourseOverview, CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';

/**
 * Component to display module completion information in an overview item.
 */
@Component({
    selector: 'core-course-overview-item-completion',
    templateUrl: 'overview-item-completion.html',
    styleUrl: 'overview-item-completion.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleCompletionComponent,
    ],
})
export class CoreCourseOverviewItemCompletionComponent implements OnChanges {

    // Don't use signal inputs yet because core-dynamic-component still isn't adapted to use them.
    @Input({ required: true }) courseId!: number;
    @Input({ required: true }) activity!: CoreCourseOverviewActivity;
    @Input({ required: true }) item!: CoreCourseOverviewItem<CoreCourseModuleWSCompletionData>;

    protected completion?: CoreCourseModuleCompletionData;

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (!changes.item || !this.item) {
            return;
        }

        // @todo: This data could be calculated in the completion components to make them more reusable.
        this.completion = await CoreCourseHelper.loadOfflineCompletionData(this.activity.cmid, {
            ...this.item.parsedData,
            tracking: this.item.parsedData.isautomatic ?
                CoreCourseModuleCompletionTracking.AUTOMATIC : CoreCourseModuleCompletionTracking.MANUAL,
            cmid: this.activity.cmid,
            courseId: this.courseId,
        });
    }

    /**
     * Completion has changed.
     */
    onCompletionChanged(): void {
        // Only invalidate the data, don't re-fetch it to decrease data usage.
        // This means that if a user then accesses the overview in offline he can see outdated info.
        CorePromiseUtils.ignoreErrors(CoreCourseOverview.invalidateInformation(this.courseId, this.activity.modname));
    }

}
