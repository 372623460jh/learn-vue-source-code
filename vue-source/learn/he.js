/**
 * Created by Et on 2018/2/6.
 */
!(function (window, undefined) {

    // 匹配出dom字串中的所有属性 class="test"
    var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
    var ncname = '[a-zA-Z_][\\w\\-\\.]*';
    var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
    // 匹配出dom字串中开头的标签名 <div></div>中的<div
    var startTagOpen = new RegExp(("^<" + qnameCapture));
    // 匹配出dom字符串的结尾 <img/>中的/>
    var startTagClose = /^\s*(\/?)>/;
    // 匹配结束标签 <div></div>中的</div>
    var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
    // 匹配DOCTYPE标签 <!DOCTYPE html>
    var doctype = /^<!DOCTYPE [^>]+>/i;
    // 匹配注释注释开头 <!--
    var comment = /^<!--/;
    // 匹配<![
    var conditionalComment = /^<!\[/;

    // 段落元素
    var isNonPhrasingTag = makeMap(
        'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
        'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
        'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
        'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
        'title,tr,track'
    );

    // 自闭合的元素，结尾不需要斜线
    // 如<link rel="stylesheet" href="a.css">
    var isUnaryTag = makeMap(
        'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
        'link,meta,param,source,track,wbr'
    );

    // 可忽略的自闭合元素
    var canBeLeftOpenTag = makeMap(
        'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
    );

    // script,style,textarea标签
    var isPlainTextElement = makeMap('script,style,textarea', true);

    // 处理pre,textarea标签下有\n导致pre,textarea内容换号的bug
    var isIgnoreNewlineTag = makeMap('pre,textarea', true);
    var shouldIgnoreFirstNewline = function (tag, html) {
        return tag && isIgnoreNewlineTag(tag) && html[0] === '\n';
    };

    // 解决正则表达式bug
    var IS_REGEX_CAPTURING_BROKEN = false;
    'x'.replace(/x(.)?/g, function (m, g) {
        IS_REGEX_CAPTURING_BROKEN = g === '';
    });

    // 是不是矢量标签
    var isSVG = makeMap(
        'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
        'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
        'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
        true
    );

    // 判断是否在浏览器中
    var inBrowser = typeof window !== 'undefined';
    // 获取浏浏览器userAgent
    var UA = inBrowser && window.navigator.userAgent.toLowerCase();
    // 通过userAgent判断是不是IE
    var isIE = UA && /msie|trident/.test(UA);
    // 通过userAgent判断是不是edge浏览器
    var isEdge = UA && UA.indexOf('edge/') > 0;

    var reCache = {};

    //解码器
    var decoder;
    var he = {
        //解码方法
        decode: function decode(html) {
            decoder = decoder || document.createElement('div');
            decoder.innerHTML = html;
            return decoder.textContent
        }
    };

    //缓存器
    function cached(fn) {
        var cache = Object.create(null);
        return (function cachedFn(str) {
            var hit = cache[str];
            return hit || (cache[str] = fn(str))
        })
    }


    /**
     * 将用逗号分开的自创装换为集合，返回用来判断传入字串是否属于该集合的方法
     * @param str               生成集合的字串
     * @param exceptsLowerCase  是否忽略大小写
     * @returns {Function}
     */
    function makeMap(str, exceptsLowerCase) {
        var map = Object.create(null);//创建原始对象
        var list = str.split(',');
        for (var i = 0, l = list.length; i < l; i++) {
            map[list[i]] = true;
        }
        return exceptsLowerCase
            ? function (val) {
                return map[val.toLowerCase()];
            }
            : function (val) {
                return map[val];
            }
    }

    /**
     * 通过数组创建属性集合(把元素的属性数组转为对象)
     * 将[{naem:'class',value:'test'}{id:'id',value:'id1'}]  ===>   {class:'test',id:'id1'}
     * @param attrs 属性数组
     * @returns {{}}
     */
    function makeAttrsMap(attrs) {
        var map = {};
        for (var i = 0, l = attrs.length; i < l; i++) {
            //是否是重复属性（IE和Edge忽略此判断）
            if (map[attrs[i].name] && !isIE && !isEdge) {
                console.log('重复的属性：' + attrs[i].name);
            }
            map[attrs[i].name] = attrs[i].value;
        }
        return map
    }

    /**
     * 给属性中的以下字符进行解码
     * @param value
     * @param shouldDecodeNewlines
     * @returns {void|*|string|XML}
     */
    var decodingMap = {
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&amp;': '&',
        '&#10;': '\n',
        '&#9;': '\t'
    };
    var encodedAttr = /&(?:lt|gt|quot|amp|#10|#9);/g;

    function decodeAttr(value) {
        return value.replace(encodedAttr, function (match) {
            return decodingMap[match];
        })
    }

    //========================================解决bug专区（开始）======================================

    /**
     * 解决IE下svg标签bug
     * @param tag
     * @returns {*}
     */
    var ieNSBug = /^xmlns:NS\d+/;
    var ieNSPrefix = /^NS\d+:/;

    function guardIESVGBug(attrs) {
        var res = [];
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            if (!ieNSBug.test(attr.name)) {
                attr.name = attr.name.replace(ieNSPrefix, '');
                res.push(attr);
            }
        }
        return res
    }

    //========================================解决bug专区（结束）======================================


    /**
     * 创建抽象语法树AST对象的方法（虚拟dom）
     * @param tag       //标签名
     * @param attrs     //属性名
     * @param parent    //父节点
     * @param ns        //命名空间
     * @returns {{type: number, tag: *, attrsList: *, attrsMap: *, parent: *, children: Array}}
     */
    function createASTElement(tag, attrs, parent, ns) {
        return {
            type: 1,                        //标签类型（1是element节点）
            tag: tag,                       //标签名
            attrsList: attrs,               //标签属性数组
            attrsMap: makeAttrsMap(attrs),  //标签属性集合
            parent: parent,                 //父AST对象（父节点）
            children: [],                   //子AST对象数组（子节点集合）
            ns: ns                          //命名空间
        }
    }

    /**
     * 判断虚拟dom对象是不是style标签,或是没有type属性的script或时type='text/javascript'的script标签
     * <style></style>
     * <script></script>
     * <script type='text/javascript'></script>
     * @param el
     * @returns {boolean}
     */
    function isForbiddenTag(el) {
        return (el.tag === 'style' || (el.tag === 'script' && (!el.attrsMap.type || el.attrsMap.type === 'text/javascript')))
    }

    /**
     * 特殊处理svg标签和MathML标签的命名空间
     * @param tag
     * @returns {*}
     */
    var platformGetTagNamespace = function getTagNamespace(tag) {
        // 如果是矢量标签放回svg
        if (isSVG(tag)) {
            return 'svg'
        }
        // MathML只支持math作为root element
        if (tag === 'math') {
            return 'math'
        }
    };

    /**
     * 移除并返回虚拟dom中的指定属性
     * @param el                 虚拟dom
     * @param name               属性名
     * @param removeFromMap      是否从map中移除（虚拟属性中的dom有两个属性集合一个是attrsMap,一个是数组attrsList）
     * @returns {*}
     */
    function getAndRemoveAttr(el, name, removeFromMap) {
        var val;
        if ((val = el.attrsMap[name]) != null) {
            var list = el.attrsList;
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i].name === name) {
                    list.splice(i, 1);
                    break;
                }
            }
        }
        if (removeFromMap) {
            delete el.attrsMap[name];
        }
        return val
    }

    /**
     * 将_from中的属性（非原型链上）浅拷贝到to中
     * @param to
     * @param _from
     * @returns {*}
     */
    function extend(to, _from) {
        for (var key in _from) {
            to[key] = _from[key];
        }
        return to
    }

    //===========================for指令解析（开始）===========================
    // 匹配for指令中的in of关键字
    var forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/;
    // 用于替换开头的（和结尾的）
    var stripParensRE = /^\(|\)$/g;
    // 检测v-for中的索引值
    var forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;

    /**
     * 解析for指令到虚拟dom对象中（增加for指令相关的属性）
     * @param el
     */
    function processFor(el) {
        var exp;
        if ((exp = getAndRemoveAttr(el, 'v-for'))) {
            var res = parseFor(exp);
            if (res) {
                // 将for指令解析出来的属性挂载到虚拟dom对象上
                // for:被循环对象（data）
                // alias：从被循环对象循环出来的（item，有该属性无iterator1，iterator2）
                // iterator1属性对应有索引的value（有该属性无alias）
                // iterator2属性对应有索引的key（有该属性无alias）
                extend(el, res);
            } else {
                console.error("无效的v-for指令" + exp);
            }
        }
    }

    /**
     * 解析for指令详细方法
     * @param exp
     * @returns {{}}
     */
    function parseFor(exp) {
        // 匹配for指令中的in of关键字
        var inMatch = exp.match(forAliasRE);
        if (!inMatch) {
            return
        }
        // 结果对象
        var res = {};
        // v-for='item in data'
        // for属性是被循环对象名（data）
        res.for = inMatch[2].trim();
        // alias是从被循环对象循环出来的（item）
        var alias = inMatch[1].trim().replace(stripParensRE, '');

        // v-for="(value, key) in object"
        // 检索出索引值
        var iteratorMatch = alias.match(forIteratorRE);
        if (iteratorMatch) {
            // 存在索引值
            res.alias = alias.replace(forIteratorRE, '');
            // iterator1属性对应上面的value
            res.iterator1 = iteratorMatch[1].trim();
            if (iteratorMatch[2]) {
                // iterator2属性对应上面的key也就是索引值
                res.iterator2 = iteratorMatch[2].trim();
            }
        } else {
            // 如果没有索引值alias属性就对应item
            res.alias = alias;
        }
        return res
    }

    //===========================for指令解析（结束）===========================

    //===========================if指令解析（开始）============================
    /**
     * 解析if指令到虚拟dom对象中（增加if指令相关的属性）
     * if：v-if指令中的内容
     * else：是否有v-else指令
     * elseif：v-else-if指令中的内容
     * @param el
     */
    function processIf(el) {
        // 获取虚拟dom是否有v-if属性
        var exp = getAndRemoveAttr(el, 'v-if');
        if (exp) {
            el.if = exp;
            addIfCondition(el, {
                exp: exp,
                block: el
            });
        } else {
            // 获取虚拟dom是否有v-else属性
            if (getAndRemoveAttr(el, 'v-else') != null) {
                el.else = true;
            }
            // 获取虚拟dom是否有v-else-if属性
            var elseif = getAndRemoveAttr(el, 'v-else-if');
            if (elseif) {
                el.elseif = elseif;
            }
        }
    }

    /**
     * 在虚拟dom中添加if指令栈ifConditions属性
     * @param el
     * @param condition
     */
    function addIfCondition(el, condition) {
        if (!el.ifConditions) {
            el.ifConditions = [];
        }
        //将{exp:if指令中的内容,block:对应的虚拟dom}压栈
        el.ifConditions.push(condition);
    }

    /**
     * 查找el元素同级前一个元素是否有v-if指令
     * @param el                含有else或elseif的元素
     * @param parent            含有else或elseif的元素的父元素
     */
    function processIfConditions(el, parent) {
        // 查找同级前一个vdom.type == 1的兄弟元素
        var prev = findPrevElement(parent.children);
        if (prev && prev.if) {
            //将当前元素的else或elseif表达式加入含v-if指令的ifConditions栈中
            addIfCondition(prev, {
                exp: el.elseif,//如果是else指令该值为undefined
                block: el
            });
        } else {
            console.error("v-" + (el.elseif ? ('else-if="' + el.elseif + '"') : 'else') + "之前<" + (el.tag) + ">元素上没有 v-if 指令");
        }
    }

    /**
     * 查找并返回children数组中从右向左第一个type===1的元素(忽略if和else或elseif之间的内容为空的text元素)
     * @param children
     * @return {*}
     */
    function findPrevElement(children) {
        var i = children.length;
        while (i--) {
            if (children[i].type === 1) {
                return children[i]
            } else {
                if (children[i].text !== ' ') {
                    // v-if 和 else或elseif之间夹着一个有内容的非element元素
                    console.error("文本 \"" + (children[i].text.trim()) + "\" 出现在 v-if 和 v-else(-if)之间。");
                }
                //出栈
                children.pop();
            }
        }
    }

    //===========================if指令解析（结束）============================


    //===========================解析:或v-bind:指令中的表达式（开始）===========
    /**
     * 获取绑定的属性（如:key指令或bind:key指令）
     * @param el                虚拟dom
     * @param name              绑定的属性
     * @param getStatic         是否去属性中取（当属性!false时去属性中直接取name）
     * @return {*}
     */
    function getBindingAttr(el, name, getStatic) {
        // 获取虚拟dom中有没有:[name]之类的指令或是v-bind:[name]之类的指令
        var dynamicValue = getAndRemoveAttr(el, ':' + name) || getAndRemoveAttr(el, 'v-bind:' + name);
        if (dynamicValue != null) {
            return parseFilters(dynamicValue)
        } else if (getStatic !== false) {
            var staticValue = getAndRemoveAttr(el, name);
            if (staticValue != null) {
                //将静态属性值返回如"{"key":"zhangsan"}"
                return JSON.stringify(staticValue)
            }
        }
    }

    /**
     * 过滤器
     * @param exp 属性字符串（:key='test'中的test）
     * @return {*}
     */
    var validDivisionCharRE = /[\w).+\-_$\]]/;//匹配 A-Z a-z 0-9 _ ) . + - $ ]
    function parseFilters(exp) {
        // 是否有未闭合的单引号
        var inSingle = false;
        // 是否有未闭合的双引号
        var inDouble = false;
        // 是不是es6模板语法
        var inTemplateString = false;
        // 是否有未闭合的正则表达式
        var inRegex = false;
        // 未闭合的左大括号出现次数
        var curly = 0;
        // 未闭合的左中括号出现次数
        var square = 0;
        // 未闭合的左小括号出现次数
        var paren = 0;
        // |连接符右侧索引值（|连接符连接多个表达式）
        var lastFilterIndex = 0;
        var c,//当前字符
            prev,//上一个字符
            i,//当前字符索引值
            expression,//第一个表达式
            filters;//表达式栈

        for (i = 0; i < exp.length; i++) {
            prev = c;
            // 获取字符的 Unicode 编码
            c = exp.charCodeAt(i);
            if (inSingle) {
                //当前字符是'且上一个字符不是\转义符
                if (c === 0x27 && prev !== 0x5C) {
                    // 和上一个单引号形成闭合关系
                    inSingle = false;
                }
            } else if (inDouble) {
                //当前字符是"且上一个字符不是\转义符
                if (c === 0x22 && prev !== 0x5C) {
                    // 和上一个双引号形成闭合关系
                    inDouble = false;
                }
            } else if (inTemplateString) {
                //当前字符是`且上一个字符不是\转义符
                if (c === 0x60 && prev !== 0x5C) {
                    //es6模板语法形成闭合关系
                    inTemplateString = false;
                }
            } else if (inRegex) {
                //当前字符是/且上一个字符不是\转义符
                if (c === 0x2f && prev !== 0x5C) {
                    // 匹配正则表达式形成闭合关系
                    inRegex = false;
                }
            } else if (c === 0x7C && exp.charCodeAt(i + 1) !== 0x7C && exp.charCodeAt(i - 1) !== 0x7C && !curly && !square && !paren) {
                //当前字符是|且前后一个字符都不是| 并且不处于非闭合的([{中
                if (expression === undefined) {
                    // 下一个表达式的开始位置
                    lastFilterIndex = i + 1;
                    // 第一个表达式
                    expression = exp.slice(0, i).trim();
                } else {
                    // 将后续表达式入栈
                    pushFilter();
                }
            } else {
                switch (c) {
                    // " 匹配双引号
                    case 0x22:
                        inDouble = true;
                        break
                    // ' 匹配当引号
                    case 0x27:
                        inSingle = true;
                        break
                    // ` 匹配es6模板符号
                    case 0x60:
                        inTemplateString = true;
                        break
                    // ( 匹配左括号
                    case 0x28:
                        paren++;
                        break
                    // ) 匹配右括号
                    case 0x29:
                        paren--;
                        break
                    // [ 匹配左中括号
                    case 0x5B:
                        square++;
                        break
                    // ] 匹配右中括号
                    case 0x5D:
                        square--;
                        break
                    // { 匹配左花括号
                    case 0x7B:
                        curly++;
                        break
                    // } 匹配右花括号
                    case 0x7D:
                        curly--;
                        break
                }
                // 匹配正则表达式
                if (c === 0x2f) {
                    // 当前字符是/
                    var j = i - 1;//前一个字符索引
                    var p = (void 0);
                    // 查找字符/前第一个不是空格的字符
                    for (; j >= 0; j--) {
                        p = exp.charAt(j);
                        if (p !== ' ') {
                            // 字符/前第一个不是' '的字符
                            break
                        }
                    }
                    // 如果/前全是空格或者不是A-Z a-z 0-9 _ ) . + - $ ]字符
                    if (!p || !validDivisionCharRE.test(p)) {
                        inRegex = true;
                    }
                }
            }
        }

        if (expression === undefined) {
            // 就一个表达式
            expression = exp.slice(0, i).trim();
        } else if (lastFilterIndex !== 0) {
            // 多个表达式入栈最后一个表达式
            pushFilter();
        }

        // 将用|分割的表达式压入filters栈中
        function pushFilter() {
            // 将表达式压入filters栈中
            (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim());
            lastFilterIndex = i + 1;
        }

        // |分割的表达式栈
        if (filters) {
            // 如果有多个表达式
            for (i = 0; i < filters.length; i++) {
                expression = wrapFilter(expression, filters[i]);
            }
        }
        return expression
    }

    /**
     * 包装多个表达式（没看懂！！！）
     * @param exp
     * @param filter
     * @return {string}
     */
    function wrapFilter(exp, filter) {
        var i = filter.indexOf('(');
        if (i < 0) {
            return ("_f(\"" + filter + "\")(" + exp + ")")
        } else {
            var name = filter.slice(0, i);
            var args = filter.slice(i + 1);
            return ("_f(\"" + name + "\")(" + exp + "," + args)
        }
    }

    //===========================解析:或v-bind:指令中的表达式（结束）===========

    // mustache模板引擎的占位符
    var defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g;

    // 带缓存的html解码器
    var decodeHTMLCached = cached(he.decode);

    /**
     * 处理文本中的mustache占位符
     * @param text
     * @return {{expression: string, tokens: Array}}
     */
    function parseText(text) {
        var tagRE = defaultTagRE;
        // 匹配是否出现{{}} mustache模板引擎的占位符
        if (!tagRE.test(text)) {
            return
        }
        // 解析出字串中占位符的值和静态值生成数组。如：
        // "{{test1}} staticTest {{test2}}" 解析后是 ["_s(test1)",""staticTest"","_s(test2)"]
        var tokens = [];
        // 解析出字串中占位符的值和静态值生成数组。如：
        // "{{test1}} staticTest {{test2}}" 解析后是 [{@binding: "message"},"staticTest",{@binding: "test2"}]
        var rawTokens = [];
        var lastIndex = tagRE.lastIndex = 0;
        var match, index, tokenValue;
        while ((match = tagRE.exec(text))) {
            // 循环匹配文本中的胡子占位符
            index = match.index;
            if (index > lastIndex) {
                // 两个mustache占位符之间的静态值
                rawTokens.push(tokenValue = text.slice(lastIndex, index));
                tokens.push(JSON.stringify(tokenValue));
            }
            // 解析mustache占位符中的表达式
            var exp = parseFilters(match[1].trim());
            tokens.push(("_s(" + exp + ")"));
            rawTokens.push({'@binding': exp});
            lastIndex = index + match[0].length;
        }
        if (lastIndex < text.length) {
            // mustache占位符之后的静态值
            rawTokens.push(tokenValue = text.slice(lastIndex));
            tokens.push(JSON.stringify(tokenValue));
        }
        return {
            expression: tokens.join('+'),
            tokens: rawTokens
        }
    }

    // 在解析ast时处理特殊指令数组transformNode处理class，transformNode$1处理style。如有其他可以增加
    var transforms = [transformNode, transformNode$1];

    /**
     * 处理静态类名和绑定类名。静态类名是不可变的bind类名是通过表达式生成的
     * @param el            vdom
     */
    function transformNode(el) {
        // 获取vdom的class属性
        var staticClass = getAndRemoveAttr(el, 'class');
        if (staticClass) {
            // 匹配静态类中占位符
            var res = parseText(staticClass);
            if (res) {
                console.error("class=\"" + staticClass + "\":请使用v-bind:或:来代替。例如：<div class=\"{{ val }}\">, 使用<div :class=\"val\">");
            }
        }
        if (staticClass) {
            // 设置vdom中的staticClass属性
            el.staticClass = JSON.stringify(staticClass);
        }
        // 获取vdom上的v-bind:class 或 :class
        var classBinding = getBindingAttr(el, 'class');
        if (classBinding) {
            // 解析v-bind:class 或者 :class 指令 添加classBinding属性
            el.classBinding = classBinding;
        }
    }

    /**
     * 处理静态style和v-bind:style或者:style。静态是不可变的bind是通过表达式生成的
     * @param el            vdom
     */
    function transformNode$1(el) {
        // 获取vdom的style属性
        var staticStyle = getAndRemoveAttr(el, 'style');
        if (staticStyle) {
            // 匹配静态样式中的占位符
            var res = parseText(staticStyle);
            if (res) {
                console.error("style=\"" + staticStyle + "\":请使用v-bind:或:来代替。例如：<div style=\"{{ val }}\">, 使用<div :style=\"val\">");
            }
            el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
        }
        // 获取vdom上的v-bind:style 或 :style
        var styleBinding = getBindingAttr(el, 'style');
        if (styleBinding) {
            // 解析v-bind:style 或者 :style 指令 添加styleBinding属性
            el.styleBinding = styleBinding;
        }
    }

    /**
     * 处理vdom
     * @param element
     * @param options
     */
    function processElement(element) {
        for (var i = 0; i < transforms.length; i++) {
            // 调用transforms来处理style和class
            element = transforms[i](element) || element;
        }
    }

    /**
     * 判断是不是script标签或者style标签
     * @param el
     * @return {boolean}
     */
    function isTextTag(el) {
        return el.tag === 'script' || el.tag === 'style'
    }

    /**
     * 将html字符串解析为AST （将html解析为虚拟dom）
     */
    function praseHtml(html, options) {

        var stack = [];//保存还未找到闭合的元素的栈
        var expectHTML = options.expectHTML;
        var isUnaryTag$$1 = options.isUnaryTag || false;
        var canBeLeftOpenTag$$1 = options.canBeLeftOpenTag || false;
        var last;// 截取前剩余html字符串
        var index = 0;// 字符切割游标（当前字符是原字符串切割到了第几位留下的）
        var lastTag;// 上一个匹配到的标签,处理stack后会被重写复制lastTag永远指向栈顶元素
        while (html) {
            last = html;
            // 没有父标签 或 父标签不是script,style,textare特殊标签
            if (!lastTag || !isPlainTextElement(lastTag)) {
                var textEnd = html.indexOf('<');
                // 检查元素标签开始符前是否有其他文本
                if (textEnd === 0) {
                    // 匹配注释
                    if (comment.test(html)) {
                        var commentEnd = html.indexOf('-->');
                        if (commentEnd >= 0 && options.comment) {
                            //截取注释部分
                            options.comment(html.substring(4, commentEnd));
                        }
                        // 将注释从html中剔除
                        advance(commentEnd + 3);
                        continue;
                    }

                    // 处理比如说<![CDATA["，结束于 "]]>这类标签
                    if (conditionalComment.test(html)) {
                        var conditionalEnd = html.indexOf(']>');
                        if (conditionalEnd >= 0) {
                            advance(conditionalEnd + 2);
                            continue;
                        }
                    }

                    // 处理DOCTYPE标签如 <!DOCTYPE html>
                    var doctypeMatch = html.match(doctype);
                    if (doctypeMatch) {
                        advance(doctypeMatch[0].length);
                        continue;
                    }

                    // 匹配结束标签 <div></div>中的</div>
                    var endTagMatch = html.match(endTag);
                    if (endTagMatch) {
                        var startIndex = index;
                        advance(endTagMatch[0].length);
                        parseEndTag(endTagMatch[1], startIndex, index);
                        continue;
                    }

                    // 标签开头
                    var startTagMatch = parseStartTag();
                    if (startTagMatch) {
                        // 根据匹配结果生成匹配节点的AST对象
                        handleStartTag(startTagMatch);
                        if (shouldIgnoreFirstNewline(lastTag, html)) {
                            // pre,textarea元素内第一个\n换行符,将换行符替换掉,
                            // 解决textarea,pre多空行bug
                            advance(1);
                        }
                        continue;
                    }
                }

                var text,//标签中的文本
                    rest,//切除除标签外的文本剩余
                    next;//文本中下一个<的索引用于检查<是否有用

                //处理html字串text标签中含有<的
                if (textEnd >= 0) {
                    rest = html.slice(textEnd);
                    while (!endTag.test(rest) && !startTagOpen.test(rest) && !comment.test(rest) && !conditionalComment.test(rest)) {
                        // <后没有任何标签 <得当做text标签处理
                        next = rest.indexOf('<', 1);
                        if (next < 0) {
                            // <之后没有<
                            break;
                        }
                        textEnd += next;
                        rest = html.slice(textEnd);
                    }
                    text = html.substring(0, textEnd);
                    advance(textEnd);
                }

                // 剩余文本中没找到<全部当做text标签处理
                if (textEnd < 0) {
                    text = html;
                    html = '';
                }

                //调用处理text标签的方法
                if (options.chars && text) {
                    options.chars(text);
                }
            } else {
                // 父标签是script,style,textare特殊标签
                var endTagLength = 0;
                var stackedTag = lastTag.toLowerCase();
                var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
                var rest$1 = html.replace(reStackedTag, function (all, text, endTag) {
                    endTagLength = endTag.length;
                    if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
                        text = text.replace(/<!--([\s\S]*?)-->/g, '$1').replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
                    }
                    if (shouldIgnoreFirstNewline(stackedTag, text)) {
                        text = text.slice(1);
                    }
                    if (options.chars) {
                        options.chars(text);
                    }
                    return ''
                });
                index += html.length - rest$1.length;
                html = rest$1;
                parseEndTag(stackedTag, index - endTagLength, index);
            }

            if (html === last) {
                // html是匹配后的 last是匹配前的 匹配前后数据没发生改变（死循环） 就当做text标签处理
                options.chars && options.chars(html);
                if (!stack.length && options.warn) {
                    console.error('格式化标签模板错误,匹配前后文本未变会造成死循环:' + html);
                }
                break;
            }
        }

        // 匹配结束调用一次清除stack中剩余的标签
        parseEndTag();

        //将匹配成功的html字串剔除
        function advance(n) {
            index += n;
            html = html.substring(n);
        }

        /**
         * 解析出元素标识(完整的标签开头)
         */
        function parseStartTag() {
            // 匹配节点的tag如<div></div>匹配开头的<div中的div
            var start = html.match(startTagOpen);
            if (start) {
                // 匹配结果对象
                var match = {
                    tagName: start[1], //标签名
                    attrs: [], // 属性数组
                    start: index // 标签字符串开始位置
                };
                // 截取匹配后的字符串
                advance(start[0].length);
                var end, attr;
                // startTagClose查询tag的关闭符号如<div></div>查找出<div>中的>
                // attribute查询所有属性如<div class='test'></div>查找出class='test'
                // 当匹配到标签的>时终止
                while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
                    // 从html中剔除掉匹配到的属性
                    advance(attr[0].length);
                    match.attrs.push(attr);
                }
                if (end) {
                    // unarySlash为标签结束符>之前，属性之后的值如<div class='test' jiji></div> unarySlash就为jiji
                    match.unarySlash = end[1];
                    advance(end[0].length);
                    // end为标签的长度
                    match.end = index; //标签长度
                    return match
                }
            }
        }

        /**
         * 标签字串开头的生成AXT的方法
         * @param match 匹配结果
         */
        function handleStartTag(match) {
            var tagName = match.tagName;
            var unarySlash = match.unarySlash;
            if (expectHTML) {
                // 如果是段落元素
                if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
                    //如果父元素是p元素并且子元素是一个段落元素
                    //用来处理以p父元素中包含段落元素如：
                    //<p><h1></h1><h2><h2></p> 会被解析为4个并列的元素(p,h1,h2,p)
                    parseEndTag(lastTag);
                }
                // 判断是不是可省略的闭合标签
                if (canBeLeftOpenTag$$1(tagName) && lastTag === tagName) {
                    // 用来处理连续出现的两个可忽略闭合元素如：
                    // <li><li>
                    parseEndTag(tagName);
                }
            }
            // 自闭合标签如img，link 判断如果是自闭合标签或者存在unarySlash返回true
            var unary = isUnaryTag$$1(tagName) || !!unarySlash;
            // 处理属性
            var l = match.attrs.length;
            var attrs = new Array(l);
            for (var i = 0; i < l; i++) {
                var args = match.attrs[i];
                // 处理正则表达式bug
                if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
                    if (args[3] === '') {
                        delete args[3];
                    }
                    if (args[4] === '') {
                        delete args[4];
                    }
                    if (args[5] === '') {
                        delete args[5];
                    }
                }
                // 属性的值
                var value = args[3] || args[4] || args[5] || '';
                attrs[i] = {
                    name: args[1],//属性名
                    value: decodeAttr(value)//解码属性
                };
            }
            if (!unary) {
                //如果不是自闭合的标签往stack中压入已经检索完的AST对象
                //包含标签名，小写标签名，属性数组里面是{属性名，值}的对象
                stack.push({tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs});
                //设置上衣个标签名为该标签名
                lastTag = tagName;
            }
            if (options.start) {
                //解析出一个AST对象 调用start回调方法 入参（节点名，属性数组，是否自闭合，开始位置，标签长度）
                options.start(tagName, attrs, unary, match.start, match.end);
            }
        }

        /**
         * 解析标签结束
         * @param tagName
         * @param start
         * @param end
         */
        function parseEndTag(tagName, start, end) {

            // 从后向前查找stack中第一个能和结束标签tagName匹配的索引值
            var pos;
            // tagName转为全小写用于和stack中元素的lowerCasedTag属性比对
            var lowerCaseTagName;
            if (start == null) {
                start = index;
            }
            if (end == null) {
                end = index;
            }
            if (tagName) {
                lowerCaseTagName = tagName.toLowerCase();
                // 查找结束标签对应的stack中索引值
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    if (stack[pos].lowerCasedTag === lowerCaseTagName) {
                        break;
                    }
                }
            } else {
                // 如果未传入结束标签名
                pos = 0;
            }

            if (pos >= 0) {
                // 在栈中找到了对应的闭合元素
                for (var i = stack.length - 1; i >= pos; i--) {
                    if (i > pos || !tagName) {
                        //没有匹配到结束标签
                        console.error("标签 <" + (stack[i].tag) + "> 没有结束标签。");
                    }
                    if (options.end) {
                        //执行查找到闭合元素的回调
                        options.end(stack[i].tag, start, end);
                    }
                }

                // 把保存还未闭合节点的栈中出栈已闭合的
                stack.length = pos;
                // 设置当前最后
                lastTag = pos && stack[pos - 1].tag;
            } else if (lowerCaseTagName === 'br') {
                // 没在如果匹配到的是</br> 特殊处理
                if (options.start) {
                    options.start(tagName, [], true, start, end);
                }
            } else if (lowerCaseTagName === 'p') {
                // 如果匹配到的是</p> 特殊处理
                if (options.start) {
                    options.start(tagName, [], false, start, end);
                }
                if (options.end) {
                    options.end(tagName, start, end);
                }
            }

        }
    }

    /**
     * 将html字串解析成AST也就是vdom
     * @param template                  html字符串
     * @return {*}                      根vdom对象
     */
    function parse(template) {
        // 未闭合元素栈
        var stack = [];
        // 文本是否保留空格
        var preserveWhitespace = true;
        // 根vdom
        var root;
        // 父AST对象（父虚拟节点）
        var currentParent;

        //转换AST的设置
        var options = {
            expectHTML: true,
            isUnaryTag: isUnaryTag,
            canBeLeftOpenTag: canBeLeftOpenTag,
            start: function start(tag, attrs, unary, start, end) {
                console.log("匹配到标签开始 " + tag);
                // 参数：节点名，属性数组，是否自闭合，开始位置，标签长度
                // 校验命名空间 如果有父标签则将命名空间设置为父标签的命名空间如果
                // 没有父标签且标签是svg标签则将命名空间设置位svg,如果标签是MathML标签设置命名空间为math
                var ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);

                // 特殊处理在IE下svg标签属性名的兼容bug
                if (isIE && ns === 'svg') {
                    attrs = guardIESVGBug(attrs);
                }

                // 创建AST对象(虚拟dom）
                var element = createASTElement(tag, attrs, currentParent, ns ? ns : undefined);

                // 过滤模板中的script和style标签
                if (isForbiddenTag(element)) {
                    element.forbidden = true;
                    console.error('模板仅负责用来映射UI相关，请不要在模板中加入副作用的标签。如:<' + tag + '>,将不会被模板引擎解析');
                }

                if (!element.processed) {
                    // 如果该虚拟节点没有被处理过，处理其if for once指令
                    processFor(element);
                    processIf(element);
                    // 处理元素(处理class属性和style属性)
                    processElement(element);
                }

                // 校验根节点不能为slot，template和含有v-for的元素
                function checkRootConstraints(el) {
                    if (el.tag === 'slot' || el.tag === 'template') {
                        console.error('不能使用<' + (el.tag) + '>做为根节点因为它可能包含多个节点');
                    }
                    if (el.attrsMap.hasOwnProperty('v-for')) {
                        console.error('不能使用含有v-for指令的节点做为根节点因为它会呈现多个元素');
                    }
                }

                if (!root) {
                    // 当前vdom是根节点
                    root = element;
                    // 校验根节点的合法性
                    checkRootConstraints(root);
                }
                else if (!stack.length) {
                    //没有未闭合的元素
                    if (root.if && (element.elseif || element.else)) {
                        // 根vdom有if指令 当前vdom有elseif指令或else指令 是根元素的同级元素并和根vdom的if指令形成对应
                        // 校验根节点的合法性
                        checkRootConstraints(element);
                        // 给根节点添加elseif表达式和表达式对应的vdom
                        addIfCondition(root, {
                            exp: element.elseif,
                            block: element
                        });
                    } else {
                        console.error('根节点中使用了v-if指令但在和根节点同级的元素中未发现elseif或else指令');
                    }
                }

                if (currentParent && !element.forbidden) {
                    //如果当前vdom有父元素 且当前元素不是script和style标签
                    if (element.elseif || element.else) {
                        // 当前元素有else或者elseif指令（需要找到和当前vdom同级的含有v-if的vdom将当前元素的else或elseif表达式加入ifConditions栈中）
                        processIfConditions(element, currentParent);
                    } else {
                        // 将当前vdom压入父vdom栈中
                        currentParent.children.push(element);
                        // 设置当前vdom的父vdom属性
                        element.parent = currentParent;
                    }
                }

                if (!unary) {
                    // 不是自闭和元素
                    currentParent = element;//当前元素为下一个vdom的父元素
                    stack.push(element);//将当前还未闭合的元素压栈
                }
            },
            end: function end() {
                // 匹配到一个元素结尾，就执行一次end回调
                console.log("匹配到标签结束 " + arguments[0]);
                // 取出未闭合栈顶元素
                var element = stack[stack.length - 1];
                // 设置未闭合栈顶vdom的子元素中的最后一个vdom为lastNode
                var lastNode = element.children[element.children.length - 1];
                if (lastNode && lastNode.type === 3 && lastNode.text === ' ') {
                    // 如果lastNode 是一个text类型的vdom并内容为空 就移除该节点
                    element.children.pop();
                }
                // 未闭合元素出栈
                stack.length -= 1;//修改栈的长度
                currentParent = stack[stack.length - 1];//设置当前父元素为未闭合标签栈的栈顶元素
            },
            chars: function chars(text) {
                // 参数：text标签文本
                // 处理text标签匹配到text标签会回调 如果文本中含有模板占位符就创建一个2类型的vdom
                // 如果是一个纯文本就创建一个3类型的纯文本vdom
                console.log("匹配到文本标签 " + text);
                if (!currentParent) {
                    //文本没有父元素
                    if (text === template) {
                        console.error("传入模板只是一个文本而不是一个根元素");
                    } else if ((text = text.trim())) {
                        console.error("text \"" + text + "\" 外部根元素将被忽略。");
                    }
                    return;
                }
                //解决IE下textarea标签placeholder属性中的内容被当做文本标签处理的bug
                if (isIE && currentParent.tag === 'textarea' && currentParent.attrsMap.placeholder === text) {
                    return
                }
                //父vdom的子vdom栈
                var children = currentParent.children;
                text = text.trim()
                    ? (isTextTag(currentParent) ? text : decodeHTMLCached(text))
                    : ((preserveWhitespace && children.length) ? ' ' : '');
                if (text) {
                    var res;
                    if (text !== ' ' && (res = parseText(text))) {
                        // 解析text为mustache占位符
                        children.push({
                            type: 2,//带mustache占位符的节点类型
                            expression: res.expression,
                            tokens: res.tokens,
                            text: text
                        });
                    } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
                        children.push({
                            type: 3,//纯文本的节点类型
                            text: text
                        });
                    }
                }
            },
            comment: function comment(text) {
                // 参数：注释内容 处理注释回调
                console.log("匹配到注释 " + text);
                // 给父vdom插入一个注释vdom（文本节点）
                currentParent.children.push({
                    type: 3,
                    text: text,
                    isComment: true
                });
            }
        };

        praseHtml(template, options);

        // 返回虚拟dom的跟节点对象
        return root;
    }

    window.testparse = parse;

})(window);