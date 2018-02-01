## processData

该组件用于`JavaScript`中进行JSON，XML，String之间的类型转换。代码被`script`标签引入后将会在window对象上挂载一个processData对象该对象中有4个方法，如下API介绍:

- 经本人自测该组件可支持IE5及以上浏览器

### API

- **parseJSON(jsonstr)**
    用于`string`转`json对象`
    
	```javascript
    var jsonstr = '{"items":{"-name":"456","item":[{"-name":"123","#text":"123"},{"-name":"456","#text":"678"}]}}';
    //JSON字符串转JSON对象
    var jsonobj = window.processData.parseJSON(jsonstr);
    console.log("JSON字符串转JSON对象: "+jsonstr+" --转为--> "+jsonobj);
    ```
- **json2str(json)**
	用于`json对象`转`string`
	
    ```javascript
    var jsonstr = '{"items":{"-name":"456","item":[{"-name":"123","#text":"123"},{"-name":"456","#text":"678"}]}}';
    var jsonobj = window.processData.parseJSON(jsonstr);
    //JSON对象转JSON字符串
    var jsonstr1 = window.processData.json2str(jsonobj);
    console.log("JSON对象转JSON字符串: "+jsonobj+" --转为--> "+jsonstr1);
    ```
- **parseXML(xmlstr)**
	用于`string`转`xml对象`
	
    ```javascript
    var xmlstr = "<items name='456'><item name='123'>123</item><item name='456'>678</item></items>";
    //XML字符串转XML对象
    var xmlobj = window.processData.parseXML(xmlstr);
    console.log("XML字符串转XML对象: "+xmlstr+" --转为--> "+xmlobj);
    ```
- **xml2str(xml)**
	用于`xml对象`转`string`
	
    ```javascript
    var xmlstr = "<items name='456'><item name='123'>123</item><item name='456'>678</item></items>";
    var xmlobj = window.processData.parseXML(xmlstr);
    //XML对象转XML字符串
    var xmlstr1 = window.processData.xml2str(xmlobj);
    console.log("XML对象转XML字符串: "+xmlobj+" --转为--> "+xmlstr1);
    ```