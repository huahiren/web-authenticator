const crypto = require('crypto');

// Base32解码函数
function base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    base32 = base32.replace(/\s+/g, '').toUpperCase();
    for (let i = 0; i < base32.length; i++) {
        const index = alphabet.indexOf(base32.charAt(i));
        bits += index.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return Buffer.from(bytes);
}

// 生成TOTP
function generateTOTP(secret, timeStep, digits = 6) {
    const decodedSecret = base32Decode(secret);
    
    // 创建8字节缓冲区（大端序）
    const buffer = Buffer.alloc(8);
    buffer.writeBigUint64BE(BigInt(timeStep), 0);
    
    // 计算HMAC-SHA1
    const hmac = crypto.createHmac('sha1', decodedSecret).update(buffer).digest();
    
    // 动态截断
    const offset = hmac[hmac.length - 1] & 0x0F;
    const code = ((hmac[offset] & 0x7F) << 24) |
                 ((hmac[offset + 1] & 0xFF) << 16) |
                 ((hmac[offset + 2] & 0xFF) << 8) |
                 (hmac[offset + 3] & 0xFF);
    
    // 取模并补零
    const otp = code % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
}

// 测试用例
const secret = 'QV3BOGNJFKHCQPQ7QXJDPJLJD3T7BWQE';
const timeStep = 58821398; // 从之前的输出中获取的时间步长
const expected = '271406';

// 执行测试
const otp = generateTOTP(secret, timeStep);

// 输出结果
console.log('密钥:', secret);
console.log('时间步长:', timeStep);
console.log('生成的TOTP:', otp);
console.log('预期的TOTP:', expected);
console.log('匹配结果:', otp === expected ? '✓ 成功' : '✗ 失败');
