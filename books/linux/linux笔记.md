#Linux笔记
基于 CentOS7.4

- 1.分区
- 2.基础
- 3.文件权限
- 4.常用命令
- 5.shell快捷键

## 分区:
关键字：主分区，扩展分区，逻辑分区，挂载点，swap，hda1 

- 主分区:
linux可以有1-3个主分区

- 扩展分区:
linux可以有1个扩展分区

- 逻辑分区：
linux可以有若干个逻辑分区，逻辑分区都属于扩展分区

- 挂载点：
类似于windows的盘符, /  /boot 都可以设置为挂载点

- swap：
虚拟内存区，一般设置为真实内存1-2倍

- hda1：
hd指硬盘，a指第一块硬盘，1指第一个分区（hdc2表示第3块硬盘的第2个分区,分区文件可在/dev 文件下查看）

- 注意：
linux分区大致为3(主分区)+[1(扩展分区)+n(逻辑分区，逻辑分区都在扩展分区中)]，扩展分区的分区号从5开始

- 分区建议：
/	    根目录（必须）
/boot	系统安装目录（建议单独分区）
swap	虚拟内存（必须，真实内存1-2倍）

## 基础:

- `[root@localhost ~]# `
    - root 用户名
    - localhost 主机名
    - ~ 当前目录名
    - \# 超级用户
    - $ 普通用户
    - 超级用户默认进入在 /root 文件
    - 普通用户默认进入在 /home/用户名 文件

- 文件目录
    - /bin /sbin /usr/bin /usr/sbin 都是用来保存系统命令的（bin下的命令所有用户都可以执行 sbin下的命令只有超级用户才能执行）
    - /dev 设备目录
    - /etc 系统默认配置文件
    - /home 普通用户家目录
    - /root 超级用户家目录
    - /lib  linux函数库保存目录
    - /mut  挂在外接设备目录（如U盘光盘之类）
    - /proc /sys 保存内存挂载点不能直接操作
    - /tmp  临时目录
    - /usr  系统资源保存目录
    - /var  系统可见文档目录

## 文件权限:
- `-rwx---------.`

第一位代表文件类型（-文件 d目录 l软链接文件）
后面的每3位代表的一组(rwx分别代表:读,写,执行)：第一组所有者权限；第二组所属组权限；第三组其他用户权限。
.代表ACL权限（centos6以后才有）
- linux中点开头的文件是隐藏文件

## 常用命令:
命令 \[选项\](-ad等于--all) [参数]
- ls 查看目录文件
    ```
    ls -l 			显示目录下详细信息
    ls -a 			显示目录下全部信息包括隐藏文件
    ls -h 			显示目录下人性化显示
    ls -d 			显示当前目录详细信息
    ls -i		  	显示目录下文件inode（文件id号）
    ```
- vi 编辑
    ```
    vi /jianghe/test.conf        #编辑test.conf 
    ```
    - i编辑  
    - :wq保存并退出
    - :q退出
    - 如果是用ctrl+z终止编辑下次编辑该文件需要先删除.swp文件
- mkdir（make directory）创建目录
    ```
    mkdir /jianghe              在/根目录下创建jianghe目录
    mkdir -p /jianghe/test      在/根目录下递归创建jianghe/test目录(多层目录)
    ```
- touch 创建空文件或改变文件系统时间
    ```
    touch ex2         在当前目录下建立一个空文件ex2
    ```
- cd（change directory）改变路径
    ```
    cd /jianghe         跳转到/jianghe
    cd -                进入上次目录
    cd ~(直接cd)          进入当前用户家牡目录
    cd ..               进入上级目录
    ```   
- pwd（print woring drectory）显示当前目录
- cat 查看文件内容
    ```
    cat /jianghe/test.conf    查看相应路径下的test.conf
    ```
- rmdir (remove empty drectory) 删除空目录（用的极少）
- rm (remove) 删除 
    ```
    rm -r /tem/                 删除tem目录(不加删目录会报错）
    rm -f /tem/test.conf        强制test.conf文件（不需要确认）
    rm -rf /tem/                强制删除tem目录
    rm -rf /tem/*               强制删除tem下的所有文件
    ```
- cp(copy) 拷贝
    ```
    cp -r                           复制目录（不加复制文件会报错）
    cp -p                           复制带文件属性
    cp -d                           若文件是链接文件则复制连接属性
    cp -a                           相当于 -pdr
    cp /tem/test /jianghe/dir1/     复制test文件到/jianghe/dir下
    cp /tem/test /jianghe/dir2      复制test文件到/jianghe下改名叫dir2
    ```
- ll (等于ls -l) 目录下详细信息
- mv（move）剪切或改名（源文件和目标文件在同一个目录下是改名 源文件和目标文件不在同一个目录下是剪切）
    ```
    mv jianghe/dir1/ jianghe/dir2/      将jianghe/dir1/文件剪切到jianghe/dir2/目录下
    mv zhangsan lisi                    将zhangsan文件改名为lisi
    ```
- ln（link）链接（原文件路径必须使用绝对路径）
    ```
    ln -s 						建立软连接
    ln -s /root/test /jianghe/dir1/test.soft 	在/jianghe/dir1/下建立一个test.soft软连接指向/root/test文件
    ln /root/test /jianghe/dir1/test.hard 		在/jianghe/dir1/下建立一个test.hard硬和/root/test文件拥有相同的inode和存储block（/root和/jianghe在同一个分区下）
    ```
    - 硬链接:同一个分区上拥有相同inode和相同存储block的称为硬链接（2硬链接指向是同一个存储空间，因为指向的是同一个存储空间所以不能跨分区设置，其次硬链接不能针对目录设置）
    - 软链接:软连接拥有自己的inode和block，软连接文件权限第一位以l开头，软连接中只保存了源文件的inode和文件名（软连接好比windows中的快捷方式或者是C中的保存指针的变量）
