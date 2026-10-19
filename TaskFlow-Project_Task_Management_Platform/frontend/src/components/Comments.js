import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { commentAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarUrl } from '../utils/avatar';
import { 
  PaperAirplaneIcon, 
  TrashIcon, 
  UserCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Comments = ({ taskId, projectId }) => {
  const { user } = useAuth();
  const { onCommentAdded } = useSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const commentsEndRef = useRef(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await commentAPI.getComments(taskId);
        setComments(response.data.comments);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Failed to fetch comments', error);
      }
    };

    fetchComments();
  }, [taskId]);

  useEffect(() => {
    const cleanup = onCommentAdded((comment) => {
      if (comment.task === taskId) {
        setComments(prev => [...prev.filter(c => c._id !== comment._id), comment]);
        setTimeout(scrollToBottom, 100);
      }
    });

    return cleanup;
  }, [taskId, onCommentAdded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || loading) return;

    setLoading(true);
    try {
      await commentAPI.createComment({
        content: newComment,
        taskId,
        projectId
      });
      
      // Optimistic update handled by socket or manually if preferred
      // Here we rely on socket for consistency
      setNewComment('');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await commentAPI.deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
          Discussion
          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs text-gray-500">
            {comments.length}
          </span>
        </h3>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <UserCircleIcon className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-3 group">
              <div className="flex-shrink-0">
                <img src={getAvatarUrl(comment.author)} alt={comment.author?.name} className="w-8 h-8 rounded-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {comment.author?.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                
                {comment.author?._id === user._id && (
                  <button 
                    onClick={() => handleDelete(comment._id)}
                    className="mt-1 text-[10px] text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    <TrashIcon className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none transition-all pr-12 dark:text-white"
            rows="2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className={`absolute bottom-3 right-3 p-1.5 rounded-lg transition-colors ${
              newComment.trim() ? 'text-primary-600 hover:bg-primary-50' : 'text-gray-300'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        <p className="mt-2 text-[10px] text-gray-400">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};

export default Comments;
