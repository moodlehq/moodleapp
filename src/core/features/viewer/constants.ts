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

import { MAIN_MENU_FEATURE_PREFIX } from '@features/mainmenu/constants';
import { CoreViewerReadingModeSettings } from './services/viewer';

export const CORE_READING_MODE_SETTINGS = 'CoreReadingModeSettings';

export const CoreViewerReadingModeThemes = {
    AUTO: 'auto', // eslint-disable-line @typescript-eslint/naming-convention
    LIGHT: 'light', // eslint-disable-line @typescript-eslint/naming-convention
    DARK: 'dark', // eslint-disable-line @typescript-eslint/naming-convention
    SEPIA: 'sepia', // eslint-disable-line @typescript-eslint/naming-convention
    HCM: 'hcm', // eslint-disable-line @typescript-eslint/naming-convention
} as const;

export type CoreViewerReadingModeThemesType = typeof CoreViewerReadingModeThemes[keyof typeof CoreViewerReadingModeThemes];

export const CORE_READING_MODE_DEFAULT_SETTINGS: CoreViewerReadingModeSettings = {
    zoom: 100,
    showMultimedia: false,
    theme: CoreViewerReadingModeThemes.HCM,
};

export const CORE_QRREADER_COMPONENT_NAME = 'QrReader';
export const CORE_QRREADER_MENU_FEATURE_NAME = `${MAIN_MENU_FEATURE_PREFIX}${CORE_QRREADER_COMPONENT_NAME}`;
