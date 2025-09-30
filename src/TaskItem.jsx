import React, { useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useUser } from './UserContext';

// 進度選項
const progressOptions = [0, 25, 50, 75, 100];

// *** 關鍵接收：從 props 接收 currentUserId ***
function TaskItem({ task, isAnon, allUsers, currentUserId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(task.title);
  const [newDescription, setNewDescription] = useState(task.description || '');
  const [newAssignedTo, setNewAssignedTo] = useState(task.assigned_to_user || '');
  const [isError, setIsError] = useState(false);
  
  const { getProfile } = useUser();
  const creatorProfile = getProfile(task.user_id);
  const assignedProfile = getProfile(task.assigned_to_user);
  
  // 檢查當前用戶是否有權限編輯/刪除 (只能編輯/刪除自己的任務)
  // *** 關鍵判斷：直接使用傳遞的 ID 進行比較 ***
  const canEdit = !isAnon && currentUserId && (currentUserId === task.user_id); 

  // 處理更新進度百分比
  const handleProgressChange = useCallback(async (newProgress) => {
    if (!canEdit) { 
        alert('您只能修改自己創建的工作事項。'); 
        return;
    }
    
    setIsError(false);
    
    const { error } = await supabase
      .from('tasks')
      // 確認欄位名稱是 progress_perc
      .update({ progress_perc: newProgress }) 
      .eq('id', task.id);

    if (error) {
      console.error('Error updating progress:', error);
      // RLS 最終回報：如果彈出這個錯誤，表示 RLS 策略有問題
      alert(`更新失敗！錯誤碼: ${error.code}。詳細訊息: ${error.message}`); 
      setIsError(true);
    }
  }, [task.id, canEdit]);

  // 處理刪除任務
  const handleDelete = useCallback(async () => {
    if (!canEdit || !window.confirm('確定要刪除這個工作事項嗎？')) return;

    setIsError(false);
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id);

    if (error) {
      console.error('Error deleting task:', error);
      alert(`刪除失敗！錯誤碼: ${error.code}。詳細訊息: ${error.message}`);
      setIsError(true);
    }
  }, [task.id, canEdit]);

  // 處理標題/描述/指派人更新
  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    
    setIsError(false);

    const updates = {
      title: newTitle.trim(),
      description: newDescription.trim(),
      assigned_to_user: newAssignedTo || null,
    };

    if (!updates.title) {
        setIsError(true);
        alert('標題不能為空！');
        return;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    if (error) {
      console.error('Error saving task:', error);
      alert(`儲存失敗！錯誤碼: ${error.code}。詳細訊息: ${error.message}`);
      setIsError(true);
    } else {
      setIsEditing(false);
    }
  }, [task.id, newTitle, newDescription, newAssignedTo, canEdit]);

  // 渲染進度條
  const progress = task.progress_perc || 0; 
  const isComplete = progress === 100;

  // 判斷是否被指派給當前用戶
  const isAssignedToMe = !isAnon && currentUserId === task.assigned_to_user;
  
  // 組件樣式
  const itemClasses = [
    'task-item',
    isComplete ? 'task-complete' : '',
    isEditing ? 'task-editing' : '',
    isAssignedToMe ? 'assigned-to-me' : '', 
    isError ? 'error-state' : '' 
  ].filter(Boolean).join(' ');


  return (
    <div className={itemClasses}>
      
      <div className="row task-header">
        
        {/* 左側：標題、描述、狀態 */}
        <div className="task-content">
          {isEditing ? (
            <input
              type="text"
              className="input-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="工作事項標題..."
              required
            />
          ) : (
            <h3 className="task-title">{task.title}</h3>
          )}

          {/* 創建者和指派者資訊 */}
          <div className="task-meta">
            <span className="task-meta-item">
              創建者：
              <span className={`creator-name ${creatorProfile.is_online ? 'online' : 'offline'}`}>
                {creatorProfile.username} ({creatorProfile.is_online ? '在線' : '離線'})
              </span>
            </span>
            {task.assigned_to_user && (
              <span className="task-meta-item assigned-to">
                指派給：
                <span className={`assigned-name ${assignedProfile.is_online ? 'online' : 'offline'}`}>
                  {assignedProfile.username}
                </span>
                {isAssignedToMe && <span className="tag primary">ME</span>}
              </span>
            )}
          </div>
          
          {/* 進度條 */}
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-label">{progress}% 已完成</div>
          
          {/* 詳細內容 */}
          {task.description && !isEditing && (
            <p className="task-description">{task.description}</p>
          )}
          {isEditing && (
            <>
                <textarea
                  className="input-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="詳細內容..."
                  rows="3"
                />
                {/* 編輯/指派選項 (僅限有權限編輯) */}
                {canEdit && allUsers.length > 0 && (
                    <select
                        className="button-select select-assign"
                        value={newAssignedTo}
                        onChange={(e) => setNewAssignedTo(e.target.value)}
                        style={{ marginTop: '10px' }}
                    >
                        <option value="">-- 指派給 (選填) --</option>
                        {allUsers.map(profile => (
                            <option key={profile.id} value={profile.id}>
                                {profile.username}
                            </option>
                        ))}
                    </select>
                )}
            </>
          )}

        </div>

        {/* 右側：動作按鈕 */}
        <div className="task-actions">
            
            {/* 進度選擇 (僅限有權限編輯) */}
            {canEdit && !isEditing && (
                <select
                    className="button-select"
                    value={progress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                >
                    {progressOptions.map(p => (
                        <option key={p} value={p}>進度 {p}%</option>
                    ))}
                </select>
            )}

            {/* 編輯按鈕 */}
            {canEdit && (
                <>
                    {isEditing ? (
                        <button className="button primary small" onClick={handleSave}>
                            儲存
                        </button>
                    ) : (
                        <button className="button secondary small" onClick={() => setIsEditing(true)}>
                            編輯
                        </button>
                    )}
                    <button className="button danger small" onClick={handleDelete}>
                        刪除
                    </button>
                </>
            )}
            
            {/* 訪客模式提示 */}
            {isAnon && <span className="tag warning">訪客模式</span>}
        </div>
      </div>
    </div>
  );
}

export default TaskItem;