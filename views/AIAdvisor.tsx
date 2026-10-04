
import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { AppContext } from '../App';
import { Button } from '../components/Shared';
import { Bot, Send, Loader2, Plus, MessageSquare, Trash2, User, Menu, Sparkles, Compass, ShieldCheck, ArrowRight } from 'lucide-react';
import { ChatSession, ChatMessage } from '../types';
import { handleAdvisorAction, AdvisorState, AdvisorAction } from '../services/advisorEngine';
import Markdown from 'react-markdown';

const AIAdvisorView = () => {
  const context = useContext(AppContext)!;
  const { data, metrics, activeProfileId, setData, symbol } = context;

  // State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  const initialAdvisorState: AdvisorState = {
      currentPath: "analysis.full",
      previousPaths: [],
      selectedOptions: [],
      depthLevel: 1,
      lastComputedState: null,
      lastStateSignature: "",
      turnCount: 0,
      recentQuestions: []
  };

  // STRICT FILTER: Only show sessions for the current profile
  const sessions = (data.chatSessions || [])
    .filter(s => s.profileId === activeProfileId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Human Psychology Chat Scrolling:
  // When a new message/response arrives, do NOT scroll to the bottom of the long response!
  // Instead, smoothly align to the TOP of the new message so the reader naturally reads top-to-bottom!
  useEffect(() => {
    const currentCount = activeSession?.messages?.length || 0;
    if (currentCount > prevMessagesCountRef.current) {
      // Allow DOM rendering of markdown/content
      setTimeout(() => {
        if (latestMessageRef.current && chatContainerRef.current) {
          // Precise top alignment inside the container
          const container = chatContainerRef.current;
          const target = latestMessageRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
          
          container.scrollTo({
            top: Math.max(0, relativeTop - 12),
            behavior: 'smooth'
          });
        }
      }, 80);
    }
    prevMessagesCountRef.current = currentCount;
  }, [activeSession?.messages?.length]);

  // When switching sessions, start at top
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
    prevMessagesCountRef.current = activeSession?.messages?.length || 0;
  }, [activeSessionId]);

  // If active profile changes, reset session view
  useEffect(() => {
      setActiveSessionId(null);
  }, [activeProfileId]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setShowHistoryMobile(false);
  };

  const createSession = (firstMessage: string): ChatSession => {
    const newSession: ChatSession = {
        id: Date.now().toString(),
        title: firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage,
        profileId: activeProfileId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    };
    return newSession;
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setData(prev => ({
        ...prev,
        chatSessions: prev.chatSessions.filter(s => s.id !== id)
    }));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const processAdvisorTurn = (
      action: AdvisorAction, 
      sessionWithUserMsg: ChatSession, 
      isNewSession: boolean
  ) => {
      setIsTyping(true);
      
      setTimeout(() => {
        try {
            const currentAdvisorState = sessionWithUserMsg.advisorState || initialAdvisorState;
            
            const response = handleAdvisorAction(
                data, 
                metrics, 
                activeProfileId, 
                currentAdvisorState, 
                action,
                symbol
            );

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.message,
                timestamp: new Date().toISOString(),
                options: response.options,
                predictedQuestions: response.predictedQuestions
            };

            // Update Global State
            setData(prev => {
                const sessionIndex = prev.chatSessions.findIndex(s => s.id === sessionWithUserMsg.id);
                if (sessionIndex === -1) return prev;

                const updatedSession: ChatSession = {
                    ...prev.chatSessions[sessionIndex],
                    messages: [...prev.chatSessions[sessionIndex].messages, aiMsg],
                    advisorState: response.updatedAdvisorState,
                    updatedAt: new Date().toISOString()
                };
                
                const otherSessions = prev.chatSessions.filter(s => s.id !== updatedSession.id);
                return {
                    ...prev,
                    chatSessions: [updatedSession, ...otherSessions]
                };
            });
        } catch (error) {
            console.error("Advisor Error:", error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: `⚠️ Encountered an error while analyzing your data: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
            
            setData(prev => {
                const sessionIndex = prev.chatSessions.findIndex(s => s.id === sessionWithUserMsg.id);
                if (sessionIndex === -1) return prev;

                const updatedSession: ChatSession = {
                    ...prev.chatSessions[sessionIndex],
                    messages: [...prev.chatSessions[sessionIndex].messages, errorMsg],
                    updatedAt: new Date().toISOString()
                };
                
                const otherSessions = prev.chatSessions.filter(s => s.id !== updatedSession.id);
                return {
                    ...prev,
                    chatSessions: [updatedSession, ...otherSessions]
                };
            });
        } finally {
            setIsTyping(false);
        }
      }, 600);
  };

  const handleSendMessage = (customMessage?: string, isOption = false, actionPath?: string) => {
    const messageContent = customMessage || chatInput;
    if (!messageContent.trim()) return;

    if (!isOption) setChatInput('');
    
    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString()
    };

    let currentSession = activeSession;
    let isNewSession = false;

    if (!currentSession) {
        currentSession = createSession(messageContent);
        isNewSession = true;
    }

    const updatedMessages = [...currentSession.messages, userMsg];
    const sessionWithUserMsg = { ...currentSession, messages: updatedMessages, updatedAt: new Date().toISOString() };
    
    setData(prev => {
        const otherSessions = prev.chatSessions.filter(s => s.id !== sessionWithUserMsg.id);
        return {
            ...prev,
            chatSessions: [sessionWithUserMsg, ...otherSessions]
        };
    });
    
    if(isNewSession) setActiveSessionId(sessionWithUserMsg.id);

    const action: AdvisorAction = isOption && actionPath
        ? { type: 'option_click', value: actionPath }
        : { type: 'text_input', value: messageContent };

    processAdvisorTurn(action, sessionWithUserMsg, isNewSession);
  };

  const handleOptionClick = (option: { label: string, path: string }) => {
      handleSendMessage(option.label, true, option.path);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-180px)] md:h-[calc(100dvh-140px)] gap-4 md:gap-6 relative">
        
        {/* Mobile History Toggle */}
        <div className="md:hidden flex justify-between items-center shrink-0 mb-2">
            <h2 className="text-xl font-semibold">Intelligent Advisor</h2>
            <button onClick={() => setShowHistoryMobile(!showHistoryMobile)} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                <Menu size={20} />
            </button>
        </div>

        {/* Sidebar History */}
        <div className={`
            fixed md:relative inset-0 z-50 md:z-0 bg-white dark:bg-slate-900 md:bg-transparent
            md:w-1/4 md:flex flex-col
            ${showHistoryMobile ? 'flex p-4' : 'hidden'}
            md:glass-card md:rounded-2xl md:border md:border-white/50 md:dark:border-white/10
        `}>
            <div className="flex justify-between items-center mb-4 md:hidden">
                <h3 className="font-bold text-lg">Analysis History</h3>
                <button onClick={() => setShowHistoryMobile(false)}><Menu size={20}/></button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                <Button onClick={handleNewChat} className="w-full gap-2" variant="primary">
                    <Plus size={16} /> New Analysis
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.length === 0 && (
                    <div className="text-center text-xs text-gray-400 mt-4">No analysis sessions yet.</div>
                )}
                {sessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => { setActiveSessionId(session.id); setShowHistoryMobile(false); }}
                        className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeSessionId === session.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'}`}
                    >
                        <MessageSquare size={16} className="shrink-0" />
                        <div className="break-words text-sm flex-1">{session.title}</div>
                        <button 
                            onClick={(e) => deleteSession(e, session.id)} 
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Chat Area - Main */}
        <div className="flex-1 glass-card rounded-2xl flex flex-col overflow-hidden relative border border-white/50 dark:border-white/10 shadow-sm">
            {/* Quick Intelligence Command Strip */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/90 dark:bg-slate-900/90 border-b border-gray-100 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 shrink-0 mr-1">
                    <Sparkles size={12} className="text-primary" /> Smart Queries:
                </span>
                <button 
                    onClick={() => handleSendMessage("analyze situation")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    📊 Full Audit
                </button>
                <button 
                    onClick={() => handleSendMessage("what should I focus on this week")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    🎯 Weekly Focus
                </button>
                <button 
                    onClick={() => handleSendMessage("audit my cash runway and survival buffer")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    ⏱️ Runway & Buffer
                </button>
                <button 
                    onClick={() => handleSendMessage("audit my top expenses and cash leaks")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    💸 Top Expenses
                </button>
                <button 
                    onClick={() => handleSendMessage("can I afford a major purchase right now")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    🛒 Affordability
                </button>
                <button 
                    onClick={() => handleSendMessage("audit my profit and tax allocation buckets")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    💰 Profit Buckets
                </button>
                <button 
                    onClick={() => handleSendMessage("what is my financial freedom plan")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    🎯 Freedom Math
                </button>
                <button 
                    onClick={() => handleSendMessage("audit debt and liabilities")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    ⚖️ Debt Strategy
                </button>
                {activeProfileId !== 'personal' && (
                    <button 
                        onClick={() => handleSendMessage("what is my maximum safe owner distribution")} 
                        disabled={isTyping}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                    >
                        💼 Safe Owner Draw
                    </button>
                )}
                <button 
                    onClick={() => handleSendMessage("how do I migrate cashflow to B and I quadrants")} 
                    disabled={isTyping}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                    🧭 ESBI Migration
                </button>
            </div>

            {!activeSession ? (
                // Welcome Screen
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 md:p-8 text-center bg-gradient-to-b from-transparent to-gray-50/30 dark:to-white/5">
                    <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-primary/20 animate-in zoom-in duration-300">
                        <Bot size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">Intelligent Financial Advisor</h2>
                    <p className="text-gray-500 max-w-md mb-8 font-medium text-sm">
                        Deep mathematical diagnosis, runway survival modeling, and profit-first strategies bound 100% to your active {activeProfileId === 'personal' ? 'personal' : 'business'} data.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                        <button onClick={() => handleSendMessage("analyze situation")} className="p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl hover:border-primary/50 hover:shadow-md text-left transition-all group">
                            <div className="font-semibold text-xs mb-1 uppercase tracking-wider text-gray-400 group-hover:text-primary">Phase 1 • Reality</div>
                            <div className="font-bold text-base flex items-center justify-between">
                                Full Balance & Cashflow Audit
                                <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Holistic diagnostic across all revenue, debt, and assets.</div>
                        </button>
                        <button onClick={() => handleSendMessage("audit my cash runway and survival buffer")} className="p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl hover:border-primary/50 hover:shadow-md text-left transition-all group">
                            <div className="font-semibold text-xs mb-1 uppercase tracking-wider text-gray-400 group-hover:text-primary">Phase 2 • Resilience</div>
                            <div className="font-bold text-base flex items-center justify-between">
                                Runway & Survival Buffer
                                <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Calculate how many months your liquid reserves will last.</div>
                        </button>
                        <button onClick={() => handleSendMessage("audit my profit and tax allocation buckets")} className="p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl hover:border-primary/50 hover:shadow-md text-left transition-all group">
                            <div className="font-semibold text-xs mb-1 uppercase tracking-wider text-gray-400 group-hover:text-primary">Phase 3 • Allocation</div>
                            <div className="font-bold text-base flex items-center justify-between">
                                Profit-First Bucket Health
                                <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Detect overdrafts, unallocated leaks, and tax reserves.</div>
                        </button>
                        <button 
                            onClick={() => handleSendMessage(activeProfileId === 'personal' ? "how do I migrate cashflow to B and I quadrants" : "what is my maximum safe owner distribution")} 
                            className="p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl hover:border-primary/50 hover:shadow-md text-left transition-all group"
                        >
                            <div className="font-semibold text-xs mb-1 uppercase tracking-wider text-gray-400 group-hover:text-primary">
                                {activeProfileId === 'personal' ? 'Phase 4 • Freedom' : 'Phase 4 • Capital'}
                            </div>
                            <div className="font-bold text-base flex items-center justify-between">
                                {activeProfileId === 'personal' ? 'ESBI Quadrant Migration' : 'Safe Owner Distribution'}
                                <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {activeProfileId === 'personal' ? 'Transition active wage labor into compounding assets.' : 'Safely withdraw company profit without bleeding reserves.'}
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                // Chat Messages
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
                    {activeSession.messages.map((msg, i) => {
                        const isLastMessage = i === activeSession.messages.length - 1;
                        return (
                            <div 
                                key={i} 
                                ref={isLastMessage ? latestMessageRef : null} 
                                className="space-y-4"
                            >
                                <div className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-primary text-white'}`}>
                                         {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                     </div>
                                     <div className={`max-w-[92%] md:max-w-[85%] rounded-2xl p-5 text-sm leading-relaxed ${
                                         msg.role === 'user' 
                                         ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap' 
                                         : 'bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-white/10 shadow-xs'
                                     }`}>
                                         {msg.role === 'ai' ? (
                                             <div className="markdown-body prose prose-sm dark:prose-invert max-w-none [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:dark:text-white [&>h3]:pb-2 [&>h3]:border-b [&>h3]:border-gray-100 [&>h3]:dark:border-white/5 [&>h3]:mb-3 [&>h4]:text-xs [&>h4]:font-bold [&>h4]:uppercase [&>h4]:tracking-wider [&>h4]:text-primary [&>h4]:mt-4 [&>h4]:mb-1.5 [&>blockquote]:border-l-4 [&>blockquote]:border-amber-500 [&>blockquote]:bg-amber-50/50 [&>blockquote]:dark:bg-amber-950/20 [&>blockquote]:p-3 [&>blockquote]:rounded-r-lg [&>blockquote]:text-xs [&>ul]:space-y-1.5 [&>ol]:space-y-1.5">
                                                 <Markdown>{msg.content}</Markdown>
                                             </div>
                                         ) : (
                                             msg.content
                                         )}
                                     </div>
                                </div>
                                
                                {/* Render Options if AI message has them */}
                                {msg.role === 'ai' && (msg as any).options && (msg as any).options.length > 0 && !(isLastMessage && isTyping) && (
                                    <div className="flex flex-wrap gap-2 pl-11">
                                        {(msg as any).options.map((opt: any, idx: number) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleOptionClick(opt)}
                                                disabled={isTyping}
                                                className={`px-4 py-2 border text-xs font-bold rounded-full transition-all shadow-2xs ${
                                                    isLastMessage 
                                                    ? 'bg-white dark:bg-slate-800 border-primary/40 text-primary hover:bg-primary hover:text-white' 
                                                    : 'bg-transparent border-primary/30 dark:border-primary/50 text-primary/80 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Render Predicted Next Questions if AI message has them */}
                                {msg.role === 'ai' && (msg as any).predictedQuestions && (msg as any).predictedQuestions.length > 0 && !(isLastMessage && isTyping) && (
                                    <div className="pl-11 mt-3">
                                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-amber-500" />
                                            Predicted Next Questions:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(msg as any).predictedQuestions.map((pred: any, pIdx: number) => (
                                                <button
                                                    key={pIdx}
                                                    onClick={() => handleSendMessage(pred.query)}
                                                    disabled={isTyping}
                                                    className="px-3 py-1.5 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-xs font-semibold rounded-xl text-left transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                                    <span>{pred.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {isTyping && (
                        <div className="flex gap-4 animate-in fade-in slide-in-from-left-2">
                             <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                                 <Bot size={16} />
                             </div>
                             <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl p-4 flex items-center gap-2">
                                 <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-200"></span>
                                 </div>
                                 <span className="text-[10px] uppercase font-semibold tracking-widest text-gray-400 ml-2">Computing State</span>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-white/5">
                <div className="flex gap-2 max-w-4xl mx-auto w-full">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`Direct question or command (e.g. "audit runway", "safe owner draw")...`}
                        className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                        disabled={isTyping}
                    />
                    <Button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isTyping} className="!px-6 rounded-xl">
                        {isTyping ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </Button>
                </div>
                <div className="mt-2 text-[10px] text-center text-gray-400 font-medium uppercase tracking-tighter">
                    Deterministic logic engine • Zero AI latency • 100% Data Bound
                </div>
            </div>
        </div>
    </div>
  );
};

export default AIAdvisorView;
