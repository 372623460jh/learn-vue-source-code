/**
 *  Created by jianghe on 2017/12/25.
 */

'use strict';
import $ from 'jquery';

var _doc = document;
const touch_enable = 'ontouchstart' in window;

/**
 * 点击按下态组件
 * 给元素添加一个自定义属性data-clickstate = true
 * 当该元素被点击或事件冒泡到此元素时,会在此元素的class中增加一个'cs_down',
 * 按下500ms后或鼠标、手指主动抬起后移除'cs_down'类名
 */
export default {
    prop: function () {
        //document对象上是否绑定了btnDown
        if (_doc._bindBtnDown) {
            return;
        }
        _doc._bindBtnDown = true;
        var eventname = touch_enable ? 'touchstart' : 'mousedown'
        $(_doc).on(eventname, function (ev) {
            var parentDom = ev.target;
            while (true) {
                if (parentDom === _doc.body) {
                    break;
                } else {
                    if (parentDom.dataset && parentDom.dataset.clickstate) {
                        //存在点击态
                        if (!/cs_down/.test(parentDom.className)) {
                            //给需要点击态的元素增加cs_down类名
                            parentDom.className += ' cs_down';
                            (function (pd) {
                                // 添加抬起事件
                                var upEventname = (eventname === 'touchstart') ? 'touchend' : 'mouseup';
                                $(pd).on(upEventname, function () {
                                    //鼠标抬起时主动释放点击态
                                    clearTimeout(timer);
                                    setTimeout(function () {
                                        pd.classList.remove('cs_down');
                                    }, 30);
                                    $(pd).off(upEventname);
                                })
                                var timer = setTimeout(function () {
                                    //500ms后主动释放点击态
                                    $(pd).off(upEventname);
                                    pd.classList.remove('cs_down');
                                    clearTimeout(timer);
                                }, 500);
                            })(parentDom);
                        }
                        break;
                    } else {
                        parentDom = parentDom.parentNode || parentDom.parentElement || null;
                        if (!parentDom) {
                            break;
                        }
                    }
                }
            }
        });
    }
};