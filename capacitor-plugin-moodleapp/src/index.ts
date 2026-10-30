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

import { DiskSpace } from './plugins/DiskSpace';
import { InstallReferrer } from './plugins/InstallReferrer';
import { IntentLauncher } from './plugins/IntentLauncher';
import { NativeSettings } from './plugins/NativeSettings';
import { SecureStorage } from './plugins/SecureStorage';

export type { InstallReferrerResult } from './plugins/InstallReferrer';
export type { IntentLauncherViewOptions } from './plugins/IntentLauncher';
export type { SecureStorage } from './plugins/SecureStorage';

// Wrapped in plain classes because Capacitor proxies are thenables and break when resolved from a promise.
export const MoodleAppCapacitorPlugins = {
    diskSpace: new DiskSpace(),
    installReferrer: new InstallReferrer(),
    intentLauncher: new IntentLauncher(),
    nativeSettings: new NativeSettings(),
    secureStorage: new SecureStorage(),
};
