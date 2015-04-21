(function() {

  var db_name = 'test_query_count';
  var store_inline = 'ts';    // in-line key store
  var store_inline_index = 'ts6';    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id'
      },
      {
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'name', type: 'TEXT'},
          {name: 'value', type: 'NUMERIC'},
          {name: 'name, value', keyPath: ['name', 'value']}
        ]
      }
    ]
  };
  var db_r;

  var df = $.Deferred();

  // persist store data.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, [
      {id: 1, value: 2, name: 'a' + Math.random()},
      {id: 2, value: 2, name: 'b' + Math.random()},
      {id: 3, value: 2, name: 'b' + Math.random()},
      {id: 4, value: 3, name: 'c' + Math.random()}
    ]);
    _db.clear(store_inline);
    _db.put(store_inline, [
      {id: 1, value: 'v' + Math.random()},
      {id: 2, value: 'v' + Math.random()},
      {id: 3, value: 'v' + Math.random()},
      {id: 4, value: 'v' + Math.random()}
    ]);
    _db.count(store_inline_index).always(function() {
      _db.close();
      setTimeout(function() {
        df.resolve();
      }, 100);
    });
  })();

  var test_count = 0;

  var test_env = {
    setup: function() {
      db_r = new ydn.db.Storage(db_name, schema_1, options);

    },
    teardown: function() {
      db_r.close();
      test_count++;
      if (test_count == 2) {
        var type = db_r.getType();
        ydn.db.deleteDatabase(db_name, type);
      }
    }
  };

  module('query,count', test_env);
  reporter.createTestSuite('query');

  asyncTest('primary key', 2, function() {

    df.always(function() {
      var q = db_r.from(store_inline);
      q.count().always(function(x) {
        equal(x, 4, 'all records');
      });

      q = db_r.from(store_inline, '>', 1, '<=', 3);
      q.count().always(function(x) {
        equal(x, 2, 'number of records in a bounded range');
        start();
      });
    });

  });

  asyncTest('by index iterator', 3, function() {
    df.always(function() {

      var value_iter = db_r.from(store_inline_index)
          .where('value', '>', 2, '<=', 3);
      value_iter.count().always(function(x) {
        //console.log('count value')
        equal(x, 1, 'number of values in the range');
      });

      var name_iter = db_r.from(store_inline_index).where('name', '^', 'b');
      name_iter.count().always(function(x) {
        equal(x, 2, 'number of name in the range');
      });

      var iter = db_r.from(store_inline_index).select('value').unique(true);
      iter.count().always(function(x) {
        equal(x, 2, 'unique count');
        start();
      });
    });

  });

})();


(function() {

  var db_name = 'test_query_to_list-1';
  var store_inline_index = 'ts6';    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id'
      }
    ]
  };
  var test_count = 0;
  var df = $.Deferred();

  var objs = [
    {test: 't' + Math.random(), value: 4, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 10, id: 1, name: 'a', tags: ['x']},
    {test: 't' + Math.random(), value: 0, id: 2, name: 'a', tags: ['z']},
    {test: 't' + Math.random(), value: 2, id: 3, name: 'bc',
      tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 2, id: 4, name: 'bc', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 8, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 2, id: 6, name: 'c', tags: ['a']}
  ];

  // persist store data.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, objs).always(function() {
      _db.close();
      setTimeout(function() {

        df.resolve();
      }, 100);
    });
  })();

  var db;
  var test_env = {
    setup: function() {
      db = new ydn.db.Storage(db_name, schema_1, options);
    },
    teardown: function() {
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db_name, type);
    }
  };

  module('query,list', test_env);
  reporter.createTestSuite('query');


  asyncTest('by primary key range', 3, function() {
    df.always(function() {
      var q = db.from(store_inline_index, '>=', 1, '<=', 3);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, objs.slice(1, 4), 'closed bound');
      });

      q.copy().reverse().list().always(function(x) {
        var exp = objs.slice(1, 4).reverse();
        deepEqual(x, exp, 'closed bound reverse');
      });

      q.copy().list(1).always(function(x) {
        deepEqual(x, objs.slice(1, 2), 'closed bound limit');
        start();
      });

    });
  });

})();


