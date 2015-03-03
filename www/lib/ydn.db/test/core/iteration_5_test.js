

goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation, db;

var store_name = 'st';
var objs = [
  {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
  {id:'qs1', value: 1, x: 2, tag: ['a']},
  {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
  {id:'bs1', value: 3, x: 6, tag: ['b']},
  {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
  {id:'bs3', value: 5, x: 111, tag: ['c']},
  {id:'st3', value: 6, x: 600}
];
var obj_schema = {
  stores: [
    {
      name: store_name,
      keyPath: 'id',
      type: 'TEXT',
      indexes: [{
        name: 'tag',
        type: 'TEXT',
        multiEntry: true
      }, {
        name: 'value',
        type: 'NUMERIC'
      }, {
        name: 'x',
        type: 'NUMERIC'
      }]
    }
  ]
};

var setUpPage = function() {

  var db_name = 'scan-test';
  db = new ydn.db.core.Storage(db_name, obj_schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });

}

var setUp = function() {
  objs = [
    {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
    {id:'qs1', value: 1, x: 2, tag: ['a']},
    {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
    {id:'bs1', value: 3, x: 6, tag: ['b']},
    {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, x: 111, tag: ['c']},
    {id:'st3', value: 6, x: 600}
  ];
  reachedFinalContinuation = false;
};


var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


tearDownPage = function() {
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
};




var test_open_value_iterator_update = function() {

  var objs = goog.array.range(4).map(function(i) {
    return {
      id: i,
      label: 'old-' + Math.random()
    };
  });
  var db_name = 'test_open_value_iterator-1';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var new_val = 'new-' + Math.random();
  var done, result, type;
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', objs).addBoth(function() {
    type = db.getType();
    //db.close();
    //var db2 = new ydn.db.core.Storage(db_name, schema, options);
    var iter = ydn.db.ValueIterator.where('st', '>=', 1, '<=', 2);
    var req = db.open(function(cursor) {
      var val = cursor.getValue();
      val.label = new_val;
      cursor.update(val);
    }, iter, 'readwrite');
    req.addBoth(function() {
      db.values('st').addBoth(function(x) {
        result = x;
        done = true;
        db.close();
      });
    });
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      objs[1].label = new_val;
      objs[2].label = new_val;
      assertArrayEquals('updated result', objs, result);
      ydn.db.deleteDatabase(db_name, type);
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout
};


var test_open_index_value_iterator = function() {

  var done;
  var streaming_keys = [];
  var streaming_eff_keys = [];
  var streaming_values = [];

  // for index value iterator, the reference value is primary key.
  var actual_values = objs.map(function(x) {return x});
  actual_values.sort(function(a, b) {
    return a > b ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_eff_keys = objs.map(function(x) {return x.value;});
  var q = new ydn.db.IndexValueIterator(store_name, 'value');

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('eff key', actual_eff_keys, streaming_eff_keys);
      assertArrayEquals('pri key', actual_keys, streaming_keys);
      assertArrayEquals('values', actual_values, streaming_values);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var req = db.open(function (cursor) {
    streaming_eff_keys.push(cursor.getKey());
    streaming_keys.push(cursor.getPrimaryKey());
    streaming_values.push(cursor.getValue());
  }, q);
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);

