// 测试Web Crypto API和替代实现生成的HMAC值是否一致

// Base32解码函数
function base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    
    // 移除空格并转换为大写
    base32 = base32.replace(/\s+/g, '').toUpperCase();
    
    // 将Base32字符转换为二进制字符串
    for (let i = 0; i < base32.length; i++) {
        const index = alphabet.indexOf(base32.charAt(i));
        if (index === -1) {
            throw new Error(`Invalid base32 character: ${base32.charAt(i)}`);
        }
        bits += index.toString(2).padStart(5, '0');
    }
    
    // 将二进制字符串转换为Uint8Array
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return new Uint8Array(bytes);
}

// 辅助函数：将Uint8Array转换为十六进制字符串
function arrayToHex(array) {
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 辅助函数：将字符串转换为Uint8Array
function stringToUint8Array(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// 测试用例
const testCases = [
    {
        name: '测试1',
        key: 'JBSWY3DPEHPK3PXP', // Base32编码的密钥
        message: '12345678901234567890' // 测试消息
    },
    {
        name: '测试2',
        key: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        message: '测试消息'
    },
    {
        name: '测试3',
        key: '1234567890',
        message: 'timestamp: 1234567890'
    }
];

// HMAC-SHA1替代实现（从script.js复制）
function hmacSHA1Fallback(key, message) {
    // 纯JavaScript SHA1实现
    function sha1(data) {
        // 转换为Uint8Array
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            data = encoder.encode(data);
        }
        
        // SHA1常量
        const K = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];
        
        // 初始化哈希值
        let h0 = 0x67452301;
        let h1 = 0xEFCDAB89;
        let h2 = 0x98BADCFE;
        let h3 = 0x10325476;
        let h4 = 0xC3D2E1F0;
        
        // 填充数据
        const originalLength = data.length * 8;
        let paddedData = new Uint8Array(data.length + 1 + ((64 - ((data.length + 1 + 8) % 64)) % 64) + 8);
        paddedData.set(data);
        paddedData[data.length] = 0x80;
        
        // 添加原始长度（大端序）
        for (let i = 0; i < 8; i++) {
            paddedData[paddedData.length - 1 - i] = (originalLength >>> (i * 8)) & 0xFF;
        }
        
        // 处理512位块
        for (let i = 0; i < paddedData.length; i += 64) {
            const block = paddedData.subarray(i, i + 64);
            const w = new Array(80);
            
            // 前16个单词直接从块中获取
            for (let t = 0; t < 16; t++) {
                w[t] = (block[t * 4] << 24) | (block[t * 4 + 1] << 16) | (block[t * 4 + 2] << 8) | block[t * 4 + 3];
            }
            
            // 扩展剩余的64个单词
            for (let t = 16; t < 80; t++) {
                w[t] = ((w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]) << 1) | ((w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]) >>> 31);
            }
            
            // 初始化变量
            let a = h0;
            let b = h1;
            let c = h2;
            let d = h3;
            let e = h4;
            
            // 主循环
            for (let t = 0; t < 80; t++) {
                let f, k;
                if (t < 20) {
                    f = (b & c) | (~b & d);
                    k = K[0];
                } else if (t < 40) {
                    f = b ^ c ^ d;
                    k = K[1];
                } else if (t < 60) {
                    f = (b & c) | (b & d) | (c & d);
                    k = K[2];
                } else {
                    f = b ^ c ^ d;
                    k = K[3];
                }
                
                const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) & 0xFFFFFFFF;
                e = d;
                d = c;
                c = ((b << 30) | (b >>> 2)) & 0xFFFFFFFF;
                b = a;
                a = temp;
            }
            
            // 更新哈希值
            h0 = (h0 + a) & 0xFFFFFFFF;
            h1 = (h1 + b) & 0xFFFFFFFF;
            h2 = (h2 + c) & 0xFFFFFFFF;
            h3 = (h3 + d) & 0xFFFFFFFF;
            h4 = (h4 + e) & 0xFFFFFFFF;
        }
        
        // 转换为Uint8Array
        const result = new Uint8Array(20);
        result[0] = (h0 >>> 24) & 0xFF;
        result[1] = (h0 >>> 16) & 0xFF;
        result[2] = (h0 >>> 8) & 0xFF;
        result[3] = h0 & 0xFF;
        result[4] = (h1 >>> 24) & 0xFF;
        result[5] = (h1 >>> 16) & 0xFF;
        result[6] = (h1 >>> 8) & 0xFF;
        result[7] = h1 & 0xFF;
        result[8] = (h2 >>> 24) & 0xFF;
        result[9] = (h2 >>> 16) & 0xFF;
        result[10] = (h2 >>> 8) & 0xFF;
        result[11] = h2 & 0xFF;
        result[12] = (h3 >>> 24) & 0xFF;
        result[13] = (h3 >>> 16) & 0xFF;
        result[14] = (h3 >>> 8) & 0xFF;
        result[15] = h3 & 0xFF;
        result[16] = (h4 >>> 24) & 0xFF;
        result[17] = (h4 >>> 16) & 0xFF;
        result[18] = (h4 >>> 8) & 0xFF;
        result[19] = h4 & 0xFF;
        
        return result;
    }
    
    // HMAC计算逻辑
    const blockSize = 64;
    const keyPadding = new Uint8Array(blockSize);
    
    // 调整密钥长度
    let adjustedKey = key;
    if (key.length > blockSize) {
        adjustedKey = sha1(key);
    }
    
    // 填充密钥
    keyPadding.set(adjustedKey);
    
    // 计算内层和外层密钥
    const innerKeyPad = new Uint8Array(blockSize);
    const outerKeyPad = new Uint8Array(blockSize);
    
    for (let i = 0; i < blockSize; i++) {
        innerKeyPad[i] = keyPadding[i] ^ 0x36;
        outerKeyPad[i] = keyPadding[i] ^ 0x5C;
    }
    
    // 计算内层哈希
    const innerData = new Uint8Array(innerKeyPad.length + message.length);
    innerData.set(innerKeyPad);
    innerData.set(message, innerKeyPad.length);
    const innerHash = sha1(innerData);
    
    // 计算外层哈希
    const outerData = new Uint8Array(outerKeyPad.length + innerHash.length);
    outerData.set(outerKeyPad);
    outerData.set(innerHash, outerKeyPad.length);
    const outerHash = sha1(outerData);
    
    return outerHash;
}

