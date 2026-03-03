"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewTicket() {
  const { status } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string, color: string}[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCategories();
    }
  }, [status]);

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

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, categories: selectedCategories }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create ticket");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Tickets
          </Link>
        </div>

        <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
            <h3 className="text-lg leading-6 font-medium text-zinc-900">Create New Ticket</h3>
            <p className="mt-1 text-sm text-zinc-500">Describe the issue with your Galea-cluster deployment.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="block w-full border border-zinc-300 rounded-xl px-4 py-2 text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-shadow"
                placeholder="e.g., Node sync failure in cluster-01"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="block w-full border border-zinc-300 rounded-xl px-4 py-2 text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-shadow resize-y"
                placeholder="Provide detailed information about the issue, error logs, and steps to reproduce."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
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
              
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  id="newCategoryName"
                  placeholder="New category name"
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

            <div className="flex justify-end pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-zinc-300 rounded-xl shadow-sm text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Create Ticket"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
