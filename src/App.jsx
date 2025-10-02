import { useState, useEffect } from 'react';
// 匯入路徑修正：所有元件都在 src/ 底下
import { supabase, fetchUnreadNotifications } from './supabaseClient'; 
import Auth from './Auth'; // 假設 Auth.jsx 也在 src/ 底下
import Todos from './Todos'; 
import Header from './Header'; 
import Settings from './Settings'; 

function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('todos'); 
  const [unreadCount, setUnreadCount] = useState(0); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 獲取未讀通知數量的 useEffect (登入時執行一次)
  useEffect(() => {
    if (session) {
      checkNotifications();
    }
  }, [session]);
  
  // 處理即時通知的 useEffect (訂閱 notifications 表格)
  useEffect(() => {
    if (session) {
        // 訂閱通知表，監聽 INSERT 事件 (新通知)
        const notificationSubscription = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                // 篩選只針對當前登入使用者的通知
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
                (payload) => {
                    console.log('New notification received:', payload.new);
                    // 收到新通知時，直接增加計數
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            // 清理訂閱
            supabase.removeChannel(notificationSubscription);
        };
    }
  }, [session]);


  // 檢查通知的函式
  const checkNotifications = async () => {
    try {
        const notifications = await fetchUnreadNotifications();
        setUnreadCount(notifications.length);
    } catch (error) {
        console.error("Failed to check notifications:", error);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  const renderContent = () => {
    if (!session) {
      return <Auth />;
    }

    // 根據 currentPage 導航
    if (currentPage === 'settings') {
        return <Settings user={session.user} onLogout={logout} />;
    } else {
        // 將 checkNotifications 傳遞給 Todos
        return <Todos user={session.user} checkNotifications={checkNotifications} />;
    }
  };

  return (
    <div className="container">
      {session && (
        <Header 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onLogout={logout}
          unreadCount={unreadCount} // 傳遞未讀計數
          checkNotifications={checkNotifications} // 傳遞檢查函式
        />
      )}
      {renderContent()}
    </div>
  );
}

export default App;