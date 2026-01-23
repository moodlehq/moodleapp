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

import { Component, OnDestroy, OnInit } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    CoreUser,
    CoreUserProfile,
} from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreSite } from '@classes/sites/site';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreMimetype } from '@singletons/mimetype';
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreLoadings } from '@services/loadings';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreGrades } from '@features/grades/services/grades';

/**
 * Page that displays info about a user.
 */
@Component({
    selector: 'page-core-user-about',
    templateUrl: 'about.html',
    styleUrl: 'about.scss',
    imports: [
        CoreSharedModule,
        CoreUserProfileFieldComponent,
    ],
})
export default class CoreUserAboutPage implements OnInit, OnDestroy {

    courseId!: number;
    userLoaded = false;
    hasContact = false;
    hasDetails = false;
    user?: CoreUserProfile;
    title?: string;
    canChangeProfilePicture = false;
    interests?: string[];
    displayTimezone = false;
    canShowDepartment = false;
    
    // Role-based properties
    isParentUser = false;
    isStudentUser = false;
    isMentorUser = false;
    userRole = 'student'; // default
    
    // Parent-specific data
    mentees: any[] = [];
    selectedMenteeId?: number;
    
    // Student-specific data
    enrolledCourses: any[] = [];
    recentGrades: any[] = [];
    upcomingAssignments: any[] = [];
    overallGrade = '-';
    attendanceRate = '-';
    
    // Academic info
    gradeLevel?: string;
    academicYear?: string;
    homeroom?: string;
    sequenceId?: string;

    protected userId!: number;
    protected site!: CoreSite;
    protected obsProfileRefreshed?: CoreEventObserver;

    constructor() {
        try {
            this.site = CoreSites.getRequiredCurrentSite();
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.obsProfileRefreshed = CoreEvents.on(CORE_USER_PROFILE_REFRESHED, (data) => {
            if (!this.user || !data.user) {
                return;
            }

            this.user.email = data.user.email;
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.userId = CoreNavigator.getRouteNumberParam('userId') || 0;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || 0;
        this.canShowDepartment = this.userId != this.site.getUserId();

        // Allow to change the profile image only in the app profile page.
        this.canChangeProfilePicture =
            !this.courseId &&
            this.userId == this.site.getUserId() &&
            this.site.canUploadFiles() &&
            !CoreUser.isUpdatePictureDisabledInSite(this.site);

        // Check user roles
        await this.checkUserRoles();

        this.fetchUser().finally(() => {
            this.userLoaded = true;
        });
        
        // Load role-specific data
        if (this.userRole === 'parent') {
            await this.loadParentData();
        }
        if (this.userRole === 'student') {
            await this.loadStudentData();
        }
    }

    /**
     * Fetches the user data.
     *
     * @returns Promise resolved when done.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.getProfile(this.userId, this.courseId);

            this.interests = user.interests ?
                user.interests.split(',').map(interest => interest.trim()) :
                undefined;

            this.hasContact = !!(user.email || user.phone1 || user.phone2 || user.city || user.country || user.address);
            this.hasDetails = !!(user.interests || (user.customfields && user.customfields.length > 0));

            this.user = user;
            this.title = user.fullname;

            this.fillTimezone();

            await this.checkUserImageUpdated();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.user.errorloaduser') });
        }
    }

    /**
     * Check if current user image has changed.
     *
     * @returns Promise resolved when done.
     */
    protected async checkUserImageUpdated(): Promise<void> {
        if (!this.site || !this.site.getInfo() || !this.user) {
            return;
        }

        if (this.userId != this.site.getUserId() || !this.isUserAvatarDirty()) {
            // Not current user or hasn't changed.
            return;
        }

        // The current user image received is different than the one stored in site info. Assume the image was updated.
        // Update the site info to get the right avatar in there.
        try {
            await CoreSites.updateSiteInfo(this.site.getId());
        } catch {
            // Cannot update site info. Assume the profile image is the right one.
            CoreEvents.trigger(CORE_USER_PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: this.user.profileimageurl,
            }, this.site.getId());
        }

        if (this.isUserAvatarDirty()) {
            // The image is still different, this means that the good one is the one in site info.
            await this.refreshUser();
        } else {
            // Now they're the same, send event to use the right avatar in the rest of the app.
            CoreEvents.trigger(CORE_USER_PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: this.user.profileimageurl,
            }, this.site.getId());
        }
    }

    /**
     * Opens dialog to change profile picture.
     */
    async changeProfilePicture(): Promise<void> {
        const maxSize = -1;
        const title = Translate.instant('core.user.newpicture');
        const mimetypes = CoreMimetype.getGroupMimeInfo('image', 'mimetypes');
        let modal: CoreIonLoadingElement | undefined;

        try {
            let fileEntry = await CoreFileUploaderHelper.selectFile(maxSize, false, title, mimetypes);
            const fileObject = await CoreFile.getFileObjectFromFileEntry(fileEntry);
            const image = await CoreFileUtils.filetoBlob(fileObject);

            const { CoreViewerImageEditComponent } = await import('@features/viewer/components/image-edit/image-edit');

            const editedImageBlob = await CoreModals.openModal<Blob>({
                component: CoreViewerImageEditComponent,
                cssClass: 'core-modal-fullscreen',
                componentProps: {
                    image,
                },
            });

            if (editedImageBlob) {
                // Override the file entry with the edited image.
                fileEntry = await CoreFile.writeFile(fileEntry.fullPath, editedImageBlob);
            } else {
                return;
            }

            const result =
                await CoreFileUploaderHelper.uploadFileEntry(fileEntry, true, maxSize, true, false);

            modal = await CoreLoadings.show('core.sending', true);

            const profileImageURL = await CoreUser.changeProfilePicture(result.itemid, this.userId, this.site.getId());

            CoreEvents.trigger(CORE_USER_PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: profileImageURL,
            }, this.site.getId());

            CoreSites.updateSiteInfo(this.site.getId());

            this.refreshUser();
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Refresh the user data.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    async refreshUser(event?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreUser.invalidateUserCache(this.userId));

        await this.fetchUser();

        event?.complete();

        if (this.user) {
            CoreEvents.trigger(CORE_USER_PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user,
            }, this.site.getId());
        }
    }

