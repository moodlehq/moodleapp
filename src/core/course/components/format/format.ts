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

import {
    Component, Input, OnInit, OnChanges, OnDestroy, SimpleChange, Output, EventEmitter, ViewChildren, QueryList, Injector, ViewChild
} from '@angular/core';
import { Content, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseFormatDelegate } from '@core/course/providers/format-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreBlockCourseBlocksComponent } from '@core/block/components/course-blocks/course-blocks';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';

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
    templateUrl: 'core-course-format.html'
})
export class CoreCourseFormatComponent implements OnInit, OnChanges, OnDestroy {
    static LOAD_MORE_ACTIVITIES = 20; // How many activities should load each time showMoreActivities is called.

    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Output() completionChanged?: EventEmitter<any>; // Will emit an event when any module completion changes.

    @ViewChildren(CoreDynamicComponent) dynamicComponents: QueryList<CoreDynamicComponent>;
    @ViewChild(CoreBlockCourseBlocksComponent) courseBlocksComponent: CoreBlockCourseBlocksComponent;

    // All the possible component classes.
    courseFormatComponent: any;
    courseSummaryComponent: any;
    sectionSelectorComponent: any;
    singleSectionComponent: any;
    allSectionsComponent: any;
    canLoadMore = false;
    showSectionId = 0;
    sectionSelectorExpanded = false;

    // Data to pass to the components.
    data: any = {};

    displaySectionSelector: boolean;
    selectedSection: any;
    previousSection: any;
    nextSection: any;
    allSectionsId: number = CoreCourseProvider.ALL_SECTIONS_ID;
    stealthModulesSectionId: number = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    selectOptions: any = {};
    loaded: boolean;

    protected sectionStatusObserver;
    protected selectTabObserver;
    protected lastCourseFormat: string;

