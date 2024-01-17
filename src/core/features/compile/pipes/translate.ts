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

import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Copy of translate pipe to use when compiling a dynamic component.
 * For some reason, when compiling a dynamic component the original translate pipe isn't found so we use this copy instead.
 */
@Injectable()
@Pipe({
  name: 'translate',
  pure: false, // required to update the value when the promise is resolved
  standalone: true,
})
export class TranslatePipeForCompile extends TranslatePipe implements PipeTransform {}
