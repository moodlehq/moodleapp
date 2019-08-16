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

import { CoreEventsProvider } from '@providers/events';
import { AddonModScormProvider } from '../providers/scorm';

/**
 * SCORM data model implementation for version 1.2.
 */
export class AddonModScormDataModel12 {

    // Standard Data Type Definition.
    protected CMI_STRING_256 = '^[\\u0000-\\uFFFF]{0,255}$';
    protected CMI_STRING_4096 = '^[\\u0000-\\uFFFF]{0,4096}$';
    protected CMI_TIME = '^([0-2]{1}[0-9]{1}):([0-5]{1}[0-9]{1}):([0-5]{1}[0-9]{1})(\.[0-9]{1,2})?$';
    protected CMI_TIMESPAN = '^([0-9]{2,4}):([0-9]{2}):([0-9]{2})(\.[0-9]{1,2})?$';
    protected CMI_INTEGER = '^\\d+$';
    protected CMI_SINTEGER = '^-?([0-9]+)$';
    protected CMI_DECIMAL = '^-?([0-9]{0,3})(\.[0-9]*)?$';
    protected CMI_IDENTIFIER = '^[\\u0021-\\u007E]{0,255}$';
    protected CMI_FEEDBACK = this.CMI_STRING_256; // This must be redefined.
    protected CMI_INDEX = '[._](\\d+).';

    // Vocabulary Data Type Definition.
    protected CMI_STATUS = '^passed$|^completed$|^failed$|^incomplete$|^browsed$';
    protected CMI_STATUS_2 = '^passed$|^completed$|^failed$|^incomplete$|^browsed$|^not attempted$';
    protected CMI_EXIT = '^time-out$|^suspend$|^logout$|^$';
    protected CMI_TYPE = '^true-false$|^choice$|^fill-in$|^matching$|^performance$|^sequencing$|^likert$|^numeric$';
    protected CMI_RESULT = '^correct$|^wrong$|^unanticipated$|^neutral$|^([0-9]{0,3})?(\.[0-9]*)?$';
    protected NAV_EVENT = '^previous$|^continue$';

    // Children lists.
    protected CMI_CHILDREN = 'core,suspend_data,launch_data,comments,objectives,student_data,student_preference,interactions';
    protected CORE_CHILDREN = 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,' +
            'exit,session_time';
    protected SCORE_CHILDREN = 'raw,min,max';
    protected COMMENTS_CHILDREN = 'content,location,time';
    protected OBJECTIVES_CHILDREN = 'id,score,status';
    protected CORRECT_RESPONSES_CHILDREN = 'pattern';
    protected STUDENT_DATA_CHILDREN = 'mastery_score,max_time_allowed,time_limit_action';
    protected STUDENT_PREFERENCE_CHILDREN = 'audio,language,speed,text';
    protected INTERACTIONS_CHILDREN = 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency';

    // Data ranges.
    protected SCORE_RANGE = '0#100';
    protected AUDIO_RANGE = '-1#100';
    protected SPEED_RANGE = '-100#100';
    protected WEIGHTING_RANGE = '-100#100';
    protected TEXT_RANGE = '-1#1';

    // Error messages.
    protected ERROR_STRINGS = {
        0: 'No error',
        101: 'General exception',
        201: 'Invalid argument error',
        202: 'Element cannot have children',
        203: 'Element not an array - cannot have count',
        301: 'Not initialized',
        401: 'Not implemented error',
        402: 'Invalid set value, element is a keyword',
        403: 'Element is read only',
        404: 'Element is write only',
        405: 'Incorrect data type'
    };

    protected currentUserData = {}; // Current user data.
    protected def = {}; // Object containing the default values.
    protected defExtra = {}; // Extra object that will contain the objectives and interactions data (all the .n. elements).
    protected dataModel = {}; // The SCORM 1.2 data model.

    protected initialized = false; // Whether LMSInitialize has been called.
    protected errorCode: string; // Last error.
    protected timeout; // Timeout to commit changes.

    /**
     * Constructor.
     *
     * @param {CoreEventsProvider} eventsProvider Events provider instance.
     * @param {AddonModScormProvider} scormProvider SCORM provider instance.
     * @param {any} scorm SCORM.
     * @param {number} scoId Current SCO ID.
     * @param {number} attempt Attempt number.
     * @param {any} userData The user default data.
     * @param {string} [mode] Mode being played. By default, MODENORMAL.
     * @param {boolean} offline Whether the attempt is offline.
     */
    constructor(protected eventsProvider: CoreEventsProvider, protected scormProvider: AddonModScormProvider,
            protected siteId: string, protected scorm: any, protected scoId: number, protected attempt: number,
            userData: any, protected mode?: string, protected offline?: boolean) {

        this.mode = mode || AddonModScormProvider.MODENORMAL;
        this.offline = !!offline;

        this.init(userData);
    }