(function() {

  var store_inline_index = 'ts6';    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id',
        indexes: [{
          name: 'value'
        }]
      }
    ]
  };
  var test_count = 0;

  var objs = [
    {test: 't' + Math.random(), value: 14, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 10, id: 1, name: 'a', tags: ['x']},
    {test: 't' + Math.random(), value: 0, id: 2, name: 'a', tags: ['z']},
    {test: 't' + Math.random(), value: 13, id: 3, name: 'bc',
      tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 13, id: 4, name: 'bc', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 18, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 12, id: 6, name: 'c', tags: ['a']}
  ];

  var db;
  var test_env = {
    setup: function() {
      var db_name = 'test_query_to_list-' + Math.random();

      db = new ydn.db.Storage(db_name, schema_1, options);
      db.put(store_inline_index, objs).always(function() {

      });
    },
    teardown: function() {
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    }
  };

  module('query,list-key', test_env);
  reporter.createTestSuite('query');
  var keys = objs.map(function(x) {
    return x.id;
  });

  asyncTest('primary keys by key range', 3, function() {

    var q = db.from(store_inline_index, '>=', 1, '<=', 3);
    q.select('id').list().always(function(x) {
      // console.log(x, keys.slice(1, 4))
      deepEqual(x, keys.slice(1, 4), 'closed bound');
    });

    q.copy().reverse().select('id').list().always(function(x) {
      var exp = keys.slice(1, 4).reverse();
      deepEqual(x, exp, 'closed bound reverse');
    });

    q.copy().select('id').list(1).always(function(x) {
      deepEqual(x, keys.slice(1, 2), 'closed bound limit');
      start();
    });

  });


  var values = objs.map(function(x) {
    return x.values;
  }).sort();

  asyncTest('index keys by key range', 2, function() {

    var q = db.from(store_inline_index).where('value', '>=', 13, '<=', 14);
    q.select('value').list().always(function(x) {
      // console.log(x, keys.slice(1, 4))
      deepEqual(x, [13, 13, 14], 'closed bound - index');
    });

    q.select('id').list().always(function(x) {
      // console.log(x, keys.slice(1, 4))
      deepEqual(x, [3, 4, 0], 'closed bound - primary');
      start();
    });

  });

})();


