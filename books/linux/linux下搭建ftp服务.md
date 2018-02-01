#linux 搭建ftp服务
基于CentOS7.4;vsftpd-3.0.2

- 查看系统版本号
    ```
    cat /etc/redhat-release 查看系统版本
    ```
- 查看是否安装
    ```
    rpm -qa | grep vsftpd
    vsftpd-3.0.2-22.el7.x86_64
    ```
- 1.通过yum安装vsftpd
    ```
    yum install -y vsftpd
    ```
    
- 2.修改vsftpd的配置文件
    ```
    vi /etc/vsftpd/vsftpd.conf
    ```
    - 1.不允许匿名访问
        ```
        anonymous_enable=NO   #设置后ftp客户端不允许匿名登录
        ```
    - 2.允许使用本地帐户进行FTP用户登录验证
        ```
        local_enable=YES      #设置后linux用户允许在ftp客户端登录
        ```
    - 3.设定支持ASCII模式的上传和下载功能
        ```
        ascii_upload_enable=YES
        ascii_download_enable=YES
        ```        
    - 4.使用户不能离开主目录
        ```
        chroot_local_user=YES                       
        chroot_list_enable=YES
        chroot_list_file=/etc/vsftpd/chroot_list    #在chroot_list_file对应的（/etc/vsftpd.chroot_list）文件中列出的用户，可以切换到其他目录；未在文件中列出的用户，不能切换到其他目录。
        ```
    - 5.配置文件最后添加
        ```
        allow_writeable_chroot=YES 
        ```   
    - 6.如果chroot_list_file对应的目录不存在
        ```
        vi /etc/vsftpd/chroot_list
        #:wq直接保存并退出就行。
        #或者
        touch /etc/vsftpd/chroot_list
        ```
    - 7.重启vsftpd
        ```
        systemctl restart vsftpd.service
        ```    
        
- 3.设置ftp服务器用户和访问权限
    - 1.创建linux用户并设置密码
        ```
        useradd jianghe     #新增用户
        passwd jianghe      #设置密码
        ```
    - 2.创建用户组并将用户移入分组
        ```
        groupadd dev            #新增开发分组
        gpasswd -a jianghe dev  #将新建用户加入分组
        ```
    - 3.设置开发目录
        ```
        mkdir /data         #新建开发目录
        chgrp -R dev /data  #设置开发目录所属组为刚刚新建的分组
        chmod 775 /data     #设置开发目录的权限为775（所有者和所属分组有rwx权限其他用户有rx权限）
        ```
    这样/data目录就成为了开发目录，所有属于dev这一个分组的用户都可以通过ftp客服端对开发目录进行rwx操作，需要新增开发人员只需要linux创建用户并移入dev分组就行
    
- 4.使用FileZilla客户端连接ftp服务

    打开客户端输入可达ip,选择SFTP协议,选择正常登陆类型,输入linux用户登陆。（如用户属于dev分组则对/data有写权限，否则没有写权限）
