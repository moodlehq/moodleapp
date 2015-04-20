/**
 * @fileoverview Mutax.
 */


goog.provide('ydn.db.base.Mutex');



/**
 * Create a new mutax with false state.
 * @constructor
 * @struct
 */
ydn.db.base.Mutex = function() {
  this.state_ = false;
};


/**
 * @type {boolean}
 * @private
 */
ydn.db.base.Mutex.prototype.state_ = false;


/**
 * Set mutex state to true.
 */
ydn.db.base.Mutex.prototype.up = function() {
  // console.log('mutex up')
  goog.asserts.assert(!this.state_, 'Mutex already up.');
  this.state_ = true;
};


/**
 * Set mutex state to false.
 */
ydn.db.base.Mutex.prototype.down = function() {
  // console.log('mutex down')
  goog.asserts.assert(this.state_, 'Mutex already down.');
  this.state_ = false;
};


/**
 * @return {boolean} mutex state.
 */
ydn.db.base.Mutex.prototype.state = function() {
  return this.state_;
};

