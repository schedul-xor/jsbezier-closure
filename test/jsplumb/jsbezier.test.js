require('nclosure').nclosure({additionalDeps:['deps.js']});
expect = require('expect.js');

goog.require('goog.math.Vec2');
goog.require('jsplumb.JsBezier');

describe('jsplumb.JsBezier',function(){
  var p = new goog.math.Vec2(1,3);
  var b = [new goog.math.Vec2(0,0),new goog.math.Vec2(1,2),new goog.math.Vec2(2,3),new goog.math.Vec2(4,4)];
  var result = jsplumb.JsBezier.distanceFromCurve(p,b);
  console.log(result);
  var length = jsplumb.JsBezier.getLength(b);
  console.log(length);
});
