/**
 * Created by jianghe on 2018/1/30.
 * version 1.0.0
 *
 * 原理:
 * 数据监听者部分：通过遍历data,给data的每个属性通过defineProperty添加setter和getter方法（数据拦截方法，读写数据就会被拦截），
 * 每个data属性的数据监听者都有一个观察者容器实例，用来保存所有和该数据相关的观察者。
 *
 * dom观察者部分：通过遍历dom元素来建立类名观察者，自定义属性观察者，文本观察者，指令观察者（观察者的构造方法里会调用对应数据的
 * getter方法，从而达到观察者和对应数据之间建立绑定关系）并将该观察者实例保存到数据监听者的观察者容器实例属性中。
 *
 * 当data中某个属性被重新赋值时会触发该属性的setter方法，setter方法会从观察者容器栈中循环取出关联的观察者实例，并执行观察者的
 * update方法从而达到更新dom的方法
 *
 * 数据监听者和dom观察者之间的关系是多对多的
 * 1个数据监听者可以对应多个dom观察者；
 * 简言之：1个数据的改变可以驱动多个dom的多个属性改变（具体是哪些改变可从数据监听者的观察者容器实例中遍历取出）
 * 1个dom观察者可以对应多个数据监听者；
 * 简言之：1个dom对象的属性可能由多个数据来决定（具体是哪些数据在dom观察者对象的matchResult属性下）
 * 1个dom对象可以有多个不同类型的观察者：如文本观察者 类名观察者 自定义属性观察者 指令观察者；
 */
