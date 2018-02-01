#linux下nginx安装配置

## 前言
环境：centos 7.4，nginx 1.12.2

场景：现有一台外网轻量级服务器。dns会将*.ijianghe.cn这个根域统统解析成该服务器的IP。需求如下
- www.ijianghe.cn  
   - 网站主页业务
   - 对应目录：/data/wwwsite/www/ 
   当访问www\.ijianghe.cn时加载/data/wwwsite/www/index.html
   当访问www\.ijianghe.cn/wwwapi/(apiname)时访问127.0.0.1:9527的本地主页nodejs服务
       
- mob.ijianghe.cn  
    - 网站移动业务
    - 对应目录：/data/wwwsite/mob/
    当访问mob\.ijianghe.cn时加载/data/wwwsite/mob/index.html
    当访问mob\.ijianghe.cn/mobapi/(apiname)时访问127.0.0.1:9528的本地移动端nodejs服务
    
- img.ijianghe.cn  
    - 图片服务业务
    - 对应目录：/data/wwwsite/img/
    当访问img.ijianghe.cn时加载/data/wwwsite/mob/index/index.html
    当访问img.ijianghe.cn/img/(picPath)时访问获取/data/wwwsite/img/images/下的静态资源如果404或403连接重定向到默认图片(默认图片在/data/wwwsite/img/images/default/default.png)

## nginx安装部分：

- 安装gc++(默认装的版本有点低，想装高版本可以看gcc-6.1.0安装.md)
    ```
    yum install gcc-c++
    ```
- 安装PCRE pcre-devel
    ```
    yum install -y pcre pcre-devel
    ```
- 安装zlib
    ```
    yum install -y zlib zlib-devel
    ```
- 安装OpenSSL
    ```
    yum install -y openssl openssl-devel
    ```
- 更新下rpm依赖库
    ```
    rpm -Uvh http://nginx.org/packages/centos/7/noarch/RPMS/nginx-release-centos-7-0.el7.ngx.noarch.rpm
    ```
- 安装nginx
    ```
    yum -y install nginx
    ```
- 启动Nginx
    ```
    service nginx start
    curl http://127.0.0.1       #如果出现nginx字样说明nginx启动成功
    ```

## nginx常用命令

- 查看nginx版本号
    ```
    nginx -v
    ```

- 查看nginx配置文件路径
    ```
    nginx -t
    ```

- 停止nginx服务
    ```
    nginx -c stop
    ```

- 启动nginx服务
    ```
    nginx
    #或者
    service nginx start
    #或者
    start nginx
    ```

- 开机自启动nginx
    ```
    vi /etc/rc.local            #增加一行 /usr/sbin/nginx（不同版本在不同路径下 可用which nginx查看nginx指令在哪）
    chmod 755 rc.local          #设置权限755
    ```

## nginx基础
    
- location匹配规则   
    ```shell
    #匹配优先级：
    #(location =) > (location 匹配到完整路径) > (location ^~ 路径) > (location ~,~* 正则顺序) > (location 部分起始路径) > (/)
    # =  严格匹配。如果这个查询匹配，那么将停止搜索并立即处理此请求。
    # ~  区分大小写的正则匹配;
    # ~* 不区分大小写的正则匹配;
    # !~ 区分大小写正则不匹配
    # !~*不区分大小写正则不匹配
    # ^~ 开头表示uri以某个常规字符串开头，不是正则匹配
    ```
    
## 通过配置nginx来实现前言中的需求

- 准备日志目录和项目根目录
    ```
    mkdir /etc/nginx/nginxhost          #在nginx主配置文件同级目录新建nginxhost文件夹来放置nginx虚拟主机配置
    mkdir /data/logs                    #在开发目录下新建logs文件用来防止nginx的所有日志文件
    ```
    
- 1.编辑nginx主配置文件
    ```
    nginx -t                        #查看主配置文件位置
    vi /etc/nginx/nginx.conf        #编辑nginx主配置文件
    
    user  nginx;                    #使用者(有时出现403错误可能是nginx用户没有资源的读执行权限，改为root就行)
    worker_processes  2;            #进程数一遍为cpu核数的1-2倍
    #worker_cpu_affinity 01 10;     #01表示启用第一个CPU内核，10表示启用第二个CPU内核 
    
    events {
        use epoll;
        worker_connections  1024;   #最大连接数
    }
    
    http {
        include       /etc/nginx/mime.types;
        default_type  application/octet-stream;
    
        log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '         #日志输出格式
                          '$status $body_bytes_sent "$http_referer" '
                          '"$http_user_agent" "$http_x_forwarded_for"';
    
        access_log  /data/logs/access.log  main;        #输入日志的名字和路径   
    
        sendfile        on;
        #tcp_nopush     on;
    
        keepalive_timeout  65;
    
        gzip  on;        #开启gzip压缩http传输的内容
        
        server{
            listen	80;              
            #当直接输入ip时
            server_name 192.168.0.88;
                                       
            access_log  /data/logs/www.ijianghe.cn.log main;            
        
            location / {
                #只输入ip或者ip/就访问www域服务
                root /data/wwwsite/www;  
                index  index.html;
            }
            
            location ~ ^/wwwapi/(.*)$ {
                #只输入ip/wwwapi/XXX就访问www本地接口
                proxy_pass http://127.0.0.1:9527/wwwapi/$1;
            }
        
            #当发生403,404错误把location定向为/error.html
            error_page  404 403    /error.html;
            
            location = /error.html {
                #匹配上面错误访问指定错误html（/data/wwwsite/error/error.html）
                root /data/wwwsite/error;
            }

            #禁止访问 .htxxx 文件
            location ~ /.ht {
                deny all;
            }
        }
    
        include /etc/nginx/nginxhost/*.conf;        #使用通配符引入所有虚拟主机配置文件
    }
    
    ```

