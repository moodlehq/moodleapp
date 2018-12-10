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

import { Component, OnInit, Injector, Input } from '@angular/core';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreBlockBaseComponent } from '@core/block/classes/base-block-component';
import { CoreConstants } from '@core/constants';
import { TranslateService } from '@ngx-translate/core';

/**
 * Component to render an "activity modules" block.
 */
@Component({
    selector: 'addon-block-activitymodules',
    templateUrl: 'addon-block-activitymodules.html'
})
export class AddonBlockActivityModulesComponent extends CoreBlockBaseComponent implements OnInit {
    @Input() block: any; // The block to render.
    @Input() contextLevel: string; // The context where the block will be used.
    @Input() instanceId: number; // The instance ID associated with the context level.

    entries: any[] = [];

    protected fetchContentDefaultError = 'Error getting activity modules data.';

    constructor(injector: Injector, protected utils: CoreUtilsProvider, protected courseProvider: CoreCourseProvider,
            protected translate: TranslateService, protected moduleDelegate: CoreCourseModuleDelegate) {

        super(injector, 'AddonBlockActivityModulesComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return this.courseProvider.invalidateSections(this.instanceId);
    }

    /**
     * Fetch the data to render the block.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        return this.courseProvider.getSections(this.instanceId, false, true).then((sections) => {

            this.entries = [];

            const archetypes = {},
                modIcons = {};
            let modFullNames = {};

            sections.forEach((section) => {
                if (!section.modules) {
                    return;
                }

                section.modules.forEach((mod) => {
                    if (mod.uservisible === false || !this.courseProvider.moduleHasView(mod) ||
                            typeof modFullNames[mod.modname] != 'undefined') {
                        // Ignore this module.
                        return;
                    }

                    // Get the archetype of the module type.
                    if (typeof archetypes[mod.modname] == 'undefined') {
                        archetypes[mod.modname] = this.moduleDelegate.supportsFeature(mod.modname,
                                CoreConstants.FEATURE_MOD_ARCHETYPE, CoreConstants.MOD_ARCHETYPE_OTHER);
                    }

                    // Get the full name of the module type.
                    if (archetypes[mod.modname] == CoreConstants.MOD_ARCHETYPE_RESOURCE) {
                        // All resources are gathered in a single "Resources" option.
                        if (!modFullNames['resources']) {
                            modFullNames['resources'] = this.translate.instant('core.resources');
                        }
                    } else {
                        modFullNames[mod.modname] = mod.modplural;
                    }
                    modIcons[mod.modname] = mod.modicon;
                });
            });

            // Sort the modnames alphabetically.
            modFullNames = this.utils.sortValues(modFullNames);

            for (const modName in modFullNames) {
                let icon;

                if (modName === 'resources') {
                    icon = this.courseProvider.getModuleIconSrc('page', modIcons['page']);
                } else {
                    icon = this.moduleDelegate.getModuleIconSrc(modName, modIcons[modName]);
                }

                this.entries.push({
                    icon: icon,
                    name: modFullNames[modName],
                    modName: modName
                });
            }
        });
    }
}
