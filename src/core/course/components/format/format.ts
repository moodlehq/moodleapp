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
    Component, Input, OnInit, OnChanges, OnDestroy, SimpleChange, Output, EventEmitter, ViewChildren, QueryList, Injector
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
    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Output() completionChanged?: EventEmitter<void>; // Will emit an event when any module completion changes.

    @ViewChildren(CoreDynamicComponent) dynamicComponents: QueryList<CoreDynamicComponent>;

    // All the possible component classes.
    courseFormatComponent: any;
    courseSummaryComponent: any;
    sectionSelectorComponent: any;
    singleSectionComponent: any;
    allSectionsComponent: any;

    // Data to pass to the components.
    data: any = {};

    displaySectionSelector: boolean;
    selectedSection: any;
    allSectionsId: number = CoreCourseProvider.ALL_SECTIONS_ID;
    selectOptions: any = {};
    loaded: boolean;

    protected sectionStatusObserver;

    constructor(private cfDelegate: CoreCourseFormatDelegate, translate: TranslateService, private injector: Injector,
            private courseHelper: CoreCourseHelperProvider, private domUtils: CoreDomUtilsProvider,
            eventsProvider: CoreEventsProvider, private sitesProvider: CoreSitesProvider, private content: Content,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, private modalCtrl: ModalController) {

        this.selectOptions.title = translate.instant('core.course.sections');
        this.completionChanged = new EventEmitter();

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
                        this.prefetch(section, false);
                    }
                });
            }
        }, this.sitesProvider.getCurrentSiteId());
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
                            this.loaded = true;
                            this.sectionChanged(section);
                            break;
                        }
                    }
                } else {
                    // No section specified, get current section.
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
                    newSection = this.cfDelegate.getCurrentSection(this.course, this.sections);
                }
                this.sectionChanged(newSection);
            }
        }

        if (changes.downloadEnabled && this.downloadEnabled) {
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
    }

    /**
     * Get the components classes.
     */
    protected getComponents(): void {
        if (this.course) {
            if (!this.courseFormatComponent) {
                this.cfDelegate.getCourseFormatComponent(this.injector, this.course).then((component) => {
                    this.courseFormatComponent = component;
                });
            }
            if (!this.courseSummaryComponent) {
                this.cfDelegate.getCourseSummaryComponent(this.injector, this.course).then((component) => {
                    this.courseSummaryComponent = component;
                });
            }
            if (!this.sectionSelectorComponent) {
                this.cfDelegate.getSectionSelectorComponent(this.injector, this.course).then((component) => {
                    this.sectionSelectorComponent = component;
                });
            }
            if (!this.singleSectionComponent) {
                this.cfDelegate.getSingleSectionComponent(this.injector, this.course).then((component) => {
                    this.singleSectionComponent = component;
                });
            }
            if (!this.allSectionsComponent) {
                this.cfDelegate.getAllSectionsComponent(this.injector, this.course).then((component) => {
                    this.allSectionsComponent = component;
                });
            }
        }
    }

    /**
     * Display the section selector modal.
     */
    showSectionSelector(): void {
        const modal = this.modalCtrl.create('CoreCourseSectionSelectorPage',
            {sections: this.sections, selected: this.selectedSection});
        modal.onDidDismiss((newSection) => {
            if (newSection) {
                this.sectionChanged(newSection);
            }
        });
        modal.present();
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

        if (this.moduleId && typeof previousValue == 'undefined') {
            setTimeout(() => {
                this.domUtils.scrollToElementBySelector(this.content, '#core-course-module-' + this.moduleId);
            }, 200);
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
     * @param {Event} e Click event.
     * @param {any} section Section to download.
     */
    prefetch(e: Event, section: any): void {
        e.preventDefault();
        e.stopPropagation();

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
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        const promises = [];

        this.dynamicComponents.forEach((component) => {
            promises.push(Promise.resolve(component.callComponentFunction('doRefresh', [refresher, done])));
        });

        return Promise.all(promises);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        if (this.sectionStatusObserver) {
            this.sectionStatusObserver.off();
        }
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.dynamicComponents.forEach((component) => {
            component.callComponentFunction('ionViewDidEnter');
        });
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.dynamicComponents.forEach((component) => {
            component.callComponentFunction('ionViewDidLeave');
        });
    }
}