- 2.配置nginx虚拟主机配置
    - 1.配置www.ijianghe.cn.conf
    ```
    touch /etc/nginx/nginxhost/www.ijianghe.cn.conf;                #新建www.ijianghe.cn的配置文件
    vi /etc/nginx/nginxhost/www.ijianghe.cn.conf;                   #编辑www.ijianghe.cn配置文件
    
    server{
         #入口端口
        listen	80;                                                 
        #入口服务名可以多写空格分开
        server_name www.ijianghe.cn;                              
                                   
        #日志文件输出位置
        access_log  /data/logs/www.ijianghe.cn.log main;            
    
        #off时 url定向为原url+目录名+/ ;
        #on时 url定向为server_name中第一个域名+目录名+/;             
        server_name_in_redirect off;
    
        #目录为/时加载root+index路径下的静态资源（也就是/data/wwwsite/www/index.html）;
        location / {
            #当入口为www.ijianghe.cn 80端口时将根路径设置到/data/wwwsite/www路径
            root /data/wwwsite/www;  
            index  index.html;
        }
        
        #= 严格匹配。如果这个查询匹配，那么将停止搜索并立即处理此请求。
        #~ 为区分大小写匹配(可用正则表达式)
        #!~为区分大小写不匹配
        #~* 为不区分大小写匹配(可用正则表达式)
        #!~*为不区分大小写不匹配
        #^~ 如果把这个前缀用于一个常规字符串,那么告诉nginx 如果路径匹配那么不测试正则表达式。
        #如果匹配这个正则将代理权交给本地9527端口的本地服务
        location ~ ^/wwwapi/(.*)$ {
            proxy_pass http://127.0.0.1:9527/wwwapi/$1;
        }
    
        #当发生403,404错误把location定向为/error.html
        error_page  404 403    /error.html;
        
        location = /error.html {
            #匹配上面错误访问指定错误html（/data/wwwsite/error/error.html）
            root /data/wwwsite/error;
        }
        
        #禁止访问 .htxxx 文件
        location ~ /.ht {
            deny all;
        }
    }
    ```
    - 2.配置mob.ijianghe.cn.conf（解释如上一个配置不赘述）
    ```
    touch /etc/nginx/nginxhost/mob.ijianghe.cn.conf;               
    vi /etc/nginx/nginxhost/mob.ijianghe.cn.conf;                   
    
    server{
        listen	80;                  
        server_name mob.ijianghe.cn;                                                                   
   
        access_log  /data/logs/mob.ijianghe.cn.log main;            
             
        server_name_in_redirect off;
    
        location / {
            root /data/wwwsite/mob;
            index  index.html;
        }
        
        location ~ ^/mobapi/(.*)$ {
            proxy_pass http://127.0.0.1:9528/mobapi/$1;
        }
    
        error_page  404 403    /error.html;
        
        location = /error.html {
            root /data/wwwsite/error;
        }
        
        #禁止访问 .htxxx 文件
        location ~ /.ht {
            deny all;
        }
    }
    ```
    - 3.配置img.ijianghe.cn.conf（解释如上一个配置不赘述）
    ```
    touch /etc/nginx/nginxhost/img.ijianghe.cn.conf;               
    vi /etc/nginx/nginxhost/img.ijianghe.cn.conf;                   
    
    server{
        listen	80;                  
        server_name img.ijianghe.cn;                                                                   
   
        access_log  /data/logs/img.ijianghe.cn.log main;            
             
        server_name_in_redirect off;
    
        location / {
            root /data/wwwsite/img/index;
            index  index.html;
        }
        
        location ~ ^/(.+)$ {
            root /data/wwwsite/img/images;
            #缓存30天
            expires 30d;
        }
    
        #当403 404时永久重定向到/default/default.png默认图片
        error_page  404 403   rewrite ^ /default/default.png permanent;
      
        location = /default/default.png {
            root /data/wwwsite/img/images;
            #缓存30天
            expires 30d;
        }
        
        #禁止访问 .htxxx 文件
        location ~ /.ht {
            deny all;
        }
    }
    ```


## 其他

