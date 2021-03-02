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

import { Component, OnInit, Input, ViewChild } from '@angular/core';

import { CoreSitePlugins, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { IonRefresher } from '@ionic/angular';
import { CoreUtils } from '@services/utils/utils';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';

/**
 * Component that displays the index of a course option site plugin.
 */
@Component({
    selector: 'core-site-plugins-course-option',
    templateUrl: 'core-siteplugins-course-option.html',
})
export class CoreSitePluginsCourseOptionComponent implements OnInit {

    @Input() courseId?: number;
    @Input() handlerUniqueName?: string;

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    ptrEnabled = true;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.handlerUniqueName) {
            return;
        }

        const handler = CoreSitePlugins.getSitePluginHandler(this.handlerUniqueName);
        if (!handler) {
            return;
        }

        this.component = handler.plugin.component;
        this.method = handler.handlerSchema.method;
        this.args = {
            courseid: this.courseId,
        };
        this.initResult = handler.initResult;
        this.ptrEnabled = !('ptrenabled' in handler.handlerSchema) ||
            !CoreUtils.isFalseOrZero(handler.handlerSchema.ptrenabled);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async refreshData(refresher: IonRefresher): Promise<void> {
        try {
            await this.content?.refreshContent(false);
        } finally {
            refresher.complete();
        }
    }

}
