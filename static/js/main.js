// 主要 JavaScript 文件

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 裝修行業信貸系統已載入');
    
    // 自動關閉閃爍消息
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(msg => {
        setTimeout(() => {
            msg.style.transition = 'opacity 0.5s';
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 500);
        }, 5000);
    });
    
    // 表單驗證
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = 'var(--danger-color)';
                } else {
                    field.style.borderColor = 'var(--border-color)';
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                alert('請填寫所有必填欄位');
            }
        });
    });
    
    // 數字格式化
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value) {
                const value = parseFloat(this.value);
                if (isNaN(value)) {
                    this.value = '';
                }
            }
        });
    });
});

// AJAX 請求輔助函數
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || '請求失敗');
        }
        
        return result;
    } catch (error) {
        console.error('API 請求錯誤:', error);
        throw error;
    }
}

// 計算信貸評分
async function calculateCreditScore(companyId) {
    try {
        const result = await apiRequest(`/api/companies/${companyId}/score`, 'POST');
        
        if (result.success) {
            showNotification(`信貸評分已計算：${result.data.credit_score} 分 (${result.data.credit_grade}級)`, 'success');
            setTimeout(() => location.reload(), 1000);
        }
    } catch (error) {
        showNotification(`計算失敗：${error.message}`, 'error');
    }
}

// 顯示通知
function showNotification(message, type = 'info') {
    const container = document.querySelector('.flash-messages') || createFlashContainer();
    
    const notification = document.createElement('div');
    notification.className = `flash-message flash-${type}`;
    notification.innerHTML = `
        ${message}
        <button class="flash-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // 自動關閉
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// 創建閃爍消息容器
function createFlashContainer() {
    const container = document.createElement('div');
    container.className = 'flash-messages';
    document.querySelector('main .container').prepend(container);
    return container;
}

// 格式化金額
function formatMoney(amount) {
    return new Intl.NumberFormat('zh-HK', {
        style: 'currency',
        currency: 'HKD'
    }).format(amount);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 導出函數供全局使用
window.calculateCreditScore = calculateCreditScore;
window.showNotification = showNotification;
window.formatMoney = formatMoney;
window.formatDate = formatDate;
window.apiRequest = apiRequest;
