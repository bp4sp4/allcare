"use client";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./ChatBot.module.css";

// 전화번호를 tel: 링크로 변환
function linkifyPhones(text: string): string {
  return text.replace(
    /(\b\d{2,4}-\d{3,4}-\d{4}\b|\b\d{4}-\d{4}\b)/g,
    "[$1](tel:$1)"
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "chatbot_messages";
const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "안녕하세요! 학점은행제 평생교육원 상담 도우미입니다. 거주 지역과 관심 있는 자격증을 알려주시면 맞춤 교육원을 안내해드릴게요.",
};

const EXAMPLE_QUESTIONS = [
  "사회복지사 2급 자격증 어떻게 따나요?",
  "현장실습은 어떻게 시작하나요?",
  "우리 동네 근처 실습기관 어디서 찾아요?",
  "구법이랑 신법 차이가 뭔가요?",
  "실습 전에 뭐 먼저 들어야 하나요?",
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestAssistantRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // localStorage에서 대화 이력 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (parsed.length > 0) setMessages(parsed);
      }
    } catch {}
  }, []);

  // 메시지 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // 챗창 열릴 때만 맨 아래로 스크롤
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen]);

  // 로딩 중(유저 메시지 전송 후)엔 맨 아래로
  useEffect(() => {
    if (loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const streamResponse = async (nextMessages: Message[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setLoading(false);
      setTimeout(() => {
        latestAssistantRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      ]);
      console.error("[ChatBot]", err);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    await streamResponse(nextMessages);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* 채팅창 */}
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderTitle}>
              <Image
                src="/images/chatbot.jpg"
                alt="챗봇"
                width={28}
                height={28}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
              교육 도우미
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                className={styles.clearBtn}
                onClick={() => {
                  setMessages([INITIAL_MESSAGE]);
                  localStorage.removeItem(STORAGE_KEY);
                }}
                aria-label="대화 초기화"
              >
                초기화
              </button>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="닫기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={messagesContainerRef} className={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                ref={i === messages.length - 1 && msg.role === "assistant" ? latestAssistantRef : null}
                className={`${styles.message} ${styles[msg.role]}`}
              >
                {msg.role === "assistant" && (
                  <Image
                    src="/images/chatbot.jpg"
                    alt="챗봇"
                    width={28}
                    height={28}
                    className={styles.botEmoji}
                  />
                )}
                <div className={styles.bubble}>
                  {msg.role === "assistant" ? (
                    <div className={styles.markdown}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {linkifyPhones(msg.content)}
                      </ReactMarkdown>
                      {i === 0 && messages.length === 1 && (
                        <div className={styles.exampleQuestions}>
                          {EXAMPLE_QUESTIONS.map((q) => (
                            <button
                              key={q}
                              className={styles.exampleBtn}
                              onClick={() => {
                                if (loading) return;
                                const userMessage: Message = { role: "user", content: q };
                                const nextMessages = [...messages, userMessage];
                                setMessages(nextMessages);
                                streamResponse(nextMessages);
                              }}
                              disabled={loading}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <Image
                  src="/images/chatbot.jpg"
                  alt="챗봇"
                  width={28}
                  height={28}
                  className={styles.botEmoji}
                />
                <div className={styles.typingDot}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (Enter 전송)"
              rows={1}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="전송"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FAB 버튼 */}
      <button
        className={`${styles.fabButton}${isOpen ? ` ${styles.isOpen}` : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="교육 상담 챗봇 열기"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <Image
            src="/images/chatbot.jpg"
            alt="챗봇"
            width={56}
            height={56}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
        )}
      </button>
    </>
  );
}
