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

import { Component, Injector } from '@angular/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModuleMainResourceComponent } from '@core/course/classes/main-resource-component';
import { AddonModUrlProvider } from '../../providers/url';
import { AddonModUrlHelperProvider } from '../../providers/helper';

/**
 * Component that displays a url.
 */
@Component({
    selector: 'addon-mod-url-index',
    templateUrl: 'addon-mod-url-index.html',
})
export class AddonModUrlIndexComponent extends CoreCourseModuleMainResourceComponent {
    component = AddonModUrlProvider.COMPONENT;

    canGetUrl: boolean;
    url: string;

    constructor(injector: Injector, private urlProvider: AddonModUrlProvider, private courseProvider: CoreCourseProvider,
            private urlHelper: AddonModUrlHelperProvider) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.canGetUrl = this.urlProvider.isGetUrlWSAvailable();

        this.loadContent();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return this.urlProvider.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download url contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        let canGetUrl = this.canGetUrl,
            mod,
            promise;

        // Fetch the module data.
        if (canGetUrl) {
            promise = this.urlProvider.getUrl(this.courseId, this.module.id);
        } else {
            promise = Promise.reject(null);
        }

        return promise.catch(() => {
            canGetUrl = false;

            // Fallback in case is not prefetched or not available.
            return this.courseProvider.getModule(this.module.id, this.courseId, undefined, false, false, undefined, 'url');
        }).then((url) => {
            this.description = url.intro || url.description;
            this.dataRetrieved.emit(url);

            if (!canGetUrl) {
                mod = url;

                if (!url.contents.length) {
                    // If the data was cached maybe we don't have contents. Reject.
                    return Promise.reject(null);
                }
            } else {
                mod = this.module;

                if (!mod.contents || !mod.contents.length) {
                    // Try to load module contents, it's needed to get the URL with parameters.
                    return this.courseProvider.loadModuleContents(mod, this.courseId, undefined, false, false, undefined, 'url');
                }
            }
        }).then(() => {
            // Always use the URL from the module because it already includes the parameters.
            this.url = mod.contents && mod.contents[0] && mod.contents[0].fileurl ? mod.contents[0].fileurl : undefined;
        });
    }

    /**
     * Opens a file.
     */
    go(): void {
        this.urlProvider.logView(this.module.instance).then(() => {
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completionstatus);
        });
        this.urlHelper.open(this.url);
    }
}
