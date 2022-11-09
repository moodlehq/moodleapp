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

import { Type } from '@angular/core';

import { CoreError } from './error';
import { CoreWSError } from './wserror';
import { CoreCanceledError } from './cancelederror';
import { CoreSilentError } from './silenterror';
import { CoreAjaxError } from './ajaxerror';
import { CoreAjaxWSError } from './ajaxwserror';
import { CoreCaptureError } from './captureerror';
import { CoreNetworkError } from './network-error';
import { CoreSiteError } from './siteerror';
import { CoreLoginError } from './loginerror';
import { CoreErrorWithOptions } from './errorwithtitle';
import { CoreHttpError } from './httperror';

export const CORE_ERRORS_CLASSES: Type<unknown>[] = [
    CoreAjaxError,
    CoreAjaxWSError,
    CoreCanceledError,
    CoreCaptureError,
    CoreError,
    CoreNetworkError,
    CoreSilentError,
    CoreSiteError,
    CoreLoginError,
    CoreWSError,
    CoreErrorWithOptions,
    CoreHttpError,
];
