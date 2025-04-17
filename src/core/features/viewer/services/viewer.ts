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

import { ContextLevel } from '@/core/constants';
import { Injectable } from '@angular/core';
import { ModalOptions } from '@ionic/angular';
import { CoreConfig } from '@services/config';
import { CoreModals } from '@services/overlays/modals';
import { CoreNavigator } from '@services/navigator';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import {
    CORE_READING_MODE_SETTINGS,
    CoreViewerReadingModeThemes,
    CoreViewerReadingModeThemesType,
    CORE_READING_MODE_DEFAULT_SETTINGS,
} from '../constants';

/**
 * Viewer services.
 */
@Injectable({ providedIn: 'root' })
export class CoreViewerService {

    /**
     * View an image in a modal.
     *
     * @param image URL of the image.
     * @param title Title of the page or modal.
     * @param component Component to link the image to if needed.
     * @param componentId An ID to use in conjunction with the component.
     */
    async viewImage(
        image: string,
        title?: string | null,
        component?: string,
        componentId?: string | number,
    ): Promise<void> {
        if (!image) {
            return;
        }
        const { CoreViewerImageComponent } = await import('@features/viewer/components/image/image');

        await CoreModals.openModal({
            component: CoreViewerImageComponent,
            componentProps: {
                title,
                image,
                component,
                componentId,
            },
            cssClass: 'core-modal-transparent',
        });

    }

    /**
     * Shows a text on a new page.
     *
     * @param title Title of the new state.
     * @param content Content of the text to be expanded.
     * @param options Options.
     */
    async viewText(title: string, content: string, options?: CoreViewerTextOptions): Promise<void> {
        if (!content.length) {
            return;
        }

        options = options || {};
        const { CoreViewerTextComponent } = await import('@features/viewer/components/text/text');

        const modalOptions: ModalOptions = Object.assign(options.modalOptions || {}, {
            component: CoreViewerTextComponent,
        });
        delete options.modalOptions;
        modalOptions.componentProps = {
            title,
            content,
            ...options,
        };

        await CoreModals.openModal(modalOptions);
    }

    /**
     * Navigate to iframe viewer.
     *
     * @param title Page title.
     * @param url Iframe URL.
     * @param autoLogin Whether to try to use auto-login.
     */
    async openIframeViewer(title: string, url: string, autoLogin?: boolean): Promise<void> {
        await CoreNavigator.navigateToSitePath('viewer/iframe', { params: { title, url, autoLogin } });
    }

    /**
     * Get reading mode settings.
     *
     * @returns Reading mode settings.
     */
    async getReadingModeSettings(): Promise<CoreViewerReadingModeSettings> {
        return CoreConfig.getJSON<CoreViewerReadingModeSettings>(CORE_READING_MODE_SETTINGS, CORE_READING_MODE_DEFAULT_SETTINGS);
    }

    /**
     * Load and apply reading mode settings.
     */
    async loadReadingModeSettings(): Promise<void> {
        const settings = await this.getReadingModeSettings();

        this.applyReadingModeSettings(settings);
    }

    /**
     * Apply the reading mode settings to the DOM.
     *
     * @param settings Settings to apply.
     */
    protected applyReadingModeSettings(settings: CoreViewerReadingModeSettings): void {
        document.body.style.setProperty('--reading-mode-zoom', settings.zoom + '%');
        Object.values(CoreViewerReadingModeThemes).forEach((theme) => {
            document.body.classList.remove(`core-reading-mode-theme-${theme}`);
        });
        document.body.classList.add(`core-reading-mode-theme-${settings.theme}`);
        document.body.classList.toggle('core-reading-mode-multimedia-hidden', !settings.showMultimedia);
    }

    /**
     * Save reading mode settings.
     *
     * @param settings Settings to save.
     */
    async setReadingModeSettings(settings: CoreViewerReadingModeSettings): Promise<void> {
        await CoreConfig.setJSON(CORE_READING_MODE_SETTINGS, settings);

        this.applyReadingModeSettings(settings);
    }

}
export const CoreViewer = makeSingleton(CoreViewerService);

/**
 * Options for viewText.
 */
export type CoreViewerTextOptions = {
    component?: string; // Component to link the embedded files to.
    componentId?: string | number; // An ID to use in conjunction with the component.
    files?: CoreWSFile[]; // List of files to display along with the text.
    filter?: boolean; // Whether the text should be filtered.
    contextLevel?: ContextLevel; // The context level.
    instanceId?: number; // The instance ID related to the context.
    courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    displayCopyButton?: boolean; // Whether to display a button to copy the text.
    modalOptions?: Partial<ModalOptions>; // Modal options.
};

export type CoreViewerReadingModeSettings = {
    zoom: number; // Zoom level.
    showMultimedia: boolean; // Show images and multimedia.
    theme: CoreViewerReadingModeThemesType; // Theme to use.
};