(function() {

  var db_name = 'test_query_to_list-order-4';
  var store_inline_index = 'ts6';    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'name', type: 'TEXT'},
          {name: 'value', type: 'NUMERIC'},
          {name: 'name, value', keyPath: ['name', 'value']}
        ]
      }
    ]
  };
  var test_count = 0;

  var objs = [
    {test: 't' + Math.random(), value: 4, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 10, id: 1, name: 'a', tags: ['x']},
    {test: 't' + Math.random(), value: 0, id: 2, name: 'a', tags: ['z']},
    {test: 't' + Math.random(), value: 2, id: 3, name: 'bc',
      tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 2, id: 4, name: 'bc', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 8, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 2, id: 6, name: 'c', tags: ['a']}
  ];
  var cmp_value = function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  };

  var df = $.Deferred();
  var db = new ydn.db.Storage(db_name, schema_1, options);
  db.clear(store_inline_index);
  db.put(store_inline_index, objs).always(function() {
    df.resolve();
  });

  var test_env = {
    setup: function() {
    },
    teardown: function() {
      test_count++;
      if (test_count == 4) {
        db.close();
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
      }
    }
  };

  module('query,list-index', test_env);
  reporter.createTestSuite('query,list', 'list');
  var sorted_objs = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var keys = objs.map(function(x) {
    return x.id;
  });


  asyncTest('by index key range', 4, function() {
    df.always(function() {
      var q;

      q = db.from(store_inline_index).where('value', '>=', 2, '<=', 4);
      q.list().always(function(x) {
        //console.log(q)
        var result = objs.filter(function(x) {
          return x.value >= 2 && x.value <= 4;
        }).sort(cmp_value);
        deepEqual(x, result, 'closed bound');
      });

      q = db.from(store_inline_index).where('value', '<', 4);
      q.list().always(function(x) {
        //console.log(q)
        var result = objs.filter(function(x) {
          return x.value < 4;
        }).sort(cmp_value);
        deepEqual(x, result, 'open upperBound');
      });
      q = db.from(store_inline_index).where('value', '>=', 2, '<=', 4);
      var result_limit = objs.filter(function(x) {
        return x.value >= 2 && x.value <= 4;
      }).sort(cmp_value);
      q.list(2).always(function(x) {
        //console.log(q)
        deepEqual(x, result_limit.slice(0, 2), 'first limit');
        q.list().always(function(x) {
          //console.log(q)
          deepEqual(x, result_limit.slice(2), 'last limit');
          start();
        });
      });
    });

  });


  asyncTest('natural ordering', 2, function() {

    df.always(function() {

      var q = db.from(store_inline_index);
      q.list().always(function(x) {
        deepEqual(x, objs, 'natural order');
      });

      var q2 = db.from(store_inline_index).reverse();
      q2.list().always(function(x) {
        deepEqual(x, objs.reverse(), 'natural order reverse');
        start();
      });

    });

  });


  asyncTest('index ordering', 2, function() {

    df.always(function() {
      var q = db.from(store_inline_index).order('value');
      q.list().always(function(x) {
        deepEqual(x, sorted_objs, 'simple index order');
      });

      var q2 = db.from(store_inline_index).order('value').reverse();
      q2.list().always(function(x) {
        deepEqual(x, sorted_objs.reverse(), 'reverse index order');
        start();
      });

    });

  });


  asyncTest('ordering with key range', 1, function() {

    df.always(function() {

      var q = db.from(store_inline_index).where('value', '>=', 2, '<=', 4);
      // q = q.order('value');
      q.list().always(function(x) {
        //console.log(q)
        var result = objs.filter(function(x) {
          return x.value >= 2 && x.value <= 4;
        }).sort(function(a, b) {
              return a.value > b.value ? 1 : a.value < b.value ? -1 :
                  a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
            });
        deepEqual(x, result, 'closed bound');
        start()
      });
      /* TODO: make this test work
      q = db.from(store_inline_index).where('name', '>', 'a');
      throws(function() {
            q = q.order('value');
          }, Error, 'impossible ordering'
      );
      */
/* TODO: make this test work
      q = db.from(store_inline_index).where('name', '=', 'a');
      q = q.order('value');
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, [objs[2], objs[0], objs[1]], 'compound order');
        start();
      });
      */
    });

  });


})();


(function() {

  var store_inline_index = 'ts6';    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'tags', type: 'TEXT', multiEntry: true}
        ]
      }
    ]
  };

  var df = $.Deferred();

  var objs = [
    {test: 't' + Math.random(), value: 4, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 10, id: 1, name: 'a', tags: ['b']},
    {test: 't' + Math.random(), value: 0, id: 2, name: 'a', tags: ['a']},
    {test: 't' + Math.random(), value: 2, id: 3, name: 'bc',
      tags: ['a', 'b', 'c']},
    {test: 't' + Math.random(), value: 2, id: 4, name: 'bc', tags: ['a', 'c']},
    {test: 't' + Math.random(), value: 8, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 2, id: 6, name: 'c', tags: ['a']}
  ];
  var cmp_value = function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  };

  var db;

  module('query,query-unique', {
    setup: function() {
      var db_name = 'test_query_to_list-' + Math.random();
      var _db = new ydn.db.Storage(db_name, schema_1, options);
      _db.clear(store_inline_index);
      _db.put(store_inline_index, objs).always(function() {
        _db.close();
        db = new ydn.db.Storage(db_name, schema_1, options);
        df.resolve();
      });
    },
    teardown: function() {
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    }
  });
  reporter.createTestSuite('query');

  asyncTest('unique index', 2, function() {
    df.always(function() {
      var q = db.from(store_inline_index).select('tags').unique(true);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, ['a', 'b', 'c'], 'unique index keys');

      });

      q = db.from(store_inline_index).select('tags').unique(false);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, ["a",
          "a",
          "a",
          "a",
          "a",
          "b",
          "b",
          "b",
          "b",
          "c",
          "c"], 'non unique index keys');
        start();
      });


    });
  });


})();


