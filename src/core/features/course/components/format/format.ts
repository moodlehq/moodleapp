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

import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy,
    SimpleChange,
    Output,
    EventEmitter,
    ViewChildren,
    QueryList,
    Type,
    ElementRef,
} from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import {
    CoreCourse,
    CoreCourseModuleCompletionStatus,
    CoreCourseProvider,
} from '@features/course/services/course';
import {
    CoreCourseModuleData,
    CoreCourseModuleCompletionData,
    CoreCourseSection,
    CoreCourseSectionWithStatus,
} from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { IonContent, IonRefresher } from '@ionic/angular';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourseCourseIndexComponent, CoreCourseIndexSectionWithModule } from '../course-index/course-index';
import { CoreBlockHelper } from '@features/block/services/block-helper';
import { CoreNavigator } from '@services/navigator';
import { database } from 'faker';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';

/**
 * Component to display course contents using a certain format. If the format isn't found, use default one.
 *
 * The inputs of this component will be shared with the course format components. Please use CoreCourseFormatDelegate
 * to register your handler for course formats.
 *
 * Example usage:
 *
 * <core-course-format [course]="course" [sections]="sections" (completionChanged)="onCompletionChange()"></core-course-format>
 */
@Component({
    selector: 'core-course-format',
    templateUrl: 'core-course-format.html',
    styleUrls: ['format.scss'],
})
export class CoreCourseFormatComponent implements OnInit, OnChanges, OnDestroy {

    static readonly LOAD_MORE_ACTIVITIES = 20; // How many activities should load each time showMoreActivities is called.

    @Input() course!: CoreCourseAnyCourseData; // The course to render.
    @Input() sections: CoreCourseSectionWithStatus[] = []; // List of course sections.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when any module completion changes.

    @ViewChildren(CoreDynamicComponent) dynamicComponents?: QueryList<CoreDynamicComponent>;

    // All the possible component classes.
    courseFormatComponent?: Type<unknown>;
    courseSummaryComponent?: Type<unknown>;
    singleSectionComponent?: Type<unknown>;
    allSectionsComponent?: Type<unknown>;

    canLoadMore = false;
    showSectionId = 0;
    data: Record<string, unknown> = {}; // Data to pass to the components.

    displayCourseIndex = false;
    displayBlocks = false;
    hasBlocks = false;
    selectedSection?: CoreCourseSection;
    previousSection?: CoreCourseSection;
    nextSection?: CoreCourseSection;
    allSectionsId: number = CoreCourseProvider.ALL_SECTIONS_ID;
    stealthModulesSectionId: number = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    loaded = false;
    progress?: number;

    protected selectTabObserver?: CoreEventObserver;
    protected completionObserver?: CoreEventObserver;
    protected lastCourseFormat?: string;

    constructor(
        protected content: IonContent,
        protected elementRef: ElementRef,
    ) {
        // Pass this instance to all components so they can use its methods and properties.
        this.data.coreCourseFormatComponent = this;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (this.course === undefined) {
            CoreDomUtils.showErrorModal('Course not set');

            CoreNavigator.back();

            return;
        }

        // Listen for select course tab events to select the right section if needed.
        this.selectTabObserver = CoreEvents.on(CoreEvents.SELECT_COURSE_TAB, (data) => {
            if (data.name) {
                return;
            }

            let section: CoreCourseSection | undefined;

            if (data.sectionId !== undefined && this.sections) {
                section = this.sections.find((section) => section.id == data.sectionId);
            } else if (data.sectionNumber !== undefined && this.sections) {
                section = this.sections.find((section) => section.section == data.sectionNumber);
            }

            if (section) {
                this.sectionChanged(section);
            }
        });

        // The completion of any of the modules have changed.
        this.completionObserver = CoreEvents.on(CoreEvents.COMPLETION_CHANGED, (data) => {
            if (data.completion.courseId != this.course.id) {
                return;
            }

            // Emit a new event for other components.
            this.completionChanged.emit(data.completion);

            if (data.completion.valueused !== false || !this.course || !('progress' in this.course) ||
                    typeof this.course.progress != 'number') {
                return;
            }

            // If the completion value is not used, the page won't be reloaded, so update the progress bar.
            const completionModules = (<CoreCourseModuleData[]> [])
                .concat(...this.sections.map((section) => section.modules))
                .map((module) => module.completion && module.completion > 0 ? 1 : module.completion)
                .reduce((accumulator, currentValue) => (accumulator || 0) + (currentValue || 0), 0);

            const moduleProgressPercent = 100 / (completionModules || 1);
            // Use min/max here to avoid floating point rounding errors over/under-flowing the progress bar.
            if (data.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE) {
                this.course.progress = Math.min(100, this.course.progress + moduleProgressPercent);
            } else {
                this.course.progress = Math.max(0, this.course.progress - moduleProgressPercent);
            }

            this.updateProgress();
        });
    }

