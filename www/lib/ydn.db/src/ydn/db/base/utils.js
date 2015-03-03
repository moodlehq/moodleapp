// Copyright 2012 YDN Authors. All Rights Reserved.
//
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
 * @fileoverview Utilities for encoding IDBKey and key comparison algorithm.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


/**
 * Portion of this code is obtained from Facebook Inc's IndexedDB-polyfill
 * project under Apache License 2.0.
 *
 * See also in https://github.com/mozilla/releases-mozilla-aurora/blob/master/
 * dom/indexedDB/Key.cpp for key encoding algorithm.
 */

goog.provide('ydn.db.utils');


/**
 * Grandfathered function to goog.object.getValueByKeys with supporting for
 * dotted key path.
 * Example usage: getValueByKeys(jsonObj, 'foo.entries')
 *
 * @param {!Object} obj An object to get the value from.  Can be array-like.
 * @param {...(string|number|!Array.<number|string>)} var_args A number of keys
 *     (as strings, or nubmers, for array-like objects).  Can also be
 *     specified as a single array of keys.
 * @return {IDBKey|undefined} The resulting value.  If, at any point, the value
 * for a key is undefined, returns undefined.
 * @see goog.object.getValueByKeys
 */
ydn.db.utils.getValueByKeys = function(obj, var_args) {
  var isArrayLike, keys;
  if (arguments.length == 2 && goog.isString(arguments[1])) {
    isArrayLike = true;
    keys = arguments[1].split('.');
  } else {
    isArrayLike = goog.isArrayLike(var_args);
    keys = isArrayLike ? var_args : arguments;
  }

  // Start with the 2nd parameter for the variable parameters syntax.
  for (var i = isArrayLike ? 0 : 1; i < keys.length; i++) {
    obj = obj[keys[i]];
    if (!goog.isDef(obj)) {
      break;
    }
  }

  return /** @type {IDBKey} */ (obj);
};


/**
 * Set object of given key path.
 * @param {Object} obj
 * @param {string} key_path doted key path.
 * @param {*} value value to set.
 */
ydn.db.utils.setValueByKeys = function(obj, key_path, value) {
  if (obj) {
    if (key_path.indexOf('.') == -1) {
      obj[key_path] = value;
      return;
    }
    var paths = key_path.split('.');
    var last_key = paths.pop();
    var key;
    while (key = paths.shift()) {
      if (!goog.isObject(obj[key])) {
        goog.asserts.assert(!goog.isDef(obj[key]), 'key "' + key +
            '" is not on path');
        obj[key] = {};
      }
      obj = obj[key];
    }
    obj[last_key] = value;
  }
};


/**
 * @const
 * @type {Object}
 */
ydn.db.utils.ARRAY_TERMINATOR = { };


/**
 * @const
 * @type {number}
 */
ydn.db.utils.BYTE_TERMINATOR = 0;


/**
 * @const
 * @type {number}
 */
ydn.db.utils.TYPE_NUMBER = 1;


/**
 * @const
 * @type {number}
 */
ydn.db.utils.TYPE_DATE = 2;


/**
 * @const
 * @type {number}
 */
ydn.db.utils.TYPE_STRING = 3;


/**
 * @const
 * @type {number}
 */
ydn.db.utils.TYPE_ARRAY = 4;


/**
 * @const
 * @type {number}
 */
ydn.db.utils.MAX_TYPE_BYTE_SIZE = 12; // NOTE: Cannot be greater than 255


/**
 *
 * @param {*} key key to encode.
 * @return {string} encoded key as string.
 */
ydn.db.utils.encodeKey = function(key) {
  var stack = [key], writer = new ydn.db.utils.HexStringWriter(), type = 0,
    dataType, obj;
  while ((obj = stack.pop()) !== undefined) {
    if (type % 4 === 0 && type + ydn.db.utils.TYPE_ARRAY >
      ydn.db.utils.MAX_TYPE_BYTE_SIZE) {
      writer.write(type);
      type = 0;
    }
    dataType = typeof obj;
    if (obj instanceof Array) {
      type += ydn.db.utils.TYPE_ARRAY;
      if (obj.length > 0) {
        stack.push(ydn.db.utils.ARRAY_TERMINATOR);
        var i = obj.length;
        while (i--) stack.push(obj[i]);
        continue;
      }
      else {
        writer.write(type);
      }
    }
    else if (dataType === 'number') {
      type += ydn.db.utils.TYPE_NUMBER;
      writer.write(type);
      ydn.db.utils.encodeNumber(writer, obj);
    }
    else if (obj instanceof Date) {
      type += ydn.db.utils.TYPE_DATE;
      writer.write(type);
      ydn.db.utils.encodeNumber(writer, obj.valueOf());
    }
    else if (dataType === 'string') {
      type += ydn.db.utils.TYPE_STRING;
      writer.write(type);
      ydn.db.utils.encodeString(writer, obj);
    }
    else if (obj === ydn.db.utils.ARRAY_TERMINATOR) {
      writer.write(ydn.db.utils.BYTE_TERMINATOR);
    }
    else return ''; // null;
    type = 0;
  }
  return writer.trim().toString();
};


