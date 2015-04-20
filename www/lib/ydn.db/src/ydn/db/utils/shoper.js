/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 14/10/13
 * Time: 12:47 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.Shoper');
goog.require('ydn.Hi');


/**
 * @param {string} name
 * @constructor
 */
ydn.Shoper = function(name) {
  /**
   * @type {string}
   * @private
   */
  this.name_ = name;
  /**
   * @type {Array.<ydn.Hi>}
   * @private
   */
  this.his_ = [];
};


/**
 * @param {string} name
 */
ydn.Shoper.prototype.addHi = function(name) {
  var hi = new ydn.Hi(name);
  this.his_.push(hi);
};


/**
 * greet
 */
ydn.Shoper.prototype.greet = function() {
  var s = '';
  for (var i = 0; i < this.his_.length; i++) {
    s += this.his_[i].greet() + ', ';
  }
  document.getElementById('msg').textContent = s;
};


goog.exportSymbol('ydn.Shoper', ydn.Shoper);
goog.exportProperty(ydn.Shoper.prototype, 'addHi', ydn.Shoper.prototype.addHi);
goog.exportProperty(ydn.Shoper.prototype, 'greet', ydn.Shoper.prototype.greet);