    /**
     * Detect changes on input properties.
     */
    async ngOnChanges(changes: { [name: string]: SimpleChange }): Promise<void> {
        this.setInputData();

        if (changes.course && this.course) {
            // Course has changed, try to get the components.
            this.getComponents();

            this.displayCourseIndex = CoreCourseFormatDelegate.displayCourseIndex(this.course);
            this.displayBlocks = CoreCourseFormatDelegate.displayBlocks(this.course);

            this.hasBlocks = await CoreBlockHelper.hasCourseBlocks(this.course.id);

            this.updateProgress();
        }

        if (changes.sections && this.sections) {
            this.treatSections(this.sections);
        }
    }

    /**
     * Set the input data for components.
     */
    protected setInputData(): void {
        this.data.course = this.course;
        this.data.sections = this.sections;
        this.data.initialSectionId = this.initialSectionId;
        this.data.initialSectionNumber = this.initialSectionNumber;
        this.data.moduleId = this.moduleId;
        this.data.completionChanged = this.completionChanged;
    }

    /**
     * Get the components classes.
     */
    protected async getComponents(): Promise<void> {
        if (!this.course || this.course.format == this.lastCourseFormat) {
            return;
        }

        // Format has changed or it's the first time, load all the components.
        this.lastCourseFormat = this.course.format;

        await Promise.all([
            this.loadCourseFormatComponent(),
            this.loadCourseSummaryComponent(),
            this.loadSingleSectionComponent(),
            this.loadAllSectionsComponent(),
        ]);
    }

    /**
     * Load course format component.
     *
     * @return Promise resolved when done.
     */
    protected async loadCourseFormatComponent(): Promise<void> {
        this.courseFormatComponent = await CoreCourseFormatDelegate.getCourseFormatComponent(this.course);
    }

    /**
     * Load course summary component.
     *
     * @return Promise resolved when done.
     */
    protected async loadCourseSummaryComponent(): Promise<void> {
        this.courseSummaryComponent = await CoreCourseFormatDelegate.getCourseSummaryComponent(this.course);
    }

    /**
     * Load single section component.
     *
     * @return Promise resolved when done.
     */
    protected async loadSingleSectionComponent(): Promise<void> {
        this.singleSectionComponent = await CoreCourseFormatDelegate.getSingleSectionComponent(this.course);
    }

    /**
     * Load all sections component.
     *
     * @return Promise resolved when done.
     */
    protected async loadAllSectionsComponent(): Promise<void> {
        this.allSectionsComponent = await CoreCourseFormatDelegate.getAllSectionsComponent(this.course);
    }

    /**
     * Treat received sections.
     *
     * @param sections Sections to treat.
     * @return Promise resolved when done.
     */
    protected async treatSections(sections: CoreCourseSection[]): Promise<void> {
        const hasAllSections = sections[0].id == CoreCourseProvider.ALL_SECTIONS_ID;
        const hasSeveralSections = sections.length > 2 || (sections.length == 2 && !hasAllSections);

        if (this.selectedSection) {
            const selectedSection = this.selectedSection;
            // We have a selected section, but the list has changed. Search the section in the list.
            let newSection = sections.find(section => this.compareSections(section, selectedSection));

            if (!newSection) {
                // Section not found, calculate which one to use.
                newSection = await CoreCourseFormatDelegate.getCurrentSection(this.course, sections);
            }

            this.sectionChanged(newSection);

            return;
        }

        // There is no selected section yet, calculate which one to load.
        if (!hasSeveralSections) {
            // Always load "All sections" to display the section title. If it isn't there just load the section.
            this.loaded = true;
            this.sectionChanged(sections[0]);
        } else if (this.initialSectionId || this.initialSectionNumber) {
            // We have an input indicating the section ID to load. Search the section.
            const section = sections.find((section) =>
                section.id == this.initialSectionId || (section.section && section.section == this.initialSectionNumber));

            // Don't load the section if it cannot be viewed by the user.
            if (section && this.canViewSection(section)) {
                this.loaded = true;
                this.sectionChanged(section);
            }
        }

        if (!this.loaded) {
            // No section specified, not found or not visible, get current section.
            const section = await CoreCourseFormatDelegate.getCurrentSection(this.course, sections);

            this.loaded = true;
            this.sectionChanged(section);
        }

        return;
    }

    /**
     * Display the course index modal.
     */
    async openCourseIndex(): Promise<void> {
        const data = await CoreDomUtils.openModal<CoreCourseIndexSectionWithModule>({
            component: CoreCourseCourseIndexComponent,
            componentProps: {
                course: this.course,
                sections: this.sections,
                selectedId: this.selectedSection?.id,
            },
        });

        if (data) {
            this.sectionChanged(data.section);
            if (data.module) {
                if (!data.module.handlerData) {
                    data.module.handlerData =
                        await CoreCourseModuleDelegate.getModuleDataFor(data.module.modname, data.module, this.course.id);
                }

                if (data.module.uservisible !== false && data.module.handlerData?.action) {
                    data.module.handlerData.action(data.event, data.module, data.module.course);
                }
                this.moduleId = data.module.id;
            }
        }
    }

