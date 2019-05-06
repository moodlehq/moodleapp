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

import { Component, ViewChildren, Input, OnInit, QueryList } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreBlockComponent } from '../block/block';
import { CoreBlockDelegate } from '../../providers/delegate';
import { CoreCourseProvider } from '@core/course/providers/course';

/**
 * Component that displays the list of course blocks.
 */
@Component({
    selector: 'core-block-course-blocks',
    templateUrl: 'core-block-course-blocks.html',
})
export class CoreBlockCourseBlocksComponent implements OnInit {

    @Input() courseId: number;

    @ViewChildren(CoreBlockComponent) blocksComponents: QueryList<CoreBlockComponent>;

    dataLoaded = false;
    hasContent: boolean;
    hasSupportedBlock: boolean;
    blocks = [];

    constructor(private domUtils: CoreDomUtilsProvider, private courseProvider: CoreCourseProvider,
            private blockDelegate: CoreBlockDelegate) {
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    doRefresh(refresher: any): void {
        const promises = [];

        if (this.courseProvider.canGetCourseBlocks()) {
            promises.push(this.courseProvider.invalidateCourseBlocks(this.courseId));
        }

        // Invalidate the blocks.
        this.blocksComponents.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        Promise.all(promises).finally(() => {
            this.loadContent().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadContent(): Promise<any> {
        // Get site home blocks.
        const canGetBlocks = this.courseProvider.canGetCourseBlocks(),
            promise = canGetBlocks ? this.courseProvider.getCourseBlocks(this.courseId) : Promise.reject(null);

        return promise.then((blocks) => {
            this.blocks = blocks;
            this.hasSupportedBlock = this.blockDelegate.hasSupportedBlock(blocks);

        }).catch((error) => {
            if (canGetBlocks) {
                this.domUtils.showErrorModal(error);
            }
            this.blocks = [];
        });

    }
}