    /**
     * Utility function for adding two times in format hh:mm:ss.
     *
     * @param {string} first  First time.
     * @param {string} second Second time.
     * @return {string} Total time.
     */
    protected addTime(first: string, second: string): string {
        const sFirst = first.split(':'),
            sSecond = second.split(':'),
            cFirst = sFirst[2].split('.'),
            cSecond = sSecond[2].split('.');
        let change = 0;

        let firstCents = 0; // Cents.
        if (cFirst.length > 1) {
            firstCents = parseInt(cFirst[1], 10);
        }

        let secondCents = 0;
        if (cSecond.length > 1) {
            secondCents = parseInt(cSecond[1], 10);
        }

        let cents: string | number = firstCents + secondCents;
        change = Math.floor(cents / 100);
        cents = cents - (change * 100);
        if (Math.floor(cents) < 10) {
            cents = '0' + cents.toString();
        }

        let secs: string | number = parseInt(cFirst[0], 10) + parseInt(cSecond[0], 10) + change; // Seconds.
        change = Math.floor(secs / 60);
        secs = secs - (change * 60);
        if (Math.floor(secs) < 10) {
            secs = '0' + secs.toString();
        }

        let mins: string | number = parseInt(sFirst[1], 10) + parseInt(sSecond[1], 10) + change; // Minutes.
        change = Math.floor(mins / 60);
        mins = mins - (change * 60);
        if (mins < 10) {
            mins = '0' + mins.toString();
        }

        let hours: string | number = parseInt(sFirst[0], 10) + parseInt(sSecond[0], 10) + change; // Hours.
        if (hours < 10) {
            hours = '0' + hours.toString();
        }

        if (cents != '0') {
            return hours + ':' + mins + ':' + secs + '.' + cents;
        } else {
            return hours + ':' + mins + ':' + secs;
        }
    }

    /**
     * Utility function for cloning an object
     *
     * @param {any} obj The object to be cloned
     * @return {any} The object cloned
     */
    protected cloneObj(obj: any): any {
        if (obj == null || typeof(obj) != 'object') {
            return obj;
        }

        const temp = new obj.constructor(); // Changed (twice).
        for (const key in obj) {
            temp[key] = this.cloneObj(obj[key]);
        }

        return temp;
    }

    /**
     * Collect all the user tracking data that must be persisted in the system, this is usually called by LMSCommit().
     *
     * @return {any[]} Collected data.
     */
    protected collectData(): any[] {
        const data = [];

        for (const element in this.currentUserData[this.scoId]) {
            // Ommit for example the nav. elements.
            if (element.substr(0, 3) == 'cmi') {
                const expression = new RegExp(this.CMI_INDEX, 'g');

                // Get the generic name for this element (e.g. convert 'cmi.interactions.1.id' to 'cmi.interactions.n.id')
                const elementModel = String(element).replace(expression, '.n.');

                // Ignore the session time element.
                if (element != 'cmi.core.session_time') {

                    // Check if this specific element is not defined in the datamodel, but the generic element name is.
                    if (typeof this.dataModel[this.scoId][element] == 'undefined' &&
                            typeof this.dataModel[this.scoId][elementModel] != 'undefined') {

                        // Add this element to the data model (by cloning the generic element) so we can track changes to it.
                        this.dataModel[this.scoId][element] = this.cloneObj(this.dataModel[this.scoId][elementModel]);
                    }

                    // Check if the current element exists in the datamodel.
                    if (typeof this.dataModel[this.scoId][element] != 'undefined') {

                        // Make sure this is not a read only element.
                        if (this.dataModel[this.scoId][element].mod != 'r') {

                            const el = {
                                // Moodle stores the organizations and interactions using _n. instead .n.
                                element: element.replace(expression, '_$1.'),
                                value: this.getEl(element)
                            };

                            // Check if the element has a default value.
                            if (typeof this.dataModel[this.scoId][element].defaultvalue != 'undefined') {

                                // Check if the default value is different from the current value.
                                if (this.dataModel[this.scoId][element].defaultvalue != el.value ||
                                        typeof this.dataModel[this.scoId][element].defaultvalue != typeof(el.value)) {

                                    data.push(el);

                                    // Update the element default to reflect the current committed value.
                                    this.dataModel[this.scoId][element].defaultvalue = el.value;
                                }
                            } else {
                                data.push(el);

                                // No default value for the element, so set it now.
                                this.dataModel[this.scoId][element].defaultvalue = el.value;
                            }
                        }
                    }
                }
            }
        }

        return data;
    }

