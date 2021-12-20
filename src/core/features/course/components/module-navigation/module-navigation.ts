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

import { Component, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { CoreCourse, CoreCourseProvider, CoreCourseWSSection } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { IonContent } from '@ionic/angular';
import { ScrollDetail } from '@ionic/core';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreMath } from '@singletons/math';

/**
 * Component to show a button to go to the next resource/activity.
 *
 * Example usage:
 * <core-course-module-navigation [courseId]="courseId" [currentModuleId]="module.id"></core-course-module-navigation>
 */
@Component({
    selector: 'core-course-module-navigation',
    templateUrl: 'core-course-module-navigation.html',
    styleUrls: ['module-navigation.scss'],
})
export class CoreCourseModuleNavigationComponent implements OnInit, OnDestroy {

    @Input() courseId!: number; // Course ID.
    @Input() currentModuleId!: number; // Current module ID.

    nextModule?: CoreCourseModuleData;
    previousModule?: CoreCourseModuleData;
    nextModuleSection?: CoreCourseWSSection;
    previousModuleSection?: CoreCourseWSSection;
    loaded = false;

    protected element: HTMLElement;
    protected initialHeight = 0;
    protected initialPaddingBottom = 0;
    protected previousTop = 0;
    protected previousHeight = 0;
    protected stickTimeout?: number;
    protected content?: HTMLIonContentElement | null;
    protected completionObserver: CoreEventObserver;

