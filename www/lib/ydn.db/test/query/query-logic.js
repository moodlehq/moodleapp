

var db_name = 'test_query_logic';
var schema_1 = {
  version: 1,
  stores: [
    {
      name: 'st',
      keyPath: 'id',
      indexes: [
        {name: 'name'},
        {name: 'value'},
        {name: 'name-value', keyPath: ['name', 'value']}
      ]
    }
  ]
};
var db = new ydn.db.Storage(db_name, schema_1, options);

module('query,logic');
test('creating index query', function() {
  var q = db.from('st').select('name');
  var iter = q.getIterator();
  equal(iter.getStoreName(), 'st', 'store name');
  equal(iter.getIndexName(), 'name', 'index name');
  equal(iter.getKeyRange(), null, 'key range');
  equal(iter.isReversed(), false, 'reverse');
  equal(iter.isUnique(), false, 'unique');
});

test('creating unique index query', function() {
  var q = db.from('st').select('name').unique(true);
  var iter = q.getIterator();
  equal(iter.getIndexName(), 'name', 'index name');
  equal(iter.getKeyRange(), null, 'key range');
  equal(iter.isReversed(), false, 'reverse');
  equal(iter.isUnique(), true, 'unique');
});

test('creating reverse index query', function() {
  var q = db.from('st').select('name').reverse();
  var iter = q.getIterator();
  equal(iter.getIndexName(), 'name', 'index name');
  equal(iter.getKeyRange(), null, 'key range');
  equal(iter.isReversed(), true, 'reverse');
  equal(iter.isUnique(), false, 'unique');
});

test('creating key range index query', function() {
  var q = db.from('st');
  q = q.where('value', '>=', 3, '<', 5);
  var iter = q.getIterator();
  var kr = iter.getKeyRange();
  equal(iter.getStoreName(), 'st', 'store name');
  equal(iter.getIndexName(), 'value', 'index name');
  equal(kr.lower, 3, 'lower');
  equal(kr.lowerOpen, false, 'lowerOpen');
  equal(kr.lower, 3, 'upper');
  equal(kr.upperOpen, true, 'upperOpen');
  equal(iter.isReversed(), false, 'reverse');
  equal(iter.isUnique(), false, 'unique');
});

test('natural ordering', function() {
  var q = db.from('st');
  deepEqual(q.getOrder(), [], 'natural ordering');
});


test('primary key ordering', function() {
  var q = db.from('st').order('id');
  deepEqual(q.getOrder(), ['id'], 'order by primary key');
});

test('ordering by index', function() {
  var q = db.from('st').order('value');
  var iter = q.getIterator();
  equal(iter.getIndexName(), 'value', 'index');
  deepEqual(q.getOrder(), ['value']);
});

test('selection', function() {
  var q = db.from('st').select('name');
  deepEqual(q.getOrder(), ['name'], 'order by selection');
  var iter = q.getIterator();
  equal(iter.getIndexName(), 'name');
});


test('filtering and ordering', function() {
  var q = db.from('st').where('name', '=', 'a');
  q = q.order('value');
  var iter = q.getIterator();
  equal(iter.getIndexName(), 'name-value', 'filter and order');
});


ydn.db.deleteDatabase(db.getName(), db.getType());
db.close();




