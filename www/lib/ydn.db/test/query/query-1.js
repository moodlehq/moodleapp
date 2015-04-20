
(function() {

  var store_inline = 'ts';    // in-line key store
  var store_outline = 'ts2'; // out-of-line key store
  var store_inline_auto = 'ts3'; // in-line key + auto
  var store_outline_auto = 'ts4'; // out-of-line key + auto
  var store_inline_index = 'ts6';    // in-line key store
  var db_type;


  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id'},
      {
        name: store_outline},
      {
        name: store_inline_auto,
        keyPath: 'id',
        autoIncrement: true},
      {
        name: store_outline_auto,
        autoIncrement: true
      },
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


  var db_name = 'test_query_count';
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
      db_type = _db.getType();
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
        ydn.db.deleteDatabase(db_r.getName(), db_r.getType());
        db_r.close();
      }
    }
  };

  module('query,count', test_env);
  reporter.createTestSuite('query', 'count');

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

  var db_name = 'test_query_to_list';
  var test_count = 0;
  var df = $.Deferred();
  var store_inline = 'st0';
  var store_outline = 'st1';
  var store_inline_auto = 'st2';
  var store_outline_auto = 'st3';
  var store_inline_index = 'st4';


  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id'},
      {
        name: store_outline},
      {
        name: store_inline_auto,
        keyPath: 'id',
        autoIncrement: true},
      {
        name: store_outline_auto,
        autoIncrement: true
      },
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
  var test_env = {
    setup: function() {
      db = new ydn.db.Storage(db_name, schema_1, options);
    },
    teardown: function() {
      var type = db.getType();
      test_count++;
      db.close();
      if (test_count == 4) {
        ydn.db.deleteDatabase(db.getName(), type);
      }
    }
  };

  module('query,list', test_env);
  reporter.createTestSuite('query', 'list');
  var sorted_objs = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var keys = objs.map(function(x) {return x.id;});

  asyncTest('primary key range', 3, function() {
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

  asyncTest('ordering', 5, function() {
    df.always(function() {

      var q = db.from(store_inline_index);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, objs, 'natural order');
      });

      q = db.from(store_inline_index).order('value');
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, sorted_objs, 'simple index order');
      });

      q = db.from(store_inline_index).where('value', '>=', 2, '<=', 4);
      q = q.order('value');
      q.list().always(function(x) {
        //console.log(q)
        var result = objs.filter(function(x) {
          return x.value >= 2 && x.value <= 4;
        }).sort(function(a, b) {
          return a.value > b.value ? 1 : a.value == b.value ? 0 : -1;
        });
        deepEqual(x, result, 'closed bound');
      });

      q = db.from(store_inline_index).where('name', '>', 'a');
      throws(function() {
        q = q.order('value');
      }, Error, 'impossible ordering'
      );

      q = db.from(store_inline_index).where('name', '=', 'a');
      q = q.order('value');
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, [objs[2], objs[0], objs[1]], 'compound order');
        start();
      });

    });
  });

  asyncTest('primary keys by key range', 3, function() {
    df.always(function() {

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
  });

})();



(function() {

  var db_name = 'test_query_to_list-2';
  var test_count = 0;
  var df = $.Deferred();

  var store_inline = 'st0';
  var store_outline = 'st1';
  var store_inline_auto = 'st2';
  var store_outline_auto = 'st3';
  var store_inline_index = 'st4';


  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id'},
      {
        name: store_outline},
      {
        name: store_inline_auto,
        keyPath: 'id',
        autoIncrement: true},
      {
        name: store_outline_auto,
        autoIncrement: true
      },
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

  module('query,query', {
    setup: function() {
      db = new ydn.db.Storage(db_name, schema_1, options);
    },
    teardown: function() {
      var type = db.getType();
      test_count++;
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    }
  });
  reporter.createTestSuite('query', 'query');
  var sorted_objs = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var keys = objs.map(function(x) {return x.id;});

  asyncTest('unique index', 1, function() {
    df.always(function() {
      var q = db.from(store_inline_index).select('tags').unique(true);
      q.list().always(function(x) {
        //console.log(q)
        deepEqual(x, ['a', 'b', 'c'], 'unique index keys');
        start();
      });

    });
  });


})();



(function() {

  var db_name = 'test_query_patch';
  var test_count = 0;
  var df = $.Deferred();

  var store_inline = 'st0';
  var store_outline = 'st1';
  var store_inline_auto = 'st2';
  var store_outline_auto = 'st3';
  var store_inline_index = 'st4';


  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id'},
      {
        name: store_outline},
      {
        name: store_inline_auto,
        keyPath: 'id',
        autoIncrement: true},
      {
        name: store_outline_auto,
        autoIncrement: true
      },
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
        ydn.db.deleteDatabase(db.getName(), type);
      }
    }
  });
  reporter.createTestSuite('query', 'patch');
  var sorted_objs = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var keys = objs.map(function(x) {return x.id;});

  asyncTest('1. single', 3, function() {
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
          var obj = createPatch(2); obj.name = 'name';
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



