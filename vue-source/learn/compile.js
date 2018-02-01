function Compile(el, vm) {
    this.vm = vm;
    this.el = document.querySelector(el);
    this.fragment = null;
    this.init();
}

Compile.prototype = {
    init: function () {
        if (this.el) {
            this.fragment = this.nodeToFragment(this.el);
            this.compileElement(this.fragment);
            this.el.appendChild(this.fragment);
        } else {
            console.log('Dom元素不存在');
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
     * 匹配文档碎片中的占位符
     * @param el view层对应的文档碎片
     */
    compileElement: function (el) {
        var childNodes = el.childNodes;
        var self = this;
        [].slice.call(childNodes).forEach(function (node) {
            var reg = /\{\{(.*)\}\}/;

            //获取元素的纯文本内容
            var text = node.textContent;

            //如果是element  nodeType = 3是文本 2是属性 1是节点
            // if (self.isElementNode(node)) {
            //     self.compile(node);
            // }

            //如果是文本且 正则匹配到了占位符
            if (self.isTextNode(node) && reg.test(text)) {
                self.compileText(node, reg.exec(text)[1]);
            }

            //如果有子节点
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
        });
    },

    // /**
    //  * element的编译(处理节点上属性的)
    //  * @param node
    //  */
    // compile: function(node) {
    //     var nodeAttrs = node.attributes;
    //     var self = this;
    //     Array.prototype.forEach.call(nodeAttrs, function(attr) {
    //         var attrName = attr.name;
    //         if (self.isDirective(attrName)) {
    //             var exp = attr.value;
    //             var dir = attrName.substring(2);
    //             if (self.isEventDirective(dir)) {  // 事件指令
    //                 self.compileEvent(node, self.vm, exp, dir);
    //             } else {  // v-model 指令
    //                 self.compileModel(node, self.vm, exp, dir);
    //             }
    //             node.removeAttribute(attrName);
    //         }
    //     });
    // },

    /**
     * 文本内容
     * @param node
     * @param exp
     */
    compileText: function (node, exp) {
        var self = this;
        var initText = this.vm[exp];
        this.updateText(node, initText);
        new Watcher(this.vm, exp, function (value) {
            self.updateText(node, value);
        });
    },
    // 更新文本
    updateText: function (node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    // isElementNode: function (node) {
    //     return node.nodeType == 1;
    // },
    isTextNode: function (node) {
        return node.nodeType == 3;
    }


    // compileEvent: function (node, vm, exp, dir) {
    //     var eventType = dir.split(':')[1];
    //     var cb = vm.methods && vm.methods[exp];
    //
    //     if (eventType && cb) {
    //         node.addEventListener(eventType, cb.bind(vm), false);
    //     }
    // },
    //
    // compileModel: function (node, vm, exp, dir) {
    //     var self = this;
    //     var val = this.vm[exp];
    //     this.modelUpdater(node, val);
    //     new Watcher(this.vm, exp, function (value) {
    //         self.modelUpdater(node, value);
    //     });
    //
    //     node.addEventListener('input', function(e) {
    //         var newValue = e.target.value;
    //         if (val === newValue) {
    //             return;
    //         }
    //         self.vm[exp] = newValue;
    //         val = newValue;
    //     });
    // },
    // modelUpdater: function(node, value, oldValue) {
    //     node.value = typeof value == 'undefined' ? '' : value;
    // },
    // isDirective: function(attr) {
    //     return attr.indexOf('v-') == 0;
    // },
    // isEventDirective: function(dir) {
    //     return dir.indexOf('on:') === 0;
    // },
}
