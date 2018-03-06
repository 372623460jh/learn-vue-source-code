/**
 * 一个新对象，带着指定的原型对象和属性。
 * Object.create(proto, [propertiesObject]);
 * 创建一个新对象,原型指向Array.prototype
 * 创建一个arrayMethods对象继承自Array.prototype
 * @type {Array}
 */
var arrayMethods = Object.create(Array.prototype);


/**
 * 使用Object.create实现继承重写父类方法并可以调用父类方法
 * @type {Array}
 */
var arrayMethods = Object.create(Array.prototype);
// 重写arrayMethods的push方法
Object.defineProperty(arrayMethods, 'push', {
    value: function () {
        console.log('重写的push方法');
        var args = [],
            len = arguments.length;
        while (len--) args[len] = arguments[len];
        //执行父类方法
        var result = Array.prototype.push.apply(this, args);
        return result;
    },//值
    enumerable: false, //可枚举属性
    writable: true,//可写
    configurable: true//可被删除
});
//这样就实现了arrayMethods继承了Array.prototype并重写了push方法


/**
 * 在JavaScript中，对象的属性分为可枚举和不可枚举之分，
 * 它们是由属性的enumerable值决定的。可枚举性决定了这个属性能否被for…in查找遍历到。
 * 获取new Array(3)中的可枚举属性（不包含原型中）
 * @type {Array}
 */
var propArr = Object.getOwnPropertyNames(new Array(3));


/**
 * 获取对象中某属性的属性描述器
 * @type {{test: string}}
 */
var obj = {test: 'name'};
var property = Object.getOwnPropertyDescriptor(obj, 'test');
//获得该属性的描述器对象 {value: "name", writable: true, enumerable: true, configurable: true}


/**
 * call和apply方法使用undefined去调用时，被调用方法执行上下文为，环境最高对象（浏览器：window,node：global）
 * @type {{test: A.test}}
 */
var A = {
    test: function () {
        console.log(this);
    }
};
A.test.call(undefined);     //window


/**
 * JavaScript 中的正常任务与微任务
 * 正常情况下，JavaScript的任务是同步执行的，即执行完前一个任务，
 * 然后执行后一个任务。只有遇到异步任务的情况下，执行顺序才会改变。
 * 这时，需要区分两种任务：
 * 正常任务（宏任务task）与微任务（microtask）。
 * 它们的区别在于：
 * “正常任务”在下一轮Event Loop执行，
 * “微任务”在本轮Event Loop的所有任务结束后执行。
 *
 * setImmediate，MessageChannel，setTimeout会，各种事件（比如鼠标单击事件）的回调函数 会产生宏任务
 * process.nextTick和Promise则会产生微任务
 */
console.log(1);
setTimeout(function () {
    console.log(2);
}, 0);
Promise.resolve().then(function () {
    console.log(3);
}).then(function () {
    console.log(4);
});
console.log(5);
// 输出: 15342
// 解释：Promise是微任务，setTimeout是宏任务。
// 第一次Event Loop 执行1 5
// 本轮Event Loop的所有任务结束后执行微任务Promise输出3 4
// 下一轮Event Loop 执行2


/**
 * Array中的sort方法
 * @type {[*]}
 */
var arr = [12, 1, 2, 21, 3];
function compare_fn(value1, value2) {
    if (value1 < value2) {
        return -1;
    } else if (value1 > value2) {
        return 1;
    } else {
        return 0;
    }
}
arr.sort(compare_fn);
console.log(arr);//[1, 2, 3, 12, 21]
// 当sort中回调方法返回。负数:时第一个参数比第二个参数小;0:两个值相等;正数:如果第一个参数比第二个参数大
// 只有就可以实现升续排序. 可以简写为：
arr.sort(function (value1, value2) {
    return value1 - value2;
});
// 降序排序. 可以简写为：
arr.sort(function (value1, value2) {
    return -(value1 - value2);
});



