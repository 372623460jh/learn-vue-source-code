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
        for (var i = 0, l = keys.length; i < l; i++) {
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

})(window);