    /**
     * Check whether the user avatar is not up to date with site info.
     *
     * @returns Whether the user avatar differs from site info cache.
     */
    protected isUserAvatarDirty(): boolean {
        if (!this.user || !this.site) {
            return false;
        }

        const courseAvatarUrl = this.normalizeAvatarUrl(this.user.profileimageurl);
        const siteAvatarUrl = this.normalizeAvatarUrl(this.site.getInfo()?.userpictureurl);

        return courseAvatarUrl !== siteAvatarUrl;
    }

    /**
     * Normalize an avatar url regardless of theme.
     *
     * Given that the default image is the only one that can be changed per theme, any other url will stay the same. Note that
     * the values returned by this function may not be valid urls, given that they are intended for string comparison.
     *
     * @param avatarUrl Avatar url.
     * @returns Normalized avatar string (may not be a valid url).
     */
    protected normalizeAvatarUrl(avatarUrl?: string): string {
        if (!avatarUrl) {
            return 'undefined';
        }

        if (CoreUrl.isThemeImageUrl(avatarUrl, this.site?.siteUrl)) {
            return 'default';
        }

        return avatarUrl;
    }

    /**
     * Fill user timezone depending on the server and fix the legacy timezones.
     */
    protected fillTimezone(): void {
        if (!this.user) {
            return;
        }

        const serverTimezone = CoreSites.getRequiredCurrentSite().getStoredConfig('timezone');
        this.displayTimezone = !!serverTimezone;

        if (!this.displayTimezone) {
            return;
        }

        if (this.user.timezone === CORE_USER_PROFILE_SERVER_TIMEZONE) {
            this.user.timezone = serverTimezone;
        }

        if (this.user.timezone) {
            this.user.timezone = CoreTime.translateLegacyTimezone(this.user.timezone);
        }
    }

