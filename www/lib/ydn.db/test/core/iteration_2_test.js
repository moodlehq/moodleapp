

goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation;


var setUp = function() {

  reachedFinalContinuation = false;
};

var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_scan_cursor_resume = function() {
  var done1, done2;
  var keys1, values1;
  var keys2 = [];
  var values2 = [];

  var data = [{
    id: 1,
    msg: Math.random()
  }, {
    id: 2,
    msg: Math.random()
  }, {
    id: 3,
    msg: Math.random()
  }];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'NUMERIC'
    }]
  };
  var db_name = 'test_cursor_resume-2';
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put('st', data);
  var q = new ydn.db.ValueIterator('st');
  db.scan(function (keys, values) {
    keys1 = keys;
    values1 = values;
    done1 = true;
    return []; // break at first call
  }, [q]);

  db.scan(function (keys, values) {
    if (goog.isDefAndNotNull(keys[0])) {
      keys2.push(keys[0]);
      values2.push(values[0]);
    } else {
      done2 = true;
      return []; // break at first call
    }
  }, [q]);

  waitForCondition(
      // Condition
      function() {
        return done1;
      },
      function() {
        assertArrayEquals('keys1', [1], keys1);
        assertArrayEquals('values1', data.slice(0, 1), values1);
      },
      100, // interval
      1000); // maxTimeout


  waitForCondition(
      // Condition
      function() {
        return done2;
      },
      function() {
        assertArrayEquals('keys2', [2, 3], keys2);
        assertArrayEquals('values2', data.slice(1, 3), values2);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout
};


var test_scan_cursor_restart = function() {
  var done1;
  var keys1 = [];
  var values1 = [];

  var data = [{
    id: 1,
    msg: Math.random()
  }, {
    id: 2,
    msg: Math.random()
  }, {
    id: 3,
    msg: Math.random()
  }];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'NUMERIC'
    }]
  };
  var db_name = 'test_cursor_restart-1';
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put('st', data);
  var q = new ydn.db.ValueIterator('st');
  var restarted = false;
  db.scan(function (keys, values) {
    keys1.push(keys[0]);
    values1.push(values[0]);
    if (!restarted) {
      restarted = true;
      return {'restart': [true]};
    } else {
      done1 = true;
      return []; // end
    }
  }, [q]);


  waitForCondition(
      // Condition
      function() {
        return done1;
      },
      function() {
        assertArrayEquals('keys1', [1, 1], keys1);
        assertArrayEquals('values1', [data[0], data[0]], values1);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

};

var test_scan_cursor_index_iter_resume = function() {
  var done1, done2;
  var keys1, values1;
  var keys2 = [];
  var values2 = [];

  var data = [{
    id: 1,
    tag: 'z',
    msg: Math.random()
  }, {
    id: 2,
    tag: 'x',
    msg: Math.random()
  }, {
    id: 3,
    tag: 'y',
    msg: Math.random()
  }];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'NUMERIC',
      indexes: [
        {
          name: 'tag',
          type: 'TEXT'
        }]
    }]
  };
  var db_name = 'test_cursor_resume-3';
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.put('st', data);
  var q = new ydn.db.IndexIterator('st', 'tag');
  db.scan(function (keys, values) {
    keys1 = keys;
    values1 = values;
    done1 = true;
    return []; // break at first call
  }, [q]);

  db.scan(function (keys, values) {
    if (goog.isDefAndNotNull(keys[0])) {
      keys2.push(keys[0]);
      values2.push(values[0]);
    } else {
      done2 = true;
      return []; // break at first call
    }
  }, [q]);

  waitForCondition(
      // Condition
      function() {
        return done1;
      },
      function() {
        assertArrayEquals('keys1', ['x'], keys1);
        assertArrayEquals('values1', [2], values1);
      },
      100, // interval
      1000); // maxTimeout


  waitForCondition(
      // Condition
      function() {
        return done2;
      },
      function() {
        assertArrayEquals('keys2', ['y', 'z'], keys2);
        assertArrayEquals('values2', [3, 1], values2);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



