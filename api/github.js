/**
 * GitHub API 交互相关函数
 */
import { corsHeaders } from './utils.js';

// 支持的图片格式
const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];

/**
 * 获取文件夹列表
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
export async function handleFolders(request, env) {
  try {
    const folders = await listFolders(env);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: { folders }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: '获取文件夹列表失败: ' + error.message
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
 * 获取图片列表
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
export async function handleImages(request, env) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || 'frontend';
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 20;
  const search = url.searchParams.get('search') || '';
  
  try {
    const { images, total } = await listImages(env, path, page, limit, search, request);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          images,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            hasNext: page * limit < total
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: '获取图片列表失败: ' + error.message
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
 * 处理图片上传
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
export async function handleUpload(request, env) {
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
    const formData = await request.formData();
    const file = formData.get('file');
    let path = formData.get('path') || 'frontend';
    const createFolder = formData.get('create_folder') === 'true';
    
    // 验证文件类型
    const fileName = file.name;
    const isValidFormat = SUPPORTED_IMAGE_FORMATS.some(format => 
      fileName.toLowerCase().endsWith(format)
    );
    
    if (!isValidFormat) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '不支持的文件格式，仅支持 JPEG、PNG、GIF、WebP 和 AVIF 格式'
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
    
    // 构建上传路径
    let apiPath = path;
    if (path !== 'frontend' && !path.startsWith('frontend/')) {
      apiPath = `frontend/${path}`;
    }
    
    // 上传文件
    const buffer = await file.arrayBuffer();
    const result = await uploadFile(env, apiPath, fileName, buffer, createFolder);
    
    // 从请求头中获取图片域名
    const imageDomain = request.headers.get('X-Image-Domain');
    if (!imageDomain) {
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
    console.log('上传图片使用域名:', imageDomain);
    
    // 正确处理URL路径前缀
    let pathPrefix = '';
    if (path !== 'frontend') {
      // 如果已经包含frontend/前缀，则去掉
      if (path.startsWith('frontend/')) {
        pathPrefix = `${path.substring(9)}/`;
      } else {
        pathPrefix = `${path}/`;
      }
    }
    
    const fileUrl = `${imageDomain}/${pathPrefix}${fileName}`;
    
    console.log('上传图片完成');
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name: fileName,
          url: fileUrl
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: '上传图片失败: ' + error.message
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
 * 处理图片删除
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Response} 响应对象
 */
