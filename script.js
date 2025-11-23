// Configuration
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxA2IbxfESISZMflkTQTvxMkCwFJwK2H3qjhrh9DC92uAnPI-meFNt2KPu9lRWTaJ_9Ag/exec';

// DOM Elements
let currentUser = null;
let currentHeaders = [];
let currentRows = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing page...');
    
    if (document.getElementById('loginForm')) {
        console.log('Initializing login page');
        initLoginPage();
    } else if (document.getElementById('inventoryTable')) {
        console.log('Initializing data manager page');
        initDataManagerPage();
    }
});

// Test connection using JSONP to avoid CORS
async function testWebAppConnection() {
    return new Promise((resolve) => {
        console.log('🔍 Testing connection...');
        
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        const script = document.createElement('script');
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            
            console.log('Connection test result:', data);
            if (data.success) {
                console.log('✅ Web app is working!');
                showMessage('Connected to server!', 'success');
                resolve(true);
            } else {
                console.error('❌ Web app test failed:', data.message);
                showMessage('Server error: ' + data.message, 'error');
                resolve(false);
            }
        };
        
        script.src = `${APP_SCRIPT_URL}?action=test&callback=${callbackName}`;
        document.body.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                console.error('❌ Connection timeout');
                showMessage('Connection timeout', 'error');
                resolve(false);
            }
        }, 5000);
    });
}

// Login Page Functions
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        console.log('👤 Login attempt:', username);
        
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        try {
            showMessage('Connecting to server...', 'success');
            
            const canConnect = await testWebAppConnection();
            if (!canConnect) {
                showMessage('Cannot connect to server', 'error');
                return;
            }
            
            showMessage('Verifying credentials...', 'success');
            await loginWithJSONP(username, password);
            
        } catch (error) {
            console.error('❌ Login error:', error);
            showMessage('Login failed: ' + error.message, 'error');
        }
    });
}

// Login using JSONP
function loginWithJSONP(username, password) {
    return new Promise((resolve, reject) => {
        const callbackName = 'login_callback_' + Math.round(100000 * Math.random());
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            
            console.log('Login response:', response);
            
            if (response.success) {
                console.log('✅ Login successful!');
                showMessage('Login successful! Redirecting...', 'success');
                
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                
                setTimeout(() => {
                    window.location.href = 'data-manager.html';
                }, 1000);
                
                resolve(response);
            } else {
                console.error('❌ Login failed:', response.message);
                showMessage(response.message, 'error');
                reject(new Error(response.message));
            }
        };
        
        const script = document.createElement('script');
        const loginData = JSON.stringify({ username, password });
        
        script.src = `${APP_SCRIPT_URL}?action=login&data=${encodeURIComponent(loginData)}&callback=${callbackName}`;
        
        const timeoutId = setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                showMessage('Login timeout - please try again', 'error');
                reject(new Error('Login timeout'));
            }
        }, 10000);
        
        const originalCallback = window[callbackName];
        window[callbackName] = function(data) {
            clearTimeout(timeoutId);
            originalCallback(data);
        };
        
        document.body.appendChild(script);
    });
}

// Data Manager Page Functions
function initDataManagerPage() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        showMessage('Please login first', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        console.log('User logged in:', currentUser);
        
        if (!currentUser.username || !currentUser.customerName) {
            throw new Error('Invalid user data');
        }
        
        document.getElementById('userDisplay').textContent = `Welcome, ${currentUser.customerName}`;
        
        // Setup event listeners
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('addRowBtn').addEventListener('click', addNewRow);
        document.getElementById('addColumnBtn').addEventListener('click', showAddColumnModal);
        document.getElementById('saveDataBtn').addEventListener('click', saveAllData);
        document.getElementById('calculateProfitBtn').addEventListener('click', calculateTotalProfit);
        document.getElementById('searchInput').addEventListener('input', filterTable);
        
        // Modal setup
        const columnModal = document.getElementById('columnModal');
        const closeBtn = columnModal.querySelector('.close');
        
        closeBtn.addEventListener('click', () => columnModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === columnModal) columnModal.style.display = 'none';
        });
        
        document.getElementById('columnForm').addEventListener('submit', addNewColumn);
        
        // Load inventory
        loadInventory();
        
    } catch (error) {
        console.error('Data manager init error:', error);
        showMessage('Error loading user data. Please login again.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// Load inventory with dynamic columns
async function loadInventory() {
    return new Promise((resolve) => {
        if (!currentUser) {
            displayInventory([], []);
            resolve();
            return;
        }
        
        const callbackName = 'inventory_callback_' + Math.round(100000 * Math.random());
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            
            if (response.success) {
                console.log('✅ Inventory loaded:', response);
                currentHeaders = response.headers || ['Item Name', 'Cost Price', 'Sell Price', 'Quantity'];
                currentRows = response.rows || [];
                displayInventory(currentHeaders, currentRows);
                showMessage('Inventory loaded successfully', 'success');
            } else {
                console.error('❌ Inventory load failed:', response.message);
                currentHeaders = ['Item Name', 'Cost Price', 'Sell Price', 'Quantity'];
                currentRows = [];
                displayInventory(currentHeaders, currentRows);
                showMessage('Error loading inventory: ' + response.message, 'error');
            }
            resolve();
        };
        
        const script = document.createElement('script');
        script.src = `${APP_SCRIPT_URL}?action=getInventory&username=${currentUser.username}&callback=${callbackName}`;
        document.body.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                console.error('❌ Inventory load timeout');
                currentHeaders = ['Item Name', 'Cost Price', 'Sell Price', 'Quantity'];
                currentRows = [];
                displayInventory(currentHeaders, currentRows);
                showMessage('Inventory load timeout', 'error');
                resolve();
            }
        }, 10000);
    });
}

