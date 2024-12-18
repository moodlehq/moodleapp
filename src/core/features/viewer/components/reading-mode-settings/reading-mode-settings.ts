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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, OnInit } from '@angular/core';
import {
    CORE_READING_MODE_DEFAULT_SETTINGS,
    CoreViewerReadingModeThemes,
    CoreViewerReadingModeThemesType,
} from '@features/viewer/constants';
import { CoreViewer } from '@features/viewer/services/viewer';

import { ModalController } from '@singletons';
import { CoreMath } from '@singletons/math';

/**
 * Component to display a text modal.
 */
@Component({
    selector: 'core-reading-mode-settings-modal',
    templateUrl: 'reading-mode-settings.html',
    styleUrl: 'reading-mode-settings.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreReadingModeSettingsModalComponent implements OnInit {

    readonly MAX_TEXT_SIZE_ZOOM = 200;
    readonly MIN_TEXT_SIZE_ZOOM = 75;
    readonly TEXT_SIZE_ZOOM_STEP = 25;

    settings = CORE_READING_MODE_DEFAULT_SETTINGS;

    defaultZoom = true;

    themes: CoreViewerReadingModeThemesType[] = Object.values(CoreViewerReadingModeThemes);

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.settings = await CoreViewer.getReadingModeSettings();
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Close modal.
     */
    exit(): void {
        ModalController.dismiss(true);
    }

    /**
     * Change text size zoom.
     *
     * @param newTextSizeZoom New text size zoom.
     */
    changeTextSizeZoom(newTextSizeZoom: number): void {
        this.settings.zoom = CoreMath.clamp(
            newTextSizeZoom,
            this.MIN_TEXT_SIZE_ZOOM,
            this.MAX_TEXT_SIZE_ZOOM,
        );

        this.defaultZoom = this.settings.zoom === 100;
        this.onSettingChange();
    }

    /**
     * Save settings on any change.
     */
    onSettingChange(): void {
        CoreViewer.setReadingModeSettings(this.settings);
    }

}
