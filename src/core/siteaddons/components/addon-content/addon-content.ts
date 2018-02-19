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

import { Component, OnInit, Input } from '@angular/core';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreSiteAddonsProvider } from '../../providers/siteaddons';

/**
 * Component to render a site addon content.
 */
@Component({
    selector: 'core-site-addons-addon-content',
    templateUrl: 'addon-content.html',
})
export class CoreSiteAddonsAddonContentComponent implements OnInit {
    @Input() component: string;
    @Input() method: string;
    @Input() args: any;

    content: string; // Content.
    javascript: string; // Javascript to execute.
    dataLoaded: boolean;

    constructor(protected domUtils: CoreDomUtilsProvider, protected siteAddonsProvider: CoreSiteAddonsProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Fetches the content to render.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchContent(): Promise<any> {
        return this.siteAddonsProvider.getContent(this.component, this.method, this.args).then((result) => {
            this.content = result.html;
            this.javascript = result.javascript;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        });
    }

    /**
     * Refresh the data.
     */
    refreshData(): Promise<any> {
        return this.siteAddonsProvider.invalidateContent(this.component, this.method, this.args).finally(() => {
            return this.fetchContent();
        });
    }

    /**
     * Update the content, usually with a different method or params.
     *
     * @param {string} component New component.
     * @param {string} method New method.
     * @param {any} args New params.
     */
    updateContent(component: string, method: string, args: any): void {
        this.component = component;
        this.method = method;
        this.args = args;
        this.dataLoaded = false;

        this.fetchContent().finally(() => {
            this.dataLoaded = true;
        });
    }
}
