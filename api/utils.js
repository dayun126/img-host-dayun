/**
 * 工具函数
 */

// CORS 头
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Image-Domain',
  'Access-Control-Max-Age': '86400'
};

/**
 * 处理 OPTIONS 请求
 * @param {Request} request - 请求对象
 * @returns {Response} 响应对象
 */
export function handleOptions(request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204
  });
}

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @returns {Response} 响应对象
 */
export function handleError(error) {
  console.error('API 错误:', error);
  
  return new Response(
    JSON.stringify({
      success: false,
      message: '服务器错误: ' + error.message
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
} 