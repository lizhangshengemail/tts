const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

class Database {
    constructor() {
        this.db = new sqlite3.Database('license.db');
        this.init();
    }

    init() {
        // 创建授权码表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS license_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT DEFAULT '',
                max_devices INTEGER DEFAULT 1,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active'
            )
        `);

        // 创建设备绑定表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_id INTEGER,
                device_fingerprint TEXT,
                token TEXT,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (license_id) REFERENCES license_codes (id)
            )
        `);

        // 创建使用日志表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_id INTEGER,
                action TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (license_id) REFERENCES license_codes (id)
            )
        `);
    }

    // 生成授权码
    generateLicenseCode(name = '', maxDevices = 1, daysValid = 365) {
        const code = this.generateRandomCode();
        const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO license_codes (code, name, max_devices, expires_at) VALUES (?, ?, ?, ?)',
                [code, name, maxDevices, expiresAt.toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, code, expires_at: expiresAt });
                }
            );
        });
    }

    // 验证授权码
    verifyLicenseCode(code, deviceFingerprint) {
        return new Promise((resolve, reject) => {
            // 查询授权码
            this.db.get(
                `SELECT * FROM license_codes 
                 WHERE code = ? AND status = 'active' AND expires_at > datetime('now')`,
                [code],
                (err, license) => {
                    if (err) return reject(err);
                    if (!license) return resolve({ valid: false, message: '授权码无效或已过期' });

                    // 检查设备数量限制
                    this.db.get(
                        'SELECT COUNT(*) as count FROM user_devices WHERE license_id = ?',
                        [license.id],
                        (err, result) => {
                            if (err) return reject(err);
                            
                            if (result.count >= license.max_devices) {
                                // 检查是否是已绑定的设备
                                this.db.get(
                                    'SELECT * FROM user_devices WHERE license_id = ? AND device_fingerprint = ?',
                                    [license.id, deviceFingerprint],
                                    (err, device) => {
                                        if (err) return reject(err);
                                        
                                        if (device) {
                                            // 已绑定设备，更新令牌
                                            const token = this.generateToken();
                                            this.db.run(
                                                'UPDATE user_devices SET token = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?',
                                                [token, device.id]
                                            );
                                            resolve({ 
                                                valid: true, 
                                                token, 
                                                license,
                                                message: '验证成功(已绑定设备)' 
                                            });
                                        } else {
                                            resolve({ 
                                                valid: false, 
                                                message: `设备数量已达上限(${license.max_devices}台)` 
                                            });
                                        }
                                    }
                                );
                            } else {
                                // 绑定新设备
                                const token = this.generateToken();
                                this.db.run(
                                    'INSERT INTO user_devices (license_id, device_fingerprint, token) VALUES (?, ?, ?)',
                                    [license.id, deviceFingerprint, token],
                                    (err) => {
                                        if (err) return reject(err);
                                        resolve({ 
                                            valid: true, 
                                            token, 
                                            license,
                                            message: '验证成功(新设备绑定)' 
                                        });
                                    }
                                );
                            }
                        }
                    );
                }
            );
        });
    }

    // 验证访问令牌
    verifyToken(token) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT ud.*, lc.* FROM user_devices ud
                JOIN license_codes lc ON ud.license_id = lc.id
                WHERE ud.token = ? AND lc.status = 'active' AND lc.expires_at > datetime('now')
            `, [token], (err, result) => {
                if (err) reject(err);
                else resolve(result ? { valid: true, license: result } : { valid: false });
            });
        });
    }

    // 记录使用日志
    logUsage(licenseId, action, ipAddress, userAgent) {
        this.db.run(
            'INSERT INTO usage_logs (license_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [licenseId, action, ipAddress, userAgent]
        );
    }

    // 获取所有授权码
    getAllLicenses() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT lc.*, COUNT(ud.id) as device_count 
                FROM license_codes lc
                LEFT JOIN user_devices ud ON lc.id = ud.license_id
                GROUP BY lc.id
                ORDER BY lc.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // 生成随机授权码
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 20; i++) {
            if (i > 0 && i % 5 === 0) result += '-';
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 生成访问令牌
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;