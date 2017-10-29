(function(WildAbout, undefined) {
    'use strict';

    var SVGCmd = (function() {
        function SVGCmd() {
            this.commands = [];
        };

        var functions = [
            'M', 'L', 'H', 'V', 'C', 'S', 'Q', 'T', 'A', 'R',
            'm', 'l', 'h', 'v', 'c', 's', 'q', 't', 'a', 'r'
        ];
        
        for (var i = 0; i < functions.length; i++) {
            let f = functions[i];
            SVGCmd.prototype[f] = function() {
                this.commands.push(
                    f + Array.prototype.slice.call(arguments).join(' ')
                );
                return this;
            };
        }

        SVGCmd.prototype.z = SVGCmd.prototype.Z = function() {
            this.commands.push('Z');
            return this;
        };

        SVGCmd.prototype.toString = function() {
            return this.commands.join('');
        };

        SVGCmd.prototype.clear = function() {
            this.commands = [];
            return this;
        };

        return SVGCmd;
    }());

    var Point = (function() {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        };

        Point.prototype.toString = function() {
            return this.x + ' ' + this.y;
        };

        Point.prototype.polar = function(r, t) {
            var x = this.x + r * Math.cos(Math.PI * t / 180.0);
            var y = this.y - r * Math.sin(Math.PI * t / 180.0);
            return new Point(x, y);
        }

        return Point;
    }());

    var Vector = (function() {
        function Vector(p1, p2) {
            var _vx  = p1.x - p2.x;
            var _vy  = p1.y - p2.y;
            var _len = Math.sqrt( Math.pow(_vx, 2) + Math.pow(_vy, 2) );
            var _rad = Math.atan2(_vy, _vx);
            var _deg = _rad * (180 / Math.PI);

            Object.defineProperties(this, {
                'p1':  {get: function() {return p1}},
                'p2':  {get: function() {return p2}},
                'vx':  {get: function() {return _vx}},
                'vy':  {get: function() {return _vy}},
                'len': {get: function() {return _len}},
                'rad': {get: function() {return _rad}},
            });
        };

        Vector.prototype.intersection = function(v2) {
            var v1 = this;
            var x = (
                (v1.p1.x * v1.p2.y  -  v1.p1.y * v1.p2.x) *
                    v2.vx              -  v1.vx              * 
                (v2.p1.x * v2.p2.y  -  v2.p1.y * v2.p2.x)
            ) / (
                    v1.vx              *  v2.vy              -
                    v1.vy              *  v2.vx 
            );
            var y = (
                (v1.p1.x * v1.p2.y  -  v1.p1.y * v1.p2.x) *
                    v2.vy              -  v1.vy              *
                (v2.p1.x * v2.p2.y  -  v2.p1.y * v2.p2.x)
            ) / (
                    v1.vx              *  v2.vy  -
                    v1.vy              *  v2.vx
            );
            return new Point(x, y);
        };

        Vector.prototype.fillet = function(v2, r) {
            var v1 = this;

            // Bisect vector angle.
            var angle = (v1.rad - v2.rad) / 2;

            // The distance between p0 and the tangent of the circle.
            var p0tan = r / Math.abs(Math.tan(angle));

            // The distance between p0 and the centre of the circle.
            var p0ctr = Math.sqrt(
                Math.pow(r, 2) +
                Math.pow(p0tan, 2)
            );

            return new Vector(
                // The tangent intersection on v1.
                new Point(
                    v1.p1.x - v1.vx * p0tan / v1.len,
                    v1.p1.y - v1.vy * p0tan / v1.len
                ),
                // The tangent intersection on v2.
                new Point(
                    v2.p1.x - v2.vx * p0tan / v2.len,
                    v2.p1.y - v2.vy * p0tan / v2.len
                )
            );
        }

        return Vector;
    }());

    var Coord = (function() {
        function Coord() {};

        Coord.prototype.scaleTo = function(s) {
            return function(v) { return v * s; };
        }

        return Coord;
    }());

    (function() {

        var palette = {
            dark_blue:  '#2d4a5c',
            dusky_pink: '#e29bb5',
            mint_green: '#70c5a0',
            light_blue: '#96c2d9',
            lilac:      '#a08dc2',
            coral:      '#f58c7b'
        };

        var colours = {
            head:       palette.dusky_pink,
            torso:      palette.dusky_pink,
            upper_legs: palette.dark_blue,
            lower_legs: palette.mint_green,
            feet:       palette.mint_green
        };

        function limb(s, centres, colour) {
            var t1, t2;
            if (centres.p1.y < centres.p2.y) {
                t1 = 30;
                t2 = 210;
            }
            else {
                t1 = 150;
                t2 = 330;
            }

            var svg = new SVGCmd;

            return s.path(
                svg.
                clear().
                M(centres.p1.polar(radius, t1)).
                A(radius, radius, t2, 0, 0, centres.p1.polar(radius, t2)).
                L(centres.p2.polar(radius, t2)).
                A(radius, radius, t1, 0, 0, centres.p2.polar(radius, t1)).
                z().
                toString()
            ).attr({fill: colour});
        }

        var coord      = new Coord();
        var scale      = coord.scaleTo(1);
        var radius     = scale( 44);
        var dia        = radius * 2;
        var long_limb  = scale(147);
        var short_limb = scale(100);
        var head_torso = short_limb;

        // The SVG coordinate system has 0,0 at the top left.  The positive X
        // axis points right, and the positive Y axis points down.

        var centre = {};

        // The centre of the head is distance radius from the top left.
        centre.head = new Point(0 + radius, 0 + radius);

        centre.torso = new Vector(
            centre.head.polar(head_torso, 300),
            centre.head.polar(head_torso + long_limb, 300)
        );

        centre.upper_legs = new Vector(
            centre.torso.p2,
            centre.torso.p2.polar(long_limb, 60)
        );

        centre.lower_legs = new Vector(
            centre.upper_legs.p2,
            centre.upper_legs.p2.polar(long_limb, 300)
        );

        centre.feet = new Vector(
            centre.lower_legs.p2,
            centre.lower_legs.p2.polar(short_limb, 60)
        );

        var svg = new SVGCmd();
        var s   = new Snap(
            centre.feet.p2.polar(radius, 0).x,
            centre.feet.p1.polar(radius, 270).y
        );

        
        // Points of tangency for the fillet between torso and upper legs.
        var f1 = (function() {
            var v1 = new Vector(
                centre.upper_legs.p1.polar(radius, 150),
                centre.upper_legs.p2.polar(radius, 150)
            );

            var v2 = new Vector(
                centre.torso.p1.polar(radius, 210),
                centre.torso.p2.polar(radius, 210)
            );

            var i = v1.intersection(v2);

            var v1i = new Vector(i, v1.p2);
            var v2i = new Vector(i, v2.p1);

            return v1i.fillet(v2i, radius);
        }());

        // Points of tangency for the fillet between upper and lower legs.
        var f2 = (function() {
            var v1 = new Vector(
                centre.lower_legs.p1.polar(radius, 30),
                centre.lower_legs.p2.polar(radius, 30)
            );

            var v2 = new Vector(
                centre.feet.p1.polar(radius, 150),
                centre.feet.p2.polar(radius, 150)
            );

            var i1 = v1.intersection(v2);

            var path1 = svg.
                clear().
                M(centre.upper_legs.p1.polar(dia, 330)).
                L(centre.upper_legs.p2.polar(dia, 330)).
                toString();

            var path2 = svg.
                clear().
                M(i1.polar(radius, 300)).
                A(radius, radius, 0, 0, 1, i1.polar(radius, 120)).
                toString();

            var i2 = Snap.path.intersection(path1, path2);

            return new Vector(
                (new Point(i2[0].x, i2[0].y)).polar(radius, 150),
                i1
            );

        }());

        var head = s.circle(
            centre.head.x,
            centre.head.y,
            radius
        ).attr({fill: colours.head});

        var torso      = limb(s, centre.torso, colours.torso);
        var lower_legs = limb(s, centre.lower_legs, colours.lower_legs);
        var feet       = limb(s, centre.feet, colours.feet);

        var upper_legs = s.path(
            svg.
            clear().
            M(f1.p1).
            A(radius, radius, 0, 0, 1, f1.p2).
            L(centre.upper_legs.p1.polar(radius, 210)).
            A(radius, radius, 0, 0, 0, centre.upper_legs.p1.polar(radius, 330)).
            L(f2.p1).
            A(radius, radius, 0, 0, 1, f2.p2).
            L(centre.upper_legs.p2.polar(radius, 30)).
            A(radius, radius, 0, 0, 0, centre.upper_legs.p2.polar(radius, 150)).
            Z().
            toString()
        ).attr({fill: colours.upper_legs});
    }());
}(window.WildAbout = Window.WildAbout || {}));

