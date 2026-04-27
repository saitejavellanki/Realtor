require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const modelsToTest = [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-pro',
    'gemini-pro-vision',
];

async function testModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('\n🔍 Testing available models:\n');
    console.log('=' .repeat(60));
    
    for (const modelName of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            console.log(`✅ ${modelName} - Available`);
        } catch (error) {
            console.log(`❌ ${modelName} - ${error.message.split('\n')[0]}`);
        }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
}

testModels();