// Display inventory with editable table
function displayInventory(headers, rows) {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('inventoryBody');
    
    if (!thead || !tbody) return;
    
    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    
    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.className = 'editable-header';
        th.innerHTML = `
            <div class="header-content">
                <span>${header}</span>
                <div class="header-actions">
                    <button class="small-btn edit-header-btn" onclick="editHeader(${index})">✏️</button>
                    ${index > 3 ? `<button class="small-btn delete-header-btn" onclick="deleteColumn(${index})">🗑️</button>` : ''}
                </div>
            </div>
        `;
        headerRow.appendChild(th);
    });
    
    // Add actions column header
    const actionsTh = document.createElement('th');
    actionsTh.textContent = 'Actions';
    actionsTh.style.minWidth = '120px';
    headerRow.appendChild(actionsTh);
    
    thead.appendChild(headerRow);
    
    // Create data rows
    rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            td.className = 'editable-cell';
            const value = row[header] || '';
            td.innerHTML = `
                <input type="text" value="${value}" onchange="updateCellValue(${rowIndex}, '${header}', this.value)">
                <div class="cell-actions">
                    <button class="small-btn" onclick="this.parentElement.previousElementSibling.focus()">✏️</button>
                </div>
            `;
            tr.appendChild(td);
        });
        
        // Add actions column
        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        actionsTd.innerHTML = `
            <button class="btn-danger small-btn" onclick="deleteRow(${rowIndex})">Delete</button>
            <button class="btn-warning small-btn" onclick="duplicateRow(${rowIndex})">Duplicate</button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    // Add empty row if no data
    if (rows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${headers.length + 1}" style="text-align: center; padding: 20px;">No items found. Add your first item!</td>`;
        tbody.appendChild(tr);
    }
}

// Add new row
function addNewRow() {
    const newRow = {};
    currentHeaders.forEach(header => {
        newRow[header] = '';
    });
    currentRows.push(newRow);
    displayInventory(currentHeaders, currentRows);
    showMessage('New row added', 'success');
}

// Delete row
function deleteRow(rowIndex) {
    if (confirm('Are you sure you want to delete this row?')) {
        currentRows.splice(rowIndex, 1);
        displayInventory(currentHeaders, currentRows);
        showMessage('Row deleted', 'success');
    }
}

// Duplicate row
function duplicateRow(rowIndex) {
    const originalRow = currentRows[rowIndex];
    const duplicatedRow = JSON.parse(JSON.stringify(originalRow));
    currentRows.splice(rowIndex + 1, 0, duplicatedRow);
    displayInventory(currentHeaders, currentRows);
    showMessage('Row duplicated', 'success');
}

// Update cell value
function updateCellValue(rowIndex, header, value) {
    if (currentRows[rowIndex]) {
        currentRows[rowIndex][header] = value;
    }
}

// Show add column modal
function showAddColumnModal() {
    const modal = document.getElementById('columnModal');
    document.getElementById('columnName').value = '';
    modal.style.display = 'block';
}

// Add new column
async function addNewColumn(e) {
    e.preventDefault();
    
    const columnName = document.getElementById('columnName').value.trim();
    
    if (!columnName) {
        showMessage('Please enter a column name', 'error');
        return;
    }
    
    if (currentHeaders.includes(columnName)) {
        showMessage('Column name already exists', 'error');
        return;
    }
    
    try {
        showMessage('Adding column...', 'success');
        
        // Add column locally
        currentHeaders.push(columnName);
        
        // Add empty values for existing rows
        currentRows.forEach(row => {
            row[columnName] = '';
        });
        
        // Update display
        displayInventory(currentHeaders, currentRows);
        
        // Save to server
        await saveAllData();
        
        const modal = document.getElementById('columnModal');
        modal.style.display = 'none';
        
        showMessage(`Column "${columnName}" added successfully`, 'success');
        
    } catch (error) {
        console.error('Add column error:', error);
        showMessage('Error adding column: ' + error.message, 'error');
    }
}