/**
 *
 * @param {string} encodedKey key to decoded.
 * @return {IDBKey} decoded key.
 */
ydn.db.utils.decodeKey = function(encodedKey) {
  var rootArray = []; // one-element root array that contains the result
  var parentArray = rootArray;
  var type, arrayStack = [], depth, tmp;
  var reader = new ydn.db.utils.HexStringReader(encodedKey);
  while (reader.read() != null) {
    if (reader.current === 0) // end of array
    {
      parentArray = arrayStack.pop();
      continue;
    }
    if (reader.current === null) {
      return rootArray[0];
    }
    do
    {
      depth = reader.current / 4 | 0;
      type = reader.current % 4;
      for (var i = 0; i < depth; i++) {
        tmp = [];
        parentArray.push(tmp);
        arrayStack.push(parentArray);
        parentArray = tmp;
      }
      if (type === 0 && reader.current + ydn.db.utils.TYPE_ARRAY >
        ydn.db.utils.MAX_TYPE_BYTE_SIZE) {
        reader.read();
      }
      else break;
    } while (true);

    if (type === ydn.db.utils.TYPE_NUMBER) {
      parentArray.push(ydn.db.utils.decodeNumber(reader));
    }
    else if (type === ydn.db.utils.TYPE_DATE) {
      parentArray.push(new Date(ydn.db.utils.decodeNumber(reader)));
    }
    else if (type === ydn.db.utils.TYPE_STRING) {
      parentArray.push(ydn.db.utils.decodeString(reader)); // add new
    }
    else if (type === 0) // empty array case
    {
      parentArray = arrayStack.pop();
    }
  }
  return rootArray[0];
};

// Utils
/**
 * @const
 * @type {number}
 */
ydn.db.utils.p16 = 0x10000;
/**
 * @const
 * @type {number}
 */
ydn.db.utils.p32 = 0x100000000;
/**
 * @const
 * @type {number}
 */
ydn.db.utils.p48 = 0x1000000000000;
/**
 * @const
 * @type {number}
 */
ydn.db.utils.p52 = 0x10000000000000;
/**
 * @const
 * @type {number}
 */
ydn.db.utils.pNeg1074 = 5e-324;                      // 2^-1074);
/**
 * @const
 * @type {number}
 */
ydn.db.utils.pNeg1022 = 2.2250738585072014e-308;     // 2^-1022


/**
 *
 * @param {number} number
 * @return {Object} IEEE754 number.
 */
ydn.db.utils.ieee754 = function(number) {
  var s = 0, e = 0, m = 0;
  if (number !== 0) {
    if (isFinite(number)) {
      if (number < 0) {
        s = 1;
        number = -number;
      }
      var p = 0;
      if (number >= ydn.db.utils.pNeg1022) {
        var n = number;
        while (n < 1) {
          p--;
          n *= 2;
        }
        while (n >= 2) {
          p++;
          n /= 2;
        }
        e = p + 1023;
      }
      m = e ? Math.floor((number / Math.pow(2, p) - 1) * ydn.db.utils.p52) :
        Math.floor(number / ydn.db.utils.pNeg1074);
    }
    else {
      e = 0x7FF;
      if (isNaN(number)) {
        m = 2251799813685248; // QNan
      }
      else {
        if (number === -Infinity) s = 1;
      }
    }
  }
  return { sign: s, exponent: e, mantissa: m };
};


/**
 * @private
 * @param writer
 * @param number
 */
ydn.db.utils.encodeNumber = function(writer, number) {
  var iee_number = ydn.db.utils.ieee754(number);
  if (iee_number.sign) {
    iee_number.mantissa = ydn.db.utils.p52 - 1 - iee_number.mantissa;
    iee_number.exponent = 0x7FF - iee_number.exponent;
  }
  var word, m = iee_number.mantissa;

  writer.write((iee_number.sign ? 0 : 0x80) | (iee_number.exponent >> 4));
  writer.write((iee_number.exponent & 0xF) << 4 | (0 | m / ydn.db.utils.p48));

  m %= ydn.db.utils.p48;
  word = 0 | m / ydn.db.utils.p32;
  writer.write(word >> 8, word & 0xFF);

  m %= ydn.db.utils.p32;
  word = 0 | m / ydn.db.utils.p16;
  writer.write(word >> 8, word & 0xFF);

  word = m % ydn.db.utils.p16;
  writer.write(word >> 8, word & 0xFF);
};


/**
 * @private
 * @param reader
 * @return {*}
 */
ydn.db.utils.decodeNumber = function(reader) {
  var b = reader.read() | 0;
  var sign = b >> 7 ? false : true;

  var s = sign ? -1 : 1;

  var e = (b & 0x7F) << 4;
  b = reader.read() | 0;
  e += b >> 4;
  if (sign) e = 0x7FF - e;

  var tmp = [sign ? (0xF - (b & 0xF)) : b & 0xF];
  var i = 6;
  while (i--) tmp.push(sign ? (0xFF - (reader.read() | 0)) : reader.read() | 0);

  var m = 0;
  i = 7;
  while (i--) m = m / 256 + tmp[i];
  m /= 16;

  if (m === 0 && e === 0) return 0;
  return (m + 1) * Math.pow(2, e - 1023) * s;
};

