// 简单测试hmacSHA1函数
// 测试Web Crypto API是否能正常工作

// 从script.js导入函数
const fs = require('fs');
const vm = require('vm');

// 读取script.js文件
const scriptContent = fs.readFileSync('./script.js', 'utf8');

// 创建上下文
const context = {
    console: console,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    // 模拟Web Crypto API
    crypto: require('crypto').webcrypto
};

// 执行script.js，将函数加载到上下文中
vm.createContext(context);
vm.runInContext(scriptContent, context);

// 获取测试函数
const hmacSHA1 = context.hmacSHA1;
const base32Decode = context.base32Decode;

// 测试用例
async function testHMAC() {
    console.log('开始测试HMAC-SHA1函数...\n');
    
    try {
        // 测试base32Decode函数
        const key = 'JBSWY3DPEHPK3PXP';
        console.log(`测试base32Decode: ${key}`);
        const decodedKey = base32Decode(key);
        console.log(`解码结果: ${decodedKey}`);
        console.log(`解码长度: ${decodedKey.length}`);
        console.log('');
        
        // 测试时间步长转换
        const timestamp = 1234567890;
        const timeStep = Math.floor(timestamp / 30);
        console.log(`测试时间步长转换: ${timestamp}`);
        console.log(`时间步长: ${timeStep}`);
        
        // 创建8字节大端序表示
        const hmacMessage = new ArrayBuffer(8);
        const hmacView = new DataView(hmacMessage);
        for (let i = 0; i < 8; i++) {
            hmacView.setUint8(7 - i, (timeStep >>> (i * 8)) & 0xFF);
        }
        
        const messageBytes = new Uint8Array(hmacMessage);
        console.log(`消息字节: ${messageBytes}`);
        console.log(`消息长度: ${messageBytes.length}`);
        console.log('');
        
        // 测试HMAC计算
        console.log('测试HMAC计算...');
        const hmac = await hmacSHA1(decodedKey, hmacMessage);
        console.log(`HMAC结果: ${hmac}`);
        console.log(`HMAC长度: ${hmac.length}`);
        console.log('HMAC计算成功！✓');
        
    } catch (error) {
        console.log('HMAC计算失败！✗');
        console.log(`错误信息: ${error.message}`);
        console.log(`错误堆栈: ${error.stack}`);
    }
}

// 运行测试
testHMAC();