- 主配置详解 
    ```
    #运行用户
    user nobody;
    #启动进程,通常设置成和cpu的数量相等
    worker_processes  2;
    #01表示启用第一个CPU内核，10表示启用第二个CPU内核 
    #worker_cpu_affinity 01 10;     
     
    #全局错误日志及PID文件
    #error_log  logs/error.log;
    #error_log  logs/error.log  notice;
    #error_log  logs/error.log  info;
     
    #pid        logs/nginx.pid;
     
    #工作模式及连接数上限
    events {
        #epoll是多路复用IO(I/O Multiplexing)中的一种方式,
        #仅用于linux2.6以上内核,可以大大提高nginx的性能
        use   epoll; 
     
        #单个后台worker process进程的最大并发链接数    
        worker_connections  1024;
     
        # 并发总数是 worker_processes 和 worker_connections 的乘积
        # 即 max_clients = worker_processes * worker_connections
        # 在设置了反向代理的情况下，max_clients = worker_processes * worker_connections / 4  为什么
        # 为什么上面反向代理要除以4，应该说是一个经验值
        # 根据以上条件，正常情况下的Nginx Server可以应付的最大连接数为：4 * 8000 = 32000
        # worker_connections 值的设置跟物理内存大小有关
        # 因为并发受IO约束，max_clients的值须小于系统可以打开的最大文件数
        # 而系统可以打开的最大文件数和内存大小成正比，一般1GB内存的机器上可以打开的文件数大约是10万左右
        # 我们来看看360M内存的VPS可以打开的文件句柄数是多少：
        # $ cat /proc/sys/fs/file-max
        # 输出 34336
        # 32000 < 34336，即并发连接总数小于系统可以打开的文件句柄总数，这样就在操作系统可以承受的范围之内
        # 所以，worker_connections 的值需根据 worker_processes 进程数目和系统可以打开的最大文件总数进行适当地进行设置
        # 使得并发总数小于操作系统可以打开的最大文件数目
        # 其实质也就是根据主机的物理CPU和内存进行配置
        # 当然，理论上的并发总数可能会和实际有所偏差，因为主机还有其他的工作进程需要消耗系统资源。
        # ulimit -SHn 65535
 
    }
     
     
    http {
        #设定mime类型,类型由mime.type文件定义
        include    mime.types;
        default_type  application/octet-stream;
        #设定日志格式
        log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                          '$status $body_bytes_sent "$http_referer" '
                          '"$http_user_agent" "$http_x_forwarded_for"';
     
        access_log  logs/access.log  main;
     
        #sendfile 指令指定 nginx 是否调用 sendfile 函数（zero copy 方式）来输出文件，
        #对于普通应用，必须设为 on,
        #如果用来进行下载等应用磁盘IO重负载应用，可设置为 off，
        #以平衡磁盘与网络I/O处理速度，降低系统的uptime.
        sendfile     on;
        #tcp_nopush     on;
     
        #连接超时时间
        #keepalive_timeout  0;
        keepalive_timeout  65;
        tcp_nodelay     on;
     
        #开启gzip压缩
        gzip  on;
        gzip_disable "MSIE [1-6].";
     
        #设定请求缓冲
        client_header_buffer_size    128k;
        large_client_header_buffers  4 128k;
     
     
        #设定虚拟主机配置
        server {
            #侦听80端口
            listen    80;
            #定义使用 www.nginx.cn访问
            server_name  www.nginx.cn;
     
            #定义服务器的默认网站根目录位置
            root html;
     
            #设定本虚拟主机的访问日志
            access_log  logs/nginx.access.log  main;
     
            #默认请求
            location / {
                #定义首页索引文件的名称
                index index.php index.html index.htm;   
            }
     
            # 定义错误提示页面
            error_page   500 502 503 504 /50x.html;
            location = /50x.html {
            }
     
            #静态文件，nginx自己处理
            location ~ ^/(images|javascript|js|css|flash|media|static)/ {
                #过期30天，静态文件不怎么更新，过期可以设大一点，
                #如果频繁更新，则可以设置得小一点。
                expires 30d;
            }
     
            #禁止访问 .htxxx 文件
            location ~ /.ht {
                deny all;
            }
     
        }
    }
    ```
- 泛解析
    ```
    server {
        listen       80;
        server_name ~^(.+)?\.domain\.com$;      #通过正则匹配server_name
        access_log  logs/host.access.log;
        set $sub $1;                            #设置sub变量
        set $root /www/$1.domain.com;           #设置web目录
        set $index index.html;                  #设置默认的index页面
        
        if (!-d $root){                         
            set $root /www/domain.com;          #如果没匹配域名 使用默认根地址
        }    
        
        root $root; 
        
        location / {                            #通过正则的域名判断下一步操作
            if ($sub = a){
                set $index login.html;
            }
            if ($sub = b){
                set $index login.html;
            }
            if ($sub = c){
                set $index proxy.php;
            }
            index  $index;
        }       
        
        # 测试服务器不缓存图片和js.css文件
        # location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ {
        #     expires 10m;
        # }
        # location ~ .*\.(js|css)?$ {
        #     expires 10m;
        # }

        location ~ /\.ht {
            deny  all;
        }

    }
    ```
##好贴
- https://segmentfault.com/a/1190000002797606