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

import { CoreDomUtilsProvider } from '@services/utils/dom';
import { AlertController, Translate } from '@singletons';

import { mock, mockSingleton, mockTranslate } from '@/testing/utils';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreSites } from '@services/sites';
import { OverlayEventDetail } from '@ionic/core';

describe('CoreDomUtilsProvider', () => {

    let domUtils: CoreDomUtilsProvider;

    beforeEach(() => {
        domUtils = new CoreDomUtilsProvider();
    });

    it('shows site unavailable errors', async () => {
        // Arrange.
        mockTranslate({
            'core.siteunavailablehelp': 'The site "{{site}}" is not available right now.',
        });

        const message = Translate.instant('core.siteunavailablehelp', { site: 'https://campus.example.edu' });
        const mockAlert = mock<HTMLIonAlertElement>({
            present: () => Promise.resolve(),
            onDidDismiss: async <T>() => new Promise<T>(() => {
                // Never resolve.
            }),
        });

        mockSingleton(AlertController, mock({ create: () => Promise.resolve(mockAlert) }));
        mockSingleton(CoreSites, mock({ isLoggedIn: () => true }));

        // Act.
        await domUtils.showErrorModal(new CoreSiteError({ message }));

        // Assert.
        expect(mockAlert.present).toHaveBeenCalled();
        expect(AlertController.create).toHaveBeenCalledWith({
            message,
            header: Translate.instant('core.connectionlost'),
            buttons: [Translate.instant('core.ok')],
        });
    });

    it('ignores alert inputs on cancel', async () => {
        // Arrange.
        const mockAlert = mock<HTMLIonAlertElement>({
            present: () => Promise.resolve(),
            onWillDismiss: () => Promise.resolve({
                data: {
                    values: {
                        'textarea-prompt': 'Not empty!',
                    },
                },
                role: 'cancel',
            } as OverlayEventDetail<any>), // eslint-disable-line @typescript-eslint/no-explicit-any
        });

        mockSingleton(AlertController, mock({ create: () => Promise.resolve(mockAlert) }));

        // Act.
        const result = await domUtils.showTextareaPrompt('Age', 'How old are you?', [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Save' },
        ]);

        // Assert.
        expect(result).toBeUndefined();
    });

});
