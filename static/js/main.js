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

    renderDashboardCharts();
});

function renderDashboardCharts() {
    const chartContainers = document.querySelectorAll('.chart-shell[data-chart-points]');
    chartContainers.forEach(container => {
        let points = [];
        try {
            points = JSON.parse(container.dataset.chartPoints || '[]');
        } catch (error) {
            console.error('Failed to parse chart data', error);
            return;
        }

        if (!points.length) {
            container.innerHTML = '<p class="text-muted">No chart data available.</p>';
            return;
        }

        if (container.dataset.chartKind === 'bar') {
            container.innerHTML = renderBarChart(points);
        } else {
            container.innerHTML = renderLineChart(points);
        }
    });
}

function renderBarChart(points) {
    const maxValue = Math.max(...points.map(point => point.value || 0), 1);
    const bars = points.map(point => {
        const height = Math.max(8, Math.round(((point.value || 0) / maxValue) * 120));
        return `
            <div class="chart-bar-group">
                <span class="chart-bar-value">${point.value}</span>
                <div class="chart-bar" style="height:${height}px"></div>
                <span class="chart-label">${point.label}</span>
            </div>
        `;
    }).join('');

    return `<div class="bar-chart">${bars}</div>`;
}

function renderLineChart(points) {
    const width = 520;
    const height = 180;
    const maxValue = Math.max(...points.map(point => point.value || 0), 1);
    const stepX = points.length > 1 ? width / (points.length - 1) : width;
    const coordinates = points.map((point, index) => {
        const x = index * stepX;
        const y = height - ((point.value || 0) / maxValue) * (height - 24) - 12;
        return { x, y, label: point.label, value: point.value || 0 };
    });

    const polyline = coordinates.map(point => `${point.x},${point.y}`).join(' ');
    const dots = coordinates.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4"></circle>`).join('');
    const labels = coordinates.map(point => `<text x="${point.x}" y="${height}" text-anchor="middle">${point.label}</text>`).join('');
    const values = coordinates.map(point => `<text x="${point.x}" y="${Math.max(point.y - 10, 12)}" text-anchor="middle">${point.value}</text>`).join('');

    return `
        <svg class="line-chart" viewBox="0 0 ${width} ${height + 20}" preserveAspectRatio="none" role="img" aria-label="Trend chart">
            <polyline fill="none" points="${polyline}"></polyline>
            ${dots}
            ${values}
            ${labels}
        </svg>
    `;
}

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
window.renderDashboardCharts = renderDashboardCharts;
