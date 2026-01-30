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

import { Component, OnInit, ElementRef, inject, input, signal, viewChildren } from '@angular/core';
import { ModalController } from '@singletons';
import { CoreCourse, CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockHelper } from '../../services/block-helper';
import { CoreBlockComponent } from '../block/block';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreCoursesDashboard } from '@features/courses/services/dashboard';
import { CoreDom } from '@static/dom';
import { ContextLevel } from '@/core/constants';
import { CoreWait } from '@static/wait';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCoursesMyPageName } from '@features/courses/constants';

/**
 * Component that displays the list of side blocks.
 */
@Component({
    selector: 'core-block-side-blocks',
    templateUrl: 'side-blocks.html',
    styleUrl: 'side-blocks.scss',
    imports: [
        CoreSharedModule,
        CoreBlockComponent,
    ],
})
export class CoreBlockSideBlocksComponent implements OnInit {

    readonly contextLevel = input.required<ContextLevel>();
    readonly instanceId = input.required<number>();
    readonly initialBlockInstanceId = input<number>();
    readonly myDashboardPage = input<CoreCoursesMyPageName>();

    readonly blocksComponents = viewChildren(CoreBlockComponent);

    readonly loaded = signal(false);
    readonly blocks = signal<CoreCourseBlock[]>([]);

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.loadContent().finally(() => {
            this.loaded.set(true);

            this.focusInitialBlock();
        });
    }

    /**
     * Invalidate blocks data.
     */
    async invalidateBlocks(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.contextLevel() === ContextLevel.COURSE) {
            promises.push(CoreCourse.invalidateCourseBlocks(this.instanceId()));
        } else {
            promises.push(CoreCoursesDashboard.invalidateDashboardBlocks());
        }

        // Invalidate the blocks.
        this.blocksComponents()?.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        await CorePromiseUtils.allPromisesIgnoringErrors(promises);
    }

    /**
     * Convenience function to fetch the data.
     */
    async loadContent(): Promise<void> {
        let blocks: CoreCourseBlock[] = [];
        try {
            if (this.contextLevel() === ContextLevel.COURSE) {
                blocks = await CoreBlockHelper.getCourseBlocks(this.instanceId());
            } else {
                const allBlocks = await CoreCoursesDashboard.getDashboardBlocks(undefined, undefined, this.myDashboardPage());

                blocks = allBlocks.sideBlocks;
            }
        } catch (error) {
            CoreAlerts.showError(error);
            this.blocks.set([]);

            return;
        }

        blocks = blocks.filter(block =>
            block.name !== 'html' || (block.contents && !CoreDom.htmlIsBlank(block.contents.content)));

        this.blocks.set(blocks);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(this.invalidateBlocks());

        await this.loadContent().finally(async () => {
            await CorePromiseUtils.allPromisesIgnoringErrors(
                this.blocksComponents()?.map((blockComponent) =>
                    blockComponent.reload()),
            );

            refresher?.complete();
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Focus the initial block, if any.
     */
    private async focusInitialBlock(): Promise<void> {
        const initialBlockInstanceId = this.initialBlockInstanceId();
        if (!initialBlockInstanceId) {
            return;
        }

        const selector = `#block-${initialBlockInstanceId}`;

        await CoreWait.waitFor(() => !!this.element.querySelector(selector));
        await CoreWait.wait(200);

        CoreDom.scrollToElement(this.element, selector, { addYAxis: -10 });
    }

}
