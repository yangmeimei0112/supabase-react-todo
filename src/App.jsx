import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Account from './Account';
import './App.css';
import { UserProvider } from './UserContext'; // 引入 UserProvider

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="container">
      {!session ? (
        <Auth /> 
      ) : (
        <div className="user-header">
          <button className="button primary" onClick={() => supabase.auth.signOut()}>
            登出
          </button>
        </div>
      )}
      
      <UserProvider session={session}>
        {/* Account 組件總是渲染，根據 session 決定是登入還是訪客模式 */}
        <Account key={session ? session.user.id : 'anon'} session={session} />
      </UserProvider>
      
    </div>
  );
}

export default App;