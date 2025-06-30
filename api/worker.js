/**
 * 个人图床 - Cloudflare Worker
 */

// 导入模块
import { handleAuth } from './auth.js';
import { handleImages, handleFolders, handleUpload, handleDelete, triggerPagesDeploy, checkDeploymentStatus } from './github.js';
import { purgeCache } from './cache.js';
import { corsHeaders, handleOptions, handleError } from './utils.js';

// 环境变量
// - GITHUB_TOKEN: GitHub 访问令牌
// - GITHUB_REPO: 仓库地址（格式：owner/repo）
// - CF_API_TOKEN: Cloudflare API 令牌
// - CF_ZONE_ID: Cloudflare Zone ID
// - CF_ACCOUNT_ID: Cloudflare 账号ID
// - ADMIN_PASSWORD: 管理员密码

/**
 * 处理请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 添加CORS头到所有响应
  const corsResponse = {
    headers: {
      ...corsHeaders
    }
  };
  
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  try {
    // 处理根路径请求
    if (path === '/' || path === '') {
      return new Response('Image Hosting API is running', {
        headers: corsHeaders
      });
    }
    
    // API 路由
    // 登录和验证
    if (path === '/login' || path === '/api/login') {
      return await handleAuth(request, env);
    }
    
    if (path === '/verify' || path === '/api/verify') {
      return await handleAuth(request, env, true);
    }
    
    // 验证 token（除了登录和验证接口外的所有接口都需要验证）
    const authResult = await validateAuth(request, env);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ success: false, message: '未授权访问' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 文件夹列表
    if (path === '/folders' || path === '/api/folders') {
      return await handleFolders(request, env);
    }
    
    // 图片列表
    if (path === '/images' || path === '/api/images') {
      return await handleImages(request, env);
    }
    
    // 上传图片
    if (path === '/upload' || path === '/api/upload') {
      return await handleUpload(request, env);
    }
    
    // 删除图片
    if (path.startsWith('/images/') || path.startsWith('/api/images/')) {
      return await handleDelete(request, env);
    }
    
    // 清除缓存
    if (path === '/purge-cache' || path === '/api/purge-cache') {
      return await purgeCache(request, env);
    }
    
    // 仅触发部署
    if (path === '/deploy' || path === '/api/deploy') {
      return await handleDeploy(request, env);
    }
    
    // 检查部署状态
    if (path === '/deploy-status' || path === '/api/deploy-status') {
      return await handleDeployStatus(request, env);
    }
    
    // 未找到的 API 路由
    return new Response(JSON.stringify({ success: false, message: '未找到 API 路由' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * 处理部署请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleDeploy(request, env) {
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
    console.log('开始触发部署流程');
    
    // 触发Cloudflare Pages部署
    const deployResult = await triggerPagesDeploy(env);
    console.log('Cloudflare Pages部署触发完成:', deployResult);
    
    if (!deployResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `触发部署失败: ${deployResult.error || '未知错误'}`
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
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: '资源更新已触发，部署进行中',
        deploymentId: deployResult.deploymentId
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('触发部署出错:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: '触发部署失败: ' + error.message
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

/**
 * 处理部署状态检查请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
async function handleDeployStatus(request, env) {
  if (request.method !== 'GET') {
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
    const url = new URL(request.url);
    const deploymentId = url.searchParams.get('deploymentId');
    
    if (!deploymentId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '缺少部署ID参数'
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
    
    console.log('检查部署状态:', deploymentId);
    
    // 检查部署状态
    const statusResult = await checkDeploymentStatus(env, deploymentId);
    console.log('部署状态检查结果:', statusResult);
    
    return new Response(
      JSON.stringify(statusResult),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('检查部署状态出错:', error);
    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        message: '检查部署状态失败: ' + error.message
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

/**
 * 验证认证信息
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Object} 验证结果
 */
async function validateAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }
  
  const token = authHeader.split(' ')[1];
  
  // 这里可以添加更复杂的 token 验证逻辑，如 JWT 验证
  // 简单起见，我们只检查 token 是否存在
  return { valid: !!token };
}

// 导出 fetch 处理函数
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
}; 