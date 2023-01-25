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

import { NgModule } from '@angular/core';

import { AddonModQuizAccessDelayBetweenAttemptsModule } from './delaybetweenattempts/delaybetweenattempts.module';
import { AddonModQuizAccessIpAddressModule } from './ipaddress/ipaddress.module';
import { AddonModQuizAccessNumAttemptsModule } from './numattempts/numattempts.module';
import { AddonModQuizAccessOfflineAttemptsModule } from './offlineattempts/offlineattempts.module';
import { AddonModQuizAccessOpenCloseDateModule } from './openclosedate/openclosedate.module';
import { AddonModQuizAccessPasswordModule } from './password/password.module';
import { AddonModQuizAccessSafeBrowserModule } from './safebrowser/safebrowser.module';
import { AddonModQuizAccessSecureWindowModule } from './securewindow/securewindow.module';
import { AddonModQuizAccessTimeLimitModule } from './timelimit/timelimit.module';

@NgModule({
    imports: [
        AddonModQuizAccessDelayBetweenAttemptsModule,
        AddonModQuizAccessIpAddressModule,
        AddonModQuizAccessNumAttemptsModule,
        AddonModQuizAccessOfflineAttemptsModule,
        AddonModQuizAccessOpenCloseDateModule,
        AddonModQuizAccessPasswordModule,
        AddonModQuizAccessSafeBrowserModule,
        AddonModQuizAccessSecureWindowModule,
        AddonModQuizAccessTimeLimitModule,
    ],
})
export class AddonModQuizAccessRulesModule {}
