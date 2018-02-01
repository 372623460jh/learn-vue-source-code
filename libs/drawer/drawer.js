// //初始化
// $(function(){
//     var $container = $('#container');
//     new Drawer({
//         dir: 'right',//表示菜单位于右侧,默认为左侧
//         container: $container,
//         main: $container.children('.main'),
//         moveFn:function,
//         endFn:function
//     });
// });

'use strict';

import $ from 'jquery';

class Drawer {

    constructor(config) {
        return this._init(config);
    }

    _init(config) {
        var that = this;
        that._config = $.extend({
            dir: 'right',
            transition: '-webkit-transform .15s ease-out',
        }, config);
        that._cacheParam()._bindEventListener();
        return that;
    }

    //将config中传入的参数拷贝到Drawer对象中以_开头
    _cacheParam() {
        var that = this,
            config = that._config;
        for (var i in config) {
            if (Object.hasOwnProperty.call(config, i)) {
                that['_' + i] = config[i];
                config[i] = null;
                delete config[i];
            }
        }
        return that;
    }

    //绑定抽屉效果事件
    _bindEventListener() {
        var that = this,
            $main = that._main,//移动容器
            $container = that._container,//父容器
            firstTime = 0,//进入touchstart的时间
            startTime = 0,//上次进touchmove的时间
            move = 0,
            doDraweiTap = false,
            firstMove = true,
            transition = that._transition;//移动到哪

        var drawerObj = that.moveObj = {
            direction: that._dir,//移动方向
            position: {x: 0, y: 0},//按下坐标
            different: 0,//坐标偏移量
            showPx: 0,//抽屉显示的效果
            drawerStatic: 'no'//抽屉状态默认未打开
        };

        var fatherLength = (drawerObj.direction === 'left' || drawerObj.direction === 'right') ? $container.width() : $container.height(),//父容器的宽高左右为宽 上下为高
            maxLength = (drawerObj.direction === 'left' || drawerObj.direction === 'right') ? $main.width() : $main.height();//最大移动长度左右为宽 上下为高

        //初始化移动偏移量
        if (drawerObj.direction === 'left') {
            $main.css('left', -maxLength + 'px');
        } else if (drawerObj.direction === 'right') {
            $main.css('-webkit-transform', 'translate(' + fatherLength + 'px,0)');
        } else if (drawerObj.direction === 'top') {
            $main.css('top', -maxLength + 'px');
        } else if (drawerObj.direction === 'bottom') {
            $main.css('-webkit-transform', 'translate(0,' + fatherLength + 'px)');
        }

        $container.on('touchstart', function (e) {
            doDraweiTap = false;
            firstMove = true;
            var target = e.touches.item(0);
            $main.css('-webkit-transition', 'none');
            drawerObj.position.x = target.clientX;
            drawerObj.position.y = target.clientY;
            firstTime = startTime = new Date().getTime();
            drawerObj.different = 0;//坐标在移动方向的偏移量
            return;

        }).on('touchmove', function (e) {

            var target = e.touches.item(0),
                nowTime = new Date().getTime();

            //16刚好是60帧时间太短,则不处理
            if (nowTime - startTime > 16) {
                startTime = new Date().getTime();
                var dx = Math.abs(target.clientX - drawerObj.position.x);
                var dy = Math.abs(target.clientY - drawerObj.position.y);
                //初始化移动偏移量
                if (drawerObj.direction === 'left') {
                    if (!doDraweiTap) {
                        //是否需要移动抽屉
                        if (firstMove) {
                            //是否是按下后第一次滑动
                            if (dx == 0) {
                                return;
                            }
                            if ((dy / dx) < Math.tan(Math.PI / 6)) {
                                doDraweiTap = true;
                                firstMove = false;
                                drawerObj.different = target.clientX - drawerObj.position.x;
                            } else {
                                firstMove = false;
                                return;
                            }
                        } else {
                            return;
                        }
                    } else {
                        drawerObj.different = target.clientX - drawerObj.position.x;
                    }
                } else if (drawerObj.direction === 'right') {
                    if (!doDraweiTap) {
                        if (firstMove) {
                            if (dx == 0) {
                                return;
                            }
                            if ((dy / dx) < Math.tan(Math.PI / 6)) {
                                doDraweiTap = true;
                                firstMove = false;
                                drawerObj.different = -target.clientX + drawerObj.position.x;
                            } else {
                                firstMove = false;
                                return;
                            }
                        } else {
                            return;
                        }
                    } else {
                        drawerObj.different = -target.clientX + drawerObj.position.x;
                    }
                } else if (drawerObj.direction === 'top') {
                    if (!doDraweiTap) {
                        if (firstMove) {
                            if (dy == 0) {
                                return;
                            }
                            if ((dx / dy) < Math.tan(Math.PI / 6)) {
                                doDraweiTap = true;
                                firstMove = false;
                                drawerObj.different = target.clientY - drawerObj.position.y;
                            } else {
                                firstMove = false;
                                return;
                            }
                        } else {
                            return;
                        }
                    } else {
                        drawerObj.different = target.clientY - drawerObj.position.y;
                    }
                } else if (drawerObj.direction === 'bottom') {
                    if (!doDraweiTap) {
                        if (firstMove) {
                            if (dy == 0) {
                                return;
                            }
                            if ((dx / dy) < Math.tan(Math.PI / 6)) {
                                doDraweiTap = true;
                                firstMove = false;
                                drawerObj.different = -target.clientY + drawerObj.position.y;
                            } else {
                                firstMove = false;
                                return;
                            }
                        } else {
                            return;
                        }
                    } else {
                        drawerObj.different = -target.clientY + drawerObj.position.y;
                    }
                }

                //计算移动值
                if (drawerObj.drawerStatic == 'yes') {
                    //抽屉效果是打开的
                    if (drawerObj.different >= 0) {
                        return; //抽屉打开且向正反向移动抽屉保持不动
                    } else {
                        if (drawerObj.different < -maxLength) {
                            move = 0;
                        } else {
                            move = maxLength + drawerObj.different;
                        }
                    }
                } else if (drawerObj.drawerStatic == 'no') {
                    //抽屉效果是关闭的
                    if (drawerObj.different <= 0) {
                        return; //抽屉关闭且向负反向移动抽屉保持不动
                    } else {
                        if (drawerObj.different <= maxLength) {
                            move = drawerObj.different;
                        } else {
                            move = maxLength;
                        }
                    }

                }

                //执行移动
                if (drawerObj.direction === 'left') {
                    $main.css('-webkit-transform', 'translate(' + move + 'px,0)');
                } else if (drawerObj.direction === 'right') {
                    $main.css('-webkit-transform', 'translate(' + (fatherLength - move) + 'px,0)');
                } else if (drawerObj.direction === 'top') {
                    $main.css('-webkit-transform', 'translate(0,' + move + 'px)');
                } else if (drawerObj.direction === 'bottom') {
                    $main.css('-webkit-transform', 'translate(0,' + (fatherLength - move) + 'px)');
                }

                drawerObj.showPx = move;
                // 执行移动回调函数
                that._moveFn && that._moveFn(drawerObj);
            }
            return;
        }).on('touchend', function (e) {
            if (drawerObj.different == 0) {
                return;
            }
            doDraweiTap = false;
            firstMove = true;
            var nowTime = new Date().getTime();
            //移动加速度（单位时间移动了几个像素）
            var a = (Math.abs(drawerObj.different) / (nowTime - firstTime));
            if (a >= 1) {
                if (drawerObj.drawerStatic == 'no' && drawerObj.different > 0) {
                    move = maxLength;
                    drawerObj.drawerStatic = 'yes';
                } else if (drawerObj.drawerStatic == 'yes' && drawerObj.different < 0) {
                    move = 0;
                    drawerObj.drawerStatic = 'no';
                }
            } else {
                if (drawerObj.drawerStatic == 'no') {
                    if (drawerObj.different <= 0) {
                        return; //抽屉打开且向正反向移动抽屉保持不动
                    } else {
                        if (Math.abs(drawerObj.different) < maxLength / 2) {
                            move = 0;
                            drawerObj.drawerStatic = 'no';
                        } else {
                            move = maxLength;
                            drawerObj.drawerStatic = 'yes';
                        }
                    }
                } else if (drawerObj.drawerStatic == 'yes') {
                    //抽屉效果是打开的
                    if (drawerObj.different >= 0) {
                        return; //抽屉打开且向正反向移动抽屉保持不动
                    } else {
                        if (Math.abs(drawerObj.different) > maxLength / 2) {
                            move = 0;
                            drawerObj.drawerStatic = 'no';
                        } else {
                            move = maxLength;
                            drawerObj.drawerStatic = 'yes';
                        }
                    }
                }
            }

            //执行移动
            if (drawerObj.direction === 'left') {
                $main.css({
                    '-webkit-transform': 'translate(' + move + 'px,0)',
                    '-webkit-transition': transition
                });
            } else if (drawerObj.direction === 'right') {
                $main.css({
                    '-webkit-transform': 'translate(' + (fatherLength - move) + 'px,0)',
                    '-webkit-transition': transition
                });
            } else if (drawerObj.direction === 'top') {
                $main.css({
                    '-webkit-transform': 'translate(0,' + move + 'px)',
                    '-webkit-transition': transition
                });
            } else if (drawerObj.direction === 'bottom') {
                $main.css({
                    '-webkit-transform': 'translate(0,' + (fatherLength - move) + 'px)',
                    '-webkit-transition': transition
                });
            }

            drawerObj.showPx = move;
            // 执行终止回调函数
            that._endFn && that._endFn(drawerObj);
            return;
        });
        return that;
    }

