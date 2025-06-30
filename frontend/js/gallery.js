/**
 * 图片展示相关功能
 */
class Gallery {
    constructor() {
        this.currentPath = 'frontend';
        this.currentPage = 1;
        this.totalPages = 1;
        this.imagesPerPage = 20;
        this.images = [];
        this.folders = [];
        this.searchQuery = '';
        this.selectedImages = []; // 存储选中的图片
        this.deleteMode = false; // 是否处于删除模式

        this.imagesContainer = document.getElementById('images-container');
        this.pagination = document.getElementById('pagination');
        this.foldersList = document.getElementById('folders-list');
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.deleteModeBtn = document.getElementById('delete-mode-btn');
        this.deleteActionBar = document.getElementById('delete-action-bar');
        this.selectedCountEl = document.getElementById('selected-count');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.purgeCacheBtn = document.getElementById('purge-cache-btn');
        this.deployBtn = document.getElementById('deploy-btn');
        this.previewModal = new bootstrap.Modal(document.getElementById('preview-modal'));
        this.deleteModal = new bootstrap.Modal(document.getElementById('delete-modal'));
        
        // API基础URL
        this.apiBaseUrl = auth.getApiBaseUrl();
        
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        window.addEventListener('auth:login', () => this.init());
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        document.getElementById('copy-url-btn').addEventListener('click', () => this.copyImageUrl());
        document.getElementById('delete-confirm').addEventListener('click', () => this.confirmDelete());
        
        // 删除模式按钮
        this.deleteModeBtn.addEventListener('click', () => this.toggleDeleteMode());
        
        // 取消删除按钮
        this.cancelDeleteBtn.addEventListener('click', () => this.exitDeleteMode());
        
        // 确认删除按钮
        this.confirmDeleteBtn.addEventListener('click', () => this.showDeleteConfirm());
        
        // 清理缓存按钮
        this.purgeCacheBtn.addEventListener('click', () => this.handlePurgeCache());
        
        // 更新资源按钮
        this.deployBtn.addEventListener('click', () => this.handleDeploy());
    }

    /**
     * 切换删除模式
     */
    toggleDeleteMode() {
        this.deleteMode = !this.deleteMode;
        
        if (this.deleteMode) {
            // 进入删除模式
            this.deleteModeBtn.disabled = true;
            this.deleteModeBtn.classList.add('active');
            this.deleteActionBar.classList.remove('d-none');
            this.selectedImages = [];
            this.updateSelectedCount();
            
            // 显示悬浮提示
            const floatingTip = document.getElementById('floating-tip');
            floatingTip.classList.remove('d-none');
            
            // 3秒后自动隐藏提示
            setTimeout(() => {
                floatingTip.classList.add('d-none');
            }, 3000);
        } else {
            // 退出删除模式
            this.exitDeleteMode();
        }
        
        // 重新渲染图片，以便应用或移除选中状态
        this.renderImages();
    }
    
    /**
     * 退出删除模式
     */
    exitDeleteMode() {
        this.deleteMode = false;
        this.deleteModeBtn.disabled = false;
        this.deleteModeBtn.classList.remove('active');
        this.deleteActionBar.classList.add('d-none');
        this.selectedImages = [];
        this.renderImages();
    }
    
    /**
     * 更新已选择图片数量
     */
    updateSelectedCount() {
        this.selectedCountEl.textContent = `已选择 ${this.selectedImages.length} 张图片`;
        this.confirmDeleteBtn.disabled = this.selectedImages.length === 0;
    }

    /**
     * 切换图片选中状态
     * @param {Object} image - 图片对象
     */
    toggleImageSelection(image) {
        const index = this.selectedImages.findIndex(img => img.url === image.url);
        
        if (index === -1) {
            // 添加到选中列表
            this.selectedImages.push(image);
        } else {
            // 从选中列表移除
            this.selectedImages.splice(index, 1);
        }
        
        this.updateSelectedCount();
    }

    /**
     * 初始化图片展示
     */
    async init() {
        await this.loadFolders();
        await this.loadImages();
    }