    constructor(el: ElementRef, protected ionContent: IonContent) {
        const siteId = CoreSites.getCurrentSiteId();

        this.element = el.nativeElement;
        this.element.setAttribute('slot', 'fixed');

        this.completionObserver = CoreEvents.on(CoreEvents.COMPLETION_MODULE_VIEWED, async (data) => {
            if (data && data.courseId == this.courseId) {
                // Check if now there's a next module.
                await this.setNextAndPreviousModules(
                    CoreSitesReadingStrategy.PREFER_NETWORK,
                    !this.nextModule,
                    !this.previousModule,
                );
            }
        }, siteId);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.setNextAndPreviousModules(CoreSitesReadingStrategy.PREFER_CACHE);
        } finally {
            this.loaded = true;

            await CoreUtils.nextTicks(50);
            this.listenScrollEvents();
        }
    }

    /**
     * Setup scroll event listener.
     *
     * @param retries Number of retries left.
     */
    protected async listenScrollEvents(retries = 3): Promise<void> {
        this.initialHeight = this.element.getBoundingClientRect().height;

        if (this.initialHeight == 0 && retries > 0) {
            await CoreUtils.nextTicks(50);

            this.listenScrollEvents(retries - 1);

            return;
        }
        // Set a minimum height value.
        this.initialHeight = this.initialHeight || 56;
        this.previousHeight = this.initialHeight;

        this.content = this.element.closest('ion-content');

        if (!this.content) {
            return;
        }

        // Special case where there's no navigation.
        const courseFormat = this.element.closest('core-course-format.core-course-format-singleactivity');
        if (courseFormat) {
            this.element.remove();
            this.ngOnDestroy();

            return;
        }

        this.content.classList.add('has-core-course-module-navigation');

        // Move element to the nearest ion-content if it's not the parent.
        if (this.element.parentElement?.nodeName != 'ION-CONTENT') {
            this.content.appendChild(this.element);
        }

        // Set a padding to not overlap elements.
        this.initialPaddingBottom = parseFloat(this.content.style.getPropertyValue('--padding-bottom') || '0');
        this.content.style.setProperty('--padding-bottom', this.initialPaddingBottom + this.initialHeight + 'px');
        const scroll = await this.content.getScrollElement();
        this.content.scrollEvents = true;

        this.setBarHeight(this.initialHeight);
        this.content.addEventListener('ionScroll', (e: CustomEvent<ScrollDetail>): void => {
            if (!this.content) {
                return;
            }

            this.onScroll(e.detail, scroll);
        });

    }

    /**
     * @inheritdoc
     */
    async ngOnDestroy(): Promise<void> {
        this.completionObserver.off();
        this.content?.style.setProperty('--padding-bottom', this.initialPaddingBottom + 'px');
    }

    /**
     * Set previous and next modules.
     *
     * @param readingStrategy Reading strategy.
     * @param checkNext Check next module.
     * @param checkPrevious Check previous module.
     * @return Promise resolved when done.
     */
    protected async setNextAndPreviousModules(
        readingStrategy: CoreSitesReadingStrategy,
        checkNext = true,
        checkPrevious = true,
    ): Promise<void> {
        if (!checkNext && !checkPrevious) {
            return;
        }

        const preSets = CoreSites.getReadingStrategyPreSets(readingStrategy);

        const sections = await CoreCourse.getSections(this.courseId, false, true, preSets);

        // Search the next module.
        let currentModuleIndex = -1;

        const currentSectionIndex = sections.findIndex((section) => {
            if (!this.isSectionAvailable(section)) {
                // User cannot view the section, skip it.
                return false;
            }

            currentModuleIndex = section.modules.findIndex((module: CoreCourseModuleData) => module.id == this.currentModuleId);

            return currentModuleIndex >= 0;
        });

        if (currentSectionIndex < 0) {
            // Nothing found. Return.

            return;
        }

        if (checkNext) {
            // Find next Module.
            this.nextModule = undefined;
            for (let i = currentSectionIndex; i < sections.length && this.nextModule == undefined; i++) {
                const section = sections[i];

                if (!this.isSectionAvailable(section)) {
                    // User cannot view the section, skip it.
                    continue;
                }

                const startModule = i == currentSectionIndex ? currentModuleIndex + 1 : 0;
                for (let j = startModule; j < section.modules.length && this.nextModule == undefined; j++) {
                    const module = section.modules[j];

                    const found = await this.isModuleAvailable(module);
                    if (found) {
                        this.nextModule = module;
                        this.nextModuleSection = section;
                    }
                }
            }
        }

        if (checkPrevious) {
            // Find previous Module.
            this.previousModule = undefined;
            for (let i = currentSectionIndex; i >= 0 && this.previousModule == undefined; i--) {
                const section = sections[i];

                if (!this.isSectionAvailable(section)) {
                    // User cannot view the section, skip it.
                    continue;
                }

                const startModule = i == currentSectionIndex ? currentModuleIndex - 1 : section.modules.length - 1;
                for (let j = startModule; j >= 0 && this.previousModule == undefined; j--) {
                    const module = section.modules[j];

                    const found = await this.isModuleAvailable(module);
                    if (found) {
                        this.previousModule = module;
                        this.previousModuleSection = section;
                    }
                }
            }
        }
    }

    /**
     * Module is visible by the user and it has a specific view (e.g. not a label).
     *
     * @param module Module to check.
     * @return Wether the module is available to the user or not.
     */
    protected async isModuleAvailable(module: CoreCourseModuleData): Promise<boolean> {
        return CoreCourse.instance.moduleHasView(module);
    }

    /**
     * Section is visible by the user and its not stealth
     *
     * @param section Section to check.
     * @return Wether the module is available to the user or not.
     */
    protected isSectionAvailable(section: CoreCourseWSSection): boolean {
        return section.uservisible !== false && section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    }

    /**
     * Go to next/previous module.
     *
     * @return Promise resolved when done.
     */
    async goToActivity(next = true): Promise<void> {
        if (!this.loaded) {
            return;
        }

        const modal = await CoreDomUtils.showModalLoading();

        // Re-calculate module in case a new module was made visible.
        await CoreUtils.ignoreErrors(this.setNextAndPreviousModules(CoreSitesReadingStrategy.PREFER_NETWORK, next, !next));

        modal.dismiss();

        const module = next ? this.nextModule : this.previousModule;
        if (!module) {
            // It seems the module was hidden. Show a message.
            CoreDomUtils.instance.showErrorModal(
                next ? 'core.course.gotonextactivitynotfound' : 'core.course.gotopreviousactivitynotfound',
                true,
            );

            return;
        }

        if (module.uservisible === false) {
            const section = next ? this.nextModuleSection : this.previousModuleSection;
            const options: CoreNavigationOptions = {
                replace: true,
                params: {
                    module,
                    section,
                },
            };
            CoreNavigator.navigateToSitePath('course/' + this.courseId + '/' + module.id +'/module-preview', options);
        } else {
            CoreCourseModuleDelegate.openActivityPage(module.modname, module, this.courseId, { replace: true });
        }
    }

    /**
     * On scroll function.
     *
     * @param scrollDetail Scroll detail object.
     * @param scrollElement Scroll element to calculate maxScroll.
     */
    protected onScroll(scrollDetail: ScrollDetail, scrollElement: HTMLElement): void {
        const maxScroll = scrollElement.scrollHeight - scrollElement.offsetHeight;
        if (scrollDetail.scrollTop <= 0 || scrollDetail.scrollTop >= maxScroll) {
            // Reset.
            this.setBarHeight(this.initialHeight);
        } else {
            let newHeight = this.previousHeight - (scrollDetail.scrollTop - this.previousTop);
            newHeight = CoreMath.clamp(newHeight, 0, this.initialHeight);

            this.setBarHeight(newHeight);
        }
        this.previousTop = scrollDetail.scrollTop;
    }

    /**
     * Sets the bar height.
     *
     * @param height The new bar height.
     */
    protected setBarHeight(height: number): void {
        if (this.stickTimeout) {
            clearTimeout(this.stickTimeout);
        }

        this.element.style.opacity = height <= 0 ? '0' : '1';
        this.content?.style.setProperty('--core-course-module-navigation-height', height + 'px');
        this.previousHeight = height;

        if (height > 0 && height < this.initialHeight) {
            // Finish opening or closing the bar.
            const newHeight = height < this.initialHeight / 2 ? 0 : this.initialHeight;

            this.stickTimeout = window.setTimeout(() => this.setBarHeight(newHeight), 500);
        }
    }

}
