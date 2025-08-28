FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/license.db

# 暴露端口
EXPOSE 3000

# 设置用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app /data
USER nodeuser

# 启动应用
CMD ["node", "server.js"]