(function() {

  var db_name = 'test_query_patch';
  var store_inline = 'ts';    // in-line key store
  var store_inline_index = 'ts6';    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id'},
      {
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'name', type: 'TEXT'},
          {name: 'value', type: 'NUMERIC'},
          {name: 'name, value', keyPath: ['name', 'value']},
          {name: 'tags', type: 'TEXT', multiEntry: true}
        ]
      }
    ]
  };
  var test_count = 0;
  var df = $.Deferred();

  var objs = [
    {test: 't' + Math.random(), value: 4, id: 0, name: 'a', tags: ['a', 'f']},
    {test: 't' + Math.random(), value: 10, id: 1, name: 'a', tags: ['f']},
    {test: 't' + Math.random(), value: 0, id: 2, name: 'a', tags: ['a']},
    {test: 't' + Math.random(), value: 2, id: 3, name: 'bc',
      tags: ['a', 'b', 'c']},
    {test: 't' + Math.random(), value: 2, id: 4, name: 'bc', tags: ['a', 'c']},
    {test: 't' + Math.random(), value: 8, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 2, id: 6, name: 'c', tags: ['a']}
  ];
  var cmp_value = function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  };

  // persist store data.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, objs);

    _db.count(store_inline_index).always(function() {
      _db.close();
      setTimeout(function() {
        df.resolve();
      }, 100);
    });
  })();

  var db;

  module('query,patch', {
    setup: function() {
      db = new ydn.db.Storage(db_name, schema_1, options);
    },
    teardown: function() {
      var type = db.getType();
      test_count++;
      db.close();
      if (test_count == 2) {
        ydn.db.deleteDatabase(db_name, type);
      }
    }
  });
  var sorted_objs = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var keys = objs.map(function(x) {
    return x.id;
  });

  asyncTest('single', 3, function() {
    var new_val = 'new-' + Math.random();
    var createPatch = function(id) {
      var new_obj = JSON.parse(JSON.stringify(objs[id]));
      new_obj.test = new_val;
      return new_obj;
    };
    df.always(function() {
      var q = db.from(store_inline_index, '=', 0);
      q.patch({test: new_val}).always(function() {
        db.get(store_inline_index, 0).always(function(x) {
          deepEqual(x, createPatch(0), 'by object');
        });
      });
      q = db.from(store_inline_index, '=', 1);
      q.patch('test', new_val).always(function() {
        db.get(store_inline_index, 1).always(function(x) {
          deepEqual(x, createPatch(1), 'by single field');
        });
      });
      q = db.from(store_inline_index, '=', 2);
      q.patch(['test', 'name'], [new_val, 'name']).always(function() {
        db.get(store_inline_index, 2).always(function(x) {
          var obj = createPatch(2);
          obj.name = 'name';
          deepEqual(x, obj, 'by fields');
          start();
        });
      });
    });

  });

  asyncTest('multiple', 2, function() {
    var new_val = 'new-' + Math.random();
    var createPatch = function(id) {
      var new_obj = JSON.parse(JSON.stringify(objs[id]));
      new_obj.test = new_val;
      return new_obj;
    };
    var exp = [createPatch(3), createPatch(4), createPatch(6)];
    var exp2 = [createPatch(0), createPatch(1)];
    df.always(function() {
      var q = db.from(store_inline_index).where('value', '=', 2);
      q.patch({test: new_val}).always(function() {
        db.values(store_inline_index, 'value', ydn.db.KeyRange.only(2)).always(function(x) {
          deepEqual(x, exp, 'by object');
        });
      });
      q = db.from(store_inline_index).where('tags', '=', 'f');
      q.patch('test', new_val).always(function() {
        db.values(store_inline_index, 'tags', ydn.db.KeyRange.only('f')).always(function(x) {
          deepEqual(x, exp2, 'by field');
          start();
        });
      });
    });

  });

})();


