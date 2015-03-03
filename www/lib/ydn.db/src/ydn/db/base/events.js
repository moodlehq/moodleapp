/**
 * @fileoverview Event dispatch from Storage.
 *
 * User: kyawtun
 * Date: 20/10/12
 */


goog.provide('ydn.db.events.RecordEvent');
goog.provide('ydn.db.events.StorageEvent');
goog.provide('ydn.db.events.StoreEvent');
goog.provide('ydn.db.events.Types');
goog.require('goog.events.Event');


/**
 * Event types.
 *
 * Note: these event type string are exported.
 * @enum {string}
 */
ydn.db.events.Types = {
  READY: 'ready',
  ERROR: 'error',
  FAIL: 'fail',
  CREATED: 'created',
  DELETED: 'deleted',
  UPDATED: 'updated'
};



/**
 *
 * @param {ydn.db.events.Types} event_type event type.
 * @param {Object=} event_target target.
 * @extends {goog.events.Event}
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance} suppress closure-library code.
 */
ydn.db.events.Event = function(event_type, event_target) {
  goog.base(this, event_type, event_target);

};
goog.inherits(ydn.db.events.Event, goog.events.Event);


/**
 * @type {string}
 */
ydn.db.events.Event.prototype.store_name;


/**
 *
 * @return {string} effected store name.
 */
ydn.db.events.Event.prototype.getStoreName = function() {
  return this.store_name;
};



/**
 *
 * @param {ydn.db.events.Types} event_type type.
 * @param {Object} event_target event target.
 * @param {number} version source.
 * @param {number} old_version old version.
 * @param {Object} old_schema old schema read from the database.
 * @extends {ydn.db.events.Event}
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance} suppress closure-library code.
 */
ydn.db.events.StorageEvent = function(event_type, event_target, version,
                                      old_version, old_schema) {
  goog.base(this, event_type, event_target);
  this.version = version;
  this.oldVersion = old_version;
  this.old_schema_ = old_schema;
};
goog.inherits(ydn.db.events.StorageEvent, ydn.db.events.Event);


/**
 * @final
 * @type {string}
 */
ydn.db.events.StorageEvent.prototype.name = 'ReadyEvent';


/**
 *
 * @type {number}
 */
ydn.db.events.StorageEvent.prototype.version = NaN;


/**
 *
 * @type {number}
 */
ydn.db.events.StorageEvent.prototype.oldVersion = NaN;


/**
 *
 * @type {Object}
 */
ydn.db.events.StorageEvent.prototype.old_schema_ = null;


/**
 *
 * @return {number} return current version.
 */
ydn.db.events.StorageEvent.prototype.getVersion = function() {
  return this.version;
};


/**
 *
 * @return {number} return previous version.
 */
ydn.db.events.StorageEvent.prototype.getOldVersion = function() {
  return this.oldVersion;
};


/**
 * @return {Object} return schema read from the database.
 */
ydn.db.events.StorageEvent.prototype.getOldSchema = function() {
  return this.old_schema_;
};



/**
 * Storage error event.
 * @param {Object} event_target event target.
 * @param {Error} error error object in case of error.
 * @param {ydn.db.events.Types=} opt_type default to error.
 * @extends {ydn.db.events.Event}
 * @constructor
 * @struct
 */
ydn.db.events.StorageErrorEvent = function(event_target, error, opt_type) {
  var type = opt_type || ydn.db.events.Types.ERROR;
  goog.base(this, type, event_target);
  this.error = error;
};
goog.inherits(ydn.db.events.StorageErrorEvent, ydn.db.events.Event);


/**
 * @return {string}
 */
ydn.db.events.StorageErrorEvent.prototype.toString = function() {
  return this.name + ':' + (this.error ? this.error : '');
};


/**
 * @type {string}
 */
ydn.db.events.StorageErrorEvent.prototype.name = 'ErrorEvent';


/**
 *
 * @type {Error}
 */
ydn.db.events.StorageErrorEvent.prototype.error = null;


/**
 * @return {Error} return error if connection was an error.
 */
ydn.db.events.StorageErrorEvent.prototype.getError = function() {
  return this.error;
};



/**
 * Storage terminal fail event.
 * @param {Object} event_target event target.
 * @param {Error} error error object in case of error.
 * @extends {ydn.db.events.StorageErrorEvent}
 * @constructor
 * @struct
 */
ydn.db.events.StorageFailEvent = function(event_target, error) {
  goog.base(this, event_target, error, ydn.db.events.Types.FAIL);
};
goog.inherits(ydn.db.events.StorageFailEvent, ydn.db.events.StorageErrorEvent);


/**
 * @final
 * @type {string}
 */
ydn.db.events.StorageFailEvent.prototype.name = 'FailEvent';



/**
 *
 * @param {ydn.db.events.Types} event_type  type.
 * @param {Object} event_target target.
 * @param {string} store_name source.
 * @param {*} key source.
 * @param {*} value source.
 * @extends {ydn.db.events.Event}
 * @constructor
 * @struct
 */
ydn.db.events.RecordEvent = function(event_type, event_target, store_name, key,
                                     value) {
  goog.base(this, event_type, event_target);
  this.store_name = store_name;
  this.key = key;
  this.value = value;
};
goog.inherits(ydn.db.events.RecordEvent, ydn.db.events.Event);


/**
 * @final
 * @type {string}
 */
ydn.db.events.RecordEvent.prototype.name = 'RecordEvent';


/**
 *
 * @type {*}
 */
ydn.db.events.RecordEvent.prototype.key;


/**
 *
 * @type {*}
 */
ydn.db.events.RecordEvent.prototype.value;


/**
 *
 * @return {*} key.
 */
ydn.db.events.RecordEvent.prototype.getKey = function() {
  return this.key;
};


/**
 *
 * @return {*} value.
 */
ydn.db.events.RecordEvent.prototype.getValue = function() {
  return this.value;
};



/**
 *
 * @param {ydn.db.events.Types} event_type  type.
 * @param {Object} event_target target.
 * @param {string} store_name source.
 * @param {Array} keys source.
 * @param {Array=} opt_values source.
 * @extends {ydn.db.events.Event}
 * @constructor
 * @struct
 */
ydn.db.events.StoreEvent = function(event_type, event_target, store_name, keys,
                                    opt_values) {
  goog.base(this, event_type, event_target);
  this.store_name = store_name;
  this.keys = keys;
  this.values = opt_values;
};
goog.inherits(ydn.db.events.StoreEvent, ydn.db.events.Event);


/**
 * @final
 * @type {string}
 */
ydn.db.events.StoreEvent.prototype.name = 'StoreEvent';


/**
 *
 * @type {Array}
 */
ydn.db.events.StoreEvent.prototype.keys;


/**
 *
 * @type {Array|undefined}
 */
ydn.db.events.StoreEvent.prototype.values;


/**
 *
 * @return {*} get list of keys.
 */
ydn.db.events.StoreEvent.prototype.getKeys = function() {
  return this.keys;
};


/**
 *
 * @return {*} get list of values.
 */
ydn.db.events.StoreEvent.prototype.getValues = function() {
  return this.values;
};