    constructor(private cfDelegate: CoreCourseFormatDelegate, translate: TranslateService, private injector: Injector,
            private courseHelper: CoreCourseHelperProvider, private domUtils: CoreDomUtilsProvider,
            eventsProvider: CoreEventsProvider, private sitesProvider: CoreSitesProvider, private content: Content,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, private modalCtrl: ModalController,
            private courseProvider: CoreCourseProvider) {

        this.selectOptions.title = translate.instant('core.course.sections');
        this.completionChanged = new EventEmitter();

        // Pass this instance to all components so they can use its methods and properties.
        this.data.coreCourseFormatComponent = this;

        // Listen for section status changes.
        this.sectionStatusObserver = eventsProvider.on(CoreEventsProvider.SECTION_STATUS_CHANGED, (data) => {
            if (this.downloadEnabled && this.sections && this.sections.length && this.course && data.sectionId &&
                    data.courseId == this.course.id) {
                // Check if the affected section is being downloaded.
                // If so, we don't update section status because it'll already be updated when the download finishes.
                const downloadId = this.courseHelper.getSectionDownloadId({ id: data.sectionId });
                if (prefetchDelegate.isBeingDownloaded(downloadId)) {
                    return;
                }

                // Get the affected section.
                let section;
                for (let i = 0; i < this.sections.length; i++) {
                    const s = this.sections[i];
                    if (s.id === data.sectionId) {
                        section = s;
                        break;
                    }
                }

                if (!section) {
                    // Section not found, stop.
                    return;
                }

                // Recalculate the status.
                this.courseHelper.calculateSectionStatus(section, this.course.id, false).then(() => {
                    if (section.isDownloading && !prefetchDelegate.isBeingDownloaded(downloadId)) {
                        // All the modules are now downloading, set a download all promise.
                        this.prefetch(section);
                    }
                });
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Listen for select course tab events to select the right section if needed.
        this.selectTabObserver = eventsProvider.on(CoreEventsProvider.SELECT_COURSE_TAB, (data) => {

            if (!data.name) {
                let section;

                if (typeof data.sectionId != 'undefined' && data.sectionId != null && this.sections) {
                    section = this.sections.find((section) => {
                        return section.id == data.sectionId;
                    });
                } else if (typeof data.sectionNumber != 'undefined' && data.sectionNumber != null && this.sections) {
                    section = this.sections.find((section) => {
                        return section.section == data.sectionNumber;
                    });
                }

                if (section) {
                    this.sectionChanged(section);
                }
            }
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.displaySectionSelector = this.cfDelegate.displaySectionSelector(this.course);
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        this.setInputData();

        if (changes.course) {
            // Course has changed, try to get the components.
            this.getComponents();
        }

        if (changes.sections && this.sections) {
            if (!this.selectedSection) {
                // There is no selected section yet, calculate which one to load.
                if (this.initialSectionId || this.initialSectionNumber) {
                    // We have an input indicating the section ID to load. Search the section.
                    for (let i = 0; i < this.sections.length; i++) {
                        const section = this.sections[i];
                        if ((section.id && section.id == this.initialSectionId) ||
                                (section.section && section.section == this.initialSectionNumber)) {

                            // Don't load the section if it cannot be viewed by the user.
                            if (this.canViewSection(section)) {
                                this.loaded = true;
                                this.sectionChanged(section);
                            }
                            break;
                        }
                    }

                }

                if (!this.loaded) {
                    // No section specified, not found or not visible, get current section.
                    this.cfDelegate.getCurrentSection(this.course, this.sections).then((section) => {
                        this.loaded = true;
                        this.sectionChanged(section);
                    });
                }
            } else {
                // We have a selected section, but the list has changed. Search the section in the list.
                let newSection;
                for (let i = 0; i < this.sections.length; i++) {
                    const section = this.sections[i];
                    if (this.compareSections(section, this.selectedSection)) {
                        newSection = section;
                        break;
                    }
                }

                if (!newSection) {
                    // Section not found, calculate which one to use.
                    this.cfDelegate.getCurrentSection(this.course, this.sections).then((section) => {
                        this.sectionChanged(section);
                    });
                } else {
                    this.sectionChanged(newSection);
                }
            }
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
    protected getComponents(): void {
        if (this.course && this.course.format != this.lastCourseFormat) {
            this.lastCourseFormat = this.course.format;

            // Format has changed or it's the first time, load all the components.
            this.cfDelegate.getCourseFormatComponent(this.injector, this.course).then((component) => {
                this.courseFormatComponent = component;
            });

            this.cfDelegate.getCourseSummaryComponent(this.injector, this.course).then((component) => {
                this.courseSummaryComponent = component;
            });

            this.cfDelegate.getSectionSelectorComponent(this.injector, this.course).then((component) => {
                this.sectionSelectorComponent = component;
            });

            this.cfDelegate.getSingleSectionComponent(this.injector, this.course).then((component) => {
                this.singleSectionComponent = component;
            });

            this.cfDelegate.getAllSectionsComponent(this.injector, this.course).then((component) => {
                this.allSectionsComponent = component;
            });
        }
    }

    /**
     * Display the section selector modal.
     *
     * @param {MouseEvent} event Event.
     */
    showSectionSelector(event: MouseEvent): void {
        if (!this.sectionSelectorExpanded) {
            const modal = this.modalCtrl.create('CoreCourseSectionSelectorPage',
                {course: this.course, sections: this.sections, selected: this.selectedSection});
            modal.onDidDismiss((newSection) => {
                if (newSection) {
                    this.sectionChanged(newSection);
                }

                this.sectionSelectorExpanded = false;
            });

            modal.present({
                ev: event
            });

            this.sectionSelectorExpanded = true;
        }
    }

    /**
     * Function called when selected section changes.
     *
     * @param {any} newSection The new selected section.
     */
    sectionChanged(newSection: any): void {
        const previousValue = this.selectedSection;
        this.selectedSection = newSection;
        this.data.section = this.selectedSection;

        if (newSection.id != this.allSectionsId) {
            // Select next and previous sections to show the arrows.
            const i = this.sections.findIndex((value, index) => {
                return this.compareSections(value, this.selectedSection);
            });

            let j;
            for (j = i - 1; j >= 1; j--) {
                if (this.canViewSection(this.sections[j])) {
                    break;
                }
            }
            this.previousSection = j >= 1 ? this.sections[j] : null;

            for (j = i + 1; j < this.sections.length; j++) {
                if (this.canViewSection(this.sections[j])) {
                    break;
                }
            }
            this.nextSection = j < this.sections.length ? this.sections[j] : null;
        } else {
            this.previousSection = null;
            this.nextSection = null;
            this.canLoadMore = false;
            this.showSectionId = 0;
            this.showMoreActivities();
            this.courseHelper.calculateSectionsStatus(this.sections, this.course.id, false, false);
        }

        if (this.moduleId && typeof previousValue == 'undefined') {
            setTimeout(() => {
                this.domUtils.scrollToElementBySelector(this.content, '#core-course-module-' + this.moduleId);
            }, 200);
        } else {
            this.domUtils.scrollToTop(this.content, 0);
        }

        if (!previousValue || previousValue.id != newSection.id) {
            // First load or section changed, add log in Moodle.
            this.courseProvider.logView(this.course.id, newSection.section, undefined, this.course.fullname).catch(() => {
                // Ignore errors.
            });
        }
    }

    /**
     * Compare if two sections are equal.
     *
     * @param {any} s1 First section.
     * @param {any} s2 Second section.
     * @return {boolean} Whether they're equal.
     */
    compareSections(s1: any, s2: any): boolean {
        return s1 && s2 ? s1.id === s2.id : s1 === s2;
    }

    /**
     * Calculate the status of sections.
     *
     * @param {boolean} refresh If refresh or not.
     */
    protected calculateSectionsStatus(refresh?: boolean): void {
        this.courseHelper.calculateSectionsStatus(this.sections, this.course.id, refresh).catch(() => {
            // Ignore errors (shouldn't happen).
        });
    }

    /**
     * Confirm and prefetch a section. If the section is "all sections", prefetch all the sections.
     *
     * @param {any} section Section to download.
     * @param {boolean} refresh Refresh clicked (not used).
     */
    prefetch(section: any, refresh: boolean = false): void {
        section.isCalculating = true;
        this.courseHelper.confirmDownloadSizeSection(this.course.id, section, this.sections).then(() => {
            this.prefetchSection(section, true);
        }, (error) => {
            // User cancelled or there was an error calculating the size.
            if (error) {
                this.domUtils.showErrorModal(error);
            }
        }).finally(() => {
            section.isCalculating = false;
        });
    }

    /**
     * Prefetch a section.
     *
     * @param {any} section The section to download.
     * @param {boolean} [manual] Whether the prefetch was started manually or it was automatically started because all modules
     *                           are being downloaded.
     */
    protected prefetchSection(section: any, manual?: boolean): void {
        this.courseHelper.prefetchSection(section, this.course.id, this.sections).catch((error) => {
            // Don't show error message if it's an automatic download.
            if (!manual) {
                return;
            }

            this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingsection', true);
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @param {boolean} [afterCompletionChange] Whether the refresh is due to a completion change.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, afterCompletionChange?: boolean): Promise<any> {
        const promises = [];

        this.dynamicComponents.forEach((component) => {
            promises.push(Promise.resolve(component.callComponentFunction('doRefresh', [refresher, done, afterCompletionChange])));
        });

        promises.push(this.courseBlocksComponent.invalidateBlocks().finally(() => {
            return this.courseBlocksComponent.loadContent();
        }));

        return Promise.all(promises);
    }

    /**
     * Show more activities (only used when showing all the sections at the same time).
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     */
    showMoreActivities(infiniteComplete?: any): void {
        this.canLoadMore = false;

        let modulesLoaded = 0,
            i;
        for (i = this.showSectionId + 1; i < this.sections.length; i++) {
            if (this.sections[i].hasContent && this.sections[i].modules) {
                modulesLoaded += this.sections[i].modules.reduce((total, module) => {
                    return module.visibleoncoursepage !== 0 ? total + 1 : total;
                }, 0);

                if (modulesLoaded >= CoreCourseFormatComponent.LOAD_MORE_ACTIVITIES) {
                    break;
                }
            }
        }

        this.showSectionId = i;

        this.canLoadMore = i < this.sections.length;

        if (this.canLoadMore) {
            // Check if any of the following sections have any content.
            let thereAreMore = false;
            for (i++; i < this.sections.length; i++) {
                if (this.sections[i].hasContent && this.sections[i].modules && this.sections[i].modules.length > 0) {
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
        this.dynamicComponents.forEach((component) => {
            component.callComponentFunction('ionViewDidEnter');
        });
        if (this.downloadEnabled) {
            // The download status of a section might have been changed from within a module page.
            if (this.selectedSection && this.selectedSection.id !== CoreCourseProvider.ALL_SECTIONS_ID) {
                this.courseHelper.calculateSectionStatus(this.selectedSection, this.course.id, false, false);
            } else {
                this.courseHelper.calculateSectionsStatus(this.sections, this.course.id, false, false);
            }
        }
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.dynamicComponents.forEach((component) => {
            component.callComponentFunction('ionViewDidLeave');
        });
    }

    /**
     * Check whether a section can be viewed.
     *
     * @param {any} section The section to check.
     * @return {boolean} Whether the section can be viewed.
     */
    canViewSection(section: any): boolean {
        return section.uservisible !== false && !section.hiddenbynumsections &&
                section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    }

    /**
     * The completion of any of the modules have changed.
     */
    onCompletionChange(completionData: any): void {
        if (completionData.hasOwnProperty('valueused') && !completionData.valueused) {
            // If the completion value is not used, the page won't be reloaded, so update the progress bar.
            const completionModules = []
                    .concat(...this.sections.filter((section) => section.hasOwnProperty('modules'))
                        .map((section) => section.modules))
                    .map((module) => (module.completion > 0) ? 1 : module.completion)
                    .reduce((accumulator, currentValue) => accumulator + currentValue);
            const moduleProgressPercent = 100 / completionModules;
            // Use min/max here to avoid floating point rounding errors over/under-flowing the progress bar.
            if (completionData.state === CoreCourseProvider.COMPLETION_COMPLETE) {
                this.course.progress = Math.min(100, this.course.progress + moduleProgressPercent);
            } else {
                this.course.progress = Math.max(0, this.course.progress - moduleProgressPercent);
            }

        }
        // Emit a new event for other components.
        this.completionChanged.emit(completionData);
    }

    /**
     * Recalculate the download status of each section, in response to a module being downloaded.
     *
     * @param {any} eventData
     */
    onModuleStatusChange(eventData: any): void {
        this.courseHelper.calculateSectionsStatus(this.sections, this.course.id, false, false);
    }
}
