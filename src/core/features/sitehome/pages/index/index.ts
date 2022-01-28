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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { Params } from '@angular/router';

import { CoreSite, CoreSiteConfig } from '@classes/site';
import { CoreCourse, CoreCourseModuleBasicInfo, CoreCourseWSSection } from '@features/course/services/course';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreCourses, CoreCoursesProvider } from '@features//courses/services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseHelper, CoreCourseModule } from '@features/course/services/course-helper';
import { CoreBlockCourseBlocksComponent } from '@features/block/components/course-blocks/course-blocks';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays site home index.
 */
@Component({
    selector: 'page-core-sitehome-index',
    templateUrl: 'index.html',
})
export class CoreSiteHomeIndexPage implements OnInit, OnDestroy {

    @ViewChild(CoreBlockCourseBlocksComponent) courseBlocksComponent?: CoreBlockCourseBlocksComponent;

    dataLoaded = false;
    section?: CoreCourseWSSection & {
        hasContent?: boolean;
    };

    hasContent = false;
    items: string[] = [];
    siteHomeId = 1;
    currentSite?: CoreSite;
    searchEnabled = false;
    downloadEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    downloadEnabledIcon = 'far-square';
    newsForumModule?: NewsForum;

    protected updateSiteObserver?: CoreEventObserver;

