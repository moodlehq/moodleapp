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

import { NavController as NavControllerService } from '@ionic/angular';

import { mock, mockSingleton } from '@/testing/utils';

import { CoreNavigatorService } from '@services/navigator';
import { NavController, Router } from '@singletons';
import { ActivatedRoute, RouterState } from '@angular/router';
import { CoreSites } from '@services/sites';
import { CoreMainMenu } from '@features/mainmenu/services/mainmenu';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';

describe('CoreNavigator', () => {

    let router: {
        url?: string;
        routerState?: Partial<RouterState>;
    };
    let currentMainMenuHandlers: string[];
    let navigator: CoreNavigatorService;
    let navControllerMock: NavControllerService;

    beforeEach(() => {
        currentMainMenuHandlers = ['home'];
        navigator = new CoreNavigatorService();
        navControllerMock = mockSingleton(NavController, ['navigateRoot', 'navigateForward']);

        router = mockSingleton(Router, { url: '/' });

        mockSingleton(CoreSites, { getCurrentSiteId: () => '42', isLoggedIn: () => true });
        mockSingleton(CoreMainMenu, { isMainMenuTab: path => Promise.resolve(currentMainMenuHandlers.includes(path)) });
    });

    it('matches against current path', () => {
        router.url = '/main/foo';

        expect(navigator.isCurrent('/main/foo')).toBe(true);
        expect(navigator.isCurrent('/main')).toBe(false);
        expect(navigator.isCurrent('../../main/foo')).toBe(true);
        expect(navigator.isCurrent('../foo')).toBe(true);
        expect(navigator.isCurrent('main/foo')).toBe(false);
    });

    it('gets the current main menu tab', () => {
        expect(navigator.getCurrentMainMenuTab()).toBeNull();

        router.url = '/main/foo';
        expect(navigator.getCurrentMainMenuTab()).toBe('foo');

        router.url = '/main/foo/bar';
        expect(navigator.getCurrentMainMenuTab()).toBe('foo');
    });

    it('navigates to absolute paths', async () => {
        const success = await navigator.navigate('/main/foo/bar', { reset: true });

        expect(success).toBe(true);
        expect(navControllerMock.navigateRoot).toHaveBeenCalledWith(['/main/foo/bar'], {});
    });

    it('navigates to relative paths', async () => {
        // Arrange.
        const mainOutletRoute = { routeConfig: { path: 'foo' } };
        const primaryOutletRoute = { routeConfig: { path: 'main' }, firstChild: mainOutletRoute };
        const rootRoute = { firstChild: primaryOutletRoute };

        router.routerState = { root: rootRoute as unknown as ActivatedRoute };

        // Act.
        const success = await navigator.navigate('./bar');

        // Assert.
        expect(success).toBe(true);
        expect(navControllerMock.navigateForward).toHaveBeenCalledWith(['./bar'], { relativeTo: mainOutletRoute });
    });

    it('navigates to site paths', async () => {
        // Arrange
        router.url = '/main/foo';

        // Act
        const success = await navigator.navigateToSitePath('/user/42');

        // Assert
        expect(success).toBe(true);
        expect(navControllerMock.navigateForward).toHaveBeenCalledWith(['/main/foo/user/42'], {});
    });

    it('navigates to site paths using tabs', async () => {
        // Arrange
        currentMainMenuHandlers.push('users');

        // Act
        const success = await navigator.navigateToSitePath('/users/user/42');

        // Assert
        expect(success).toBe(true);
        expect(navControllerMock.navigateForward).toHaveBeenCalledWith(['/main/users/user/42'], {});
    });

    it('navigates to site paths using the main page', async () => {
        const success = await navigator.navigateToSitePath('/user/42');

        expect(success).toBe(true);
        expect(navControllerMock.navigateForward).toHaveBeenCalledWith(['/main'], {
            queryParams: {
                redirectPath: 'user/42',
            },
        });
    });

    it('navigates to site paths using different path formats', async () => {
        currentMainMenuHandlers.push('users');

        const assertNavigation = async (currentPath, sitePath, expectedPath) => {
            router.url = currentPath;

            const success = await navigator.navigateToSitePath(sitePath);

            expect(success).toBe(true);
            expect(navControllerMock.navigateForward).toHaveBeenCalledWith([expectedPath], {});
        };

        await assertNavigation('/main/users', '/main/users/user/42', '/main/users/user/42');
        await assertNavigation('/main/users', '/users/user/42', '/main/users/user/42');
        await assertNavigation('/main/users', '/user/42', '/main/users/user/42');
        await assertNavigation('/main/home', '/users/user/42', '/main/users/user/42');
    });

    it('navigates to site home: no handlers loaded', async () => {
        const success = await navigator.navigateToSiteHome();

        expect(success).toBe(true);
        expect(navControllerMock.navigateRoot).toHaveBeenCalledWith(['/main'], {});
    });

    it('navigates to site home: handlers loaded', async () => {
        mockSingleton(CoreMainMenuDelegate, {
            areHandlersLoaded: () => true,
            getHandlers: () => [{ title: 'Test', page: 'initialpage', icon: '' }],
        });

        const success = await navigator.navigateToSiteHome();

        expect(success).toBe(true);
        expect(navControllerMock.navigateRoot).toHaveBeenCalledWith(['/main/initialpage'], {});
    });

    it('calculates relative paths to parent paths', () => {
        navigator = mock(navigator, {
            getCurrentPath: () => '/foo/bar/baz/xyz',
        });

        expect(navigator.getRelativePathToParent('/foo/bar/baz/xyz')).toEqual('');
        expect(navigator.getRelativePathToParent('/foo/bar/baz')).toEqual('../');
        expect(navigator.getRelativePathToParent('/foo/bar')).toEqual('../../');
        expect(navigator.getRelativePathToParent('/bar')).toEqual('../../');
        expect(navigator.getRelativePathToParent('/foo')).toEqual('../../../');
        expect(navigator.getRelativePathToParent('/foo/')).toEqual('../../../');
        expect(navigator.getRelativePathToParent('foo')).toEqual('../../../');
        expect(navigator.getRelativePathToParent('/invalid')).toEqual('');
        expect(navigator.getRelativePathToParent('/fo')).toEqual('');
    });

    it.todo('navigates to a different site');
    it.todo('navigates to login credentials');
    it.todo('navigates to NO_SITE_ID site');

});
