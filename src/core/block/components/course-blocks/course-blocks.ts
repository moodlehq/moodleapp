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
import { Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreBlockComponent } from '../block/block';
import { CoreBlockHelperProvider } from '../../providers/helper';

/**
 * Component that displays the list of course blocks.
 */
@Component({
    selector: 'core-block-course-blocks',
    templateUrl: 'core-block-course-blocks.html',
})
export class CoreBlockCourseBlocksComponent implements OnInit {

    @Input() courseId: number;
    @Input() hideBlocks = false;
    @Input() downloadEnabled: boolean;

    @ViewChildren(CoreBlockComponent) blocksComponents: QueryList<CoreBlockComponent>;

    dataLoaded = false;
    blocks = [];

    protected element: HTMLElement;

    constructor(private domUtils: CoreDomUtilsProvider, private courseProvider: CoreCourseProvider,
            protected blockHelper: CoreBlockHelperProvider, element: ElementRef,
            protected content: Content) {
        this.element = element.nativeElement;
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
     * Invalidate blocks data.
     *
     * @return Promise resolved when done.
     */
    invalidateBlocks(): Promise<any> {
        const promises = [];

        if (this.blockHelper.canGetCourseBlocks()) {
            promises.push(this.courseProvider.invalidateCourseBlocks(this.courseId));
        }

        // Invalidate the blocks.
        this.blocksComponents.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        return Promise.all(promises);
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return Promise resolved when done.
     */
    loadContent(): Promise<any> {
        return this.blockHelper.getCourseBlocks(this.courseId).then((blocks) => {
            this.blocks = blocks;
        }).catch((error) => {
            this.domUtils.showErrorModal(error);

            this.blocks = [];
        }).finally(() => {
            if (this.blocks.length > 0) {
                this.element.classList.add('core-has-blocks');
                this.element.classList.remove('core-no-blocks');

                this.content.getElementRef().nativeElement.classList.add('core-course-block-with-blocks');
            } else {
                this.element.classList.remove('core-has-blocks');
                this.element.classList.add('core-no-blocks');
                this.content.getElementRef().nativeElement.classList.remove('core-course-block-with-blocks');
            }
        });
    }
}
