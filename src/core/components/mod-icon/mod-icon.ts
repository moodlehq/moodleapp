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

import { Component, Input, OnChanges, OnInit, SimpleChange } from '@angular/core';
import { CoreCourse } from '@features/course/services/course';

const assetsPath = 'assets/img/mod/';
const fallbackModName = 'external-tool';

/**
 * Component to handle a module icon.
 */
@Component({
    selector: 'core-mod-icon',
    templateUrl: 'mod-icon.html',
    styleUrls: ['mod-icon.scss'],
})
export class CoreModIconComponent implements OnInit, OnChanges {

    @Input() modname?; // The module name. Used also as component if set.
    @Input() componentId?; // Component Id for external icons.
    @Input() modicon?: string; // Module icon url or local url.
    @Input() showAlt = true; // Show alt otherwise it's only presentation icon.

    icon = '';
    modNameTranslated = '';
    isLocalUrl = true;
    linkIconWithComponent = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.modNameTranslated = this.modname ? CoreCourse.translateModuleName(this.modname) || '' : '';

        this.setIcon();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes && changes.modicon && changes.modicon.previousValue) {
            this.setIcon();
        }
    }

    /**
     * Set icon.
     */
    setIcon(): void {
        this.icon = this.modicon || this.icon;
        this.isLocalUrl = this.icon.startsWith(assetsPath);

        // Cache icon if the url is not the theme generic one.
        // If modname is not set icon won't be cached.
        // Also if the url matches the regexp (the theme will manage the image so it's not cached).
        this.linkIconWithComponent =
            this.modname &&
            this.componentId &&
            !this.isLocalUrl &&
            !this.icon.match('/theme/image.php/[^/]+/' + this.modname + '/[-0-9]*/');
    }

    /**
     * Icon to load on error.
     */
    loadFallbackIcon(): void {
        this.isLocalUrl = true;
        const moduleName = !this.modname || CoreCourse.CORE_MODULES.indexOf(this.modname) < 0
            ? fallbackModName
            : this.modname;

        this.icon = assetsPath + moduleName + '.svg';
    }

}
