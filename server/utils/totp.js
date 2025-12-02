const crypto = require('crypto');

// Base32解码函数
function base32Decode(encoded) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let result = [];
    
    // 转换为大写、移除空格和填充
    encoded = encoded.toUpperCase().replace(/\s+/g, '').replace(/=/g, '');
    
    // 将Base32字符转换为5位二进制
    for (let i = 0; i < encoded.length; i++) {
        const val = base32Chars.indexOf(encoded[i]);
        if (val === -1) {
            throw new Error('Invalid base32 character: ' + encoded[i]);
        }
        bits += val.toString(2).padStart(5, '0');
    }
    
    // 将5位二进制分组转换为8位字节
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        result.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return Buffer.from(result);
}

// 生成TOTP码
function generateTOTP(secret, timestamp = null, digits = 6, period = 30) {
    // 将Base32密钥转换为二进制
    const decodedSecret = base32Decode(secret);
    
    // 获取时间步长，如果提供了timestamp则使用，否则使用当前时间
    const now = timestamp !== null ? timestamp : Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(now / period);
    
    // 将时间步长转换为8字节的大端序缓冲区
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep));
    
    // 计算HMAC-SHA1
    const hmac = crypto.createHmac('sha1', decodedSecret);
    hmac.update(buffer);
    const hmacResult = hmac.digest();
    
    // 动态截断
    const offset = hmacResult[hmacResult.length - 1] & 0x0F;
    const code = ((hmacResult[offset] & 0x7F) << 24) |
                 ((hmacResult[offset + 1] & 0xFF) << 16) |
                 ((hmacResult[offset + 2] & 0xFF) << 8) |
                 (hmacResult[offset + 3] & 0xFF);
    
    // 取模得到指定长度的验证码
    const otp = code % Math.pow(10, digits);
    
    // 补前导零
    return otp.toString().padStart(digits, '0');
}

// 获取剩余倒计时时间（秒）
function getRemainingTime(period = 30) {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
}

module.exports = {
    generateTOTP,
    getRemainingTime
};
