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

import { CoreText } from '@singletons/text';
import { AddonFilterMediaPluginVideoJS } from '@addons/filter/mediaplugin/services/videojs';
import { Injectable } from '@angular/core';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { makeSingleton } from '@singletons';
import { CoreMedia } from '@singletons/media';
import { CoreUrl } from '@singletons/url';

/**
 * Handler to support the Multimedia filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMediaPluginHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMediaPluginHandler';
    filterName = 'mediaplugin';

    /**
     * @inheritdoc
     */
    filter(text: string): string | Promise<string> {
        return CoreText.processHTML(text, (element) => {
            const videos = Array.from(element.querySelectorAll('video'));

            videos.forEach((video) => {
                AddonFilterMediaPluginVideoJS.treatYoutubeVideos(video);

                // Also handle videos with broken YouTube URLs (mangled by autolink filter)
                this.treatBrokenYoutubeVideos(video);
            });
        });
    }

    /**
     * Handle video elements where YouTube URLs have been broken by Moodle's autolink filter.
     * The autolink filter converts "www" into a link, breaking the URL structure.
     *
     * @param video Video element to check.
     */
    private treatBrokenYoutubeVideos(video: HTMLVideoElement): void {
        // Check if video still exists (might have been replaced by treatYoutubeVideos)
        if (!video.parentNode) {
            return;
        }

        // Get the text content and check for broken YouTube URLs
        // Pattern: https://<a ...>www</a>.youtube.com/watch?v=VIDEO_ID
        const innerHTML = video.innerHTML;
        if (!innerHTML.includes('youtube.com') && !innerHTML.includes('youtu.be')) {
            return;
        }

        // Extract text content, stripping HTML tags to get the URL
        const textContent = video.textContent?.trim() || '';

        // Try to extract YouTube video ID from the text
        const match = textContent.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (!match) {
            return;
        }

        const videoId = match[1];
        console.log('[YouTube] Found broken YouTube URL, video ID:', videoId);

        // Use getYoutubeEmbedUrl which handles iOS proxy vs direct embed
        const embedUrl = CoreUrl.getYoutubeEmbedUrl(`https://www.youtube.com/watch?v=${videoId}`);
        if (!embedUrl) {
            console.warn('[YouTube] Failed to get embed URL for video:', videoId);
            return;
        }

        console.log('[YouTube] Creating iframe with src:', embedUrl);

        // Create iframe to replace the broken video
        const iframe = document.createElement('iframe');
        iframe.id = video.id;
        iframe.src = embedUrl;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '1');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('credentialless', '');
        iframe.width = '100%';
        iframe.height = '300';
        iframe.className = video.className;

        // Add load/error listeners for debugging
        iframe.onload = () => console.log('[YouTube] Iframe loaded successfully');
        iframe.onerror = (e) => console.error('[YouTube] Iframe load error:', e);

        // Replace video tag with iframe
        video.parentNode.replaceChild(iframe, video);
        console.log('[YouTube] Replaced broken video element with iframe');
    }

    /**
     * @inheritdoc
     */
    handleHtml(container: HTMLElement): void {
        const mediaElements = Array.from(container.querySelectorAll<HTMLVideoElement | HTMLAudioElement>('video, audio'));

        mediaElements.forEach((mediaElement) => {
            if (CoreMedia.mediaUsesJavascriptPlayer(mediaElement)) {
                AddonFilterMediaPluginVideoJS.createPlayer(mediaElement);

                return;
            }

            // Remove the VideoJS classes and data if present.
            mediaElement.classList.remove('video-js');
            mediaElement.removeAttribute('data-setup');
            mediaElement.removeAttribute('data-setup-lazy');
        });
    }

}

export const AddonFilterMediaPluginHandler = makeSingleton(AddonFilterMediaPluginHandlerService);