    /**
     * Get the value of the given element from the non-persistent (current) user data.
     *
     * @param {string} el The element
     * @return {any} The element value
     */
    protected getEl(el: string): any {
        if (typeof this.currentUserData[this.scoId] != 'undefined' && typeof this.currentUserData[this.scoId][el] != 'undefined') {
            return this.currentUserData[this.scoId][el];
        }

        return '';
    }

    /**
     * Initialize the model.
     *
     * @param {any} userData The user default data.
     */
    protected init(userData: any): void {
        // Prepare the definition array containing the default values.
        for (const scoId in userData) {
            const sco = userData[scoId];
            this.def[scoId] = sco.defaultdata;
            this.defExtra[scoId] = sco.userdata;
        }

        // Set up data model for each SCO.
        for (const scoId in this.def) {
            this.dataModel[scoId] = {
                'cmi._children': { defaultvalue: this.CMI_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi._version': { defaultvalue: '3.4', mod: 'r', writeerror: '402' },
                'cmi.core._children': { defaultvalue: this.CORE_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.core.student_id': { defaultvalue: this.def[scoId]['cmi.core.student_id'], mod: 'r', writeerror: '403' },
                'cmi.core.student_name': { defaultvalue: this.def[scoId]['cmi.core.student_name'], mod: 'r', writeerror: '403' },
                'cmi.core.lesson_location': { defaultvalue: this.def[scoId]['cmi.core.lesson_location'],
                        format: this.CMI_STRING_256, mod: 'rw', writeerror: '405' },
                'cmi.core.credit': { defaultvalue: this.def[scoId]['cmi.core.credit'], mod: 'r', writeerror: '403' },
                'cmi.core.lesson_status': { defaultvalue: this.def[scoId]['cmi.core.lesson_status'], format: this.CMI_STATUS,
                        mod: 'rw', writeerror: '405' },
                'cmi.core.entry': { defaultvalue: this.def[scoId]['cmi.core.entry'], mod: 'r', writeerror: '403' },
                'cmi.core.score._children': { defaultvalue: this.SCORE_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.core.score.raw': { defaultvalue: this.def[scoId]['cmi.core.score.raw'], format: this.CMI_DECIMAL,
                        range: this.SCORE_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.core.score.max': { defaultvalue: this.def[scoId]['cmi.core.score.max'], format: this.CMI_DECIMAL,
                        range: this.SCORE_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.core.score.min': { defaultvalue: this.def[scoId]['cmi.core.score.min'], format: this.CMI_DECIMAL,
                        range: this.SCORE_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.core.total_time': { defaultvalue: this.def[scoId]['cmi.core.total_time'], mod: 'r', writeerror: '403' },
                'cmi.core.lesson_mode': { defaultvalue: this.def[scoId]['cmi.core.lesson_mode'], mod: 'r', writeerror: '403' },
                'cmi.core.exit': { defaultvalue: this.def[scoId]['cmi.core.exit'], format: this.CMI_EXIT, mod: 'w',
                        readerror: '404', writeerror: '405' },
                'cmi.core.session_time': { format: this.CMI_TIMESPAN, mod: 'w', defaultvalue: '00:00:00', readerror: '404',
                        writeerror: '405' },
                'cmi.suspend_data': { defaultvalue: this.def[scoId]['cmi.suspend_data'], format: this.CMI_STRING_4096,
                        mod: 'rw', writeerror: '405' },
                'cmi.launch_data': { defaultvalue: this.def[scoId]['cmi.launch_data'], mod: 'r', writeerror: '403' },
                'cmi.comments': { defaultvalue: this.def[scoId]['cmi.comments'], format: this.CMI_STRING_4096, mod: 'rw',
                        writeerror: '405' },
                // Deprecated evaluation attributes.
                'cmi.evaluation.comments._count': { defaultvalue: '0', mod: 'r', writeerror: '402' },
                'cmi.evaluation.comments._children': { defaultvalue: this.COMMENTS_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.evaluation.comments.n.content': { defaultvalue: '', pattern: this.CMI_INDEX, format: this.CMI_STRING_256,
                        mod: 'rw', writeerror: '405' },
                'cmi.evaluation.comments.n.location': { defaultvalue: '', pattern: this.CMI_INDEX, format: this.CMI_STRING_256,
                        mod: 'rw', writeerror: '405' },
                'cmi.evaluation.comments.n.time': { defaultvalue: '', pattern: this.CMI_INDEX, format: this.CMI_TIME,
                        mod: 'rw', writeerror: '405' },
                'cmi.comments_from_lms': { mod: 'r', writeerror: '403' },
                'cmi.objectives._children': { defaultvalue: this.OBJECTIVES_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.objectives._count': { mod: 'r', defaultvalue: '0', writeerror: '402' },
                'cmi.objectives.n.id': { pattern: this.CMI_INDEX, format: this.CMI_IDENTIFIER, mod: 'rw', writeerror: '405' },
                'cmi.objectives.n.score._children': { pattern: this.CMI_INDEX, mod: 'r', writeerror: '402' },
                'cmi.objectives.n.score.raw': { defaultvalue: '', pattern: this.CMI_INDEX, format: this.CMI_DECIMAL,
                        range: this.SCORE_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.objectives.n.score.min': { defaultvalue: '', pattern: this.CMI_INDEX, format: this.CMI_DECIMAL,
                        range: this.SCORE_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.objectives.n.score.max': { defaultvalue: '', pattern: this.CMI_INDEX, format: this.CMI_DECIMAL,
                        range: this.SCORE_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.objectives.n.status': { pattern: this.CMI_INDEX, format: this.CMI_STATUS_2, mod: 'rw', writeerror: '405' },
                'cmi.student_data._children': { defaultvalue: this.STUDENT_DATA_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.student_data.mastery_score': { defaultvalue: this.def[scoId]['cmi.student_data.mastery_score'], mod: 'r',
                        writeerror: '403' },
                'cmi.student_data.max_time_allowed': { defaultvalue: this.def[scoId]['cmi.student_data.max_time_allowed'],
                        mod: 'r', writeerror: '403' },
                'cmi.student_data.time_limit_action': { defaultvalue: this.def[scoId]['cmi.student_data.time_limit_action'],
                        mod: 'r', writeerror: '403' },
                'cmi.student_preference._children': { defaultvalue: this.STUDENT_PREFERENCE_CHILDREN, mod: 'r',
                        writeerror: '402' },
                'cmi.student_preference.audio': { defaultvalue: this.def[scoId]['cmi.student_preference.audio'],
                        format: this.CMI_SINTEGER, range: this.AUDIO_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.student_preference.language': { defaultvalue: this.def[scoId]['cmi.student_preference.language'],
                        format: this.CMI_STRING_256, mod: 'rw', writeerror: '405' },
                'cmi.student_preference.speed': { defaultvalue: this.def[scoId]['cmi.student_preference.speed'],
                        format: this.CMI_SINTEGER, range: this.SPEED_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.student_preference.text': { defaultvalue: this.def[scoId]['cmi.student_preference.text'],
                        format: this.CMI_SINTEGER, range: this.TEXT_RANGE, mod: 'rw', writeerror: '405' },
                'cmi.interactions._children': { defaultvalue: this.INTERACTIONS_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.interactions._count': { mod: 'r', defaultvalue: '0', writeerror: '402' },
                'cmi.interactions.n.id': { pattern: this.CMI_INDEX, format: this.CMI_IDENTIFIER, mod: 'w', readerror: '404',
                        writeerror: '405' },
                'cmi.interactions.n.objectives._count': { pattern: this.CMI_INDEX, mod: 'r', defaultvalue: '0', writeerror: '402' },
                'cmi.interactions.n.objectives.n.id': { pattern: this.CMI_INDEX, format: this.CMI_IDENTIFIER, mod: 'w',
                        readerror: '404', writeerror: '405' },
                'cmi.interactions.n.time': { pattern: this.CMI_INDEX, format: this.CMI_TIME, mod: 'w', readerror: '404',
                        writeerror: '405' },
                'cmi.interactions.n.type': { pattern: this.CMI_INDEX, format: this.CMI_TYPE, mod: 'w', readerror: '404',
                        writeerror: '405' },
                'cmi.interactions.n.correct_responses._count': { pattern: this.CMI_INDEX, mod: 'r', defaultvalue: '0',
                        writeerror: '402' },
                'cmi.interactions.n.correct_responses.n.pattern': { pattern: this.CMI_INDEX, format: this.CMI_FEEDBACK,
                        mod: 'w', readerror: '404', writeerror: '405' },
                'cmi.interactions.n.weighting': { pattern: this.CMI_INDEX, format: this.CMI_DECIMAL,
                        range: this.WEIGHTING_RANGE, mod: 'w', readerror: '404', writeerror: '405' },
                'cmi.interactions.n.student_response': { pattern: this.CMI_INDEX, format: this.CMI_FEEDBACK, mod: 'w',
                        readerror: '404', writeerror: '405' },
                'cmi.interactions.n.result': { pattern: this.CMI_INDEX, format: this.CMI_RESULT, mod: 'w', readerror: '404',
                        writeerror: '405' },
                'cmi.interactions.n.latency': { pattern: this.CMI_INDEX, format: this.CMI_TIMESPAN, mod: 'w',
                        readerror: '404', writeerror: '405' },
                'nav.event': { defaultvalue: '', format: this.NAV_EVENT, mod: 'w', readerror: '404', writeerror: '405' }
            };

            this.currentUserData[scoId] = {};

            // Load default values.
            for (const element in this.dataModel[scoId]) {
                if (element.match(/\.n\./) === null) {
                    if (typeof this.dataModel[scoId][element].defaultvalue != 'undefined') {
                        this.currentUserData[scoId][element] = this.dataModel[scoId][element].defaultvalue;
                    }
                }
            }

            // Load initial user data for current SCO.
            for (const element in this.def[scoId]) {
                if (element.match(/\.n\./) === null) {
                    if (typeof this.dataModel[scoId][element].defaultvalue != 'undefined') {
                        this.currentUserData[scoId][element] = this.dataModel[scoId][element].defaultvalue;
                    } else if (typeof this.defExtra[scoId][element] != 'undefined') {
                        // Check in user data values.
                        this.currentUserData[scoId][element] = this.defExtra[scoId][element];
                    } else {
                        this.currentUserData[scoId][element] = '';
                    }
                }
            }

            // Load interactions and objectives, and init the counters.
            const expression = new RegExp(this.CMI_INDEX, 'g');

            for (const element in this.defExtra[scoId]) {
                let counterElement = '',
                    currentCounterIndex: any = 0,
                    elementDotFormat,
                    currentN;

                // This check for an indexed element. cmi.objectives.1.id or cmi.objectives_1.id.
                if (element.match(expression)) {
                    // Normalize to the expected value according the standard.
                    // Moodle stores this values using _n. instead .n.
                    elementDotFormat = element.replace(expression, '.$1.');
                    this.currentUserData[scoId][elementDotFormat] = this.defExtra[scoId][element];

                    // Get the correct counter and current index.
                    if (elementDotFormat.indexOf('cmi.evaluation.comments') === 0) {
                        counterElement = 'cmi.evaluation.comments._count';
                        currentCounterIndex = elementDotFormat.match(/.(\d+)./)[1];
                    } else if (elementDotFormat.indexOf('cmi.objectives') === 0) {
                        counterElement = 'cmi.objectives._count';
                        currentCounterIndex = elementDotFormat.match(/.(\d+)./)[1];
                    } else if (elementDotFormat.indexOf('cmi.interactions') === 0) {
                        if (elementDotFormat.indexOf('.objectives.') > 0) {
                            currentN = elementDotFormat.match(/cmi.interactions.(\d+)./)[1];
                            currentCounterIndex = elementDotFormat.match(/objectives.(\d+)./)[1];
                            counterElement = 'cmi.interactions.' + currentN + '.objectives._count';
                        } else if (elementDotFormat.indexOf('.correct_responses.') > 0) {
                            currentN = elementDotFormat.match(/cmi.interactions.(\d+)./)[1];
                            currentCounterIndex = elementDotFormat.match(/correct_responses.(\d+)./)[1];
                            counterElement = 'cmi.interactions.' + currentN + '.correct_responses._count';
                        } else {
                            counterElement = 'cmi.interactions._count';
                            currentCounterIndex = elementDotFormat.match(/.(\d+)./)[1];
                        }
                    }

                    if (counterElement) {
                        if (typeof this.currentUserData[scoId][counterElement] == 'undefined') {
                            this.currentUserData[scoId][counterElement] = 0;
                        }
                        // Check if we need to sum.
                        if (parseInt(currentCounterIndex) == parseInt(this.currentUserData[scoId][counterElement])) {
                            this.currentUserData[scoId][counterElement] = parseInt(this.currentUserData[scoId][counterElement]) + 1;
                        }
                        if (parseInt(currentCounterIndex) > parseInt(this.currentUserData[scoId][counterElement])) {
                            this.currentUserData[scoId][counterElement] = parseInt(currentCounterIndex) - 1;
                        }
                    }

                }
            }

            // Set default status.
            if (this.currentUserData[scoId]['cmi.core.lesson_status'] === '') {
                this.currentUserData[scoId]['cmi.core.lesson_status'] = 'not attempted';
            }

            // Define mode and credit.
            this.currentUserData[scoId]['cmi.core.credit'] = this.mode == AddonModScormProvider.MODENORMAL ? 'credit' : 'no-credit';
            this.currentUserData[scoId]['cmi.core.lesson_mode'] = this.mode;
        }
    }

    /**
     * Commit the changes.
     *
     * @param {string} param Param.
     * @return {string} "true" if success, "false" otherwise.
     */
    LMSCommit(param: string): string {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.errorCode = '0';
        if (param == '') {
            if (this.initialized) {
                const result = this.storeData(false);

                // Trigger TOC update.
                this.triggerEvent(AddonModScormProvider.UPDATE_TOC_EVENT);

                this.errorCode = result ? '0' : '101';

                // Conver to string representing a boolean.
                return result ? 'true' : 'false';
            } else {
                this.errorCode = '301';
            }
        } else {
            this.errorCode = '201';
        }

        return 'false';
    }

    /**
     * Finish the data model.
     *
     * @param {string} param Param.
     * @return {string} "true" if success, "false" otherwise.
     */
    LMSFinish(param: string): string {
        this.errorCode = '0';

        if (param == '') {
            if (this.initialized) {
                this.initialized = false;

                const result = this.storeData(true);
                if (this.getEl('nav.event') != '') {
                    if (this.getEl('nav.event') == 'continue') {
                        this.triggerEvent(AddonModScormProvider.LAUNCH_NEXT_SCO_EVENT);
                    } else {
                        this.triggerEvent(AddonModScormProvider.LAUNCH_PREV_SCO_EVENT);
                    }
                } else {
                    if (this.scorm.auto == '1') {
                        this.triggerEvent(AddonModScormProvider.LAUNCH_NEXT_SCO_EVENT);
                    }
                }

                this.errorCode = result ? '0' : '101';

                // Trigger TOC update.
                this.triggerEvent(AddonModScormProvider.UPDATE_TOC_EVENT);

                // Conver to string representing a boolean.
                return result ? 'true' : 'false';
            } else {
                this.errorCode = '301';
            }
        } else {
            this.errorCode = '201';
        }

        return 'false';
    }

    /**
     * Get diagnostic.
     *
     * @param  {string} param Param.
     * @return {string} Result.
     */
    LMSGetDiagnostic(param: string): string {
        if (param == '') {
            param = this.errorCode;
        }

        return param;
    }

    /**
     * Get the error message for a certain code.
     *
     * @param {string} param Error code.
     * @return {string} Error message.
     */
    LMSGetErrorString(param: string): string {
        if (param != '') {
            return this.ERROR_STRINGS[param];
        } else {
           return '';
        }
    }

    /**
     * Get the last error code.
     *
     * @return {string} Last error code.
     */
    LMSGetLastError(): string {
        return this.errorCode;
    }

    /**
     * Get the value of a certain element.
     *
     * @param {string} element Name of the element to get.
     * @return {string} Value.
     */
    LMSGetValue(element: string): string {
        this.errorCode = '0';

        if (this.initialized) {
            if (element != '') {
                const expression = new RegExp(this.CMI_INDEX, 'g'),
                    elementModel = String(element).replace(expression, '.n.');

                if (typeof this.dataModel[this.scoId][elementModel] != 'undefined') {
                    if (this.dataModel[this.scoId][elementModel].mod != 'w') {
                        this.errorCode = '0';

                        return this.getEl(element);
                    } else {
                        this.errorCode = this.dataModel[this.scoId][elementModel].readerror;
                    }
                } else {
                    const childrenStr = '._children',
                        countStr = '._count';

                    if (elementModel.substr(elementModel.length - childrenStr.length, elementModel.length) == childrenStr) {
                        const parentModel = elementModel.substr(0, elementModel.length - childrenStr.length);

                        if (typeof this.dataModel[this.scoId][parentModel] != 'undefined') {
                            this.errorCode = '202';
                        } else {
                            this.errorCode = '201';
                        }
                    } else if (elementModel.substr(elementModel.length - countStr.length, elementModel.length) == countStr) {
                        const parentModel = elementModel.substr(0, elementModel.length - countStr.length);

                        if (typeof this.dataModel[this.scoId][parentModel] != 'undefined') {
                            this.errorCode = '203';
                        } else {
                            this.errorCode = '201';
                        }
                    } else {
                        this.errorCode = '201';
                    }
                }
            } else {
                this.errorCode = '201';
            }
        } else {
            this.errorCode = '301';
        }

        return '';
    }

    /**
     * Initialize the data model.
     *
     * @param {string} param Param.
     * @return {string} "true" if initialized, "false" otherwise.
     */
    LMSInitialize(param: string): string {
        this.errorCode = '0';

        if (param == '') {
            if (!this.initialized) {
                this.initialized = true;
                this.errorCode = '0';

                return 'true';
            } else {
                this.errorCode = '101';
            }
        } else {
            this.errorCode = '201';
        }

        return 'false';
    }

    /**
     * Set the value of a certain element.
     *
     * @param {string} element Name of the element to set.
     * @param {any} value Value to set.
     * @return {string} "true" if success, "false" otherwise.
     */
    LMSSetValue(element: string, value: any): string {
        this.errorCode = '0';

        if (this.initialized) {
            if (element != '') {
                let expression = new RegExp(this.CMI_INDEX, 'g');
                const elementModel = String(element).replace(expression, '.n.');

                if (typeof this.dataModel[this.scoId][elementModel] != 'undefined') {
                    if (this.dataModel[this.scoId][elementModel].mod != 'r') {
                        expression = new RegExp(this.dataModel[this.scoId][elementModel].format);
                        value = value + '';

                        const matches = value.match(expression);

                        if (matches != null) {
                            // Create dynamic data model element.
                            if (element != elementModel) {

                                // Init default counters and values.
                                if (element.indexOf('cmi.objectives') === 0) {
                                    const currentN = element.match(/cmi.objectives.(\d+)./)[1],
                                        counterElement = 'cmi.objectives.' + currentN + '.score';

                                    if (typeof this.currentUserData[this.scoId][counterElement + '._children'] == 'undefined') {
                                        this.setEl(this.currentUserData[this.scoId][counterElement + '._children'],
                                                this.SCORE_CHILDREN);
                                        this.setEl(this.currentUserData[this.scoId][counterElement + '.raw'], '');
                                        this.setEl(this.currentUserData[this.scoId][counterElement + '.min'], '');
                                        this.setEl(this.currentUserData[this.scoId][counterElement + '.max'], '');
                                    }

                                } else if (element.indexOf('cmi.interactions') === 0) {
                                    const currentN = element.match(/cmi.interactions.(\d+)./)[1];
                                    let counterElement = 'cmi.interactions.' + currentN + '.objectives._count';

                                    if (typeof this.currentUserData[this.scoId][counterElement] == 'undefined') {
                                        this.setEl(counterElement, 0);
                                    }

                                    counterElement = 'cmi.interactions.' + currentN + '.correct_responses._count';
                                    if (typeof this.currentUserData[this.scoId][counterElement] == 'undefined') {
                                        this.setEl(counterElement, 0);
                                    }
                                }

                                const elementIndexes = element.split('.');
                                let subElement = 'cmi';

                                for (let i = 1; i < elementIndexes.length - 1; i++) {
                                    const elementIndex = elementIndexes[i];

                                    if (elementIndexes[i + 1].match(/^\d+$/)) {
                                        const counterElement = subElement + '.' + elementIndex + '._count';

                                        if (typeof this.currentUserData[this.scoId][counterElement] == 'undefined') {
                                            this.setEl(counterElement, 0);
                                        }

                                        if (elementIndexes[i + 1] == this.getEl(counterElement)) {
                                            const count = this.getEl(counterElement);
                                            this.setEl(counterElement, parseInt(count, 10) + 1);
                                        }

                                        if (elementIndexes[i + 1] > this.getEl(counterElement)) {
                                            this.errorCode = '201';
                                        }

                                        subElement = subElement.concat('.' + elementIndex + '.' + elementIndexes[i + 1]);
                                        i++;
                                    } else {
                                        subElement = subElement.concat('.' + elementIndex);
                                    }
                                }

                                element = subElement.concat('.' + elementIndexes[elementIndexes.length - 1]);
                            }

                            // Store data.
                            if (this.errorCode == '0') {
                                if (this.scorm.autocommit && !(this.timeout)) {
                                    this.timeout = setTimeout(this.LMSCommit.bind(this), 60000, ['']);
                                }

                                if (typeof this.dataModel[this.scoId][elementModel].range != 'undefined') {
                                    const range = this.dataModel[this.scoId][elementModel].range,
                                        ranges = range.split('#');

                                    value = value * 1.0;
                                    if ((value >= ranges[0]) && (value <= ranges[1])) {
                                        this.setEl(element, value);
                                        this.errorCode = '0';

                                        return 'true';
                                    } else {
                                        this.errorCode = this.dataModel[this.scoId][elementModel].writeerror;
                                    }
                                } else {
                                    if (element == 'cmi.comments') {
                                        this.setEl('cmi.comments', this.getEl('cmi.comments') + value);
                                    } else {
                                        this.setEl(element, value);
                                    }
                                    this.errorCode = '0';

                                    return 'true';
                                }
                            }
                        } else {
                            this.errorCode = this.dataModel[this.scoId][elementModel].writeerror;
                        }
                    } else {
                        this.errorCode = this.dataModel[this.scoId][elementModel].writeerror;
                    }
                } else {
                    this.errorCode = '201';
                }
            } else {
                this.errorCode = '201';
            }
        } else {
            this.errorCode = '301';
        }

        return 'false';
    }

    /**
     * Set a SCO ID.
     * The scoId is like a pointer to be able to retrieve the SCO default values and set the new ones in the overall SCORM
     * data structure.
     *
     * @param {number} scoId The new SCO id.
     */
    loadSco(scoId: number): void {
        this.scoId = scoId;
    }

    /**
     * Set the value of the given element in the non-persistent (current) user data.
     *
     * @param {string} el The element.
     * @param {any} value The value.
     */
    protected setEl(el: string, value: any): void {
        if (typeof this.currentUserData[this.scoId] == 'undefined') {
            this.currentUserData[this.scoId] = {};
        }

        this.currentUserData[this.scoId][el] = value;
    }

    /**
     * Set offline mode to true or false.
     *
     * @param {boolean} offline True if offline, false otherwise.
     */
    setOffline(offline: boolean): void {
        this.offline = offline;
    }

    /**
     * Persist the current user data (this is usually called by LMSCommit).
     *
     * @param {boolean} storeTotalTime If true, we need to calculate the total time too.
     * @return {boolean} True if success, false otherwise.
     */
    protected storeData(storeTotalTime?: boolean): boolean {
        let tracks;

        if (storeTotalTime) {
            if (this.getEl('cmi.core.lesson_status') == 'not attempted') {
                this.setEl('cmi.core.lesson_status', 'completed');
            }

            if (this.getEl('cmi.core.lesson_mode') == AddonModScormProvider.MODENORMAL) {
                if (this.getEl('cmi.core.credit') == 'credit') {
                    if (this.getEl('cmi.student_data.mastery_score') !== '' && this.getEl('cmi.core.score.raw') !== '') {
                        if (parseFloat(this.getEl('cmi.core.score.raw')) >=
                                parseFloat(this.getEl('cmi.student_data.mastery_score'))) {
                            this.setEl('cmi.core.lesson_status', 'passed');
                        } else {
                            this.setEl('cmi.core.lesson_status', 'failed');
                        }
                    }
                }
            }

            if (this.getEl('cmi.core.lesson_mode') == AddonModScormProvider.MODEBROWSE) {
                if (this.dataModel[this.scoId]['cmi.core.lesson_status'].defaultvalue == '' &&
                        this.getEl('cmi.core.lesson_status') == 'not attempted') {
                    this.setEl('cmi.core.lesson_status', 'browsed');
                }
            }

            tracks = this.collectData();
            tracks.push(this.totalTime());
        } else {
            tracks = this.collectData();
        }

        const success = this.scormProvider.saveTracksSync(this.scoId, this.attempt, tracks, this.scorm, this.offline,
                this.currentUserData);

        if (!this.offline && !success) {
            // Failure storing data in online. Go offline.
            this.offline = true;

            this.triggerEvent(AddonModScormProvider.GO_OFFLINE_EVENT);

            return this.scormProvider.saveTracksSync(this.scoId, this.attempt, tracks, this.scorm, this.offline,
                    this.currentUserData);
        }

        return success;
    }

    /**
     * Utility function for calculating the total time spent in the SCO.
     *
     * @return {any} Total time element.
     */
    protected totalTime(): any {
        const totalTime = this.addTime(this.getEl('cmi.core.total_time'), this.getEl('cmi.core.session_time'));

        return { element: 'cmi.core.total_time', value: totalTime };
    }

    /**
     * Convenience function to trigger events.
     *
     * @param {string} name Name of the event to trigger.
     */
    protected triggerEvent(name: string): void {
        this.eventsProvider.trigger(name, {
            scormId: this.scorm.id,
            scoId: this.scoId,
            attempt: this.attempt
        }, this.siteId);
    }
}
