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

import { Component, input, signal, viewChild } from '@angular/core';
import { ModalController } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { ImageCropperComponent, ImageTransform } from 'ngx-image-cropper';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Modal component to edit an image.
 */
@Component({
    selector: 'core-viewer-image-edit',
    templateUrl: 'image-edit.html',
    styleUrl: 'image-edit.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        ImageCropperComponent,
    ],
})
export class CoreViewerImageEditComponent {

    readonly editTool = viewChild.required(ImageCropperComponent);
    readonly image = input.required<Blob>();
    readonly transform = signal<ImageTransform>({
        scale: 1,
        rotate: 0,
        flipH: false,
        flipV: false,
    });

    readonly canvasRotation = signal(0);

    /**
     * Load image failed, dismiss modal.
     */
    loadImageFailed(): void {
        ModalController.dismiss();
    }

    /**
     * Close modal and return edited image.
     */
    async done(): Promise<void> {
        const event = await this.editTool().crop();

        ModalController.dismiss(event?.blob || undefined);
    }

    /**
     * Discard changes and close modal.
     */
    async discard(): Promise<void> {
        try {
            await CoreAlerts.confirmLeaveWithChanges();
        } catch {
            // Canceled.
            return;
        }

        ModalController.dismiss();
    }

    /**
     * Rotate the image to the left.
     */
    rotateLeft(): void {
        setTimeout(() => { // Use timeout because rotating image is a heavy operation and will block the ui thread
            this.canvasRotation.update(rotation => rotation - 1);
            this.flipAfterRotate();
        });
    }

    /**
     * Flip image horizontally.
     */
    flipHorizontally(): void {
        this.transform.update(transform => ({
            ...transform,
            flipH: !transform.flipH,
        }));
    }

    /**
     * After rotating the image, flip the horizontal and vertical values to match the new orientation.
     */
    private flipAfterRotate(): void {
        this.transform.update(transform => ({
            ...transform,
            flipH: transform.flipV,
            flipV: transform.flipH,
            translateH: 0,
            translateV: 0,
        }));
    }

}
