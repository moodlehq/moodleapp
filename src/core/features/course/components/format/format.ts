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
    ViewChild,
} from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import {
    CoreCourse,
    CoreCourseModuleCompletionData,
    CoreCourseModuleData,
    CoreCourseProvider,
} from '@features/course/services/course';
// import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreEventObserver, CoreEvents, CoreEventSectionStatusChangedData, CoreEventSelectCourseTabData } from '@singletons/events';
import { IonContent, IonRefresher } from '@ionic/angular';
import { CoreUtils } from '@services/utils/utils';
// import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreBlockCourseBlocksComponent } from '@features/block/components/course-blocks/course-blocks';
import { CoreCourseSectionFormatted } from '@features/course/services/course-helper';
import { CoreCourseModuleStatusChangedData } from '../module/module';

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
})
export class CoreCourseFormatComponent implements OnInit, OnChanges, OnDestroy {

    static readonly LOAD_MORE_ACTIVITIES = 20; // How many activities should load each time showMoreActivities is called.

    @Input() course?: CoreCourseAnyCourseData; // The course to render.
    @Input() sections?: CoreCourseSectionFormatted[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when any module completion changes.

    @ViewChildren(CoreDynamicComponent) dynamicComponents?: QueryList<CoreDynamicComponent>;
    @ViewChild(CoreBlockCourseBlocksComponent) courseBlocksComponent?: CoreBlockCourseBlocksComponent;

    // All the possible component classes.
    courseFormatComponent?: Type<unknown>;
    courseSummaryComponent?: Type<unknown>;
    sectionSelectorComponent?: Type<unknown>;
    singleSectionComponent?: Type<unknown>;
    allSectionsComponent?: Type<unknown>;

    canLoadMore = false;
    showSectionId = 0;
    sectionSelectorExpanded = false;
    data: Record<string, unknown> = {}; // Data to pass to the components.

    displaySectionSelector?: boolean;
    displayBlocks?: boolean;
    selectedSection?: CoreCourseSectionFormatted;
    previousSection?: CoreCourseSectionFormatted;
    nextSection?: CoreCourseSectionFormatted;
    allSectionsId: number = CoreCourseProvider.ALL_SECTIONS_ID;
    stealthModulesSectionId: number = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    loaded = false;
    hasSeveralSections?: boolean;
    imageThumb?: string;
    progress?: number;

    protected sectionStatusObserver?: CoreEventObserver;
    protected selectTabObserver?: CoreEventObserver;
    protected lastCourseFormat?: string;

    constructor(
        protected content: IonContent,
    ) {
        // Pass this instance to all components so they can use its methods and properties.
        this.data.coreCourseFormatComponent = this;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Listen for section status changes.
        this.sectionStatusObserver = CoreEvents.on<CoreEventSectionStatusChangedData>(
            CoreEvents.SECTION_STATUS_CHANGED,
            async (data) => {
                if (!this.downloadEnabled || !this.sections?.length || !data.sectionId || data.courseId != this.course?.id) {
                    return;
                }

                // @todo Check if the affected section is being downloaded.
                // If so, we don't update section status because it'll already be updated when the download finishes.
                // const downloadId = CoreCourseHelper.instance.getSectionDownloadId({ id: data.sectionId });
                // if (prefetchDelegate.isBeingDownloaded(downloadId)) {
                //     return;
                // }

                // Get the affected section.
                // const section = this.sections.find(section => section.id == data.sectionId);
                // if (!section) {
                //     return;
                // }

                // Recalculate the status.
                // await CoreCourseHelper.instance.calculateSectionStatus(section, this.course.id, false);

                // if (section.isDownloading && !prefetchDelegate.isBeingDownloaded(downloadId)) {
                //     // All the modules are now downloading, set a download all promise.
                //     this.prefetch(section);
                // }
            },
            CoreSites.instance.getCurrentSiteId(),
        );

        // Listen for select course tab events to select the right section if needed.
        this.selectTabObserver = CoreEvents.on<CoreEventSelectCourseTabData>(CoreEvents.SELECT_COURSE_TAB, (data) => {
            if (data.name) {
                return;
            }

            let section: CoreCourseSectionFormatted | undefined;

            if (typeof data.sectionId != 'undefined' && data.sectionId != null && this.sections) {
                section = this.sections.find((section) => section.id == data.sectionId);
            } else if (typeof data.sectionNumber != 'undefined' && data.sectionNumber != null && this.sections) {
                section = this.sections.find((section) => section.section == data.sectionNumber);
            }

            if (section) {
                this.sectionChanged(section);
            }
        });
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        this.setInputData();

        if (changes.course && this.course) {
            // Course has changed, try to get the components.
            this.getComponents();

            this.displaySectionSelector = CoreCourseFormatDelegate.instance.displaySectionSelector(this.course);
            this.displayBlocks = CoreCourseFormatDelegate.instance.displayBlocks(this.course);
            this.progress = 'progress' in this.course && this.course.progress !== undefined && this.course.progress >= 0 &&
                this.course.completionusertracked !== false ? this.course.progress : undefined;
            if ('overviewfiles' in this.course) {
                this.imageThumb = this.course.overviewfiles?.[0]?.fileurl;
            }
        }

        if (changes.sections && this.sections) {
            this.treatSections(this.sections);
        }

        if (this.downloadEnabled && (changes.downloadEnabled || changes.sections)) {
            this.calculateSectionsStatus(false);
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
        this.data.downloadEnabled = this.downloadEnabled;
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
            this.loadSectionSelectorComponent(),
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
        this.courseFormatComponent = await CoreCourseFormatDelegate.instance.getCourseFormatComponent(this.course!);
    }

    /**
     * Load course summary component.
     *
     * @return Promise resolved when done.
     */
    protected async loadCourseSummaryComponent(): Promise<void> {
        this.courseSummaryComponent = await CoreCourseFormatDelegate.instance.getCourseSummaryComponent(this.course!);
    }

    /**
     * Load section selector component.
     *
     * @return Promise resolved when done.
     */
    protected async loadSectionSelectorComponent(): Promise<void> {
        this.sectionSelectorComponent = await CoreCourseFormatDelegate.instance.getSectionSelectorComponent(this.course!);
    }

    /**
     * Load single section component.
     *
     * @return Promise resolved when done.
     */
    protected async loadSingleSectionComponent(): Promise<void> {
        this.singleSectionComponent = await CoreCourseFormatDelegate.instance.getSingleSectionComponent(this.course!);
    }

    /**
     * Load all sections component.
     *
     * @return Promise resolved when done.
     */
    protected async loadAllSectionsComponent(): Promise<void> {
        this.allSectionsComponent = await CoreCourseFormatDelegate.instance.getAllSectionsComponent(this.course!);
    }

    /**
     * Treat received sections.
     *
     * @param sections Sections to treat.
     * @return Promise resolved when done.
     */
    protected async treatSections(sections: CoreCourseSectionFormatted[]): Promise<void> {
        const hasAllSections = sections[0].id == CoreCourseProvider.ALL_SECTIONS_ID;
        this.hasSeveralSections = sections.length > 2 || (sections.length == 2 && !hasAllSections);

        if (this.selectedSection) {
            // We have a selected section, but the list has changed. Search the section in the list.
            let newSection = sections.find(section => this.compareSections(section, this.selectedSection!));

            if (!newSection) {
                // Section not found, calculate which one to use.
                newSection = await CoreCourseFormatDelegate.instance.getCurrentSection(this.course!, sections);
            }

            this.sectionChanged(newSection);

            return;
        }

        // There is no selected section yet, calculate which one to load.
        if (!this.hasSeveralSections) {
            // Always load "All sections" to display the section title. If it isn't there just load the section.
            this.loaded = true;
            this.sectionChanged(sections[0]);
        } else if (this.initialSectionId || this.initialSectionNumber) {
            // We have an input indicating the section ID to load. Search the section.
            const section = sections.find((section) => {
                if (section.id != this.initialSectionId && (!section.section || section.section != this.initialSectionNumber)) {
                    return false;
                }
            });

            // Don't load the section if it cannot be viewed by the user.
            if (section && this.canViewSection(section)) {
                this.loaded = true;
                this.sectionChanged(section);
            }
        }

        if (!this.loaded) {
            // No section specified, not found or not visible, get current section.
            const section = await CoreCourseFormatDelegate.instance.getCurrentSection(this.course!, sections);

            this.loaded = true;
            this.sectionChanged(section);
        }

        return;
    }

    /**
     * Display the section selector modal.
     *
     * @param event Event.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showSectionSelector(event?: MouseEvent): void {
        if (this.sectionSelectorExpanded) {
            return;
        }

        // @todo this.sectionSelectorExpanded = true;
        // const modal = this.modalCtrl.create('CoreCourseSectionSelectorPage',
        //     {course: this.course, sections: this.sections, selected: this.selectedSection});
        // modal.onDidDismiss((newSection) => {
        //     if (newSection) {
        //         this.sectionChanged(newSection);
        //     }

        //     this.sectionSelectorExpanded = false;
        // });

        // modal.present({
        //     ev: event
        // });
    }

    /**
     * Function called when selected section changes.
     *
     * @param newSection The new selected section.
     */
    sectionChanged(newSection: CoreCourseSectionFormatted): void {
        const previousValue = this.selectedSection;
        this.selectedSection = newSection;
        this.data.section = this.selectedSection;

        if (newSection.id != this.allSectionsId) {
            // Select next and previous sections to show the arrows.
            const i = this.sections!.findIndex((value) => this.compareSections(value, this.selectedSection!));

            let j: number;
            for (j = i - 1; j >= 1; j--) {
                if (this.canViewSection(this.sections![j])) {
                    break;
                }
            }
            this.previousSection = j >= 1 ? this.sections![j] : undefined;

            for (j = i + 1; j < this.sections!.length; j++) {
                if (this.canViewSection(this.sections![j])) {
                    break;
                }
            }
            this.nextSection = j < this.sections!.length ? this.sections![j] : undefined;
        } else {
            this.previousSection = undefined;
            this.nextSection = undefined;
            this.canLoadMore = false;
            this.showSectionId = 0;
            this.showMoreActivities();
            // @todo CoreCourseHelper.instance.calculateSectionsStatus(this.sections, this.course.id, false, false);
        }

        if (this.moduleId && typeof previousValue == 'undefined') {
            setTimeout(() => {
                CoreDomUtils.instance.scrollToElementBySelector(this.content, '#core-course-module-' + this.moduleId);
            }, 200);
        } else {
            this.content.scrollToTop(0);
        }

        if (!previousValue || previousValue.id != newSection.id) {
            // First load or section changed, add log in Moodle.
            CoreUtils.instance.ignoreErrors(
                CoreCourse.instance.logView(this.course!.id, newSection.section, undefined, this.course!.fullname),
            );
        }
    }

    /**
     * Compare if two sections are equal.
     *
     * @param section1 First section.
     * @param section2 Second section.
     * @return Whether they're equal.
     */
    compareSections(section1: CoreCourseSectionFormatted, section2: CoreCourseSectionFormatted): boolean {
        return section1 && section2 ? section1.id === section2.id : section1 === section2;
    }

    /**
     * Calculate the status of sections.
     *
     * @param refresh If refresh or not.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected calculateSectionsStatus(refresh?: boolean): void {
        // @todo CoreCourseHelper.instance.calculateSectionsStatus(this.sections, this.course.id, refresh).catch(() => {
        //     // Ignore errors (shouldn't happen).
        // });
    }

    /**
     * Confirm and prefetch a section. If the section is "all sections", prefetch all the sections.
     *
     * @param section Section to download.
     * @param refresh Refresh clicked (not used).
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prefetch(section: CoreCourseSectionFormatted): void {
        // section.isCalculating = true;
        // @todo CoreCourseHelper.instance.confirmDownloadSizeSection(this.course.id, section, this.sections).then(() => {
        //     this.prefetchSection(section, true);
        // }, (error) => {
        //     // User cancelled or there was an error calculating the size.
        //     if (error) {
        //         CoreDomUtils.instance.showErrorModal(error);
        //     }
        // }).finally(() => {
        //     section.isCalculating = false;
        // });
    }

    /**
     * Prefetch a section. @todo
     *
     * @param section The section to download.
     * @param manual Whether the prefetch was started manually or it was automatically started because all modules
     *               are being downloaded.
     */
    // protected prefetchSection(section: Section, manual?: boolean): void {
    //     CoreCourseHelper.instance.prefetchSection(section, this.course.id, this.sections).catch((error) => {
    //         // Don't show error message if it's an automatic download.
    //         if (!manual) {
    //             return;
    //         }

    //         CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.errordownloadingsection', true);
    //     });
    // }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param afterCompletionChange Whether the refresh is due to a completion change.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: CustomEvent<IonRefresher>, done?: () => void, afterCompletionChange?: boolean): Promise<void> {
        const promises = this.dynamicComponents?.map(async (component) => {
            await component.callComponentFunction('doRefresh', [refresher, done, afterCompletionChange]);
        }) || [];

        if (this.courseBlocksComponent) {
            promises.push(this.courseBlocksComponent.doRefresh());
        }

        await Promise.all(promises);
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
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.sectionStatusObserver && this.sectionStatusObserver.off();
        this.selectTabObserver && this.selectTabObserver.off();
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.dynamicComponents?.forEach((component) => {
            component.callComponentFunction('ionViewDidEnter');
        });

        // @todo if (this.downloadEnabled) {
        //     // The download status of a section might have been changed from within a module page.
        //     if (this.selectedSection && this.selectedSection.id !== CoreCourseProvider.ALL_SECTIONS_ID) {
        //         CoreCourseHelper.instance.calculateSectionStatus(this.selectedSection, this.course.id, false, false);
        //     } else {
        //         CoreCourseHelper.instance.calculateSectionsStatus(this.sections, this.course.id, false, false);
        //     }
        // }
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
    canViewSection(section: CoreCourseSectionFormatted): boolean {
        return section.uservisible !== false && !section.hiddenbynumsections &&
                section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    }

    /**
     * The completion of any of the modules have changed.
     */
    onCompletionChange(completionData: CoreCourseModuleCompletionData): void {
        // Emit a new event for other components.
        this.completionChanged.emit(completionData);

        if (completionData.valueused !== false || !this.course || !('progress' in this.course) ||
            typeof this.course.progress == 'undefined') {
            return;
        }

        // If the completion value is not used, the page won't be reloaded, so update the progress bar.
        const completionModules = (<CoreCourseModuleData[]> [])
            .concat(...this.sections!.map((section) => section.modules))
            .map((module) => module.completion && module.completion > 0 ? 1 : module.completion)
            .reduce((accumulator, currentValue) => (accumulator || 0) + (currentValue || 0));

        const moduleProgressPercent = 100 / (completionModules || 1);
        // Use min/max here to avoid floating point rounding errors over/under-flowing the progress bar.
        if (completionData.state === CoreCourseProvider.COMPLETION_COMPLETE) {
            this.course.progress = Math.min(100, this.course.progress + moduleProgressPercent);
        } else {
            this.course.progress = Math.max(0, this.course.progress - moduleProgressPercent);
        }
    }

    /**
     * Recalculate the download status of each section, in response to a module being downloaded.
     *
     * @param eventData
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onModuleStatusChange(eventData: CoreCourseModuleStatusChangedData): void {
        // @todo CoreCourseHelper.instance.calculateSectionsStatus(this.sections, this.course.id, false, false);
    }

}