!(function (window, undefined) {
    /**
     * dom观察者
     * @param he 组件实例上下文
     * @param matchResult 观察者关联的数据的键值
     * @param cb 数据改变时回调方法
     */
    function Watcher(he, key, cb) {
        this.he = he;
        this.key = key;
        this.cb = cb; //执行该方法进行更新dom
        this.get();  // 将自己添加到订阅器的操作
    };
    Watcher.prototype = {
        /**
         * 更新dom的方法
         * @param updataData 数据对象里面包含新老数据 根数据 key
         */
        update: function (updataData) {
            this.run(updataData);
        },
        run: function (updataData) {
            this.cb.call(this.he, updataData);
        },
        get: function () {
            WatcherVessel.target = this;  // 缓存自己
            /**
             * 主动执行以下数据拦截(监听器)的get方法让数据拦截器来绑定缓存中的自己(观察者)
             * 建立监听器和观察者之间的关联：
             * data <==defineProperty==> 数据监听器 <==调用get方法建立连接==> dom观察者  <==映射器==> dom
             * data的改变会被监听器拦截到,监听器找到相应的观察者
             */
            this.he.data[this.key];
            WatcherVessel.target = null;  // 释放自己
        }
    };

    /**
     * dom观察者容器类
     * 在每一个数据监听者中有一个改实例用来保存对应的dom观察者
     */
    function WatcherVessel() {
        this.subs = [];
    };
    WatcherVessel.prototype = {
        /**
         * 添加观察者方法
         * @param watcher
         */
        addWatcher: function (watcher) {
            this.subs.push(watcher);
        },
        /**
         * 遍历执行栈中dom观察者实例的update方法
         */
        notify: function (updataData) {
            this.subs.forEach(function (sub) {
                sub.update(updataData);
            });
        }
    };
    /**
     * 静态属性用来缓存当前需要和数据监听者关联的dom观察者实例
     * 通过主动触发数据监听者的get方法来建立数据监听者和dom观察者的联系
     */
    WatcherVessel.target = null;


    /**
     * 映射器用来建立dom(节点)与watcher(观察者)之间的联系(根据dom对象中的占位符来创建观察者)
     * @constructor
     */
    function Mapper(he) {
        //需要映射器关联的dom对象
        this.dom = he.dom;
        //组件上下文对象
        this.he = he;
        //文档碎片
        this.fragment = null;
        this.init();
    };
    Mapper.prototype = {
        constructor: Mapper,
        init: function () {
            if (this.dom) {
                this.fragment = this.nodeToFragment(this.dom);
                this.createRelationship(this.fragment);

            } else {
                console.log('组件未传入dom');
            }
        },

        /**
         * 将节点转化为文档碎片
         * @param el
         * @return {DocumentFragment}
         */
        nodeToFragment: function (el) {
            var fragment = document.createDocumentFragment();
            var child = el.firstChild;
            while (child) {
                // 将Dom元素移入fragment中
                fragment.appendChild(child);
                child = el.firstChild
            }
            return fragment;
        },

        /**
         * 建立dom和观察的关系
         */
        createRelationship: function (fragment) {
            var that = this,
                childNodes = fragment.childNodes;
            [].slice.call(childNodes).forEach(function (node) {
                if (that.isElementNode(node)) {
                    //Element节点的处理
                    //处理指令

                    //匹配类名中的字符串
                    var classMatchResult = that._matchString(node.className);
                    if (classMatchResult.length > 0) {
                        //类名的更新规则
                        that._classNameRule(node, classMatchResult, node.className);
                    }

                    //处理自定义属性
                    var ds = node.dataset;
                    for (var key in ds) {
                        var dataMatchResult = that._matchString(node.dataset[key]);
                        if (dataMatchResult.length > 0) {
                            //自定义属性的更新规则
                            that._dataSetRule(node, dataMatchResult, node.dataset[key], key);
                        }
                    }

                    if (node.childNodes && node.childNodes.length) {
                        //如果还有子节点递归建立关系
                        that.createRelationship(node);
                    }
                } else if (that.isTextNode(node)) {
                    //匹配文本中的字符串
                    var matchResult = that._matchString(node.textContent);
                    if (matchResult.length > 0) {
                        //文本的更新规则
                        that._textRule(node, matchResult, node.textContent);
                    }
                }
            });
        },

        /**
         * 匹配element中字符串里的占位符
         * @param textString     待匹配字串
         * @return {Array}       匹配结果
         * @private
         */
        _matchString: function (textString) {
            var reg = /\{\{([A-Za-z0-9_\.\s]+)\}\}/g,//匹配占位符的正则
                matchResult = [];//保存匹配结果
            if (!textString) {
                return matchResult;
            }
            /**
             * 匹配规则{{}}中只允许出现A-Z a-z 0-9 _ .
             * 如果出现其他特殊字符会直接把{{}}整体当做字串处理
             */
            while (true) {
                var arr = reg.exec(textString);
                if (!arr) break;
                matchResult.push({
                    perch: arr[0],
                    result: arr[1].replace(/\s/g, '')
                });
            }
            return matchResult;
        },

        /**
         * 文本的更新规则
         * @param node          对应dom节点
         * @param matchResult   匹配结果
         * @param ancestorText  原始文本
         */
        _textRule: function (node, matchResult, ancestorText) {
            var that = this,
                initText = ancestorText;
            matchResult.forEach(function (item) {
                initText = initText.replace(item.perch, that.he.data[item.result]);
                //===========创建dom观察者===========
                new Watcher(that.he, item.result, function (updataData) {
                    //===========根据占位符重新赋值文本===========
                    initText = ancestorText;
                    matchResult.forEach(function (item) {
                        initText = initText.replace(item.perch, updataData.rootData[item.result])
                    });
                    that.updateText(node, initText);
                });
            });
            //===========初始化数据===========
            that.updateText(node, initText);
        },

        /**
         * 类名的更新规则
         * @param node          对应dom节点
         * @param matchResult   匹配结果
         * @param ancestorText  原始文本
         */
        _classNameRule: function (node, matchResult, ancestorText) {
            var that = this,
                initText = ancestorText;
            matchResult.forEach(function (item) {
                initText = initText.replace(item.perch, that.he.data[item.result]);
                //===========创建dom观察者===========
                new Watcher(that.he, item.result, function (updataData) {
                    //===========根据占位符重新赋值文本===========
                    initText = ancestorText;
                    matchResult.forEach(function (item) {
                        initText = initText.replace(item.perch, updataData.rootData[item.result])
                    });
                    that.updateClassName(node, initText);
                });
            });
            //===========初始化数据===========
            that.updateClassName(node, initText);
        },

        /**
         * 自定义属性的更新规则
         * @param node          对应dom节点
         * @param matchResult   匹配结果
         * @param ancestorText  原始文本
         * @param key           dataset的键值
         */
        _dataSetRule: function (node, matchResult, ancestorText, key) {
            var that = this,
                initText = ancestorText;
            matchResult.forEach(function (item) {
                initText = initText.replace(item.perch, that.he.data[item.result]);
                //===========创建dom观察者===========
                new Watcher(that.he, item.result, function (updataData) {
                    //===========根据占位符重新赋值文本===========
                    initText = ancestorText;
                    matchResult.forEach(function (item) {
                        initText = initText.replace(item.perch, updataData.rootData[item.result])
                    });
                    that.updateDataSet(node, key, initText);
                });
            });
            //===========初始化数据===========
            that.updateDataSet(node, key, initText);
        },

        /**
         * 更新节点的文本内容
         * @param node
         * @param value
         */
        updateText: function (node, value) {
            node.textContent = typeof value == 'undefined' ? '' : value;
        },

        /**
         * 更新节点的类名
         * @param node
         * @param value
         */
        updateClassName: function (node, value) {
            node.className = typeof value == 'undefined' ? '' : value;
        },

        /**
         * 更新节点的自定义属性
         * @param node
         * @param key
         * @param value
         */
        updateDataSet: function (node, key, value) {
            node.dataset[key] = typeof value == 'undefined' ? '' : value;
        },

        /**
         * 判断节点是不是text节点
         * @param node
         * @return {boolean}
         */
        isTextNode: function (node) {
            return node.nodeType == 3;
        },

        /**
         * 判断节点是不是Element节点
         * @param node
         * @return {boolean}
         */
        isElementNode: function (node) {
            return node.nodeType == 1;
        },
    };

    /**
     * 数据监听者对象
     * @param value     需要监听的数据
     * @constructor
     */
    function Observer(value) {
        this.data = value;
        //创建一个观察者容器
        this.watcherVessel = new WatcherVessel();
        if (Array.isArray(this.data)) {
            //如果要监听的数据是数组
            this.addObserverArray(this.data);
        } else {
            this.addObserver(this.data);
        }
    };
    /**
     * 非数组的添加数据监听方法
     * @param data
     */
    Observer.prototype.addObserver = function addObserver(data) {
        var keys = Object.keys(data);
        //循环给每一个数据添加监听器
        for (var i = 0, l = data.length; i < l; i++) {
            defineReactive(data, keys[i], data[keys[i]]);
        }
    };
    /**
     * 数组的添加数据监听方法
     * @param data
     */
    Observer.prototype.addObserverArray = function addObserverArray(data) {
        //循环给每一个数据添加监听器
        for (var i = 0, l = data.length; i < l; i++) {
            observe(data[i]);
        }
    };

    /**
     * 创建自定义属性的方法
     * @param data
     * @param key
     * @param val
     * @private
     */
    function defineReactive(data, key, val) {

        var watcherVessel = new WatcherVessel();

        //调用监听数据的方法获取字节点的数据监听对象
        var childOb = observe(val);

        Object.defineProperty(data, key, {
            get: function () {
                if (WatcherVessel.target) {
                    watcherVessel.addWatcher(WatcherVessel.target);
                }
                return val;
            },
            set: function (newValue) {
                var oldValue = val;
                if (val === newValue) return;
                console.log(key + ":" + val + "==>" + newValue);
                val = newValue;
                /**
                 * 执行所有观察者的update方法
                 * rootData根数据
                 * oldValue老数据
                 * key键值
                 * rootData[key]新数据
                 */
                watcherVessel.notify({
                    newValue: newValue,
                    oldValue: oldValue,
                    rootData: data,
                    key: key
                });
            },
            configurable: true,//是否允许删除该属性
            enumerable: true//是否允许被枚举
        });
    };

    /**
     * 监听数据的方法
     * @param value     需要监听的数据
     * 返回监听数据对象
     */
    function observe(value) {
        if (!value || typeof value != 'object') {
            return;
        }
        var ob = new Observer(value);
        return ob;
    }

    /**
     * 组件对象
     * @param options
     */
    function He(options) {
        this.data = options.data || '';//数据
        this.dom = this.parseDom(options.htmlstr);//数据对应的dom对象
        this.ob = observe(this.data);//给数据添加数据拦截事件
        this.element = new Mapper(this).fragment;// 数据拦截事件添加完后需要建立数据与dom的映射关系
    };
    He.prototype = {
        constructor: He,
        /**
         * 将html转换为dom
         * @param html
         * @return {Element}
         */
        parseDom: function (html) {
            var objE = document.createElement("div");
            objE.innerHTML = html;
            return objE;
        },

        /**
         * 将dom转为字符串
         * @param el            dom
         * @return {string}     dom字串
         */
        getOuterHTML: function (el) {
            if (el.outerHTML) {
                return el.outerHTML
            } else {
                var container = document.createElement('div');
                container.appendChild(el.cloneNode(true));
                return container.innerHTML
            }
        }
    };
    window.He = He;

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
    // <link rel="stylesheet" href="a.css">
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

    //
    var reCache = {};


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


    function transformNode(el, options) {
        var warn = options.warn || baseWarn;
        var staticClass = getAndRemoveAttr(el, 'class');
        if ("development" !== 'production' && staticClass) {
            var res = parseText(staticClass, options.delimiters);
            if (res) {
                warn(
                    "class=\"" + staticClass + "\": " +
                    'Interpolation inside attributes has been removed. ' +
                    'Use v-bind or the colon shorthand instead. For example, ' +
                    'instead of <div class="{{ val }}">, use <div :class="val">.'
                );
            }
        }
        if (staticClass) {
            el.staticClass = JSON.stringify(staticClass);
        }
        var classBinding = getBindingAttr(el, 'class', false /* getStatic */);
        if (classBinding) {
            el.classBinding = classBinding;
        }
    }

    function genData(el) {
        var data = '';
        if (el.staticClass) {
            data += "staticClass:" + (el.staticClass) + ",";
        }
        if (el.classBinding) {
            data += "class:" + (el.classBinding) + ",";
        }
        return data
    }

    function transformNode$1(el, options) {
        var warn = options.warn || baseWarn;
        var staticStyle = getAndRemoveAttr(el, 'style');
        if (staticStyle) {
            /* istanbul ignore if */
            {
                var res = parseText(staticStyle, options.delimiters);
                if (res) {
                    warn(
                        "style=\"" + staticStyle + "\": " +
                        'Interpolation inside attributes has been removed. ' +
                        'Use v-bind or the colon shorthand instead. For example, ' +
                        'instead of <div style="{{ val }}">, use <div :style="val">.'
                    );
                }
            }
            el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
        }

        var styleBinding = getBindingAttr(el, 'style', false /* getStatic */);
        if (styleBinding) {
            el.styleBinding = styleBinding;
        }
    }

    function genData$1(el) {
        var data = '';
        if (el.staticStyle) {
            data += "staticStyle:" + (el.staticStyle) + ",";
        }
        if (el.styleBinding) {
            data += "style:(" + (el.styleBinding) + "),";
        }
        return data
    }

    function preTransformNode(el, options) {
        if (el.tag === 'input') {
            var map = el.attrsMap;
            if (map['v-model'] && (map['v-bind:type'] || map[':type'])) {
                var typeBinding = getBindingAttr(el, 'type');
                var ifCondition = getAndRemoveAttr(el, 'v-if', true);
                var ifConditionExtra = ifCondition ? ("&&(" + ifCondition + ")") : "";
                var hasElse = getAndRemoveAttr(el, 'v-else', true) != null;
                var elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true);
                // 1. checkbox
                var branch0 = cloneASTElement(el);
                // process for on the main node
                processFor(branch0);
                addRawAttr(branch0, 'type', 'checkbox');
                processElement(branch0, options);
                branch0.processed = true; // prevent it from double-processed
                branch0.if = "(" + typeBinding + ")==='checkbox'" + ifConditionExtra;
                addIfCondition(branch0, {
                    exp: branch0.if,
                    block: branch0
                });
                // 2. add radio else-if condition
                var branch1 = cloneASTElement(el);
                getAndRemoveAttr(branch1, 'v-for', true);
                addRawAttr(branch1, 'type', 'radio');
                processElement(branch1, options);
                addIfCondition(branch0, {
                    exp: "(" + typeBinding + ")==='radio'" + ifConditionExtra,
                    block: branch1
                });
                // 3. other
                var branch2 = cloneASTElement(el);
                getAndRemoveAttr(branch2, 'v-for', true);
                addRawAttr(branch2, ':type', typeBinding);
                processElement(branch2, options);
                addIfCondition(branch0, {
                    exp: ifCondition,
                    block: branch2
                });

                if (hasElse) {
                    branch0.else = true;
                } else if (elseIfCondition) {
                    branch0.elseif = elseIfCondition;
                }

                return branch0
            }
        }
    }

    var baseOptions = {
        expectHTML: true,
        modules: [
            {
                staticKeys: ['staticClass'],
                transformNode: transformNode,
                genData: genData
            },
            {
                staticKeys: ['staticStyle'],
                transformNode: transformNode$1,
                genData: genData$1
            },
            {
                preTransformNode: preTransformNode
            }
        ],
        directives: directives$1,
        isPreTag: isPreTag,
        isUnaryTag: isUnaryTag,
        mustUseProp: mustUseProp,
        canBeLeftOpenTag: canBeLeftOpenTag,
        isReservedTag: isReservedTag,
        getTagNamespace: getTagNamespace,
        staticKeys: genStaticKeys(modules$1)
    };


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
     * 将html字串解析成AST
     * @param template
     */
    function parse(template) {
        var stack = [];
        var preserveWhitespace = options.preserveWhitespace !== false;
        var root;
        // 父AST对象（父虚拟节点）
        var currentParent;
        var inVPre = false;
        var inPre = false;
        var warned = false;

        //转换AST的设置
        var options = {
            expectHTML: true,
            isUnaryTag: isUnaryTag,
            canBeLeftOpenTag: canBeLeftOpenTag,
            start: function start(tag, attrs, unary, start, end) {
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

                // apply pre-transforms
                for (var i = 0; i < preTransforms.length; i++) {
                    element = preTransforms[i](element, options) || element;
                }

                if (!inVPre) {
                    processPre(element);
                    if (element.pre) {
                        inVPre = true;
                    }
                }
                if (platformIsPreTag(element.tag)) {
                    inPre = true;
                }
                if (inVPre) {
                    processRawAttrs(element);
                } else if (!element.processed) {
                    // structural directives
                    processFor(element);
                    processIf(element);
                    processOnce(element);
                    // element-scope stuff
                    processElement(element, options);
                }

                function checkRootConstraints(el) {
                    {
                        if (el.tag === 'slot' || el.tag === 'template') {
                            warnOnce(
                                "Cannot use <" + (el.tag) + "> as component root element because it may " +
                                'contain multiple nodes.'
                            );
                        }
                        if (el.attrsMap.hasOwnProperty('v-for')) {
                            warnOnce(
                                'Cannot use v-for on stateful component root element because ' +
                                'it renders multiple elements.'
                            );
                        }
                    }
                }

                // tree management
                if (!root) {
                    root = element;
                    checkRootConstraints(root);
                } else if (!stack.length) {
                    // allow root elements with v-if, v-else-if and v-else
                    if (root.if && (element.elseif || element.else)) {
                        checkRootConstraints(element);
                        addIfCondition(root, {
                            exp: element.elseif,
                            block: element
                        });
                    } else {
                        warnOnce(
                            "Component template should contain exactly one root element. " +
                            "If you are using v-if on multiple elements, " +
                            "use v-else-if to chain them instead."
                        );
                    }
                }
                if (currentParent && !element.forbidden) {
                    if (element.elseif || element.else) {
                        processIfConditions(element, currentParent);
                    } else if (element.slotScope) { // scoped slot
                        currentParent.plain = false;
                        var name = element.slotTarget || '"default"';
                        (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
                    } else {
                        currentParent.children.push(element);
                        element.parent = currentParent;
                    }
                }
                if (!unary) {
                    currentParent = element;
                    stack.push(element);
                } else {
                    closeElement(element);
                }
            },
            end: function end() {

                // 匹配到一个元素结尾，就执行一次end回调
                console.log("匹配到标签结束 " + arguments[0]);
            },
            chars: function chars(text) {
                // 参数：text标签文本

                // 处理text标签匹配到text标签会回调
                console.log("匹配到文本标签 " + text);

            },
            comment: function comment(text) {
                // 参数：注释内容

                // 处理注释的回调
                console.log("匹配到注释 " + text);
            }
        };
    }


    window.testparse = parse

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

})(window);




