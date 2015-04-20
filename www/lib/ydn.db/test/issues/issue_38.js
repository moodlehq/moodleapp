/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 8/12/12
 */

var initialSchema   = {
  version: 1,
  stores: [
    {
      name: 'color',
      keyPath: 'id',
      autoIncrement: true
    },
    {
      name: 'collection',
      keyPath: 'id',
      autoIncrement: true
    }
  ]
};

var db = new ydn.db.Storage('initial', initialSchema);
var colors = [
  {
    "id": "1",
    "nom": "Bleu",
    "code": "#bidule"
  },
  {
    "id": "2",
    "nom": "Saumon",
    "code": "#dbb494"
  }
];
db.put({name: 'color', keyPath: 'id'}, colors)
    .done(function(key) {
      console.log(key);
      isColorInstalled = true;
      displayerSuccessMessage = true;
      console.log('Colors creation done.');

      db.keys('color', false, 10).done(function(records) {
        console.log('pouet2');
        console.log(records);
      }).fail(function() {
            console.log('Error retrieving keys for colors.');
          });

      db.values('color', false, 20).done(function(records) {
        console.log('pouet3');
        console.log(records);
      }).fail(function() {
            console.log('Error retrieving list of colors.');
          });
    })
    .fail(function(error) {
      console.log('Error adding colors.');
      throw error;
    });


db.keys('color', false, 10).done(function(records) {
  console.log('color pouet2');
  console.log(records);
}).fail(function() {
      console.log('Error retrieving keys for colors.');
    });

db.keys('collection', false, 10).done(function(records) {
  console.log('collection pouet3');
  console.log(records);
}).fail(function() {
      console.log('Error retrieving keys for collections.');
    });





