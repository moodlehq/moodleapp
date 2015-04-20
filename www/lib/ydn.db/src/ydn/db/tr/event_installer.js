/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
 */
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Install events.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */
goog.provide('ydn.db.tr.events');
goog.require('goog.debug.ErrorHandler');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventWrapper');
goog.require('ydn.db.tr.Storage');


/**
 * @protected
 * @return {!goog.events.EventTarget}
 */
ydn.db.tr.Storage.prototype.getEventTarget = function() {
  if (!this.event_target) {
    this.event_target = new goog.events.EventTarget();
  }
  return /** @type {!goog.events.EventTarget} */ (this.event_target);
};


/**
 * Adds an event listener to the event target. The same handler can only be
 * added once per the type. Even if you add the same handler multiple times
 * using the same type then it will only be called once when the event is
 * dispatched.
 *
 * @param {string} type The type of the event to listen for.
 * @param {Function} handler The function to handle the event. The
 *     handler can also be an object that implements the handleEvent method
 *     which takes the event object as argument.
 * @param {boolean=} opt_capture In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase
 *     of the event.
 * @param {Object=} opt_handlerScope Object in whose scope to call
 *     the listener.
 */
ydn.db.tr.Storage.prototype.addEventListener = function(type, handler,
    opt_capture, opt_handlerScope) {
  if (type == 'ready') {
    // remove callback reference since 'ready' event is invoked only once.
    goog.events.listenOnce(this.getEventTarget(), type, handler, opt_capture,
        opt_handlerScope);
  } else {
    if (goog.DEBUG) {// don't allow to added non existing event type
      var event_types = this.getEventTypes();
      var checkType = function(type) {
        if (!goog.array.contains(event_types,
            type)) {
          throw new ydn.debug.error.ArgumentException('Invalid event type "' +
              type + '"');
        }
      };
      if (goog.isArrayLike(type)) {
        for (var i = 0; i < type.length; i++) {
          checkType(type[i]);
        }
      } else {
        checkType(type);
      }
    }
    goog.events.listen(this.getEventTarget(), type, handler, opt_capture,
        opt_handlerScope);
  }
};


/**
 * Removes an event listener from the event target. The handler must be the
 * same object as the one added. If the handler has not been added then
 * nothing is done.
 *
 * @param {string} type The type of the event to listen for.
 * @param {Function} handler The function to handle the event. The
 *     handler can also be an object that implements the handleEvent method
 *     which takes the event object as argument.
 * @param {boolean=} opt_capture In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase
 *     of the event.
 * @param {Object=} opt_handlerScope Object in whose scope to call
 *     the listener.
 */
ydn.db.tr.Storage.prototype.removeEventListener = function(
    type, handler, opt_capture, opt_handlerScope) {
  goog.events.unlisten(this.getEventTarget(), type, handler, opt_capture, opt_handlerScope);
};


/**
 * @inheritDoc
 */
ydn.db.tr.Storage.prototype.dispatchDbEvent = function(event) {
  this.getEventTarget().dispatchEvent(event);
};

