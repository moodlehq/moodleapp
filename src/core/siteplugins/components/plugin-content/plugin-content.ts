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

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { Subject } from 'rxjs';

/**
 * Component to render a site plugin content.
 */
@Component({
    selector: 'core-site-plugins-plugin-content',
    templateUrl: 'plugin-content.html',
})
export class CoreSitePluginsPluginContentComponent implements OnInit {
    @Input() component: string;
    @Input() method: string;
    @Input() args: any;
    @Input() initResult: any; // Result of the init WS call of the handler.
    @Output() onContentLoaded?: EventEmitter<boolean>; // Emits an event when the content is loaded.
    @Output() onLoadingContent?: EventEmitter<boolean>; // Emits an event when starts to load the content.

    content: string; // Content.
    javascript: string; // Javascript to execute.
    otherData: any; // Other data of the content.
    dataLoaded: boolean;
    invalidateObservable: Subject<void>; // An observable to notify observers when to invalidate data.
    jsData: any; // Data to pass to the component.

    constructor(protected domUtils: CoreDomUtilsProvider, protected sitePluginsProvider: CoreSitePluginsProvider) {
        this.onContentLoaded = new EventEmitter();
        this.onLoadingContent = new EventEmitter();
        this.invalidateObservable = new Subject<void>();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchContent();
    }

    /**
     * Fetches the content to render.
     *
     * @param {boolean} [refresh] Whether the user is refreshing.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchContent(refresh?: boolean): Promise<any> {
        this.onLoadingContent.emit(refresh);

        return this.sitePluginsProvider.getContent(this.component, this.method, this.args).then((result) => {
            this.content = result.templates.length ? result.templates[0].html : ''; // Load first template.
            this.javascript = result.javascript;
            this.otherData = result.otherdata;
            this.jsData = this.sitePluginsProvider.createDataForJS(this.initResult, result);

            this.onContentLoaded.emit(refresh);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        }).finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {boolean} [showSpinner] Whether to show spinner while refreshing.
     */
    refreshData(showSpinner?: boolean): Promise<any> {
        if (showSpinner) {
            this.dataLoaded = false;
        }

        this.invalidateObservable.next(); // Notify observers.

        return this.sitePluginsProvider.invalidateContent(this.component, this.method, this.args).finally(() => {
            return this.fetchContent(true);
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

        this.fetchContent();
    }
}
