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

import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCoursesCourseListItemComponent } from '@features/courses/components/course-list-item/course-list-item';

/**
 * Modal that displays individual ratings
 */
@Component({
    templateUrl: 'sorthelpmodal.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCoursesCourseListItemComponent,
    ],
})
export class AddonSortHelpModalComponent implements OnInit {

    @Input() trimsuffix!: number;

    loaded = false;
    /**
     * Modal loaded.
     */
    async ngOnInit(): Promise<void> {
        this.loaded = true;
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
