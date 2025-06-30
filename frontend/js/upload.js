/**
 * 图片上传相关功能
 */
class ImageUploader {
    constructor() {
        this.uploadBtn = document.getElementById('upload-btn');
        this.uploadModal = new bootstrap.Modal(document.getElementById('upload-modal'));
        this.uploadForm = document.getElementById('upload-form');
        this.uploadSubmit = document.getElementById('upload-submit');
        this.uploadProgress = document.getElementById('upload-progress');
        this.uploadProgressBar = this.uploadProgress.querySelector('.progress-bar');
        this.createFolderCheckbox = document.getElementById('create-folder');
        this.newFolderGroup = document.getElementById('new-folder-group');
        
        // API基础URL
        this.apiBaseUrl = auth.getApiBaseUrl();
        
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.showUploadModal());
        this.uploadSubmit.addEventListener('click', () => this.handleUpload());
        this.createFolderCheckbox.addEventListener('change', () => this.toggleNewFolderInput());
        
        // 监听模态框关闭事件，重置表单
        document.getElementById('upload-modal').addEventListener('hidden.bs.modal', () => {
            this.resetUploadForm();
        });
    }

    /**
     * 显示上传对话框
     */
    showUploadModal() {
        this.uploadModal.show();
    }

    /**
     * 切换新文件夹输入框显示状态
     */
    toggleNewFolderInput() {
        if (this.createFolderCheckbox.checked) {
            this.newFolderGroup.classList.remove('d-none');
        } else {
            this.newFolderGroup.classList.add('d-none');
        }
    }

    /**
     * 重置上传表单
     */
    resetUploadForm() {
        this.uploadForm.reset();
        this.uploadProgress.classList.add('d-none');
        this.uploadProgressBar.style.width = '0%';
        this.newFolderGroup.classList.add('d-none');
        this.uploadSubmit.disabled = false;
    }

    /**
     * 处理图片上传
     */
    async handleUpload() {
        const files = document.getElementById('image-files').files;
        if (files.length === 0) {
            alert('请选择要上传的图片');
            return;
        }

        // 获取上传路径
        let path = document.getElementById('upload-path').value;
        
        // 如果选择创建新文件夹
        if (this.createFolderCheckbox.checked) {
            const newFolderName = document.getElementById('new-folder-name').value.trim();
            if (!newFolderName) {
                alert('请输入新文件夹名称');
                return;
            }
            path = newFolderName;
        }

        // 显示进度条
        this.uploadProgress.classList.remove('d-none');
        this.uploadSubmit.disabled = true;

        // 上传所有文件
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // 更新进度
                const progress = Math.round((i / files.length) * 100);
                this.updateProgress(progress);
                
                await this.uploadFile(file, path);
            }

            // 完成上传
            this.updateProgress(100);
            
            setTimeout(() => {
                this.uploadModal.hide();
                
                // 刷新图片列表和文件夹列表
                if (window.gallery) {
                    // 先加载文件夹列表，再加载图片列表
                    window.gallery.loadFolders().then(() => {
                        // 如果是新创建的文件夹，切换到该文件夹
                        if (this.createFolderCheckbox.checked) {
                            const newFolderName = document.getElementById('new-folder-name').value.trim();
                            window.gallery.changeFolder(newFolderName);
                        } else {
                            window.gallery.loadImages();
                        }
                    });
                }
            }, 500);
        } catch (error) {
            console.error('上传失败:', error);
            alert('上传失败: ' + error.message);
            this.uploadSubmit.disabled = false;
        }
    }

    /**
     * 上传单个文件
     * @param {File} file - 文件对象
     * @param {string} path - 上传路径
     */
    async uploadFile(file, path) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        formData.append('create_folder', this.createFolderCheckbox.checked);

        // 添加图片域名到请求头
        const headers = auth.getAuthHeaders();
        
        const response = await fetch(`${this.apiBaseUrl}/upload`, {
            method: 'POST',
            headers: {
                ...headers,
                'X-Image-Domain': window.imgHostConfig.imageBaseUrl
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '上传失败');
        }

        return await response.json();
    }

    /**
     * 更新上传进度
     * @param {number} percent - 进度百分比
     */
    updateProgress(percent) {
        this.uploadProgressBar.style.width = `${percent}%`;
        this.uploadProgressBar.setAttribute('aria-valuenow', percent);
    }
}

// 创建ImageUploader实例
const imageUploader = new ImageUploader(); 