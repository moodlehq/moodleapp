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

import { Component, ViewChildren, Input, OnInit, QueryList, ElementRef } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse, CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockHelper } from '../../services/block-helper';
import { CoreBlockComponent } from '../block/block';
import { CoreUtils } from '@services/utils/utils';

/**
 * Component that displays the list of course blocks.
 */
@Component({
    selector: 'core-block-course-blocks',
    templateUrl: 'core-block-course-blocks.html',
    styleUrls: ['course-blocks.scss'],
})
export class CoreBlockCourseBlocksComponent implements OnInit {

    @Input() courseId!: number;
    @Input() hideBlocks = false;
    @Input() hideBottomBlocks = false;
    @Input() downloadEnabled = false;

    @ViewChildren(CoreBlockComponent) blocksComponents?: QueryList<CoreBlockComponent>;

    dataLoaded = false;
    blocks: CoreCourseBlock[] = [];

    protected element: HTMLElement;

    constructor(
        element: ElementRef,
        protected content: IonContent,
    ) {
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.element.classList.add('core-no-blocks');
        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Invalidate blocks data.
     *
     * @return Promise resolved when done.
     */
    async invalidateBlocks(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (CoreBlockHelper.canGetCourseBlocks()) {
            promises.push(CoreCourse.invalidateCourseBlocks(this.courseId));
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
     * @return Promise resolved when done.
     */
    async loadContent(): Promise<void> {

        try {
            this.blocks = await CoreBlockHelper.getCourseBlocks(this.courseId);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            this.blocks = [];
        }

        const scrollElement = await this.content.getScrollElement();
        if (!this.hideBlocks && this.blocks.length > 0) {
            this.element.classList.add('core-has-blocks');
            this.element.classList.remove('core-no-blocks');

            scrollElement.classList.add('core-course-block-with-blocks');
        } else {
            this.element.classList.remove('core-has-blocks');
            this.element.classList.add('core-no-blocks');
            scrollElement.classList.remove('core-course-block-with-blocks');
        }
    }

    /**
     * Refresh data.
     *
     * @return Promise resolved when done.
     */
    async doRefresh(): Promise<void> {
        await CoreUtils.ignoreErrors(this.invalidateBlocks());

        await this.loadContent();
    }

}
