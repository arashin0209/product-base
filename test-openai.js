const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('OpenAI client initialized:', !!openai);
console.log('API Key present:', !!process.env.OPENAI_API_KEY);

// 実際にAPI呼び出しをテスト
openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 10
}).then(response => {
  console.log('API call successful:', response.choices[0].message.content);
}).catch(error => {
  console.error('API call failed:', error.message);
});

