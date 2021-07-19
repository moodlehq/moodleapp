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

import { Component, OnInit, Input, Output, EventEmitter, DoCheck, KeyValueDiffers, ViewChild, KeyValueDiffer } from '@angular/core';
import { Subject } from 'rxjs';
import { Md5 } from 'ts-md5';

import { CoreSiteWSPreSets } from '@classes/site';
import { CoreCompileHtmlComponent } from '@features/compile/components/compile-html/compile-html';
import { CoreSitePlugins, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Component to render a site plugin content.
 */
@Component({
    selector: 'core-site-plugins-plugin-content',
    templateUrl: 'core-siteplugins-plugin-content.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsPluginContentComponent implements OnInit, DoCheck {

    // Get the compile element. Don't set the right type to prevent circular dependencies.
    @ViewChild('compile') compileComponent?: CoreCompileHtmlComponent;

    @Input() component!: string;
    @Input() method!: string;
    @Input() args?: Record<string, unknown>;
    @Input() initResult?: CoreSitePluginsContent | null; // Result of the init WS call of the handler.
    @Input() data?: Record<string, unknown>; // Data to pass to the component.
    @Input() preSets?: CoreSiteWSPreSets; // The preSets for the WS call.
    @Input() pageTitle?: string; // Current page title. It can be used by the "new-content" directives.
    @Output() onContentLoaded = new EventEmitter<boolean>(); // Emits an event when the content is loaded.
    @Output() onLoadingContent = new EventEmitter<boolean>(); // Emits an event when starts to load the content.

    content?: string; // Content.
    javascript?: string; // Javascript to execute.
    otherData?: Record<string, unknown>; // Other data of the content.
    dataLoaded = false;
    invalidateObservable = new Subject<void>(); // An observable to notify observers when to invalidate data.
    jsData?: Record<string, unknown>; // Data to pass to the component.
    forceCompile?: boolean; // Force compilation on PTR.

    protected differ: KeyValueDiffer<unknown, unknown>; // To detect changes in the data input.

    constructor(differs: KeyValueDiffers) {
        this.differ = differs.find([]).create();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchContent();
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        if (!this.data || !this.jsData) {
            return;
        }

        // Check if there's any change in the data object.
        const changes = this.differ.diff(this.data);
        if (changes) {
            this.jsData = Object.assign(this.jsData, this.data);
        }
    }

    /**
     * Fetches the content to render.
     *
     * @param refresh Whether the user is refreshing.
     * @return Promise resolved when done.
     */
    async fetchContent(refresh?: boolean): Promise<void> {
        this.onLoadingContent.emit(refresh);

        this.forceCompile = false;

        const preSets = Object.assign({}, this.preSets);
        preSets.component = preSets.component || this.component;

        try {
            const result = await CoreSitePlugins.getContent(this.component, this.method, this.args, preSets);

            this.content = result.templates.length ? result.templates[0].html : ''; // Load first template.
            this.javascript = result.javascript;
            this.otherData = result.otherdata;
            this.data = this.data || {};
            this.forceCompile = true;

            this.jsData = Object.assign(this.data, CoreSitePlugins.createDataForJS(this.initResult, result));

            // Pass some methods as jsData so they can be called from the template too.
            this.jsData.fetchContent = this.fetchContent.bind(this);
            this.jsData.openContent = this.openContent.bind(this);
            this.jsData.refreshContent = this.refreshContent.bind(this);
            this.jsData.updateContent = this.updateContent.bind(this);

            this.onContentLoaded.emit(refresh);
        } catch (error) {
            // Make it think it's loaded - otherwise it sticks on 'loading' and stops navigation working.
            this.content = '<div></div>';
            this.onContentLoaded.emit(refresh);

            CoreDomUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        } finally {
            this.dataLoaded = true;
        }
    }

    /**
     * Open a new page with a new content.
     *
     * @param title The title to display with the new content.
     * @param args New params.
     * @param component New component. If not provided, current component
     * @param method New method. If not provided, current method
     * @param jsData JS variables to pass to the new view so they can be used in the template or JS.
     *               If true is supplied instead of an object, all initial variables from current page will be copied.
     * @param preSets The preSets for the WS call of the new content.
     * @param ptrEnabled Whether PTR should be enabled in the new page. Defaults to true.
     */
    openContent(
        title: string,
        args?: Record<string, unknown>,
        component?: string,
        method?: string,
        jsData?: Record<string, unknown> | boolean,
        preSets?: CoreSiteWSPreSets,
        ptrEnabled?: boolean,
    ): void {
        if (jsData === true) {
            jsData = this.data;
        }

        component = component || this.component;
        method = method || this.method;
        args = args || {};
        const hash = <string> Md5.hashAsciiStr(JSON.stringify(args));

        CoreNavigator.navigateToSitePath(`siteplugins/content/${component}/${method}/${hash}`, {
            params: {
                title,
                args,
                initResult: this.initResult,
                jsData,
                preSets,
                ptrEnabled,
            },
        });
    }

    /**
     * Refresh the data.
     *
     * @param showSpinner Whether to show spinner while refreshing.
     */
    async refreshContent(showSpinner: boolean = true): Promise<void> {
        if (showSpinner) {
            this.dataLoaded = false;
        }

        this.invalidateObservable.next(); // Notify observers.

        try {
            await CoreSitePlugins.invalidateContent(this.component, this.method, this.args);
        } finally {
            await this.fetchContent(true);
        }
    }

    /**
     * Update the content, usually with a different method or params.
     *
     * @param args New params.
     * @param component New component. If not provided, current component
     * @param method New method. If not provided, current method
     * @param jsData JS variables to pass to the new view so they can be used in the template or JS.
     * @param preSets New preSets to use. If not provided, use current preSets.
     */
    updateContent(
        args?: Record<string, unknown>,
        component?: string,
        method?: string,
        jsData?: Record<string, unknown>,
        preSets?: CoreSiteWSPreSets,
    ): void {
        this.component = component || this.component;
        this.method = method || this.method;
        this.args = args;
        this.dataLoaded = false;
        this.preSets = preSets || this.preSets;
        if (jsData) {
            Object.assign(this.data, jsData);
        }

        this.fetchContent();
    }

    /**
     * Call a certain function on the component instance.
     *
     * @param name Name of the function to call.
     * @param params List of params to send to the function.
     * @return Result of the call. Undefined if no component instance or the function doesn't exist.
     */
    callComponentFunction(name: string, params?: unknown[]): unknown | undefined {
        return this.compileComponent?.callComponentFunction(name, params);
    }

}