    /**
     * Function called when selected section changes.
     *
     * @param newSection The new selected section.
     */
    sectionChanged(newSection: CoreCourseSection): void {
        const previousValue = this.selectedSection;
        this.selectedSection = newSection;
        this.data.section = this.selectedSection;

        if (newSection.id != this.allSectionsId) {
            // Select next and previous sections to show the arrows.
            const i = this.sections.findIndex((value) => this.compareSections(value, newSection));

            let j: number;
            for (j = i - 1; j >= 1; j--) {
                if (this.canViewSection(this.sections[j])) {
                    break;
                }
            }
            this.previousSection = j >= 1 ? this.sections[j] : undefined;

            for (j = i + 1; j < this.sections.length; j++) {
                if (this.canViewSection(this.sections[j])) {
                    break;
                }
            }
            this.nextSection = j < this.sections.length ? this.sections[j] : undefined;
        } else {
            this.previousSection = undefined;
            this.nextSection = undefined;
            this.canLoadMore = false;
            this.showSectionId = 0;
            this.showMoreActivities();
        }

        if (this.moduleId && previousValue === undefined) {
            setTimeout(() => {
                CoreDomUtils.scrollToElementBySelector(
                    this.elementRef.nativeElement,
                    this.content,
                    '#core-course-module-' + this.moduleId,
                );
            }, 200);
        } else {
            this.content.scrollToTop(0);
        }

        if (!previousValue || previousValue.id != newSection.id) {
            // First load or section changed, add log in Moodle.
            CoreUtils.ignoreErrors(
                CoreCourse.logView(this.course.id, newSection.section, undefined, this.course.fullname),
            );
        }

        this.invalidateSectionButtons();
    }

    /**
     * Compare if two sections are equal.
     *
     * @param section1 First section.
     * @param section2 Second section.
     * @return Whether they're equal.
     */
    compareSections(section1: CoreCourseSection, section2: CoreCourseSection): boolean {
        return section1 && section2 ? section1.id === section2.id : section1 === section2;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param afterCompletionChange Whether the refresh is due to a completion change.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher, done?: () => void, afterCompletionChange?: boolean): Promise<void> {
        const promises = this.dynamicComponents?.map(async (component) => {
            await component.callComponentFunction('doRefresh', [refresher, done, afterCompletionChange]);
        }) || [];

        if (this.course) {
            const courseId = this.course.id;
            promises.push(CoreCourse.invalidateCourseBlocks(courseId).then(async () => {
                this.hasBlocks = await CoreBlockHelper.hasCourseBlocks(courseId);

                return;
            }));
        }

        await Promise.all(promises);

        refresher?.complete();
        done?.();
    }

    /**
     * Invalidate section buttons so that they are rendered again. This is necessary in order to update
     * some attributes that are not reactive, for example aria-label.
     *
     * @see https://github.com/ionic-team/ionic-framework/issues/21534
     */
    protected async invalidateSectionButtons(): Promise<void> {
        const previousSection = this.previousSection;
        const nextSection = this.nextSection;

        this.previousSection = undefined;
        this.nextSection = undefined;

        await CoreUtils.nextTick();

        this.previousSection = previousSection;
        this.nextSection = nextSection;
    }

    /**
     * Show more activities (only used when showing all the sections at the same time).
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    showMoreActivities(infiniteComplete?: () => void): void {
        this.canLoadMore = false;

        const sections = this.sections || [];
        let modulesLoaded = 0;
        let i: number;
        for (i = this.showSectionId + 1; i < sections.length; i++) {
            if (!sections[i].hasContent || !sections[i].modules) {
                continue;
            }

            modulesLoaded += sections[i].modules.reduce((total, module) => module.visibleoncoursepage !== 0 ? total + 1 : total, 0);

            if (modulesLoaded >= CoreCourseFormatComponent.LOAD_MORE_ACTIVITIES) {
                break;
            }
        }

        this.showSectionId = i;
        this.canLoadMore = i < sections.length;

        if (this.canLoadMore) {
            // Check if any of the following sections have any content.
            let thereAreMore = false;
            for (i++; i < sections.length; i++) {
                if (sections[i].hasContent && sections[i].modules && sections[i].modules?.length > 0) {
                    thereAreMore = true;
                    break;
                }
            }
            this.canLoadMore = thereAreMore;
        }

        infiniteComplete && infiniteComplete();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.selectTabObserver && this.selectTabObserver.off();
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.dynamicComponents?.forEach((component) => {
            component.callComponentFunction('ionViewDidEnter');
        });
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.dynamicComponents?.forEach((component) => {
            component.callComponentFunction('ionViewDidLeave');
        });
    }

    /**
     * Check whether a section can be viewed.
     *
     * @param section The section to check.
     * @return Whether the section can be viewed.
     */
    canViewSection(section: CoreCourseSection): boolean {
        return section.uservisible !== false && !section.hiddenbynumsections &&
                section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    }

    /**
     * Update course progress.
     */
    protected updateProgress(): void {
        if (
            !this.course ||
            !('progress' in this.course) ||
            typeof this.course.progress !== 'number' ||
            this.course.progress < 0 ||
            this.course.completionusertracked === false
        ) {
            this.progress = undefined;

            return;
        }

        this.progress = this.course.progress;
    }

}
