goog.provide('jsplumb.JsBezier');

goog.require('goog.asserts');
goog.require('goog.math.Vec2');



/**
 * @constructor
 */
jsplumb.JsBezier = function() {};


/**
 * @const
 * @type {!number}
 */
jsplumb.JsBezier.MAX_RECURSION = 64;


/**
 * @const
 * @type {!number}
 */
jsplumb.JsBezier.FLATNESS_TOLERANCE = Math.pow(2.0, -jsplumb.JsBezier.MAX_RECURSION);


/**
 * Calculates the distance that the point lies from the curve.
 *
 * @param {!goog.math.Vec2} point point a point in the form {x:567, y:3342}
 * @param {!Array.<!goog.math.Vec2>} curve a Bezier curve in the form [{x:..., y:...}, {x:..., y:...}, {x:..., y:...}, {x:..., y:...}].  note that this is currently
 * hardcoded to assume cubiz beziers, but would be better off supporting any degree.
 * @return {!{location:!number,distance:!number}} a JS object literal containing location and distance, for example: {location:0.35, distance:10}.  Location is analogous to the location
 * argument you pass to the pointOnPath function: it is a ratio of distance travelled along the curve.  Distance is the distance in pixels from
 * the point to the curve.
 */
jsplumb.JsBezier.distanceFromCurve = function(point, curve) {
  goog.asserts.assertInstanceof(point, goog.math.Vec2);
  goog.asserts.assertArray(curve);

  var candidates = [];
  var w = jsplumb.JsBezier.convertToBezier(point, curve);
  var degree = curve.length - 1;
  var higherDegree = (2 * degree) - 1;
  var numSolutions = jsplumb.JsBezier.findRoots(w, higherDegree, candidates, 0);
  var v = goog.math.Vec2.difference(point, curve[0]);
  var dist = v.magnitude();
  var t = 0.0;
  for (var i = 0; i < numSolutions; i++) {
    v = goog.math.Vec2.difference(point, jsplumb.JsBezier.bezier(curve, degree, candidates[i], null, null));
    var newDist = v.magnitude();
    if (newDist < dist) {
      dist = newDist;
      t = candidates[i];
    }
  }
  v = goog.math.Vec2.difference(point, curve[degree]);
  newDist = v.magnitude();
  if (newDist < dist) {
    dist = newDist;
    t = 1.0;
  }
  return {location: t, distance: dist};
};


/**
 * @param {!goog.math.Vec2} point
 * @param {!Array.<!goog.math.Vec2>} curve
 * @return {!{point:!goog.math.Vec2,location:!number}}
 */
jsplumb.JsBezier.nearestPointOnCurve = function(point, curve) {
  goog.asserts.assertInstanceof(point, goog.math.Vec2);
  goog.asserts.assertArray(curve);

  var td = jsplumb.JsBezier.distanceFromCurve(point, curve);
  return {point: jsplumb.JsBezier.bezier(curve, curve.length - 1, td.location, null, null), location: td.location};
};


/**
 * @param {!goog.math.Vec2} point
 * @param {!Array.<!goog.math.Vec2>} curve
 * @return {!Array.<!goog.math.Vec2>}
 */
jsplumb.JsBezier.convertToBezier = function(point, curve) {
  var degree = curve.length - 1;
  var higherDegree = (2 * degree) - 1;
  var c = [];
  var d = [];
  var cdTable = [];
  var w = [];
  var z = [[1.0, 0.6, 0.3, 0.1], [0.4, 0.6, 0.6, 0.4], [0.1, 0.3, 0.6, 1.0]];
  for (var i = 0; i <= degree; i++) {
    c[i] = goog.math.Vec2.difference(curve[i], point);
  }
  for (i = 0; i <= degree - 1; i++) {
    d[i] = goog.math.Vec2.difference(curve[i + 1], curve[i]);
    d[i].scale(3.0);
  }
  for (var row = 0; row <= degree - 1; row++) {
    for (var column = 0; column <= degree; column++) {
      if (!cdTable[row]) {
        cdTable[row] = [];
      }
      cdTable[row][column] = goog.math.Vec2.dot(d[row], c[column]);
    }
  }
  for (i = 0; i <= higherDegree; i++) {
    if (!w[i]) {
      w[i] = new goog.math.Vec2(parseFloat(i) / higherDegree, 0.0);
    }
  }
  var n = degree;
  var m = degree - 1;
  for (var k = 0; k <= n + m; k++) {
    var lb = Math.max(0, k - m);
    var ub = Math.min(k, n);
    for (i = lb; i <= ub; i++) {
      var j = k - i;
      w[i + j].y += cdTable[j][i] * z[j][i];
    }
  }
  return w;
};


/**
 * @return {!number}
 */