    //抽屉效果切换状态
    triggerDrawer() {

        var that = this,
            move = 0,
            $main = that._main,
            transition = that._transition,
            drawerObj = that.moveObj,
            fatherLength = (drawerObj.direction === 'left' || drawerObj.direction === 'right') ? that._container.width() : that._container.height();

        // 初始化参数
        $main.css('-webkit-transition', 'none');
        drawerObj.position.x = 0;
        drawerObj.position.y = 0;
        drawerObj.different = 0;

        // 计算移动值
        if (drawerObj.drawerStatic == 'yes') {
            move = 0;
            drawerObj.drawerStatic = 'no';
        }
        else if (drawerObj.drawerStatic == 'no') {
            move = (drawerObj.direction === 'left' || drawerObj.direction === 'right') ? $main.width() : $main.height();
            drawerObj.drawerStatic = 'yes';
        }

        //执行移动
        if (drawerObj.direction === 'left') {
            $main.css({
                '-webkit-transform': 'translate(' + move + 'px,0)',
                '-webkit-transition': transition
            });
        } else if (drawerObj.direction === 'right') {
            $main.css({
                '-webkit-transform': 'translate(' + (fatherLength - move) + 'px,0)',
                '-webkit-transition': transition
            });
        } else if (drawerObj.direction === 'top') {
            $main.css({
                '-webkit-transform': 'translate(0,' + move + 'px)',
                '-webkit-transition': transition
            });
        } else if (drawerObj.direction === 'bottom') {
            $main.css({
                '-webkit-transform': 'translate(0,' + (fatherLength - move) + 'px)',
                '-webkit-transition': transition
            });
        }
    }
}

export default Drawer;