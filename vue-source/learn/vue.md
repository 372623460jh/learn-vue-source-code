_m方法 静态根节点

_l方法 for循环

_e方法 if语句

_c方法 处理完指令剩余标签

_v方法 处理文本节点或含mustache的文本

with方法的作用：（来实现scope）
with(obj)作用就是将后面的{}中的语句块中的缺省对象设置为obj，那么在其后面的{}语句块中引用obj的方法或属性时可以省略obj.的输入而直接使用方法或属性的名称。

    ```javascript
    function scope() {
        this.data = {
            test1: '独立作用域'
        };
        this.say = function (ss) {
            console.log(ss);
        }
    }

    var s = new scope();
    var fncode = 'with(this){say(data.test1);}';
    var render = new Function(fncode);
    render.call(s, s);
    ```