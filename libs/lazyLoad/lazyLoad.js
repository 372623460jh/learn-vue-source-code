/**
 * Created by jianghe on 2018/1/6.
 */

'use strict';

var imgList = [],  // 页面所有img元素集合
    delay,   // setTimeout 对象
    offset,  //偏移量，用于指定图片距离可视区域多少距离，进行加载
    time,  // 延迟载入时间
    scrollDom, // 滑动父元素
    lastTime, // 上次执行滑动事件事件
    _selector; // 选择器 默认为 .jhlazyload

/**
 * 判断元素是否需要显示
 * @param el
 * @return {boolean}
 * @private
 */
function _isShow(el) {
    //获取当前元素所在窗口的位置
    var coords = el.getBoundingClientRect();
    //返回当前元素所在窗口的top值是否小于窗口的高度+偏移值
    return ( (coords.top >= 0 && coords.left >= 0 && coords.top) <= (window.innerHeight || document.documentElement.clientHeight) + parseInt(offset));
}

/**
 * 懒加载图片的方法
 * @private
 */
function _loadImage() {
    for (var i = 0; i < imgList.length;) {
        var el = imgList[i];
        if (_isShow(el)) {
            //遍历图片列表，检索图片是否需要显示
            el.src = el.getAttribute('data-src');
            //创建一个/(\s|^)类名(\s|$)/的正则表达式 匹配class中以空格或开头，结尾的类名并移除它
            el.className = el.className.replace(new RegExp("(\\s|^)" + _selector.substring(1, _selector.length) + "(\\s|$)"), " ");
            //从懒加载列表中删除该img标签
            imgList.splice(i, 1);
        } else {
            i++;
        }
    }
}

/**
 * 延迟执行图片懒加载
 * @private
 */
function _delay() {
    var nowTime = new Date().getTime();
    if ((nowTime - (lastTime || 0) > 100) && !delay) {
        lastTime = nowTime;
        clearTimeout(delay);
        delay = setTimeout(function () {
            _loadImage();
            clearTimeout(delay);
            delay = null;
        }, time);
    }
}

/**
 * 图片懒加载类
 * @param selector 类名
 * @param options 设置
 * {
 *      offset:超出屏幕多少偏移量的的提前懒加载
 *      time:延迟加载时间
 *      iScroll：iScroll组件(必须使用iscoll-probe，设置probeType = 3)
 *      scrollDom: 滑动父dom对象
 * }
 * @constructor
 */
function ImageLazyload(selector, options) {
    var defaults = {};
    _selector = '.jhlazyload';
    if (typeof selector == 'string') {
        _selector = selector || '.jhlazyload';
        defaults = options || {};
    } else if ("object" == typeof selector) {
        defaults = selector || {};
    }
    offset = defaults.offset || 0;
    time = defaults.time || 250;
    scrollDom = defaults.scrollDom || window;
    this.getNode();
    _delay();//避免首次加载未触发touch事件,主动触发一次加载函数
    if (defaults.iScroll) {
        defaults.iScroll.on('scroll', _delay);
        defaults.iScroll.on('scrollEnd', _delay);
    } else {
        scrollDom.addEventListener('scroll', _delay, false);
    }
}

ImageLazyload.prototype.getNode = function () {
    imgList = [];
    //查询出所有需要懒加载的图片
    var nodes = document.querySelectorAll(_selector);
    for (var i = 0, l = nodes.length; i < l; i++) {
        imgList.push(nodes[i]);
    }
};

export default ImageLazyload;