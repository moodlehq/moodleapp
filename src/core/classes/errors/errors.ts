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

/**
 * Get core errors exported objects.
 *
 * @returns Core errors exported objects.
 */
export async function getCoreErrorsExportedObjects(): Promise<Record<string, unknown>> {

    const { CoreError } = await import('./error');
    const { CoreWSError } = await import('./wserror');
    const { CoreCanceledError } = await import('./cancelederror');
    const { CoreSilentError } = await import('./silenterror');
    const { CoreAjaxError } = await import('./ajaxerror');
    const { CoreAjaxWSError } = await import('./ajaxwserror');
    const { CoreCaptureError } = await import('./captureerror');
    const { CoreNetworkError } = await import('./network-error');
    const { CoreSiteError } = await import('./siteerror');
    const { CoreLoginError } = await import('./loginerror');
    const { CoreErrorWithOptions } = await import('./errorwithoptions');
    const { CoreHttpError } = await import('./httperror');

    /* eslint-disable @typescript-eslint/naming-convention */
    return {
        CoreError,
        CoreWSError,
        CoreCanceledError,
        CoreSilentError,
        CoreAjaxError,
        CoreAjaxWSError,
        CoreCaptureError,
        CoreNetworkError,
        CoreSiteError,
        CoreLoginError,
        CoreErrorWithOptions,
        CoreHttpError,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}
