import React, { useState, useEffect } from "react";
import { Message, ChatState } from "./types";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { MessageSquare, Trash2 } from "lucide-react";
import { streamCompletion } from "./services/api";

const STORAGE_KEY = "chat_messages";

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content: "Hello! How can I help you today?",
  timestamp: new Date(),
};

function App() {
  const [chatState, setChatState] = useState<ChatState>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      return {
        messages: parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
        isLoading: false,
      };
    }
    return {
      messages: [INITIAL_MESSAGE],
      isLoading: false,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatState.messages));
  }, [chatState.messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    try {
      // Create a placeholder message for streaming
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      const stream = await streamCompletion(chatState.messages);
      const reader = stream?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get stream reader");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);

        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        console.log("reader33", lines);
        for (const line of lines) {
          if (line.startsWith("data: [DONE]")) {
            break;
          }
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              setChatState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === assistantMessage.id
                    ? {
                        ...msg,
                        content: msg.content + data.choices[0].delta.content,
                      }
                    : msg
                ),
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      // setChatState((prev) => ({
      //   ...prev,
      //   messages: [
      //     ...prev.messages,
      //     {
      //       id: Date.now().toString(),
      //       role: "assistant",
      //       content:
      //         "I apologize, but I encountered an error. Please try again.",
      //       timestamp: new Date(),
      //     },
      //   ],
      // }));
    } finally {
      setChatState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear all messages?")) {
      setChatState({
        messages: [INITIAL_MESSAGE],
        isLoading: false,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-3xl mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl font-semibold">Chat Assistant</h1>
          </div>
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        {chatState.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Chat Input */}
      <ChatInput onSend={handleSendMessage} disabled={chatState.isLoading} />
    </div>
  );
}

export default App;
