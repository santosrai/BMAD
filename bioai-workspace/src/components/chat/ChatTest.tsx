import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export const ChatTest: React.FC = () => {
  const [testMessage, setTestMessage] = useState('Test message');
  const [sessionId, setSessionId] = useState<Id<'chatSessions'> | null>(null);
  const [userId] = useState('test-user-' + Date.now());
  
  const createSession = useMutation(api.chat.createSession);
  const addMessage = useMutation(api.chat.addMessage);
  const getMessages = useQuery(api.chat.getSessionMessages, 
    sessionId ? { sessionId, userId } : 'skip'
  );

  const handleCreateSession = async () => {
    try {
      const newSessionId = await createSession({
        userId,
        title: 'Test Session',
      });
      setSessionId(newSessionId);
      console.log('Test: Created session', newSessionId);
    } catch (error) {
      console.error('Test: Failed to create session', error);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId) return;
    
    try {
      console.log('Test: Sending message', testMessage);
      
      // Add user message
      await addMessage({
        sessionId,
        userId,
        content: testMessage,
        type: 'user',
        status: 'sent',
      });
      
      console.log('Test: User message added');
      
      // Add assistant response
      setTimeout(async () => {
        try {
          await addMessage({
            sessionId,
            userId,
            content: 'This is a test response from the assistant.',
            type: 'assistant',
            status: 'sent',
          });
          console.log('Test: Assistant response added');
        } catch (error) {
          console.error('Test: Failed to add assistant response', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Test: Failed to send message', error);
    }
  };

  return (
    <Card className="p-4 m-4">
      <h3 className="text-lg font-bold mb-4">Chat Test Component</h3>
      
      <div className="space-y-4">
        <div>
          <p>User ID: {userId}</p>
          <p>Session ID: {sessionId || 'None'}</p>
        </div>
        
        <div className="space-x-2">
          <Button onClick={handleCreateSession} disabled={!!sessionId}>
            Create Session
          </Button>
          
          <Button onClick={handleSendMessage} disabled={!sessionId}>
            Send Test Message
          </Button>
        </div>
        
        <div>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="border p-2 rounded"
            placeholder="Test message"
          />
        </div>
        
        <div>
          <h4 className="font-semibold">Messages ({getMessages?.length || 0}):</h4>
          <div className="max-h-40 overflow-y-auto border p-2 rounded">
            {getMessages?.map((msg) => (
              <div key={msg._id} className="mb-2 p-2 bg-gray-100 rounded">
                <div className="text-xs text-gray-500">
                  {msg.type} - {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                <div>{msg.content}</div>
              </div>
            ))}
            {!getMessages || getMessages.length === 0 && (
              <div className="text-gray-500">No messages</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}; 