- locate 定位，搜索 模糊匹配（只能按照文件名搜索，centos7最小安装默认没有该命令可用yum install mlocate安装，然后updatedb）
    ```
    locate test        搜索文件名中包含test的文件
    ```
    - 原理：去/var/lib/mlocate数据库中搜索，并不是便利整个系统文件，但是mlocate文件一天才更新有所以当天新建的文件无法搜索到，可以手动执行updatedb更新mlocate数据库，这样就可以实时搜索到新建文件。
- whereis 搜索命令 搜索命令所在文件和帮助文档
    ```
    whereis -b nginx		只查找nginx可执行文件
    whereis -m nginx		只查找nginx帮助文档
	```
- which 搜索命令 搜索命令所在位置和别名
    ```
    which ll                搜索命令所在位置和别名（ll=ls -l --color=auto）
    ```
- find \[搜索范围\] \[搜索条件\]
    ```
    find / -name jianghe                在根下搜索文件名叫jianghe的文件 精确匹配,模糊查询需要使用通配符（*任意字符 ?一个字符 []选择中括号内一个字符进行匹配）
    find / -iname jianghe               不区分大小
    find / -user root                   按照所有者搜索
    find / -nouser root                 搜索没有所有者的文件
    find / -mtime +10                   十天之前修改文件
    find / -mtime 10                    十天当天修改文件
    find / -mtime -10                   十天之内修改文件
    find / -size 25k                    等于25k的文件
    find / -size -25k                   小于25k的文件
    find / -size +25k                   大于25k的文件
    find / -inum 231232                 查找inode是231232的文件
    find / -name jh -exec rm -f {}\;    先查找根目录下jh文件让后删除它
    ```
- grep 搜索字符串
    ```
    grep -v "jianghe" /data/log/        在log下搜索不包含jianghe的所有行
    grep -i "jiangHe" /data/log/        在log下搜索包含jianghe的所有行（忽略大小写）
    ```
- man（manual） 帮助命令（查看命令的帮助文档）
    ```
    man ls              查看ls帮助文档             
    ```
- zip 压缩命令 
    ```    
    zip /tem/test /data/ziptest         将test压缩到/data下名为ziptest
    zip /tem/path /data/ziptest         将path目录压缩成/data下名为ziptest
    ```
- unzip 解压缩压缩命令 
    ```
    unzip -n /tem/ziptest -d /data/file             将ziptest解压到/data下名为file（重名不覆盖）
    unzip -v test.zip                               查看压缩文件但不解压
    ```
- gzip 压缩成.gz格式
    ```
    gzip -c 源文件                         压缩成.gz格式输出压缩文件（源文件会消失）
    gzip -c 源文件 > 压缩文件               输出压缩文件（源文件不会消失）
    gzip -r 源目录                         压缩目录
    ```
- gunzip 解压缩.gz格式
    ```
    gunzip -r 压缩目录  		解压缩目录
    ```
- tar 压缩解压
    ```
    tar -cvf 打包文件 源文件                        #打包命令
    tar -xvf 解打包文件                             #解打包命令
    tar -zcvf 压缩文件 源文件1 源文件2               #压缩成.tar.gz
    tar -zxvf 解压文件                              #解压.tar.gz
    tar -jcvf 压缩文件 源文件1 源文件2               #压缩成.tar.ba2
    tar -jxvf 解压文件                              #解压.tar.ba2
    ```
- shutdown
    ```
    shutdown -h now	            #关机
    shutdown -r                 #重启
    shutdown -c                 #取消上一个命令
    ```
- logout			退出当前用户
- mount（挂载命令）
    ```
    mount -a        #自动挂/etc/fstab配置文件的内容
    #挂载光驱
    mkdir /mnt/cdrom/                          #建立挂载点
    mount -t 文件系统 /dev/sr0 /mnt/cdrom/      #挂载光盘
    ```
- umount（卸载命令）
    ```
    umount 设备文件名或挂载点
    ```
- w jianghe 			查看jianghe用户信息
- who 			        查看当前登录用户
- last			        查看系统登录信息
- alias 别名=‘原名’	取别名
    ```
    alias gameover=‘shutdown -h now’        给shutdown -h now一个别名gameover
    ```
- unalias 别名		删别名
    ```
    unalias gameover         删除gameover别名
    ```
- service network restart   重启网络服务
- firewall-cmd --zone=public --add-port=80/tcp --permanent    （--permanent永久生效）永久打开80端口
- firewall-cmd --zone=public --list-ports    查看所有打开的端口
- firewall-cmd --reload           更新防火墙规则
- systemctl stop firewalld.service            关闭防火墙服务
- systemctl start firewalld.service           开启防火墙服务
- echo $PATH        查看环境变量
- rpm -qa | grep vsftpd       查看是否安装vsftpd
- ps -ef | grep nginx       查看nginx进程
- ps -ef | grep nginx       查看nginx进程
- kill -9 \[PID\]           根据pid杀进程
- groupadd dev              新建dev分组
- chgrp -R dev /root        修改目录所有组
- useradd jianghe           新建jianghe用户
- passwd jianghe            设置jianghe用户密码
- gpasswd -a jianghe dev    将jianghe用户加入dev分组
- chmod 775 /data           设置/data目录权限为775也就是(drwxrwxr-x)

## shell快捷键:
- ctrl+l            清屏
- tab               补全
- 2下tab            显示文件列表
- ctrl+u            清行
- ctrl+a            行头
- ctrl+e            行尾
- ctrl+z            暂停当前进程（进程挂起）