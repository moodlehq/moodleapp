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

import { CoreApp } from '@services/app';
import { NgZone, Keyboard } from '@singletons';

export default function(): void {
    const zone = NgZone.instance;
    const app = CoreApp.instance;
    const keyboard = Keyboard.instance;

    // Execute callbacks in the Angular zone, so change detection doesn't stop working.
    keyboard.onKeyboardShow().subscribe(data => zone.run(() => app.onKeyboardShow(data.keyboardHeight)));
    keyboard.onKeyboardHide().subscribe(() => zone.run(() => app.onKeyboardHide()));
    keyboard.onKeyboardWillShow().subscribe(() => zone.run(() => app.onKeyboardWillShow()));
    keyboard.onKeyboardWillHide().subscribe(() => zone.run(() => app.onKeyboardWillHide()));
}
