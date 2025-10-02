import React, { useState, useEffect } from 'react';
// 匯入路徑修正：TaskItem.jsx 現在和 supabaseClient.js 在同一個 src/ 資料夾下
import { 
    supabase, 
    deleteTask, 
    toggleTaskComplete, 
    fetchAssignmentsByTask, 
    updateAssignmentProgress 
} from './supabaseClient';

// 優先級樣式映射
const priorityStyles = {
    low: { background: '#d4edda', color: '#155724' },      
    medium: { background: '#fff3cd', color: '#856404' },   
    high: { background: '#f8d7da', color: '#721c24' },     
};

const TaskItem = ({ task, fetchTodos }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [myAssignment, setMyAssignment] = useState(null); 
    const [currentProgress, setCurrentProgress] = useState(0);

    // 獲取當前登入用戶的 ID
    const currentUserId = supabase.auth.getSession().data.session?.user?.id;
    const isTaskCreator = currentUserId === task.user_id; 

    // 1. 獲取指派紀錄
    useEffect(() => {
        const loadAssignments = async () => {
            if (!task.id) return;
            try {
                const data = await fetchAssignmentsByTask(task.id);
                setAssignments(data);
                
                const selfAssignment = data.find(a => a.user_id === currentUserId);
                if (selfAssignment) {
                    setMyAssignment(selfAssignment);
                    setCurrentProgress(selfAssignment.progress);
                } else {
                    setMyAssignment(null);
                    setCurrentProgress(0);
                }
            } catch (error) {
                console.error("Failed to load assignments for task:", error);
            }
        };

        loadAssignments();
    }, [task.id, currentUserId]); 

    // 處理任務刪除 (僅限創建者)
    const handleDelete = async () => {
        if (!isTaskCreator || !window.confirm("確定要刪除這個任務嗎？所有指派紀錄也會被刪除。")) return;
        setIsDeleting(true);
        try {
            await deleteTask(task.id);
            fetchTodos();
        } catch (error) {
            alert('刪除失敗，請檢查權限 (RLS)。');
        } finally {
            setIsDeleting(false);
        }
    };

    // 處理任務完成狀態切換 (僅限創建者)
    const handleToggle = async (e) => {
        if (!isTaskCreator) return;
        const newStatus = e.target.checked;
        try {
            await toggleTaskComplete(task.id, newStatus);
            fetchTodos();
        } catch (error) {
            alert('更新狀態失敗。');
        }
    };

    // 處理進度條更新 (僅對被指派者開放)
    const handleProgressChange = async (e) => {
        const newProgress = parseInt(e.target.value, 10);
        setCurrentProgress(newProgress);
        
        if (myAssignment) {
            try {
                await updateAssignmentProgress(myAssignment.id, newProgress);
                setMyAssignment(prev => ({ ...prev, progress: newProgress })); 
            } catch (error) {
                console.error('更新進度失敗:', error);
                alert('更新進度失敗，請檢查權限。');
                setCurrentProgress(myAssignment.progress); 
            }
        }
    };

    const isAssigned = !!myAssignment; 
    const priorityStyle = priorityStyles[task.priority] || priorityStyles.medium;

    return (
        <li style={{ 
            display: 'flex', 
            flexDirection: 'column',
            padding: '15px', 
            marginBottom: '10px', 
            border: `1px solid ${task.is_complete ? '#d4edda' : '#ccc'}`,
            borderRadius: '5px',
            opacity: task.is_complete ? 0.8 : 1,
            backgroundColor: task.is_complete ? '#f1f1f1' : 'white'
        }}>
            {/* 任務標題和優先級 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flexGrow: 1, textDecoration: task.is_complete ? 'line-through' : 'none' }}>
                    <strong>{task.task}</strong>
                </div>
                
                <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '3px', 
                    fontSize: '12px',
                    marginLeft: '10px',
                    ...priorityStyle
                }}>
                    優先級: {task.priority ? task.priority.toUpperCase() : 'N/A'}
                </span>
            </div>

            {/* 指派者列表 */}
            {assignments.length > 0 && (
                <small style={{ color: '#666', marginBottom: '10px' }}>
                    指派給: {assignments.map(a => a.profiles?.username || 'N/A').join(', ')} (創建者: {isTaskCreator ? '我' : '他人'})
                </small>
            )}

            {/* 進度條 (僅對被指派者顯示) */}
            {isAssigned && (
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                        我的進度: {currentProgress}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentProgress}
                        onChange={handleProgressChange}
                        style={{ width: '100%', cursor: 'pointer' }}
                        disabled={task.is_complete || isDeleting}
                    />
                </div>
            )}


            {/* 操作區域：切換完成狀態、刪除 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                
                {/* 只有任務創建者可以操作完成狀態 */}
                {isTaskCreator && (
                    <label style={{ marginRight: '10px' }}>
                        <input
                            type="checkbox"
                            checked={task.is_complete}
                            onChange={handleToggle}
                            disabled={isDeleting}
                        />
                        完成
                    </label>
                )}
                
                {/* 只有任務創建者可以刪除 */}
                {isTaskCreator && ( 
                    <button 
                        onClick={handleDelete} 
                        disabled={isDeleting} 
                        style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                    >
                        {isDeleting ? '刪除中...' : '刪除'}
                    </button>
                )}
            </div>
        </li>
    );
};

export default TaskItem;