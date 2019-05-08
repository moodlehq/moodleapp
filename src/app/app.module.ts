// (C) Copyright 2015 Martin Dougiamas
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

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, COMPILER_OPTIONS } from '@angular/core';
import { IonicApp, IonicModule, Platform, Content, ScrollEvent, Config } from 'ionic-angular';
import { assert } from 'ionic-angular/util/util';
import { HttpModule } from '@angular/http';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JitCompilerFactory } from '@angular/platform-browser-dynamic';
import { LocationStrategy } from '@angular/common';
import { MockLocationStrategy } from '@angular/common/testing';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { ScreenOrientation } from '@ionic-native/screen-orientation';

import { MoodleMobileApp } from './app.component';
import { CoreInterceptor } from '@classes/interceptor';
import { CorePageTransition } from '@classes/page-transition';
import { CoreModalLateralTransition } from '@classes/modal-lateral-transition';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDbProvider } from '@providers/db';
import { CoreAppProvider } from '@providers/app';
import { CoreConfigProvider } from '@providers/config';
import { CoreLangProvider } from '@providers/lang';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreIframeUtilsProvider } from '@providers/utils/iframe';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreInitDelegate } from '@providers/init';
import { CoreFileProvider } from '@providers/file';
import { CoreWSProvider } from '@providers/ws';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesFactoryProvider } from '@providers/sites-factory';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreCronDelegate } from '@providers/cron';
import { CoreFileSessionProvider } from '@providers/file-session';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreUpdateManagerProvider } from '@providers/update-manager';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';
import { CoreSyncProvider } from '@providers/sync';
import { CoreFileHelperProvider } from '@providers/file-helper';
import { CoreCustomURLSchemesProvider } from '@providers/urlschemes';

// Core modules.
import { CoreComponentsModule } from '@components/components.module';
import { CoreEmulatorModule } from '@core/emulator/emulator.module';
import { CoreLoginModule } from '@core/login/login.module';
import { CoreMainMenuModule } from '@core/mainmenu/mainmenu.module';
import { CoreCoursesModule } from '@core/courses/courses.module';
import { CoreFileUploaderModule } from '@core/fileuploader/fileuploader.module';
import { CoreSharedFilesModule } from '@core/sharedfiles/sharedfiles.module';
import { CoreCourseModule } from '@core/course/course.module';
import { CoreSiteHomeModule } from '@core/sitehome/sitehome.module';
import { CoreContentLinksModule } from '@core/contentlinks/contentlinks.module';
import { CoreUserModule } from '@core/user/user.module';
import { CoreGradesModule } from '@core/grades/grades.module';
import { CoreSettingsModule } from '@core/settings/settings.module';
import { CoreSitePluginsModule } from '@core/siteplugins/siteplugins.module';
import { CoreCompileModule } from '@core/compile/compile.module';
import { CoreQuestionModule } from '@core/question/question.module';
import { CoreCommentsModule } from '@core/comments/comments.module';
import { CoreBlockModule } from '@core/block/block.module';
import { CoreRatingModule } from '@core/rating/rating.module';