    /**
     * Page being initialized.
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

            this.switchDownload(this.downloadEnabled && this.downloadCourseEnabled && this.downloadCoursesEnabled);
        }, CoreSites.getCurrentSiteId());

        this.currentSite = CoreSites.getCurrentSite()!;
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();

        const module = CoreNavigator.getRouteParam<CoreCourseModule>('module');
        if (module) {
            const modParams = CoreNavigator.getRouteParam<Params>('modParams');
            CoreCourseHelper.openModule(module, this.siteHomeId, undefined, modParams);
        }

        this.loadContent().finally(() => {
            this.dataLoaded = true;
            
            setTimeout(function(){
	            
	        
            document.querySelector("#SectionChechCourseCode").style.display = "block";
        
			document.querySelector(".send_code").addEventListener("click", (e) => {
				var code = document.getElementById('course_code').value;//$("#course_code").val();
				
				var url = "https://art001exe.exentriq.com/93489/isValidCode?code=" + code;
				
				fetch(url)
					  .then(response => response.json())
					  .then(data => {
					    // Handle data
					    
					    console.log(data);
					    
					    if(!data.valid){
						
							document.querySelector(".invalid-course").style.display = "block";
							return;
						}else{
							document.querySelector("#step1").style.display = "none";
							document.querySelector("#step2").style.display = "block";
							
							window.courseId = data.id;
							window.couponId = data.coupon;
						}
					    
					  }).catch(error => {
					    // Handle error
					  });
					
					
					
					//location.href = "/user/begin.php?course=" + data.id + "&cid=" + data.coupon;
					
				//})
				e.preventDefault();
				e.stopPropagation();
				return false;
			})
			
			document.querySelector(".verify_code_nr").addEventListener("click", (e) => {
				
				document.querySelector(".invalid-teacher").style.display = "none";
				
				var code = document.querySelector('.teacher_code').value;
				
				var url = "https://art001exe.exentriq.com/93489/isValidTeacher?code=" + code + "&course=" + window.courseId;
				
				fetch(url)
					  .then(response => response.json())
					  .then(data => {
					    // Handle data
					    
					    console.log(data);
					    
					    if(!data.valid){
						
							document.querySelector(".invalid-teacher").style.display = "block";
							return;
						}else{
							var teacherId = data.id;
							var teacherName = encodeURIComponent(data.name);
							var courseCode = document.querySelector("#course_code").value;
							var studentId = document.querySelector(".verify_code_nr").attributes["data-id"].value
							var couponId = window.couponId;
							
							var url2 = "https://art001exe.exentriq.com/93489/enrol?teacherId=" + teacherId + "&teacherName=" + teacherName + "&courseId=" + window.courseId + "&studentId=" + studentId + "&couponId=" + couponId + "&courseCode=" + courseCode;
							
							fetch(url2)
								.then(response => response.json())
								.then(data2 => {
									
									console.log(data2);
						  
									if(data2.status == "success"){
										
										location.href = "/main/home/course/" + data2.courseId + "/contents?course=param-2";
												
									}else{
										document.querySelector(".invalid-teacher").style.display = "block";
									}
									
									
								}).catch(error => {
							    // Handle error
							  });
							
						}
					    
					  }).catch(error => {
					    // Handle error
					  });
					
					
					
					//location.href = "/user/begin.php?course=" + data.id + "&cid=" + data.coupon;
					
				//})
				e.preventDefault();
				e.stopPropagation();
				return false;
			})
			
			
			},2000)
        });
        
        
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return Promise resolved when done.
     */
    protected async loadContent(): Promise<void> {
        this.hasContent = false;

        const config = this.currentSite!.getStoredConfig() || { numsections: 1, frontpageloggedin: undefined };

        this.items = await CoreSiteHome.getFrontPageItems(config.frontpageloggedin);
        this.hasContent = this.items.length > 0;

        if (this.items.some((item) => item == 'NEWS_ITEMS')) {
            // Get the news forum.
            try {
                const forum = await CoreSiteHome.getNewsForum();
                this.newsForumModule = await CoreCourse.getModuleBasicInfo(forum.cmid);
                this.newsForumModule.handlerData = CoreCourseModuleDelegate.getModuleDataFor(
                    this.newsForumModule.modname,
                    this.newsForumModule,
                    this.siteHomeId,
                    this.newsForumModule.section,
                    true,
                );
            } catch {
                // Ignore errors.
            }
        }

        try {
            const sections = await CoreCourse.getSections(this.siteHomeId!, false, true);

            // Check "Include a topic section" setting from numsections.
            this.section = config.numsections ? sections.find((section) => section.section == 1) : undefined;
            if (this.section) {
                const result = CoreCourseHelper.addHandlerDataForModules(
                    [this.section],
                    this.siteHomeId,
                    undefined,
                    undefined,
                    true,
                );
                this.hasContent = result.hasContent || this.hasContent;
            }

            // Add log in Moodle.
            CoreCourse.logView(
                this.siteHomeId!,
                undefined,
                undefined,
                this.currentSite!.getInfo()?.sitename,
            ).catch(() => {
                // Ignore errors.
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher?: IonRefresher): void {
        const promises: Promise<unknown>[] = [];

        promises.push(CoreCourse.invalidateSections(this.siteHomeId!));
        promises.push(this.currentSite!.invalidateConfig().then(async () => {
            // Config invalidated, fetch it again.
            const config: CoreSiteConfig = await this.currentSite!.getConfig();
            this.currentSite!.setConfig(config);

            return;
        }));

        if (this.section && this.section.modules) {
            // Invalidate modules prefetch data.
            promises.push(CoreCourseModulePrefetchDelegate.invalidateModules(this.section.modules, this.siteHomeId));
        }

        if (this.courseBlocksComponent) {
            promises.push(this.courseBlocksComponent.invalidateBlocks());
        }

        Promise.all(promises).finally(async () => {
            const p2: Promise<unknown>[] = [];

            p2.push(this.loadContent());
            if (this.courseBlocksComponent) {
                p2.push(this.courseBlocksComponent.loadContent());
            }

            await Promise.all(p2).finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        this.switchDownload(!this.downloadEnabled);
    }

    /**
     * Convenience function to switch download enabled.
     *
     * @param enable If enable or disable.
     */
    protected switchDownload(enable: boolean): void {
        this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && enable;
        this.downloadEnabledIcon = this.downloadEnabled ? 'far-check-square' : 'far-square';
        CoreEvents.trigger(CoreCoursesProvider.EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED, { enabled: this.downloadEnabled });
    }

    /**
     * Open page to manage courses storage.
     */
    manageCoursesStorage(): void {
        CoreNavigator.navigateToSitePath('/storage');
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        CoreNavigator.navigateToSitePath('courses/search');
    }

    /**
     * Go to available courses.
     */
    openAvailableCourses(): void {
        CoreNavigator.navigateToSitePath('courses/all');
    }

    /**
     * Go to my courses.
     */
    openMyCourses(): void {
        CoreNavigator.navigateToSitePath('courses/my');
    }

    /**
     * Go to course categories.
     */
    openCourseCategories(): void {
        CoreNavigator.navigateToSitePath('courses/categories');
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
    }

}

type NewsForum = CoreCourseModuleBasicInfo & {
    handlerData?: CoreCourseModuleHandlerData;
};
