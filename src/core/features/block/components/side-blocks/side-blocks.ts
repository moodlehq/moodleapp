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

import { Component, ViewChildren, Input, OnInit, QueryList } from '@angular/core';
import { ModalController } from '@singletons';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse, CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockHelper } from '../../services/block-helper';
import { CoreBlockComponent } from '../block/block';
import { CoreUtils } from '@services/utils/utils';
import { IonRefresher } from '@ionic/angular';
import { CoreCoursesDashboard } from '@features/courses/services/dashboard';

/**
 * Component that displays the list of side blocks.
 */
@Component({
    selector: 'core-block-side-blocks',
    templateUrl: 'side-blocks.html',
    styleUrls: ['side-blocks.scss'],
})
export class CoreBlockSideBlocksComponent implements OnInit {

    @Input() contextLevel!: string;
    @Input() instanceId!: number;
    @Input() myDashboardPage?: string;

    @ViewChildren(CoreBlockComponent) blocksComponents?: QueryList<CoreBlockComponent>;

    loaded = false;
    blocks: CoreCourseBlock[] = [];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.loadContent().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Invalidate blocks data.
     *
     * @returns Promise resolved when done.
     */
    async invalidateBlocks(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.contextLevel === 'course') {
            promises.push(CoreCourse.invalidateCourseBlocks(this.instanceId));
        } else {
            promises.push(CoreCoursesDashboard.invalidateDashboardBlocks());
        }

        // Invalidate the blocks.
        this.blocksComponents?.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        await Promise.all(promises);
    }

    /**
     * Convenience function to fetch the data.
     *
     * @returns Promise resolved when done.
     */
    async loadContent(): Promise<void> {
        try {
            if (this.contextLevel === 'course') {
                this.blocks = await CoreBlockHelper.getCourseBlocks(this.instanceId);
            } else {
                const blocks = await CoreCoursesDashboard.getDashboardBlocks(undefined, undefined, this.myDashboardPage);

                this.blocks = blocks.sideBlocks;
            }
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            this.blocks = [];
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async doRefresh(refresher?: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(this.invalidateBlocks());

        await this.loadContent().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
