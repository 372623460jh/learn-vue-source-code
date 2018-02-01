#linux ip和静态ip设置
基于CentOS7.4

- 1.设置ip方法
    - 使用ifconfig查看网卡设备名
        ```
        ifconfig
        ```
    - 设置对应网卡设备ip地址（ens33就是网卡设备名可在`ifconfig`中查看或者在`ll /etc/sysconfig/network-scripts/`找到）
        ```
        ifconfig ens33 192.168.0.88
        ```

- 2.设置静态ip方法
    - 修改ifcfg-ens33为网卡驱动文件(CentOS7.4为ifcfg-ens33)
        ```
        vi /etc/sysconfig/network-scripts/ifcfg-ens33
        ```
    - 修改内容为：
        ```
        TYPE=Ethernet
        PROXY_METHOD=none
        BROWSER_ONLY=no
        BOOTPROTO=static #静态ip
        DEFROUTE=yes
        IPV4_FAILURE_FATAL=no
        IPV6INIT=yes
        IPV6_AUTOCONF=yes
        IPV6_DEFROUTE=yes
        IPV6_FAILURE_FATAL=no
        IPV6_ADDR_GEN_MODE=stable-privacy
        NAME=ens33
        UUID=fe9acbc4-5787-4875-8a26-9fd1e02b3459
        DEVICE=ens33
        ONBOOT=yes #重启时自动执行该文件
        IPADDR=192.168.0.88 #固定ip
        GATEWAY=192.168.0.1 #网关
        NETMASK=255.255.255.0 #子网掩码
        DNS1=8.8.8.8
        ```
    - 重启网络服务
        ```
        service network restart
        ```