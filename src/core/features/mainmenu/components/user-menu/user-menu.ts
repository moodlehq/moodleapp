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

import { CoreConstants } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreSite } from '@classes/sites/site';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreUser, CoreUserProfile, USER_PROFILE_REFRESHED } from '@features/user/services/user';
import {
    CoreUserProfileHandlerData,
    CoreUserDelegate,
    CoreUserProfileHandlerType,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { CoreModals } from '@services/modals';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { ModalController, Translate } from '@singletons';
import { Subscription } from 'rxjs';
import { CoreCourses, CoreCoursesProvider } from '@features/courses/services/courses';
import { AddonBadges } from '@addons/badges/services/badges';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreEvents } from '@singletons/events';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesCoursesSource } from '@features/grades/classes/grades-courses-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreAppLinks, AppLinkSection, AppLinkItem } from '../../services/app-links';

/**
 * Component to display a user menu.
 */
@Component({
    selector: 'core-main-menu-user-menu',
    templateUrl: 'user-menu.html',
    styleUrl: 'user-menu.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreMainMenuUserMenuComponent implements OnInit, OnDestroy {

    siteId?: string;
    siteInfo?: CoreSiteInfo;
    siteName?: string;
    siteLogo?: string;
    siteLogoLoaded = false;
    siteUrl?: string;
    displaySiteUrl = false;
    handlers: CoreUserProfileHandlerData[] = [];
    accountHandlers: CoreUserProfileHandlerData[] = [];
    handlersLoaded = false;
    user?: CoreUserProfile;
    displaySwitchAccount = true;
    displayContactSupport = false;
    displayPreferences = true;
    removeAccountOnLogout = false;
    courseCount = 0;
    badgeCount = 0;
    
    // Parent role properties
    isParentUser = false;
    mentees: CoreUserProfile[] = [];
    selectedMenteeId?: number;
    selectedMentee?: CoreUserProfile;
    showMenteeSelector = false;

    // Dynamic app links from Moodle course
    appLinkSections: AppLinkSection[] = [];
    appLinksLoaded = false;
    expandedSections = new Set<number>(); // Track expanded section IDs
    expandedFolders = new Set<string>(); // Track expanded folder names

    // App version info (auto-updated by post-commit hook)
    appVersion = CoreConstants.CONFIG.versionname;
    buildNumber = 15;
    buildTime = '2026-01-22 20:52';

    // Secret debug menu (tap build number 7 times)
    debugTapCount = 0;
    debugTapTimeout?: ReturnType<typeof setTimeout>;

    protected subscription!: Subscription;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const currentSite = CoreSites.getRequiredCurrentSite();
        this.siteId = currentSite.getId();
        this.siteInfo = currentSite.getInfo();
        this.siteName = await currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();
        this.displaySwitchAccount = !currentSite.isFeatureDisabled('NoDelegate_SwitchAccount');
        this.displayContactSupport = new CoreUserAuthenticatedSupportConfig(currentSite).canContactSupport();
        this.removeAccountOnLogout = !!CoreConstants.CONFIG.removeaccountonlogout;
        this.displaySiteUrl = currentSite.shouldDisplayInformativeLinks();

        this.loadSiteLogo(currentSite);

        if (!this.siteInfo) {
            return;
        }

        // Load the handlers.
        try {
            // Try to get user profile with site home course context first (might include more fields)
            const siteHomeId = currentSite.getSiteHomeId();
            this.user = await CoreUser.getProfile(this.siteInfo.userid, siteHomeId);
        } catch {
            try {
                // Fallback to regular profile
                this.user = await CoreUser.getProfile(this.siteInfo.userid);
            } catch {
                this.user = {
                    id: this.siteInfo.userid,
                    fullname: this.siteInfo.fullname,
                };
            }
        }

        // Load course and badge counts
        this.loadUserStats();

        // Check if user is a parent and load mentees
        this.loadParentData();

        // Load dynamic app links
        this.loadAppLinks();

        this.subscription = CoreUserDelegate.getProfileHandlersFor(this.user, CoreUserDelegateContext.USER_MENU)
            .subscribe((handlers) => {
                if (!this.user) {
                    return;
                }

                let newHandlers = handlers
                    .filter((handler) => handler.type === CoreUserProfileHandlerType.LIST_ITEM)
                    .map((handler) => handler.data);

                // Only update handlers if they have changed, to prevent a blink effect.
                if (newHandlers.length !== this.handlers.length ||
                        JSON.stringify(newHandlers) !== JSON.stringify(this.handlers)) {
                    this.handlers = newHandlers;
                }

                newHandlers = handlers
                    .filter((handler) => handler.type === CoreUserProfileHandlerType.LIST_ACCOUNT_ITEM)
                    .map((handler) => handler.data);

                // Only update handlers if they have changed, to prevent a blink effect.
                if (newHandlers.length !== this.handlers.length ||
                        JSON.stringify(newHandlers) !== JSON.stringify(this.handlers)) {
                    this.accountHandlers = newHandlers;
                }

                this.handlersLoaded = CoreUserDelegate.areHandlersLoaded(this.user.id, CoreUserDelegateContext.USER_MENU);
            });
    }

    /**
     * Load site logo from current site public config.
     *
     * @param currentSite Current site object.
     * @returns Promise resolved when done.
     */
    protected async loadSiteLogo(currentSite: CoreSite): Promise<void> {
        if (currentSite.forcesLocalLogo()) {
            this.siteLogo = currentSite.getLogoUrl();
            this.siteLogoLoaded = true;

            return;
        }

        const siteConfig = await CoreUtils.ignoreErrors(currentSite.getPublicConfig());
        this.siteLogo = currentSite.getLogoUrl(siteConfig);
        this.siteLogoLoaded = true;
    }

    /**
     * Load user statistics (course count, badge count).
     */
    protected async loadUserStats(): Promise<void> {
        try {
            // Load enrolled courses count
            const courses = await CoreCourses.getUserCourses(true);
            this.courseCount = courses.length;
        } catch {
            this.courseCount = 0;
        }

        try {
            // Load badges count
            if (this.user) {
                // Get badges for all courses (courseId = 0)
                const badges = await AddonBadges.getUserBadges(0, this.user.id);
                this.badgeCount = badges.length;
            }
        } catch {
            this.badgeCount = 0;
        }
    }

    /**
     * Opens User profile page.
     *
     * @param event Click event.
     */
    async openUserProfile(event: Event): Promise<void> {
        if (!this.siteInfo) {
            return;
        }

        await this.close(event);

        CoreNavigator.navigateToSitePath('user/about', {
            params: {
                userId: this.siteInfo.userid,
            },
        });
    }

    /**
     * Opens preferences.
     *
     * @param event Click event.
     */
    async openPreferences(event: Event): Promise<void> {
        await this.close(event);

        CoreNavigator.navigateToSitePath('preferences');
    }

    /**
     * Opens grades page.
     *
     * @param event Click event.
     */
    async openGrades(event: Event): Promise<void> {
        await this.close(event);

        CoreNavigator.navigateToSitePath('grades');
    }

    /**
     * Opens messages page.
     *
     * @param event Click event.
     */
    async openMessages(event: Event): Promise<void> {
        await this.close(event);

        CoreNavigator.navigateToSitePath('messages');
    }

    /**
     * A handler was clicked.
     *
     * @param event Click event.
     * @param handler Handler that was clicked.
     */
    async handlerClicked(event: Event, handler: CoreUserProfileHandlerData): Promise<void> {
        if (!this.user) {
            return;
        }

        await this.close(event);

        handler.action(event, this.user, CoreUserDelegateContext.USER_MENU);
    }

    /**
     * Contact site support.
     *
     * @param event Click event.
     */
    async contactSupport(event: Event): Promise<void> {
        await this.close(event);
        await CoreUserSupport.contact();
    }

    /**
     * Open Contact Us page.
     *
     * @param event Click event.
     */
    async openContactUs(event: Event): Promise<void> {
        await this.close(event);
        await CoreNavigator.navigateToSitePath('/contactus');
    }

    /**
     * Open an external URL in the system browser.
     *
     * @param event Click event.
     * @param url The URL to open.
     */
    openExternalUrl(event: Event, url: string): void {
        event.preventDefault();
        event.stopPropagation();
        // Open in external system browser
        CoreUtils.openInBrowser(url, { showBrowserWarning: false });
    }

    /**
     * Load dynamic app links from Moodle course.
     */
    protected async loadAppLinks(): Promise<void> {
        try {
            this.appLinkSections = await CoreAppLinks.getAppLinkSections();
            this.appLinksLoaded = true;
        } catch (error) {
            console.error('[User Menu] Error loading app links:', error);
            this.appLinksLoaded = true; // Still mark as loaded to hide loading state
        }
    }

    /**
     * Toggle a dynamic section.
     *
     * @param sectionId Section ID to toggle.
     */
    toggleAppSection(sectionId: number): void {
        if (this.expandedSections.has(sectionId)) {
            this.expandedSections.delete(sectionId);
        } else {
            this.expandedSections.add(sectionId);
        }
    }

    /**
     * Check if a section is expanded.
     *
     * @param sectionId Section ID to check.
     * @returns Whether the section is expanded.
     */
    isSectionExpanded(sectionId: number): boolean {
        return this.expandedSections.has(sectionId);
    }

    /**
     * Toggle a folder item.
     *
     * @param folderName Folder name to toggle.
     */
    toggleFolder(folderName: string): void {
        if (this.expandedFolders.has(folderName)) {
            this.expandedFolders.delete(folderName);
        } else {
            this.expandedFolders.add(folderName);
        }
    }

    /**
     * Check if a folder is expanded.
     *
     * @param folderName Folder name to check.
     * @returns Whether the folder is expanded.
     */
    isFolderExpanded(folderName: string): boolean {
        return this.expandedFolders.has(folderName);
    }

    /**
     * Open an app link item in the system browser.
     *
     * @param event Click event.
     * @param item The link item to open.
     */
    openAppLink(event: Event, item: AppLinkItem): void {
        event.preventDefault();
        event.stopPropagation();

        if (!item.url) {
            return;
        }

        // Open in external system browser
        CoreUtils.openInBrowser(item.url, { showBrowserWarning: false });
    }

    /**
     * Get CSS class for header icon based on icon name.
     *
     * @param iconName The icon name.
     * @returns CSS class string.
     */
    getIconClass(iconName: string): string {
        if (iconName.includes('calendar')) {
            return 'icon-calendar';
        }
        if (iconName.includes('shirt')) {
            return 'icon-shirt';
        }
        if (iconName.includes('book')) {
            return 'icon-book';
        }
        if (iconName.includes('shield')) {
            return 'icon-shield';
        }
        if (iconName.includes('folder')) {
            return 'icon-folder';
        }

        return '';
    }

    /**
     * Logout the user.
     *
     * @param event Click event
     */
    async logout(event: Event): Promise<void> {
        if (CoreNavigator.currentRouteCanBlockLeave()) {
            await CoreDomUtils.showAlert(undefined, Translate.instant('core.cannotlogoutpageblocks'));

            return;
        }

        if (this.removeAccountOnLogout) {
            // Ask confirm.
            const siteName = this.siteName ?
                await CoreFilter.formatText(this.siteName, { clean: true, singleLine: true, filter: false }, [], this.siteId) :
                '';

            try {
                await CoreDomUtils.showDeleteConfirm('core.login.confirmdeletesite', { sitename: siteName });
            } catch (error) {
                // User cancelled, stop.
                return;
            }
        }

        await this.close(event);

        await CoreSites.logout({
            forceLogout: true,
            removeAccount: this.removeAccountOnLogout,
        });
    }

    /**
     * Show account selector.
     *
     * @param event Click event
     */
    async switchAccounts(event: Event): Promise<void> {
        if (CoreNavigator.currentRouteCanBlockLeave()) {
            await CoreDomUtils.showAlert(undefined, Translate.instant('core.cannotlogoutpageblocks'));

            return;
        }

        const thisModal = await ModalController.getTop();

        event.preventDefault();
        event.stopPropagation();

        const { CoreLoginSitesModalComponent } = await import('@features/login/components/sites-modal/sites-modal');

        const closeAll = await CoreModals.openSideModal<boolean>({
            component: CoreLoginSitesModalComponent,
            cssClass: 'core-modal-lateral core-modal-lateral-sm',
        });

        if (thisModal && closeAll) {
            await ModalController.dismiss(undefined, undefined, thisModal.id);
        }
    }

    /**
     * Add account.
     *
     * @param event Click event
     */
    async addAccount(event: Event): Promise<void> {
        await this.close(event);

        await CoreLoginHelper.goToAddSite(true, true);
    }

    /**
     * Close modal.
     */
    async close(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        await ModalController.dismiss();
    }

    /**
     * Get the Sequence value from custom fields or other sources.
     * 
     * @returns The sequence value or null.
     */
    getSequenceValue(): string | null {
        // First try to get from custom fields if they exist
        if (this.user?.customfields) {
            const sequenceField = this.user.customfields.find(field => 
                field.shortname === 'ID' || 
                field.shortname === 'id' || 
                field.shortname === 'sequence' ||
                field.shortname === 'Sequence'
            );
            if (sequenceField) {
                return sequenceField.displayvalue || sequenceField.value || null;
            }
        }
        
        // Check if it might be in preferences
        if (this.user?.preferences) {
            const sequencePref = this.user.preferences.find(pref => 
                pref.name === 'profile_field_ID' || 
                pref.name === 'profile_field_sequence' ||
                pref.name === 'profile_field_Sequence'
            );
            if (sequencePref) {
                return sequencePref.value || null;
            }
        }
        
        // TODO: Remove this comment once API returns custom fields
        // For testing purposes, you can uncomment the line below and set a test value
        // return "TEST-SEQ-001";
        
        return null;
    }

    /**
     * Load parent data including mentees if user is a parent.
     */
    protected async loadParentData(): Promise<void> {
        console.log('[User Menu] Loading parent data...');
        try {
            // Check if user is a parent
            this.isParentUser = await CoreUserParent.isParentUser();
            console.log('[User Menu] Is parent user:', this.isParentUser);
            
            if (!this.isParentUser) {
                console.log('[User Menu] User is not a parent, skipping mentee loading');
                return;
            }
            
            // Load mentees
            console.log('[User Menu] Loading mentees...');
            this.mentees = await CoreUserParent.getMentees();
            console.log('[User Menu] Loaded mentees:', this.mentees);
            
            // Get selected mentee
            this.selectedMenteeId = await CoreUserParent.getSelectedMentee() || undefined;
            console.log('[User Menu] Selected mentee ID:', this.selectedMenteeId);
            
            if (this.selectedMenteeId && this.mentees.length > 0) {
                this.selectedMentee = this.mentees.find(m => m.id === this.selectedMenteeId);
                console.log('[User Menu] Selected mentee:', this.selectedMentee);
            }
        } catch (error) {
            console.error('[User Menu] Error loading parent data:', error);
            // Show more details about the error
            if (error && typeof error === 'object') {
                console.error('[User Menu] Error details:', {
                    message: error.message || 'Unknown error',
                    name: error.name || 'Unknown',
                    stack: error.stack || 'No stack trace'
                });
            }
        }
    }

    /**
     * Toggle mentee selector dropdown.
     */
    toggleMenteeSelector(): void {
        this.showMenteeSelector = !this.showMenteeSelector;
    }

    /**
     * Select a mentee.
     * 
     * @param mentee The mentee to select.
     */
    async selectMentee(mentee: CoreUserProfile): Promise<void> {
        console.log('[User Menu] ========== SELECTING MENTEE ==========');
        console.log('[User Menu] Mentee ID:', mentee.id);
        console.log('[User Menu] Mentee Name:', mentee.fullname);
        console.log('[User Menu] Previous Mentee ID:', this.selectedMenteeId);

        this.selectedMentee = mentee;
        this.selectedMenteeId = mentee.id;
        this.showMenteeSelector = false;

        // Save selection and switch token
        console.log('[User Menu] Calling setSelectedMentee...');
        await CoreUserParent.setSelectedMentee(mentee.id);
        console.log('[User Menu] setSelectedMentee completed');

        // Verify the switch
        const site = await CoreSites.getSite(this.siteId);
        console.log('[User Menu] After switch - Site User ID:', site.getUserId());
        console.log('[User Menu] After switch - Site Token (first 20):', site.getToken()?.substring(0, 20) + '...');

        // Comprehensive cache invalidation

        // Invalidate all courses-related caches
        await CoreCourses.invalidateAllUserCourses(this.siteId);

        // Invalidate grades-related caches (CRITICAL for switching between children)
        await CoreGrades.invalidateCoursesGradesData(this.siteId);

        // Reset the grades courses source to force reload when visiting grades page
        // This ensures stale course items from the previous child are cleared
        const gradesSource = CoreRoutedItemsManagerSourcesTracker.getSource(CoreGradesCoursesSource, []);
        if (gradesSource) {
            gradesSource.setDirty(true);
            console.log('[User Menu] Marked grades source as dirty');
        }

        // Invalidate dashboard blocks
        const { CoreCoursesDashboard, CoreCoursesDashboardProvider } = await import('@features/courses/services/dashboard');
        await CoreCoursesDashboard.invalidateDashboardBlocks(CoreCoursesDashboardProvider.MY_PAGE_COURSES);

        // Force reload after view change
        console.log('[User Menu] View changed to mentee, forcing reload');
        
        // Trigger a general refresh event
        CoreEvents.trigger(USER_PROFILE_REFRESHED, { userId: mentee.id }, this.siteId);
        
        // Close the modal and force navigation to home
        await this.close(new Event('click'));
        
        // Force reload by navigating to home
        await CoreNavigator.navigate('/main/home', { 
            reset: true,
            animated: false 
        });
    }

    /**
     * Clear mentee selection (view own data).
     */
    async clearMenteeSelection(): Promise<void> {
        // Store the mentee ID before clearing
        const previousMenteeId = this.selectedMenteeId;
        
        this.selectedMentee = undefined;
        this.selectedMenteeId = undefined;
        this.showMenteeSelector = false;
        
        await CoreUserParent.clearSelectedMentee();
        
        // Comprehensive cache invalidation
        const site = await CoreSites.getSite(this.siteId);

        // Invalidate all courses-related caches
        await CoreCourses.invalidateAllUserCourses(this.siteId);

        // Invalidate grades-related caches (CRITICAL for switching back to parent)
        await CoreGrades.invalidateCoursesGradesData(this.siteId);

        // Reset the grades courses source to force reload when visiting grades page
        const gradesSource = CoreRoutedItemsManagerSourcesTracker.getSource(CoreGradesCoursesSource, []);
        if (gradesSource) {
            gradesSource.setDirty(true);
            console.log('[User Menu] Marked grades source as dirty');
        }

        // Invalidate dashboard blocks
        const { CoreCoursesDashboard, CoreCoursesDashboardProvider } = await import('@features/courses/services/dashboard');
        await CoreCoursesDashboard.invalidateDashboardBlocks(CoreCoursesDashboardProvider.MY_PAGE_COURSES);

        // Force reload the home page after cache invalidation
        console.log('[User Menu] View changed back to self, forcing reload');
        
        // Trigger a general refresh event
        if (this.siteInfo) {
            CoreEvents.trigger(USER_PROFILE_REFRESHED, { userId: this.siteInfo.userid }, this.siteId);
        }
        
        // Close the modal and force navigation to home
        await this.close(new Event('click'));
        
        // Force reload by navigating to home
        await CoreNavigator.navigate('/main/home', { 
            reset: true,
            animated: false 
        });
    }

    /**
     * Get the first word of the mentee's first name for display.
     *
     * @returns The first word of the first name.
     */
    getMenteeFirstWord(): string {
        if (!this.selectedMentee) {
            return '';
        }

        // Try to get firstname, otherwise fallback to fullname
        const name = this.selectedMentee.firstname || this.selectedMentee.fullname || '';

        // Extract the first word (split by space and take first part)
        return name.trim().split(/\s+/)[0] || '';
    }

    /**
     * Handle tap on build number for secret debug menu.
     */
    async onBuildNumberTap(): Promise<void> {
        // Clear previous timeout
        if (this.debugTapTimeout) {
            clearTimeout(this.debugTapTimeout);
        }

        this.debugTapCount++;

        // Open debug page after 7 taps (no messages)
        if (this.debugTapCount >= 7) {
            this.debugTapCount = 0;
            await this.close(new Event('click'));
            CoreNavigator.navigateToSitePath('/settings/debug');
        }

        // Reset tap count after 3 seconds of no taps
        this.debugTapTimeout = setTimeout(() => {
            this.debugTapCount = 0;
        }, 3000);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        if (this.debugTapTimeout) {
            clearTimeout(this.debugTapTimeout);
        }
    }

}