// 测试函数
async function runTests() {
    console.log('开始测试HMAC-SHA1一致性...');
    
    for (const testCase of testCases) {
        console.log(`\n=== ${testCase.name} ===`);
        console.log(`密钥: ${testCase.key}`);
        console.log(`消息: ${testCase.message}`);
        
        // 准备测试数据
        const keyBytes = base32Decode(testCase.key);
        const messageBytes = stringToUint8Array(testCase.message);
        
        try {
            // 使用Web Crypto API生成HMAC
            let cryptoHmac;
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const importedKey = await crypto.subtle.importKey(
                    'raw',
                    keyBytes,
                    { name: 'HMAC', hash: { name: 'SHA-1' } },
                    false,
                    ['sign']
                );
                
                const signature = await crypto.subtle.sign(
                    'HMAC',
                    importedKey,
                    messageBytes
                );
                
                cryptoHmac = new Uint8Array(signature);
                console.log('Web Crypto API HMAC:', arrayToHex(cryptoHmac));
            } else {
                console.log('Web Crypto API不可用');
                cryptoHmac = null;
            }
            
            // 使用替代实现生成HMAC
            const fallbackHmac = hmacSHA1Fallback(keyBytes, messageBytes);
            console.log('替代实现 HMAC:', arrayToHex(fallbackHmac));
            
            // 比较结果
            if (cryptoHmac) {
                const isEqual = cryptoHmac.length === fallbackHmac.length && 
                               cryptoHmac.every((byte, index) => byte === fallbackHmac[index]);
                console.log('结果:', isEqual ? '一致 ✓' : '不一致 ✗');
                
                if (!isEqual) {
                    console.log('详细比较:');
                    for (let i = 0; i < Math.max(cryptoHmac.length, fallbackHmac.length); i++) {
                        console.log(`字节 ${i}: ${cryptoHmac[i]?.toString(16).padStart(2, '0')} vs ${fallbackHmac[i]?.toString(16).padStart(2, '0')}`);
                    }
                }
            }
        } catch (error) {
            console.error('测试失败:', error);
        }
    }
    
    console.log('\n测试完成！');
}

// 运行测试
runTests();
