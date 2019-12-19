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

import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from '../../providers/courses';

/**
 * Page that displays a list of categories and the courses in the current category if any.
 */
@IonicPage({ segment: 'core-courses-categories' })
@Component({
    selector: 'page-core-courses-categories',
    templateUrl: 'categories.html',
})
export class CoreCoursesCategoriesPage {
    title: string;
    currentCategory: any;
    categories: any[] = [];
    courses: any[] = [];
    categoriesLoaded: boolean;

    protected categoryId: number;

    constructor(private navCtrl: NavController, navParams: NavParams, private coursesProvider: CoreCoursesProvider,
            private domUtils: CoreDomUtilsProvider, private utils: CoreUtilsProvider, translate: TranslateService,
            private sitesProvider: CoreSitesProvider) {
        this.categoryId = navParams.get('categoryId') || 0;
        this.title = translate.instant('core.courses.categories');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchCategories().finally(() => {
            this.categoriesLoaded = true;
        });
    }

    /**
     * Fetch the categories.
     *
     * @return Promise resolved when done.
     */
    protected fetchCategories(): Promise<any> {
        return this.coursesProvider.getCategories(this.categoryId, true).then((cats) => {
            this.currentCategory = undefined;

            cats.forEach((cat, index) => {
                if (cat.id == this.categoryId) {
                    this.currentCategory = cat;
                    // Delete current Category to avoid problems with the formatTree.
                    delete cats[index];
                }
            });

            // Sort by depth and sortorder to avoid problems formatting Tree.
            cats.sort((a, b) => {
                if (a.depth == b.depth) {
                    return (a.sortorder > b.sortorder) ? 1 : ((b.sortorder > a.sortorder) ? -1 : 0);
                }

                return a.depth > b.depth ? 1 : -1;
            });

            this.categories = this.utils.formatTree(cats, 'parent', 'id', this.categoryId);

            if (this.currentCategory) {
                this.title = this.currentCategory.name;

                return this.coursesProvider.getCoursesByField('category', this.categoryId).then((courses) => {
                    this.courses = courses;
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
                });
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.courses.errorloadcategories', true);
        });
    }

    /**
     * Refresh the categories.
     *
     * @param refresher Refresher.
     */
    refreshCategories(refresher: any): void {
        const promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.coursesProvider.invalidateCategories(this.categoryId, true));
        promises.push(this.coursesProvider.invalidateCoursesByField('category', this.categoryId));
        promises.push(this.sitesProvider.getCurrentSite().invalidateConfig());

        Promise.all(promises).finally(() => {
            this.fetchCategories().finally(() => {
                refresher.complete();
            });
        });
    }
    /**
     * Open a category.
     *
     * @param categoryId The category ID.
     */
    openCategory(categoryId: number): void {
        this.navCtrl.push('CoreCoursesCategoriesPage', { categoryId: categoryId });
    }
}
