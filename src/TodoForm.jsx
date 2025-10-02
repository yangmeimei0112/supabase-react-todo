import { useState, useEffect } from 'react';
// 匯入路徑修正：TodoForm.jsx 現在和 supabaseClient.js 在同一個 src/ 資料夾下
import { addTask, createAssignments, fetchAllUsers } from './supabaseClient'; 

const priorityOptions = [
    { value: 'low', label: '低 (Low)' },
    { value: 'medium', label: '中 (Medium)' },
    { value: 'high', label: '高 (High)' },
];

const TodoForm = ({ fetchTodos }) => {
    const [taskText, setTaskText] = useState('');
    const [priority, setPriority] = useState('medium'); 
    const [availableUsers, setAvailableUsers] = useState([]); // 所有可指派的使用者
    const [selectedUsers, setSelectedUsers] = useState([]); // 被選中指派的使用者 ID 陣列
    const [loading, setLoading] = useState(false);

    // 獲取所有使用者列表 (用於指派選單)
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const users = await fetchAllUsers();
                setAvailableUsers(users);
            } catch (error) {
                console.error("Failed to load users for assignment:", error);
            }
        };
        loadUsers();
    }, []);

    // 處理使用者多選
    const handleUserChange = (e) => {
        const options = e.target.options;
        const value = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setSelectedUsers(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!taskText.trim()) return;

        setLoading(true);

        try {
            // 1. 新增任務 (傳遞 priority)
            const newTask = await addTask(taskText, priority);
            
            // 2. 如果有選中指派對象，則新增指派紀錄
            if (newTask && selectedUsers.length > 0) {
                // 傳遞任務標題用於通知內容
                await createAssignments(newTask.id, selectedUsers, newTask.task);
            }

            // 重置表單狀態
            setTaskText('');
            setPriority('medium');
            setSelectedUsers([]);
            fetchTodos(); // 重新加載任務列表 (並更新通知計數)
        } catch (error) {
            console.error('Error in creating task and assignments:', error);
            alert('新增任務或指派時發生錯誤！');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
            <input
                type="text"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="輸入新任務內容..."
                required
                style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
                disabled={loading}
            />

            {/* 優先級選擇 */}
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <label style={{ marginRight: '10px', minWidth: '80px' }}>優先級 (Priority):</label>
                <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ padding: '8px', minWidth: '150px' }}
                    disabled={loading}
                >
                    {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* 指派使用者多選 */}
            <div style={{ marginBottom: '15px', display: 'flex' }}>
                <label style={{ marginRight: '10px', minWidth: '80px', marginTop: '5px' }}>指派給 (Assignees):</label>
                <select
                    multiple
                    value={selectedUsers}
                    onChange={handleUserChange}
                    style={{ padding: '8px', minWidth: '200px', height: '100px' }}
                    disabled={loading}
                >
                    {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                            {user.username}
                        </option>
                    ))}
                </select>
                <small style={{ marginLeft: '10px', color: '#666' }}>Ctrl/Cmd + 點擊可多選。</small>
            </div>

            <button type="submit" disabled={!taskText.trim() || loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                {loading ? '新增中...' : '新增任務'}
            </button>
        </form>
    );
};

export default TodoForm;