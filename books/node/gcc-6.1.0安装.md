#gcc-6.1.0安装
使用编译源码的方式安装nodejs8.7.0需要4.9.4以上环境（建议使用nvm方式安装）

## 流程
    ```
    #拷贝gcc-6.1.0.tar.bz2到/usr/local/src/下
    cd /usr/local/src/
    #解压
    tar -jxvf gcc-6.1.0.tar.bz2  
    cd gcc-6.1.0  
    #创建编译目录
    mkdir build  
    cd build  
    #下载编译依赖环境
    ../configure -enable-checking=release -enable-languages=c,c++ -disable-multilib 
    #执行编译
    make(炒鸡费时)
    make install  
    查找编译gcc时生成的最新动态库
    find / -name "libstdc++.so*"
    将找到的动态库libstdc++.so.6.0.22复制到/usr/lib64
    cp /usr/local/src/gcc-6.1.0/build/prev-x86_64-pc-linux-gnu/libstdc++-v3/src/.libs/libstdc++.so.6.0.22 /usr/lib64
    删除原来软连接创建新软连接
    cd /usr/lib64
    rm -rf libstdc++.so.6
    ln -s libstdc++.so.6.0.22 libstdc++.so.6
    ```


