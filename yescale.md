Ví dụ mẫu: 
curl -X POST "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:generateContent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-z8og0k0nAM3X5gOmb74GPASPy2bVgBul6dzGJaYpyZ23JOOJ" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "Hello, how are you?"}]}
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1024
    }
  }'


Nếu các câu trò chuyện cần kiến thức mới cần sử dụng tool google search:

curl -X POST "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:generateContent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-z8og0k0nAM3X5gOmb74GPASPy2bVgBul6dzGJaYpyZ23JOOJ" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "What are the latest news about AI today?"}]}
    ],
    "tools": [{"googleSearch": {}}],
    "generationConfig": {
      "maxOutputTokens": 2048
    }
  }'


Nếu cần streaming:
curl -X POST "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-z8og0k0nAM3X5gOmb74GPASPy2bVgBul6dzGJaYpyZ23JOOJ" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "Write a short story."}]}
    ],
    "generationConfig": {
      "maxOutputTokens": 2048
    }
  }'