    /**
     * 加载文件夹列表
     * @returns {Promise} 加载完成的Promise
     */
    async loadFolders() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/folders`, {
                headers: auth.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error('加载文件夹失败');
            }

            const data = await response.json();
            this.folders = data.data.folders;
            this.renderFolders();
            return true; // 返回成功标志
        } catch (error) {
            console.error('加载文件夹失败:', error);
            this.showError('加载文件夹失败，请刷新页面重试');
            return false; // 返回失败标志
        }
    }

    /**
     * 渲染文件夹列表
     */
    renderFolders() {
        // 保留主目录选项
        this.foldersList.innerHTML = `
            <a href="#" class="list-group-item list-group-item-action ${this.currentPath === 'frontend' ? 'active' : ''}" 
               data-path="frontend">
               <i class="bi bi-folder-fill"></i> 主目录
            </a>
        `;

        // 为主目录添加点击事件
        const mainFolder = this.foldersList.querySelector('[data-path="frontend"]');
        mainFolder.addEventListener('click', (e) => {
            e.preventDefault();
            this.changeFolder('frontend');
        });

        // 添加其他文件夹
        this.folders.forEach(folder => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = `list-group-item list-group-item-action ${this.currentPath === folder ? 'active' : ''}`;
            item.setAttribute('data-path', folder);
            item.innerHTML = `<i class="bi bi-folder"></i> ${folder}`;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeFolder(folder);
            });
            this.foldersList.appendChild(item);
        });

        // 更新上传对话框中的文件夹选择
        const uploadPathSelect = document.getElementById('upload-path');
        uploadPathSelect.innerHTML = '<option value="frontend">主目录</option>';
        this.folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            uploadPathSelect.appendChild(option);
        });
    }

    /**
     * 切换文件夹
     * @param {string} path - 文件夹路径
     */
    changeFolder(path) {
        this.currentPath = path;
        this.currentPage = 1;
        this.searchQuery = '';
        this.searchInput.value = '';
        
        // 更新导航栏选中状态
        const items = this.foldersList.querySelectorAll('.list-group-item');
        items.forEach(item => {
            if (item.getAttribute('data-path') === path) {
                item.classList.add('active');
                // 更新图标为填充版本
                const icon = item.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-folder-fill';
                }
            } else {
                item.classList.remove('active');
                // 恢复图标为普通版本
                const icon = item.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-folder';
                }
            }
        });

        this.loadImages();
    }

    /**
     * 加载图片列表
     */
    async loadImages() {
        this.showLoading();

        try {
            const queryParams = new URLSearchParams({
                path: this.currentPath,
                page: this.currentPage,
                limit: this.imagesPerPage
            });

            if (this.searchQuery) {
                queryParams.append('search', this.searchQuery);
            }

            const response = await fetch(`${this.apiBaseUrl}/images?${queryParams}`, {
                headers: {
                    ...auth.getAuthHeaders(),
                    'X-Image-Domain': window.imgHostConfig.imageBaseUrl
                },
            });

            if (!response.ok) {
                throw new Error('加载图片失败');
            }

            const data = await response.json();
            this.images = data.data.images;
            this.totalPages = data.data.pagination.total;
            this.renderImages();
            this.renderPagination();
        } catch (error) {
            console.error('加载图片失败:', error);
            this.showError('加载图片失败，请刷新页面重试');
        }
    }

    /**
     * 显示加载中状态
     */
    showLoading() {
        this.imagesContainer.innerHTML = `
            <div class="col-12 loading">
                <div class="spinner-border loading-spinner" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
            </div>
        `;
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        this.imagesContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    ${message}
                </div>
            </div>
        `;
    }

    /**
     * 渲染图片列表
     */
    renderImages() {
        if (this.images.length === 0) {
            this.imagesContainer.innerHTML = `
                <div class="col-12 empty-state">
                    <i class="bi bi-images" style="font-size: 3rem;"></i>
                    <h5 class="mt-3">暂无图片</h5>
                    <p>点击"上传图片"按钮添加图片</p>
                </div>
            `;
            return;
        }

        this.imagesContainer.innerHTML = '';
        
        // 创建一个卡片容器，使用flex布局
        const cardContainer = document.createElement('div');
        cardContainer.className = 'd-flex flex-wrap justify-content-start';
        cardContainer.style.width = '100%';
        this.imagesContainer.appendChild(cardContainer);
        
        this.images.forEach(image => {
            const isSelected = this.selectedImages.some(selected => selected.url === image.url);
            
            const imageCard = document.createElement('div');
            imageCard.className = `image-card ${isSelected ? 'selected' : ''}`;
            
            imageCard.innerHTML = `
                <img src="${image.url}" alt="${image.name}" loading="lazy">
                <div class="card-body">
                    <h5 class="card-title">
                        ${image.name}
                    </h5>
                </div>
            `;

            // 添加事件监听器
            imageCard.addEventListener('click', () => {
                if (this.deleteMode) {
                    // 删除模式下点击图片切换选中状态
                    this.toggleImageSelection(image);
                    imageCard.classList.toggle('selected');
                } else {
                    // 非删除模式下预览图片
                    this.previewImage(image);
                }
            });

            cardContainer.appendChild(imageCard);
        });
    }

    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 文件扩展名
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        if (this.totalPages <= 1) {
            this.pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // 上一页按钮
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="bi bi-chevron-left"></i> 上一页
                </a>
            </li>
        `;

        // 页码按钮
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // 下一页按钮
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    下一页 <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        this.pagination.innerHTML = paginationHTML;

        // 添加事件监听器
        const pageLinks = this.pagination.querySelectorAll('.page-link');
        pageLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                if (page && page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.loadImages();
                }
            });
        });
    }

    /**
     * 预览图片
     * @param {Object} image - 图片对象
     */
    previewImage(image) {
        const previewTitle = document.getElementById('preview-title');
        const previewImage = document.getElementById('preview-image');
        
        previewTitle.textContent = image.name;
        previewImage.src = image.url;
        previewImage.alt = image.name;
        
        this.previewModal.show();
    }

    /**
     * 复制图片URL到剪贴板
     */
    copyImageUrl() {
        const previewImage = document.getElementById('preview-image');
        const url = previewImage.src;
        
        navigator.clipboard.writeText(url)
            .then(() => {
                const copyBtn = document.getElementById('copy-url-btn');
                const originalText = copyBtn.textContent;
                
                copyBtn.innerHTML = '<i class="bi bi-check-lg"></i> 已复制!';
                copyBtn.classList.remove('btn-primary');
                copyBtn.classList.add('btn-success');
                
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> 复制链接';
                    copyBtn.classList.remove('btn-success');
                    copyBtn.classList.add('btn-primary');
                }, 2000);
            })
            .catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            });
    }

    /**
     * 显示删除确认对话框
     */
    showDeleteConfirm() {
        if (this.selectedImages.length === 0) return;
        
        const deleteFilename = document.getElementById('delete-filename');
        deleteFilename.textContent = `${this.selectedImages.length}张图片`;
        
        // 存储要删除的图片路径列表
        this.imagesToDelete = this.selectedImages.map(image => {
            // 构建正确的路径格式
            // 注意：image.url是完整的URL，我们需要提取文件名
            const fileName = image.name;
            
            // 根据当前路径构建正确的路径
            if (this.currentPath === 'frontend') {
                return `frontend/${fileName}`;
            } else if (this.currentPath.startsWith('frontend/')) {
                return `${this.currentPath}/${fileName}`;
            } else {
                return `frontend/${this.currentPath}/${fileName}`;
            }
        });
        
        console.log('准备批量删除图片:', this.imagesToDelete);
        this.deleteModal.show();
    }

    /**
     * 确认删除图片
     */
    async confirmDelete() {
        if (!this.imagesToDelete || this.imagesToDelete.length === 0) return;
        
        try {
            // 显示加载状态
            const deleteConfirmBtn = document.getElementById('delete-confirm');
            const originalBtnText = deleteConfirmBtn.innerHTML;
            deleteConfirmBtn.disabled = true;
            deleteConfirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 删除中...';
            
            // 执行删除操作
            let successCount = 0;
            let errorCount = 0;
            
            for (const imagePath of this.imagesToDelete) {
                try {
                    console.log('删除图片路径:', imagePath);
                    
                    // 构建API URL - 确保使用api前缀
                    // 对路径的每个部分进行编码，但保留斜杠结构
                    const encodedPath = imagePath.split('/').map(part => encodeURIComponent(part)).join('/');
                    const deleteUrl = `${this.apiBaseUrl}/api/images/${encodedPath}`;
                    console.log('删除请求URL:', deleteUrl);
                    
                    const response = await fetch(deleteUrl, {
                        method: 'DELETE',
                        headers: auth.getAuthHeaders(),
                    });

                    let responseText = '';
                    try {
                        responseText = await response.text();
                        console.log('删除响应状态:', response.status, response.statusText);
                        console.log('删除响应内容:', responseText);
                    } catch (e) {
                        console.error('读取响应失败:', e);
                    }
                    
                    if (response.ok) {
                        successCount++;
                    } else {
                        console.error('删除图片失败:', imagePath, responseText);
                        errorCount++;
                    }
                } catch (err) {
                    console.error('删除图片出错:', err);
                    errorCount++;
                }
            }

            // 恢复按钮状态
            deleteConfirmBtn.disabled = false;
            deleteConfirmBtn.innerHTML = originalBtnText;
            
            // 关闭对话框并重新加载图片
            this.deleteModal.hide();
            
            // 退出删除模式
            this.exitDeleteMode();
            
            // 显示结果
            if (errorCount > 0) {
                alert(`删除完成: ${successCount}张成功, ${errorCount}张失败`);
            }
            
            await this.loadImages();
        } catch (error) {
            console.error('删除图片失败:', error);
            alert('删除图片失败，请重试');
            
            // 恢复按钮状态
            const deleteConfirmBtn = document.getElementById('delete-confirm');
            deleteConfirmBtn.disabled = false;
            deleteConfirmBtn.innerHTML = '<i class="bi bi-trash"></i> 删除';
        }
    }

    /**
     * 处理搜索
     */
    handleSearch() {
        this.searchQuery = this.searchInput.value.trim();
        this.currentPage = 1;
        this.loadImages();
    }
    
    /**
     * 处理更新资源
     */
    async handleDeploy() {
        if (!confirm('确定要更新资源吗？这将触发Cloudflare Pages部署。\n\n部署过程可能需要1-2分钟，请耐心等待。')) {
            return;
        }
        
        // 禁用按钮并显示加载状态
        const originalText = this.deployBtn.innerHTML;
        this.deployBtn.disabled = true;
        this.deployBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 部署中...';
        
        try {
            // 触发部署
            const response = await fetch(`${this.apiBaseUrl}/api/deploy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...auth.getAuthHeaders()
                },
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (!result.success) {
                alert(`操作失败: ${result.message || '未知错误'}`);
                // 恢复按钮状态
                this.deployBtn.disabled = false;
                this.deployBtn.innerHTML = originalText;
                return;
            }
            
            // 获取部署ID
            const deploymentId = result.deploymentId;
            if (!deploymentId) {
                alert('部署已触发，但无法获取部署ID，请稍后手动检查');
                // 恢复按钮状态
                this.deployBtn.disabled = false;
                this.deployBtn.innerHTML = originalText;
                return;
            }
            
            // 开始轮询检查部署状态，传入原始按钮文本用于恢复
            await this.pollDeploymentStatus(deploymentId, originalText);
            
        } catch (error) {
            console.error('更新资源出错:', error);
            alert('操作失败，请重试');
            // 恢复按钮状态
            this.deployBtn.disabled = false;
            this.deployBtn.innerHTML = originalText;
        }
    }
    
    /**
     * 轮询检查部署状态
     * @param {string} deploymentId - 部署ID
     * @param {string} originalButtonText - 原始按钮文本
     */
    async pollDeploymentStatus(deploymentId, originalButtonText) {
        const maxAttempts = 30; // 最多检查30次（5分钟）
        let attempts = 0;
        
        const checkStatus = async () => {
            attempts++;
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/deploy-status?deploymentId=${deploymentId}`, {
                    headers: auth.getAuthHeaders()
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || '检查部署状态失败');
                }
                
                console.log(`部署状态检查 (${attempts}/${maxAttempts}):`, result.status);
                
                // 保持按钮文本为"部署中..."，不显示具体状态
                // this.deployBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 部署中... (${result.status})`;
                
                if (result.isCompleted) {
                    // 部署完成
                    alert(`部署已完成！\n\n如果你使用Cloudflare提供的域，图片会立即生效。\n\n如果你使用自定义域并设置了边缘缓存，可能需要点击"清理缓存"。`);
                    // 恢复按钮状态
                    this.deployBtn.disabled = false;
                    this.deployBtn.innerHTML = originalButtonText;
                    return true;
                } else if (result.isFailed) {
                    // 部署失败
                    alert(`部署失败: ${result.message || '未知错误'}`);
                    // 恢复按钮状态
                    this.deployBtn.disabled = false;
                    this.deployBtn.innerHTML = originalButtonText;
                    return true;
                } else if (attempts >= maxAttempts) {
                    // 超时
                    alert('部署检查超时，请稍后手动检查部署状态。\n\n部署可能仍在进行中，请耐心等待。');
                    // 恢复按钮状态
                    this.deployBtn.disabled = false;
                    this.deployBtn.innerHTML = originalButtonText;
                    return true;
                } else {
                    // 继续等待
                    return false;
                }
            } catch (error) {
                console.error('检查部署状态出错:', error);
                
                if (attempts >= maxAttempts) {
                    alert('部署状态检查失败，请稍后手动检查。');
                    // 恢复按钮状态
                    this.deployBtn.disabled = false;
                    this.deployBtn.innerHTML = originalButtonText;
                    return true;
                }
                
                return false;
            }
        };
        
        // 立即检查一次
        if (await checkStatus()) {
            return;
        }
        
        // 每10秒检查一次
        const interval = setInterval(async () => {
            if (await checkStatus()) {
                clearInterval(interval);
            }
        }, 10000);
    }
    
    /**
     * 处理清理缓存
     */
    async handlePurgeCache() {
        if (!confirm('确定要清理缓存吗？\n\n如果你使用Cloudflare提供的域，通常不需要清理缓存，只需点击"更新资源"即可。\n\n如果你设置了自定义域并配置了边缘缓存，可以点击此按钮清理缓存。')) {
            return;
        }
        
        // 禁用按钮并显示加载状态
        const originalText = this.purgeCacheBtn.innerHTML;
        this.purgeCacheBtn.disabled = true;
        this.purgeCacheBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 清理中...';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/purge-cache`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Image-Domain': window.imgHostConfig.imageBaseUrl,
                    ...auth.getAuthHeaders()
                },
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`操作成功: ${result.message || '缓存清理成功！'}\n\n请点击确定，等待页面在5秒后自动刷新（禁用浏览器缓存）\n\n（如果刷新后没效果，请尝试CTRL+F5或手动打开开发者工具，勾选禁用缓存再刷新）`);
                // 设置5秒后强制刷新页面（相当于Ctrl+F5效果）
                setTimeout(() => {
                    // 使用location.reload(true)强制从服务器重新加载页面，不使用缓存
                    window.location.reload(true);
                }, 5000);
            } else {
                // 显示详细的错误信息
                let errorMessage = result.message || '未知错误';
                alert(`操作失败: ${errorMessage}`);
            }
        } catch (error) {
            console.error('清理缓存出错:', error);
            alert('操作失败，请重试');
        } finally {
            // 恢复按钮状态
            this.purgeCacheBtn.disabled = false;
            this.purgeCacheBtn.innerHTML = originalText;
        }
    }
}

// 创建Gallery实例
const gallery = new Gallery(); 