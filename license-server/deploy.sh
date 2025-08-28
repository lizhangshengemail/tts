#!/bin/bash

# 服务器部署脚本
echo "开始部署 TikTok License Server..."

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 创建应用目录
sudo mkdir -p /opt/tiktok-license-server
sudo chown -R $USER:$USER /opt/tiktok-license-server

# 复制文件
cp -r . /opt/tiktok-license-server/
cd /opt/tiktok-license-server

# 安装依赖
npm install --production

# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 配置防火墙
sudo ufw allow 3000
sudo ufw --force enable

echo "部署完成！"
echo "访问地址: http://你的服务器IP:3000"
echo "管理命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs tiktok-license-server"
echo "  重启服务: pm2 restart tiktok-license-server"