import React, { useState, useEffect, useRef } from 'react';

// 🚨 匯入路徑修正：Header.tsx 現在和 supabaseClient.js 在同一個 src/ 資料夾下
// 並且使用 @ts-ignore 忽略模組錯誤 (ts-2307)
// @ts-ignore
import { fetchUnreadNotifications, markNotificationsAsRead } from './supabaseClient'; 

// TypeScript 介面來定義 Props 類型
interface HeaderProps {
    currentPage: string;
    setCurrentPage: (page: string) => void;
    onLogout: () => void;
    unreadCount: number;
    checkNotifications: () => Promise<void>;
}


const Header = ({ currentPage, setCurrentPage, onLogout, unreadCount, checkNotifications }: HeaderProps) => {
    const [notifications, setNotifications] = useState<any[]>([]); 
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    // 點擊鈴鐺時才加載通知
    const handleBellClick = async () => {
        setShowNotifications(prev => !prev);
        
        if (!showNotifications && unreadCount > 0) {
            try {
                const data = await fetchUnreadNotifications();
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications on click:", error);
            }
        } else {
            setNotifications([]);
        }
    };
    
    // 點擊通知列表外區域時關閉
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // 標記所有當前通知為已讀
    const markAllAsRead = async () => {
        if (notifications.length > 0) {
            const ids = notifications.map(n => n.id);
            await markNotificationsAsRead(ids);
            
            setNotifications([]); 
            checkNotifications(); 
        }
    };

    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #ccc' }}>
            <h1>任務管理</h1>
            <nav style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                {/* 1. 通知鈴鐺 */}
                <div style={{ position: 'relative' }} ref={notificationRef}>
                    <button 
                        onClick={handleBellClick} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '20px' }}
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span style={{ 
                                position: 'absolute', 
                                top: '-5px', 
                                right: '-5px', 
                                background: 'red', 
                                color: 'white', 
                                borderRadius: '50%', 
                                padding: '2px 6px', 
                                fontSize: '10px',
                                lineHeight: '1'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    
                    {/* 通知彈出視窗 */}
                    {showNotifications && (
                        <div style={{
                            position: 'absolute', 
                            top: '40px', 
                            right: '0', 
                            width: '300px', 
                            maxHeight: '400px', 
                            overflowY: 'auto', 
                            background: 'white', 
                            border: '1px solid #ddd', 
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)', 
                            zIndex: 100
                        }}>
                            <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                <strong>通知 ({unreadCount} 未讀)</strong>
                                {notifications.length > 0 && (
                                    <button onClick={markAllAsRead} style={{ float: 'right', cursor: 'pointer', border: 'none', background: 'none', fontSize: '12px', color: 'blue' }}>
                                        標記全部已讀
                                    </button>
                                )}
                            </div>
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <div key={n.id} style={{ padding: '10px', borderBottom: '1px solid #eee', background: 'white' }}>
                                        {n.message}
                                        <small style={{ display: 'block', color: '#999' }}>{new Date(n.created_at).toLocaleString()}</small>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>沒有未讀通知</div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. 任務列表按鈕 */}
                <button 
                    onClick={() => setCurrentPage('todos')}
                    disabled={currentPage === 'todos'}
                    style={{ cursor: 'pointer', padding: '8px 15px' }}
                >
                    任務列表
                </button>
                
                {/* 3. 設定按鈕 */}
                <button 
                    onClick={() => setCurrentPage('settings')}
                    disabled={currentPage === 'settings'}
                    style={{ cursor: 'pointer', padding: '8px 15px' }}
                >
                    設定
                </button>
                
                {/* 4. 登出按鈕 */}
                <button onClick={onLogout} style={{ cursor: 'pointer', padding: '8px 15px' }}>
                    登出
                </button>
            </nav>
        </header>
    );
};

export default Header;