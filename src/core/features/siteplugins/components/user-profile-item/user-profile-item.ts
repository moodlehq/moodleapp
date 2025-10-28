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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, computed, input } from '@angular/core';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreUserDelegateContext } from '@features/user/services/user-delegate';

/**
 * Component to render a site plugin user profile item.
 */
@Component({
    selector: 'core-site-plugins-user-profile-item',
    templateUrl: 'user-profile-item.html',
    imports: [
        CoreSharedModule,
        CoreSitePluginsPluginContentComponent,
    ],
})
export class CoreSitePluginsUserProfileItemComponent {

    readonly user = input.required<CoreUserProfile>();
    readonly context = input.required<CoreUserDelegateContext>();
    readonly courseId = input<number>();
    readonly component = input.required<string>();
    readonly method = input.required<string>();
    readonly initResult = input<CoreSitePluginsPluginContentComponent | null>();

    readonly args = computed(() => ({
        userid: this.user().id,
        context: this.context(),
        courseid: this.courseId(),
    }));

    readonly jsData = computed(() => ({
        user: this.user(),
        context: this.context(),
        courseId: this.courseId(),
    }));

}
