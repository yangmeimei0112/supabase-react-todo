import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import TaskItem from './TaskItem'; 
import { useUser } from './UserContext';

function Account({ session }) {
  // 任務相關狀態
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all'); 
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // 用戶 Profile 相關狀態
  const [username, setUsername] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  
  // 應用程式載入和錯誤狀態
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const { getAllProfiles, loading: profilesLoading } = useUser();
  const allUsers = getAllProfiles();
  
  const isAnon = !session;
  const user = session?.user;
  
  // *** 關鍵新增：穩定獲取當前用戶ID，用於傳遞給 TaskItem ***
  const currentUserId = user?.id; 

  // 1. 獲取當前用戶的 Profile (名稱)
  useEffect(() => {
    if (!user) return; // 訪客模式跳過

    async function getProfile() {
      setProfileLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`username`)
        .eq('id', user.id)
        .single(); // 預期只會有一行

      if (error) {
        console.error('Error fetching profile:', error.message);
        if (error.code !== 'PGRST116') { 
            setUsername(`錯誤: ${error.message}`);
        } else {
            setUsername(''); 
        }
      } else if (data) {
        setUsername(data.username);
      }
      setProfileLoading(false);
    }
    
    getProfile();
  }, [user]);

  // 2. 處理更新用戶名稱
  const updateProfile = useCallback(async (e) => {
    e.preventDefault();
    if (!user || !username.trim()) return;

    try {
      setProfileLoading(true);
      
      const updates = {
        id: user.id,
        username: username.trim(),
        updated_at: new Date().toISOString(),
      };

      // 使用 upsert 來插入或更新 Profile
      const { error } = await supabase.from('profiles').upsert(updates);
      
      if (error) throw error;
      
      alert('用戶名稱更新成功!');
    } catch (error) {
      alert(`更新失敗: ${error.message}`);
    } finally {
      setProfileLoading(false);
    }
  }, [user, username]);

  // 3. 獲取任務列表
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error.message);
      setErrorMsg('無法載入工作事項清單。');
    } else {
      setTasks(data);
      setErrorMsg('');
    }
    setLoading(false);
  }, []);

  // 4. Realtime 訂閱 (實時更新)
  useEffect(() => {
    fetchTasks();

    const taskChannel = supabase.channel('public:tasks');

    const handleRealtimeChange = (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      setTasks(prevTasks => {
        let newTasks = [...prevTasks];

        switch (eventType) {
          case 'INSERT':
            return [newRecord, ...newTasks.filter(t => t.id !== newRecord.id)];
          case 'UPDATE':
            return newTasks.map(t => (t.id === newRecord.id ? { ...t, ...newRecord } : t));
          case 'DELETE':
            return newTasks.filter(t => t.id !== oldRecord.id);
          default:
            return newTasks;
        }
      });
    };

    taskChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleRealtimeChange);
    
    taskChannel.subscribe();

    return () => {
        supabase.removeChannel(taskChannel);
    };
  }, [fetchTasks]);

  // 5. 處理新增任務
  const handleAddTask = useCallback(async (e) => {
    e.preventDefault();
    if (newTaskTitle.trim() === '') return;
    if (isAnon) {
      setErrorMsg('訪客模式下無法新增工作事項，請登入。');
      return;
    }

    setErrorMsg('');
    setNewTaskTitle(''); 

    const { error } = await supabase
      .from('tasks')
      .insert([
        { 
            title: newTaskTitle.trim(),
            // user_id 會由資料庫的 auth.uid() 預設值自動填入
        }
      ]);

    if (error) {
      console.error('Error adding task:', error.message);
      setErrorMsg('新增工作事項失敗：' + error.message);
      setNewTaskTitle(newTaskTitle); 
    }
  }, [newTaskTitle, isAnon]);

  // 6. 篩選任務列表
  const filteredTasks = tasks.filter(task => {
    const progress = task.progress_perc || 0; 
    switch (filter) {
      case 'active':
        return progress < 100;
      case 'completed':
        return progress === 100;
      case 'assigned':
        return !isAnon && user && task.assigned_to_user === user.id;
      case 'all':
      default:
        return true;
    }
  });


  // 渲染組件
  return (
    <div className="account-container">
      <h1>協作工作事項看板</h1>
      
      {/* 登入後才顯示 Profile 編輯區塊 */}
      {session && !isAnon && (
        <div className="profile-editor">
            <h2>我的檔案</h2>
            <form onSubmit={updateProfile} className="row" style={{ gap: '10px' }}>
                <input
                    type="text"
                    required
                    value={username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="請輸入您的用戶名稱"
                    disabled={profileLoading}
                    className="input-title"
                />
                <button type="submit" className="button primary" disabled={profileLoading || !username.trim()}>
                    {profileLoading ? '更新中...' : '更新名稱'}
                </button>
            </form>
        </div>
      )}

      {/* 錯誤訊息提示 */}
      {errorMsg && <div className="error-message">{errorMsg}</div>}
      {loading || profilesLoading ? <p>載入中...</p> : (
        <>
            {/* 新增任務表單 */}
            <form onSubmit={handleAddTask} className="task-form">
              <input
                type="text"
                className="input-title"
                placeholder={isAnon ? "登入後才能新增工作事項" : "新增工作事項標題..."}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                disabled={isAnon}
                required
              />
              <button type="submit" className="button primary" disabled={isAnon}>
                {isAnon ? '請登入' : '新增'}
              </button>
            </form>

            {/* 篩選器 */}
            <div className="filter-buttons row flex-center">
              <button
                className={`button secondary ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                全部 ({tasks.length})
              </button>
              <button
                className={`button secondary ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                進行中 ({tasks.filter(t => (t.progress_perc || 0) < 100).length})
              </button>
              <button
                className={`button secondary ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => setFilter('completed')}
              >
                已完成 ({tasks.filter(t => (t.progress_perc || 0) === 100).length})
              </button>
              {!isAnon && (
                <button
                  className={`button secondary ${filter === 'assigned' ? 'active' : ''}`}
                  onClick={() => setFilter('assigned')}
                >
                  指派給我
                </button>
              )}
            </div>

            {/* 任務列表 */}
            <div className="task-list-container">
              {filteredTasks.length === 0 ? (
                <p className="no-tasks">目前沒有符合篩選條件的工作事項。</p>
              ) : (
                <div className="task-list">
                  {filteredTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      isAnon={isAnon} 
                      allUsers={allUsers}
                      // *** 關鍵傳遞：穩定傳遞當前用戶 ID ***
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </div>
        </>
      )}
    </div>
  );
}

export default Account;