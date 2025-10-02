import React, { useState, useEffect } from 'react';
// 匯入路徑修正：Settings.jsx 現在和 supabaseClient.js 在同一個 src/ 資料夾下
import { fetchProfile, updateProfile } from './supabaseClient'; 

const Settings = ({ user, onLogout }) => {
    const [profile, setProfile] = useState(null);
    const [newUsername, setNewUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchProfile();
                setProfile(data);
                setNewUsername(data?.username || '');
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!newUsername.trim() || newUsername === profile?.username) {
            setMessage('請輸入新的使用者名稱。');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            await updateProfile(newUsername.trim());
            setProfile(prev => ({ ...prev, username: newUsername.trim() }));
            setMessage('使用者名稱更新成功！');
        } catch (error) {
            console.error('Update profile error:', error);
            setMessage('更新失敗：' + (error.message || '未知錯誤'));
        } finally {
            setLoading(false);
        }
    };
    
    const formattedDate = profile?.created_at 
        ? new Date(profile.created_at).toLocaleDateString() 
        : 'N/A';

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>載入設定中...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
            <h2>個人設定</h2>

            {/* 帳號資訊 */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <p><strong>使用者 ID:</strong> <small>{user.id}</small></p>
                <p><strong>電子郵件:</strong> {user.email}</p>
                <p><strong>帳號建立日期:</strong> {formattedDate}</p>
            </div>

            {/* 使用者名稱更新表單 */}
            <form onSubmit={handleUpdate} style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h3>更新使用者名稱</h3>
                <label style={{ display: 'block', marginBottom: '5px' }}>目前名稱: {profile?.username || '未設定'}</label>
                <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="輸入新的使用者名稱"
                    required
                    style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
                    disabled={loading}
                />
                
                {message && (
                    <p style={{ color: message.includes('成功') ? 'green' : 'red', marginBottom: '10px' }}>{message}</p>
                )}
                
                <button 
                    type="submit" 
                    disabled={loading || !newUsername.trim() || newUsername === profile?.username} 
                    style={{ padding: '10px 20px', cursor: 'pointer' }}
                >
                    {loading ? '更新中...' : '確認更新'}
                </button>
            </form>
            
            {/* 登出按鈕 */}
            <div style={{ textAlign: 'right' }}>
                <button onClick={onLogout} style={{ background: '#6c757d', color: 'white', padding: '10px 20px', cursor: 'pointer' }}>
                    登出帳號
                </button>
            </div>
        </div>
    );
};

export default Settings;