// Addon modules.
import { AddonBadgesModule } from '@addon/badges/badges.module';
import { AddonBlogModule } from '@addon/blog/blog.module';
import { AddonCalendarModule } from '@addon/calendar/calendar.module';
import { AddonCompetencyModule } from '@addon/competency/competency.module';
import { AddonCourseCompletionModule } from '@addon/coursecompletion/coursecompletion.module';
import { AddonUserProfileFieldModule } from '@addon/userprofilefield/userprofilefield.module';
import { AddonFilesModule } from '@addon/files/files.module';
import { AddonBlockActivityModulesModule } from '@addon/block/activitymodules/activitymodules.module';
import { AddonBlockCalendarMonthModule } from '@addon/block/calendarmonth/calendarmonth.module';
import { AddonBlockCalendarUpcomingModule } from '@addon/block/calendarupcoming/calendarupcoming.module';
import { AddonBlockMyOverviewModule } from '@addon/block/myoverview/myoverview.module';
import { AddonBlockLearningPlansModule } from '@addon/block/learningplans/learningplans.module';
import { AddonBlockPrivateFilesModule } from '@addon/block/privatefiles/privatefiles.module';
import { AddonBlockSiteMainMenuModule } from '@addon/block/sitemainmenu/sitemainmenu.module';
import { AddonBlockTimelineModule } from '@addon/block/timeline/timeline.module';
import { AddonBlockRecentlyAccessedCoursesModule } from '@addon/block/recentlyaccessedcourses/recentlyaccessedcourses.module';
import { AddonBlockRecentlyAccessedItemsModule } from '@addon/block/recentlyaccesseditems/recentlyaccesseditems.module';
import { AddonBlockStarredCoursesModule } from '@addon/block/starredcourses/starredcourses.module';
import { AddonModAssignModule } from '@addon/mod/assign/assign.module';
import { AddonModBookModule } from '@addon/mod/book/book.module';
import { AddonModChatModule } from '@addon/mod/chat/chat.module';
import { AddonModChoiceModule } from '@addon/mod/choice/choice.module';
import { AddonModDataModule } from '@addon/mod/data/data.module';
import { AddonModLabelModule } from '@addon/mod/label/label.module';
import { AddonModLtiModule } from '@addon/mod/lti/lti.module';
import { AddonModResourceModule } from '@addon/mod/resource/resource.module';
import { AddonModFeedbackModule } from '@addon/mod/feedback/feedback.module';
import { AddonModFolderModule } from '@addon/mod/folder/folder.module';
import { AddonModForumModule } from '@addon/mod/forum/forum.module';
import { AddonModGlossaryModule } from '@addon/mod/glossary/glossary.module';
import { AddonModLessonModule } from '@addon/mod/lesson/lesson.module';
import { AddonModPageModule } from '@addon/mod/page/page.module';
import { AddonModQuizModule } from '@addon/mod/quiz/quiz.module';
import { AddonModScormModule } from '@addon/mod/scorm/scorm.module';
import { AddonModUrlModule } from '@addon/mod/url/url.module';
import { AddonModSurveyModule } from '@addon/mod/survey/survey.module';
import { AddonModWorkshopModule } from '@addon/mod/workshop/workshop.module';
import { AddonModImscpModule } from '@addon/mod/imscp/imscp.module';
import { AddonModWikiModule } from '@addon/mod/wiki/wiki.module';
import { AddonMessageOutputModule } from '@addon/messageoutput/messageoutput.module';
import { AddonMessageOutputAirnotifierModule } from '@addon/messageoutput/airnotifier/airnotifier.module';
import { AddonMessagesModule } from '@addon/messages/messages.module';
import { AddonNotesModule } from '../addon/notes/notes.module';
import { CorePushNotificationsModule } from '@core/pushnotifications/pushnotifications.module';
import { AddonNotificationsModule } from '@addon/notifications/notifications.module';
import { AddonRemoteThemesModule } from '@addon/remotethemes/remotethemes.module';
import { AddonQbehaviourModule } from '@addon/qbehaviour/qbehaviour.module';
import { AddonQtypeModule } from '@addon/qtype/qtype.module';
import { AddonStorageManagerModule } from '@addon/storagemanager/storagemanager.module';

// For translate loader. AoT requires an exported function for factories.
export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http, './assets/lang/', '.json');
}

// List of providers.
export const CORE_PROVIDERS: any[] = [
    CoreLoggerProvider,
    CoreDbProvider,
    CoreAppProvider,
    CoreConfigProvider,
    CoreLangProvider,
    CoreTextUtilsProvider,
    CoreDomUtilsProvider,
    CoreIframeUtilsProvider,
    CoreTimeUtilsProvider,
    CoreUrlUtilsProvider,
    CoreUtilsProvider,
    CoreMimetypeUtilsProvider,
    CoreInitDelegate,
    CoreFileProvider,
    CoreWSProvider,
    CoreEventsProvider,
    CoreSitesFactoryProvider,
    CoreSitesProvider,
    CoreLocalNotificationsProvider,
    CoreGroupsProvider,
    CoreCronDelegate,
    CoreFileSessionProvider,
    CoreFilepoolProvider,
    CoreUpdateManagerProvider,
    CorePluginFileDelegate,
    CoreSyncProvider,
    CoreFileHelperProvider,
    CoreCustomURLSchemesProvider
];