// Edit header
function editHeader(headerIndex) {
    const newHeaderName = prompt('Enter new header name:', currentHeaders[headerIndex]);
    
    if (newHeaderName && newHeaderName.trim() !== '') {
        const oldHeaderName = currentHeaders[headerIndex];
        currentHeaders[headerIndex] = newHeaderName.trim();
        
        // Update all rows with new header name
        currentRows.forEach(row => {
            if (row[oldHeaderName] !== undefined) {
                row[newHeaderName.trim()] = row[oldHeaderName];
                delete row[oldHeaderName];
            }
        });
        
        displayInventory(currentHeaders, currentRows);
        showMessage('Header updated', 'success');
    }
}

// Delete column
async function deleteColumn(columnIndex) {
    if (columnIndex < 4) {
        showMessage('Cannot delete required columns (Item Name, Cost Price, Sell Price, Quantity)', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to delete this column? All data in this column will be lost.')) {
        const columnName = currentHeaders[columnIndex];
        
        // Remove column locally
        currentHeaders.splice(columnIndex, 1);
        
        // Remove column data from all rows
        currentRows.forEach(row => {
            delete row[columnName];
        });
        
        // Update display
        displayInventory(currentHeaders, currentRows);
        
        // Save to server
        await saveAllData();
        
        showMessage(`Column "${columnName}" deleted`, 'success');
    }
}

// Save all data to server
async function saveAllData() {
    try {
        showMessage('Saving data...', 'success');
        
        await saveInventoryWithJSONP(currentHeaders, currentRows);
        
    } catch (error) {
        console.error('Save error:', error);
        showMessage('Save failed: ' + error.message, 'error');
    }
}

function saveInventoryWithJSONP(headers, rows) {
    return new Promise((resolve, reject) => {
        const callbackName = 'save_callback_' + Math.round(100000 * Math.random());
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            
            if (response.success) {
                showMessage('All changes saved successfully!', 'success');
                resolve(response);
            } else {
                showMessage('Save failed: ' + response.message, 'error');
                reject(new Error(response.message));
            }
        };
        
        const saveData = {
            username: currentUser.username,
            headers: headers,
            rows: rows
        };
        
        const script = document.createElement('script');
        script.src = `${APP_SCRIPT_URL}?action=saveInventory&data=${encodeURIComponent(JSON.stringify(saveData))}&callback=${callbackName}`;
        document.body.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                showMessage('Save timeout', 'error');
                reject(new Error('Save timeout'));
            }
        }, 10000);
    });
}

// Filter table based on search input
function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const tbody = document.getElementById('inventoryBody');
    const rows = tbody.getElementsByTagName('tr');
    
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let cell of cells) {
            const input = cell.querySelector('input');
            if (input && input.value.toLowerCase().includes(searchTerm)) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}

// Calculate total profit
async function calculateTotalProfit() {
    try {
        showMessage('Calculating profit...', 'success');
        
        await calculateProfitWithJSONP();
        
    } catch (error) {
        console.error('Profit calculation error:', error);
        showMessage('Error calculating profit', 'error');
    }
}

function calculateProfitWithJSONP() {
    return new Promise((resolve, reject) => {
        const callbackName = 'profit_callback_' + Math.round(100000 * Math.random());
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            
            if (response.success) {
                const profitSummary = document.getElementById('profitSummary');
                profitSummary.innerHTML = `
                    <h3>Profit Summary</h3>
                    <p><strong>Total Profit:</strong> $${response.totalProfit.toFixed(2)}</p>
                    <p><strong>Total Items:</strong> ${response.totalItems}</p>
                `;
                showMessage('Profit calculated!', 'success');
                resolve(response);
            } else {
                showMessage('Profit calculation failed: ' + response.message, 'error');
                reject(new Error(response.message));
            }
        };
        
        const script = document.createElement('script');
        script.src = `${APP_SCRIPT_URL}?action=calculateProfit&username=${currentUser.username}&callback=${callbackName}`;
        document.body.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                showMessage('Profit calculation timeout', 'error');
                reject(new Error('Calculation timeout'));
            }
        }, 10000);
    });
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        showMessage('Logging out...', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
    }
}

// Utility function to show messages
function showMessage(message, type) {
    console.log(`💬 ${type}:`, message);
    
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}
