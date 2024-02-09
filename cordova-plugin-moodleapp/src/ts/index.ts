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

import { Diagnostic } from './plugins/Diagnostic';
import { InstallReferrer } from './plugins/InstallReferrer';
import { SecureStorage } from './plugins/SecureStorage';

const api: MoodleAppPlugins = {
    secureStorage: new SecureStorage(),
    installReferrer: new InstallReferrer(),
    diagnostic: new Diagnostic(),
};

// This is necessary to work around the default transpilation behavior,
// which would wrap exported modules into UMD methods. Check out the
// fixBundle method in the /scripts/build.js file for more details.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).cordovaModule = api;
