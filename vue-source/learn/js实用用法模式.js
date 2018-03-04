


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