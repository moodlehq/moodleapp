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

import { Component, OnDestroy, ViewChild } from '@angular/core';

import { CoreCourseModuleMainActivityPage } from '@features/course/classes/main-activity-page';
import { CanLeave } from '@guards/can-leave';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { AddonModH5PActivityIndexComponent } from '../../components/index';

/**
 * Page that displays an H5P activity.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-index',
    templateUrl: 'index.html',
})
export class AddonModH5PActivityIndexPage extends CoreCourseModuleMainActivityPage<AddonModH5PActivityIndexComponent>
    implements CanLeave, OnDestroy {

    canLeaveSafely = false;
    remainingTimeout?: number;

    @ViewChild(AddonModH5PActivityIndexComponent) activityComponent?: AddonModH5PActivityIndexComponent;

    /**
     * @inheritdoc
     */
    async canLeave(): Promise<boolean> {
        if (!this.activityComponent || !this.activityComponent.playing || this.activityComponent.isOpeningPage) {
            return true;
        }

        if (!this.canLeaveSafely) {
            try {
                await CoreDomUtils.showConfirm(Translate.instant('core.confirmleaveunknownchanges'));

                return true;
            } catch {
                return false;
            }
        }

        return true;
    }

    /**
     * Set if this activity can be leaved safely (withow showing warning modal) if activity is finished
     * 10 seconds before.
     *
     * @param isDone the H5P activity is done.
     */
    setCanleaveSafely(isDone: boolean): void {
        this.canLeaveSafely = isDone;
        if (this.remainingTimeout) {
            clearTimeout(this.remainingTimeout);
        }
        // When user finish an activity, he have 10 seconds to leave safely (without show alert).
        this.remainingTimeout = window.setTimeout(() => {
            this.canLeaveSafely = false;
        }, 10000);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        if (this.remainingTimeout) {
            clearTimeout(this.remainingTimeout);
        }
    }

}
