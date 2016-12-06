import Nonogram from './Nonogram';

let level = '../level-medium.json'
let n = new Nonogram(level);
/*
let json = require(level);
n.show();
console.log(json.level.x_clues[0]);
n._force(0,json.level.x_clues[0]);
n.show();
*/

n.solve();