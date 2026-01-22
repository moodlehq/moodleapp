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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, input, computed } from '@angular/core';
import { CoreFileEntry } from '@services/file-helper';

import { CoreMimetype } from '@singletons/mimetype';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFileComponent } from '../file/file';
import { CoreLocalFileComponent } from '../local-file/local-file';
import { CoreFormatTextDirective } from '@directives/format-text';

/**
 * Component to render a file list.
 *
 * <core-files [files]="files" [component]="component" [componentId]="assign.cmid">
 * </core-files>
 */
@Component({
    selector: 'core-files',
    templateUrl: 'core-files.html',
    imports: [
        CoreBaseModule,
        CoreFileComponent,
        CoreLocalFileComponent,
        CoreFormatTextDirective,
    ],
})
export class CoreFilesComponent {

    readonly files = input<CoreFileEntry[]>([]); // List of files.
    readonly component = input<string>(); // Component the downloaded files will be linked to.
    readonly componentId = input<string | number>(); // Component ID.
    readonly alwaysDownload = input(false, { transform: toBoolean }); // True to always display refresh button when is downloaded.
    readonly canDownload = input(true, { transform: toBoolean }); // Whether file can be downloaded.
    readonly showSize = input(true, { transform: toBoolean }); // Whether show filesize.
    readonly showTime = input(true, { transform: toBoolean }); // Whether show file time modified.
    readonly showInline = input(false, { transform: toBoolean }); // If true, it will reorder and try to show inline files first.
    readonly extraHtml = input<string[]>(); // Extra HTML for each attachment. Each HTML should be at the same position.

    readonly contentText = computed(() => {
        if (!this.showInline()) {
            return '';
        }

        return this.files().reduce((previous, file) => {
            const text = CoreMimetype.getEmbeddedHtml(file);

            return text ? `${previous}<br>${text}` : previous;
        }, '');
    });

}
