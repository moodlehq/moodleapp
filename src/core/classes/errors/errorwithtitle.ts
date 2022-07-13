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

import { AlertButton } from '@ionic/angular';
import { CoreError } from './error';

/**
 * Error with an explicit title describing the problem (instead of just "Error" or a generic message).
 * This title should be used to communicate the problem with users, and if it's undefined it should be omitted.
 * The error also may contain customizable action buttons.
 */
export class CoreErrorWithOptions extends CoreError {

    title?: string;
    buttons?: AlertButton[];

    constructor(message?: string, title?: string, buttons?: AlertButton[]) {
        super(message);

        this.title = title;
        this.buttons = buttons;
    }

}