export async function handleDelete(request, env) {
  console.log('收到删除请求:', request.url, request.method);
  
  if (request.method !== 'DELETE') {
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
    console.log('请求URL:', url.toString());
    console.log('URL路径:', url.pathname);
    
    // 提取路径部分
    let filePath;
    if (url.pathname.startsWith('/api/images/')) {
      filePath = url.pathname.substring('/api/images/'.length);
      console.log('从/api/images/提取路径:', filePath);
    } else if (url.pathname.startsWith('/images/')) {
      filePath = url.pathname.substring('/images/'.length);
      console.log('从/images/提取路径:', filePath);
    } else {
      console.log('无法匹配路径格式:', url.pathname);
      return new Response(
        JSON.stringify({ success: false, message: '无效的路径' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    // 解码路径中的每个部分
    filePath = filePath.split('/').map(part => decodeURIComponent(part)).join('/');
    console.log('解码后的文件路径:', filePath);
    
    // 确保路径格式正确
    let apiPath = filePath;
    if (!filePath.startsWith('frontend/')) {
      apiPath = `frontend/${filePath}`;
    }
    console.log('最终API路径:', apiPath);
    
    await deleteFile(env, apiPath);
    
    console.log('删除图片完成');
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: '删除图片失败: ' + error.message
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
 * 列出文件夹
 * @param {Object} env - 环境变量
 * @returns {Promise<Array<string>>} 文件夹列表
 */
async function listFolders(env) {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/frontend`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CloudflareWorker'
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API 错误: ${response.status}`);
  }
  
  const data = await response.json();
  
  // 需要忽略的文件夹
  const ignoreFolders = ['css', 'js'];
  
  // 过滤出文件夹，并忽略指定的文件夹
  return data
    .filter(item => item.type === 'dir' && !ignoreFolders.includes(item.name))
    .map(item => item.name);
}

/**
 * 列出图片
 * @param {Object} env - 环境变量
 * @param {string} path - 文件夹路径
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @param {string} search - 搜索关键词
 * @param {Request} request - 请求对象
 * @returns {Promise<Object>} 图片列表和总数
 */
async function listImages(env, path, page, limit, search, request) {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  
  // 确保路径格式正确
  let apiPath = path;
  if (path !== 'frontend' && !path.startsWith('frontend/')) {
    apiPath = `frontend/${path}`;
  }
  
  console.log(`正在获取路径: ${apiPath} 的图片`);
  
  // 处理路径中可能包含的中文字符，需要进行URL编码
  // 但要保留路径分隔符"/"
  const encodedPath = apiPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
  
  console.log(`请求GitHub API URL: ${apiUrl}`);
  
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CloudflareWorker'
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API 错误: ${response.status} - 获取路径 ${apiPath} 失败`);
  }
  
  const data = await response.json();
  
  // 过滤出图片文件
  let files = data.filter(item => {
    if (item.type !== 'file') return false;
    
    const fileName = item.name.toLowerCase();
    return SUPPORTED_IMAGE_FORMATS.some(format => fileName.endsWith(format));
  });
  
  // 搜索过滤
  if (search) {
    const searchLower = search.toLowerCase();
    files = files.filter(file => 
      file.name.toLowerCase().includes(searchLower)
    );
  }
  
  // 计算总数
  const total = files.length;
  
  // 分页
  const start = (page - 1) * limit;
  const end = start + limit;
  files = files.slice(start, end);
  
  // 构建图片信息
  // 从请求头中获取图片域名
  const imageDomain = request.headers.get('X-Image-Domain');
  if (!imageDomain) {
    throw new Error('缺少图片域名配置，请在前端config.js中设置imageBaseUrl');
  }
  console.log('使用图片域名:', imageDomain);
  
  // 正确处理URL路径前缀
  let pathPrefix = '';
  if (path !== 'frontend') {
    // 如果已经包含frontend/前缀，则去掉
    if (path.startsWith('frontend/')) {
      pathPrefix = `${path.substring(9)}/`;
    } else {
      pathPrefix = `${path}/`;
    }
  }
  
  const images = files.map(file => ({
    name: file.name,
    url: `${imageDomain}/${pathPrefix}${file.name}`,
    size: file.size,
    created_at: new Date().toISOString() // GitHub API 不直接提供创建时间
  }));
  
  return { images, total };
}

/**
 * 上传文件到 GitHub
 * @param {Object} env - 环境变量
 * @param {string} path - 文件路径
 * @param {string} fileName - 文件名
 * @param {ArrayBuffer} content - 文件内容
 * @param {boolean} createFolder - 是否创建文件夹
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFile(env, path, fileName, content, createFolder) {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  
  // 处理中文文件名，进行URL编码
  const encodedFileName = encodeURIComponent(fileName);
  
  // 直接上传文件，不再单独创建.gitkeep文件
  // GitHub API会自动创建不存在的文件夹
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}/${encodedFileName}`;
  
  console.log(`上传文件到路径: ${path}/${encodedFileName}`);
  
  // 编码文件内容
  const base64Content = bufferToBase64(content);
  
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CloudflareWorker'
    },
    body: JSON.stringify({
      message: `Upload ${fileName}`,
      content: base64Content
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API 错误: ${response.status} - ${error.message}`);
  }
  
  return await response.json();
}

/**
 * 删除文件
 * @param {Object} env - 环境变量
 * @param {string} path - 文件路径
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFile(env, path) {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  
  // 处理路径中可能包含的中文字符，需要进行URL编码
  // 但要保留路径分隔符"/"
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
  
  console.log(`正在删除文件: ${path} (编码后: ${encodedPath})`);
  
  // 获取文件 SHA
  const getResponse = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CloudflareWorker'
    }
  });
  
  if (!getResponse.ok) {
    throw new Error(`获取文件信息失败: ${getResponse.status} - 路径: ${path}`);
  }
  
  const fileInfo = await getResponse.json();
  
  // 删除文件
  const deleteResponse = await fetch(apiUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CloudflareWorker'
    },
    body: JSON.stringify({
      message: `Delete ${path}`,
      sha: fileInfo.sha
    })
  });
  
  if (!deleteResponse.ok) {
    throw new Error(`删除文件失败: ${deleteResponse.status}`);
  }
  
  return await deleteResponse.json();
}

/**
 * 将 ArrayBuffer 转换为 Base64 字符串
 * @param {ArrayBuffer} buffer - 二进制数据
 * @returns {string} Base64 字符串
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 触发Cloudflare Pages部署
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 部署结果，包含deploymentId和success状态
 */
export async function triggerPagesDeploy(env) {
  try {
    console.log('正在触发Cloudflare Pages部署...');
    
    // 构建部署请求
    const deployUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/img-host/deployments`;
    
    const response = await fetch(deployUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Cloudflare Pages部署已触发:', result);
      // 返回部署ID和成功状态
      return {
        success: true,
        deploymentId: result.result?.id || null
      };
    } else {
      console.error('触发部署失败:', result.errors);
      return {
        success: false,
        error: result.errors
      };
    }
  } catch (error) {
    console.error('触发部署出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 检查部署状态
 * @param {Object} env - 环境变量
 * @param {string} deploymentId - 部署ID
 * @returns {Promise<Object>} 部署状态
 */
export async function checkDeploymentStatus(env, deploymentId) {
  try {
    if (!deploymentId) {
      return { success: false, status: 'unknown', message: '缺少部署ID' };
    }
    
    const statusUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/img-host/deployments/${deploymentId}`;
    
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      return { 
        success: false, 
        status: 'error',
        message: `获取部署状态失败: ${JSON.stringify(result.errors)}`
      };
    }
    
    const deploymentStatus = result.result?.latest_stage?.status || 'unknown';
    console.log(`部署状态: ${deploymentStatus}`);
    
    return {
      success: true,
      status: deploymentStatus,
      isCompleted: deploymentStatus === 'success',
      isFailed: ['failed', 'error', 'canceled'].includes(deploymentStatus),
      isInProgress: ['initializing', 'queued', 'active'].includes(deploymentStatus),
      message: `部署状态: ${deploymentStatus}`
    };
  } catch (error) {
    console.error('检查部署状态出错:', error);
    return {
      success: false,
      status: 'error',
      message: `检查部署状态出错: ${error.message}`
    };
  }
} 