jsplumb.JsBezier.findRoots = function(w, degree, t, depth) {
  var left = [];
  var right = [];
  var left_t = [];
  var right_t = [];

  switch (jsplumb.JsBezier.getCrossingCount(w, degree)) {
  case 0:
    return 0;
  case 1:
    if (depth >= jsplumb.JsBezier.MAX_RECURSION) {
      t[0] = (w[0].x + w[degree].x) / 2.0;
      return 1;
    }
    if (jsplumb.JsBezier.isFlatEnough(w, degree)) {
      t[0] = jsplumb.JsBezier.computeXIntercept(w, degree);
      return 1;
    }
    break;
  }
  jsplumb.JsBezier.bezier(w, degree, 0.5, left, right);
  var left_count = jsplumb.JsBezier.findRoots(left, degree, left_t, depth + 1);
  var right_count = jsplumb.JsBezier.findRoots(right, degree, right_t, depth + 1);
  for (var i = 0; i < left_count; i++) {
    t[i] = left_t[i];
  }
  for (i = 0; i < right_count; i++) {
    t[i + left_count] = right_t[i];
  }
  return left_count + right_count;
};


/**
 *
 */
jsplumb.JsBezier.getCrossingCount = function(curve, degree) {
  var n_crossings = 0;
  var sign = curve[0].y > 0 ? 1 : -1;
  var old_sign = sign;
  for (var i = 1; i <= degree; i++) {
    sign = curve[i].y >= 0 ? 1 : -1;
    if (sign !== old_sign) {
      n_crossings++;
    }
    old_sign = sign;
  }
  return n_crossings;
};


/**
 * @return {!boolean}
 */
jsplumb.JsBezier.isFlatEnough = function(curve, degree) {
  var a = curve[0].y - curve[degree].y;
  var b = curve[degree].x - curve[0].x;
  var c = curve[0].x * curve[degree].y - curve[degree].x * curve[0].y;
  var max_distance_above = 0.0;
  var max_distance_below = max_distance_above;

  for (var i = 1; i < degree; i++) {
    var value = a * curve[i].x + b * curve[i].y + c;
    if (value > max_distance_above) {
      max_distance_above = value;
    }else if (value < max_distance_below) {
      max_distance_below = value;
    }
  }

  var a1 = 0.0;
  var b1 = 1.0;
  var c1 = 0.0;
  var a2 = a;
  var b2 = b;
  var det = a1 * b2 - a2 * b1;
  var dInv = 1.0 / det;
  var c2 = c - max_distance_above;
  var intercept_1 = (b1 * c2 - b2 * c1) * dInv;
  c2 = c - max_distance_below;
  var intercept_2 = (b1 * c2 - b2 * c1) * dInv;
  var left_intercept = Math.min(intercept_1, intercept_2);
  var right_intercept = Math.max(intercept_1, intercept_2);
  var error = right_intercept - left_intercept;
  return (error < jsplumb.JsBezier.FLATNESS_TOLERANCE);
};


/**
 * @return {!number}
 */
jsplumb.JsBezier.computeXIntercept = function(curve, degree) {
  var XLK = 1.0;
  var YLK = 0.0;
  var XNM = curve[degree].x - curve[0].x;
  var YNM = curve[degree].y - curve[0].y;
  var XMK = curve[0].x - 0.0;
  var YMK = curve[0].y - 0.0;
  var det = XNM * YLK - YNM * XLK;
  var detInv = 1.0 / det;
  var S = (XNM * YMK - YNM * XMK) * detInv;
  return 0.0 + XLK * S;
};


/**
 *
 */
jsplumb.JsBezier.bezier = function(curve, degree, t, left, right) {
  var temp = [[]];
  for (var j = 0; j <= degree; j++) {
    temp[0][j] = curve[j];
  }
  for (var i = 1; i <= degree; i++) {
    for (j = 0; j <= degree - i; j++) {
      if (!temp[i]) {
        temp[i] = [];
      }
      if (!temp[i][j]) {
        temp[i][j] = {};
      }
      temp[i][j].x = (1.0 - t) * temp[i - 1][j].x + t * temp[i - 1][j + 1].x;
      temp[i][j].y = (1.0 - t) * temp[i - 1][j].y + t * temp[i - 1][j + 1].y;
    }
  }
  if (left != null) {
    for (j = 0; j <= degree; j++) {
      left[j] = temp[j][0];
    }
  }
  if (right != null) {
    for (j = 0; j <= degree; j++) {
      right[j] = temp[degree - j][j];
    }
  }

  return (temp[degree][0]);
};


/**
 *
 */
jsplumb.JsBezier.pointOnPath = function(curve,location){
  var cc = jsplumb.JsBezier.getCurveFunctions(curve.length-1);
  var x = 0;
  var y = 0;
  for(var i = 0 ;i < curve.length;i++){
    x+=curve[i].x*cc[i](location);
    y += curve[i].y*cc[i](location);
  }
  return new goog.math.Vec2(x,y);
};


/**
 * @return {!number}
 */
jsplumb.JsBezier.getLength = function(curve){
  var prev = jsplumb.JsBezier.pointOnPath(curve,0);
  var tally = 0;
  var curLoc = 0;
  var direction = 1;
  var cur = null;
  while(curLoc < 1){
    curLoc += (0.005*direction);
    cur = jsplumb.JsBezier.pointOnPath(curve,curLoc);
    tally += goog.math.Vec2.distance(cur,prev);
    prev = cur;
  }
  return tally;
};
