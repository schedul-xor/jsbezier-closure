goog.require('goog.dom');
goog.require('goog.math.Vec2');
goog.require('goog.ui.Button');
goog.require('goog.ui.LabelInput');
goog.require('goog.ui.Textarea');
goog.require('jsplumb.JsBezier');


var p = new goog.math.Vec2(1,3);
var b = [new goog.math.Vec2(0,0),new goog.math.Vec2(1,2),new goog.math.Vec2(2,3),new goog.math.Vec2(4,4)];
var result = jsplumb.JsBezier.distanceFromCurve(p,b);
console.log(result);
var length = jsplumb.JsBezier.getLength(b);
console.log(length);
