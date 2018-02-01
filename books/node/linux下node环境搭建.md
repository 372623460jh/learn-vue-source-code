# linux下node环境搭建
## 前言
- 环境：centos 7.4,node v6.12.2.2,npm 3.10.10,pm2 
## 1.使用nvm（nodejs version manager）安装node（推荐）
- 先安装nvm再通过nvm安装任意版本node
    ```shell
    #远程访问nvm可执行命令行
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
    #执行一个脚本install.sh
    source ~/.bashrc
    #安装最新稳定版
    nvm install stable 3
    #安装 8.7.0 版本
    nvm install 8.7.0 
    #卸载 8.7.0 版本
    nvm uninstall 8.7.0
    #查看机器上已经安装的nodejs列表
    nvm ls
    #使用8.7.0这个版本
    nvm use 8.7.0
    ```
## 2.其他方式安装nodejs，npm安装部分：
- 获取nodejs6.*+资源：
    ```shell
    #nodejs8.7需要gcc4.9.4以上还得先升级gcc
    curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
    ```
- 使用yum安装nodejs和npm
    ```shell
    yum -y install nodejs
    ```
- 查看node所在路径(非安装)
    ```shell
    which nodejs
    whereis -b nodejs
    ```

## npm常用指令
- 注册用户登陆npm
    ```shell
    npm adduser 
    npm login
    ```
- npm基操
    ```shell
    npm config set registry https://registry.npm.taobao.org //设置源
    npm config get registry //查看源设置是否生效
    npm init XXXX //初始化项目（生成package.json文件）
    //--save部署时的依赖保存到package.json中
    //-g保存到npm安装目录的node_module中（全局安装）
    //--save-dev开发时的依赖保存到package.json中
    npm install XXXX --save/-g/--save-dev  //安装包 
    ```
- 发布到npm官方源
    ```shell
    //将包发布到源上,需先在官方源登陆，并连接到官方源（命令找的是目录下的package.json文件进行发布）
    //需要更新的话先修改package.json中的版本号再执行以下命令
    npm publish
    ```
    
## 使用pm2进程管理来管理node进程

- 安装pm2
    ```shell
    npm install pm2 -g   						# 安装
    ```
- 常用指令
    ```shell
    pm2 start app.js -i 1 						# 后台运行pm2，启动1个app.js
    pm2 list               						# 显示所有进程状态
    pm2 stop 0             						# 停止指定的进程
    pm2 stop all           						# 停止所有进程
    pm2 delete 0           						# 杀死指定的进程
    pm2 delete all         						# 杀死全部进程
    ```