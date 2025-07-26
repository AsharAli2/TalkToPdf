
'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Plus, File, Trash2, ChevronRight } from 'lucide-react';
import FileUploadComponent from "@/components/fileupload";
import ReactMarkdown from 'react-markdown';
import { currentUser } from '@clerk/nextjs/server'

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [collectionName, setcollectionName] = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, {
      role: 'user',
      content: input,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/chat?userQuery=${encodeURIComponent(input)}&collection=${collectionName}`);
      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || "Sorry, I couldn't find an answer.",
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Error processing your request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }

    setInput('');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex bg-gray-900 text-gray-100 transition-colors duration-200">

      {/* Toggle Sidebar Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-20 md:hidden p-2 rounded-full bg-gray-800 text-gray-200 shadow-lg"
      >
        <ChevronRight className={`transition-transform duration-200 ${sidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-10 w-80 h-screen bg-gray-800 border-gray-700 shadow-lg transition-transform duration-300 ease-in-out border-r`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold">TalkToPDF</h1>
          </div>

          <FileUploadComponent setcollectionName={setcollectionName} setMessages={setMessages}/>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-0' : ''}`}>

        {/* Header */}
        <div className="p-4 flex items-center border-b bg-gray-800 border-gray-700">
          <h2 className="text-lg font-semibold">{collectionName}</h2>
          <span className="ml-auto text-sm opacity-70">Ask anything about your documents</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="p-4 rounded-full bg-gray-800 mb-4">
                <File size={32} className="opacity-70" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Your Documents Assistant</h3>
              <p className="max-w-md text-gray-400">
                Upload your documents and start asking questions. I'll search through them to find the answers you need.
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-2 h-[100px]">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-gray-800 text-gray-100' 
                        : 'bg-transparent text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl rounded-2xl px-4 py-3 bg-transparent">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t bg-gray-800 border-gray-700"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your documents..."
              className="flex-1 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white border-gray-600 border transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`p-3 rounded-full transition-colors ${
                input.trim() && !isLoading
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}