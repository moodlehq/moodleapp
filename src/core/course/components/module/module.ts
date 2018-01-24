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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreCourseModuleHandlerButton } from '../../providers/module-delegate';

/**
 * Component to display a module entry in a list of modules.
 *
 * Example usage:
 *
 * <core-course-module [module]="module" [courseId]="courseId" (completionChanged)="onCompletionChange()"></core-course-module>
 */
@Component({
    selector: 'core-course-module',
    templateUrl: 'module.html'
})
export class CoreCourseModuleComponent implements OnInit {
    @Input() module: any; // The module to render.
    @Input() courseId: number; // The course the module belongs to.
    @Output() completionChanged?: EventEmitter<void>; // Will emit an event when the module completion changes.

    constructor(private navCtrl: NavController) {
        this.completionChanged = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        // Handler data must be defined. If it isn't, set it to prevent errors.
        if (this.module && !this.module.handlerData) {
            this.module.handlerData = {};
        }
    }

    /**
     * Function called when the module is clicked.
     *
     * @param {Event} event Click event.
     */
    moduleClicked(event: Event) {
        if (this.module.uservisible !== false && this.module.handlerData.action) {
            this.module.handlerData.action(event, this.navCtrl, this.module, this.courseId);
        }
    }

    /**
     * Function called when a button is clicked.
     *
     * @param {Event} event Click event.
     * @param {CoreCourseModuleHandlerButton} button The clicked button.
     */
    buttonClicked(event: Event, button: CoreCourseModuleHandlerButton) {
        if (button && button.action) {
            button.action(event, this.navCtrl, this.module, this.courseId);
        }
    }
}
