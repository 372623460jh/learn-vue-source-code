        var myScroll = new iScroll('.intro_scroll', {
                click: true,//false阻止事件冒泡
                // bounce: true,//开启反弹动画
                disablePointer: true, //禁用指针
                disableTouch: false, //禁用触摸
                disableMouse: false, //禁用鼠标
                // bounceEasing: 'elastic',//反弹动画类型
                bounceTime: 500,//反弹动画时间
                scrollX: true, //是否使用x方向滚动条
                freeScroll: true, //自由拖动
                useTransition: true, //使用过渡效果
                deceleration: 0.005, //滚动势能
                // scrollX: false,//禁用x方向滚动条
                // scrollY: true,//开启Y方向滚动条
                // startX: 0,//X方向开始位置px
                // startY: -500,//Y方向开始位置
                // tap: 'unmoveTap',//当滚动区域被点击或者触摸但并没有滚动时，可以让iScroll抛出一个自定义的unmoveTap事件
                // scrollbars: false,//激活滚动条
            });
            // myScroll.on("scrollStart", function () {
            //     console.log("scrollStart" + this.y);
            // });
            //
            // myScroll.on("scrollEnd", function () {
            //     console.log("scrollEnd" + this.y);
            // });
            //
            // $scroll.on('unmoveTap', function () ，
            //     console.log('unmoveTap');
            // });
            // 移动到某个位置
            // myScroll.scrollTo(0, -600, 2000, iScroll.utils.ease.elastic);