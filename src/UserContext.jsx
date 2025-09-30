import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// 創建 Context
const UserContext = createContext();

export const UserProvider = ({ children, session }) => {
  // profiles 結構: { uuid: { username: '...', is_online: true } }
  const [profiles, setProfiles] = useState({}); 
  const [loading, setLoading] = useState(true);
  const user = session?.user; 

  // 1. 獲取所有用戶的 Profile (名稱)
  const fetchProfiles = useCallback(async () => {
    try {
      // 確保這裡只使用 .select，不使用 .single() 或 .limit(1)
      const { data, error } = await supabase
        .from('profiles')
        .select(`id, username`); 

      if (error) throw error;

      // 將陣列轉換為 Map 結構，方便查找
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = { username: profile.username || '匿名使用者', is_online: false };
        return acc;
      }, {});
      setProfiles(profileMap);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profiles:', error.message);
      setLoading(false); 
    }
  }, []);

  // 2. 處理 Realtime 上線狀態
  useEffect(() => {
    fetchProfiles();
    
    // 如果沒有 user (訪客模式)，則不處理 Presence
    if (!user) return; 

    // 創建 Presence Channel
    const presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: user.id, // 用戶的 UUID 作為 Presence Key
        }
      }
    });

    // 監聽 Presence 狀態同步
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const newState = presenceChannel.presenceState();
      // 獲取所有在線用戶的 ID
      const onlineIds = new Set(Object.keys(newState));

      // 更新 profiles 狀態中的 is_online 旗標
      setProfiles(currentProfiles => {
        const updatedProfiles = { ...currentProfiles };
        
        for (const id in updatedProfiles) {
          updatedProfiles[id].is_online = onlineIds.has(id);
        }
        return updatedProfiles;
      });
    });

    // 訂閱 Channel
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // 追蹤當前用戶的在線狀態
        const { error } = await presenceChannel.track({ user_id: user.id, username: profiles[user.id]?.username || 'Anonymous' });
        if (error) console.error("Error tracking user:", error);
      }
    });

    // 清理函數：組件卸載時移除 Channel
    return () => {
      supabase.removeChannel(presenceChannel); 
    };
    
  }, [user, fetchProfiles]);

  // 獲取單個用戶 Profile
  const getProfile = useCallback((userId) => {
    return profiles[userId] || { username: '未知用戶', is_online: false };
  }, [profiles]);
  
  // 獲取所有用戶 Profile 列表
  const getAllProfiles = useCallback(() => {
      return Object.entries(profiles).map(([id, profile]) => ({
          id,
          ...profile,
      }));
  }, [profiles]);

  const value = {
    profiles,
    getProfile,
    getAllProfiles,
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);