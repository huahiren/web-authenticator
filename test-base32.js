// 测试Base32解码函数
const secret = 'QV3BOGNJFKHCQPQ7QXJDPJLJD3T7BWQE';

// Web应用中的base32Decode函数实现
function base32DecodeWeb(base32) {
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
    
    return bytes;
}

// Node.js中的base32Decode函数实现
function base32DecodeNode(base32) {
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
    return bytes;
}

// 执行测试
console.log('===== Base32解码测试 =====');
console.log('密钥:', secret);

const webResult = base32DecodeWeb(secret);
const nodeResult = base32DecodeNode(secret);

console.log('Web应用解码结果:', webResult.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Node.js解码结果:', nodeResult.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('解码结果一致:', JSON.stringify(webResult) === JSON.stringify(nodeResult));

// 比较每个字节
console.log('\n字节比较:');
for (let i = 0; i < webResult.length; i++) {
    const webByte = webResult[i];
    const nodeByte = nodeResult[i];
    console.log(`字节 ${i}: Web=${webByte.toString(16).padStart(2, '0')}, Node=${nodeByte.toString(16).padStart(2, '0')}, 一致=${webByte === nodeByte}`);
}
