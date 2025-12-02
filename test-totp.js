// 测试TOTP生成功能
// 测试生成的TOTP是否符合预期

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
const generateTOTP = context.generateTOTP;

// 测试用例
const testCases = [
    {
        name: '测试用例1 - 标准密钥',
        key: 'JBSWY3DPEHPK3PXP',
        expectedLength: 6
    },
    {
        name: '测试用例2 - 长密钥',
        key: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        expectedLength: 6
    },
    {
        name: '测试用例3 - 当前时间',
        key: 'JBSWY3DPEHPK3PXP',
        expectedLength: 6
    }
];

// 运行测试
async function runTests() {
    console.log('开始测试TOTP生成功能...\n');
    
    let passed = 0;
    let total = testCases.length;
    
    for (let index = 0; index < testCases.length; index++) {
        const testCase = testCases[index];
        console.log(`=== 测试${index + 1} ===`);
        console.log(`名称: ${testCase.name}`);
        console.log(`密钥: ${testCase.key}`);
        
        try {
            const totp = await generateTOTP(testCase.key, testCase.expectedLength);
            console.log(`生成的TOTP: ${totp}`);
            
            // 验证TOTP长度
            if (totp.length === testCase.expectedLength) {
                console.log(`结果: 长度正确 ✓`);
                passed++;
            } else {
                console.log(`结果: 长度不正确 ✗ (预期: ${testCase.expectedLength}, 实际: ${totp.length})`);
            }
        } catch (error) {
            console.log(`结果: 生成失败 ✗`);
            console.log(`错误信息: ${error.message}`);
            console.log(`错误堆栈: ${error.stack}`);
        }
        
        console.log('');
    }
    
    console.log(`测试完成: ${passed}/${total} 个测试用例通过`);
    
    if (passed === total) {
        console.log('所有测试用例通过！✓');
        process.exit(0);
    } else {
        console.log('部分测试用例失败！✗');
        process.exit(1);
    }
}

// 运行测试
runTests();
