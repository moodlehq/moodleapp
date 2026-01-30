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

/* eslint-disable no-console */

import { CoreConstants } from '@/core/constants';
import { CoreBrowser } from '@static/browser';
import { CoreLogger } from '@static/logger';

describe('CoreLogger', () => {

    beforeEach(() => {
        console.log = jest.fn();
        console.info = jest.fn();
        console.warn = jest.fn();
        console.debug = jest.fn();
        console.error = jest.fn();
    });

    it('adds logs to the console in dev environment', () => {
        // Simulate dev environment.
        const isTesting = CoreConstants.BUILD.isTesting;
        const isProduction = CoreConstants.BUILD.isProduction;
        CoreConstants.BUILD.isTesting = false;
        CoreConstants.BUILD.isProduction = false;

        const logger = CoreLogger.getInstance('TestName');

        logger.log('Log message');
        expect((<jest.Mock> console.log).mock.calls[0][0]).toContain('TestName: Log message');

        logger.info('Info message');
        expect((<jest.Mock> console.info).mock.calls[0][0]).toContain('TestName: Info message');

        logger.warn('Warn message');
        expect((<jest.Mock> console.warn).mock.calls[0][0]).toContain('TestName: Warn message');

        logger.debug('Debug message');
        expect((<jest.Mock> console.debug).mock.calls[0][0]).toContain('TestName: Debug message');

        logger.error('Error message');
        expect((<jest.Mock> console.error).mock.calls[0][0]).toContain('TestName: Error message');

        CoreConstants.BUILD.isTesting = isTesting;
        CoreConstants.BUILD.isProduction = isProduction;
    });

    it('adds logs to the console if enabled via dev setting', () => {
        // Enable logging.
        CoreBrowser.setDevelopmentSetting('LoggingEnabled', '1');

        const logger = CoreLogger.getInstance('TestName');

        logger.log('Log message');
        expect((<jest.Mock> console.log).mock.calls[0][0]).toContain('TestName: Log message');

        logger.info('Info message');
        expect((<jest.Mock> console.info).mock.calls[0][0]).toContain('TestName: Info message');

        logger.warn('Warn message');
        expect((<jest.Mock> console.warn).mock.calls[0][0]).toContain('TestName: Warn message');

        logger.debug('Debug message');
        expect((<jest.Mock> console.debug).mock.calls[0][0]).toContain('TestName: Debug message');

        logger.error('Error message');
        expect((<jest.Mock> console.error).mock.calls[0][0]).toContain('TestName: Error message');

        CoreBrowser.clearDevelopmentSetting('LoggingEnabled');
    });

    it('doesn\'t log to the console in testing environment', () => {
        // Disable production.
        const isProduction = CoreConstants.BUILD.isProduction;
        CoreConstants.BUILD.isProduction = false;

        const logger = CoreLogger.getInstance('TestName');

        logger.log('Log message');
        expect(console.log).not.toHaveBeenCalled();

        logger.info('Info message');
        expect(console.info).not.toHaveBeenCalled();

        logger.warn('Warn message');
        expect(console.warn).not.toHaveBeenCalled();

        logger.debug('Debug message');
        expect(console.debug).not.toHaveBeenCalled();

        logger.error('Error message');
        expect(console.error).not.toHaveBeenCalled();

        CoreConstants.BUILD.isProduction = isProduction;
    });

    it('displays a warning in production environment', () => {
        // Enable production.
        const isProduction = CoreConstants.BUILD.isProduction;
        CoreConstants.BUILD.isProduction = true;

        CoreLogger.getInstance('TestName');

        expect(console.warn).toHaveBeenCalledWith('Log is disabled in production app');

        CoreConstants.BUILD.isProduction = isProduction;
    });

});
