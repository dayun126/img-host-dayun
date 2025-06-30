/**
 * 缓存管理相关函数
 */
import { corsHeaders } from './utils.js';

/**
 * 清除缓存
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
export async function purgeCache(request, env) {
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
    console.log('开始清理缓存流程');
    
    // 从请求头中获取图片URL
    const mainDomain = request.headers.get('X-Image-Domain');
    if (!mainDomain) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '缺少图片域名配置，请在前端config.js中设置imageBaseUrl'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    // 提取域名部分，去掉协议前缀
    const domainOnly = mainDomain.replace(/^https?:\/\//, '');
    console.log('清理缓存使用域名:', domainOnly);
    
    // 调用 Cloudflare API 清除根目录缓存
    const purgeResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      // 使用 prefixes 来清理根目录下的所有内容，但不包含协议前缀
      body: JSON.stringify({
        prefixes: [`${domainOnly}/`]
      })
    });

    const purgeResult = await purgeResponse.json();
    console.log('缓存清理结果:', purgeResult);

    if (!purgeResult.success) {
      throw new Error(`清除缓存失败: ${JSON.stringify(purgeResult.errors)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: '缓存清理成功'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('清理缓存出错:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: '清除缓存失败: ' + error.message
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
} 