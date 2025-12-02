// 测试修复后的TOTP生成函数
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

// 修复后的generateTOTP函数（使用BigInt处理）
function generateTOTPFixed(secret, timeStep, digits = 6) {
    const decodedSecret = base32Decode(secret);
    
    // 创建8字节缓冲区（大端序）
    const buffer = Buffer.alloc(8);
    
    // 使用BigInt确保正确处理大数值
    let bigTimeStep = BigInt(timeStep);
    for (let i = 0; i < 8; i++) {
        buffer.writeUInt8(Number((bigTimeStep >> BigInt(i * 8)) & 0xFFn), 7 - i);
    }
    
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

// 旧版本的generateTOTP函数（不使用BigInt）
function generateTOTPOriginal(secret, timeStep, digits = 6) {
    const decodedSecret = base32Decode(secret);
    
    // 创建8字节缓冲区（大端序）
    const buffer = Buffer.alloc(8);
    
    // 不使用BigInt处理
    for (let i = 0; i < 8; i++) {
        buffer.writeUInt8((timeStep >> (i * 8)) & 0xFF, 7 - i);
    }
    
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

// 测试新案例
const secret = 'QV3BOGNJFKHCQPQ7QXJDPJLJD3T7BWQE';
const testTime = '2025-12-02 10:29:00';
const expected = '254100';

// 转换为时间戳
const [datePart, timePart] = testTime.split(' ');
const [year, month, day] = datePart.split('-').map(Number);
const [hours, minutes, seconds] = timePart.split(':').map(Number);
const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
const now = Math.floor(timestamp / 1000);
const timeStep = Math.floor(now / 30);

// 执行测试
const otpFixed = generateTOTPFixed(secret, timeStep);
const otpOriginal = generateTOTPOriginal(secret, timeStep);

// 输出结果
console.log('===== 修复前后TOTP生成对比 =====');
console.log('密钥:', secret);
console.log('时间:', testTime);
console.log('时间戳:', timestamp);
console.log('时间戳（秒）:', now);
console.log('时间步长:', timeStep);
console.log('预期的TOTP:', expected);
console.log('修复后生成的TOTP:', otpFixed);
console.log('修复前生成的TOTP:', otpOriginal);
console.log('修复后匹配:', otpFixed === expected ? '✓ 成功' : '✗ 失败');
console.log('修复前匹配:', otpOriginal === expected ? '✓ 成功' : '✗ 失败');
