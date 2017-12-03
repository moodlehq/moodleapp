schema = {
  Stores: [{
    name: 'player',
    keyPath: 'id',
    indexes: [{
      name: 'id',
      type: 'INTEGER',
      unique: true
    }, {
      name: 'health',
      type: 'REAL'
    }]
  }, {
    name: 'weapon',
    keyPath: 'name'
  }]
};

player_data = [{
  id: 1,
  health: 50,
  weapon: 'gun',
  first: 'A',
  last: 'Z',
  full_name: 'A Z',
  sex: 'FEMALE',
  age: 24,
  country: 'SG'
}, {
  id: 2,
  health: 50,
  weapon: 'gun',
  first: 'B',
  last: 'Z',
  full_name: 'B Z',
  sex: 'FEMALE',
  age: 18,
  country: 'US'
}, {
  id: 3,
  health: 50,
  weapon: 'laser',
  first: 'C',
  last: 'Z',
  full_name: 'C Z',
  sex: 'MALE',
  age: 19,
  country: 'SG'
}, {
  id: 4,
  health: 50,
  weapon: 'sword',
  first: 'D',
  last: 'Z',
  full_name: 'D Z',
  sex: 'FEMALE',
  age: 19,
  country: 'SG'
}];
var weapon_data = [{
  name: 'gun',
  count: 5
}, {
  name: 'sword',
  count: 10
}, {
  name: 'laser',
  count: 1
}];

db = new ydn.db.Storage('tr_test3', schema);
db.put('player', player_data);
db.put('weapon', weapon_data);

print_player = function(obj) {
  if (obj instanceof Array) {
    for (var i = 0; i < obj.length; i++) {
      print_player(obj[i]);
    }
    return;
  }
  if (obj) {
    console.log((new Date()).toISOString() + ' Player ' + obj.id + ' (' + obj.full_name + '), health: ' + obj.health);
  } else {
    console.log(obj);
  }
};



var log_them = function(pid, sno) {
  db.get('player', pid).done(function(player) {
    console.log([sno, 'player', player]);
    db.get('weapon', player.weapon).done(function(weapon) {
      console.log([sno, 'weapon', weapon]);
    });
  })
};
var change_weapon = function (pid, new_weapon_name, callback) {
  db.transaction(function tx_change(idb) {
    console.log('entering transaction');
    var get_ini_data = idb.get([idb.key('player', pid), idb.key('weapon', new_weapon_name)]);
    get_ini_data.done(function get_pre_data(data) {
      console.log('player and new weapon data read');
      var player = data[0];
      var new_weapon = data[1];
      idb.get('weapon', player.weapon).done(function (old_weapon) {
        console.log('Changing from ' + old_weapon.name + ' to ' + new_weapon.name);
        new_weapon.count--;
        old_weapon.count++;
        player.weapon = new_weapon.name;
        idb.put('weapon', [new_weapon, old_weapon]);
        idb.put('player', player).done(function() {
          console.log('transaction done.');
          callback();
        });
      })
    });
  }, ['player', 'weapon'], 'readwrite');
};
