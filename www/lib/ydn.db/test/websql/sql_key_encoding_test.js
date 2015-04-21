
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, debug_console, db;


var setUp = function() {
  ydn.debug.log('ydn.db', 'finest');

  reachedFinalContinuation = false;

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var encoding_test = function(key) {
  var encodedKey = ydn.db.utils.encodeKey(key);
  var re_key = ydn.db.utils.decodeKey(encodedKey);
  //console.log([key, encodedKey]);
  if (goog.isArray(key)) {
    assertArrayEquals(key + ' ' + encodedKey, key, re_key)
  } else {
    assertEquals(key + ' ' + encodedKey, key, re_key);
  }

};

var test_encoding = function() {
  // these value are taken from FB polyfill test.
  encoding_test(0);
  encoding_test(2);  // "01C0"
  encoding_test(8);  // "01C020"
  encoding_test(8.3); // ["01C02099999999999A", 8.3]
  encoding_test(5.7); // ["01C016CCCCCCCCCCCD", 5.7]
  encoding_test('n2'); // "036F33"
  encoding_test('n3'); // ["036F34", "n3"]
  encoding_test([[2], 'abc']); // "09C000000000000000072441250008037C217E00000001C0390000000000000003626364"
  reachedFinalContinuation = true;
};


var starts_test = function (start, test, not_start) {
  var key_range = ydn.db.KeyRange.starts(start);
  var lower = ydn.db.utils.encodeKey(key_range.lower);
  var upper = ydn.db.utils.encodeKey(key_range.upper);
  var e_test = ydn.db.utils.encodeKey(test);
  var is_between = e_test <= upper && e_test >= lower;
  if (not_start) {
    assertFalse(test + ' is not between ' + key_range.lower + ' or ' + key_range.upper +
        ' because ' + (e_test <= upper) + ' and ' + (e_test >= lower),
        is_between);
  } else {
    assertTrue(key_range.lower + ' is > then ' + test, e_test <= upper);
    assertTrue(key_range.upper + ' is < then ' + test, e_test >= lower);
    assertTrue(test + ' is between ' + key_range.lower + ' or ' + key_range.upper,
        is_between);
  }
};

var test_starts = function() {
  starts_test('a', 'ab');
  starts_test('a', 'c', true);
  starts_test('b', 'a', true);
  starts_test('b', 'b');

  starts_test(['a'], ['a', 'b']);
  starts_test(['a'], ['b'], true);
  starts_test(['b'], ['a'], true);
  starts_test(['b'], ['b']);

  starts_test(['M'], ['M', 20]);

  reachedFinalContinuation = true;
};

var text_store = function(table_name, key) {


  var value = Math.random();

  var obj = {id: key, value: value};

  var done, result;
  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertTrue(table_name + ':' + key, goog.isObject(result));
        assertEquals(table_name + ':' + key, value, result.value);
        reachedFinalContinuation = true;

      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, obj).addCallback(function(id) {
    //console.log('put ' + id);
    db.get(table_name, key).addBoth(function(x) {
      //console.log('get ' + JSON.stringify(x));
      result = x;
      done = true;
    })

  });
};


var schema = {
  stores: [
    {
      name: 'st_text',
      keyPath: 'id',
      type: 'TEXT'
    }, {
      name: 'st_int',
      keyPath: 'id',
      type: 'INTEGER'
    }, {
      name: 'st_num',
      keyPath: 'id',
      type: 'NUMERIC'
    }, {
      name: 'st_date',
      keyPath: 'id',
      type: 'DATE'
    }, {
      name: 'st_array',
      keyPath: 'id',
      type: 'TEXT'
    }, {
      name: 'st_any',
      keyPath: 'id'
    }]
};


var test_text = function() {
  text_store('st_text', 'a');
};

var test_int = function() {
  text_store('st_int', 1);
};

var test_num = function() {
  text_store('st_num', 1.3);
};

var test_date = function() {
  var d = new Date();
  text_store('st_date', d);
};

var test_array = function() {
  text_store('st_array', ['1', 'b']);
};

var test_any_text = function() {
  text_store('st_any', 'a');
};

var test_any_int = function() {
  text_store('st_any', 1);
};

var test_any_num = function() {
  text_store('st_any', Math.random());
};


var setUpPage = function() {

  var dn_name = 'test_key_encoding_2';
  var options = {mechanisms: ['websql']};
  db = new ydn.db.Storage(dn_name, schema, options);
};


var tearDownPage = function() {
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



