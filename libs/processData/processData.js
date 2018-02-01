/**
 * Created by jianghe on 2017/5/8.
 */

!(function (global, undefined) {
    'use strict';

    var trim = "".trim, // string的trim方法
        dom = window.document,
        regtrim = /^[\s\uFEFF\xA0]+||[\s\uFEFF\xA0]+$/g,// 代替string的trim方法的正则表达式("\uFEFF\xA0"是个特殊的空格编码）
        regCheckJson = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        },
        rep;

    //公共的抛错方法
    function _error(msg) {
        throw new Error(msg)
    }

    //去除string首尾空格的方法
    var _trim = trim && !trim.call("\uFEFF\xA0") ?//!trim.call("\uFEFF\xA0")表示trim可以移除"\uFEFF\xA0"这个特殊的空格
        function (text) {//调用string的trim方法
            return text === null ? "" : trim.call(text);
        } :// 不兼容string的trim方法使用正则来替换
        function (text) {
            return text === null ? "" : ( text + "" ).replace(regtrim, "");
        };

    //校验传入的json字符串是不是合法
    function _checkout_json(json_str) {
        var requireNonComma,//用于检测上一次匹配值是否是，or { or [ ;
            depth = null;//用于标记json串的深度
        return json_str.replace(regCheckJson, function (token, comma, open, close) {
            // replace回调方法中的参数
            // token：匹配值
            // comma：第一个括号的匹配值相当于$1
            // open：第二个括号的匹配值相当于$2
            // close：第二个括号的匹配值相当于$3
            // 倒数第二个参数：匹配下标
            // 最后一个参数：原匹配串
            // 上次匹配到 ，or { or [ 这次还是匹配到 ，这种情况说明json串出错了将深度重置为0
            if (requireNonComma && comma) {
                depth = 0;
            }
            // 出错的json串一直返回原值
            if (depth === 0) {
                return token;
            }
            // 匹配到的是 ，or { or [ 时requireNonComma为true
            requireNonComma = open || comma;
            // 如果匹配到 ("[" or "{"): open深度++ 子级开始
            // 如果匹配到 ("]" or "}"): close深度-- 子级结束
            // other cases ("," or 值): 深度不变 同级
            depth += !close - !open;
            return "";
        });
    }

    function str(key, holder) {
        var i,
            k,
            v,
            length,
            mind = gap,
            partial,
            value = holder[key];
        if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }
        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }
        switch (typeof value) {
            case 'string':
                return quote(value);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null':
                return String(value);
            case 'object':
                if (!value) {
                    return 'null';
                }
                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }
                    v = partial.length === 0
                        ? '[]'
                        : gap
                            ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                            : '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }
                if (rep && typeof rep === 'object') {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        if (typeof rep[i] === 'string') {
                            k = rep[i];
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                } else {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                }
                v = partial.length === 0
                    ? '{}'
                    : gap
                        ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                        : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
        }
    }

    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string'
                    ? c
                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' : '"' + string + '"';
    }

    // json转str方法
    function _json2str(value, replacer, space) {
        var i;
        gap = '';
        indent = '';
        if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
                indent += ' ';
            }

        } else if (typeof space === 'string') {
            indent = space;
        }
        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
            (typeof replacer !== 'object' ||
            typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
        }
        return str('', {'': value});
    };

    // str转json方法
    function _parseJSON(data) {
        if (window.JSON && window.JSON.parse) {
            // 如果兼容JSON.parse方法就是用该方法返回json
            return window.JSON.parse(data + "");
        }
        var str = _trim(data + "");
        return str && !_checkout_json(str) ? ( Function("return " + str))() : _error("无效的JSON字符串: " + data);
    }

    // str转xml方法
    function _parseXML(data) {
        var xml, tmp;
        if (!data || typeof data !== "string") {
            return null;
        }
        try {
            if (window.DOMParser) { // 标准浏览器
                tmp = new DOMParser();
                xml = tmp.parseFromString(data, "text/xml");
            } else { // IE
                xml = new ActiveXObject("Microsoft.XMLDOM");
                xml.async = "false";
                xml.loadXML(data);
            }
        } catch (e) {
            xml = undefined;
        }
        if (!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length) {
            _error("无效的XML字符串: " + data);
        }
        return xml;
    }

    // xml转str方法
    function _xml2str(xml) {
        var xmldom;
        try {
            xmldom = xml.childNodes[0];// 检测xml对象是否合法
        } catch (e) {
            xmldom = undefined;
        }
        if (xmldom) {
            if (xmldom.outerHTML) {
                return xmldom.outerHTML; //如果兼容outerHTML方法
            } else {
                // ie678下xml节点的类型是[object IXMLDOMElement]有xml这个属性
                // 标准模式是[object Element]无xml这个属性
                if (xmldom.xml) {
                    return xmldom.xml;
                }
                var div = dom.createElement("div");
                div.appendChild(xmldom);
                return div.innerHTML;

            }
        }
        _error("无效的XML对象: " + xml);
    }

    var processData = {
        parseJSON: function (jsonstr) {
            return _parseJSON(jsonstr);// str转json方法
        },
        json2str: function (jsonObject) {
            return _json2str(jsonObject);// json转str方法
        },
        parseXML: function (xmlstr) {
            return _parseXML(xmlstr);// str转xml方法
        },
        xml2str: function (xml) {
            return _xml2str(xml);// xml转str方法
        }
    };

    if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
        module.exports = processData; // CommonJS
    } else if (typeof define === 'function' && define.amd) {
        define(['exports'], processData); // AMD
    } else {
        global.processData = processData;
    }
})(window);
