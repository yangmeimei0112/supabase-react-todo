// ==========================================================
// 檔案：src/supabaseClient.js
// 這是我們所有 API 函式和 Supabase 實例的中心
// ==========================================================
import { createClient } from '@supabase/supabase-js';

// 請確保您的環境變數已正確設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================================
// 現有或修改後的任務相關函式 (Tasks)
// ==========================================================

// 獲取所有任務
export async function fetchTasks() {
  // RLS 會確保這裡只返回該使用者看得到的任務
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id, 
      task, 
      is_complete, 
      priority, 
      created_at,
      user_id
    `)
    .order('id', { ascending: true }); 

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  return tasks;
}

// 新增任務 (現在接收 priority)
export async function addTask(taskText, priority) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ task: taskText, priority: priority })
    .select('id, task, is_complete, priority, created_at, user_id')
    .single();

  if (error) {
    console.error('Error adding task:', error);
    throw error;
  }
  return data;
}

// 刪除任務
export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// 切換任務完成狀態
export async function toggleTaskComplete(id, isComplete) {
  const { error } = await supabase
    .from('tasks')
    .update({ is_complete: isComplete })
    .eq('id', id);
  if (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}


// ==========================================================
// 1. 任務指派相關函式 (Task Assignments)
// ==========================================================

/**
 * [新增] 一個任務的多重指派紀錄 (包含發送通知)
 */
export async function createAssignments(taskId, userIds, taskTitle) {
  const assignmentsData = userIds.map(userId => ({
    task_id: taskId,
    user_id: userId,
    progress: 0, 
  }));

  const { data, error } = await supabase
    .from('task_assignments')
    .insert(assignmentsData)
    .select();

  if (error) {
    console.error('Error creating assignments:', error);
    throw error;
  }
  
  // *** 新增通知邏輯 ***
  const { data: { user } } = await supabase.auth.getUser();
  for (const assignment of data) {
      if (user && assignment.user_id !== user.id) {
          const message = `任務 "${taskTitle}" 已指派給您。`;
          // 注意：createNotification 也是匯出函式
          await createNotification(assignment.user_id, message, taskId);
      }
  }

  return data;
}

/**
 * [更新] 被指派者本人的任務進度
 */
export async function updateAssignmentProgress(assignmentId, newProgress) {
  const { data, error } = await supabase
    .from('task_assignments')
    .update({ progress: newProgress })
    .eq('id', assignmentId)
    .select();

  if (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
  return data;
}

/**
 * [取得] 某個任務的所有指派紀錄 (包含進度)
 */
export async function fetchAssignmentsByTask(taskId) {
    const { data, error } = await supabase
        .from('task_assignments')
        .select(`
            id,
            progress,
            user_id,
            profiles(username)
        `)
        .eq('task_id', taskId);

    if (error) {
        console.error('Error fetching assignments:', error);
        throw error;
    }
    return data;
}

// ==========================================================
// 2. 通知相關函式 (Notifications)
// ==========================================================

/**
 * [新增] 一條通知紀錄
 */
export async function createNotification(userId, message, taskId = null) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: userId,
        message: message,
        related_task_id: taskId,
        is_read: false,
      }
    ])
    .select();

  if (error) {
    console.error('Error creating notification:', error);
    return null; 
  }
  return data;
}

/**
 * [取得] 登入者未讀取的通知
 */
export async function fetchUnreadNotifications() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, message, created_at')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
  return data;
}

/**
 * [更新] 標記通知為已讀
 */
export async function markNotificationsAsRead(notificationIds) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', notificationIds);

  if (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
}

// ==========================================================
// 3. 使用者/設定相關函式 (Profiles/Settings)
// ==========================================================

/**
 * [取得] 系統中所有使用者 (用於指派選單)
 */
export async function fetchAllUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : null;

    const { data, error } = await supabase
        .from('profiles')
        .select(`id, username`);
        
    if (error) {
        console.error('Error fetching all users:', error);
        throw error;
    }
    // 排除掉當前使用者
    return data.filter(p => p.id !== currentUserId);
}

// 更新個人資料
export async function updateProfile(newUsername) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated.');
    }
    
    const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername, updated_at: new Date().toISOString() })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
    return true;
}

// 取得個人資料
export async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select(`id, username, created_at`)
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.warn('Error fetching profile:', error);
        return { id: user.id, username: '未設定', created_at: user.created_at };
    }
    return data;
}