@NgModule({
    declarations: [
        MoodleMobileApp
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule, // HttpClient is used to make JSON requests. It fails for HEAD requests because there is no content.
        HttpModule,
        IonicModule.forRoot(MoodleMobileApp, {
            pageTransition: 'core-page-transition'
        }),
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient]
            }
        }),
        CoreComponentsModule,
        CoreEmulatorModule,
        CoreLoginModule,
        CoreMainMenuModule,
        CoreCoursesModule,
        CoreFileUploaderModule,
        CoreSharedFilesModule,
        CoreCourseModule,
        CoreSiteHomeModule,
        CoreContentLinksModule,
        CoreUserModule,
        CoreGradesModule,
        CoreSettingsModule,
        CoreSitePluginsModule,
        CoreCompileModule,
        CoreQuestionModule,
        CoreCommentsModule,
        CoreBlockModule,
        CoreRatingModule,
        CorePushNotificationsModule,
        AddonBadgesModule,
        AddonBlogModule,
        AddonCalendarModule,
        AddonCompetencyModule,
        AddonCourseCompletionModule,
        AddonUserProfileFieldModule,
        AddonFilesModule,
        AddonBlockActivityModulesModule,
        AddonBlockCalendarMonthModule,
        AddonBlockCalendarUpcomingModule,
        AddonBlockLearningPlansModule,
        AddonBlockMyOverviewModule,
        AddonBlockPrivateFilesModule,
        AddonBlockSiteMainMenuModule,
        AddonBlockTimelineModule,
        AddonBlockRecentlyAccessedCoursesModule,
        AddonBlockRecentlyAccessedItemsModule,
        AddonBlockStarredCoursesModule,
        AddonModAssignModule,
        AddonModBookModule,
        AddonModChatModule,
        AddonModChoiceModule,
        AddonModDataModule,
        AddonModLabelModule,
        AddonModLessonModule,
        AddonModResourceModule,
        AddonModFeedbackModule,
        AddonModFolderModule,
        AddonModForumModule,
        AddonModGlossaryModule,
        AddonModLtiModule,
        AddonModPageModule,
        AddonModQuizModule,
        AddonModScormModule,
        AddonModUrlModule,
        AddonModSurveyModule,
        AddonModWorkshopModule,
        AddonModImscpModule,
        AddonModWikiModule,
        AddonMessageOutputModule,
        AddonMessageOutputAirnotifierModule,
        AddonMessagesModule,
        AddonNotesModule,
        AddonNotificationsModule,
        AddonRemoteThemesModule,
        AddonQbehaviourModule,
        AddonQtypeModule,
        AddonStorageManagerModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MoodleMobileApp
    ],
    providers: [
        CoreLoggerProvider,
        CoreDbProvider,
        CoreAppProvider,
        CoreConfigProvider,
        CoreLangProvider,
        CoreTextUtilsProvider,
        CoreDomUtilsProvider,
        CoreIframeUtilsProvider,
        CoreTimeUtilsProvider,
        CoreUrlUtilsProvider,
        CoreUtilsProvider,
        CoreMimetypeUtilsProvider,
        CoreInitDelegate,
        CoreFileProvider,
        CoreWSProvider,
        CoreEventsProvider,
        CoreSitesFactoryProvider,
        CoreSitesProvider,
        CoreLocalNotificationsProvider,
        CoreGroupsProvider,
        CoreCronDelegate,
        CoreFileSessionProvider,
        CoreFilepoolProvider,
        CoreUpdateManagerProvider,
        CorePluginFileDelegate,
        CoreSyncProvider,
        CoreFileHelperProvider,
        CoreCustomURLSchemesProvider,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: CoreInterceptor,
            multi: true,
        },
        ScreenOrientation,
        {provide: COMPILER_OPTIONS, useValue: {}, multi: true},
        {provide: JitCompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS]},
        {provide: LocationStrategy, useClass: MockLocationStrategy},
    ]
})
export class AppModule {
    constructor(platform: Platform, initDelegate: CoreInitDelegate, updateManager: CoreUpdateManagerProvider, config: Config,
            sitesProvider: CoreSitesProvider, fileProvider: CoreFileProvider, private eventsProvider: CoreEventsProvider) {
        // Register a handler for platform ready.
        initDelegate.registerProcess({
            name: 'CorePlatformReady',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 400,
            blocking: true,
            load: platform.ready
        });

        // Register the update manager as an init process.
        initDelegate.registerProcess(updateManager);

        // Restore the user's session during the init process.
        initDelegate.registerProcess({
            name: 'CoreRestoreSession',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 200,
            blocking: false,
            load: sitesProvider.restoreSession.bind(sitesProvider)
        });

        // Register clear app tmp folder.
        initDelegate.registerProcess({
            name: 'CoreClearTmpFolder',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 150,
            blocking: false,
            load: fileProvider.clearTmpFolder.bind(fileProvider)
        });

        // Execute the init processes.
        initDelegate.executeInitProcesses();

        // Set transition animation.
        config.setTransition('core-page-transition', CorePageTransition);
        config.setTransition('core-modal-lateral-transition', CoreModalLateralTransition);

        // Decorate ion-content.
        this.decorateIonContent();
    }

