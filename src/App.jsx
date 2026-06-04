import { useEffect, useRef, useState } from "react"
import "./App.css";

import { lessons } from "./data";
import { speak, startSpeechRecognition } from "./utils/speech";
import { similarity, getSequentialMatchCount } from "./utils/similarity";
import {
  playListeningSound,
  playRecognizedSound,
  playPassSound,
  playFailSound,
} from "./utils/sound";

function HighlightedSentence({ targetText, spokenText }) {
  if (!targetText) return null;

  const targetWords = targetText.split(" ");
  const matchCount = getSequentialMatchCount(targetText, spokenText || "");

  return (
    <p className="highlight-sentence">
      {targetWords.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className={index < matchCount ? "word recognized" : "word pending"}
        >
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h2>스크립트가 없습니다</h2>
      <p>
        <code>src/scripts/level1/unit01.json</code> 같은 파일을 추가해주세요.
      </p>
    </div>
  );
}

export default function App() {
  const [selectedLevel, setSelectedLevel] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [unitIndex, setUnitIndex] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);

  const [spokenText, setSpokenText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [score, setScore] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const [listeningStatus, setListeningStatus] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [isListening, setIsListening] = useState(false);


  const isListeningRef = useRef(false);
  const retryAfterEndRef = useRef(false);
  const advanceAfterEndRef = useRef(false);

  const levelData = lessons[selectedLevel];
  const currentUnit = levelData?.units?.[unitIndex];
  const currentSentence = currentUnit?.sentences?.[sentenceIndex];

  const currentChunks = currentSentence?.chunks?.length
    ? currentSentence.chunks
    : currentSentence?.text
      ? [currentSentence.text]
      : [];

  const currentPracticeText =
    currentChunks[chunkIndex] || currentSentence?.text || "";

  const displayedSpokenText = interimText || spokenText;
  const canGoNext = attempts >= 3 || score >= 75;

  useEffect(() => {
    if (!autoMode) return;
    if (!isLoggedIn) return;
    if (!currentPracticeText) return;
    if (isListeningRef.current) return;

    const timer = setTimeout(() => {
      playCurrentChunkAndListen();
    }, 20);

    return () => clearTimeout(timer);
  }, [autoMode, isLoggedIn, currentPracticeText, sentenceIndex, chunkIndex]);


  function resetPracticeState() {
    setSpokenText("");
    setInterimText("");
    setScore(null);
    setAttempts(0);
    setListeningStatus("");
  }

  function login() {
    if (!selectedLevel) {
      alert("레벨을 선택해주세요.");
      return;
    }

    if (password === lessons[selectedLevel].password) {
      setIsLoggedIn(true);
      setUnitIndex(0);
      setSentenceIndex(0);
      setChunkIndex(0);
      resetPracticeState();
    } else {
      alert("비밀번호가 맞지 않습니다.");
    }
  }

  function logout() {
    setIsLoggedIn(false);
    setSelectedLevel("");
    setPassword("");
    setUnitIndex(0);
    setSentenceIndex(0);
    setChunkIndex(0);
    resetPracticeState();
  }

  function handleUnitChange(e) {
    setUnitIndex(Number(e.target.value));
    setSentenceIndex(0);
    setChunkIndex(0);
    resetPracticeState();
  }

  function goToPracticeItem(nextSentenceIndex, nextChunkIndex) {
    setSentenceIndex(nextSentenceIndex);
    setChunkIndex(nextChunkIndex);
    resetPracticeState();
  }

  function goToNextPracticeItem() {
    resetPracticeState();

    if (chunkIndex < currentChunks.length - 1) {
      setChunkIndex((prev) => prev + 1);
      return;
    }

    if (sentenceIndex < currentUnit.sentences.length - 1) {
      setSentenceIndex((prev) => prev + 1);
      setChunkIndex(0);
      return;
    }

    alert("이 유닛의 문장을 모두 완료했습니다!");
  }

  function previousPracticeItem() {
    resetPracticeState();

    if (chunkIndex > 0) {
      setChunkIndex((prev) => prev - 1);
      return;
    }

    if (sentenceIndex > 0) {
      const prevSentenceIndex = sentenceIndex - 1;
      const prevSentence = currentUnit.sentences[prevSentenceIndex];
      const prevChunks = prevSentence?.chunks?.length
        ? prevSentence.chunks
        : [prevSentence.text];

      setSentenceIndex(prevSentenceIndex);
      setChunkIndex(prevChunks.length - 1);
    }
  }

  function handleSpeak(rate) {
    if (!currentPracticeText) return;
    speak(currentPracticeText, rate);
  }
  function playCurrentChunkAndListen() {
    if (!currentPracticeText) return;

    setSpokenText("");
    setInterimText("");
    setScore(null);
    setListeningStatus("먼저 듣고 따라 말해보세요.");

    speak(currentPracticeText, 1, () => {
      setTimeout(() => {
        startRecognition();
      }, 100);
    });
  }

  function startRecognition() {
    if (!currentPracticeText) return;
    if (isListeningRef.current) return;

    isListeningRef.current = true;
    setIsListening(true);

    setSpokenText("");
    setInterimText("");
    setScore(null);
    setListeningStatus("듣고 있어요. 문장을 말해주세요.");

    if (soundOn) playListeningSound();

    startSpeechRecognition({
      onStart: () => {
        setListeningStatus("듣고 있어요. 문장을 말해주세요.");
      },

      onInterim: (text) => {
        setInterimText(text);
      },

      onResult: (result) => {
        const calculatedScore = similarity(currentPracticeText, result);

        setSpokenText(result);
        setInterimText("");
        setScore(calculatedScore);
        setAttempts((prev) => prev + 1);

        if (calculatedScore >= 75) {
          setListeningStatus("통과! 다음으로 넘어갑니다.");
          if (soundOn) playPassSound();

          advanceAfterEndRef.current = true;
        } else {
          setListeningStatus("다시 말해볼게요. 곧 마이크가 다시 켜집니다.");
          if (soundOn) playRecognizedSound();

          if (autoMode) {
            retryAfterEndRef.current = true;
          }
        }
      },

      onError: (message) => {
        setListeningStatus("인식 실패. 다시 시도해주세요.");
        if (soundOn) playFailSound();

        if (autoMode) {
          retryAfterEndRef.current = true;
        } else {
          alert(message);
        }
      },

      onEnd: () => {
        isListeningRef.current = false;
        setIsListening(false);

        // 기존: 즉시 처리 → 변경: result가 아직 안 왔을 수 있으므로 딜레이
        setTimeout(() => {
          if (advanceAfterEndRef.current) {
            advanceAfterEndRef.current = false;
            goToNextPracticeItem();
            return;
          }
          if (retryAfterEndRef.current) {
            retryAfterEndRef.current = false;
            startRecognition();
            return;
          }
          setListeningStatus("인식이 종료됐어요.");
        }, 300); // ← 이 딜레이가 핵심

        if (retryAfterEndRef.current) {
          retryAfterEndRef.current = false;

          setTimeout(() => {
            startRecognition();
          }, 400);

          return;
        }

        setListeningStatus((prev) => prev || "인식이 종료됐어요.");
      },
    });
  }

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="card">
          <h1>Speaking Loop</h1>
          <p className="subtitle">듣고 따라 말하는 영어 문장 연습</p>

          <label>Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value="">레벨 선택</option>
            {Object.entries(lessons).map(([levelKey, level]) => (
              <option key={levelKey} value={levelKey}>
                {level.label}
              </option>
            ))}
          </select>

          <label>Password</label>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login}>Enter</button>

          <div className="password-hint">
            <p>테스트용 비밀번호</p>
            {Object.entries(lessons).map(([levelKey, level]) => (
              <p key={levelKey}>
                {level.label}: {level.password}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!levelData?.units?.length) {
    return (
      <div className="app">
        <div className="card">
          <button className="small-button" onClick={logout}>
            나가기
          </button>
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="card">
        <div className="top-row">
          <div>
            <p className="unit-title">{currentUnit.title}</p>
            <p className="target-level">
              {currentUnit.targetLevel || levelData.targetLevel}
            </p>
          </div>

          <button className="small-button" onClick={logout}>
            나가기
          </button>
        </div>

        <label>Unit</label>
        <select value={unitIndex} onChange={handleUnitChange}>
          {levelData.units.map((unit, index) => (
            <option key={unit.id || unit.title} value={index}>
              {index + 1}. {unit.title}
            </option>
          ))}
        </select>

        {currentUnit.focusPatterns?.length > 0 && (
          <div className="pattern-box">
            <p className="pattern-title">Focus Patterns</p>
            <div className="pattern-list">
              {currentUnit.focusPatterns.map((pattern) => (
                <span key={pattern} className="pattern-chip">
                  {pattern}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="progress">
          문장 {sentenceIndex + 1} / {currentUnit.sentences.length}
          {" · "}
          청크 {chunkIndex + 1} / {currentChunks.length}
        </div>

        <div className="sentence-box">
          <p className="chunk-label">
            Chunk {chunkIndex + 1} / {currentChunks.length}
          </p>

          <p className="sentence">{currentPracticeText}</p>

          {currentSentence.meaning && (
            <p className="meaning">{currentSentence.meaning}</p>
          )}

          <HighlightedSentence
            targetText={currentPracticeText}
            spokenText={displayedSpokenText}
          />
        </div>

        <div className="button-row">
          <button onClick={() => handleSpeak(0.7)}>느리게 듣기</button>
          <button onClick={() => handleSpeak(1)}>보통 속도</button>
        </div>

        <button
          className={autoMode ? "auto-button active" : "auto-button"}
          onClick={() => {
            setAutoMode((prev) => {
              const next = !prev;

              if (next) {
                retryAfterEndRef.current = false;
                advanceAfterEndRef.current = false;
              } else {
                window.speechSynthesis.cancel();
                retryAfterEndRef.current = false;
                advanceAfterEndRef.current = false;
              }

              return next;
            }); c
          }}
        >
          {autoMode ? "자동 연습 끄기" : "자동 연습 시작"}
        </button>

        <label className="sound-toggle">
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => setSoundOn(e.target.checked)}
          />
          효과음 켜기
        </label>

        {listeningStatus && <p className="status-text">{listeningStatus}</p>}

        {spokenText && (
          <div className="result-box">
            <p className="result-label">인식 결과</p>
            <strong>{spokenText}</strong>
            <p className="score">점수: {score}점</p>

            {score >= 75 ? (
              <p className="good">Good! 자동으로 다음으로 넘어갑니다.</p>
            ) : (
              <p className="try">조금만 더 또렷하게 말해볼게요.</p>
            )}
          </div>
        )}

        <p className="attempts">말하기 시도: {attempts}회</p>

        <div className="nav-row">
          <button
            onClick={previousPracticeItem}
            disabled={sentenceIndex === 0 && chunkIndex === 0}
          >
            이전
          </button>

          <button
            className="next-button"
            onClick={goToNextPracticeItem}
            disabled={!canGoNext}
          >
            다음
          </button>
        </div>

        {!canGoNext && (
          <p className="hint">
            75점 이상이거나 3번 이상 시도하면 다음으로 넘어갈 수 있어요.
          </p>
        )}

        {currentUnit.dialogue?.length > 0 && (
          <div className="section">
            <h3>Mini Dialogue</h3>
            {currentUnit.dialogue.map((line, index) => (
              <div className="dialogue-line" key={index}>
                <p>
                  <strong>A:</strong> {line.a}
                </p>
                <p>
                  <strong>B:</strong> {line.b}
                </p>
              </div>
            ))}
          </div>
        )}

        {currentUnit.freeTalkQuestions?.length > 0 && (
          <div className="section">
            <h3>Free Talk Questions</h3>
            <ul>
              {currentUnit.freeTalkQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}