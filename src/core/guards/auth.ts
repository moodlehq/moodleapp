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

import { Injectable } from '@angular/core';
import { Router, CanLoad, CanActivate, UrlTree } from '@angular/router';

import { CoreSites } from '@services/sites';
import { ApplicationInit } from '@singletons';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanLoad, CanActivate {

    constructor(private router: Router) {}

    canActivate(): Promise<true | UrlTree> {
        return this.guard();
    }

    canLoad(): Promise<true | UrlTree> {
        return this.guard();
    }

    private async guard(): Promise<true | UrlTree> {
        await ApplicationInit.instance.donePromise;

        return CoreSites.instance.isLoggedIn() || this.router.parseUrl('/login');
    }

}
