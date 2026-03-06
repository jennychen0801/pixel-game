import { useState, useEffect } from 'react';

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;
const PASS_THRESHOLD = Number(import.meta.env.VITE_PASS_THRESHOLD || 3);
const QUESTION_COUNT = Number(import.meta.env.VITE_QUESTION_COUNT || 5);

export default function App() {
    const [gameState, setGameState] = useState('home'); // home, loading, playing, result
    const [userId, setUserId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [bossImages, setBossImages] = useState([]);
    const [error, setError] = useState('');

    // 1. 預先載入 100 張 DiceBear Pixel Art 關主圖片
    useEffect(() => {
        // DiceBear v7 pixel-art 產生高品質像素風格頭像
        const images = Array.from({ length: 100 }, (_, i) =>
            `https://api.dicebear.com/7.x/pixel-art/svg?seed=boss-${i}&size=160`
        );
        setBossImages(images);

        // 預載前 10 張避免等待
        images.slice(0, 10).forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    // 2. 開始遊戲：驗證並抓取題目
    const startGame = async () => {
        if (!userId.trim()) {
            setError('請輸入識別碼 ID！');
            return;
        }
        setError('');
        setGameState('loading');

        try {
            if (!SCRIPT_URL || SCRIPT_URL.includes('你的_GAS_部署網址') || SCRIPT_URL.includes('你的_GAS_ID')) {
                throw new Error('未設定 GAS URL');
            }

            // 從 GAS 獲取隨機題目
            // 假設 GAS doGet 處理: ?action=getQuestions&count=5
            const res = await fetch(`${SCRIPT_URL}?action=getQuestions&count=${QUESTION_COUNT}`);
            const data = await res.json();

            if (data && data.questions && data.questions.length > 0) {
                setQuestions(data.questions);
                setScore(0);
                setCurrentQIndex(0);
                setGameState('playing');
            } else {
                throw new Error('無法取得題目');
            }
        } catch (err) {
            console.error('API 抓取失敗，錯誤訊息:', err);
            alert(`連線至 Google Apps Script 失敗！請確認 F12 開發者工具的 Console 面板。\n(如果剛設定完 .env，請記得重啟 Vite 伺服器 npm run dev)\n錯誤: ${err.message}`);
            console.warn('API 抓取失敗，使用 Demo 題庫', err);
            // Demo 題目資料結構 (未接通前測試用)
            setQuestions([
                { id: 1, text: 'React 是一個?', A: '框架', B: '函式庫', C: '語言', D: '瀏覽器', ans: 'B' },
                { id: 2, text: 'CSS 負責網頁的?', A: '邏輯', B: '結構', C: '樣式', D: '資料庫', ans: 'C' },
                { id: 3, text: '下列何者不是前端框架?', A: 'Vue', B: 'React', C: 'Django', D: 'Angular', ans: 'C' },
                { id: 4, text: 'HTML 的全名為?', A: 'HyperText Markup Language', B: 'HighText Maker Language', C: 'Hyperlinks Text Mark Language', D: 'Home Tool Markup Language', ans: 'A' },
                { id: 5, text: '哪個語法用來宣告不可變的變數?', A: 'var', B: 'let', C: 'const', D: 'def', ans: 'C' },
            ].slice(0, Math.max(1, QUESTION_COUNT)));
            setScore(0);
            setCurrentQIndex(0);
            setGameState('playing');
        }
    };

    // 3. 處理作答結果
    const handleAnswer = (selectedOption) => {
        const isCorrect = selectedOption === questions[currentQIndex].ans;
        const newScore = isCorrect ? score + 1 : score;

        if (isCorrect) setScore(newScore);

        if (currentQIndex + 1 < questions.length) {
            setCurrentQIndex(currentQIndex + 1);
        } else {
            finishGame(newScore);
        }
    };

    // 4. 結束遊戲，傳遞分數
    const finishGame = async (finalScore) => {
        setGameState('loading');
        try {
            if (SCRIPT_URL && !SCRIPT_URL.includes('你的_GAS_部署網址')) {
                // 使用 POST 傳送成績至 GAS
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    // 由於 GAS CORS 限制，可以直接使用 text/plain 或者設定 no-cors
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: JSON.stringify({
                        action: 'submitScore',
                        id: userId,
                        score: finalScore,
                        passed: finalScore >= PASS_THRESHOLD
                    })
                });
            }
        } catch (err) {
            console.error('成績傳送失敗', err);
        }
        setGameState('result');
    };

    // UI - Home
    if (gameState === 'home') {
        return (
            <div className="app-container">
                <h1 className="title">PIXEL QUIZ<br />ADVENTURE</h1>
                <div className="pixel-panel">
                    <label className="pixel-label">請輸入勇者 ID</label>
                    <input
                        className="pixel-input"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        placeholder="USER_ID"
                        onKeyDown={(e) => e.key === 'Enter' && startGame()}
                    />
                    {error && <p className="error-text">{error}</p>}
                    <button className="pixel-btn" onClick={startGame}>INSERT COIN (START)</button>
                </div>
            </div>
        );
    }

    // UI - Loading
    if (gameState === 'loading') {
        return (
            <div className="app-container">
                <div className="loading">LOADING...</div>
            </div>
        );
    }

    // UI - Playing
    if (gameState === 'playing') {
        const q = questions[currentQIndex];
        // 依據題號決定關主（確保重不重度遊玩時關主會換）
        // userId 長度也加進去當作 seed offset 讓每人看到的順序有點不同
        const bossIndex = (currentQIndex + userId.length * 7) % bossImages.length;
        const bossImgSrc = bossImages[bossIndex];

        return (
            <div className="app-container">
                <div className="stats">
                    <span>STAGE {currentQIndex + 1}/{questions.length}</span>
                    <span>PT: {score}</span>
                </div>

                <div className="pixel-panel">
                    <div className="boss-container">
                        <img src={bossImgSrc} alt="Boss" className="boss-image" />
                    </div>
                    <p className="question-text">{q.text}</p>
                </div>

                <div className="options-grid">
                    {['A', 'B', 'C', 'D'].map(opt => q[opt] ? (
                        <button
                            key={opt}
                            className="pixel-btn option-btn"
                            onClick={() => handleAnswer(opt)}
                        >
                            <span style={{ color: '#fbbf24', marginRight: '10px' }}>{opt}.</span> {q[opt]}
                        </button>
                    ) : null)}
                </div>
            </div>
        );
    }

    // UI - Result
    if (gameState === 'result') {
        const isPass = score >= PASS_THRESHOLD;
        return (
            <div className="app-container">
                <h1 className="title">GAME OVER</h1>
                <div className="pixel-panel" style={{ textAlign: 'center' }}>
                    <h2 className="result-title" style={{ color: isPass ? 'var(--success)' : 'var(--danger)' }}>
                        {isPass ? 'STAGE CLEAR!' : 'YOU DIED'}
                    </h2>
                    <p style={{ fontSize: '1.5rem', margin: '20px 0' }}>
                        SCORE: {score} / {questions.length}
                    </p>
                    <p style={{ marginBottom: '30px', color: '#a1a1aa' }}>
                        ( 門檻: {PASS_THRESHOLD} 題 )
                    </p>
                    <button className="pixel-btn" onClick={() => {
                        setScore(0);
                        setCurrentQIndex(0);
                        setGameState('home');
                    }}>RESTART</button>
                </div>
            </div>
        );
    }
}
