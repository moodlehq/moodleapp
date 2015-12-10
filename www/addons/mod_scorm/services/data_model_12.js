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

angular.module('mm.addons.mod_scorm')

/**
 * SCORM data model implementation for version 1.2.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormDataModel12
 */
.factory('$mmaModScormDataModel12', function($mmaModScorm, $mmEvents, $window, mmaModScormEventLaunchNextSco,
            mmaModScormEventLaunchPrevSco, mmaModScormEventUpdateToc) {
    var self = {};

    /**
     * Initialize the global SCORM API class.
     *
     * @param  {Object} scorm The SCORM object.
     * @param  {Number} scoId The SCO id.
     * @param  {Number} attempt The attempt number.
     * @param  {Number} userData The user default data.
     */
    function SCORMAPI(scorm, scoId, attempt, userData) {

        // Contains all the current values for all the data model elements for each SCO.
        var currentUserData = {};

        // Current SCO Id.
        this.scoId = scoId;

        // Standard Data Type Definition.
        CMIString256 = '^[\\u0000-\\uFFFF]{0,255}$';
        CMIString4096 = '^[\\u0000-\\uFFFF]{0,4096}$';
        CMITime = '^([0-2]{1}[0-9]{1}):([0-5]{1}[0-9]{1}):([0-5]{1}[0-9]{1})(\.[0-9]{1,2})?$';
        CMITimespan = '^([0-9]{2,4}):([0-9]{2}):([0-9]{2})(\.[0-9]{1,2})?$';
        CMIInteger = '^\\d+$';
        CMISInteger = '^-?([0-9]+)$';
        CMIDecimal = '^-?([0-9]{0,3})(\.[0-9]*)?$';
        CMIIdentifier = '^[\\u0021-\\u007E]{0,255}$';
        CMIFeedback = CMIString256; // This must be redefined.
        CMIIndex = '[._](\\d+).';

        // Vocabulary Data Type Definition.
        CMIStatus = '^passed$|^completed$|^failed$|^incomplete$|^browsed$';
        CMIStatus2 = '^passed$|^completed$|^failed$|^incomplete$|^browsed$|^not attempted$';
        CMIExit = '^time-out$|^suspend$|^logout$|^$';
        CMIType = '^true-false$|^choice$|^fill-in$|^matching$|^performance$|^sequencing$|^likert$|^numeric$';
        CMIResult = '^correct$|^wrong$|^unanticipated$|^neutral$|^([0-9]{0,3})?(\.[0-9]*)?$';
        NAVEvent = '^previous$|^continue$';

        // Children lists.
        cmi_children = 'core,suspend_data,launch_data,comments,objectives,student_data,student_preference,interactions';
        core_children = 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time';
        score_children = 'raw,min,max';
        comments_children = 'content,location,time';
        objectives_children = 'id,score,status';
        correct_responses_children = 'pattern';
        student_data_children = 'mastery_score,max_time_allowed,time_limit_action';
        student_preference_children = 'audio,language,speed,text';
        interactions_children = 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency';

        // Data ranges.
        score_range = '0#100';
        audio_range = '-1#100';
        speed_range = '-100#100';
        weighting_range = '-100#100';
        text_range = '-1#1';

        // Prepare the definition array containing the default values.
        var def = {};
        // We need an extra object that will contain the objectives and interactions data (all the .n. elements).
        var defExtra = {};

        userData.forEach(function(sco) {
            def[sco.scoid] = sco.defaultdata;
            defExtra[sco.scoid] = sco.userdata;
        });

        // The SCORM 1.2 data model.
        // Set up data model for each sco.
        var datamodel = {};
        for (var scoid in def){
            datamodel[scoid] = {
                'cmi._children':{'defaultvalue':cmi_children, 'mod':'r', 'writeerror':'402'},
                'cmi._version':{'defaultvalue':'3.4', 'mod':'r', 'writeerror':'402'},
                'cmi.core._children':{'defaultvalue':core_children, 'mod':'r', 'writeerror':'402'},
                'cmi.core.student_id':{'defaultvalue':def[scoid]['cmi.core.student_id'], 'mod':'r', 'writeerror':'403'},
                'cmi.core.student_name':{'defaultvalue':def[scoid]['cmi.core.student_name'], 'mod':'r', 'writeerror':'403'},
                'cmi.core.lesson_location':{'defaultvalue':def[scoid]['cmi.core.lesson_location'], 'format':CMIString256, 'mod':'rw', 'writeerror':'405'},
                'cmi.core.credit':{'defaultvalue':def[scoid]['cmi.core.credit'], 'mod':'r', 'writeerror':'403'},
                'cmi.core.lesson_status':{'defaultvalue':def[scoid]['cmi.core.lesson_status'], 'format':CMIStatus, 'mod':'rw', 'writeerror':'405'},
                'cmi.core.entry':{'defaultvalue':def[scoid]['cmi.core.entry'], 'mod':'r', 'writeerror':'403'},
                'cmi.core.score._children':{'defaultvalue':score_children, 'mod':'r', 'writeerror':'402'},
                'cmi.core.score.raw':{'defaultvalue':def[scoid]['cmi.core.score.raw'], 'format':CMIDecimal, 'range':score_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.core.score.max':{'defaultvalue':def[scoid]['cmi.core.score.max'], 'format':CMIDecimal, 'range':score_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.core.score.min':{'defaultvalue':def[scoid]['cmi.core.score.min'], 'format':CMIDecimal, 'range':score_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.core.total_time':{'defaultvalue':def[scoid]['cmi.core.total_time'], 'mod':'r', 'writeerror':'403'},
                'cmi.core.lesson_mode':{'defaultvalue':def[scoid]['cmi.core.lesson_mode'], 'mod':'r', 'writeerror':'403'},
                'cmi.core.exit':{'defaultvalue':def[scoid]['cmi.core.exit'], 'format':CMIExit, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.core.session_time':{'format':CMITimespan, 'mod':'w', 'defaultvalue':'00:00:00', 'readerror':'404', 'writeerror':'405'},
                'cmi.suspend_data':{'defaultvalue':def[scoid]['cmi.suspend_data'], 'format':CMIString4096, 'mod':'rw', 'writeerror':'405'},
                'cmi.launch_data':{'defaultvalue':def[scoid]['cmi.launch_data'], 'mod':'r', 'writeerror':'403'},
                'cmi.comments':{'defaultvalue':def[scoid]['cmi.comments'], 'format':CMIString4096, 'mod':'rw', 'writeerror':'405'},
                // Deprecated evaluation attributes.
                'cmi.evaluation.comments._count':{'defaultvalue':'0', 'mod':'r', 'writeerror':'402'},
                'cmi.evaluation.comments._children':{'defaultvalue':comments_children, 'mod':'r', 'writeerror':'402'},
                'cmi.evaluation.comments.n.content':{'defaultvalue':'', 'pattern':CMIIndex, 'format':CMIString256, 'mod':'rw', 'writeerror':'405'},
                'cmi.evaluation.comments.n.location':{'defaultvalue':'', 'pattern':CMIIndex, 'format':CMIString256, 'mod':'rw', 'writeerror':'405'},
                'cmi.evaluation.comments.n.time':{'defaultvalue':'', 'pattern':CMIIndex, 'format':CMITime, 'mod':'rw', 'writeerror':'405'},
                'cmi.comments_from_lms':{'mod':'r', 'writeerror':'403'},
                'cmi.objectives._children':{'defaultvalue':objectives_children, 'mod':'r', 'writeerror':'402'},
                'cmi.objectives._count':{'mod':'r', 'defaultvalue':'0', 'writeerror':'402'},
                'cmi.objectives.n.id':{'pattern':CMIIndex, 'format':CMIIdentifier, 'mod':'rw', 'writeerror':'405'},
                'cmi.objectives.n.score._children':{'pattern':CMIIndex, 'mod':'r', 'writeerror':'402'},
                'cmi.objectives.n.score.raw':{'defaultvalue':'', 'pattern':CMIIndex, 'format':CMIDecimal, 'range':score_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.objectives.n.score.min':{'defaultvalue':'', 'pattern':CMIIndex, 'format':CMIDecimal, 'range':score_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.objectives.n.score.max':{'defaultvalue':'', 'pattern':CMIIndex, 'format':CMIDecimal, 'range':score_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.objectives.n.status':{'pattern':CMIIndex, 'format':CMIStatus2, 'mod':'rw', 'writeerror':'405'},
                'cmi.student_data._children':{'defaultvalue':student_data_children, 'mod':'r', 'writeerror':'402'},
                'cmi.student_data.mastery_score':{'defaultvalue':def[scoid]['cmi.student_data.mastery_score'], 'mod':'r', 'writeerror':'403'},
                'cmi.student_data.max_time_allowed':{'defaultvalue':def[scoid]['cmi.student_data.max_time_allowed'], 'mod':'r', 'writeerror':'403'},
                'cmi.student_data.time_limit_action':{'defaultvalue':def[scoid]['cmi.student_data.time_limit_action'], 'mod':'r', 'writeerror':'403'},
                'cmi.student_preference._children':{'defaultvalue':student_preference_children, 'mod':'r', 'writeerror':'402'},
                'cmi.student_preference.audio':{'defaultvalue':def[scoid]['cmi.student_preference.audio'], 'format':CMISInteger, 'range':audio_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.student_preference.language':{'defaultvalue':def[scoid]['cmi.student_preference.language'], 'format':CMIString256, 'mod':'rw', 'writeerror':'405'},
                'cmi.student_preference.speed':{'defaultvalue':def[scoid]['cmi.student_preference.speed'], 'format':CMISInteger, 'range':speed_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.student_preference.text':{'defaultvalue':def[scoid]['cmi.student_preference.text'], 'format':CMISInteger, 'range':text_range, 'mod':'rw', 'writeerror':'405'},
                'cmi.interactions._children':{'defaultvalue':interactions_children, 'mod':'r', 'writeerror':'402'},
                'cmi.interactions._count':{'mod':'r', 'defaultvalue':'0', 'writeerror':'402'},
                'cmi.interactions.n.id':{'pattern':CMIIndex, 'format':CMIIdentifier, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.objectives._count':{'pattern':CMIIndex, 'mod':'r', 'defaultvalue':'0', 'writeerror':'402'},
                'cmi.interactions.n.objectives.n.id':{'pattern':CMIIndex, 'format':CMIIdentifier, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.time':{'pattern':CMIIndex, 'format':CMITime, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.type':{'pattern':CMIIndex, 'format':CMIType, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.correct_responses._count':{'pattern':CMIIndex, 'mod':'r', 'defaultvalue':'0', 'writeerror':'402'},
                'cmi.interactions.n.correct_responses.n.pattern':{'pattern':CMIIndex, 'format':CMIFeedback, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.weighting':{'pattern':CMIIndex, 'format':CMIDecimal, 'range':weighting_range, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.student_response':{'pattern':CMIIndex, 'format':CMIFeedback, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.result':{'pattern':CMIIndex, 'format':CMIResult, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'cmi.interactions.n.latency':{'pattern':CMIIndex, 'format':CMITimespan, 'mod':'w', 'readerror':'404', 'writeerror':'405'},
                'nav.event':{'defaultvalue':'', 'format':NAVEvent, 'mod':'w', 'readerror':'404', 'writeerror':'405'}
            };

            // Load initial user data for current SCO.
            for (var element in def[scoid]) {
                if (element.match(/\.n\./) === null) {
                    if (typeof datamodel[scoid][element].defaultvalue != 'undefined') {
                        currentUserData[scoid][element] = datamodel[scoid][element].defaultvalue;
                    } else if (typeof defExtra[scoid][element] != 'undefined') {
                        // Objectives and interactions are outside the default user data.
                        currentUserData[scoid][element] = defExtra[scoid][element];
                    } else {
                        currentUserData[scoid][element] = '';
                    }
                }
            }

            // Set default status.
            if (currentUserData[scoid]['cmi.core.lesson_status'] === '') {
                currentUserData[scoid]['cmi.core.lesson_status'] = 'not attempted';
            }
        }

        // API helper methods.

        /**
         * Get the value of the given element from the non-persistent (current) user data.
         *
         * @param  {String} el The element
         * @return {String}    The element value
         */
        function getEl(el) {
            if (typeof currentUserData[this.scoId][el] != 'undefined') {
                return currentUserData[this.scoId][el];
            }
            return '';
        }

        /**
         * Set the value of the given element in the non-persistent (current) user data.
         *
         * @param  {String} el The element
         * @param  {String} value The value
         */
        function setEl(el, value) {
            currentUserData[this.scoId][el] = value;
        }

        /**
         * Utility function for replacing dots with underscores (this is needed for sending the data via the WS).
         *
         * @param  {String} The string to be replaced
         * @return {String  The string with the dots replaced
         */
        function underscore(str) {
            str = String(str).replace(/.N/g,".");
            return str.replace(/\./g,"__");
        }

        /**
         * Utility function for cloning an object
         *
         * @param {Object} obj The object to  be cloned
         * @return {Object} The object cloned
         */
        function CloneObj(obj){
            if(obj == null || typeof(obj) != 'object') {
                return obj;
            }

            var temp = new obj.constructor(); // Changed (twice).
            for(var key in obj) {
                temp[key] = CloneObj(obj[key]);
            }

            return temp;
        }

        /**
         * Utility function for calculating the total time spent in the SCO.
         */
        function TotalTime() {
            total_time = AddTime(getEl('cmi.core.total_time'), getEl('cmi.core.session_time'));
            return {'element': underscore('cmi.core.total_time'), value: total_time};
        }

        /**
         * Persist the current user data (this is usually called by LMSCommit)
         *
         * @param {Bool} storetotaltime If true, we need to calculate the total time too
         * @return {Bool} [description]
         */
        function StoreData(storetotaltime) {
            if (storetotaltime) {
                if (getEl('cmi.core.lesson_status') == 'not attempted') {
                    setEl('cmi.core.lesson_status', 'completed');
                }
                if (getEl('cmi.core.lesson_mode') == 'normal') {
                    if (getEl('cmi.core.credit') == 'credit') {
                        if (getEl('cmi.student_data.mastery_score') !== '' && getEl('cmi.core.score.raw') !== '') {
                            if (parseFloat(getEl('cmi.core.score.raw')) >= parseFloat(getEl('cmi.student_data.mastery_score'))) {
                                setEl('cmi.core.lesson_status', 'passed');
                            } else {
                                setEl('cmi.core.lesson_status', 'failed');
                            }
                        }
                    }
                }
                if (getEl('cmi.core.lesson_mode') == 'browse') {
                    if (datamodel[scoid]['cmi.core.lesson_status'].defaultvalue == '' && getEl('cmi.core.lesson_status') == 'not attempted') {
                        setEl('cmi.core.lesson_status', 'browsed');
                    }
                }
                tracks = CollectData();
                tracks.push(TotalTime());
            } else {
                tracks = CollectData();
            }

            return $mmaModScorm.saveTracksSync(this.scoId, attempt, tracks);
        }

        /**
         * Collect all the user tracking data that must be persisted in the system, this is usually called by LMSCommit().
         *
         */
        function CollectData() {
            var data = [];
            for (var element in currentUserData[this.scoId]) {
                // Ommit for example the nav. elements.
                if (element.substr(0, 3) == 'cmi') {
                    expression = new RegExp(CMIIndex,'g');

                    // Get the generic name for this element (e.g. convert 'cmi.interactions.1.id' to 'cmi.interactions.n.id')
                    elementmodel = String(element).replace(expression,'.n.');

                    // Ignore the session time element.
                    if (element != "cmi.core.session_time") {

                        // Check if this specific element is not defined in the datamodel,
                        // but the generic element name is.
                        if (typeof datamodel[scoid][element] == "undefined" &&
                                typeof datamodel[scoid][elementmodel] != "undefined") {

                            // Add this specific element to the data model (by cloning
                            // the generic element) so we can track changes to it.
                            datamodel[scoid][element] = CloneObj(datamodel[scoid][elementmodel]);
                        }

                        // Check if the current element exists in the datamodel.
                        if (typeof datamodel[scoid][element] != "undefined") {

                            // Make sure this is not a read only element.
                            if (datamodel[scoid][element].mod != 'r') {

                                var el = {
                                    'element': underscore(element),
                                    'value': getEl(element)
                                };

                                // Check if the element has a default value.
                                if (typeof datamodel[scoid][element].defaultvalue != "undefined") {

                                    // Check if the default value is different from the current value.
                                    if (datamodel[scoid][element].defaultvalue != el['value'] ||
                                            typeof datamodel[scoid][element].defaultvalue != typeof(el['value'])) {

                                        data.push(el);

                                        // Update the element default to reflect the current committed value.
                                        datamodel[scoid][element].defaultvalue = el['value'];
                                    }
                                } else {
                                    data.push(el);
                                    // No default value for the element, so set it now.
                                    datamodel[scoid][element].defaultvalue = el['value'];
                                }
                            }
                        }
                    }
                }

            }
            return data;
        }

        // API methods now.
        var initialized = false;
        var errorCode;
        var timeout;

        this.LMSInitialize = function(param) {
            errorCode = "0";
            if (param == "") {
                if (!initialized) {
                    initialized = true;
                    errorCode = "0";
                    return "true";
                } else {
                    errorCode = "101";
                }
            } else {
                errorCode = "201";
            }

            return "false";
        };

        this.LMSFinish = function(param) {
            errorCode = "0";
            if (param == "") {
                if (initialized) {
                    initialized = false;
                    result = StoreData(true);
                    if (getEl('nav.event') != '') {
                        if (getEl('nav.event') == 'continue') {
                            $mmEvents.trigger(mmaModScormEventLaunchNextSco);
                        } else {
                            $mmEvents.trigger(mmaModScormEventLaunchPrevSco);
                        }
                    } else {
                        if (scorm.auto == '1') {
                            $mmEvents.trigger(mmaModScormEventLaunchNextSco);
                        }
                    }
                    errorCode = (result) ? '0' : '101';

                    // Trigger TOC update.
                    $mmEvents.trigger(mmaModScormEventUpdateToc, {
                        scormid: scorm.id,
                        scoid: this.scoId,
                        attempt: attempt
                    });
                    return result;
                } else {
                    errorCode = "301";
                }
            } else {
                errorCode = "201";
            }
            return "false";
        };

        this.LMSGetValue = function(element) {
            errorCode = "0";
            if (initialized) {
                if (element != "") {
                    expression = new RegExp(CMIIndex,'g');
                    elementmodel = String(element).replace(expression,'.n.');
                    if (typeof datamodel[scoid][elementmodel] != "undefined") {
                        if (datamodel[scoid][elementmodel].mod != 'w') {
                            errorCode = "0";
                            return getEl(element);
                        } else {
                            errorCode = datamodel[scoid][elementmodel].readerror;
                        }
                    } else {
                        childrenstr = '._children';
                        countstr = '._count';
                        if (elementmodel.substr(elementmodel.length - childrenstr.length,elementmodel.length) == childrenstr) {
                            parentmodel = elementmodel.substr(0,elementmodel.length - childrenstr.length);
                            if (typeof datamodel[scoid][parentmodel] != "undefined") {
                                errorCode = "202";
                            } else {
                                errorCode = "201";
                            }
                        } else if (elementmodel.substr(elementmodel.length - countstr.length,elementmodel.length) == countstr) {
                            parentmodel = elementmodel.substr(0,elementmodel.length - countstr.length);
                            if (typeof datamodel[scoid][parentmodel] != "undefined") {
                                errorCode = "203";
                            } else {
                                errorCode = "201";
                            }
                        } else {
                            errorCode = "201";
                        }
                    }
                } else {
                    errorCode = "201";
                }
            } else {
                errorCode = "301";
            }
            return "";
        };

        this.LMSSetValue = function(element, value) {
            errorCode = "0";
            if (initialized) {
                if (element != "") {
                    expression = new RegExp(CMIIndex,'g');
                    elementmodel = String(element).replace(expression,'.n.');
                    if (typeof datamodel[scoid][elementmodel] != "undefined") {
                        if (datamodel[scoid][elementmodel].mod != 'r') {
                            expression = new RegExp(datamodel[scoid][elementmodel].format);
                            value = value + '';
                            matches = value.match(expression);
                            if (matches != null) {
                                // Create dynamic data model element.
                                if (element != elementmodel) {

                                    elementIndexes = element.split('.');
                                    subelement = 'cmi';
                                    for (i = 1; i < elementIndexes.length - 1; i++) {
                                        elementIndex = elementIndexes[i];
                                        if (elementIndexes[i + 1].match(/^\d+$/)) {
                                            if ((typeof eval(subelement + '.' + elementIndex)) == "undefined") {
                                                setEl(subelement + '.' + elementIndex + '._count', 0);
                                            }
                                            if (elementIndexes[i + 1] == getEl(subelement + '.' + elementIndex + '._count')) {
                                                var count = getEl(subelement + '.' + elementIndex + '._count');
                                                setEl(subelement + '.' + elementIndex + '._count', count + 1);
                                            }
                                            if (elementIndexes[i + 1] > getEl(subelement + '.' + elementIndex + '._count')) {
                                                errorCode = "201";
                                            }
                                            subelement = subelement.concat('.' + elementIndex + '_' + elementIndexes[i + 1]);
                                            i++;
                                        } else {
                                            subelement = subelement.concat('.' + elementIndex);
                                        }

                                        if (typeof currentUserData[this.scoId][subelement] == "undefined") {
                                            if (subelement.substr(0,14) == 'cmi.objectives') {
                                                setEl(subelement + '.score._children', score_children);
                                                setEl(subelement + '.score.raw', '');
                                                setEl(subelement + '.score.min', '');
                                                setEl(subelement + '.score.max', '');
                                            }
                                            if (subelement.substr(0,16) == 'cmi.interactions') {
                                                setEl(subelement + '.objectives._count', 0);
                                                setEl(subelement + '.correct_responses._count', 0);
                                            }
                                        }
                                    }
                                    element = subelement.concat('.' + elementIndexes[elementIndexes.length - 1]);
                                }
                                //Store data
                                if (errorCode == "0") {
                                    if (scorm.autocommit && !(timeout)) {
                                        timeout = setTimeout(this.LMSCommit, 60000, [""]);
                                    }
                                    if (typeof datamodel[scoid][elementmodel].range != "undefined") {
                                        range = datamodel[scoid][elementmodel].range;
                                        ranges = range.split('#');
                                        value = value * 1.0;
                                        if ((value >= ranges[0]) && (value <= ranges[1])) {
                                            setEl(element, value);
                                            errorCode = "0";
                                            return "true";
                                        } else {
                                            errorCode = datamodel[scoid][elementmodel].writeerror;
                                        }
                                    } else {
                                        if (element == 'cmi.comments') {
                                            setEl('cmi.comments', getEl('cmi.comments') + value);
                                        } else {
                                            setEl(element, value);
                                        }
                                        errorCode = "0";
                                        return "true";
                                    }
                                }
                            } else {
                                errorCode = datamodel[scoid][elementmodel].writeerror;
                            }
                        } else {
                            errorCode = datamodel[scoid][elementmodel].writeerror;
                        }
                    } else {
                        errorCode = "201";
                    }
                } else {
                    errorCode = "201";
                }
            } else {
                errorCode = "301";
            }
            return "false";
        };

        this.LMSCommit = function(param) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            errorCode = "0";
            if (param == "") {
                if (initialized) {
                    result = StoreData(false);
                    // Trigger TOC update.
                    $mmEvents.trigger(mmaModScormEventUpdateToc, {
                        scormid: scorm.id,
                        scoid: this.scoId,
                        attempt: attempt
                    });

                    errorCode = result ? '0' : '101';
                    return result;
                } else {
                    errorCode = "301";
                }
            } else {
                errorCode = "201";
            }
            return "false";
        };

        this.LMSGetLastError = function() {
            return errorCode;
        };

        var errorString = [];
        errorString["0"] = "No error";
        errorString["101"] = "General exception";
        errorString["201"] = "Invalid argument error";
        errorString["202"] = "Element cannot have children";
        errorString["203"] = "Element not an array - cannot have count";
        errorString["301"] = "Not initialized";
        errorString["401"] = "Not implemented error";
        errorString["402"] = "Invalid set value, element is a keyword";
        errorString["403"] = "Element is read only";
        errorString["404"] = "Element is write only";
        errorString["405"] = "Incorrect data type";

        this.LMSGetErrorString = function(param) {
            if (param != "") {
                return errorString[param];
            } else {
               return "";
            }
        };

        this.LMSGetDiagnostic = function(param) {
            if (param == "") {
                param = errorCode;
            }
            return param;
        };
    }


    /**
     * Prepare the datamodel for SCORM 1.2 populating all the required data.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#initAPI
     *
     * @param  {Object} scorm The SCORM object.
     * @param  {Number} scoId The SCO id.
     * @param  {Number} attempt The attempt number.
     * @param  {Number} userData The user default data.
     */
    self.initAPI = function(scorm, scoId, attempt, userData) {
        $window.API = new SCORMAPI(scorm, scoId, attempt, userData);
    };

    /**
     * Set a different SCO id for the current API object.
     * The scoId is like a pointer to be able to retrieve the SCO default values and set the new ones in the overall SCORM data structure
     *
     * @param  {Number} scoId The new SCO id.
     */
    self.loadSco = function(scoId) {
        $window.API.scoId = scoId;
    };

    return self;
});
