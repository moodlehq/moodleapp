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

import { Component, ViewChildren, Input, OnInit, QueryList, ElementRef, OnDestroy } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreAppProvider } from '@providers/app';
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
export class CoreBlockCourseBlocksComponent implements OnInit, OnDestroy {

    @Input() courseId: number;
    @Input() hideBlocks = false;
    @Input() downloadEnabled: boolean;

    @ViewChildren(CoreBlockComponent) blocksComponents: QueryList<CoreBlockComponent>;

    dataLoaded = false;
    blocks = [];

    protected element: HTMLElement;
    protected lastScroll;
    protected translationY = 0;
    protected blocksScrollHeight = 0;
    protected sideScroll: HTMLElement;
    protected vpHeight = 0; // Viewport height.
    protected scrollWorking = false;

    constructor(private domUtils: CoreDomUtilsProvider, private courseProvider: CoreCourseProvider,
            protected blockHelper: CoreBlockHelperProvider, element: ElementRef,
            protected content: Content, protected appProvider: CoreAppProvider) {
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.loadContent().finally(() => {
            this.dataLoaded = true;

            window.addEventListener('resize', this.initScroll.bind(this));
        });
    }

    /**
     * Setup scrolling.
     */
    protected initScroll(): void {
        if (this.blocks.length <= 0) {
            return;
        }

        const scroll: HTMLElement = this.content && this.content.getScrollElement();

        this.domUtils.waitElementToExist(() => scroll && scroll.querySelector('.core-course-blocks-side')).then((sideElement) => {
            const contentHeight = parseInt(this.content.getNativeElement().querySelector('.scroll-content').scrollHeight, 10);

            this.sideScroll = scroll.querySelector('.core-course-blocks-side-scroll');
            this.blocksScrollHeight = this.sideScroll.scrollHeight;
            this.vpHeight = sideElement.clientHeight;

            // Check if needed and event was not init before.
            if (this.appProvider.isWide() && this.vpHeight && contentHeight > this.vpHeight &&
                    this.blocksScrollHeight > this.vpHeight) {
                if (typeof this.lastScroll == 'undefined') {
                    this.lastScroll = 0;
                    scroll.addEventListener('scroll', this.scrollFunction.bind(this));
                }
                this.scrollWorking = true;
            } else {
                this.sideScroll.style.transform = 'translate(0, 0)';
                this.sideScroll.classList.remove('core-course-blocks-fixed-bottom');
                this.scrollWorking = false;
            }
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Scroll function that moves the sidebar if needed.
     *
     * @param {Event} e Event to get the target from.
     */
    protected scrollFunction(e: Event): void {
        if (!this.scrollWorking) {
            return;
        }

        const target: any = e.target,
            top = parseInt(target.scrollTop, 10),
            goingUp = top < this.lastScroll;
        if (goingUp) {
            this.sideScroll.classList.remove('core-course-blocks-fixed-bottom');
            if (top <= this.translationY ) {
                // Fixed to top.
                this.translationY = top;
                this.sideScroll.style.transform = 'translate(0, ' + this.translationY + 'px)';
            }
        } else if (top - this.translationY >= (this.blocksScrollHeight - this.vpHeight)) {
            // Fixed to bottom.
            this.sideScroll.classList.add('core-course-blocks-fixed-bottom');
            this.translationY = top - (this.blocksScrollHeight - this.vpHeight);
            this.sideScroll.style.transform = 'translate(0, ' + this.translationY + 'px)';
        }

        this.lastScroll = top;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        window.removeEventListener('resize', this.initScroll);
    }

    /**
     * Invalidate blocks data.
     *
     * @return {Promise<any>} Promise resolved when done.
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
     * @return {Promise<any>} Promise resolved when done.
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

                this.initScroll();
            } else {
                this.element.classList.remove('core-has-blocks');
                this.element.classList.add('core-no-blocks');
                this.content.getElementRef().nativeElement.classList.remove('core-course-block-with-blocks');
            }
        });
    }
}
