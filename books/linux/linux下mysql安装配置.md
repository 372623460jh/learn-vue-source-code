https://devysql.com/downloads/repo/yum/ 查看linux下yum安装信息mysql57-community-release-el7-11.noarch.rpm


MYSQL 密码 

http://www.linuxidc.com/Linux/2016-09/135288.htm

下载mysql源安装包
wget http://dev.mysql.com/get/mysql57-community-release-el7-11.noarch.rpm
安装mysql源
yum localinstall mysql57-community-release-el7-11.noarch.rpm
检查mysql源是否安装成功
yum repolist enabled | grep "mysql.*-community.*"
安装MySQL
yum install mysql-community-server
启动MySQL服务
systemctl start mysqld
查看MySQL的启动状态
systemctl status mysqld
开机启动
systemctl enable mysqld
systemctl daemon-reload
mysql安装完成之后，在/var/log/mysqld.log文件中给root生成了一个默认密码。通过下面的方式找到root默认密码
grep 'temporary password' /var/log/mysqld.log
使用默认密码登录
mysql -uroot -p
修改root默认密码（必须数字大小写）
ALTER USER 'root'@'localhost' IDENTIFIED BY 'xxxxxxxxx'; 
默认只允许root帐户在本地登录，如果要在其它机器上连接mysql，必须修改root允许远程连接，或者添加一个允许远程连接的帐户，为了安全起见，我添加一个新的帐户：
GRANT ALL PRIVILEGES ON *.* TO 'name'@'%' IDENTIFIED BY 'password' WITH GRANT OPTION;
配置默认编码为utf8
修改/etc/my.cnf配置文件，在[mysqld]下添加编码配置，如下所示：
vi /etc/my.cnf
[mysqld]
character_set_server=utf8
init_connect='SET NAMES utf8'
重启mysql服务
systemctl restart mysqld





root/jianghe/2053440Zx,