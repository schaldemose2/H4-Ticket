"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Key, Plus, Copy, CheckCircle, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  assigned_to?: string;
  category_ids?: string;
  categories?: string;
  category_colors?: string;
  created_at: string;
  updated_at: string;
};

type PasswordEntry = {
  id: string;
  title: string;
  username: string;
  password?: string;
  created_at: string;
};

type Comment = {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
};

export default function TicketDetail() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string, color: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPwdTitle, setNewPwdTitle] = useState("");
  const [newPwdUsername, setNewPwdUsername] = useState("");
  const [newPwdPassword, setNewPwdPassword] = useState("");
  const [pwdAdding, setPwdAdding] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [updatingCategories, setUpdatingCategories] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    } else if (sessionStatus === "authenticated" && id) {
      fetchData();
      fetchCategories();
    }
  }, [sessionStatus, id, router]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setAvailableCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const fetchData = async () => {
    try {
      const [ticketRes, pwdRes, commentsRes] = await Promise.all([
        fetch(`/api/tickets/${id}`),
        fetch(`/api/tickets/${id}/passwords`),
        fetch(`/api/tickets/${id}/comments`),
      ]);

      if (!ticketRes.ok) throw new Error("Failed to fetch ticket details");
      const ticketData = await ticketRes.json();
      setTicket(ticketData);
      setAssignee(ticketData.assigned_to || "");
      setSelectedCategories(ticketData.category_ids ? ticketData.category_ids.split(',') : []);

      if (pwdRes.ok) {
        const pwdData = await pwdRes.json();
        setPasswords(pwdData);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setNewComment("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommenting(false);
    }
  };

  const updateAssignee = async () => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: assignee }),
      });
      if (!res.ok) throw new Error("Failed to update assignee");
      const updatedTicket = await res.json();
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const updateCategories = async () => {
    setUpdatingCategories(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selectedCategories }),
      });
      if (!res.ok) throw new Error("Failed to update categories");
      const updatedTicket = await res.json();
      setTicket(updatedTicket);
      setShowCategoryModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingCategories(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updatedTicket = await res.json();
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdAdding(true);
    setPwdError("");

    try {
      const res = await fetch(`/api/tickets/${id}/passwords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPwdTitle,
          username: newPwdUsername,
          password: newPwdPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save password");
      }

      setShowPasswordModal(false);
      setNewPwdTitle("");
      setNewPwdUsername("");
      setNewPwdPassword("");
      fetchData(); // Refresh passwords
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setPwdAdding(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 mb-4">
          {error || "Ticket not found"}
        </div>
        <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Tickets
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-zinc-900">{ticket.title}</h1>
                  <p className="text-sm text-zinc-500 mt-1">
                    Created on {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ticket.categories && ticket.categories.split(',').map((cat, i) => {
                      const colors = ticket.category_colors ? ticket.category_colors.split(',') : [];
                      const color = colors[i] || '#4F46E5';
                      return (
                        <span key={i} className="px-2 py-0.5 inline-flex text-xs font-medium rounded-md border" style={{ borderColor: color, color: color, backgroundColor: `${color}10` }}>
                          {cat}
                        </span>
                      );
                    })}
                    <button 
                      onClick={() => setShowCategoryModal(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Edit Categories
                    </button>
                  </div>
                </div>
                <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                  ticket.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                  ticket.status === 'RESOLVED' ? 'bg-blue-100 text-blue-800' :
                  'bg-zinc-100 text-zinc-800'
                }`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <div className="px-6 py-6">
                <h3 className="text-sm font-medium text-zinc-900 mb-2">Description</h3>
                <div className="prose prose-sm max-w-none text-zinc-700 whitespace-pre-wrap bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  {ticket.description}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
                <h3 className="text-lg font-medium text-zinc-900">Comments</h3>
              </div>
              <div className="px-6 py-6">
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">No comments yet.</p>
                ) : (
                  <ul className="space-y-6 mb-6">
                    {comments.map((comment) => (
                      <li key={comment.id} className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium text-sm">
                              {comment.user_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-zinc-900">{comment.user_name}</span>
                            <span className="text-zinc-500 ml-2">{format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}</span>
                          </div>
                          <div className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">
                            {comment.content}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={handleAddComment} className="mt-4">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="block w-full border border-zinc-300 rounded-xl px-4 py-2 text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-shadow resize-y"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={commenting || !newComment.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {commenting ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Passwords Section */}
            <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
                <div className="flex items-center">
                  <Key className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-medium text-zinc-900">Secure Vault</h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Credential
                </button>
              </div>
              
              <div className="px-6 py-6">
                {passwords.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">No credentials stored for this ticket.</p>
                ) : (
                  <ul className="space-y-4">
                    {passwords.map((pwd) => (
                      <li key={pwd.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{pwd.title}</p>
                          <p className="text-xs text-zinc-500 mt-1">User: <span className="font-mono bg-zinc-200 px-1 rounded">{pwd.username}</span></p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="password"
                            value={pwd.password || ""}
                            readOnly
                            className="text-sm font-mono bg-white border border-zinc-300 rounded-lg px-3 py-1.5 w-full sm:w-48 focus:outline-none"
                          />
                          <button
                            onClick={() => copyToClipboard(pwd.password || "", pwd.id)}
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Copy password"
                          >
                            {copiedId === pwd.id ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
                <h3 className="text-sm font-medium text-zinc-900">Assignee</h3>
              </div>
              <div className="px-6 py-6 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Assign to..."
                    className="block w-full border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-shadow"
                  />
                  <button
                    onClick={updateAssignee}
                    disabled={assigning || assignee === ticket.assigned_to}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
                <h3 className="text-sm font-medium text-zinc-900">Update Status</h3>
              </div>
              <div className="px-6 py-6 space-y-3">
                <button
                  onClick={() => updateStatus('OPEN')}
                  disabled={statusUpdating || ticket.status === 'OPEN'}
                  className={`w-full flex items-center justify-between px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                    ticket.status === 'OPEN' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" /> Open
                  </div>
                  {ticket.status === 'OPEN' && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => updateStatus('IN_PROGRESS')}
                  disabled={statusUpdating || ticket.status === 'IN_PROGRESS'}
                  className={`w-full flex items-center justify-between px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                    ticket.status === 'IN_PROGRESS' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" /> In Progress
                  </div>
                  {ticket.status === 'IN_PROGRESS' && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => updateStatus('RESOLVED')}
                  disabled={statusUpdating || ticket.status === 'RESOLVED'}
                  className={`w-full flex items-center justify-between px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                    ticket.status === 'RESOLVED' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" /> Resolved
                  </div>
                  {ticket.status === 'RESOLVED' && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => updateStatus('CLOSED')}
                  disabled={statusUpdating || ticket.status === 'CLOSED'}
                  className={`w-full flex items-center justify-between px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                    ticket.status === 'CLOSED' ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2" /> Closed
                  </div>
                  {ticket.status === 'CLOSED' && <CheckCircle2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity" onClick={() => setShowPasswordModal(false)}></div>

            <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-zinc-200">
              <form onSubmit={handleAddPassword}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Key className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-zinc-900">Add Secure Credential</h3>
                      <div className="mt-4 space-y-4">
                        {pwdError && (
                          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                            {pwdError}
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                          <input
                            type="text"
                            required
                            value={newPwdTitle}
                            onChange={(e) => setNewPwdTitle(e.target.value)}
                            className="block w-full border border-zinc-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                            placeholder="e.g., Database Root, SSH Key"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
                          <input
                            type="text"
                            required
                            value={newPwdUsername}
                            onChange={(e) => setNewPwdUsername(e.target.value)}
                            className="block w-full border border-zinc-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                            placeholder="Username or identifier"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                          <input
                            type="password"
                            required
                            value={newPwdPassword}
                            onChange={(e) => setNewPwdPassword(e.target.value)}
                            className="block w-full border border-zinc-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                            placeholder="Secret password"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-zinc-200">
                  <button
                    type="submit"
                    disabled={pwdAdding}
                    className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {pwdAdding ? "Saving..." : "Save Credential"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-xl border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity" onClick={() => setShowCategoryModal(false)}></div>

            <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-zinc-200">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-zinc-900">Edit Categories</h3>
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 mb-6">
                        {availableCategories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              selectedCategories.includes(cat.id) 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                              {cat.name}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t border-zinc-200 pt-4">
                        <h4 className="text-sm font-medium text-zinc-900 mb-2">Create New Category</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="newCategoryName"
                            placeholder="Category name"
                            className="block w-full border border-zinc-300 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                          <input
                            type="color"
                            id="newCategoryColor"
                            defaultValue="#4F46E5"
                            className="h-9 w-9 p-1 rounded-xl border border-zinc-300 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const nameInput = document.getElementById('newCategoryName') as HTMLInputElement;
                              const colorInput = document.getElementById('newCategoryColor') as HTMLInputElement;
                              if (!nameInput.value) return;
                              
                              try {
                                const res = await fetch('/api/categories', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: nameInput.value, color: colorInput.value })
                                });
                                if (res.ok) {
                                  nameInput.value = '';
                                  fetchCategories();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-xl border border-zinc-200 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-zinc-200">
                <button
                  type="button"
                  onClick={updateCategories}
                  disabled={updatingCategories}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {updatingCategories ? "Saving..." : "Save Categories"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-xl border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
