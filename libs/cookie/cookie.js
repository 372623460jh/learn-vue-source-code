/**
 * @overview cookie module
 * @author jianghe
 * @createDate 2018-01-09
 * @version 0.0.1
 */

'use strict';

//字符截取方法兼容处理
var trim = String.prototype.trim;
String.prototype.trim = trim ? trim : function () {
    return this.replace(/(^\s*)|(\s*$)/g, '');
};

/**
 * cookie操作主函数
 * @param {String} key 需要存储cookie的键（必需）
 * @param {String} value 需要存储cookie的值
 * @param {Object} options 设置域名，过期时间等参数，详细使用方法如下
 * @param {String} path 该cookie的可访问路径
 * @param {String} domain 该cookie的所属域名
 * @param {Number/Object} expires 该cookie的有效时间，当是数字类型时，是以天为单位。当是日期对像时，直接就是该日期
 * @param {Boolean} secure 设置secure为真，则该cookie只有在https协议下才会传输到服务端
 */
export default function (key, value, options) {

    var i, date,
        currentCookie,
        arrCookie = [],
        oldCookie = null;

    if (!key || document.cookie === undefined) {
        return;
    }
    if (typeof value != 'undefined') {
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        arrCookie.push(key + '=' + encodeURIComponent(value));
        // 设置cookie超时时间
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            arrCookie.push('expires=' + date.toUTCString()); // use expires attribute, max-age is not supported by IE
        }
        // 指定了 cookie 将要被发送至哪个或哪些域中的那个路径 如(domain = .baidu.com   path = /pic 当向.baidu.com/pic下发送请求时该cookie信息会被加入http header中)
        options.path && arrCookie.push('path=' + options.path);
        // 指定了 cookie 将要被发送至哪个或哪些域中 如(domain = .baidu.com 当向.baidu.com下主机发送请求时该cookie信息会被加入http header中)
        options.domain && arrCookie.push('domain=' + options.domain);
        // 标识只有当一个请求通过 SSL 或 HTTPS 创建时，包含 secure 选项的 cookie 才能被发送至服务器
        options.secure && arrCookie.push('secure');
        //HttpOnly 如果在cookie中设置了HttpOnly属性，那么通过js脚本将无法读取到cookie信息，这样能有效的防止XSS攻击。
        document.cookie = arrCookie.join('; '); //设置当前cookie
    } else {
        if (document.cookie != '') {
            oldCookie = document.cookie.split(';');
            for (i = 0; i < oldCookie.length; i++) {
                currentCookie = oldCookie[i].trim();
                if (currentCookie.substring(0, key.length + 1) === (key + '=')) {
                    return unescape(decodeURIComponent(currentCookie.substring(key.length + 1)));
                    break;
                }
            }
            return null; //没有设置该cookie的时候，返回null
        }
    }
};
