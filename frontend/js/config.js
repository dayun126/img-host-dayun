/**
 * 图床系统配置
 */
const config = {
    // 后端API基础URL，改为你的Worker URL
    apiBaseUrl: 'https://your-worker-name.your-account.workers.dev',
       
    // 图片URL，改为你的Pages URL
    imageBaseUrl: 'https://your-image-domain.pages.dev',
};

// 导出配置
window.imgHostConfig = config;