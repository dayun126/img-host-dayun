/**
 * 认证相关处理函数
 */
import { corsHeaders } from './utils.js';

/**
 * 生成简单的会话令牌
 * 注意：在生产环境中应使用更安全的方法，如 JWT
 * @returns {string} 会话令牌
 */
function generateToken() {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 处理认证请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {boolean} isVerify - 是否为验证请求
 * @returns {Response} 响应对象
 */
export async function handleAuth(request, env, isVerify = false) {
  // 验证请求
  if (isVerify) {
    // 简单验证，实际应用中应该验证 token 的有效性
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  // 登录请求
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: '方法不允许' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  try {
    const body = await request.json();
    const { password } = body;

    // 验证密码
    if (!password || password !== env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, message: '密码错误' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // 生成 token
    const token = generateToken();

    return new Response(
      JSON.stringify({ success: true, token }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('认证错误:', error);
    
    return new Response(
      JSON.stringify({ success: false, message: '请求格式错误: ' + error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
} 