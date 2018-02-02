/**
 * $jh组件
 * Created by jianghe
 */
'use strict';
;(function define$jh(global, factory) {
    //初始化$jh
    var $jh = {};
    factory(global, $jh);
    if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
        global.$jh = $jh;
        module.exports = $jh; // CommonJS
    } else if (typeof define === 'function' && define.amd) {
        define(['exports'], $jh); // AMD
    } else {
        global.$jh = $jh;
    }
})(window, function (global, $jh, undefined) {

    var router;
    /**
     * 路由部分director
     */
    (function () {
        var dloc = document.location;

        function dlocHashEmpty() {
            return dloc.hash === '' || dloc.hash === '#';
        }

        var listener = {
            mode: 'modern',
            hash: dloc.hash,
            history: false,

            check: function () {
                var h = dloc.hash;
                if (h != this.hash) {
                    this.hash = h;
                    this.onHashChanged();
                }
            },

            fire: function () {
                if (this.mode === 'modern') {
                    this.history === true ? window.onpopstate() : window.onhashchange();
                } else {
                    this.onHashChanged();
                }
            },

            init: function (fn, history) {
                var self = this;
                this.history = history;

                if (!Router.listeners) {
                    Router.listeners = [];
                }

                function onchange(onChangeEvent) {
                    for (var i = 0, l = Router.listeners.length; i < l; i++) {
                        Router.listeners[i](onChangeEvent);
                    }
                }

                //note IE8 is being counted as 'modern' because it has the hashchange event
                if ('onhashchange' in window && (document.documentMode === undefined || document.documentMode > 7)) {
                    // At least for now HTML5 history is available for 'modern' browsers only
                    if (this.history === true) {
                        // There is an old bug in Chrome that causes onpopstate to fire even
                        // upon initial page load. Since the handler is run manually in init(),
                        // this would cause Chrome to run it twise. Currently the only
                        // workaround seems to be to set the handler after the initial page load
                        // http://code.google.com/p/chromium/issues/detail?id=63040
                        setTimeout(function () {
                            window.onpopstate = onchange;
                        }, 500);
                    } else {
                        window.onhashchange = onchange;
                    }
                    this.mode = 'modern';
                } else {
                    //
                    // IE support, based on a concept by Erik Arvidson ...
                    //
                    var frame = document.createElement('iframe');
                    frame.id = 'state-frame';
                    frame.style.display = 'none';
                    document.body.appendChild(frame);
                    this.writeFrame('');

                    if ('onpropertychange' in document && 'attachEvent' in document) {
                        document.attachEvent('onpropertychange', function () {
                            if (event.propertyName === 'location') {
                                self.check();
                            }
                        });
                    }

                    window.setInterval(function () {
                        self.check();
                    }, 50);

                    this.onHashChanged = onchange;
                    this.mode = 'legacy';
                }

                Router.listeners.push(fn);

                return this.mode;
            },

            destroy: function (fn) {
                if (!Router || !Router.listeners) {
                    return;
                }

                var listeners = Router.listeners;

                for (var i = listeners.length - 1; i >= 0; i--) {
                    if (listeners[i] === fn) {
                        listeners.splice(i, 1);
                    }
                }
            },

            setHash: function (s) {
                // Mozilla always adds an entry to the history
                if (this.mode === 'legacy') {
                    this.writeFrame(s);
                }

                if (this.history === true) {
                    window.history.pushState({}, document.title, s);
                    // Fire an onpopstate event manually since pushing does not obviously
                    // trigger the pop event.
                    this.fire();
                } else {
                    dloc.hash = (s[0] === '/') ? s : '/' + s;
                }
                return this;
            },

            writeFrame: function (s) {
                // IE support...
                var f = document.getElementById('state-frame');
                var d = f.contentDocument || f.contentWindow.document;
                d.open();
                d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
                d.close();
            },

            syncHash: function () {
                // IE support...
                var s = this._hash;
                if (s != dloc.hash) {
                    dloc.hash = s;
                }
                return this;
            },

            onHashChanged: function () {
            }
        };

        var Router = router = function (routes) {
            //执行方法也返回对象 var a = a(); var a = new a();
            if (!(this instanceof Router)) return new Router(routes);

            this.params = {};
            this.routes = {};
            this.methods = ['on', 'once', 'after', 'before'];
            this.scope = [];
            this._methods = {};

            this._insert = this.insert;
            this.insert = this.insertEx;

            this.historySupport = (window.history != null ? window.history.pushState : null) != null

            this.configure();
            this.mount(routes || {});
        };

        Router.prototype.init = function (r) {
            var self = this,
                routeTo;
            this.handler = function (onChangeEvent) {
                var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
                var url = self.history === true ? self.getPath() : newURL.replace(/.*#/, '');
                self.dispatch('on', url.charAt(0) === '/' ? url : '/' + url);
            };

            listener.init(this.handler, this.history);

            if (this.history === false) {
                if (dlocHashEmpty() && r) {
                    dloc.hash = r;
                } else if (!dlocHashEmpty()) {
                    self.dispatch('on', '/' + dloc.hash.replace(/^(#\/|#|\/)/, ''));
                }
            } else {
                if (this.convert_hash_in_init) {
                    // Use hash as route
                    routeTo = dlocHashEmpty() && r ? r : !dlocHashEmpty() ? dloc.hash.replace(/^#/, '') : null;
                    if (routeTo) {
                        window.history.replaceState({}, document.title, routeTo);
                    }
                } else {
                    // Use canonical url
                    routeTo = this.getPath();
                }

                // Router has been initialized, but due to the chrome bug it will not
                // yet actually route HTML5 history state changes. Thus, decide if should route.
                if (routeTo || this.run_in_init === true) {
                    this.handler();
                }
            }

            return this;
        };

        Router.prototype.explode = function () {
            var v = this.history === true ? this.getPath() : dloc.hash;
            if (v.charAt(1) === '/') {
                v = v.slice(1)
            }
            return v.slice(1, v.length).split("/");
        };

        Router.prototype.setRoute = function (i, v, val) {
            var url = this.explode();

            if (typeof i === 'number' && typeof v === 'string') {
                url[i] = v;
            } else if (typeof val === 'string') {
                url.splice(i, v, s);
            } else {
                url = [i];
            }

            listener.setHash(url.join('/'));
            return url;
        };

        Router.prototype.insertEx = function (method, path, route, parent) {
            if (method === "once") {
                method = "on";
                route = function (route) {
                    var once = false;
                    return function () {
                        if (once) return;
                        once = true;
                        return route.apply(this, arguments);
                    };
                }(route);
            }
            return this._insert(method, path, route, parent);
        };

        Router.prototype.getRoute = function (v) {
            var ret = v;

            if (typeof v === "number") {
                ret = this.explode()[v];
            } else if (typeof v === "string") {
                var h = this.explode();
                ret = h.indexOf(v);
            } else {
                ret = this.explode();
            }

            return ret;
        };

        Router.prototype.destroy = function () {
            listener.destroy(this.handler);
            return this;
        };

        Router.prototype.getPath = function () {
            var path = window.location.pathname;
            if (path.substr(0, 1) !== '/') {
                path = '/' + path;
            }
            return path;
        };

        function _every(arr, iterator) {
            for (var i = 0; i < arr.length; i += 1) {
                if (iterator(arr[i], i, arr) === false) {
                    return;
                }
            }
        }

        function _flatten(arr) {
            var flat = [];
            for (var i = 0, n = arr.length; i < n; i++) {
                flat = flat.concat(arr[i]);
            }
            return flat;
        }

        function _asyncEverySeries(arr, iterator, callback) {
            if (!arr.length) {
                return callback();
            }
            var completed = 0;
            (function iterate() {
                iterator(arr[completed], function (err) {
                    if (err || err === false) {
                        callback(err);
                        callback = function () {
                        };
                    } else {
                        completed += 1;
                        if (completed === arr.length) {
                            callback();
                        } else {
                            iterate();
                        }
                    }
                });
            })();
        }

        function paramifyString(str, params, mod) {
            mod = str;
            for (var param in params) {
                if (params.hasOwnProperty(param)) {
                    mod = params[param](str);
                    if (mod !== str) {
                        break;
                    }
                }
            }
            return mod === str ? "([._a-zA-Z0-9-%()]+)" : mod;
        }

        function regifyString(str, params) {
            var matches, last = 0,
                out = "";
            while (matches = str.substr(last).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/)) {
                last = matches.index + matches[0].length;
                matches[0] = matches[0].replace(/^\*/, "([_.()!\\ %@&a-zA-Z0-9-]+)");
                out += str.substr(0, matches.index) + matches[0];
            }
            str = out += str.substr(last);
            var captures = str.match(/:([^\/]+)/ig),
                capture, length;
            if (captures) {
                length = captures.length;
                for (var i = 0; i < length; i++) {
                    capture = captures[i];
                    if (capture.slice(0, 2) === "::") {
                        str = capture.slice(1);
                    } else {
                        str = str.replace(capture, paramifyString(capture, params));
                    }
                }
            }
            return str;
        }

        function terminator(routes, delimiter, start, stop) {
            var last = 0,
                left = 0,
                right = 0,
                start = (start || "(").toString(),
                stop = (stop || ")").toString(),
                i;
            for (i = 0; i < routes.length; i++) {
                var chunk = routes[i];
                if (chunk.indexOf(start, last) > chunk.indexOf(stop, last) || ~chunk.indexOf(start, last) && !~chunk.indexOf(stop, last) || !~chunk.indexOf(start, last) && ~chunk.indexOf(stop, last)) {
                    left = chunk.indexOf(start, last);
                    right = chunk.indexOf(stop, last);
                    if (~left && !~right || !~left && ~right) {
                        var tmp = routes.slice(0, (i || 1) + 1).join(delimiter);
                        routes = [tmp].concat(routes.slice((i || 1) + 1));
                    }
                    last = (right > left ? right : left) + 1;
                    i = 0;
                } else {
                    last = 0;
                }
            }
            return routes;
        }

        var QUERY_SEPARATOR = /\?.*/;

        Router.prototype.configure = function (options) {
            options = options || {};
            for (var i = 0; i < this.methods.length; i++) {
                this._methods[this.methods[i]] = true;
            }
            this.recurse = options.recurse || this.recurse || false;
            this.async = options.async || false;
            this.delimiter = options.delimiter || "/";
            this.strict = typeof options.strict === "undefined" ? true : options.strict;
            this.notfound = options.notfound;
            this.resource = options.resource;
            this.history = options.html5history && this.historySupport || false;
            this.run_in_init = this.history === true && options.run_handler_in_init !== false;
            this.convert_hash_in_init = this.history === true && options.convert_hash_in_init !== false;
            this.every = {
                after: options.after || null,
                before: options.before || null,
                on: options.on || null
            };
            return this;
        };

        Router.prototype.param = function (token, matcher) {
            if (token[0] !== ":") {
                token = ":" + token;
            }
            var compiled = new RegExp(token, "g");
            this.params[token] = function (str) {
                return str.replace(compiled, matcher.source || matcher);
            };
            return this;
        };

        Router.prototype.on = Router.prototype.route = function (method, path, route) {
            var self = this;
            if (!route && typeof path == "function") {
                route = path;
                path = method;
                method = "on";
            }
            if (Array.isArray(path)) {
                return path.forEach(function (p) {
                    self.on(method, p, route);
                });
            }
            if (path.source) {
                path = path.source.replace(/\\\//ig, "/");
            }
            if (Array.isArray(method)) {
                return method.forEach(function (m) {
                    self.on(m.toLowerCase(), path, route);
                });
            }
            path = path.split(new RegExp(this.delimiter));
            path = terminator(path, this.delimiter);
            this.insert(method, this.scope.concat(path), route);
        };

        Router.prototype.path = function (path, routesFn) {
            var self = this,
                length = this.scope.length;
            if (path.source) {
                path = path.source.replace(/\\\//ig, "/");
            }
            path = path.split(new RegExp(this.delimiter));
            path = terminator(path, this.delimiter);
            this.scope = this.scope.concat(path);
            routesFn.call(this, this);
            this.scope.splice(length, path.length);
        };

        Router.prototype.dispatch = function (method, path, callback) {
            var self = this,
                fns = this.traverse(method, path.replace(QUERY_SEPARATOR, ""), this.routes, ""),
                invoked = this._invoked,
                after;
            this._invoked = true;
            if (!fns || fns.length === 0) {
                this.last = [];
                if (typeof this.notfound === "function") {
                    this.invoke([this.notfound], {
                        method: method,
                        path: path
                    }, callback);
                }
                return false;
            }
            if (this.recurse === "forward") {
                fns = fns.reverse();
            }

            function updateAndInvoke() {
                self.last = fns.after;
                self.invoke(self.runlist(fns), self, callback);
            }

            after = this.every && this.every.after ? [this.every.after].concat(this.last) : [this.last];
            if (after && after.length > 0 && invoked) {
                if (this.async) {
                    this.invoke(after, this, updateAndInvoke);
                } else {
                    this.invoke(after, this);
                    updateAndInvoke();
                }
                return true;
            }
            updateAndInvoke();
            return true;
        };

        Router.prototype.invoke = function (fns, thisArg, callback) {
            var self = this;
            var apply;
            if (this.async) {
                apply = function (fn, next) {
                    if (Array.isArray(fn)) {
                        return _asyncEverySeries(fn, apply, next);
                    } else if (typeof fn == "function") {
                        fn.apply(thisArg, (fns.captures || []).concat(next));
                    }
                };
                _asyncEverySeries(fns, apply, function () {
                    if (callback) {
                        callback.apply(thisArg, arguments);
                    }
                });
            } else {
                apply = function (fn) {
                    if (Array.isArray(fn)) {
                        return _every(fn, apply);
                    } else if (typeof fn === "function") {
                        return fn.apply(thisArg, fns.captures || []);
                    } else if (typeof fn === "string" && self.resource) {
                        self.resource[fn].apply(thisArg, fns.captures || []);
                    }
                };
                _every(fns, apply);
            }
        };

        Router.prototype.traverse = function (method, path, routes, regexp, filter) {
            var fns = [],
                current, exact, match, next, that;

            function filterRoutes(routes) {
                if (!filter) {
                    return routes;
                }

                function deepCopy(source) {
                    var result = [];
                    for (var i = 0; i < source.length; i++) {
                        result[i] = Array.isArray(source[i]) ? deepCopy(source[i]) : source[i];
                    }
                    return result;
                }

                function applyFilter(fns) {
                    for (var i = fns.length - 1; i >= 0; i--) {
                        if (Array.isArray(fns[i])) {
                            applyFilter(fns[i]);
                            if (fns[i].length === 0) {
                                fns.splice(i, 1);
                            }
                        } else {
                            if (!filter(fns[i])) {
                                fns.splice(i, 1);
                            }
                        }
                    }
                }

                var newRoutes = deepCopy(routes);
                newRoutes.matched = routes.matched;
                newRoutes.captures = routes.captures;
                newRoutes.after = routes.after.filter(filter);
                applyFilter(newRoutes);
                return newRoutes;
            }

            if (path === this.delimiter && routes[method]) {
                next = [[routes.before, routes[method]].filter(Boolean)];
                next.after = [routes.after].filter(Boolean);
                next.matched = true;
                next.captures = [];
                return filterRoutes(next);
            }
            for (var r in routes) {
                if (routes.hasOwnProperty(r) && (!this._methods[r] || this._methods[r] && typeof routes[r] === "object" && !Array.isArray(routes[r]))) {
                    current = exact = regexp + this.delimiter + r;
                    if (!this.strict) {
                        exact += "[" + this.delimiter + "]?";
                    }
                    match = path.match(new RegExp("^" + exact));
                    if (!match) {
                        continue;
                    }
                    if (match[0] && match[0] == path && routes[r][method]) {
                        next = [[routes[r].before, routes[r][method]].filter(Boolean)];
                        next.after = [routes[r].after].filter(Boolean);
                        next.matched = true;
                        next.captures = match.slice(1);
                        if (this.recurse && routes === this.routes) {
                            next.push([routes.before, routes.on].filter(Boolean));
                            next.after = next.after.concat([routes.after].filter(Boolean));
                        }
                        return filterRoutes(next);
                    }
                    next = this.traverse(method, path, routes[r], current);
                    if (next.matched) {
                        if (next.length > 0) {
                            fns = fns.concat(next);
                        }
                        if (this.recurse) {
                            fns.push([routes[r].before, routes[r].on].filter(Boolean));
                            next.after = next.after.concat([routes[r].after].filter(Boolean));
                            if (routes === this.routes) {
                                fns.push([routes["before"], routes["on"]].filter(Boolean));
                                next.after = next.after.concat([routes["after"]].filter(Boolean));
                            }
                        }
                        fns.matched = true;
                        fns.captures = next.captures;
                        fns.after = next.after;
                        return filterRoutes(fns);
                    }
                }
            }
            return false;
        };

        Router.prototype.insert = function (method, path, route, parent) {
            var methodType, parentType, isArray, nested, part;
            path = path.filter(function (p) {
                return p && p.length > 0;
            });
            parent = parent || this.routes;
            part = path.shift();
            if (/\:|\*/.test(part) && !/\\d|\\w/.test(part)) {
                part = regifyString(part, this.params);
            }
            if (path.length > 0) {
                parent[part] = parent[part] || {};
                return this.insert(method, path, route, parent[part]);
            }
            if (!part && !path.length && parent === this.routes) {
                methodType = typeof parent[method];
                switch (methodType) {
                    case "function":
                        parent[method] = [parent[method], route];
                        return;
                    case "object":
                        parent[method].push(route);
                        return;
                    case "undefined":
                        parent[method] = route;
                        return;
                }
                return;
            }
            parentType = typeof parent[part];
            isArray = Array.isArray(parent[part]);
            if (parent[part] && !isArray && parentType == "object") {
                methodType = typeof parent[part][method];
                switch (methodType) {
                    case "function":
                        parent[part][method] = [parent[part][method], route];
                        return;
                    case "object":
                        parent[part][method].push(route);
                        return;
                    case "undefined":
                        parent[part][method] = route;
                        return;
                }
            } else if (parentType == "undefined") {
                nested = {};
                nested[method] = route;
                parent[part] = nested;
                return;
            }
            throw new Error("Invalid route context: " + parentType);
        };

        Router.prototype.extend = function (methods) {
            var self = this,
                len = methods.length,
                i;

            function extend(method) {
                self._methods[method] = true;
                self[method] = function () {
                    var extra = arguments.length === 1 ? [method, ""] : [method];
                    self.on.apply(self, extra.concat(Array.prototype.slice.call(arguments)));
                };
            }

            for (i = 0; i < len; i++) {
                extend(methods[i]);
            }
        };

        Router.prototype.runlist = function (fns) {
            var runlist = this.every && this.every.before ? [this.every.before].concat(_flatten(fns)) : _flatten(fns);
            if (this.every && this.every.on) {
                runlist.push(this.every.on);
            }
            runlist.captures = fns.captures;
            runlist.source = fns.source;
            return runlist;
        };

        Router.prototype.mount = function (routes, path) {
            if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
                return;
            }
            var self = this;
            path = path || [];
            if (!Array.isArray(path)) {
                path = path.split(self.delimiter);
            }

            function insertOrMount(route, local) {
                var rename = route,
                    parts = route.split(self.delimiter),
                    routeType = typeof routes[route],
                    isRoute = parts[0] === "" || !self._methods[parts[0]],
                    event = isRoute ? "on" : rename;
                if (isRoute) {
                    rename = rename.slice((rename.match(new RegExp("^" + self.delimiter)) || [""])[0].length);
                    parts.shift();
                }
                if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
                    local = local.concat(parts);
                    self.mount(routes[route], local);
                    return;
                }
                if (isRoute) {
                    local = local.concat(rename.split(self.delimiter));
                    local = terminator(local, self.delimiter);
                }
                self.insert(event, local, routes[route]);
            }

            for (var route in routes) {
                if (routes.hasOwnProperty(route)) {
                    insertOrMount(route, path.slice(0));
                }
            }
        };
    }());

    /**
     * 模板引擎 mustache
     */
    function mustacheFactory(mustache) {

        var objectToString = Object.prototype.toString;
        var isArray = Array.isArray || function isArrayPolyfill(object) {
                return objectToString.call(object) === '[object Array]';
            };

        function isFunction(object) {
            return typeof object === 'function';
        }

        function typeStr(obj) {
            return isArray(obj) ? 'array' : typeof obj;
        }

        function escapeRegExp(string) {
            return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
        }

        function hasProperty(obj, propName) {
            return obj != null && typeof obj === 'object' && (propName in obj);
        }

        var regExpTest = RegExp.prototype.test;

        function testRegExp(re, string) {
            return regExpTest.call(re, string);
        }

        var nonspaceRe = /\S/;

        function isWhitespace(string) {
            return !testRegExp(nonspaceRe, string);
        }

        var entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        function escapeHtml(string) {
            return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
                return entityMap[s];
            });
        }

        var whiteRe = /\s*/;
        var spaceRe = /\s+/;
        var equalsRe = /\s*=/;
        var curlyRe = /\s*\}/;
        var tagRe = /#|\^|\/|>|\{|&|=|!/;

        function parseTemplate(template, tags) {
            if (!template)
                return [];

            var sections = [];
            var tokens = [];
            var spaces = [];
            var hasTag = false;
            var nonspace = false;

            function stripspace() {
                if (hasTag && !nonspace) {
                    while (spaces.length)
                        delete tokens[spaces.pop()];
                } else {
                    spaces = [];
                }

                hasTag = false;
                nonspace = false;
            }

            var openingTagRe, closingTagRe, closingCurlyRe;

            function compileTags(tagsToCompile) {
                if (typeof tagsToCompile === 'string')
                    tagsToCompile = tagsToCompile.split(spaceRe, 2);

                if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
                    throw new Error('Invalid tags: ' + tagsToCompile);

                openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
                closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
                closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
            }

            compileTags(tags || mustache.tags);

            var scanner = new Scanner(template);

            var start, type, value, chr, token, openSection;
            while (!scanner.eos()) {
                start = scanner.pos;

                value = scanner.scanUntil(openingTagRe);

                if (value) {
                    for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
                        chr = value.charAt(i);

                        if (isWhitespace(chr)) {
                            spaces.push(tokens.length);
                        } else {
                            nonspace = true;
                        }

                        tokens.push(['text', chr, start, start + 1]);
                        start += 1;

                        if (chr === '\n')
                            stripspace();
                    }
                }

                if (!scanner.scan(openingTagRe))
                    break;

                hasTag = true;

                type = scanner.scan(tagRe) || 'name';
                scanner.scan(whiteRe);

                if (type === '=') {
                    value = scanner.scanUntil(equalsRe);
                    scanner.scan(equalsRe);
                    scanner.scanUntil(closingTagRe);
                } else if (type === '{') {
                    value = scanner.scanUntil(closingCurlyRe);
                    scanner.scan(curlyRe);
                    scanner.scanUntil(closingTagRe);
                    type = '&';
                } else {
                    value = scanner.scanUntil(closingTagRe);
                }

                if (!scanner.scan(closingTagRe))
                    throw new Error('Unclosed tag at ' + scanner.pos);

                token = [type, value, start, scanner.pos];
                tokens.push(token);

                if (type === '#' || type === '^') {
                    sections.push(token);
                } else if (type === '/') {
                    openSection = sections.pop();

                    if (!openSection)
                        throw new Error('Unopened section "' + value + '" at ' + start);

                    if (openSection[1] !== value)
                        throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
                } else if (type === 'name' || type === '{' || type === '&') {
                    nonspace = true;
                } else if (type === '=') {
                    compileTags(value);
                }
            }

            openSection = sections.pop();

            if (openSection)
                throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

            return nestTokens(squashTokens(tokens));
        }

        function squashTokens(tokens) {
            var squashedTokens = [];

            var token, lastToken;
            for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
                token = tokens[i];

                if (token) {
                    if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
                        lastToken[1] += token[1];
                        lastToken[3] = token[3];
                    } else {
                        squashedTokens.push(token);
                        lastToken = token;
                    }
                }
            }

            return squashedTokens;
        }

        function nestTokens(tokens) {
            var nestedTokens = [];
            var collector = nestedTokens;
            var sections = [];

            var token, section;
            for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
                token = tokens[i];

                switch (token[0]) {
                    case '#':
                    case '^':
                        collector.push(token);
                        sections.push(token);
                        collector = token[4] = [];
                        break;
                    case '/':
                        section = sections.pop();
                        section[5] = token[2];
                        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
                        break;
                    default:
                        collector.push(token);
                }
            }

            return nestedTokens;
        }

        function Scanner(string) {
            this.string = string;
            this.tail = string;
            this.pos = 0;
        }

        Scanner.prototype.eos = function eos() {
            return this.tail === '';
        };

        Scanner.prototype.scan = function scan(re) {
            var match = this.tail.match(re);

            if (!match || match.index !== 0)
                return '';

            var string = match[0];

            this.tail = this.tail.substring(string.length);
            this.pos += string.length;

            return string;
        };

        Scanner.prototype.scanUntil = function scanUntil(re) {
            var index = this.tail.search(re), match;

            switch (index) {
                case -1:
                    match = this.tail;
                    this.tail = '';
                    break;
                case 0:
                    match = '';
                    break;
                default:
                    match = this.tail.substring(0, index);
                    this.tail = this.tail.substring(index);
            }

            this.pos += match.length;

            return match;
        };

        function Context(view, parentContext) {
            this.view = view;
            this.cache = {'.': this.view};
            this.parent = parentContext;
        }

        Context.prototype.push = function push(view) {
            return new Context(view, this);
        };

        Context.prototype.lookup = function lookup(name) {
            var cache = this.cache;

            var value;
            if (cache.hasOwnProperty(name)) {
                value = cache[name];
            } else {
                var context = this, names, index, lookupHit = false;

                while (context) {
                    if (name.indexOf('.') > 0) {
                        value = context.view;
                        names = name.split('.');
                        index = 0;

                        while (value != null && index < names.length) {
                            if (index === names.length - 1)
                                lookupHit = hasProperty(value, names[index]);

                            value = value[names[index++]];
                        }
                    } else {
                        value = context.view[name];
                        lookupHit = hasProperty(context.view, name);
                    }

                    if (lookupHit)
                        break;

                    context = context.parent;
                }

                cache[name] = value;
            }

            if (isFunction(value))
                value = value.call(this.view);

            return value;
        };

        function Writer() {
            this.cache = {};
        }

        Writer.prototype.clearCache = function clearCache() {
            this.cache = {};
        };

        Writer.prototype.parse = function parse(template, tags) {
            var cache = this.cache;
            var tokens = cache[template];

            if (tokens == null)
                tokens = cache[template + ':' + (tags || mustache.tags).join(':')] = parseTemplate(template, tags);

            return tokens;
        };

        Writer.prototype.render = function render(template, view, partials) {
            var tokens = this.parse(template);
            var context = (view instanceof Context) ? view : new Context(view);
            return this.renderTokens(tokens, context, partials, template);
        };

        Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate) {
            var buffer = '';

            var token, symbol, value;
            for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
                value = undefined;
                token = tokens[i];
                symbol = token[0];

                if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
                else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
                else if (symbol === '>') value = this.renderPartial(token, context, partials, originalTemplate);
                else if (symbol === '&') value = this.unescapedValue(token, context);
                else if (symbol === 'name') value = this.escapedValue(token, context);
                else if (symbol === 'text') value = this.rawValue(token);

                if (value !== undefined)
                    buffer += value;
            }

            return buffer;
        };

        Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate) {
            var self = this;
            var buffer = '';
            var value = context.lookup(token[1]);

            function subRender(template) {
                return self.render(template, context, partials);
            }

            if (!value) return;

            if (isArray(value)) {
                for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
                    buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
                }
            } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
                buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
            } else if (isFunction(value)) {
                if (typeof originalTemplate !== 'string')
                    throw new Error('Cannot use higher-order sections without the original template');

                value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

                if (value != null)
                    buffer += value;
            } else {
                buffer += this.renderTokens(token[4], context, partials, originalTemplate);
            }
            return buffer;
        };

        Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate) {
            var value = context.lookup(token[1]);

            if (!value || (isArray(value) && value.length === 0))
                return this.renderTokens(token[4], context, partials, originalTemplate);
        };

        Writer.prototype.renderPartial = function renderPartial(token, context, partials) {
            if (!partials) return;

            var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
            if (value != null)
                return this.renderTokens(this.parse(value), context, partials, value);
        };

        Writer.prototype.unescapedValue = function unescapedValue(token, context) {
            var value = context.lookup(token[1]);
            if (value != null)
                return value;
        };

        Writer.prototype.escapedValue = function escapedValue(token, context) {
            var value = context.lookup(token[1]);
            if (value != null)
                return mustache.escape(value);
        };

        Writer.prototype.rawValue = function rawValue(token) {
            return token[1];
        };

        mustache.name = 'mustache.js';
        mustache.version = '2.3.0';
        mustache.tags = ['{{', '}}'];

        var defaultWriter = new Writer();

        mustache.clearCache = function clearCache() {
            return defaultWriter.clearCache();
        };

        mustache.parse = function parse(template, tags) {
            return defaultWriter.parse(template, tags);
        };

        mustache.render = function render(template, view, partials) {
            if (typeof template !== 'string') {
                throw new TypeError('Invalid template! Template should be a "string" ' +
                    'but "' + typeStr(template) + '" was given as the first ' +
                    'argument for mustache#render(template, view, partials)');
            }

            return defaultWriter.render(template, view, partials);
        };

        mustache.to_html = function to_html(template, view, partials, send) {

            var result = mustache.render(template, view, partials);

            if (isFunction(send)) {
                send(result);
            } else {
                return result;
            }
        };

        mustache.escape = escapeHtml;

        mustache.Scanner = Scanner;
        mustache.Context = Context;
        mustache.Writer = Writer;

        return mustache;
    }

    // mustache工厂加工mustache对象
    var Mustache = {};//模板引擎
    mustacheFactory(Mustache);

    var doc = document,
        data = {},
        //用户保存公共数据的对象
        storage = {},
        //保存所有的控制器
        controller = {};

    //用户保存公共属性
    $jh.prop = {
        version: '1.0.0'
    };

    /**
     * 原生返回按钮按下回调
     */
    global.webGotoPage = function () {
        $jh.backHandle();
    };

    /**
     * 获取当前路径的参数
     * @returns String
     */
    function _getUrlParam(name) {
        if (name) {
            var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
            var r = window.location.search.substr(1).match(reg);
            if (r != null) {
                return unescape(r[2]);
            } else {
                return null;
            }
        } else {
            var hash = window.location.href.split("?");
            return hash[1] ? hash[1] : "dom";
        }
    }

    /**
     * 创建结点
     * @param tag 元素名
     * @param cfgs 属性
     * @returns {Element}
     */
    function createDom(tag, cfgs) {
        var dom = doc.createElement(tag),
            forObj = function (items, el) {
                for (var key in items) {
                    if (isType(items[key], '[object Object]')) {
                        forObj(items[key], el[key]);
                    } else {
                        el[key] = items[key];
                    }
                }
            };
        cfgs = cfgs || {};
        forObj(cfgs, dom);
        return dom;
    }

    /**
     * 校验类型item的tostring是不是为type
     * @param item
     * @param type
     * @return {boolean}
     */
    function isType(item, type) {
        return data.toString.call(item) == type;
    }

    /**
     * 利用window.window属性来判断入参是不是window对象
     * @param obj
     * @return {boolean}
     */
    function isWindow(obj) {
        return obj != null && obj === obj.window;
    }

    /**
     * 判断一个对象是不是一个纯粹的对象如{}和通过new并不被其他原型引用
     * (类型不是[object object],不是dom对象,不是window对象,并且该对象不再其他对象的原型链中)
     * @param obj
     * @return {boolean}
     */
    function isPlainObject(obj) {
        // 以下情况返回false，不是[object Object]类型，DOM，window
        if (!isType(obj, '[object Object]') || obj.nodeType || isWindow(obj)) {
            return false;
        }
        try {
            //判断obj.constructor.prototype是否具有isPrototypeOf属性（如果有该属性说明该对象存在于其他另一个对象的原型链中）
            if (obj.constructor && !data.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    }

    /**
     * 基础方法块
     */

    /**
     * 拷贝,继承方法
     * @param 1.拷贝类型：true深拷贝;false浅拷贝（拷贝对象）
     * @param 2.拷贝到哪
     * $jh.extend(true,{},obj1,obj2...)将obj1,obj2深拷贝到{}中
     * $jh.extend({},obj1,obj2...)将obj1,obj2浅拷贝到{}中
     * $jh.extend(obj1)将obj1浅拷贝到this($jh)中成为$jh的静态属性
     * $jh.extend(true,obj1)将obj1深拷贝到this($jh)中成为$jh的静态属性
     * @return {*|{}}
     */
    $jh.extend = function () {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},//需要拷贝到哪个目标对象下
            i = 1,//记录待拷贝项在参数中的开始位置1就表示第1个及以后参数就是需要拷贝的项
            length = arguments.length,//记录参数的长度
            deep = false; //是否深度复制
        // 如果第一个参数是boolean类型的就把第二个参数赋值给target,第一个参数就表示是否需要深度复制
        if (typeof target === "boolean") {//
            deep = target;//根据入参修改是否需要深度复制
            target = arguments[1] || {};
            i = 2;
        }
        // 如果target不是object的话将target初始化为空的对象字面量
        if (typeof target !== "object" && !isType(target, '[object Function]')) {
            target = {};
        }
        // 如果参数就只有boolean,target或target 那么给你target指向调用者
        if (length === i) {
            target = this;
            --i;
        }
        // 循环拷贝参数中需要靠背的对象
        for (; i < length; i++) {
            //如果待拷贝项不为空
            if ((options = arguments[i]) != null) {
                //循环遍历待拷贝项中的属性
                for (name in options) {
                    src = target[name];
                    copy = options[name];//待拷贝项
                    // 如果要拷贝项在拷贝项中已经存在就不拷贝该项
                    if (target === copy) {
                        continue;
                    }
                    // 深度拷贝(如果是数组或者是纯粹的对象才允许深度复制)
                    if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) )) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : []//如果拷贝到的目标存在并且是一个数组就
                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }
                        target[name] = $jh.extend(deep, clone, copy);//递归调用复制待复制项下的内容
                    }
                    // 存在待拷贝项,进行浅拷贝
                    else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }
        // 返回拷贝后的对象
        return target;
    };

    /**
     * 数据存储部分的方法
     */
    $jh.extend({
        /**
         * $jh用于保存数据的方法（数据是深拷贝到storage中）
         * @param key 键
         * @param value 值
         */
        setStorage: function (key, value) {
            var save = {};
            save[key] = value;
            $jh.delStorage(key);
            $jh.extend.call(storage, true, save);
        },
        /**
         * $jh用于保存数据的方法（数据是深拷贝到storage中）
         * @param key 键
         * @param value 值
         */
        getStorage: function (key) {
            return storage[key];
        },
        /**
         * $jh用于删除数据的方法
         * @param key 键
         * @return {boolean} 是否保存成功
         */
        delStorage: function (key) {
            if ($jh.getStorage(key)) {
                try {
                    delete storage[key];
                } catch (e) {
                }
            }
        },

        /**
         * 增加控制器的方法
         * @param routeName 路由名
         * @param controllerClass 控制器类
         */
        addController: function (routeName, controllerClass) {
            controller[routeName + ''] = controllerClass;
        }
    });

    /**
     * url参数处理部分
     */
    $jh.extend({
        /**
         * 将url中的参数转为对象
         * @param urlparams url中的参数
         */
        urlparams2obj: function (urlparams) {
            var obj = {};
            if (urlparams.indexOf('?') != -1) {
                urlparams = urlparams.split('?')[1];
            }
            var params = urlparams.split('&');
            if (params.length > 1) {
                for (var i = 0; i < params.length; i++) {
                    var value = params[i].split('=');
                    if (value.length > 1) {
                        obj[value[0]] = value[1];
                    } else {
                        return {};
                    }
                }
            } else {
                var value = params[0].split('=');
                if (value.length > 1) {
                    obj[value[0]] = value[1];
                }
            }
            return obj;
        },
        /**
         * 将对象转为url中的参数
         * @param obj 对象
         */
        obj2urlparams: function (obj) {
            var urlparams = '';
            if (typeof(obj) == 'undefined' || obj == null || typeof(obj) != 'object') {
                return '';
            }
            for (var key in obj) {
                urlparams += ((urlparams.indexOf("=") != -1) ? "&" : "") + key + "=" + obj[key];
            }
            return urlparams;
        }
    });


    /**
     * $jh方法块
     */
    // 当前路由hash值
    data.currentRoute = "";
    // 调用director的路由对象
    data.routes = {};
    // 页面间传递的参数
    data.args = {};
    // 页面键值
    data.pageKey = '';
    // 页面类型（normal正常页，temp临时页）
    data.pageType = '';
    // 要返回页对的pageID（执行goBack方法是才会有该值）
    data.pageId = '';
    // 页面间切换动画
    data.animation = '';

    //spa控制器类
    function SpaController() {
    };
    SpaController.prototype = {
        constructor: SpaController,
        // 创建生命周期方法
        onCreate: function (nowPage, lastPage) {
        },
        // 创建生命周期方法
        onResume: function (nowPage, lastPage) {
        },
        // 创建生命周期方法
        onDestroy: function () {
        },
        // 创建生命周期方法
        onBack: function () {
            $jh.goBack();
        }
    };

    $jh.SpaController = SpaController;

    /**
     * 页面对象
     * 构造方法：
     * @param initData 初始化数据
     */
    function Page(initData) {
        // 路由名字
        this.routeName = initData.routeName || '';
        // 内存传递的参数(深拷贝)
        this.args = this.deepcopy(data.args);
        // url传递的参数，url传递的参数会影响界面。所以当routeName相等而param不等时页面不能复用
        this.params = initData.params || 'dom';
        // 页面键值
        this.pageKey = data.pageKey || '';
        // 页面类型（normal正常页，temp临时页）
        this.pageType = data.pageType || 'normal';
        // dom对象
        this.dom;
        // 保存到路由栈中的标志位（如果是不进栈页面加上一个时间戳，如果是进栈页面===路由名）
        this.pageId = this.routeName + new Date().getTime();
        // 控制器对象
        this.controller = undefined;
    };
    Page.prototype = {
        constructor: Page,
        // 销毁页面的方法
        destroy: function () {
        },
        // 深拷贝对象
        deepcopy: function (data) {
            if (data) {
                return $jh.extend(true, {}, data);
            } else {
                return {};
            }
        }
    };

    /**
     *  页面栈对象
     *  push方法：压栈
     *  pop方法：出栈
     */
    var Stacks = {
        //保存着页面对象
        page: {},
        //按顺序保存着页面标志位
        pageFlag: [],
        //应用的入口页面
        firstPage: {}
    };
    /**
     * 压栈操作，当要压栈对象已经存在在页面中时
     * @param page 需要入栈的页面
     */
    Stacks.push = function (page) {
        Stacks.pageFlag.push(page.pageId);
        Stacks.page[page.pageId] = page;
    };
    /**
     * 出栈操作
     * @return Object 出栈页面
     */
    Stacks.pop = function () {
        //栈中只剩下最后一页
        return Stacks.page[Stacks.pageFlag.pop()];
    };
    /**
     * 查询栈中是否存在page对象
     * @param page page对象
     * @return 下标Stacks.pageFlag（-1为没找到）
     */
    Stacks.pageExist = function (page) {
        for (var i = 0; i < Stacks.pageFlag.length; i++) {
            if (Stacks.pageFlag[i] == page.pageId) {
                return i;
            }
        }
        return -1;
    };

    /**
     * 执行goBack时根据goBack的入参返回待返回页的pageId,如果未找到符合条件的返回页返回false
     */
    Stacks.findPageId = function (obj) {
        if (obj.routeName) {
            //返回距离栈顶最近的满足routeName,key的页面
            for (var n = Stacks.pageFlag.length - 2; n >= 0; n--) {
                var pg = Stacks.getPage(n);
                if (pg.routeName === obj.routeName && (!obj.key || pg.pageKey === obj.key)) {
                    //找到离栈顶最近的正常页
                    return pg.pageId;
                }
            }
            return false;
        } else {
            //获取栈顶页
            var topPage = Stacks.getPage(-1);
            if (topPage.pageType === 'normal') {
                //栈顶页是正常页返回
                for (var n = Stacks.pageFlag.length - 2; n >= 0; n--) {
                    var pg = Stacks.getPage(n);
                    if (pg.pageType === 'normal') {
                        //找到离栈顶最近的正常页
                        return pg.pageId;
                    }
                }
                return false;
            } else if (topPage.pageType === 'temp') {
                //栈顶页是临时页返回
                return Stacks.getPage(-2).pageId;
            }
        }
    };
    /**
     * 获取栈中的page对象
     * @param index 索引值如果为+是数组下标，如果为-是倒数
     * @return {*}
     */
    Stacks.getPage = function (index) {
        if (Stacks.pageFlag.length === 0) {
            return false;
        }
        index = index % Stacks.pageFlag.length;
        if (index < 0) {
            return Stacks.page[Stacks.pageFlag[Stacks.pageFlag.length + index]];
        } else {
            return Stacks.page[Stacks.pageFlag[index]];
        }
    };
    /**
     * 从栈中倒数第二个page开始查询返回第一个进栈的page
     * @return {*}
     */
    Stacks.getInstackPage = function () {
        var lastFlag = Stacks.pageFlag.length - 2;
        var lastInstackPage = null;
        for (lastFlag; lastFlag >= 0; lastFlag--) {
            var ss = Stacks.page[Stacks.pageFlag[lastFlag]];
            if (ss.notinstack === false) {
                lastInstackPage = ss;
                break;
            }
        }
        return lastInstackPage;
    };

    /**
     * 物理按键返回和虚拟按键返回的接口
     */
    var backFlag = true;//back是否允许点击的控制器
    $jh.backHandle = function () {
        if (backFlag) {
            backFlag = false;
            setTimeout(function () {
                backFlag = true;
            }, 300);

            if (Stacks.getPage(-1).controller && Stacks.getPage(-1).controller.onBack) {
                Stacks.getPage(-1).controller.onBack();
            } else {
                $jh.goBack();
            }
        }
    };

    /**
     * 将模板字串转为dom对象返回或html字串和data渲染后返回dom
     * @param htmlstr 需要装换的字串
     * @param data 转载模板的数据
     * @param type 转载类型：是转换成字符串还是转换成dom对象
     * @returns {NodeList} dom对象
     */
    $jh.parseDom = function (htmlstr, data, type) {
        var templateStr;
        if (type == 'string') {
            if (data) {
                // 初始化胡子模板
                Mustache.parse(htmlstr);
                // 转载模板的数据
                templateStr = Mustache.render(htmlstr, data);
            } else {
                templateStr = htmlstr;
            }
            return templateStr;
        } else {
            var objE = document.createElement("div");
            if (data) {
                // 初始化胡子模板
                Mustache.parse(htmlstr);
                // 转载模板的数据
                templateStr = Mustache.render(htmlstr, data);
            } else {
                templateStr = htmlstr;
            }
            objE.innerHTML = templateStr;
            return objE.childNodes;
        }
    };

    /**
     * 创建新页(没在栈中)
     * @param page 页面对象
     */
    function newPage(page) {
        // 创建一个父节点div
        if (!page.dom) {
            page.dom = createDom('div', {
                className: 'jhAppView',
            });
            page.dom.style.display = 'none';
        }
        // 判断是否需要加载css和js
        if (controller[page.routeName]) {
            // 已经加载过js和css(但是当前没在栈中)
            // 深拷控制器
            page.controller = new controller[page.routeName]();
            // 获取当前栈顶页page对象
            var lastPage = Stacks.getPage(-1);
            // 调用该页的生命周期方法(如果lastPage == false说明没有上一页)
            page.controller.onCreate(page, lastPage);
            // 执行动画
            showPage(page, lastPage);
        } else {
            console.error('请检查config.js中是否引入控制器');
        }
    };

    /**
     * 显示已经存在的页
     * @param nowPage 需要显示的页面
     * @param lastPage 上一个页面对象
     */
    function showPage(nowPage, lastPage) {
        var index = Stacks.pageExist(nowPage),//获取当前页所在栈中的索引值
            len = Stacks.pageFlag.length;// 页面栈中有几个页
        if (index != -1) {
            // 存在栈中循环取出执行销毁方法
            for (index; index < Stacks.pageFlag.length - 1;) {
                var page = Stacks.pop();
                (function (page) {
                    page.controller.onDestroy && page.controller.onDestroy();
                    setTimeout(function () {
                        page.destroy();
                        // 如果是临时页就删除栈中的记录
                        try {
                            Stacks.page[page.pageId] = '';
                            delete Stacks.page[page.pageId];
                        } catch (e) {
                            console.error('移除堆区page对象失败');
                        }
                    }, 500);
                })(page);
            }
            nowPage.controller.onResume && nowPage.controller.onResume(nowPage, lastPage);
        } else {
            // 不存在栈中 压栈
            Stacks.push(nowPage);
        }
        if (len === 0) {
            //第一次显示
            Stacks.firstPage = nowPage;
            pageAnimation(nowPage, lastPage, 'one');
        } else {
            pageAnimation(nowPage, lastPage, data.animation);
        }
    };

    /**
     * 页面切换动画
     * @param nowPage 要显示页
     * @param lastPage 上一页
     * @param animation 动画类型
     */
    function pageAnimation(nowPage, lastPage, animation) {
        var showDom = nowPage.dom,//要显示页
            upPageDom = lastPage && lastPage.dom;//上一页
        if (animation === 'one') {
            data.parent.appendChild(showDom);
            showDom.style.display = 'block';
        } else if (animation === 'baseIn' || animation === 'baseOut') {
            //baseIn切入动画
            data.parent.appendChild(showDom);
            showDom.style.display = 'block';
            upPageDom.style.display = 'none';
            data.parent.removeChild(upPageDom);
        } else if (animation === 'easeIn') {
            //baseIn切入动画
            showDom.style.display = 'none';
            showDom.style.left = '100%';
            showDom.style.zIndex = '99';
            showDom.style.display = 'block';
            data.parent.appendChild(showDom);
            setTimeout(function () {
                showDom.style.transition = 'left 0.2s ease';
                showDom.style.left = '0';
            }, 20);
            setTimeout(function () {
                showDom.style.transition = 'none';
                showDom.style.zIndex = 'none';
                upPageDom.style.display = 'none';
                data.parent.removeChild(upPageDom);
            }, 400);
        } else if (animation === 'easeOut') {
            //baseIn切入动画
            showDom.style.display = 'none';
            showDom.style.left = '-100%';
            showDom.style.zIndex = '99';
            showDom.style.display = 'block';
            data.parent.appendChild(showDom);
            setTimeout(function () {
                showDom.style.transition = 'left 0.2s ease';
                showDom.style.left = '0';
            }, 20);
            setTimeout(function () {
                showDom.style.transition = 'none';
                showDom.style.zIndex = 'none';
                upPageDom.style.display = 'none';
                data.parent.removeChild(upPageDom);
            }, 400);
        }
        data.animation = '';//做完动画初始化值
    };

    /**
     * 初始化页面方法，判断页面是该新建还是显示还是不加入栈中
     * @param page
     */
    function _initPage(page) {
        if (data.pageId) {
            //调用的是goBack方法，pageId对应的是要返回的页面的pageId
            var backPage = Stacks.page[data.pageId];
            data.pageId = '';
            backPage.args = data.args;
            backPage.params = page.params;
            showPage(backPage, Stacks.getPage(-1));
        } else {
            //调用的是go方法或初始化创建页面，新建页面
            newPage(page);
        }
    }

    $jh.extend({
        /**
         * loading
         */
        loading: {
            //loading的html模板
            template: {
                base: '<div class="pub_loading"><div class="pub_loading_img"></div></div>',
                test: '<div class="simple_verify_loading" style="display:block;">' +
                '    <div class="loading_box">' +
                '        <div class="loading_img"></div>' +
                '        <p class="loading_text">{{title}}</p>' +
                '    </div>' +
                '</div>'
            },
            //loading的dom对象
            dom: null,
            //记录当前show的次数
            status: 0,
            //是否允许点击关闭
            clickClose: true,
            //初始化loading的dom对象
            _getDom: function (name, data) {
                var _this = this;
                _this.dom = $jh.parseDom(_this.template[name], data)[0];
                _this.dom.style.display = 'none';
                window.document.body.insertBefore(_this.dom, data.parent);
                _this.dom.addEventListener('click', function (e) {
                    if (_this.clickClose) {
                        _this.close();
                    }
                });
                return this.dom;
            },
            /**
             * 显示loading
             * @param obj
             *     unclose:点击是否允许关闭为true时不允许关闭
             *     duration:倒计时多少毫秒后关闭
             */
            show: function (obj) {
                var _this = this,
                    obj = obj || {};
                if (obj && obj.unclose) {
                    _this.clickClose = false;
                } else {
                    _this.clickClose = true;
                }
                //判断是否有在显示中的loading
                if (!_this.status++) {
                    var loadDom = _this._getDom(obj.name || 'base', obj.data || {});
                    loadDom.style.display = 'block';
                }
                if (obj && obj.duration) {
                    setTimeout(function () {
                        _this.close();
                    }, obj.duration);
                }
            },
            /**
             * 关闭loading
             */
            close: function () {
                var _this = this;
                //检索当前是否需要关闭loading(如果打开过多次loading，第一次关闭status！=0 不关闭loading，只status--)
                if (_this.status > 0 && --_this.status === 0) {
                    window.document.body.removeChild(_this.dom);
                    _this.dom = null;
                }
            }
        }
    });

    /**
     * 核心方法块
     */
    var goHandle = true;//防连点
    $jh.extend({
        /**
         * 前进的跳转（执行前进动画）只负责修改url
         * @param obj 跳转对象
         */
        go: function (obj) {
            if (!obj.routeName) {
                console.error('go方法缺少参数');
                return;
            }
            if (goHandle || obj.douTap) {
                goHandle = false;
                setTimeout(function () {
                    goHandle = true;
                }, 300);
                // 页面间传递的参数
                data.args = obj.args || {};
                // 页面键值
                data.pageKey = obj.key || '';
                // 页面类型（normal正常页，temp临时页）
                data.pageType = obj.type || '';
                // 页面间切换动画
                data.animation = obj.animation || 'baseIn';
                // 修改url
                global.location.hash = '#' + obj.routeName + (obj.params ? ('?' + obj.params) : '');
            }
        },
        /**
         * 返回的跳转（执行返回动画）只负责修改url
         * @param obj 跳页参数
         */
        goBack: function (obj) {
            if (Stacks.pageFlag.length === 1) {
                console.log('关闭webview');
                return;
            }
            if (goHandle || obj.douTap) {
                goHandle = false;
                setTimeout(function () {
                    goHandle = true;
                }, 300);
                var pageId = Stacks.findPageId(obj || {});
                if (pageId) {
                    // 返回页的pageId
                    data.pageId = pageId;
                    // 页面间传递的参数
                    data.args = (obj && obj.args) ? obj.args : {};
                    // 页面间切换动画
                    data.animation = (obj && obj.animation) ? obj.animation : 'baseOut';
                    // 修改url
                    global.location.hash = '#' + Stacks.page[pageId].routeName + ((obj && obj.params) ? ('?' + obj.params) : '');
                } else {
                    console.error('未找到goBack指定返回页');
                    return;
                }
            }
        },
        /**
         * 切换页面方法（页面存在的话执行goback方法，不存在go方法）
         * @param obj 跳页参数
         */
        switchPage: function (obj) {
            if (!(obj && obj.routeName)) {
                console.error('change必须要有routeName');
                return;
            }
            if (goHandle || obj.douTap) {
                goHandle = false;
                setTimeout(function () {
                    goHandle = true;
                }, 300);
                //入参的routeName或key是否存在栈中
                var pageId = Stacks.findPageId(obj);
                if (pageId) {
                    // 返回页的pageId
                    data.pageId = pageId;
                    // 页面间传递的参数
                    data.args = (obj && obj.args) ? obj.args : {};
                    // 页面间切换动画
                    data.animation = (obj && obj.animation) ? obj.animation : 'baseOut';
                    // 修改url
                    global.location.hash = '#' + Stacks.page[pageId].routeName + ((obj && obj.params) ? ('?' + obj.params) : '');
                } else {
                    obj.douTap = true;
                    $jh.go(obj);
                }
            }
        },

        /**
         * spa的初始化方法
         * @param config 配置对象
         */
        init: function (config) {
            // 单页的最外层父盒子
            data.parent = config.container ? doc.querySelector(config.container) : window.document.body;
            /**
             * 初始化路由配置对象
             */
            for (var key in controller) {
                (function (index, item) {
                    data.routes[index] = {
                        before: function () {
                            //当前路由hash值
                            data.currentRoute = index;
                            item.before && item.before();
                        },
                        // 当路由匹配成功后，需要执行的方法
                        on: function () {
                            //_getUrlParam是该页面传递的参数如果有参数："a=b&b=c"；没有："dom"
                            var urlParams = _getUrlParam();
                            //初始化页面方法，判断页面是该新建还是显示
                            var initData = {
                                routeName: index,//路由名
                                params: urlParams//url传参
                            };
                            _initPage(new Page(initData));
                        },
                        //当离开当前注册路径时，需要执行的方法
                        after: function () {
                            item.after && item.after();
                        }
                    };
                })(key, controller[key]);
            }
            router(data.routes).configure({
                notfound: function () {
                    $jh.go({
                        routeName: config.errRoute || '/error',
                        douTap: true
                    });
                }
            }).init(config.home || '/');
        }
    });
});