    /**
     * Decorate ion-content to make our ion-tabs work.
     * https://github.com/ionic-team/ionic/issues/14483
     */
    protected decorateIonContent(): void {

        const parsePxUnit = (val: string): number => {
            return (val.indexOf('px') > 0) ? parseInt(val, 10) : 0;
        };

        // We need to convert the prototype to any because _readDimensions is private.
        // tslint:disable: typedef
        (<any> Content.prototype)._readDimensions = function() {
            const cachePaddingTop = this._pTop;
            const cachePaddingRight = this._pRight;
            const cachePaddingBottom = this._pBottom;
            const cachePaddingLeft = this._pLeft;
            const cacheHeaderHeight = this._hdrHeight;
            const cacheFooterHeight = this._ftrHeight;
            const cacheTabsPlacement = this._tabsPlacement;
            let tabsTop = 0;
            let scrollEvent: ScrollEvent;
            this._pTop = 0;
            this._pRight = 0;
            this._pBottom = 0;
            this._pLeft = 0;
            this._hdrHeight = 0;
            this._ftrHeight = 0;
            this._tabsPlacement = null;
            this._tTop = 0;
            this._fTop = 0;
            this._fBottom = 0;

            // In certain cases this._scroll is undefined, if that is the case then we should just return.
            if (!this._scroll) {
                return;
            }

            scrollEvent = this._scroll.ev;

            let ele: HTMLElement = this.getNativeElement();
            if (!ele) {
                assert(false, 'ele should be valid');

                return;
            }

            let computedStyle: any;
            let tagName: string;
            const parentEle: HTMLElement = ele.parentElement;
            const children = parentEle.children;
            for (let i = children.length - 1; i >= 0; i--) {
                ele = <HTMLElement> children[i];
                tagName = ele.tagName;
                if (tagName === 'ION-CONTENT') {
                    scrollEvent.contentElement = ele;

                    if (this._fullscreen) {
                    // ******** DOM READ ****************
                        computedStyle = getComputedStyle(ele);
                        this._pTop = parsePxUnit(computedStyle.paddingTop);
                        this._pBottom = parsePxUnit(computedStyle.paddingBottom);
                        this._pRight = parsePxUnit(computedStyle.paddingRight);
                        this._pLeft = parsePxUnit(computedStyle.paddingLeft);
                    }

                } else if (tagName === 'ION-HEADER') {
                    scrollEvent.headerElement = ele;

                    // ******** DOM READ ****************
                    this._hdrHeight = ele.clientHeight;

                } else if (tagName === 'ION-FOOTER') {
                    scrollEvent.footerElement = ele;

                    // ******** DOM READ ****************
                    this._ftrHeight = ele.clientHeight;
                    this._footerEle = ele;
                }
            }

            ele = parentEle;
            let tabbarEle: HTMLElement;

            while (ele && ele.tagName !== 'ION-MODAL' && !ele.classList.contains('tab-subpage')) {

                if (ele.tagName.indexOf('ION-TABS') != -1) {
                    tabbarEle = <HTMLElement> ele.firstElementChild;
                    // ******** DOM READ ****************
                    this._tabbarHeight = tabbarEle.clientHeight;

                    if (this._tabsPlacement === null) {
                        // This is the first tabbar found, remember its position.
                        this._tabsPlacement = ele.getAttribute('tabsplacement');
                    }
                }

                ele = ele.parentElement;
            }

            // Tabs top
            if (this._tabs && this._tabsPlacement === 'top') {
                this._tTop = this._hdrHeight;
                tabsTop = this._tabs._top;
            }

            // Toolbar height
            this._cTop = this._hdrHeight;
            this._cBottom = this._ftrHeight;

            // Tabs height
            if (this._tabsPlacement === 'top') {
                this._cTop += this._tabbarHeight;

            } else if (this._tabsPlacement === 'bottom') {
                this._cBottom += this._tabbarHeight;
            }

            // Refresher uses a border which should be hidden unless pulled
            if (this._hasRefresher) {
                this._cTop -= 1;
            }

            // Fixed content shouldn't include content padding
            this._fTop = this._cTop;
            this._fBottom = this._cBottom;

            // Handle fullscreen viewport (padding vs margin)
            if (this._fullscreen) {
                this._cTop += this._pTop;
                this._cBottom += this._pBottom;
            }

            // ******** DOM READ ****************
            const contentDimensions = this.getContentDimensions();
            scrollEvent.scrollHeight = contentDimensions.scrollHeight;
            scrollEvent.scrollWidth = contentDimensions.scrollWidth;
            scrollEvent.contentHeight = contentDimensions.contentHeight;
            scrollEvent.contentWidth = contentDimensions.contentWidth;
            scrollEvent.contentTop = contentDimensions.contentTop;
            scrollEvent.contentBottom = contentDimensions.contentBottom;

            this._dirty = (
                cachePaddingTop !== this._pTop ||
                cachePaddingBottom !== this._pBottom ||
                cachePaddingLeft !== this._pLeft ||
                cachePaddingRight !== this._pRight ||
                cacheHeaderHeight !== this._hdrHeight ||
                cacheFooterHeight !== this._ftrHeight ||
                cacheTabsPlacement !== this._tabsPlacement ||
                tabsTop !== this._tTop ||
                this._cTop !== this.contentTop ||
                this._cBottom !== this.contentBottom
            );

            this._scroll.init(this.getScrollElement(), this._cTop, this._cBottom);

            // Initial imgs refresh.
            this.imgsUpdate();
        };

        const eventsProvider = this.eventsProvider;

        // tslint:disable: typedef
        (<any> Content).prototype.ngAfterViewInit = function() {
            assert(this.getFixedElement(), 'fixed element was not found');
            assert(this.getScrollElement(), 'scroll element was not found');

            const scroll = this._scroll;
            scroll.ev.fixedElement = this.getFixedElement();
            scroll.ev.scrollElement = this.getScrollElement();

            // Subscribe to the scroll start
            scroll.onScrollStart = (ev) => {
                this.ionScrollStart.emit(ev);
            };

            // Subscribe to every scroll move
            scroll.onScroll = (ev) => {
                // Emit to all of our other friends things be scrolling
                this.ionScroll.emit(ev);

                this.imgsUpdate();
            };

            // Subscribe to the scroll end
            scroll.onScrollEnd = (ev) => {
                this.ionScrollEnd.emit(ev);

                this.imgsUpdate();
            };

            // Recalculate size when screen rotates.
            this._orientationObs = eventsProvider.on(CoreEventsProvider.ORIENTATION_CHANGE, this.resize.bind(this));
        };

        // tslint:disable: typedef
        (<any> Content).prototype.ngOnDestroy = function() {
            this._scLsn && this._scLsn();
            this._viewCtrlReadSub && this._viewCtrlReadSub.unsubscribe();
            this._viewCtrlWriteSub && this._viewCtrlWriteSub.unsubscribe();
            this._viewCtrlReadSub = this._viewCtrlWriteSub = null;
            this._scroll && this._scroll.destroy();
            this._footerEle = this._scLsn = this._scroll = null;
            this._orientationObs && this._orientationObs.off();
        };
    }
}
