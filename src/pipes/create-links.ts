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

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to search URLs that are not inside <a> tags and add the corresponding <a> tags.
 */
@Pipe({
    name: 'coreCreateLinks',
})
export class CoreCreateLinksPipe implements PipeTransform {
    private replacePattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])(?![^<]*>|[^<>]*<\/)/gim;

    /**
     * Takes some text and adds anchor tags to all links that aren't inside anchors.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    transform(text: string): string {
        return text.replace(this.replacePattern, '<a href="$1">$1</a>');
    }
}
