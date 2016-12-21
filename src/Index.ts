import Nonogram from './Nonogram';

let level = '../level-asian.json'
let n = new Nonogram(level);

/*
let index = 0;
console.log(n.clues[0][index]);
n.show();
n._simple_blocks(index);
n.show();
n._analyse(index);
console.log(n.clues[0][index]);
n._simple_blocks(index);
n.show();
n._simple_spaces(index)
n.show();
console.log(n._is_completed(index));
n.show();
*/

n.show();
n.solve();