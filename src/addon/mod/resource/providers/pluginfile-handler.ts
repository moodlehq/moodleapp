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

import { Injectable } from '@angular/core';
import { CorePluginFileHandler } from '@providers/plugin-file-delegate';

/**
 * Handler to treat links to resource.
 */
@Injectable()
export class AddonModResourcePluginFileHandler implements CorePluginFileHandler {
    name = 'AddonModResourcePluginFileHandler';
    component = 'mod_resource';

    /**
     * Return the RegExp to match the revision on pluginfile URLs.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @return RegExp to match the revision on pluginfile URLs.
     */
    getComponentRevisionRegExp(args: string[]): RegExp {
        // Check filearea.
        if (args[2] == 'content') {
            // Component + Filearea + Revision
            return new RegExp('/mod_resource/content/([0-9]+)/');
        }
    }

    /**
     * Should return the string to remove the revision on pluginfile url.
     *
     * @param args Arguments of the pluginfile URL defining component and filearea at least.
     * @return String to remove the revision on pluginfile url.
     */
    getComponentRevisionReplace(args: string[]): string {
        // Component + Filearea + Revision
        return '/mod_resource/content/0/';
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
