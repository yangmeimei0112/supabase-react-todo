import { useState } from 'react';
import { supabase } from './supabaseClient'; 

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // 新增密碼狀態
  const [isSignUp, setIsSignUp] = useState(false); 

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let error;
    
    if (isSignUp) {
        // 註冊時使用 signUp，需要 email 和 password
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });
        error = signUpError;
    } else {
        // 登入時使用 signInWithPassword
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        error = signInError;
    }

    if (error) {
        // 處理 Supabase 返回的錯誤
        alert(error.error_description || error.message);
    } else {
        // 註冊成功後，Supabase 仍會要求 Email 確認
        alert(isSignUp ? '註冊成功！請檢查您的信箱進行確認。' : '登入成功！');
    }
    setLoading(false);
  };

  return (
    <div className="row flex-center flex">
      <div className="col-6 form-widget">
        <h1 className="header">{isSignUp ? '建立帳號' : '登入'}</h1>
        <p className="description">
          請輸入您的信箱和密碼進行{isSignUp ? '註冊' : '登入'}
        </p>
        <form className="form-widget" onSubmit={handleAuth}>
          <div>
            <input
              className="inputField"
              type="email"
              placeholder="您的信箱"
              value={email}
              required={true}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {/* 密碼欄位 */}
          <div>
            <input
              className="inputField"
              type="password"
              placeholder="密碼"
              value={password}
              required={true}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button className="button block" disabled={loading}>
              {loading ? <span>載入中...</span> : <span>{isSignUp ? '註冊' : '登入'}</span>}
            </button>
          </div>
        </form>
        <button 
            className="button block link-button" 
            onClick={() => setIsSignUp(!isSignUp)}
        >
            {isSignUp ? '已有帳號？點此登入' : '還沒有帳號？點此註冊'}
        </button>
      </div>
    </div>
  );
}