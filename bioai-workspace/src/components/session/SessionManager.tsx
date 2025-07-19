import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth } from '../../hooks/useAuth';
import { useSessionPersistence, useSessionSnapshots } from '../../hooks/useSessionPersistence';
import type { SessionMetadata, SessionSnapshot } from '../../types/session';
import './SessionManager.css';

interface SessionManagerProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: (title?: string) => void;
  onSessionDelete: (sessionId: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  isVisible,
  onToggleVisibility,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'lastAccessed' | 'created' | 'title'>('lastAccessed');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);

  // Queries
  const sessions = useQuery(
    api.chat.getSessionsWithMetadata,
    user?.id ? { userId: user.id, includeInactive: true } : 'skip'
  );

  const sessionSearchResults = useQuery(
    api.chat.searchSessions,
    searchTerm && user?.id ? {
      userId: user.id,
      searchTerm,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      limit: 50,
    } : 'skip'
  );

  // Mutations
  const createSessionMutation = useMutation(api.chat.createSessionWithMetadata);
  const updateSessionMutation = useMutation(api.chat.updateSessionState);
  const deleteSessionMutation = useMutation(api.chat.deleteSession);
  const updateTagsMutation = useMutation(api.chat.updateSessionTags);

  // Session persistence hooks
  const { state: persistenceState, actions: persistenceActions } = useSessionPersistence(
    user?.id || '',
    currentSessionId,
    null // convexClient will be passed from parent
  );

  const { snapshots, actions: snapshotActions } = useSessionSnapshots(
    user?.id || '',
    currentSessionId
  );

  // Filtered and sorted sessions
  const filteredSessions = React.useMemo(() => {
    let result = searchTerm ? sessionSearchResults || [] : sessions || [];

    // Sort sessions
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'lastAccessed':
          return b.lastAccessedAt - a.lastAccessedAt;
        case 'created':
          return b.createdAt - a.createdAt;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [sessions, sessionSearchResults, searchTerm, sortBy]);

  // Get all available tags
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    sessions?.forEach(session => {
      session.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [sessions]);

  // Handle session creation
  const handleCreateSession = useCallback(async (title?: string, tags?: string[], description?: string) => {
    if (!user?.id) return;

    try {
      const sessionId = await createSessionMutation({
        userId: user.id,
        title,
        tags,
        description,
        settings: {
          autoSave: true,
          notificationsEnabled: true,
        },
      });

      onSessionCreate(title);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, [user?.id, createSessionMutation, onSessionCreate]);

  // Handle session update
  const handleUpdateSession = useCallback(async (
    sessionId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
    }
  ) => {
    if (!user?.id) return;

    try {
      await updateSessionMutation({
        sessionId: sessionId as Id<'chatSessions'>,
        userId: user.id,
        updates,
      });
      setEditingSession(null);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }, [user?.id, updateSessionMutation]);

  // Handle session deletion
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!user?.id) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this session? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      await deleteSessionMutation({
        sessionId: sessionId as Id<'chatSessions'>,
        userId: user.id,
      });
      onSessionDelete(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [user?.id, deleteSessionMutation, onSessionDelete]);

  // Handle tag toggle
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  if (!isVisible) {
    return (
      <div className="session-manager-toggle">
        <button 
          onClick={onToggleVisibility}
          className="session-manager-toggle-button"
          title="Show Sessions"
        >
          <span className="session-icon">📁</span>
          Sessions
        </button>
      </div>
    );
  }

  return (
    <div className="session-manager">
      <div className="session-manager-header">
        <h2>Session Manager</h2>
        <button 
          onClick={onToggleVisibility}
          className="session-manager-close"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Session Statistics */}
      <div className="session-stats">
        <div className="stat-item">
          <span className="stat-label">Total Sessions:</span>
          <span className="stat-value">{sessions?.length || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Auto-Save:</span>
          <span className={`stat-value ${persistenceState.isAutoSaving ? 'active' : ''}`}>
            {persistenceState.isAutoSaving ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pending:</span>
          <span className="stat-value">{persistenceState.pendingChanges}</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="session-search">
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <div className="search-filters">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="lastAccessed">Last Accessed</option>
            <option value="created">Created</option>
            <option value="title">Title</option>
          </select>

          <div className="view-mode-toggle">
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'active' : ''}
              title="List View"
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'active' : ''}
              title="Grid View"
            >
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="tag-filter">
          <div className="tag-filter-header">Filter by tags:</div>
          <div className="tag-filter-options">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`tag-filter-option ${selectedTags.includes(tag) ? 'active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Session Button */}
      <div className="session-actions">
        <button
          onClick={() => setShowCreateForm(true)}
          className="create-session-button"
        >
          + New Session
        </button>
      </div>

      {/* Create Session Form */}
      {showCreateForm && (
        <CreateSessionForm
          onSubmit={handleCreateSession}
          onCancel={() => setShowCreateForm(false)}
          availableTags={availableTags}
        />
      )}

      {/* Sessions List */}
      <div className={`sessions-list ${viewMode}`}>
        {filteredSessions.length === 0 ? (
          <div className="no-sessions">
            {searchTerm ? 'No sessions found matching your search.' : 'No sessions yet. Create your first session!'}
          </div>
        ) : (
          filteredSessions.map(session => (
            <SessionItem
              key={session._id}
              session={session}
              isActive={currentSessionId === session._id}
              isEditing={editingSession === session._id}
              onSelect={() => onSessionSelect(session._id)}
              onEdit={() => setEditingSession(session._id)}
              onUpdate={(updates) => handleUpdateSession(session._id, updates)}
              onDelete={() => handleDeleteSession(session._id)}
              onCancelEdit={() => setEditingSession(null)}
              snapshots={snapshots.filter(s => s.sessionId === session._id)}
              onRestoreSnapshot={persistenceActions.restoreFromSnapshot}
              onCreateSnapshot={() => persistenceActions.createSnapshot('manual', 'User created checkpoint')}
              availableTags={availableTags}
            />
          ))
        )}
      </div>

      {/* Persistence Status */}
      <div className="persistence-status">
        <div className="status-indicator">
          <span className={`status-dot ${persistenceState.saveStatus}`}></span>
          <span className="status-text">
            {persistenceState.saveStatus === 'saving' && 'Saving...'}
            {persistenceState.saveStatus === 'saved' && 'Saved'}
            {persistenceState.saveStatus === 'error' && 'Save Error'}
            {persistenceState.saveStatus === 'idle' && 'Ready'}
          </span>
        </div>
        
        {persistenceState.lastSaved && (
          <div className="last-saved">
            Last saved: {new Date(persistenceState.lastSaved).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

// Create Session Form Component
interface CreateSessionFormProps {
  onSubmit: (title?: string, tags?: string[], description?: string) => void;
  onCancel: () => void;
  availableTags: string[];
}

const CreateSessionForm: React.FC<CreateSessionFormProps> = ({
  onSubmit,
  onCancel,
  availableTags,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title || undefined, tags.length > 0 ? tags : undefined, description || undefined);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="create-session-form">
      <h3>Create New Session</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="session-title">Title:</label>
          <input
            id="session-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter session title (optional)"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="session-description">Description:</label>
          <textarea
            id="session-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter session description (optional)"
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Tags:</label>
          <div className="tag-input-container">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tags..."
              className="tag-input"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <button type="button" onClick={handleAddTag} className="add-tag-button">
              Add
            </button>
          </div>
          
          <div className="tag-suggestions">
            {availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => !tags.includes(tag) && setTags([...tags, tag])}
                className={`tag-suggestion ${tags.includes(tag) ? 'selected' : ''}`}
                disabled={tags.includes(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="selected-tags">
            {tags.map(tag => (
              <span key={tag} className="selected-tag">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="remove-tag-button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            Create Session
          </button>
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Session Item Component
interface SessionItemProps {
  session: any;
  isActive: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  snapshots: SessionSnapshot[];
  onRestoreSnapshot: (snapshotId: string) => void;
  onCreateSnapshot: () => void;
  availableTags: string[];
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  isEditing,
  onSelect,
  onEdit,
  onUpdate,
  onDelete,
  onCancelEdit,
  snapshots,
  onRestoreSnapshot,
  onCreateSnapshot,
  availableTags,
}) => {
  const [editTitle, setEditTitle] = useState(session.title);
  const [editDescription, setEditDescription] = useState(session.description || '');
  const [editTags, setEditTags] = useState<string[]>(session.tags || []);

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      title: editTitle,
      description: editDescription,
      tags: editTags,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString();
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isEditing) {
    return (
      <div className="session-item editing">
        <form onSubmit={handleUpdateSubmit}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="edit-title-input"
            placeholder="Session title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="edit-description-input"
            placeholder="Description"
            rows={2}
          />
          <div className="edit-actions">
            <button type="submit" className="save-button">Save</button>
            <button type="button" onClick={onCancelEdit} className="cancel-button">Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`session-item ${isActive ? 'active' : ''}`}>
      <div className="session-header" onClick={onSelect}>
        <div className="session-title">{session.title}</div>
        <div className="session-meta">
          <span className="message-count">{session.messageCount} messages</span>
          <span className="last-accessed">{formatDate(session.lastAccessedAt)}</span>
        </div>
      </div>

      {session.description && (
        <div className="session-description">{session.description}</div>
      )}

      {session.tags && session.tags.length > 0 && (
        <div className="session-tags">
          {session.tags.map((tag: string) => (
            <span key={tag} className="session-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="session-actions">
        <button onClick={onEdit} className="action-button edit" title="Edit">
          ✏️
        </button>
        <button onClick={onCreateSnapshot} className="action-button snapshot" title="Create Snapshot">
          📸
        </button>
        <button onClick={onDelete} className="action-button delete" title="Delete">
          🗑️
        </button>
      </div>

      {snapshots.length > 0 && (
        <div className="session-snapshots">
          <div className="snapshots-header">Snapshots ({snapshots.length}):</div>
          <div className="snapshots-list">
            {snapshots.slice(0, 3).map(snapshot => (
              <div key={snapshot.id} className="snapshot-item">
                <span className="snapshot-type">{snapshot.snapshotType}</span>
                <span className="snapshot-date">{formatDate(snapshot.timestamp)}</span>
                <button 
                  onClick={() => onRestoreSnapshot(snapshot.id)}
                  className="restore-button"
                  title="Restore from snapshot"
                >
                  ↻
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;