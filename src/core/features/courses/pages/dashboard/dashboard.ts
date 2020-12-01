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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

import { CoreCourses, CoreCoursesProvider } from '../../services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';

/**
 * Page that displays the dashboard page.
 */
@Component({
    selector: 'page-core-courses-dashboard',
    templateUrl: 'dashboard.html',
    styleUrls: ['dashboard.scss'],
})
export class CoreCoursesDashboardPage implements OnInit, OnDestroy {

    searchEnabled = false;
    downloadEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    downloadEnabledIcon = 'far-square';

    protected updateSiteObserver?: CoreEventObserver;

    siteName = 'Hello world';

    constructor(
        protected navCtrl: NavController,
    ) { }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.instance.isSearchCoursesDisabledInSite();
        this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.instance.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.instance.isSearchCoursesDisabledInSite();
            this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.instance.isDownloadCoursesDisabledInSite();

            this.switchDownload(this.downloadEnabled && this.downloadCourseEnabled && this.downloadCoursesEnabled);
        }, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        this.switchDownload(!this.downloadEnabled);
    }

    /**
     * Convenience function to switch download enabled.
     *
     * @param enable If enable or disable.
     */
    protected switchDownload(enable: boolean): void {
        this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && enable;
        this.downloadEnabledIcon = this.downloadEnabled ? 'far-check-square' : 'far-square';
        CoreEvents.trigger(CoreCoursesProvider.EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED, { enabled: this.downloadEnabled });
    }

    /**
     * Open page to manage courses storage.
     */
    manageCoursesStorage(): void {
        // @todo this.navCtrl.navigateForward(['/courses/storage']);
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        this.navCtrl.navigateForward(['/main/home/courses/search']);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
    }


}
