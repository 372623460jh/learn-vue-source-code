### 安装GIT

- git命令行工具
- 基于git命令行的一个客户端软件（提供一个界面去管理源代码）

### GIT命令操作

- 初始化一个本地GIT仓储

```shell
cd 当前项目目录
git init // 初始化一个本地的仓库
```

> 就是在本地文件夹中添加了一个.git的文件夹用于记录所有的项目变更信息

- 查看本地仓储的变更状态

git status
用于查看本地仓储的状态
第一次查看，显示的是一坨没有被跟踪的文件

git status -s // -s 是输出简要的变更日志

- 添加本地暂存（托管）文件

git add
可以将一个没有被跟踪的文件添加到跟踪列表

类似于node_modules这种性质的文件是不应该被跟踪

- 添加本地GIT忽略清单文件

在代码库文件夹的根目录添加一个.gitignore文件
此文件用于说明忽略的文件有哪些

- 提交被托管的文件变化到本地仓储

git commit
将本地的变化提交的本地的仓库文件夹归档
一般在有了一个小单元的整体变化后再提交

- 对比差异

git diff
可以用于对比当前状态和版本库中状态的变化

- 提交日志

git log 
可以查看提交日志

- 回归到指定版本

git reset --hard

- 为仓储添加远端（服务器端）地址

- 将本地仓储的提交记录推送到远端的master分支

- 拉取远端master分支的更新记录到本地

- 回归到指定版本

### GITHUB基本使用

- https://github.com/
- GITHUB是一个GIT服务的提供商，

- 提出社交化编程

http://zoomzhao.github.io/code-guide/
https://github.com/jobbole/awesome-javascript-cn
https://github.com/jobbole/awesome-css-cn


- GIT分支



git init //初始化本地git仓库
git status //查看本地仓储的状态
git status -s //查看本地仓储的状态(简单模式)
git add //可以将一个没有被跟踪的文件添加到跟踪列表
git add . //可以将全部没有被跟踪的文件添加到跟踪列表
.gitignore文件 //用于说明忽略的文件
git commit -m "注释" //提交到本地仓库
git diff //可以用于对比当前状态和版本库中状态的变化
git log //查看提交日志

git remote add origin github地址 //连接到远端github地址
git push -u origin 分支名 //提交远端github仓库分支（相当于svn的commit）
git pull -u origin 分支名 //更新远端github仓库分支（相当于svn的update）

git clone github地址 //从远端github地址克隆到本地（相当于svn的check out）
git clone -b 指定的分支名字 github地址 //从远端github地址克隆某分支到本地（相当于svn的check out）

//克隆
$ git clone <版本库的网址> <本地目录名>
git clone https://github.com/372623460jh/jiangShow.git /data/mydir
将github上项目克隆到/data/mydir目录下

//提交
$ git push <远程主机名> <本地分支名>:<远程分支名>
远程主机名:可以在.git下config下查看
<远程分支名><本地分支名>：本地的哪个分支提交到远程的哪个分支
//提交到github上
git push https://github.com/372623460jh/jiangShow.git master:master
在.git/config中remote origin指向https://github.com/372623460jh/jiangShow.git 所以上述指令可以写为
git push origin master:master 合并分支名相同可以简化为
git push origin master

//更新
$ git pull <远程主机名> <远程分支名>:<本地分支名>
远程主机名:可以在.git下config下查看
<远程分支名><本地分支名>：远程的哪个分支和本地的哪个分支合并
//更新github上应用
git pull https://github.com/372623460jh/jiangShow.git master:master
在.git/config中remote origin指向https://github.com/372623460jh/jiangShow.git 所以上述指令可以写为
git pull origin master:master 合并分支名相同可以简化为
git pull origin master