/**
 * @const
 * @type {number}
 */
ydn.db.utils.secondLayer = 0x3FFF + 0x7F;

/**
 * @private
 * @param writer
 * @param string
 */
ydn.db.utils.encodeString = function(writer, string) {
  /* 3 layers:
   Chars 0         - 7E            are encoded as 0xxxxxxx with 1 added
   Chars 7F        - (3FFF+7F)     are encoded as 10xxxxxx xxxxxxxx with 7F
   subtracted
   Chars (3FFF+80) - FFFF          are encoded as 11xxxxxx xxxxxxxx xx000000
   */
  for (var i = 0; i < string.length; i++) {
    var code = string.charCodeAt(i);
    if (code <= 0x7E) {
      writer.write(code + 1);
    }
    else if (code <= ydn.db.utils.secondLayer) {
      code -= 0x7F;
      writer.write(0x80 | code >> 8, code & 0xFF);
    }
    else {
      writer.write(0xC0 | code >> 10, code >> 2 | 0xFF, (code | 3) << 6);
    }
  }
  writer.write(ydn.db.utils.BYTE_TERMINATOR);
};

/**
 * @private
 * @param reader
 * @return {string}
 */
ydn.db.utils.decodeString = function(reader) {
  var buffer = [], layer = 0, unicode = 0, count = 0, $byte, tmp;
  while (true) {
    $byte = reader.read();
    if ($byte === 0 || $byte == null) break;

    if (layer === 0) {
      tmp = $byte >> 6;
      if (tmp < 2 && !isNaN($byte)) { // kyaw: add !isNaN($byte)
        buffer.push(String.fromCharCode($byte - 1));
      }
      else // tmp equals 2 or 3
      {
        layer = tmp;
        unicode = $byte << 10;
        count++;
      }
    }
    else if (layer === 2) {
      buffer.push(String.fromCharCode(unicode + $byte + 0x7F));
      layer = unicode = count = 0;
    }
    else // layer === 3
    {
      if (count === 2) {
        unicode += $byte << 2;
        count++;
      }
      else // count === 3
      {
        buffer.push(String.fromCharCode(unicode | $byte >> 6));
        layer = unicode = count = 0;
      }
    }
  }
  return buffer.join('');
};

/**
 * @private
 * @param string
 * @constructor
 */
ydn.db.utils.HexStringReader = function(string) {
  this.current = null;
  this.string = string;
  this.lastIndex = this.string.length - 1;
  this.index = -1;
};

/**
 * @type {number?}
 */
ydn.db.utils.HexStringReader.prototype.current;

/**
 * @type {number}
 * @private
 */
ydn.db.utils.HexStringReader.prototype.index;

/**
 * @type {number}
 * @private
 */
ydn.db.utils.HexStringReader.prototype.lastIndex;

/**
 * @type {string}
 * @private
 */
ydn.db.utils.HexStringReader.prototype.string;


/**
 *
 * @return {number?}
 */
ydn.db.utils.HexStringReader.prototype.read = function() {

  return this.current = this.index < this.lastIndex ? parseInt(this.string[++this.index] +
    this.string[++this.index], 16) : null;
};

/**
 * @private
 * @constructor
 */
ydn.db.utils.HexStringWriter = function() {

  this.buffer = [];
  this.c = undefined;

};


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.utils.HexStringWriter.prototype.c;

/**
 * @type {Array}
 * @private
 */
ydn.db.utils.HexStringWriter.prototype.buffer;

/**
 *
 * @param $byte
 */
ydn.db.utils.HexStringWriter.prototype.write = function($byte) {
  for (var i = 0; i < arguments.length; i++) {
    this.c = arguments[i].toString(16);
    this.buffer.push(this.c.length === 2 ? this.c : this.c = '0' + this.c);
  }
};


/**
 *
 * @return {ydn.db.utils.HexStringWriter}
 */
ydn.db.utils.HexStringWriter.prototype.trim = function() {
  var length = this.buffer.length;
  while (this.buffer[--length] === '00') {}
  this.buffer.length = ++length;
  return this;
};


/**
 * @return {string}
 */
ydn.db.utils.HexStringWriter.prototype.toString = function() {
  return this.buffer.length ? this.buffer.join('') : '';
};


/**
 *
 * @param {*} first
 * @param {*} second
 * @return {number} returns 1 if the first key is
 * greater than the second, -1 if the first is less than the second, and 0 if
 * the first is equal to the second.
 */
ydn.db.utils.cmp = function (first, second) {
  var key1 = ydn.db.utils.encodeKey(first);
  var key2 = ydn.db.utils.encodeKey(second);
  return key1 > key2 ? 1 : (key1 == key2 ? 0 : -1);
};
