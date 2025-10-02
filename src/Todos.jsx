import React, { useState, useEffect } from 'react';
// 匯入路徑修正：Todos.jsx 現在和 supabaseClient.js 在同一個 src/ 資料夾下
import { supabase, fetchTasks } from './supabaseClient'; 
// 匯入路徑修正：TodoForm 和 TaskItem 現在和 Todos.jsx 在同一個 src/ 資料夾下
import TodoForm from './TodoForm'; 
import TaskItem from './TaskItem'; 

const Todos = ({ user, checkNotifications }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };

    // 1. 獲取任務列表
    const fetchTodos = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTasks();
            
            // 排序邏輯
            const sortedTasks = data.sort((a, b) => {
                const priorityA = priorityOrder[a.priority] || 4;
                const priorityB = priorityOrder[b.priority] || 4;
                
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            
            setTasks(sortedTasks);
            checkNotifications(); 

        } catch (err) {
            console.error("Failed to fetch todos:", err);
            setError("無法載入任務列表，請檢查網路或權限。");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTodos();
        }
    }, [user]);

    // 2. 實時訂閱 (Realtime Subscription)
    useEffect(() => {
        if (!user) return;
        
        const tasksSubscription = supabase
            .channel('tasks_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                (payload) => {
                    console.log('Task change received:', payload);
                    fetchTodos(); 
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(tasksSubscription);
        };
    }, [user]); 

    if (loading) {
        return <div style={{ padding: '20px' }}>載入任務中...</div>;
    }
    
    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>錯誤：{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h2>我的任務列表</h2>
            
            {/* 任務新增表單 (TodoForm) */}
            <TodoForm fetchTodos={fetchTodos} /> 

            {/* 任務列表 */}
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {tasks.length > 0 ? (
                    tasks.map(task => (
                        <TaskItem
                            key={task.id} 
                            task={task} 
                            fetchTodos={fetchTodos} 
                        />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', color: '#666' }}>
                        您沒有任務，新增一個吧！
                    </p>
                )}
            </ul>
        </div>
    );
};

export default Todos;