    /**
     * Open a user interest.
     *
     * @param interest Interest name.
     */
    openInterest(interest: string): void {
        CoreNavigator.navigateToSitePath('/tag/index', { params: {
            tagName: interest,
        } });
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
     * Check user roles and permissions.
     */
    protected async checkUserRoles(): Promise<void> {
        try {
            // We need to check the role of the user whose profile we're viewing
            // First, check if we're viewing our own profile
            const viewingOwnProfile = this.userId === this.site.getUserId();
            
            if (viewingOwnProfile) {
                // Check if current user is a parent
                this.isParentUser = await CoreUserParent.isParentUser();
                
                if (this.isParentUser) {
                    this.userRole = 'parent';
                } else {
                    this.userRole = 'student';
                    this.isStudentUser = true;
                }
            } else {
                // Viewing another user's profile - need to check their role
                // Try to determine if the viewed user is a parent by checking if they have mentees
                try {
                    // Temporarily set the context to check for the viewed user
                    const site = this.site;
                    
                    // Check if the viewed user is a parent by calling the API with their ID
                    const response = await site.read<{isparent: boolean; roles?: any[]; menteecount?: number}>('local_aspireparent_get_parent_info', {
                        userid: this.userId
                    });
                    
                    // If the call succeeds and returns parent info, they're a parent
                    if (response && response.isparent) {
                        this.userRole = 'parent';
                        // Don't set isParentUser to true as that's for the current logged-in user
                    } else {
                        this.userRole = 'student';
                        this.isStudentUser = true;
                    }
                } catch (error) {
                    // If the API call fails, try another approach or default to student
                    console.log('Could not determine if user is parent, defaulting to student role');
                    this.userRole = 'student';
                    this.isStudentUser = true;
                }
            }
        } catch (error) {
            console.error('Error checking user roles:', error);
            // Default to student if check fails
            this.userRole = 'student';
            this.isStudentUser = true;
        }
    }
    
    /**
     * Load parent-specific data.
     */
    protected async loadParentData(): Promise<void> {
        try {
            // Only load mentees if viewing own profile (current logged-in parent)
            if (this.userId === this.site.getUserId()) {
                // Get list of mentees for current user
                this.mentees = await CoreUserParent.getMentees();
                
                // Get selected mentee if any
                const selectedId = await CoreUserParent.getSelectedMentee();
                this.selectedMenteeId = selectedId !== null ? selectedId : undefined;
            } else {
                // Viewing another parent's profile
                // We could potentially load their mentees if the API supports it
                // For now, just leave mentees empty
                this.mentees = [];
                this.selectedMenteeId = undefined;
            }
        } catch (error) {
            console.error('Error loading parent data:', error);
        }
    }
    
    /**
     * Load student-specific data.
     */
    protected async loadStudentData(): Promise<void> {
        try {
            // For now, only load courses if viewing own profile
            // In the future, we could use the parent service to get mentee courses
            if (this.userId === this.site.getUserId()) {
                // Load enrolled courses for current user
                const courses = await CoreCourses.getUserCourses(true);
                this.enrolledCourses = courses.slice(0, 5); // Show top 5 courses
                
                // Try to load recent grades if available
                if (courses.length > 0) {
                    try {
                        // Get grades for the first course as a sample
                        const gradesTable = await CoreGrades.getCourseGradesTable(courses[0].id, this.userId);
                        if (gradesTable && gradesTable.tabledata) {
                            // Extract a few recent grades
                            this.recentGrades = gradesTable.tabledata
                                .filter((item: any) => item.grade && item.grade.content && item.grade.content !== '-')
                                .slice(0, 3)
                                .map((item: any) => ({
                                    name: item.itemname?.content || 'Assignment',
                                    grade: item.grade?.content || '-',
                                    percentage: item.percentage?.content || '-'
                                }));
                        }
                    } catch (gradeError) {
                        console.error('Error loading grades:', gradeError);
                    }
                }
            } else if (this.isParentUser) {
                // Parent viewing mentee's profile - try to get courses through parent service
                try {
                    // This would require implementing a method to get mentee courses
                    // For now, we'll skip loading courses for other users
                    console.log('Viewing other user profile - course loading not implemented yet');
                } catch (error) {
                    console.error('Error loading mentee courses:', error);
                }
            }
            
            // Extract academic info from custom fields
            this.extractAcademicInfo();
        } catch (error) {
            console.error('Error loading student data:', error);
        }
    }
    
    /**
     * Extract academic information from user profile.
     */
    protected extractAcademicInfo(): void {
        if (!this.user) return;
        
        // Extract grade level from custom fields or department
        if (this.user.department) {
            // Try to extract grade from department (e.g., "Grade 10", "Year 11")
            const gradeMatch = this.user.department.match(/(Grade|Year|Form)\s*(\d+|\w+)/i);
            if (gradeMatch) {
                this.gradeLevel = gradeMatch[0];
            }
        }
        
        // Get sequence ID
        this.sequenceId = this.getSequenceValue() || undefined;
        
        // Set academic year (current year)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        // Academic year typically starts in September
        if (currentMonth >= 8) {
            this.academicYear = `${currentYear}/${currentYear + 1}`;
        } else {
            this.academicYear = `${currentYear - 1}/${currentYear}`;
        }
        
        // Extract homeroom from institution or custom fields
        if (this.user.institution) {
            this.homeroom = this.user.institution;
        }
    }
    
    /**
     * Navigate to view a mentee's profile.
     * 
     * @param menteeId The mentee user ID.
     */
    async viewMenteeProfile(menteeId: number): Promise<void> {
        await CoreNavigator.navigate('/main/messages/user/about', {
            params: { userId: menteeId }
        });
    }
    
    /**
     * Navigate to course page.
     * 
     * @param courseId The course ID.
     */
    async viewCourse(courseId: number): Promise<void> {
        await CoreNavigator.navigateToSitePath(`/course/${courseId}`);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.obsProfileRefreshed?.off();
    }

}
