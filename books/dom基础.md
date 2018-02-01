- childNodes 属性:

返回子元素列表(会将纯文本返回为nodeType=3的element)
```javascript
// <div>jianghe<div></div>yunnan</div>
// 父节点的childNodes返回的是一个length = 3的数组，[text(jianghe),div,text(yunnan)]
```


- appendChild会移除原dom

dom a dom b

//a的第一个字节会被移除
b.appendChild(a.firstChild);

- Object.getOwnPropertyDescriptor(obj.key);
获取指定对象的自身属性描述符。自身属性描述符是指直接在对象上定义（而非从对象的原型继承）的描述符。