const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./database');

const app = express();
const port = process.env.PORT || 3000;
const db = new Database();

// 中间件
app.use(cors({
    origin: ['chrome-extension://*', 'https://seller.us.tiktokshopglobalselling.com', 'https://seller.us.tiktokglobalshop.com'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// 获取客户端IP
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// 生成设备指纹
function generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = getClientIP(req);
    return require('crypto').createHash('md5').update(userAgent + ip).digest('hex');
}

// API路由
// 授权码验证接口
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { license_code, device_fingerprint } = req.body;
        
        if (!license_code) {
            return res.json({ success: false, message: '请输入授权码' });
        }

        // 使用提供的设备指纹，或自动生成
        const fingerprint = device_fingerprint || generateDeviceFingerprint(req);
        
        const result = await db.verifyLicenseCode(license_code, fingerprint);
        
        if (result.valid) {
            // 记录使用日志
            db.logUsage(
                result.license.id, 
                'verify', 
                getClientIP(req), 
                req.headers['user-agent']
            );
            
            res.json({
                success: true,
                message: result.message,
                token: result.token,
                expires_at: result.license.expires_at
            });
        } else {
            res.json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('验证授权码错误:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 令牌验证接口
app.post('/api/auth/validate', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.json({ success: false, message: '缺少访问令牌' });
        }
        
        const result = await db.verifyToken(token);
        
        if (result.valid) {
            // 记录使用日志
            db.logUsage(
                result.license.license_id, 
                'validate', 
                getClientIP(req), 
                req.headers['user-agent']
            );
            
            res.json({
                success: true,
                message: '令牌有效',
                expires_at: result.license.expires_at
            });
        } else {
            res.json({
                success: false,
                message: '令牌无效或已过期'
            });
        }
    } catch (error) {
        console.error('验证令牌错误:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 管理员接口 - 生成授权码
app.post('/api/admin/generate', async (req, res) => {
    try {
        const { name = '', max_devices = 1, days_valid = 365 } = req.body;
        
        const result = await db.generateLicenseCode(name, max_devices, days_valid);
        
        res.json({
            success: true,
            message: '授权码生成成功',
            data: result
        });
    } catch (error) {
        console.error('生成授权码错误:', error);
        res.json({ success: false, message: '生成失败' });
    }
});

// 管理员接口 - 获取所有授权码
app.get('/api/admin/licenses', async (req, res) => {
    try {
        const licenses = await db.getAllLicenses();
        res.json({
            success: true,
            data: licenses
        });
    } catch (error) {
        console.error('获取授权码列表错误:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'TikTok授权验证服务运行正常',
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`授权验证服务已启动:`);
    console.log(`- 本地访问: http://localhost:${port}`);
    console.log(`- 管理后台: http://localhost:${port}/admin.html`);
    console.log(`- API健康检查: http://localhost:${port}/api/health`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    db.close();
    process.exit(0);
});