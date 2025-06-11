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

import { Component, ContentChild, TemplateRef, input, output } from '@angular/core';

import { CoreSiteBasicInfo } from '@services/sites';
import { CoreAccountsList } from '@features/login/services/login-helper';
import { CoreSitesFactory } from '@services/sites-factory';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreUserAvatarComponent } from '@components/user-avatar/user-avatar';
import { CoreLinkDirective } from '@directives/link';

/**
 * Component to display a list of sites (accounts).
 *
 * By default this component will display the avatar and user fullname for each site, but it allows adding more information
 * in the item and in the label for each site, using #siteItem and #siteLabel ng-templates. These templates will receive the
 * site being rendered and whether it's the current site or not. Example:
 *
 * <core-sites-list [accountsList]="accountsList">
 *     <ng-template #siteLabel let-site="site" let-isCurrentSite="isCurrentSite">
 *         <!-- Content to be placed in the label, after the user full name.
 *     </ng-template>
 *
 *    <ng-template #siteItem let-site="site" let-isCurrentSite="isCurrentSite">
 *         <!-- Content to be placed in the item.
 *     </ng-template>
 * </core-sites-list>
 */
@Component({
    selector: 'core-sites-list',
    templateUrl: 'sites-list.html',
    styleUrl: 'sites-list.scss',
    imports: [
        CoreBaseModule,
        CoreFormatTextDirective,
        CoreLinkDirective,
        CoreUserAvatarComponent,
    ],
})
export class CoreSitesListComponent<T extends CoreSiteBasicInfo> {

    accountsList = input.required<CoreAccountsList<T>>();
    sitesClickable = input(false, { transform: toBoolean }); // Whether the sites are clickable.
    currentSiteClickable = input<boolean, unknown>(undefined, { transform: toBoolean }); // If set, set a different clickable value
                                                                                         // for current site.
    onSiteClicked = output<T>();

    @ContentChild('siteItem') siteItemTemplate?: TemplateRef<{site: T; isCurrentSite: boolean}>;
    @ContentChild('siteLabel') siteLabelTemplate?: TemplateRef<{site: T; isCurrentSite: boolean}>;

    /**
     * Check whether a site is clickable.
     *
     * @param isCurrentSite Whether the site is current site.
     * @returns Whether it's clickable.
     */
    isSiteClickable(isCurrentSite: boolean): boolean {
        return isCurrentSite ? this.currentSiteClickable() ?? this.sitesClickable() : this.sitesClickable();
    }

    /**
     * A site was clicked.
     *
     * @param ev Event.
     * @param site Site clicked.
     * @param isCurrentSite Whether the site is current site.
     */
    siteClicked(ev: Event, site: T, isCurrentSite: boolean): void {
        if (!this.isSiteClickable(isCurrentSite)) {
            return;
        }

        ev.preventDefault();
        ev.stopPropagation();

        this.onSiteClicked.emit(site);
    }

    /**
     * Check whether site URL should be displayed.
     *
     * @param site Site to check.
     * @returns Whether to display URL.
     */
    displaySiteUrl(site: CoreSiteBasicInfo): boolean {
        return CoreSitesFactory.makeSite(site.id, site.siteUrl, '', { info: site.info }).shouldDisplayInformativeLinks();
    }

}
